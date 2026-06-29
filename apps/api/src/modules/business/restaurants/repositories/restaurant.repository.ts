import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BaseRepository } from '../../../../infrastructure/database/repositories/base.repository';
import { Prisma, Restaurant } from '@prisma/client';

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

  /**
   * TRANSACTIONAL CONCURRENCY BLINDAJE (High Availability B2B Engine)
   * Ejecuta un aislamiento pesimista FOR UPDATE bloqueando la fila del restaurante 
   * en PostgreSQL para evitar sobre-reservas en ráfagas concurrentes desde Meta API.
   */
  async executeConcurrentBookingTx<T>(
    restaurantId: string, 
    callback: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Bloqueo Pesimista FOR UPDATE a nivel de fila en PostgreSQL para congelar el slot del inquilino
      await tx.$executeRaw`SELECT id FROM "restaurants" WHERE id = ${restaurantId} FOR UPDATE`;
      
      // 2. Ejecutar la lógica de asignación y verificación de capacidad de forma segura y secuencial
      return callback(tx);
    });
  }
}
