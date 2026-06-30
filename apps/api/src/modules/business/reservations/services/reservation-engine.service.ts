import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ReservationRepository } from '../repositories/reservation.repository';
import { AvailabilityService } from '../../availability/services/availability.service';
import { CustomerRepository } from '../../customers/repositories/customer.repository';
import { RestaurantRepository } from "../../restaurants/repositories/restaurant.repository";

import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { Reservation, ReservationStatus } from '@prisma/client';
import {
  formatDateInRestaurantTimezone,
  formatTimeInRestaurantTimezone,
  getRestaurantLocalDayIndex,
  getRestaurantLocalTimeValue,
} from "../../../../common/time/restaurant-timezone.util";
import { normalizePhone } from "../../../../common/phone/phone-normalizer.util";
import {
  CreateReservationInput,
  CreateReservationUseCase,
  ReservationResult,
} from '../use-cases/create-reservation.use-case';


export interface CancelReservationResult {
  success: boolean;
  message: string;
  reservation?: Reservation | null;
}

export interface ModifyReservationResult {
  success: boolean;
  message: string;
  reservation?: Reservation | null;
}

export interface GetReservationResult {
  success: boolean;
  message?: string;
  reservation?: Reservation | null;
}



@Injectable()
export class ReservationEngineService {
  private readonly logger = new Logger(ReservationEngineService.name);

  constructor(
    private readonly reservationRepository: ReservationRepository,
      private readonly restaurantRepository: RestaurantRepository,

    private readonly availabilityService: AvailabilityService,
    private readonly customerRepository: CustomerRepository,
    private readonly prisma: PrismaService, // Inyección necesaria para transacciones ACID robustas
      private readonly createReservationUseCase: CreateReservationUseCase,
  ) {}

  /**
   * Ejecuta la lógica transaccional de negocio para reservar una mesa en un restaurante
   */
  async createReservation(input: CreateReservationInput): Promise<ReservationResult> {
    return this.createReservationUseCase.execute(input);
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

      await this.availabilityService.ensureReservable(
        restaurantId,
        reservationStart,
      );

      const tables =
        await this.availabilityService.findBestAvailableTables(
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
        this.logger.debug(`Reserva modificada por código: ${updatedReservation?.id ?? reservation.id}`);


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
        this.logger.error(
          'Fallo al modificar reserva por código.',
          error instanceof Error ? error.stack : String(error),
        );

        throw new InternalServerErrorException(
          "Fallo al modificar la reserva por código.",
        );
      }
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

          await this.availabilityService.ensureReservable(
            restaurantId,
            reservationStart,
            tx,
          );


        // 3. Si cambia el horario o comensales, verificar disponibilidad de mesas de manera atómica
          if (newReservationStart || newGuestCount) {
            const availableTables = await this.availabilityService.findBestAvailableTables(
              restaurantId,
              reservationStart,
              reservationEnd,
              guestCount,
                activeReservation.id,
                tx,
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
            undefined,
            tx,
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
