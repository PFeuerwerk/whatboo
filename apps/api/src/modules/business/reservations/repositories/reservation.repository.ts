import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { ReservationStatus } from '@prisma/client';

@Injectable()
export class ReservationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByDateRange(restaurantId: string, start: Date, end: Date) {
    return this.prisma.reservation.findMany({
      where: {
        restaurantId,
        reservationStart: { gte: start, lte: end }
      },
      include: {
        customer: true,
        tables: { include: { table: true } }
      },
      orderBy: { reservationStart: 'asc' }
    });
  }

  async findById(restaurantId: string, id: string) {
    return this.prisma.reservation.findFirst({
      where: { id, restaurantId },
      include: { customer: true, tables: true }
    });
  }

  async updateStatus(restaurantId: string, id: string, status: ReservationStatus) {
    return this.prisma.reservation.updateMany({
      where: { id, restaurantId },
      data: { status }
    });
  }

  /**
   * MUTACIÓN EXPANDIDA PARA DRAG & DROP
   * Guarda de forma física la reasignación de mesa y slot horario en PostgreSQL
   */
  async update(restaurantId: string, id: string, data: { tableId?: string; timeSlot?: string; reservationStart?: Date }) {
    // 1. Ejecutar la actualización base de los strings relacionales en la reserva
    const updatedReservation = await this.prisma.reservation.update({
      where: { id },
      data: {
        timeSlot: data.timeSlot,
        ...(data.reservationStart && { reservationStart: data.reservationStart })
      }
    });

    // 2. Si se arrastró a una nueva mesa física, romper el pivote viejo y crear el enganche en reservation_tables
    if (data.tableId) {
      // Eliminar asignación previa en la tabla intermedia de este comensal
      await this.prisma.reservationTable.deleteMany({
        where: { reservationId: id }
      });

      // Insertar el nuevo registro de vinculación física de la mesa
      await this.prisma.reservationTable.create({
        data: {
          reservationId: id,
          tableId: data.tableId,
          autoAssigned: false
        }
      });
    }

    return updatedReservation;
  }
}
