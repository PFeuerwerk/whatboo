import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BaseRepository } from '../../../../infrastructure/database/repositories/base.repository';
import { Customer, Prisma, ReservationStatus } from '@prisma/client';
import { normalizePhone } from '../../../../common/phone/phone-normalizer.util';
import { PaginatedResponse, normalizePagination, paginatedResponse } from '../../../../common/pagination/paginated-response';

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

  async findProfile(restaurantId: string, id: string, input: { take?: number; skip?: number }) {
    this.requireRestaurantId(restaurantId);
    const { take, skip } = normalizePagination(input);
    const customer = await this.prisma.customer.findFirst({
      where: { id, restaurantId, active: true },
    });

    if (!customer) return null;

    const reservationWhere: Prisma.ReservationWhereInput = {
      restaurantId,
      customerId: id,
      deletedAt: null,
    };

    const [reservations, reservationCount, completedCount, cancelledCount, noShowCount, totalPax] = await Promise.all([
      this.prisma.reservation.findMany({
        where: reservationWhere,
        include: { assignedTables: { include: { table: true } } },
        orderBy: { reservationStart: 'desc' },
        take,
        skip,
      }),
      this.prisma.reservation.count({ where: reservationWhere }),
      this.prisma.reservation.count({ where: { ...reservationWhere, status: ReservationStatus.COMPLETED } }),
      this.prisma.reservation.count({ where: { ...reservationWhere, status: ReservationStatus.CANCELLED } }),
      this.prisma.reservation.count({ where: { ...reservationWhere, status: ReservationStatus.NO_SHOW } }),
      this.prisma.reservation.aggregate({ where: reservationWhere, _sum: { guestCount: true } }),
    ]);

    return {
      ...customer,
      metrics: {
        reservationCount,
        completedCount,
        cancelledCount,
        noShowCount,
        totalPax: totalPax._sum.guestCount ?? 0,
      },
      reservations: paginatedResponse(reservations, reservationCount, { take, skip }),
    };
  }

  async findAll(restaurantId: string): Promise<Customer[]> {
    return this.prisma.customer.findMany({
      where: {
        restaurantId,
        active: true,
      },
      orderBy: {
        totalReservations: 'desc',
      },
    });
  }

  async search(
    restaurantId: string,
    input: {
      q?: string;
      take?: number;
      skip?: number;
    },
  ): Promise<PaginatedResponse<Customer>> {
    this.requireRestaurantId(restaurantId);

    const q = input.q?.trim();
    const { take, skip } = normalizePagination(input);
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

    return paginatedResponse(data, total, { take, skip });
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