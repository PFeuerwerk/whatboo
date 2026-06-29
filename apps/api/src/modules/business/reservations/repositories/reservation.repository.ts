import { Injectable } from '@nestjs/common';
import { Prisma, ReservationStatus, ReservationSource } from '@prisma/client';
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
  tableId?: string | null;
}

export interface ListReservationsRepositoryInput {
  from?: Date;
  to?: Date;
  status?: ReservationStatus;
  source?: ReservationSource;
  q?: string;
  take?: number;
  skip?: number;
}

export interface CreateReservationCancellationAuditInput {
  restaurantId: string;
  reservationId: string;
  cancelledByUserId?: string | null;
  reason: string;
  source?: ReservationSource;
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

  async list(restaurantId: string, input: ListReservationsRepositoryInput) {
    const take = Math.min(Math.max(Number(input.take ?? 50), 1), 100);
    const skip = Math.max(Number(input.skip ?? 0), 0);
    const q = input.q?.trim();
    const where: Prisma.ReservationWhereInput = {
      restaurantId,
      deletedAt: null,
      ...(input.status ? { status: input.status } : {}),
      ...(input.source ? { source: input.source } : {}),
      ...(input.from || input.to
        ? {
            reservationStart: {
              ...(input.from ? { gte: input.from } : {}),
              ...(input.to ? { lte: input.to } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { confirmationCode: { contains: q, mode: 'insensitive' } },
              { notes: { contains: q, mode: 'insensitive' } },
              { customer: { firstName: { contains: q, mode: 'insensitive' } } },
              { customer: { lastName: { contains: q, mode: 'insensitive' } } },
              { customer: { phone: { contains: q } } },
              { customer: { email: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        include: {
          customer: true,
          assignedTables: { include: { table: true } },
        },
        orderBy: { reservationStart: 'asc' },
        take,
        skip,
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return { data, total, take, skip };
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
    return this.createWithClient(data);
  }

  async createWithClient(
    data: CreateReservationRepositoryInput,
    tx?: Prisma.TransactionClient,
  ) {
    const reservationDate = new Date(data.reservationStart);
    reservationDate.setHours(0, 0, 0, 0);
    const client = tx ?? this.prisma;

    return client.reservation.create({
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

  async createCancellationAudit(input: CreateReservationCancellationAuditInput) {
    return this.prisma.reservationCancellationAudit.create({
      data: {
        restaurantId: input.restaurantId,
        reservationId: input.reservationId,
        cancelledByUserId: input.cancelledByUserId ?? null,
        reason: input.reason,
        source: input.source ?? ReservationSource.DASHBOARD,
      },

    });
  }

  async listCancellationAudits(restaurantId: string, reservationId: string) {
    return this.prisma.reservationCancellationAudit.findMany({
      where: { restaurantId, reservationId },
      include: {
        cancelledByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    restaurantId: string,
    id: string,
    data: UpdateReservationRepositoryInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    const current = await client.reservation.findFirst({
      where: { id, restaurantId, deletedAt: null },
      include: {
        customer: true,
        assignedTables: { include: { table: true } },
      },
    });

    if (!current) return null;

    const reservationStart = data.reservationStart ?? current.reservationStart;
    const reservationEnd = data.reservationEnd ?? current.reservationEnd;
    const reservationDate = new Date(reservationStart);
    reservationDate.setHours(0, 0, 0, 0);

    if (data.tableId !== undefined) {
      const tableId = data.tableId || null;

      if (tableId) {
        const table = await client.restaurantTable.findFirst({
          where: { id: tableId, restaurantId, active: true },
          select: { id: true },
        });

        if (!table) return null;
      }

      await client.reservationTable.deleteMany({
        where: {
          reservationId: id,
          reservation: {
            restaurantId,
          },
        },
      });

      if (tableId) {
        await client.reservationTable.create({
          data: {
            reservationId: id,
            tableId,
            autoAssigned: false,
          },
        });
      }
    }

    return client.reservation.update({
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
    tx?: Prisma.TransactionClient,
  ) {
    return this.update(restaurantId, id, {
      reservationStart,
      reservationEnd,
      tableId,
    }, tx);
  }
}
