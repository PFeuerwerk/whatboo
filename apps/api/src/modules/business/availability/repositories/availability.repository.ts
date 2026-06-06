import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BaseRepository } from '../../../../infrastructure/database/repositories/base.repository';
import { OpeningHour, RestaurantTable, BlockedDate } from '@prisma/client';

@Injectable()
export class AvailabilityRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findOpeningHours(restaurantId: string): Promise<OpeningHour[]> {
    this.requireRestaurantId(restaurantId);
    return this.prisma.openingHour.findMany({
      where: { restaurantId, active: true, deletedAt: null },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async findActiveTables(restaurantId: string): Promise<RestaurantTable[]> {
    this.requireRestaurantId(restaurantId);
    return this.prisma.restaurantTable.findMany({
      where: { restaurantId, active: true, deletedAt: null },
      orderBy: { capacity: 'asc' },
    });
  }

  async findBlockedDates(restaurantId: string, date: Date): Promise<BlockedDate[]> {
    this.requireRestaurantId(restaurantId);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return this.prisma.blockedDate.findMany({
      where: { restaurantId, active: true, deletedAt: null, date: { gte: startOfDay, lte: endOfDay } },
    });
  }

  async findAvailableTables(restaurantId: string, start: Date, end: Date, partySize: number): Promise<RestaurantTable[]> {
    this.requireRestaurantId(restaurantId);
    const booked = await this.prisma.reservationTable.findMany({
      where: {
        reservation: {
          restaurantId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          reservationStart: { lt: end },
          reservationEnd: { gt: start },
        },
      },
      select: { tableId: true },
    });
    const bookedIds = booked.map((r) => r.tableId);
    return this.prisma.restaurantTable.findMany({
      where: { restaurantId, active: true, deletedAt: null, capacity: { gte: partySize }, id: { notIn: bookedIds } },
      orderBy: { capacity: 'asc' },
    });
  }
}
