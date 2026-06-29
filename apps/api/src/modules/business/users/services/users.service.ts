import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { normalizePagination, paginatedResponse } from '../../../../common/pagination/paginated-response';
import { AuditLogService } from '../../../../common/security/audit-log.service';
import { PasswordPolicyService } from '../../../../common/security/password-policy.service';
import { JwtPayload } from '../../../../modules/platform/auth/strategies/jwt.strategy';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';

const STAFF_ROLES: UserRole[] = [UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF];
const MANAGEMENT_ROLES: UserRole[] = [UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN, UserRole.PLATFORM_ADMIN];

interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly passwordPolicy: PasswordPolicyService,
  ) {}

  async findAll(restaurantId: string, query: ListUsersQueryDto) {
    const { take, skip } = normalizePagination(query);
    const q = query.q?.trim();
    const where: Prisma.UserWhereInput = {
      restaurantId,
      ...(query.role ? { role: query.role } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: this.safeUserSelect(),
        orderBy: [{ role: 'asc' }, { email: 'asc' }],
        take,
        skip,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginatedResponse(data, total, { take, skip });
  }

  findOne(restaurantId: string, id: string) {
    return this.prisma.user.findFirst({
      where: { id, restaurantId },
      select: this.safeUserSelect(),
    });
  }

  async create(restaurantId: string, actor: JwtPayload | undefined, dto: CreateUserDto, metadata?: RequestMetadata) {
    this.assertManagementRole(actor?.role);
    const role = this.normalizeStaffRole(dto.role ?? UserRole.STAFF);

    if (role === UserRole.OWNER && actor?.role !== UserRole.OWNER) {
      throw new ForbiddenException('Solo OWNER puede crear otros usuarios OWNER.');
    }

    const password = this.normalizePassword(dto.password);
    this.passwordPolicy.validateOrThrow(password);
    const passwordHash = await bcrypt.hash(password, 10);

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: this.normalizeEmail(dto.email),
          firstName: this.normalizeRequiredText(dto.firstName, 'El nombre del usuario es obligatorio.'),
          lastName: this.normalizeRequiredText(dto.lastName, 'El apellido del usuario es obligatorio.'),
          passwordHash,
          role,
          restaurantId,
          isActive: true,
          mustChangePassword: true,
          temporaryPasswordExpiresAt: this.passwordPolicy.temporaryPasswordExpiresAt(),
        },
        select: this.safeUserSelect(),
      });

      await tx.passwordHistory.create({
        data: { userId: user.id, passwordHash },
      });

      return user;
    });

    await this.auditLog.record({
      tenantId: restaurantId,
      actorUserId: actor?.sub,
      actorRole: actor?.role,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: created.id,
      newValue: created,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      result: 'SUCCESS',
    });

    return created;
  }

  async update(restaurantId: string, actor: JwtPayload | undefined, id: string, dto: UpdateUserDto, metadata?: RequestMetadata) {
    this.assertManagementRole(actor?.role);

    const current = await this.prisma.user.findFirst({
      where: { id, restaurantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        passwordHash: true,
        mustChangePassword: true,
        temporaryPasswordExpiresAt: true,
      },
    });

    if (!current) {
      throw new BadRequestException('El usuario no existe o no pertenece al restaurante actual.');
    }

    if (current.role === UserRole.OWNER && actor?.role !== UserRole.OWNER) {
      throw new ForbiddenException('Solo OWNER puede modificar otro OWNER.');
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.role !== undefined) {
      data.role = this.normalizeStaffRole(dto.role);
    }
    if (dto.isActive !== undefined) {
      data.isActive = Boolean(dto.isActive);
    }
    if (dto.active !== undefined) {
      data.isActive = Boolean(dto.active);
    }
    if (dto.firstName !== undefined) {
      data.firstName = this.normalizeRequiredText(dto.firstName, 'El nombre del usuario es obligatorio.');
    }
    if (dto.lastName !== undefined) {
      data.lastName = this.normalizeRequiredText(dto.lastName, 'El apellido del usuario es obligatorio.');
    }
    if (dto.password !== undefined) {
      const password = this.normalizePassword(dto.password);
      this.passwordPolicy.validateOrThrow(password);
      const recentHistory = await this.prisma.passwordHistory.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      await this.passwordPolicy.assertNotReused(password, [current.passwordHash, ...recentHistory.map((item) => item.passwordHash)]);
      const passwordHash = await bcrypt.hash(password, 10);
      data.passwordHash = passwordHash;
      data.mustChangePassword = true;
      data.temporaryPasswordExpiresAt = this.passwordPolicy.temporaryPasswordExpiresAt();
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data,
        select: this.safeUserSelect(),
      });

      if (dto.password !== undefined && typeof data.passwordHash === 'string') {
        await tx.passwordHistory.create({
          data: { userId: id, passwordHash: data.passwordHash },
        });
      }

      return user;
    });

    await this.auditLog.record({
      tenantId: restaurantId,
      actorUserId: actor?.sub,
      actorRole: actor?.role,
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: id,
      previousValue: current,
      newValue: updated,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      result: 'SUCCESS',
    });

    return updated;
  }

  private assertManagementRole(role?: UserRole | string): void {
    if (!role || !MANAGEMENT_ROLES.includes(role as UserRole)) {
      throw new ForbiddenException('No tienes permisos para modificar usuarios.');
    }
  }

  private normalizeStaffRole(value: unknown): UserRole {
    const role = String(value ?? '').trim().toUpperCase() as UserRole;

    if (!STAFF_ROLES.includes(role)) {
      throw new BadRequestException('Rol inválido. Usa OWNER, MANAGER o STAFF.');
    }

    return role;
  }

  private normalizeEmail(value: unknown): string {
    const email = String(value ?? '').trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Correo electrónico inválido.');
    }

    return email;
  }

  private normalizeRequiredText(value: unknown, errorMessage: string): string {
    const normalized = String(value ?? '').trim();

    if (!normalized) {
      throw new BadRequestException(errorMessage);
    }

    return normalized;
  }

  private normalizePassword(value: unknown): string {
    const password = String(value ?? '').trim();

    if (!password) {
      throw new BadRequestException('La contraseña temporal es obligatoria.');
    }

    return password;
  }

  private safeUserSelect() {
    return {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      temporaryPasswordExpiresAt: true,
      lastLoginAt: true,
      createdAt: true,
    } as const;
  }
}