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
const restaurant_repository_1 = require("../../restaurants/repositories/restaurant.repository");
const prisma_service_1 = require("../../../../infrastructure/database/prisma.service");
const redis_service_1 = require("../../../../infrastructure/cache/redis.service");
const dashboard_gateway_1 = require("../../../../infrastructure/observability/events/dashboard.gateway");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const phone_normalizer_util_1 = require("../../../../common/phone/phone-normalizer.util");
let ReservationEngineService = class ReservationEngineService {
    constructor(reservationRepository, restaurantRepository, availabilityRepository, customerRepository, prisma, redisService, dashboardGateway) {
        this.reservationRepository = reservationRepository;
        this.restaurantRepository = restaurantRepository;
        this.availabilityRepository = availabilityRepository;
        this.customerRepository = customerRepository;
        this.prisma = prisma;
        this.redisService = redisService;
        this.dashboardGateway = dashboardGateway;
    }
    async createReservation(input) {
        const lockKey = `lock:restaurant:${input.restaurantId}:concurrency`;
        const hasLock = await this.redisService.acquireLock(lockKey, 5000);
        if (!hasLock) {
            throw new common_1.BadRequestException("El sistema está procesando otra reserva para este restaurante en este momento. Por favor, reintente en un segundo.");
        }
        try {
            const { restaurantId, phone, guestCount, reservationStart, durationMinutes = 90, notes, customerName, } = input;
            const normalizedPhone = (0, phone_normalizer_util_1.normalizePhone)(phone).normalizedPhone;
            await this.validateOpeningHours(restaurantId, reservationStart);
            await this.validateNotBlocked(restaurantId, reservationStart);
            const reservationEnd = new Date(reservationStart);
            reservationEnd.setMinutes(reservationEnd.getMinutes() + durationMinutes);
            const result = await this.prisma.$transaction(async (tx) => {
                const availableTables = await this.availabilityRepository.findAvailableTables(restaurantId, reservationStart, reservationEnd, guestCount);
                if (availableTables.length === 0) {
                    throw new common_1.BadRequestException('No hay mesas disponibles que se adapten al horario y comensales solicitados.');
                }
                const table = availableTables[0];
                const nameParts = customerName?.trim().split(' ') ?? [];
                const customer = await this.customerRepository.findOrCreate(restaurantId, normalizedPhone, {
                    firstName: nameParts[0] || 'Cliente',
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
            });
            this.dashboardGateway.emitToRestaurant(restaurantId, "reservation_created", result);
            return result;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException("Fallo al procesar de forma atómica la asignación de la mesa.");
        }
        finally {
            await this.redisService.releaseLock(lockKey);
        }
    }
    async cancelLatestReservationByPhone(restaurantId, phone) {
        const normalizedPhone = (0, phone_normalizer_util_1.normalizePhone)(phone).normalizedPhone;
        try {
            return await this.prisma.$transaction(async (tx) => {
                const activeReservation = await tx.reservation.findFirst({
                    where: {
                        restaurantId,
                        customer: {
                            phone: normalizedPhone,
                        },
                        status: {
                            in: [client_1.ReservationStatus.PENDING, client_1.ReservationStatus.CONFIRMED],
                        },
                        reservationStart: {
                            gte: new Date(),
                        },
                    },
                    orderBy: {
                        reservationStart: 'asc',
                    },
                });
                if (!activeReservation) {
                    return {
                        success: false,
                        message: 'No se encontró ninguna reserva activa o pendiente programada para tu número de teléfono.',
                    };
                }
                const updatedReservation = await tx.reservation.update({
                    where: { id: activeReservation.id },
                    data: {
                        status: client_1.ReservationStatus.CANCELLED,
                        cancelledAt: new Date(),
                    },
                });
                return {
                    success: true,
                    message: `Tu reserva para la fecha ${activeReservation.reservationStart.toLocaleDateString('es-ES')} ha sido cancelada correctamente.`,
                    reservation: updatedReservation,
                };
            });
        }
        catch (error) {
            throw new common_1.InternalServerErrorException('Fallo al procesar de manera segura la cancelación de la reserva.');
        }
    }
    async cancelReservationByCode(restaurantId, confirmationCode, phone) {
        const normalizedPhone = (0, phone_normalizer_util_1.normalizePhone)(phone).normalizedPhone;
        try {
            const reservation = await this.reservationRepository.findByConfirmationCode(restaurantId, confirmationCode);
            if (!reservation) {
                return {
                    success: false,
                    message: `No existe ninguna reserva con el código ${confirmationCode}.`,
                };
            }
            const customer = await this.customerRepository.findById(restaurantId, reservation.customerId);
            if (!customer || customer.phone !== normalizedPhone) {
                return {
                    success: false,
                    message: "No tienes permiso para cancelar esta reserva.",
                };
            }
            if (reservation.status ===
                client_1.ReservationStatus.CANCELLED) {
                return {
                    success: false,
                    message: `La reserva ${confirmationCode} ya estaba cancelada.`,
                };
            }
            const updatedReservation = await this.reservationRepository.updateStatus(restaurantId, reservation.id, client_1.ReservationStatus.CANCELLED);
            return {
                success: true,
                message: `✅ Reserva ${confirmationCode} cancelada correctamente.`,
                reservation: updatedReservation,
            };
        }
        catch {
            throw new common_1.InternalServerErrorException('Fallo al cancelar la reserva por código.');
        }
    }
    async getReservationByCode(restaurantId, confirmationCode, phone) {
        const normalizedPhone = (0, phone_normalizer_util_1.normalizePhone)(phone).normalizedPhone;
        const reservation = await this.reservationRepository.findByConfirmationCode(restaurantId, confirmationCode);
        if (!reservation) {
            return {
                success: false,
                message: `No existe ninguna reserva con el código ${confirmationCode}.`,
            };
        }
        const customer = await this.customerRepository.findById(restaurantId, reservation.customerId);
        if (!customer || customer.phone !== normalizedPhone) {
            return {
                success: false,
                message: "No tienes permiso para consultar esta reserva.",
            };
        }
        return {
            success: true,
            reservation,
        };
    }
    async modifyReservationByCode(restaurantId, confirmationCode, phone, newGuestCount, newReservationStart, durationMinutes = 90) {
        const normalizedPhone = (0, phone_normalizer_util_1.normalizePhone)(phone).normalizedPhone;
        try {
            const reservation = await this.reservationRepository.findByConfirmationCode(restaurantId, confirmationCode);
            if (!reservation) {
                return {
                    success: false,
                    message: `No existe ninguna reserva con el código ${confirmationCode}.`,
                };
            }
            const customer = await this.customerRepository.findById(restaurantId, reservation.customerId);
            if (!customer || customer.phone !== normalizedPhone) {
                return {
                    success: false,
                    message: "No tienes permiso para modificar esta reserva.",
                };
            }
            if (reservation.status ===
                client_1.ReservationStatus.CANCELLED) {
                return {
                    success: false,
                    message: `La reserva ${confirmationCode} ya está cancelada y no puede modificarse.`,
                };
            }
            const guestCount = newGuestCount ?? reservation.guestCount;
            const reservationStart = newReservationStart ?? reservation.reservationStart;
            const reservationEnd = new Date(reservationStart);
            reservationEnd.setMinutes(reservationEnd.getMinutes() + durationMinutes);
            await this.validateOpeningHours(restaurantId, reservationStart);
            await this.validateNotBlocked(restaurantId, reservationStart);
            const tables = await this.availabilityRepository.findAvailableTables(restaurantId, reservationStart, reservationEnd, guestCount, reservation.id);
            if (tables.length === 0) {
                return {
                    success: false,
                    message: "No hay disponibilidad para la nueva fecha solicitada.",
                };
            }
            const updatedReservation = await this.reservationRepository.reschedule(restaurantId, reservation.id, reservationStart, reservationEnd, tables[0].id);
            console.log("[RESCHEDULE RESULT]", updatedReservation);
            if (guestCount !==
                reservation.guestCount) {
                await this.prisma.reservation.update({
                    where: {
                        id: reservation.id,
                    },
                    data: {
                        guestCount,
                    },
                });
            }
            return {
                success: true,
                message: `✅ Reserva ${confirmationCode} modificada correctamente.`,
                reservation: updatedReservation,
            };
        }
        catch (error) {
            console.error("[MODIFICATION ERROR]", error);
            throw new common_1.InternalServerErrorException("Fallo al modificar la reserva por código.");
        }
    }
    async validateOpeningHours(restaurantId, date) {
        const openingHours = await this.availabilityRepository.findOpeningHours(restaurantId);
        if (openingHours.length === 0) {
            throw new common_1.NotFoundException('El restaurante no tiene horarios de apertura configurados.');
        }
        const jsDay = date.getDay();
        const daysMap = [
            client_1.DayOfWeek.SUNDAY,
            client_1.DayOfWeek.MONDAY,
            client_1.DayOfWeek.TUESDAY,
            client_1.DayOfWeek.WEDNESDAY,
            client_1.DayOfWeek.THURSDAY,
            client_1.DayOfWeek.FRIDAY,
            client_1.DayOfWeek.SATURDAY,
        ];
        const targetEnumDay = daysMap[jsDay];
        const todayHours = openingHours.find((oh) => oh.dayOfWeek === targetEnumDay);
        if (!todayHours || todayHours.isClosed || !todayHours.active) {
            throw new common_1.BadRequestException('El restaurante se encuentra cerrado en el día solicitado.');
        }
        const requestedTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        if (requestedTime < todayHours.openTime || requestedTime >= todayHours.closeTime) {
            throw new common_1.BadRequestException(`El horario de reserva solicitado está fuera de los límites de servicio comerciales (${todayHours.openTime} - ${todayHours.closeTime}).`);
        }
    }
    async validateNotBlocked(restaurantId, date) {
        const blockedDates = await this.availabilityRepository.findBlockedDates(restaurantId, date);
        if (blockedDates.length > 0) {
            throw new common_1.BadRequestException('El restaurante ha bloqueado temporalmente la admisión de reservas para esta fecha.');
        }
    }
    generateConfirmationCode() {
        return (0, crypto_1.randomBytes)(3).toString('hex').toUpperCase();
    }
    async modifyLatestReservationByPhone(restaurantId, phone, newGuestCount, newReservationStart, durationMinutes = 90) {
        const normalizedPhone = (0, phone_normalizer_util_1.normalizePhone)(phone).normalizedPhone;
        try {
            return await this.prisma.$transaction(async (tx) => {
                const activeReservation = await tx.reservation.findFirst({
                    where: {
                        restaurantId,
                        customer: { phone: normalizedPhone },
                        status: { in: ["PENDING", "CONFIRMED"] },
                        reservationStart: { gte: new Date() },
                    },
                    orderBy: { reservationStart: "asc" },
                });
                if (!activeReservation) {
                    return {
                        success: false,
                        message: "No encontré ninguna reserva activa o pendiente para poder modificar.",
                    };
                }
                const guestCount = newGuestCount ?? activeReservation.guestCount;
                const reservationStart = newReservationStart ?? activeReservation.reservationStart;
                const reservationEnd = new Date(reservationStart);
                reservationEnd.setMinutes(reservationEnd.getMinutes() + durationMinutes);
                await this.validateOpeningHours(restaurantId, reservationStart);
                await this.validateNotBlocked(restaurantId, reservationStart);
                if (newReservationStart || newGuestCount) {
                    const availableTables = await this.availabilityRepository.findAvailableTables(restaurantId, reservationStart, reservationEnd, guestCount, activeReservation.id);
                    if (availableTables.length === 0) {
                        return {
                            success: false,
                            message: `Lo siento, no hay mesas disponibles para ${guestCount} personas en la nueva fecha solicitada.`,
                        };
                    }
                }
                await this.reservationRepository.reschedule(restaurantId, activeReservation.id, reservationStart, reservationEnd);
                if (guestCount !== activeReservation.guestCount) {
                    await tx.reservation.update({
                        where: {
                            id: activeReservation.id,
                        },
                        data: {
                            guestCount,
                        },
                    });
                }
                const formattedDate = reservationStart.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
                const formattedTime = reservationStart.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
                return {
                    success: true,
                    message: `¡Perfecto! Tu reserva ha sido modificada con éxito. Nueva fecha: ${formattedDate} a las ${formattedTime} para ${guestCount} personas.`,
                };
            });
        }
        catch (error) {
            return {
                success: false,
                message: "Ocurrió un error interno al intentar modificar tu reserva de forma segura.",
            };
        }
    }
};
exports.ReservationEngineService = ReservationEngineService;
exports.ReservationEngineService = ReservationEngineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [reservation_repository_1.ReservationRepository,
        restaurant_repository_1.RestaurantRepository,
        availability_repository_1.AvailabilityRepository,
        customer_repository_1.CustomerRepository,
        prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        dashboard_gateway_1.DashboardGateway])
], ReservationEngineService);
//# sourceMappingURL=reservation-engine.service.js.map