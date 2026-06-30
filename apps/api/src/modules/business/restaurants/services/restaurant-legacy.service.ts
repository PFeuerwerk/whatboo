import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { RequestUser } from '../../../../common/http/tenant-request';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { CreateLegacyStaffDto, UpdateLegacyStaffDto } from '../dto/legacy-staff.dto';
import { UpdateMetaCredentialsDto } from '../dto/meta-credentials.dto';
import {
  normalizeEmail,
  normalizeRequiredText,
  normalizeStaffRole,
} from './restaurant-input-normalizer';

@Injectable()
export class RestaurantLegacyService {
  constructor(private readonly prisma: PrismaService) {}

  listStaff(restaurantId: string) {
    return this.prisma.user.findMany({
      where: { restaurantId },
      select: this.safeUserSelect(),
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
    });
  }

  async createStaff(restaurantId: string, actor: RequestUser, dto: CreateLegacyStaffDto) {
    const role = normalizeStaffRole(dto.role ?? UserRole.STAFF);

    if (role === UserRole.OWNER && actor.role !== UserRole.OWNER) {
      throw new ForbiddenException('Solo OWNER puede crear otros usuarios OWNER.');
    }

    const password = String(dto.password ?? '').trim();
    if (password.length < 8) {
      throw new BadRequestException('La contraseña temporal debe tener al menos 8 caracteres.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: {
        email: normalizeEmail(dto.email),
        firstName: normalizeRequiredText(dto.firstName, 'El nombre del usuario es obligatorio.'),
        lastName: normalizeRequiredText(dto.lastName, 'El apellido del usuario es obligatorio.'),
        passwordHash,
        role,
        restaurantId,
        isActive: true,
      },
      select: this.safeUserSelect(),
    });
  }

  async updateStaff(restaurantId: string, actor: RequestUser, userId: string, dto: UpdateLegacyStaffDto) {
    const current = await this.prisma.user.findFirst({
      where: { id: userId, restaurantId },
      select: { id: true, role: true },
    });

    if (!current) {
      throw new BadRequestException('El usuario no existe o no pertenece al restaurante actual.');
    }

    if (current.role === UserRole.OWNER && actor.role !== UserRole.OWNER) {
      throw new ForbiddenException('Solo OWNER puede modificar otro OWNER.');
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.role !== undefined) {
      data.role = normalizeStaffRole(dto.role);
    }
    if (dto.isActive !== undefined) {
      data.isActive = Boolean(dto.isActive);
    }
    if (dto.active !== undefined) {
      data.isActive = Boolean(dto.active);
    }
    if (dto.firstName !== undefined) {
      data.firstName = normalizeRequiredText(dto.firstName, 'El nombre del usuario es obligatorio.');
    }
    if (dto.lastName !== undefined) {
      data.lastName = normalizeRequiredText(dto.lastName, 'El apellido del usuario es obligatorio.');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: this.safeUserSelect(),
    });
  }

  listCustomers(restaurantId: string) {
    return this.prisma.customer.findMany({
      where: { restaurantId },
      orderBy: { firstName: 'asc' },
    });
  }

  async getMetaCredentials(restaurantId: string) {
    const account = await this.prisma.whatsappAccount.findFirst({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      phoneNumberId: account?.phoneNumber ?? '',
      businessAccountId: '',
      accessToken: '',
      appSecret: '',
    };
  }

  async updateMetaCredentials(restaurantId: string, dto: UpdateMetaCredentialsDto) {
    const phoneNumber = String(dto.phoneNumberId ?? '').trim();

    if (!phoneNumber) {
      return this.getMetaCredentials(restaurantId);
    }

    await this.prisma.whatsappAccount.upsert({
      where: { phoneNumber },
      update: {
        restaurantId,
        displayName: this.optionalText(dto.businessAccountId),
      },
      create: {
        restaurantId,
        phoneNumber,
        displayName: this.optionalText(dto.businessAccountId),
      },
    });

    return this.getMetaCredentials(restaurantId);
  }

  private safeUserSelect() {
    return {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    } as const;
  }

  private optionalText(value: unknown): string | undefined {
    const normalized = String(value ?? '').trim();
    return normalized || undefined;
  }
}
