import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ReservationRepository } from '../repositories/reservation.repository';
import { AvailabilityRepository } from '../../availability/repositories/availability.repository';
import { CustomerRepository } from '../../customers/repositories/customer.repository';
import { Reservation } from '@prisma/client';
import { randomBytes } from 'crypto';

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
export class ReservationEngineService {
  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly availabilityRepository: AvailabilityRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async createReservation(input: CreateReservationInput): Promise<ReservationResult> {
    const {
      restaurantId,
      phone,
      guestCount,
      reservationStart,
      durationMinutes = 90,
      notes,
      customerName,
    } = input;

    // 1. Validate opening hours
    await this.validateOpeningHours(restaurantId, reservationStart);

    // 2. Check for blocked dates
    await this.validateNotBlocked(restaurantId, reservationStart);

    // 3. Calculate end time
    const reservationEnd = new Date(reservationStart);
    reservationEnd.setMinutes(reservationEnd.getMinutes() + durationMinutes);

    // 4. Find available table
    const availableTables = await this.availabilityRepository.findAvailableTables(
      restaurantId,
      reservationStart,
      reservationEnd,
      guestCount,
    );

    if (availableTables.length === 0) {
      throw new BadRequestException(
        'No tables available for the requested date, time and party size',
      );
    }

    // 5. Select smallest fitting table (best fit)
    const table = availableTables[0];

    // 6. Find or create customer by phone
    const nameParts = customerName?.split(' ') ?? [];
    const customer = await this.customerRepository.findOrCreate(
      restaurantId,
      phone,
      {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' ') || undefined,
      },
    );

    // 7. Generate confirmation code
    const confirmationCode = this.generateConfirmationCode();

    // 8. Create reservation
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
  }

  private async validateOpeningHours(restaurantId: string, date: Date): Promise<void> {
    const openingHours = await this.availabilityRepository.findOpeningHours(restaurantId);

    if (openingHours.length === 0) {
      throw new NotFoundException('Restaurant has no opening hours configured');
    }

    // dayOfWeek: 0=Sunday in JS, but our enum is MONDAY=0
    const jsDay = date.getDay();
    const prismaDay = jsDay === 0 ? 6 : jsDay - 1;

    const todayHours = openingHours.find((oh) => {
      const days = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
      return days.indexOf(oh.dayOfWeek) === prismaDay;
    });

    if (!todayHours || todayHours.isClosed) {
      throw new BadRequestException('Restaurant is closed on the requested day');
    }

    const requestedTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    if (requestedTime < todayHours.openTime || requestedTime >= todayHours.closeTime) {
      throw new BadRequestException(
        `Restaurant is only open from ${todayHours.openTime} to ${todayHours.closeTime}`,
      );
    }
  }

  private async validateNotBlocked(restaurantId: string, date: Date): Promise<void> {
    const blockedDates = await this.availabilityRepository.findBlockedDates(restaurantId, date);
    if (blockedDates.length > 0) {
      throw new BadRequestException('Restaurant is not accepting reservations on this date');
    }
  }

  private generateConfirmationCode(): string {
    return randomBytes(3).toString('hex').toUpperCase();
  }
}
