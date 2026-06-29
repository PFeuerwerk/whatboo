import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DayOfWeek, Prisma, RestaurantTable } from '@prisma/client';
import { AvailabilityRepository } from '../repositories/availability.repository';

@Injectable()
export class AvailabilityService {
  constructor(private readonly availabilityRepository: AvailabilityRepository) {}

  async ensureReservable(
    restaurantId: string,
    reservationStart: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await this.validateOpeningHours(restaurantId, reservationStart, tx);
    await this.validateNotBlocked(restaurantId, reservationStart, tx);
  }

  async findBestAvailableTables(
    restaurantId: string,
    reservationStart: Date,
    reservationEnd: Date,
    guestCount: number,
    excludeReservationId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<RestaurantTable[]> {
    return this.availabilityRepository.findAvailableTables(
      restaurantId,
      reservationStart,
      reservationEnd,
      guestCount,
      excludeReservationId,
      tx,
    );
  }

  async findAvailableSlots(
    restaurantId: string,
    requestedDate: Date,
    guestCount: number,
    durationMinutes = 90,
    tx?: Prisma.TransactionClient,
  ): Promise<string[]> {
    return this.availabilityRepository.findAvailableSlots(
      restaurantId,
      requestedDate,
      guestCount,
      durationMinutes,
      tx,
    );
  }

  private async validateOpeningHours(
    restaurantId: string,
    date: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const openingHours = await this.availabilityRepository.findOpeningHours(
      restaurantId,
      tx,
    );

    if (openingHours.length === 0) {
      throw new NotFoundException('El restaurante no tiene horarios de apertura configurados.');
    }

    const daysMap: DayOfWeek[] = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];

    const todayHours = openingHours.find((oh) => oh.dayOfWeek === daysMap[date.getDay()]);

    if (!todayHours || todayHours.isClosed || !todayHours.active) {
      throw new BadRequestException('El restaurante se encuentra cerrado en el día solicitado.');
    }

    const requestedTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    if (requestedTime < todayHours.openTime || requestedTime >= todayHours.closeTime) {
      throw new BadRequestException(
        `El horario de reserva solicitado está fuera de los límites de servicio comerciales (${todayHours.openTime} - ${todayHours.closeTime}).`,
      );
    }
  }

  private async validateNotBlocked(
    restaurantId: string,
    date: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const blockedDates = await this.availabilityRepository.findBlockedDates(
      restaurantId,
      date,
      tx,
    );

    if (blockedDates.length > 0) {
      throw new BadRequestException('El restaurante ha bloqueado temporalmente la admisión de reservas para esta fecha.');
    }
  }
}
