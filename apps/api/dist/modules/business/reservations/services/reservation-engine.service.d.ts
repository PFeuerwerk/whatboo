import { ReservationRepository } from '../repositories/reservation.repository';
import { AvailabilityRepository } from '../../availability/repositories/availability.repository';
import { CustomerRepository } from '../../customers/repositories/customer.repository';
import { Reservation } from '@prisma/client';
export interface CreateReservationInput {
    restaurantId: string;
    phone: string;
    guestCount: number;
    reservationStart: Date;
    durationMinutes?: number;
    notes?: string;
    customerName?: string;
}
export interface ReservationResult {
    reservation: Reservation;
    confirmationCode: string;
    tableName: string;
}
export declare class ReservationEngineService {
    private readonly reservationRepository;
    private readonly availabilityRepository;
    private readonly customerRepository;
    constructor(reservationRepository: ReservationRepository, availabilityRepository: AvailabilityRepository, customerRepository: CustomerRepository);
    createReservation(input: CreateReservationInput): Promise<ReservationResult>;
    private validateOpeningHours;
    private validateNotBlocked;
    private generateConfirmationCode;
}
