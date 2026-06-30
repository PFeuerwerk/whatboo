import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { CreateRestaurantTableDto, UpdateRestaurantTableDto } from '../dto/restaurant-table.dto';
import { normalizePositiveInt, normalizeRequiredText } from './restaurant-input-normalizer';
import { RestaurantZonesService } from './restaurant-zones.service';

@Injectable()
export class RestaurantTablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly zonesService: RestaurantZonesService,
  ) {}

  list(restaurantId: string) {
    return this.prisma.restaurantTable.findMany({
      where: { restaurantId, active: true },
      include: { zone: true },
      orderBy: [{ zone: { priority: 'asc' } }, { name: 'asc' }],
    });
  }

  async create(restaurantId: string, dto: CreateRestaurantTableDto) {
    const name = normalizeRequiredText(dto.name, 'El nombre de la mesa es obligatorio.');
    const zoneId = dto.zoneId ? String(dto.zoneId) : null;

    if (zoneId) {
      await this.zonesService.assertBelongsToTenant(restaurantId, zoneId);
    }

    return this.prisma.restaurantTable.create({
      data: {
        name,
        capacity: normalizePositiveInt(dto.capacity, 1),
        zoneId,
        restaurantId,
        active: true,
      },
      include: { zone: true },
    });
  }

  async update(restaurantId: string, tableId: string, dto: UpdateRestaurantTableDto) {
    const data: Prisma.RestaurantTableUncheckedUpdateManyInput = {};

    if (dto.name !== undefined) {
      data.name = normalizeRequiredText(dto.name, 'El nombre de la mesa es obligatorio.');
    }

    if (dto.capacity !== undefined) {
      data.capacity = normalizePositiveInt(dto.capacity, 1);
    }

    if (dto.zoneId !== undefined) {
      data.zoneId = dto.zoneId ? String(dto.zoneId) : null;
      if (data.zoneId) {
        await this.zonesService.assertBelongsToTenant(restaurantId, data.zoneId);
      }
    }

    if (dto.active !== undefined) {
      data.active = Boolean(dto.active);
    }

    const result = await this.prisma.restaurantTable.updateMany({
      where: { id: tableId, restaurantId },
      data,
    });

    if (result.count === 0) {
      throw new BadRequestException('La mesa no existe o no pertenece al restaurante actual.');
    }

    return this.prisma.restaurantTable.findFirstOrThrow({
      where: { id: tableId, restaurantId },
      include: { zone: true },
    });
  }

  async deactivate(restaurantId: string, tableId: string) {
    const result = await this.prisma.restaurantTable.updateMany({
      where: { id: tableId, restaurantId },
      data: { active: false },
    });

    if (result.count === 0) {
      throw new BadRequestException('La mesa no existe o no pertenece al restaurante actual.');
    }

    return this.prisma.restaurantTable.findFirstOrThrow({
      where: { id: tableId, restaurantId },
      include: { zone: true },
    });
  }
}
