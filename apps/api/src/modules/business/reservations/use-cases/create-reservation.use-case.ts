import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Reservation } from '@prisma/client';
import { randomBytes } from 'crypto';
import { normalizePhone } from '../../../../common/phone/phone-normalizer.util';
import { RedisService } from '../../../../infrastructure/cache/redis.service';
import { DashboardGateway } from '../../../../infrastructure/observability/events/dashboard.gateway';
import { AvailabilityService } from '../../availability/services/availability.service';
import { CustomerRepository } from '../../customers/repositories/customer.repository';
import { RestaurantRepository } from '../../restaurants/repositories/restaurant.repository';
import { ReservationRepository } from '../repositories/reservation.repository';

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

@Injectable()
export class CreateReservationUseCase {
  constructor(
    private readonly restaurantRepository: RestaurantRepository,
    private readonly availabilityService: AvailabilityService,
    private readonly customerRepository: CustomerRepository,
    private readonly reservationRepository: ReservationRepository,
    private readonly redisService: RedisService,
    private readonly dashboardGateway: DashboardGateway,
  ) {}

  async execute(input: CreateReservationInput): Promise<ReservationResult> {
    const lockKey = `lock:restaurant:${input.restaurantId}:concurrency`;
    const hasLock = await this.redisService.acquireLock(lockKey, 5000);

    if (!hasLock) {
      throw new BadRequestException(
        'El sistema está procesando otra reserva para este restaurante en este momento. Por favor, reintente en un segundo.',
      );
    }

    try {
      const result = await this.restaurantRepository.executeConcurrentBookingTx(
        input.restaurantId,
        async (tx) => this.createInsideTransaction(input, tx),
      );

      this.dashboardGateway.emitToRestaurant(
        input.restaurantId,
        'reservation_created',
        result.reservation,
      );

      return result;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Fallo al procesar de forma atómica la asignación de la mesa.',
      );
    } finally {
      await this.redisService.releaseLock(lockKey);
    }
  }

  private async createInsideTransaction(
    input: CreateReservationInput,
    tx: Parameters<Parameters<RestaurantRepository['executeConcurrentBookingTx']>[1]>[0],
  ): Promise<ReservationResult> {
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
    const reservationEnd = new Date(reservationStart);
    reservationEnd.setMinutes(reservationEnd.getMinutes() + durationMinutes);

    await this.availabilityService.ensureReservable(
      restaurantId,
      reservationStart,
      tx,
    );

    const availableTables = await this.availabilityService.findBestAvailableTables(
      restaurantId,
      reservationStart,
      reservationEnd,
      guestCount,
      undefined,
      tx,
    );

    if (availableTables.length === 0) {
      throw new BadRequestException(
        'No hay mesas disponibles que se adapten al horario y comensales solicitados.',
      );
    }

    const table = availableTables[0];
    const nameParts = customerName?.trim().split(' ') ?? [];
    const customer = await this.customerRepository.findOrCreate(
      restaurantId,
      normalizedPhone,
      {
        firstName: nameParts[0] || 'Cliente',
        lastName: nameParts.slice(1).join(' ') || undefined,
      },
      tx,
    );

    const confirmationCode = this.generateConfirmationCode();
    const reservation = await this.reservationRepository.createWithClient(
      {
        restaurantId,
        customerId: customer.id,
        reservationStart,
        reservationEnd,
        guestCount,
        tableId: table.id,
        confirmationCode,
        notes,
      },
      tx,
    );

    return {
      reservation,
      confirmationCode,
      tableName: table.name,
    };
  }

  private generateConfirmationCode(): string {
    return randomBytes(3).toString('hex').toUpperCase();
  }
}
