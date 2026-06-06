"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReservationEngineService = void 0;
const common_1 = require("@nestjs/common");
const reservation_repository_1 = require("../repositories/reservation.repository");
const availability_repository_1 = require("../../availability/repositories/availability.repository");
const customer_repository_1 = require("../../customers/repositories/customer.repository");
const crypto_1 = require("crypto");
let ReservationEngineService = class ReservationEngineService {
    constructor(reservationRepository, availabilityRepository, customerRepository) {
        this.reservationRepository = reservationRepository;
        this.availabilityRepository = availabilityRepository;
        this.customerRepository = customerRepository;
    }
    async createReservation(input) {
        const { restaurantId, phone, guestCount, reservationStart, durationMinutes = 90, notes, customerName, } = input;
        await this.validateOpeningHours(restaurantId, reservationStart);
        await this.validateNotBlocked(restaurantId, reservationStart);
        const reservationEnd = new Date(reservationStart);
        reservationEnd.setMinutes(reservationEnd.getMinutes() + durationMinutes);
        const availableTables = await this.availabilityRepository.findAvailableTables(restaurantId, reservationStart, reservationEnd, guestCount);
        if (availableTables.length === 0) {
            throw new common_1.BadRequestException('No tables available for the requested date, time and party size');
        }
        const table = availableTables[0];
        const nameParts = customerName?.split(' ') ?? [];
        const customer = await this.customerRepository.findOrCreate(restaurantId, phone, {
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(' ') || undefined,
        });
        const confirmationCode = this.generateConfirmationCode();
        const reservation = await this.reservationRepository.create({
            restaurantId,
            customerId: customer.id,
            reservationStart,
            reservationEnd,
            guestCount,
            tableId: table.id,
            confirmationCode,
            notes,
        });
        return {
            reservation,
            confirmationCode,
            tableName: table.name,
        };
    }
    async validateOpeningHours(restaurantId, date) {
        const openingHours = await this.availabilityRepository.findOpeningHours(restaurantId);
        if (openingHours.length === 0) {
            throw new common_1.NotFoundException('Restaurant has no opening hours configured');
        }
        const jsDay = date.getDay();
        const prismaDay = jsDay === 0 ? 6 : jsDay - 1;
        const todayHours = openingHours.find((oh) => {
            const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
            return days.indexOf(oh.dayOfWeek) === prismaDay;
        });
        if (!todayHours || todayHours.isClosed) {
            throw new common_1.BadRequestException('Restaurant is closed on the requested day');
        }
        const requestedTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        if (requestedTime < todayHours.openTime || requestedTime >= todayHours.closeTime) {
            throw new common_1.BadRequestException(`Restaurant is only open from ${todayHours.openTime} to ${todayHours.closeTime}`);
        }
    }
    async validateNotBlocked(restaurantId, date) {
        const blockedDates = await this.availabilityRepository.findBlockedDates(restaurantId, date);
        if (blockedDates.length > 0) {
            throw new common_1.BadRequestException('Restaurant is not accepting reservations on this date');
        }
    }
    generateConfirmationCode() {
        return (0, crypto_1.randomBytes)(3).toString('hex').toUpperCase();
    }
};
exports.ReservationEngineService = ReservationEngineService;
exports.ReservationEngineService = ReservationEngineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [reservation_repository_1.ReservationRepository,
        availability_repository_1.AvailabilityRepository,
        customer_repository_1.CustomerRepository])
], ReservationEngineService);
//# sourceMappingURL=reservation-engine.service.js.map