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
exports.ReservationRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../infrastructure/database/prisma.service");
const base_repository_1 = require("../../../../infrastructure/database/repositories/base.repository");
let ReservationRepository = class ReservationRepository extends base_repository_1.BaseRepository {
    constructor(prisma) {
        super(prisma);
    }
    async findById(restaurantId, id) {
        this.requireRestaurantId(restaurantId);
        return this.prisma.reservation.findFirst({
            where: { id, restaurantId, deletedAt: null },
            include: { assignedTables: { include: { table: true } }, customer: true },
        });
    }
    async findByConfirmationCode(restaurantId, code) {
        this.requireRestaurantId(restaurantId);
        return this.prisma.reservation.findFirst({
            where: { confirmationCode: code, restaurantId, deletedAt: null },
        });
    }
    async findByCustomer(restaurantId, customerId) {
        this.requireRestaurantId(restaurantId);
        return this.prisma.reservation.findMany({
            where: { restaurantId, customerId, deletedAt: null },
            orderBy: { reservationStart: 'desc' },
        });
    }
    async findByDateRange(restaurantId, start, end) {
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
    async create(data) {
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
    async updateStatus(restaurantId, id, status) {
        this.requireRestaurantId(restaurantId);
        const timestamps = {};
        if (status === 'CONFIRMED')
            timestamps.confirmedAt = new Date();
        if (status === 'CANCELLED')
            timestamps.cancelledAt = new Date();
        if (status === 'COMPLETED')
            timestamps.completedAt = new Date();
        if (status === 'NO_SHOW')
            timestamps.noShowAt = new Date();
        return this.prisma.reservation.update({
            where: { id },
            data: { status, ...timestamps },
        });
    }
    async softDelete(restaurantId, id) {
        this.requireRestaurantId(restaurantId);
        return this.prisma.reservation.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
};
exports.ReservationRepository = ReservationRepository;
exports.ReservationRepository = ReservationRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReservationRepository);
//# sourceMappingURL=reservation.repository.js.map