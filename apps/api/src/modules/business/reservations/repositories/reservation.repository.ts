import { Injectable } from '@nestjs/common';
import { ReservationStatus, ReservationSource } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

export interface CreateReservationRepositoryInput {
  restaurantId: string;
  customerId: string;
  reservationStart: Date;
  reservationEnd: Date;
  guestCount: number;
  tableId?: string;
  confirmationCode?: string;
  notes?: string;
  source?: ReservationSource;
  status?: ReservationStatus;
}

export interface UpdateReservationRepositoryInput {
  reservationStart?: Date;
  reservationEnd?: Date;
  guestCount?: number;
  notes?: string | null;
  tableId?: string;
}

@Injectable()
export class ReservationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByDateRange(restaurantId: string, start: Date, end: Date) {
    return this.prisma.reservation.findMany({
      where: {
        restaurantId,
        deletedAt: null,
        reservationStart: { gte: start, lte: end },
      },
      include: {
        customer: true,
        assignedTables: { include: { table: true } },
      },
      orderBy: { reservationStart: 'asc' },
    });
  }

  async findById(restaurantId: string, id: string) {
    return this.prisma.reservation.findFirst({
      where: { id, restaurantId, deletedAt: null },
      include: {
        customer: true,
        assignedTables: { include: { table: true } },
      },
    });
  }

  async findByConfirmationCode(restaurantId: string, confirmationCode: string) {
    return this.prisma.reservation.findFirst({
      where: {
        restaurantId,
        confirmationCode,
        deletedAt: null,
      },
      include: {
        customer: true,
        assignedTables: { include: { table: true } },
      },
    });
  }

  async findActiveByCustomer(restaurantId: string, customerId: string) {
    return this.prisma.reservation.findMany({
      where: {
        restaurantId,
        customerId,
        deletedAt: null,
        status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] },
        reservationStart: { gte: new Date() },
      },
      include: {
        customer: true,
        assignedTables: { include: { table: true } },
      },
      orderBy: { reservationStart: 'asc' },
    });
  }

  async create(data: CreateReservationRepositoryInput) {
    const reservationDate = new Date(data.reservationStart);
    reservationDate.setHours(0, 0, 0, 0);

    return this.prisma.reservation.create({
      data: {
        restaurantId: data.restaurantId,
        customerId: data.customerId,
        reservationDate,
        reservationStart: data.reservationStart,
        reservationEnd: data.reservationEnd,
        guestCount: data.guestCount,
        confirmationCode: data.confirmationCode,
        notes: data.notes,
        source: data.source ?? ReservationSource.WHATSAPP,
        status: data.status ?? ReservationStatus.CONFIRMED,
        assignedTables: data.tableId
          ? {
              create: {
                tableId: data.tableId,
                autoAssigned: true,
              },
            }
          : undefined,
      },
      include: {
        customer: true,
        assignedTables: { include: { table: true } },
      },
    });
  }

  async updateStatus(restaurantId: string, id: string, status: ReservationStatus) {
    const current = await this.findById(restaurantId, id);
    if (!current) return null;

    const data: Record<string, unknown> = { status };

    if (status === ReservationStatus.CANCELLED) data.cancelledAt = new Date();
    if (status === ReservationStatus.CONFIRMED) data.confirmedAt = new Date();
    if (status === ReservationStatus.COMPLETED) data.completedAt = new Date();
    if (status === ReservationStatus.NO_SHOW) data.noShowAt = new Date();

    return this.prisma.reservation.update({
      where: { id },
      data,
      include: {
        customer: true,
        assignedTables: { include: { table: true } },
      },
    });
  }

  async update(restaurantId: string, id: string, data: UpdateReservationRepositoryInput) {
    const current = await this.findById(restaurantId, id);
    if (!current) return null;

    const reservationStart = data.reservationStart ?? current.reservationStart;
    const reservationEnd = data.reservationEnd ?? current.reservationEnd;
    const reservationDate = new Date(reservationStart);
    reservationDate.setHours(0, 0, 0, 0);

    if (data.tableId) {
      await this.prisma.reservationTable.deleteMany({
        where: {
          reservationId: id,
          reservation: {
            restaurantId,
          },
        },
      });

      await this.prisma.reservationTable.create({
        data: {
          reservationId: id,
          tableId: data.tableId,
          autoAssigned: false,
        },
      });
    }

    return this.prisma.reservation.update({
      where: { id },
      data: {
        reservationDate,
        reservationStart,
        reservationEnd,
        guestCount: data.guestCount,
        notes: data.notes,
      },
      include: {
        customer: true,
        assignedTables: { include: { table: true } },
      },
    });
  }

  async reschedule(
    restaurantId: string,
    id: string,
    reservationStart: Date,
    reservationEnd: Date,
    tableId?: string,
  ) {
    return this.update(restaurantId, id, {
      reservationStart,
      reservationEnd,
      tableId,
    });
  }
}
