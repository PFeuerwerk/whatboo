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
exports.AvailabilityRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../infrastructure/database/prisma.service");
const base_repository_1 = require("../../../../infrastructure/database/repositories/base.repository");
let AvailabilityRepository = class AvailabilityRepository extends base_repository_1.BaseRepository {
    constructor(prisma) {
        super(prisma);
    }
    async findOpeningHours(restaurantId) {
        this.requireRestaurantId(restaurantId);
        return this.prisma.openingHour.findMany({
            where: { restaurantId, active: true, deletedAt: null },
            orderBy: { dayOfWeek: 'asc' },
        });
    }
    async findActiveTables(restaurantId) {
        this.requireRestaurantId(restaurantId);
        return this.prisma.restaurantTable.findMany({
            where: { restaurantId, active: true, deletedAt: null },
            orderBy: { capacity: 'asc' },
        });
    }
    async findBlockedDates(restaurantId, date) {
        this.requireRestaurantId(restaurantId);
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        return this.prisma.blockedDate.findMany({
            where: { restaurantId, active: true, deletedAt: null, date: { gte: startOfDay, lte: endOfDay } },
        });
    }
    async findAvailableTables(restaurantId, start, end, partySize) {
        this.requireRestaurantId(restaurantId);
        const booked = await this.prisma.reservationTable.findMany({
            where: {
                reservation: {
                    restaurantId,
                    status: { in: ['PENDING', 'CONFIRMED'] },
                    reservationStart: { lt: end },
                    reservationEnd: { gt: start },
                },
            },
            select: { tableId: true },
        });
        const bookedIds = booked.map((r) => r.tableId);
        return this.prisma.restaurantTable.findMany({
            where: { restaurantId, active: true, deletedAt: null, capacity: { gte: partySize }, id: { notIn: bookedIds } },
            orderBy: { capacity: 'asc' },
        });
    }
};
exports.AvailabilityRepository = AvailabilityRepository;
exports.AvailabilityRepository = AvailabilityRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AvailabilityRepository);
//# sourceMappingURL=availability.repository.js.map