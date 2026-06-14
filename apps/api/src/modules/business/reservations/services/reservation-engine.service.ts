import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ReservationRepository } from '../repositories/reservation.repository';
import { AvailabilityRepository } from '../../availability/repositories/availability.repository';
import { CustomerRepository } from '../../customers/repositories/customer.repository';
import { RestaurantRepository } from "../../restaurants/repositories/restaurant.repository";

import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { RedisService } from "../../../../infrastructure/cache/redis.service";
import { DashboardGateway } from "../../../../infrastructure/observability/events/dashboard.gateway";
import { Reservation, DayOfWeek, ReservationStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import {
  formatDateInRestaurantTimezone,
  formatTimeInRestaurantTimezone,
  getRestaurantLocalDayIndex,
  getRestaurantLocalTimeValue,
} from "../../../../common/time/restaurant-timezone.util";
import { normalizePhone } from "../../../../common/phone/phone-normalizer.util";


export interface CreateReservationInput {
  restaurantId: string;
  phone: string;
  guestCount: number;
  reservationStart: Date;
  durationMinutes?: number;
  notes?: string;
  customerName?: string;
}

export interface ReservationResult {
  reservation: Reservation;
  confirmationCode: string;
  tableName: string;
}

export interface CancelReservationResult {
  success: boolean;
  message: string;
  reservation?: Reservation;
}

export interface ModifyReservationResult {
  success: boolean;
  message: string;
  reservation?: Reservation;
}

export interface GetReservationResult {
  success: boolean;
  message?: string;
  reservation?: Reservation;
}



@Injectable()
export class ReservationEngineService {
  constructor(
    private readonly reservationRepository: ReservationRepository,
      private readonly restaurantRepository: RestaurantRepository,

    private readonly availabilityRepository: AvailabilityRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly prisma: PrismaService, // Inyección necesaria para transacciones ACID robustas
      private readonly redisService: RedisService,
      private readonly dashboardGateway: DashboardGateway,
  ) {}

  /**
   * Ejecuta la lógica transaccional de negocio para reservar una mesa en un restaurante
   */
  async createReservation(input: CreateReservationInput): Promise<ReservationResult> {
      const lockKey = `lock:restaurant:${input.restaurantId}:concurrency`;
      const hasLock = await this.redisService.acquireLock(lockKey, 5000); // Expira en 5s automático si hay caída crítica
      if (!hasLock) {
        throw new BadRequestException("El sistema está procesando otra reserva para este restaurante en este momento. Por favor, reintente en un segundo.");
      }
      try {
    const {
      restaurantId,
      phone,
      guestCount,
      reservationStart,
      durationMinutes = 90,
      notes,
      customerName,
    } = input;
    const normalizedPhone = normalizePhone(phone).normalizedPhone;

    // 1. Validar reglas de horarios comerciales del restaurante
    await this.validateOpeningHours(restaurantId, reservationStart);

    // 2. Validar que la fecha no esté explícitamente bloqueada (días festivos, cierres patronales)
    await this.validateNotBlocked(restaurantId, reservationStart);

    // 3. Calcular ventana exacta de tiempo de la reserva
    const reservationEnd = new Date(reservationStart);
    reservationEnd.setMinutes(reservationEnd.getMinutes() + durationMinutes);

    // 4. Iniciar una transacción ACID en PostgreSQL mediante Prisma para mitigar condiciones de carrera (Race Conditions)
    const result = await this.prisma.$transaction(async (tx) => {
      
      // 4.1 Buscar mesas disponibles en tiempo real bloqueando sobreventas simultáneas
      const availableTables = await this.availabilityRepository.findAvailableTables(
        restaurantId,
        reservationStart,
        reservationEnd,
        guestCount,
      );

      if (availableTables.length === 0) {
        throw new BadRequestException('No hay mesas disponibles que se adapten al horario y comensales solicitados.');
      }

      // 4.2 Selección óptima: Tomar la mesa que mejor se adapte (Best-fit)
      const table = availableTables[0];

      // 4.3 Gestionar el perfil del cliente de forma modular (Buscar o crear de manera transaccional)
      const nameParts = customerName?.trim().split(' ') ?? [];
      const customer = await this.customerRepository.findOrCreate(
        restaurantId,
        normalizedPhone,
        {
          firstName: nameParts[0] || 'Cliente',
          lastName: nameParts.slice(1).join(' ') || undefined,
        },
      );

      // 4.4 Generar identificador de confirmación alfanumérico para el mensaje automático de WhatsApp
      const confirmationCode = this.generateConfirmationCode();
        const reservation = await this.reservationRepository.create({
          restaurantId,
          customerId: customer.id,
          reservationStart,
          reservationEnd,
          guestCount,
          tableId: table.id,
          confirmationCode,
          notes,
        });

        return {
          reservation,
          confirmationCode,
          tableName: table.name,
        };
      });

      this.dashboardGateway.emitToRestaurant(restaurantId, "reservation_created", result);
      return result;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException("Fallo al procesar de forma atómica la asignación de la mesa.");
    } finally {
      await this.redisService.releaseLock(lockKey);
    }
  }

  /**
   * Procesa la cancelación transaccional de la reserva más próxima en base al teléfono del cliente
   */
  async cancelLatestReservationByPhone(restaurantId: string, phone: string): Promise<CancelReservationResult> {
      const normalizedPhone = normalizePhone(phone).normalizedPhone;
    try {
      // 1. Iniciar transacción de aislamiento atómico
      return await this.prisma.$transaction(async (tx) => {
        // 2. Buscar la reserva activa más próxima del cliente en este restaurante usando el índice compuesto del schema
        const activeReservation = await tx.reservation.findFirst({
          where: {
            restaurantId,
            customer: {
                phone: normalizedPhone,
            },
            status: {
              in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
            },
            reservationStart: {
              gte: new Date(), // Solo reservas a partir de la fecha y hora actual
            },
          },
          orderBy: {
            reservationStart: 'asc', // Tomar la más inmediata
          },
        });

        if (!activeReservation) {
          return {
            success: false,
            message: 'No se encontró ninguna reserva activa o pendiente programada para tu número de teléfono.',
          };
        }

        // 3. Ejecutar actualización lógica cambiando el estado y registrando la fecha del evento

        const updatedReservation = await tx.reservation.update({
          where: { id: activeReservation.id },
          data: {
            status: ReservationStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        });

        return {
          success: true,
          message: `Tu reserva para la fecha ${activeReservation.reservationStart.toLocaleDateString('es-ES')} ha sido cancelada correctamente.`,
          reservation: updatedReservation,
        };
      });
    } catch (error) {
      throw new InternalServerErrorException('Fallo al procesar de manera segura la cancelación de la reserva.');
    }
  }

  async cancelReservationByCode(
    restaurantId: string,
    confirmationCode: string,
    phone: string,
  ): Promise<CancelReservationResult> {
      const normalizedPhone = normalizePhone(phone).normalizedPhone;
    try {
      const reservation =
        await this.reservationRepository.findByConfirmationCode(
          restaurantId,
          confirmationCode,
        );

      if (!reservation) {
        return {
          success: false,
          message: `No existe ninguna reserva con el código ${confirmationCode}.`,
        };
      }

        const customer =
          await this.customerRepository.findById(
            restaurantId,
            reservation.customerId,
          );
          if (!customer || customer.phone !== normalizedPhone) {
          return {
            success: false,
            message: "No tienes permiso para cancelar esta reserva.",
          };
        }


      if (
        reservation.status ===
        ReservationStatus.CANCELLED
      ) {
        return {
          success: false,
          message: `La reserva ${confirmationCode} ya estaba cancelada.`,
        };
      }


      const updatedReservation =
        await this.reservationRepository.updateStatus(
          restaurantId,
          reservation.id,
          ReservationStatus.CANCELLED,
        );

      return {
        success: true,
        message: `✅ Reserva ${confirmationCode} cancelada correctamente.`,
        reservation: updatedReservation,
      };
    } catch {
      throw new InternalServerErrorException(
        'Fallo al cancelar la reserva por código.',
      );
    }
  }


  async getReservationByCode(
    restaurantId: string,
    confirmationCode: string,
    phone: string,
  ) {
    const normalizedPhone = normalizePhone(phone).normalizedPhone;
    const reservation =
      await this.reservationRepository.findByConfirmationCode(
        restaurantId,
        confirmationCode,
      );

    if (!reservation) {
      return {
        success: false,
        message: `No existe ninguna reserva con el código ${confirmationCode}.`,
      };
    }

    const customer =
      await this.customerRepository.findById(
        restaurantId,
        reservation.customerId,
      );
      if (!customer || customer.phone !== normalizedPhone) {
      return {
        success: false,
        message: "No tienes permiso para consultar esta reserva.",
      };
    }

    return {
      success: true,
      reservation,
    };
  }


  async modifyReservationByCode(
    restaurantId: string,
    confirmationCode: string,
    phone: string,
    newGuestCount?: number,
    newReservationStart?: Date,
    durationMinutes = 90,
  ): Promise<ModifyReservationResult> {
    const normalizedPhone = normalizePhone(phone).normalizedPhone;
    try {
      const reservation =
        await this.reservationRepository.findByConfirmationCode(
          restaurantId,
          confirmationCode,
        );

      if (!reservation) {
        return {
          success: false,
          message: `No existe ninguna reserva con el código ${confirmationCode}.`,
        };
      }

      const customer =
        await this.customerRepository.findById(
          restaurantId,
          reservation.customerId,
        );
      if (!customer || customer.phone !== normalizedPhone) {
        return {
          success: false,
          message: "No tienes permiso para modificar esta reserva.",
        };
      }

      if (
        reservation.status ===
        ReservationStatus.CANCELLED
      ) {
        return {
          success: false,
          message: `La reserva ${confirmationCode} ya está cancelada y no puede modificarse.`,
        };
      }


      const guestCount =
        newGuestCount ?? reservation.guestCount;

      const reservationStart =
        newReservationStart ?? reservation.reservationStart;

      const reservationEnd =
        new Date(reservationStart);

      reservationEnd.setMinutes(
        reservationEnd.getMinutes() + durationMinutes,
      );

      await this.validateOpeningHours(
        restaurantId,
        reservationStart,
      );

      await this.validateNotBlocked(
        restaurantId,
        reservationStart,
      );

      const tables =
        await this.availabilityRepository.findAvailableTables(
          restaurantId,
          reservationStart,
          reservationEnd,
          guestCount,
          reservation.id,
        );

      if (tables.length === 0) {
        return {
          success: false,
          message: "No hay disponibilidad para la nueva fecha solicitada.",
        };
      }


      const updatedReservation =
        await this.reservationRepository.reschedule(
          restaurantId,
          reservation.id,
          reservationStart,
          reservationEnd,
            tables[0].id,
        );
        console.log("[RESCHEDULE RESULT]", updatedReservation);


        if (
          guestCount !==
          reservation.guestCount
        ) {
          await this.prisma.reservation.update({
            where: {
              id: reservation.id,
            },
            data: {
              guestCount,
            },
          });
        }


        return {
          success: true,
          message: `✅ Reserva ${confirmationCode} modificada correctamente.`,
          reservation: updatedReservation,
        };
      } catch (error) {
        console.error("[MODIFICATION ERROR]", error);

        throw new InternalServerErrorException(
          "Fallo al modificar la reserva por código.",
        );
      }
  }


  /**
   * Valida estrictamente que la fecha y hora solicitada concuerde con los horarios comerciales del inquilino
   */
  private async validateOpeningHours(restaurantId: string, date: Date): Promise<void> {
    const openingHours = await this.availabilityRepository.findOpeningHours(restaurantId);

    if (openingHours.length === 0) {
      throw new NotFoundException('El restaurante no tiene horarios de apertura configurados.');
    }

    // Convertir el getDay de JavaScript (0 = Domingo) al orden estándar de tu Enum DayOfWeek de Prisma
    const jsDay = date.getDay();
    const daysMap: DayOfWeek[] = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];
    
    const targetEnumDay = daysMap[jsDay];

    const todayHours = openingHours.find((oh) => oh.dayOfWeek === targetEnumDay);

    if (!todayHours || todayHours.isClosed || !todayHours.active) {
      throw new BadRequestException('El restaurante se encuentra cerrado en el día solicitado.');
    }


    // Formatear la hora militar solicitada (HH:MM) para comparación robusta de strings lexicográficos
    const requestedTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    if (requestedTime < todayHours.openTime || requestedTime >= todayHours.closeTime) {
      throw new BadRequestException(
        `El horario de reserva solicitado está fuera de los límites de servicio comerciales (${todayHours.openTime} - ${todayHours.closeTime}).`,
      );
    }
  }


  /**
   * Comprueba que el restaurante no esté en una fecha bloqueada de forma manual por el Maître
   */
  private async validateNotBlocked(restaurantId: string, date: Date): Promise<void> {
    const blockedDates = await this.availabilityRepository.findBlockedDates(restaurantId, date);
    if (blockedDates.length > 0) {
      throw new BadRequestException('El restaurante ha bloqueado temporalmente la admisión de reservas para esta fecha.');
    }
  }

  /**
   * Genera un identificador compacto de 6 caracteres hexadecimales legibles para el cliente
   */
  private generateConfirmationCode(): string {
    return randomBytes(3).toString('hex').toUpperCase();
  }

  /**
   * Ejecuta la modificación transaccional de la reserva más próxima del cliente
   */
  async modifyLatestReservationByPhone(
    restaurantId: string,
    phone: string,
    newGuestCount?: number,
    newReservationStart?: Date,
    durationMinutes = 90
  ): Promise<{ success: boolean; message: string }> {
      const normalizedPhone = normalizePhone(phone).normalizedPhone;
    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Buscar la reserva activa más próxima
        const activeReservation = await tx.reservation.findFirst({
            where: {
              restaurantId,
              customer: { phone: normalizedPhone },
              status: { in: ["PENDING", "CONFIRMED"] },
              reservationStart: { gte: new Date() },
            },
          orderBy: { reservationStart: "asc" },
        });

        if (!activeReservation) {
          return {
            success: false,
            message: "No encontré ninguna reserva activa o pendiente para poder modificar.",
          };
        }

        // 2. Preparar los nuevos valores manteniendo los anteriores si no se especifican
        const guestCount = newGuestCount ?? activeReservation.guestCount;
        const reservationStart = newReservationStart ?? activeReservation.reservationStart;
        
        const reservationEnd = new Date(reservationStart);
        reservationEnd.setMinutes(reservationEnd.getMinutes() + durationMinutes);

          await this.validateOpeningHours(
            restaurantId,
            reservationStart,
          );

          await this.validateNotBlocked(
            restaurantId,
            reservationStart,
          );


        // 3. Si cambia el horario o comensales, verificar disponibilidad de mesas de manera atómica
          if (newReservationStart || newGuestCount) {
            const availableTables = await this.availabilityRepository.findAvailableTables(
              restaurantId,
              reservationStart,
              reservationEnd,
              guestCount,
                activeReservation.id,
            );

            if (availableTables.length === 0) {
              return {
                success: false,
                message: `Lo siento, no hay mesas disponibles para ${guestCount} personas en la nueva fecha solicitada.`,
              };
            }
          }

          await this.reservationRepository.reschedule(
            restaurantId,
            activeReservation.id,
            reservationStart,
            reservationEnd,
          );

          if (guestCount !== activeReservation.guestCount) {
            await tx.reservation.update({
              where: {
                id: activeReservation.id,
              },
              data: {
                guestCount,
              },
            });
          }


        const formattedDate = reservationStart.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
        const formattedTime = reservationStart.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

        return {
          success: true,
          message: `¡Perfecto! Tu reserva ha sido modificada con éxito. Nueva fecha: ${formattedDate} a las ${formattedTime} para ${guestCount} personas.`,
        };
      });
    } catch (error) {
      return {
        success: false,
        message: "Ocurrió un error interno al intentar modificar tu reserva de forma segura.",
      };
    }
  }
}
