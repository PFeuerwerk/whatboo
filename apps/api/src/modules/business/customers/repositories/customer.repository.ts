import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BaseRepository } from '../../../../infrastructure/database/repositories/base.repository';
import { Customer } from '@prisma/client';

@Injectable()
export class CustomerRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByPhone(restaurantId: string, phone: string): Promise<Customer | null> {
    this.requireRestaurantId(restaurantId);
    return this.prisma.customer.findUnique({
      where: { restaurantId_phone: { restaurantId, phone } },
    });
  }

  async findById(restaurantId: string, id: string): Promise<Customer | null> {
    this.requireRestaurantId(restaurantId);
    return this.prisma.customer.findFirst({
      where: { id, restaurantId, active: true },
    });
  }

  async findAll(restaurantId: string): Promise<Customer[]> {
    this.requireRestaurantId(restaurantId);
    return this.prisma.customer.findMany({
      where: { restaurantId, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOrCreate(
    restaurantId: string,
    phone: string,
    data?: { firstName?: string; lastName?: string },
  ): Promise<Customer> {
    this.requireRestaurantId(restaurantId);
    return this.prisma.customer.upsert({
      where: { restaurantId_phone: { restaurantId, phone } },
      update: {},
      create: {
        restaurantId,
        phone,
        firstName: data?.firstName,
        lastName: data?.lastName,
      },
    });
  }

  async update(
    restaurantId: string,
    id: string,
    data: Partial<Customer>,
  ): Promise<Customer> {
    this.requireRestaurantId(restaurantId);
    return this.prisma.customer.update({
      where: { id },
      data: { ...data, restaurantId },
    });
  }
}
