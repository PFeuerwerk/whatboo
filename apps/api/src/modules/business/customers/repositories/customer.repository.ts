import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BaseRepository } from '../../../../infrastructure/database/repositories/base.repository';
import { Customer, Prisma } from '@prisma/client';
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

  async search(
    restaurantId: string,
    input: {
      q?: string;
      take?: number;
      skip?: number;
    },
  ): Promise<{ data: Customer[]; total: number }> {
    this.requireRestaurantId(restaurantId);

    const q = input.q?.trim();
    const take = Math.min(Math.max(Number(input.take ?? 50), 1), 100);
    const skip = Math.max(Number(input.skip ?? 0), 0);
    const where: Prisma.CustomerWhereInput = {
      restaurantId,
      active: true,
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: [
          { totalReservations: 'desc' },
          { lastReservationAt: 'desc' },
          { firstName: 'asc' },
        ],
        take,
        skip,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { data, total };
  }


  async findOrCreate(
    restaurantId: string,
    phone: string,
    data?: { firstName?: string; lastName?: string },
    tx?: Prisma.TransactionClient,
  ): Promise<Customer> {
    this.requireRestaurantId(restaurantId);
    const client = tx ?? this.prisma;

    return client.customer.upsert({
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
