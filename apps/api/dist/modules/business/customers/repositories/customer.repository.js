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
exports.CustomerRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../infrastructure/database/prisma.service");
const base_repository_1 = require("../../../../infrastructure/database/repositories/base.repository");
const phone_normalizer_util_1 = require("../../../../common/phone/phone-normalizer.util");
let CustomerRepository = class CustomerRepository extends base_repository_1.BaseRepository {
    constructor(prisma) {
        super(prisma);
    }
    async findByPhone(restaurantId, phone) {
        return this.prisma.customer.findUnique({
            where: {
                restaurantId_phone: {
                    restaurantId,
                    phone: (0, phone_normalizer_util_1.normalizePhone)(phone).normalizedPhone,
                },
            },
        });
    }
    async findById(restaurantId, id) {
        this.requireRestaurantId(restaurantId);
        return this.prisma.customer.findFirst({
            where: { id, restaurantId, active: true },
        });
    }
    async findAll(restaurantId) {
        return this.prisma.customer.findMany({
            where: {
                restaurantId,
                active: true
            },
            orderBy: {
                totalReservations: 'desc'
            }
        });
    }
    async findOrCreate(restaurantId, phone, data) {
        this.requireRestaurantId(restaurantId);
        return this.prisma.customer.upsert({
            where: {
                restaurantId_phone: {
                    restaurantId,
                    phone: (0, phone_normalizer_util_1.normalizePhone)(phone).normalizedPhone,
                },
            },
            update: {},
            create: {
                restaurantId,
                phone: (0, phone_normalizer_util_1.normalizePhone)(phone).normalizedPhone,
                firstName: data?.firstName,
                lastName: data?.lastName,
            },
        });
    }
    async update(restaurantId, id, data) {
        this.requireRestaurantId(restaurantId);
        return this.prisma.customer.update({
            where: { id },
            data: { ...data, restaurantId },
        });
    }
};
exports.CustomerRepository = CustomerRepository;
exports.CustomerRepository = CustomerRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomerRepository);
//# sourceMappingURL=customer.repository.js.map