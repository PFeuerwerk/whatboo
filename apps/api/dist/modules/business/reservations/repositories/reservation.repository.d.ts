import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BaseRepository } from '../../../../infrastructure/database/repositories/base.repository';
import { Reservation, ReservationStatus } from '@prisma/client';
export declare class ReservationRepository extends BaseRepository {
    constructor(prisma: PrismaService);
    findById(restaurantId: string, id: string): Promise<Reservation | null>;
    findByConfirmationCode(restaurantId: string, code: string): Promise<Reservation | null>;
    findByCustomer(restaurantId: string, customerId: string): Promise<Reservation[]>;
    findActiveByCustomer(restaurantId: string, customerId: string): Promise<Reservation[]>;
    findByDateRange(restaurantId: string, start: Date, end: Date): Promise<Reservation[]>;
    create(data: {
        restaurantId: string;
        customerId: string;
        reservationStart: Date;
        reservationEnd: Date;
        guestCount: number;
        tableId: string;
        confirmationCode: string;
        notes?: string;
    }): Promise<Reservation>;
    update(restaurantId: string, id: string, data: Partial<Reservation>): Promise<Reservation>;
    updateStatus(restaurantId: string, id: string, status: ReservationStatus): Promise<Reservation>;
    reschedule(restaurantId: string, id: string, reservationStart: Date, reservationEnd: Date, tableId?: string): Promise<Reservation>;
    softDelete(restaurantId: string, id: string): Promise<Reservation>;
}
