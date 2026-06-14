import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BaseRepository } from '../../../../infrastructure/database/repositories/base.repository';
import { Customer } from '@prisma/client';
import { normalizePhone } from "../../../../common/phone/phone-normalizer.util";

@Injectable()
export class CustomerRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByPhone(restaurantId: string, phone: string): Promise<Customer | null> {
      return this.prisma.customer.findUnique({
        where: {
          restaurantId_phone: {
            restaurantId,
            phone: normalizePhone(phone).normalizedPhone,
          },
        },
      });
  }

  async findById(restaurantId: string, id: string): Promise<Customer | null> {
    this.requireRestaurantId(restaurantId);
    return this.prisma.customer.findFirst({
      where: { id, restaurantId, active: true },
    });
  }

  async findAll(restaurantId: string): Promise<Customer[]> {
    return this.prisma.customer.findMany({
      where: { 
        restaurantId,
        active: true 
      },
      orderBy: { 
        totalReservations: 'desc' // Ordenar por fidelización por defecto
      }
    });
  }


  async findOrCreate(
    restaurantId: string,
    phone: string,
    data?: { firstName?: string; lastName?: string },
  ): Promise<Customer> {
    this.requireRestaurantId(restaurantId);
    return this.prisma.customer.upsert({
        where: {
          restaurantId_phone: {
            restaurantId,
            phone: normalizePhone(phone).normalizedPhone,
          },
        },
        update: {},
        create: {
          restaurantId,
          phone: normalizePhone(phone).normalizedPhone,
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
