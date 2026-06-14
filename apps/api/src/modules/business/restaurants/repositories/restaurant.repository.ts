import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BaseRepository } from '../../../../infrastructure/database/repositories/base.repository';
import { Restaurant } from '@prisma/client';

@Injectable()
export class RestaurantRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string): Promise<Restaurant | null> {
    return this.prisma.restaurant.findUnique({
      where: { id },
    });
  }

  async findSettings(
    id: string,
  ): Promise<{
    timezone: string;
    locale: string;
  } | null> {
    return this.prisma.restaurant.findUnique({
      where: { id },
      select: {
        timezone: true,
        locale: true,
      },
    });
  }


  async findBySlug(slug: string): Promise<Restaurant | null> {
    return this.prisma.restaurant.findUnique({
      where: { slug },
    });
  }

  async findAll(): Promise<Restaurant[]> {
    return this.prisma.restaurant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    slug: string;
    name: string;
    phone: string;
    timezone?: string;
  }): Promise<Restaurant> {
    return this.prisma.restaurant.create({ data });
  }

  async update(id: string, data: Partial<Restaurant>): Promise<Restaurant> {
    return this.prisma.restaurant.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<Restaurant> {
    return this.prisma.restaurant.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
