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
exports.RestaurantRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../infrastructure/database/prisma.service");
const base_repository_1 = require("../../../../infrastructure/database/repositories/base.repository");
let RestaurantRepository = class RestaurantRepository extends base_repository_1.BaseRepository {
    constructor(prisma) {
        super(prisma);
    }
    async findById(id) {
        return this.prisma.restaurant.findUnique({
            where: { id },
        });
    }
    async findSettings(id) {
        return this.prisma.restaurant.findUnique({
            where: { id },
            select: {
                timezone: true,
                locale: true,
            },
        });
    }
    async findBySlug(slug) {
        return this.prisma.restaurant.findUnique({
            where: { slug },
        });
    }
    async findAll() {
        return this.prisma.restaurant.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });
    }
    async create(data) {
        return this.prisma.restaurant.create({ data });
    }
    async update(id, data) {
        return this.prisma.restaurant.update({
            where: { id },
            data,
        });
    }
    async softDelete(id) {
        return this.prisma.restaurant.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
};
exports.RestaurantRepository = RestaurantRepository;
exports.RestaurantRepository = RestaurantRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RestaurantRepository);
//# sourceMappingURL=restaurant.repository.js.map