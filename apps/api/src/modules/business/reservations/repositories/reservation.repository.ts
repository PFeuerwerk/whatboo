import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BaseRepository } from '../../../../infrastructure/database/repositories/base.repository';
import { Reservation, ReservationStatus } from '@prisma/client';

@Injectable()
export class ReservationRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(restaurantId: string, id: string): Promise<Reservation | null> {
    this.requireRestaurantId(restaurantId);
    return this.prisma.reservation.findFirst({
      where: { id, restaurantId, deletedAt: null },
      include: { assignedTables: { include: { table: true } }, customer: true },
    });
  }

  async findByConfirmationCode(restaurantId: string, code: string): Promise<Reservation | null> {
    this.requireRestaurantId(restaurantId);
    return this.prisma.reservation.findFirst({
      where: { confirmationCode: code, restaurantId, deletedAt: null },
    });
  }

  async findByCustomer(restaurantId: string, customerId: string): Promise<Reservation[]> {
    this.requireRestaurantId(restaurantId);
    return this.prisma.reservation.findMany({
      where: { restaurantId, customerId, deletedAt: null },
      orderBy: { reservationStart: 'desc' },
    });
  }

  async findActiveByCustomer(
    restaurantId: string,
    customerId: string,
  ): Promise<Reservation[]> {
    this.requireRestaurantId(restaurantId);

    return this.prisma.reservation.findMany({
      where: {
        restaurantId,
        customerId,
        deletedAt: null,
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
          confirmationCode: {
            not: null,
          },
      },
      orderBy: {
        reservationStart: "asc",
      },
    });
  }


  async findByDateRange(restaurantId: string, start: Date, end: Date): Promise<Reservation[]> {
    this.requireRestaurantId(restaurantId);
    return this.prisma.reservation.findMany({
      where: {
        restaurantId,
        deletedAt: null,
        reservationStart: { gte: start },
        reservationEnd: { lte: end },
      },
      include: { customer: true, assignedTables: { include: { table: true } } },
      orderBy: { reservationStart: 'asc' },
    });
  }

  async create(data: {
    restaurantId: string;
    customerId: string;
    reservationStart: Date;
    reservationEnd: Date;
    guestCount: number;
    tableId: string;
    confirmationCode: string;
    notes?: string;
  }): Promise<Reservation> {
    this.requireRestaurantId(data.restaurantId);
    return this.prisma.reservation.create({
      data: {
        restaurantId: data.restaurantId,
        customerId: data.customerId,
        reservationDate: data.reservationStart,
        reservationStart: data.reservationStart,
        reservationEnd: data.reservationEnd,
        guestCount: data.guestCount,
        confirmationCode: data.confirmationCode,
        notes: data.notes,
        status: 'PENDING',
        source: 'WHATSAPP',
        assignedTables: {
          create: { tableId: data.tableId, autoAssigned: true },
        },
      },
    });
  }

  async updateStatus(
    restaurantId: string,
    id: string,
    status: ReservationStatus,
  ): Promise<Reservation> {
    this.requireRestaurantId(restaurantId);
    const timestamps: Record<string, Date> = {};
    if (status === 'CONFIRMED') timestamps.confirmedAt = new Date();
    if (status === 'CANCELLED') timestamps.cancelledAt = new Date();
    if (status === 'COMPLETED') timestamps.completedAt = new Date();
    if (status === 'NO_SHOW') timestamps.noShowAt = new Date();
    return this.prisma.reservation.update({
      where: { id },
      data: { status, ...timestamps },
    });
  }


  async reschedule(
    restaurantId: string,
    id: string,
    reservationStart: Date,
    reservationEnd: Date,
    tableId?: string,
  ): Promise<Reservation> {
    this.requireRestaurantId(restaurantId);

    return this.prisma.reservation.update({
      where: { id },
      data: {
        reservationDate: reservationStart,
        reservationStart,
        reservationEnd,
        assignedTables: tableId
          ? {
              deleteMany: {},
              create: {
                tableId,
                autoAssigned: true,
              },
            }
          : undefined,
      },
    });
  }

  async softDelete(restaurantId: string, id: string): Promise<Reservation> {
    this.requireRestaurantId(restaurantId);
    return this.prisma.reservation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
