import { Injectable } from '@nestjs/common';
import { OpeningHour } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { UpdateRestaurantSettingsDto } from '../dto/restaurant-settings.dto';
import {
  normalizeDayOfWeek,
  normalizeNonNegativeInt,
  normalizeNullablePositiveInt,
  normalizeOptionalText,
  normalizePositiveInt,
  normalizeSlotInterval,
  normalizeTime,
  WEEK_DAYS,
} from './restaurant-input-normalizer';

@Injectable()
export class RestaurantSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOperationalSettings(restaurantId: string) {
    const [restaurant, openingHours, capacityRule] = await Promise.all([
      this.prisma.restaurant.findUniqueOrThrow({
        where: { id: restaurantId },
        select: {
          id: true,
          name: true,
          timezone: true,
          currency: true,
          locale: true,
          maxCapacity: true,
          defaultReservationDuration: true,
          slotIntervalMinutes: true,
          bufferTimeMinutes: true,
          autoConfirm: true,
          allowWaitlist: true,
        },
      }),
      this.prisma.openingHour.findMany({
        where: { restaurantId, active: true, deletedAt: null },
        orderBy: { dayOfWeek: 'asc' },
      }),
      this.prisma.capacityRule.findUnique({
        where: { restaurantId },
      }),
    ]);

    const normalizedOpeningHours = this.mergeOpeningHours(openingHours);

    return {
      ...restaurant,
      closingHourLimit: this.calculateClosingHourLimit(normalizedOpeningHours),
      openingHours: normalizedOpeningHours,
      capacityRule: capacityRule ?? {
        id: null,
        restaurantId,
        maxGuestsPerReservation: null,
        maxReservationsPerSlot: null,
        slotDurationMinutes: restaurant.defaultReservationDuration,
        bufferMinutes: restaurant.bufferTimeMinutes,
        maxDailyCapacity: restaurant.maxCapacity,
        overbookingAllowed: false,
        active: true,
      },
    };
  }

  async updateOperationalSettings(restaurantId: string, dto: UpdateRestaurantSettingsDto) {
    await this.prisma.$transaction(async (tx) => {
      await tx.restaurant.update({
        where: { id: restaurantId },
        data: {
          name: dto.name !== undefined ? normalizeOptionalText(dto.name) : undefined,
          timezone: dto.timezone !== undefined ? normalizeOptionalText(dto.timezone) : undefined,
          currency: dto.currency !== undefined ? normalizeOptionalText(dto.currency) : undefined,
          locale: dto.locale !== undefined ? normalizeOptionalText(dto.locale) : undefined,
          maxCapacity: dto.maxCapacity !== undefined ? normalizeNullablePositiveInt(dto.maxCapacity) : undefined,
          slotIntervalMinutes: dto.slotIntervalMinutes !== undefined ? normalizeSlotInterval(dto.slotIntervalMinutes) : undefined,
          bufferTimeMinutes: dto.bufferTimeMinutes !== undefined ? normalizeNonNegativeInt(dto.bufferTimeMinutes) : undefined,
          defaultReservationDuration:
            dto.defaultReservationDuration !== undefined ? normalizePositiveInt(dto.defaultReservationDuration, 90) : undefined,
          autoConfirm: dto.autoConfirm !== undefined ? Boolean(dto.autoConfirm) : undefined,
          allowWaitlist: dto.allowWaitlist !== undefined ? Boolean(dto.allowWaitlist) : undefined,
        },
      });

      if (dto.capacityRule) {
        await tx.capacityRule.upsert({
          where: { restaurantId },
          update: {
            maxGuestsPerReservation:
              dto.capacityRule.maxGuestsPerReservation !== undefined
                ? normalizeNullablePositiveInt(dto.capacityRule.maxGuestsPerReservation)
                : undefined,
            maxReservationsPerSlot:
              dto.capacityRule.maxReservationsPerSlot !== undefined
                ? normalizeNullablePositiveInt(dto.capacityRule.maxReservationsPerSlot)
                : undefined,
            slotDurationMinutes:
              dto.capacityRule.slotDurationMinutes !== undefined
                ? normalizePositiveInt(dto.capacityRule.slotDurationMinutes, 120)
                : undefined,
            bufferMinutes:
              dto.capacityRule.bufferMinutes !== undefined
                ? normalizeNonNegativeInt(dto.capacityRule.bufferMinutes)
                : undefined,
            maxDailyCapacity:
              dto.capacityRule.maxDailyCapacity !== undefined
                ? normalizeNullablePositiveInt(dto.capacityRule.maxDailyCapacity)
                : undefined,
            overbookingAllowed:
              dto.capacityRule.overbookingAllowed !== undefined ? Boolean(dto.capacityRule.overbookingAllowed) : undefined,
            active: true,
          },
          create: {
            restaurantId,
            maxGuestsPerReservation: normalizeNullablePositiveInt(dto.capacityRule.maxGuestsPerReservation),
            maxReservationsPerSlot: normalizeNullablePositiveInt(dto.capacityRule.maxReservationsPerSlot),
            slotDurationMinutes: normalizePositiveInt(dto.capacityRule.slotDurationMinutes, 120),
            bufferMinutes: normalizeNonNegativeInt(dto.capacityRule.bufferMinutes ?? 15),
            maxDailyCapacity: normalizeNullablePositiveInt(dto.capacityRule.maxDailyCapacity),
            overbookingAllowed: Boolean(dto.capacityRule.overbookingAllowed),
            active: true,
          },
        });
      }

      if (Array.isArray(dto.openingHours)) {
        for (const hour of dto.openingHours) {
          const dayOfWeek = normalizeDayOfWeek(hour.dayOfWeek);
          await tx.openingHour.upsert({
            where: { restaurantId_dayOfWeek: { restaurantId, dayOfWeek } },
            update: {
              openTime: normalizeTime(hour.openTime, 'Hora de apertura inválida.'),
              closeTime: normalizeTime(hour.closeTime, 'Hora de cierre inválida.'),
              isClosed: Boolean(hour.isClosed),
              active: hour.active !== undefined ? Boolean(hour.active) : true,
              deletedAt: null,
            },
            create: {
              restaurantId,
              dayOfWeek,
              openTime: normalizeTime(hour.openTime, 'Hora de apertura inválida.'),
              closeTime: normalizeTime(hour.closeTime, 'Hora de cierre inválida.'),
              isClosed: Boolean(hour.isClosed),
              active: hour.active !== undefined ? Boolean(hour.active) : true,
            },
          });
        }
      }
    });

    return this.getOperationalSettings(restaurantId);
  }

  private mergeOpeningHours(openingHours: OpeningHour[]): Array<OpeningHour | {
    id: string;
    restaurantId: string;
    dayOfWeek: string;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
    active: boolean;
    deletedAt: null;
  }> {
    return WEEK_DAYS.map((dayOfWeek) => {
      const existing = openingHours.find((hour) => hour.dayOfWeek === dayOfWeek);
      return existing ?? {
        id: '',
        restaurantId: '',
        dayOfWeek,
        openTime: '12:00',
        closeTime: '22:00',
        isClosed: false,
        active: true,
        deletedAt: null,
      };
    });
  }

  private calculateClosingHourLimit(openingHours: Array<{ closeTime: string; isClosed: boolean }>): string {
    const closeTimes = openingHours
      .filter((hour) => !hour.isClosed)
      .map((hour) => String(hour.closeTime))
      .sort();

    return closeTimes.length > 0 ? closeTimes[closeTimes.length - 1] : '22:00';
  }
}
