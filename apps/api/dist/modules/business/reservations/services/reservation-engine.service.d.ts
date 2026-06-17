import { ReservationRepository } from '../repositories/reservation.repository';
import { AvailabilityRepository } from '../../availability/repositories/availability.repository';
import { CustomerRepository } from '../../customers/repositories/customer.repository';
import { RestaurantRepository } from "../../restaurants/repositories/restaurant.repository";
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { RedisService } from "../../../../infrastructure/cache/redis.service";
import { DashboardGateway } from "../../../../infrastructure/observability/events/dashboard.gateway";
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
export interface CancelReservationResult {
    success: boolean;
    message: string;
    reservation?: Reservation;
}
export interface ModifyReservationResult {
    success: boolean;
    message: string;
    reservation?: Reservation;
}
export interface GetReservationResult {
    success: boolean;
    message?: string;
    reservation?: Reservation;
}
export declare class ReservationEngineService {
    private readonly reservationRepository;
    private readonly restaurantRepository;
    private readonly availabilityRepository;
    private readonly customerRepository;
    private readonly prisma;
    private readonly redisService;
    private readonly dashboardGateway;
    constructor(reservationRepository: ReservationRepository, restaurantRepository: RestaurantRepository, availabilityRepository: AvailabilityRepository, customerRepository: CustomerRepository, prisma: PrismaService, redisService: RedisService, dashboardGateway: DashboardGateway);
    createReservation(input: CreateReservationInput): Promise<ReservationResult>;
    cancelLatestReservationByPhone(restaurantId: string, phone: string): Promise<CancelReservationResult>;
    cancelReservationByCode(restaurantId: string, confirmationCode: string, phone: string): Promise<CancelReservationResult>;
    getReservationByCode(restaurantId: string, confirmationCode: string, phone: string): Promise<{
        success: boolean;
        message: string;
        reservation?: undefined;
    } | {
        success: boolean;
        reservation: {
            id: string;
            restaurantId: string;
            customerId: string;
            reservationDate: Date;
            reservationStart: Date;
            reservationEnd: Date;
            guestCount: number;
            status: import("@prisma/client").$Enums.ReservationStatus;
            source: import("@prisma/client").$Enums.ReservationSource;
            notes: string | null;
            confirmationCode: string | null;
            confirmedAt: Date | null;
            cancelledAt: Date | null;
            completedAt: Date | null;
            noShowAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        };
        message?: undefined;
    }>;
    modifyReservationByCode(restaurantId: string, confirmationCode: string, phone: string, newGuestCount?: number, newReservationStart?: Date, durationMinutes?: number): Promise<ModifyReservationResult>;
    private validateOpeningHours;
    private validateNotBlocked;
    private generateConfirmationCode;
    modifyLatestReservationByPhone(restaurantId: string, phone: string, newGuestCount?: number, newReservationStart?: Date, durationMinutes?: number): Promise<{
        success: boolean;
        message: string;
    }>;
}
