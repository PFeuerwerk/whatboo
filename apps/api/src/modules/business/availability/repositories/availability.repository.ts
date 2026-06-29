import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BaseRepository } from '../../../../infrastructure/database/repositories/base.repository';
import { OpeningHour, RestaurantTable, BlockedDate } from '@prisma/client';

@Injectable()
export class AvailabilityRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findOpeningHours(
    restaurantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<OpeningHour[]> {
    this.requireRestaurantId(
      restaurantId,
    );

    const client = tx ?? this.prisma;

    return client.openingHour.findMany({
      where: {
        restaurantId,
        active: true,
        deletedAt: null,
      },
      orderBy: {
        dayOfWeek: 'asc',
      },
    });
  }

  async findActiveTables(
    restaurantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<RestaurantTable[]> {
    this.requireRestaurantId(
      restaurantId,
    );

    const client = tx ?? this.prisma;

    return client.restaurantTable.findMany({
      where: {
        restaurantId,
        active: true,
      },
      orderBy: {
        capacity: 'asc',
      },
    });
  }

  async findBlockedDates(
    restaurantId: string,
    date: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<BlockedDate[]> {
    this.requireRestaurantId(
      restaurantId,
    );

    const startOfDay =
      new Date(date);

    startOfDay.setHours(
      0,
      0,
      0,
      0,
    );

    const endOfDay =
      new Date(date);

    endOfDay.setHours(
      23,
      59,
      59,
      999,
    );

    const client = tx ?? this.prisma;

    return client.blockedDate.findMany({
      where: {
        restaurantId,
        active: true,
        deletedAt: null,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
  }

  async findAvailableTables(
    restaurantId: string,
    start: Date,
    end: Date,
    partySize: number,
      excludeReservationId?: string,
      tx?: Prisma.TransactionClient,
  ): Promise<RestaurantTable[]> {
    this.requireRestaurantId(
      restaurantId,
    );

    const client = tx ?? this.prisma;

    const booked =
      await client.reservationTable.findMany({
        where: {
          reservation: {
            restaurantId,
              id: excludeReservationId
                ? { not: excludeReservationId }
                : undefined,
            status: {
              in: [
                'PENDING',
                'CONFIRMED',
              ],
            },
            reservationStart: {
              lt: end,
            },
            reservationEnd: {
              gt: start,
            },
          },
        },
        select: {
          tableId: true,
        },
      });

    const bookedIds =
      booked.map(
        (r: { tableId: string }) => r.tableId,
      );


      const maxCapacityThreshold = partySize + 3;

      return client.restaurantTable.findMany({
        where: {
          restaurantId,
          active: true,
          capacity: {
            gte: partySize,
            lte: maxCapacityThreshold,
          },
          id: {
            notIn: bookedIds,
          },
        },
        orderBy: [
          {
            zone: {
              priority: "asc",
            },
          },
          {
            capacity: "asc",
          },
        ],
      });
  }

  async findAvailableSlots(
    restaurantId: string,
    requestedDate: Date,
    partySize: number,
    durationMinutes = 90,
    tx?: Prisma.TransactionClient,
  ): Promise<string[]> {
    const suggestions: string[] = [];

    for (
      let offset = -180;
      offset <= 180;
      offset += 30
    ) {
      if (offset === 0) {
        continue;
      }

      const start =
        new Date(
          requestedDate,
        );

      start.setMinutes(
        start.getMinutes() +
          offset,
      );

      const end =
        new Date(start);

      end.setMinutes(
        end.getMinutes() +
          durationMinutes,
      );

      const tables =
        await this.findAvailableTables(
          restaurantId,
          start,
          end,
          partySize,
          undefined,
          tx,
        );

      if (
        tables.length > 0
      ) {
        suggestions.push(
          start.toLocaleTimeString(
            'es-ES',
            {
              hour: '2-digit',
              minute: '2-digit',
            },
          ),
        );
      }
    }

    return [...new Set(suggestions)];
  }
}
