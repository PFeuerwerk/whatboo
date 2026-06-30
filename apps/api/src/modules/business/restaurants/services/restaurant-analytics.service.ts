import { BadRequestException, Injectable } from '@nestjs/common';
import { ReservationStatus } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

@Injectable()
export class RestaurantAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async dailyAnalytics(restaurantId: string, date?: string) {
    const { start, end } = this.getDayRange(date);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        restaurantId,
        deletedAt: null,
        reservationStart: { gte: start, lte: end },
      },
      select: {
        reservationStart: true,
        guestCount: true,
        status: true,
      },
      orderBy: { reservationStart: 'asc' },
    });

    const totalReservations = reservations.length;
    const totalPax = reservations.reduce((sum, reservation) => sum + reservation.guestCount, 0);
    const attendedReservations = reservations.filter((reservation) =>
      ['CONFIRMED', 'COMPLETED'].includes(reservation.status),
    ).length;
    const actionableReservations = reservations.filter((reservation) => reservation.status !== 'CANCELLED').length;
    const attendanceRate = actionableReservations > 0
      ? Math.round((attendedReservations / actionableReservations) * 100)
      : 0;

    const slotCounts = new Map<string, number>();

    for (const reservation of reservations) {
      const hour = reservation.reservationStart.getHours().toString().padStart(2, '0');
      const minute = reservation.reservationStart.getMinutes().toString().padStart(2, '0');
      const slot = `${hour}:${minute}`;
      slotCounts.set(slot, (slotCounts.get(slot) ?? 0) + 1);
    }

    const maxSlotCount = Math.max(...slotCounts.values(), 0);
    const hourlyData = Array.from(slotCounts.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([time, count]) => ({
        time,
        count,
        percentage: maxSlotCount > 0 ? Math.round((count / maxSlotCount) * 100) : 0,
      }));

    return {
      date: start.toISOString().slice(0, 10),
      totalReservations,
      totalPax,
      attendanceRate,
      hourlyData,
    };
  }

  async operationalReport(restaurantId: string, from?: string, to?: string) {
    const { start, end } = this.getRange(from, to);
    const reservations = await this.prisma.reservation.findMany({
      where: {
        restaurantId,
        deletedAt: null,
        reservationStart: { gte: start, lte: end },
      },
      select: {
        id: true,
        reservationStart: true,
        guestCount: true,
        status: true,
        source: true,
      },
      orderBy: { reservationStart: 'asc' },
    });

    const byStatus = this.countBy(reservations.map((reservation) => reservation.status));
    const bySource = this.countBy(reservations.map((reservation) => reservation.source));
    const totalReservations = reservations.length;
    const totalPax = reservations.reduce((sum, reservation) => sum + reservation.guestCount, 0);
    const completedReservations = byStatus[ReservationStatus.COMPLETED] ?? 0;
    const cancelledReservations = byStatus[ReservationStatus.CANCELLED] ?? 0;
    const noShowReservations = byStatus[ReservationStatus.NO_SHOW] ?? 0;
    const attendedReservations = completedReservations + (byStatus[ReservationStatus.CONFIRMED] ?? 0);
    const actionableReservations = totalReservations - cancelledReservations;

    return {
      from: start.toISOString(),
      to: end.toISOString(),
      totals: {
        reservations: totalReservations,
        pax: totalPax,
        completed: completedReservations,
        cancelled: cancelledReservations,
        noShow: noShowReservations,
        attendanceRate: actionableReservations > 0 ? Math.round((attendedReservations / actionableReservations) * 100) : 0,
        cancellationRate: totalReservations > 0 ? Math.round((cancelledReservations / totalReservations) * 100) : 0,
        noShowRate: totalReservations > 0 ? Math.round((noShowReservations / totalReservations) * 100) : 0,
      },
      byStatus,
      bySource,
      byDay: this.buildDailySeries(reservations),
    };
  }

  private getRange(from?: string, to?: string): { start: Date; end: Date } {
    const start = from ? new Date(from) : new Date();
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('Fecha inicial inválida. Usa YYYY-MM-DD o ISO-8601.');
    }
    start.setHours(0, 0, 0, 0);

    const end = to ? new Date(to) : new Date(start);
    if (Number.isNaN(end.getTime())) {
      throw new BadRequestException('Fecha final inválida. Usa YYYY-MM-DD o ISO-8601.');
    }
    end.setHours(23, 59, 59, 999);

    if (end < start) {
      throw new BadRequestException('La fecha final debe ser igual o posterior a la fecha inicial.');
    }

    return { start, end };
  }

  private countBy(values: string[]): Record<string, number> {
    return values.reduce<Record<string, number>>((acc, value) => {
      acc[value] = (acc[value] ?? 0) + 1;
      return acc;
    }, {});
  }

  private buildDailySeries(reservations: Array<{ reservationStart: Date; guestCount: number; status: string }>) {
    const series = new Map<string, { date: string; reservations: number; pax: number; completed: number; cancelled: number; noShow: number }>();

    for (const reservation of reservations) {
      const date = reservation.reservationStart.toISOString().slice(0, 10);
      const current = series.get(date) ?? { date, reservations: 0, pax: 0, completed: 0, cancelled: 0, noShow: 0 };
      current.reservations += 1;
      current.pax += reservation.guestCount;
      if (reservation.status === ReservationStatus.COMPLETED) current.completed += 1;
      if (reservation.status === ReservationStatus.CANCELLED) current.cancelled += 1;
      if (reservation.status === ReservationStatus.NO_SHOW) current.noShow += 1;
      series.set(date, current);
    }

    return Array.from(series.values()).sort((left, right) => left.date.localeCompare(right.date));
  }

  private getDayRange(date?: string): { start: Date; end: Date } {
    const start = date ? new Date(date) : new Date();

    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('Formato de fecha inválido. Usa YYYY-MM-DD.');
    }

    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }
}
