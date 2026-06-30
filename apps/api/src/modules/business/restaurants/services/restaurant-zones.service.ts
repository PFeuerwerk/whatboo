import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { CreateRestaurantZoneDto, UpdateRestaurantZoneDto } from '../dto/restaurant-zone.dto';
import { normalizePositiveInt, normalizeRequiredText } from './restaurant-input-normalizer';

@Injectable()
export class RestaurantZonesService {
  constructor(private readonly prisma: PrismaService) {}

  list(restaurantId: string) {
    return this.prisma.restaurantZone.findMany({
      where: { restaurantId, active: true },
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    });
  }

  create(restaurantId: string, dto: CreateRestaurantZoneDto) {
    const name = normalizeRequiredText(dto.name, 'El nombre de la zona es obligatorio.');

    return this.prisma.restaurantZone.create({
      data: {
        restaurantId,
        name,
        priority: normalizePositiveInt(dto.priority, 1),
        active: true,
      },
    });
  }

  async update(restaurantId: string, zoneId: string, dto: UpdateRestaurantZoneDto) {
    const data: Prisma.RestaurantZoneUpdateManyMutationInput = {};

    if (dto.name !== undefined) {
      data.name = normalizeRequiredText(dto.name, 'El nombre de la zona es obligatorio.');
    }

    if (dto.priority !== undefined) {
      data.priority = normalizePositiveInt(dto.priority, 1);
    }

    if (dto.active !== undefined) {
      data.active = Boolean(dto.active);
    }

    const result = await this.prisma.restaurantZone.updateMany({
      where: { id: zoneId, restaurantId },
      data,
    });

    if (result.count === 0) {
      throw new BadRequestException('La zona no existe o no pertenece al restaurante actual.');
    }

    return this.prisma.restaurantZone.findFirstOrThrow({
      where: { id: zoneId, restaurantId },
    });
  }

  async deactivate(restaurantId: string, zoneId: string) {
    const activeTables = await this.prisma.restaurantTable.count({
      where: { restaurantId, zoneId, active: true },
    });

    if (activeTables > 0) {
      throw new BadRequestException('No se puede desactivar una zona con mesas activas.');
    }

    const result = await this.prisma.restaurantZone.updateMany({
      where: { id: zoneId, restaurantId },
      data: { active: false },
    });

    if (result.count === 0) {
      throw new BadRequestException('La zona no existe o no pertenece al restaurante actual.');
    }

    return this.prisma.restaurantZone.findFirstOrThrow({
      where: { id: zoneId, restaurantId },
    });
  }

  async assertBelongsToTenant(restaurantId: string, zoneId: string): Promise<void> {
    const zone = await this.prisma.restaurantZone.findFirst({
      where: { id: zoneId, restaurantId, active: true },
      select: { id: true },
    });

    if (!zone) {
      throw new BadRequestException('La zona seleccionada no existe o no pertenece al restaurante actual.');
    }
  }
}
