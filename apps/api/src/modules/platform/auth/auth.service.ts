import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { EmailService } from '../../../integrations/email/email.service';
import { JwtPayload } from './strategies/jwt.strategy';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RestaurantStatus, UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Procesa la validación del token y cambia la contraseña de forma real
   */
  async handleResetPassword(dto: ResetPasswordDto): Promise<void> {
    const { token, newPassword } = dto;

    // 1. Recrear el hash SHA-256 del token crudo recibido para buscarlo de forma segura
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Buscar el token activo, no utilizado y que no haya expirado en PostgreSQL
    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        isUsed: false,
        expiresAt: { gt: new Date() }, // Debe ser mayor a la hora actual
      },
      include: { user: true }, // Traemos la relación del usuario atómicamente
    });

    if (!resetToken || !resetToken.user || !resetToken.user.isActive) {
      throw new BadRequestException('El enlace de recuperación es inválido o ha expirado.');
    }

    // 3. Encriptar la nueva contraseña de forma segura usando bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // 4. Ejecutar actualizaciones atómicas en la base de datos
    await this.prisma.$transaction([
      // Actualizar las credenciales del usuario y limpiar bloqueos previos
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          failedLoginAttempts: 0, // Reiniciar intentos fallidos por seguridad
          lockedUntil: null,      // Desbloquear si estaba penalizado
        },
      }),
      // Invalidar el token inmediatamente para evitar que se use otra vez
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { isUsed: true },
      }),
    ]);
  }

  /**
   * Procesa la lógica de negocio para la recuperación de contraseña
   */
  async handleForgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const { restaurantSlug, email } = dto;

    // 1. Validar que el restaurante exista usando su Slug único
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
    });

    if (!restaurant) {
      throw new NotFoundException('El restaurante especificado no existe.');
    }

    // 2. Validar que el usuario exista y pertenezca a ese restaurante específico (Aislamiento Multi-tenant)
    const user = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        restaurantId: restaurant.id,
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundException('El usuario no pertenece al restaurante especificado.');
    }

    // 3. Generar token criptográfico seguro de alta entropía (un solo uso)
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    
    // 4. Hashear el token con SHA-256 antes de guardarlo (Mejor práctica de seguridad criptográfica)
    const tokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    
    // 5. Definir expiración breve e inflexible (15 minutos)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // 6. Almacenar el token satélite de forma atómica en PostgreSQL mediante Prisma
    await this.prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    // 7. Construir el enlace dinámico apuntando al Frontend (Angular)
    const webAppUrl = this.configService.get<string>('WEB_APP_URL', 'http://localhost:4200');
    const resetLink = `${webAppUrl}/auth/reset-password?token=${rawResetToken}`;

    // 8. Despachar el correo en segundo plano consumiendo nuestra plantilla Handlebars responsiva
    await this.emailService.sendPasswordResetMail(
      user.email,
      restaurant.name,
      resetLink,
    );
  }

  /**
   * Maneja el flujo de inicio de sesión con control de bloqueos por fuerza bruta
   */
  async login(
    email: string,
    password: string,
    restaurantSlug: string,
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
    });

    if (!restaurant) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.prisma.user.findFirst({
      where: { email, restaurantId: restaurant.id, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is temporarily locked');
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
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        restaurantId: user.restaurantId,
        restaurantSlug: restaurant.slug,
      },
    };
  }
  /**
   * Registra un nuevo restaurante e invita al dueño (Owner) enviando un token seguro de activación
   */
    async provisionTenant(dto: CreateTenantDto): Promise<{ accessToken: string }> {
    const existingTenant = await this.prisma.restaurant.findUnique({ where: { slug: dto.slug } });
    if (existingTenant) throw new BadRequestException("El subdominio o slug ya está registrado por otro restaurante.");

    const existingUser = await this.prisma.user.findFirst({ where: { email: dto.ownerEmail } });
    if (existingUser) throw new BadRequestException("El correo electrónico del dueño ya se encuentra registrado.");

    const saltRounds = 10;
    const dummyPasswordHash = await bcrypt.hash("TemporaryPass123!", saltRounds);

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear el Restaurante (Tenant) adaptado al 100% con tu schema.prisma real
      const restaurant = await tx.restaurant.create({
        data: {
          slug: dto.slug,
          name: dto.name,
          phone: "+34600000000",
          timezone: dto.timezone ?? "Europe/Madrid",
          maxCapacity: dto.maxCapacity,
          status: RestaurantStatus.ACTIVE,
          slotIntervalMinutes: 30,
          bufferTimeMinutes: 15,
          defaultReservationDuration: 90,
          autoConfirm: true,
          allowWaitlist: true,
        },
      });

      // 2. Crear la Zona base requerida por el plano físico de mesas para evitar vistas vacías
      const zone = await tx.restaurantZone.create({
        data: {
          name: "Salón Principal",
          priority: 1,
          restaurantId: restaurant.id,
          active: true
        }
      });

      // 3. Crear las primeras 3 mesas físicas para inicializar el Carrusel Horizontal de Angular de forma automática
      const defaultTables = [
        { name: "Mesa 1", capacity: 4 },
        { name: "Mesa 2", capacity: 2 },
        { name: "Mesa 3", capacity: 6 }
      ];
      for (const t of defaultTables) {
        await tx.restaurantTable.create({
          data: {
            name: t.name,
            capacity: t.capacity,
            zoneId: zone.id,
            restaurantId: restaurant.id,
            active: true
          }
        });
      }

      // 4. Crear el Usuario Administrador (Owner) con la columna correcta passwordHash
      const user = await tx.user.create({
        data: {
          email: dto.ownerEmail,
          firstName: dto.ownerFirstName,
          lastName: dto.ownerLastName,
          passwordHash: dummyPasswordHash,
          role: UserRole.OWNER,
          isActive: true,
          restaurantId: restaurant.id,
          failedLoginAttempts: 0
        },
      });

      // Generar token JWT de sesión directo para el Frontend para forzar inicio inmediato automático
      const payload = { sub: user.id, email: user.email, role: user.role, restaurantId: restaurant.id };
      const accessToken = this.jwtService.sign(payload);

      return { accessToken };
    });
  }
}
