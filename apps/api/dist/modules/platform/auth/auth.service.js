"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../../infrastructure/database/prisma.service");
const email_service_1 = require("../../../integrations/email/email.service");
const bcrypt = __importStar(require("bcrypt"));
const crypto = __importStar(require("crypto"));
let AuthService = class AuthService {
    constructor(prisma, jwtService, configService, emailService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
        this.emailService = emailService;
    }
    async handleResetPassword(dto) {
        const { token, newPassword } = dto;
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const resetToken = await this.prisma.passwordResetToken.findFirst({
            where: {
                tokenHash,
                isUsed: false,
                expiresAt: { gt: new Date() },
            },
            include: { user: true },
        });
        if (!resetToken || !resetToken.user || !resetToken.user.isActive) {
            throw new common_1.BadRequestException('El enlace de recuperación es inválido o ha expirado.');
        }
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: resetToken.userId },
                data: {
                    passwordHash,
                    failedLoginAttempts: 0,
                    lockedUntil: null,
                },
            }),
            this.prisma.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { isUsed: true },
            }),
        ]);
    }
    async handleForgotPassword(dto) {
        const { restaurantSlug, email } = dto;
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { slug: restaurantSlug },
        });
        if (!restaurant) {
            throw new common_1.NotFoundException('El restaurante especificado no existe.');
        }
        const user = await this.prisma.user.findFirst({
            where: {
                email: email.toLowerCase().trim(),
                restaurantId: restaurant.id,
                isActive: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('El usuario no pertenece al restaurante especificado.');
        }
        const rawResetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await this.prisma.passwordResetToken.create({
            data: {
                tokenHash,
                userId: user.id,
                expiresAt,
            },
        });
        const webAppUrl = this.configService.get('WEB_APP_URL', 'http://localhost:4200');
        const resetLink = `${webAppUrl}/auth/reset-password?token=${rawResetToken}`;
        await this.emailService.sendPasswordResetMail(user.email, restaurant.name, resetLink);
    }
    async login(email, password, restaurantSlug) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { slug: restaurantSlug },
        });
        if (!restaurant) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const user = await this.prisma.user.findFirst({
            where: { email, restaurantId: restaurant.id, isActive: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            throw new common_1.UnauthorizedException('Account is temporarily locked');
        }
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: { increment: 1 },
                    lockedUntil: user.failedLoginAttempts >= 4
                        ? new Date(Date.now() + 15 * 60 * 1000)
                        : null,
                },
            });
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
                lastLoginAt: new Date(),
            },
        });
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            restaurantId: user.restaurantId,
        };
        console.log('[LOGIN USER]', user.email);
        console.log('[LOGIN PAYLOAD]', payload);
        console.log('[JWT SECRET]', this.configService.get('JWT_SECRET'));
        const token = this.jwtService.sign(payload);
        console.log('[JWT TOKEN OK]');
        return { accessToken: token };
    }
    async provisionTenant(dto) {
        const existingTenant = await this.prisma.restaurant.findUnique({ where: { slug: dto.slug } });
        if (existingTenant)
            throw new common_1.BadRequestException("El subdominio o slug ya está registrado por otro restaurante.");
        const existingUser = await this.prisma.user.findFirst({ where: { email: dto.ownerEmail } });
        if (existingUser)
            throw new common_1.BadRequestException("El correo electrónico del dueño ya se encuentra registrado.");
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);
        await this.prisma.$transaction(async (tx) => {
            const restaurant = await tx.restaurant.create({
                data: {
                    name: dto.name,
                    slug: dto.slug,
                    maxCapacity: dto.maxCapacity,
                    timezone: "Europe/Madrid",
                    status: "ACTIVE",
                },
            });
            const user = await tx.user.create({
                data: {
                    email: dto.ownerEmail,
                    firstName: dto.ownerFirstName,
                    lastName: dto.ownerLastName,
                    role: "OWNER",
                    restaurantId: restaurant.id,
                    passwordHash: await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 10),
                    isActive: false,
                },
            });
            await tx.passwordResetToken.create({
                data: {
                    tokenHash,
                    userId: user.id,
                    expiresAt,
                    isUsed: false,
                },
            });
        });
        const activationLink = `${this.configService.get("FRONTEND_URL") || "http://localhost:4200"}/auth/reset-password?token=${rawToken}`;
        await this.emailService.sendMail({
            to: dto.ownerEmail,
            subject: "Activa tu cuenta de Administrador - Panel de Reservas",
            template: activationLink,
            context: {},
        }).catch(() => {
        });
        return { message: "Restaurante y dueño aprovisionados con éxito. Correo de activación enviado." };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map