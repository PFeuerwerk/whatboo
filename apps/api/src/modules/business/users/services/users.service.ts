import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { normalizePagination, paginatedResponse } from '../../../../common/pagination/paginated-response';
import { AuditLogService } from '../../../../common/security/audit-log.service';
import { PasswordPolicyService } from '../../../../common/security/password-policy.service';
import { EmailQueue } from '../../../../integrations/email/queues/email.queue';
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
    private readonly configService: ConfigService,
    private readonly emailQueue: EmailQueue,
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

    const normalizedEmail = this.normalizeEmail(dto.email);
    const sendInvitation = dto.sendInvitation !== false;
    const password = dto.password?.trim() || this.generateTemporaryPassword();
    this.passwordPolicy.validateOrThrow(password);
    const passwordHash = await bcrypt.hash(password, 10);
    const activationToken = sendInvitation ? this.createRawToken() : null;
    const activationTokenHash = activationToken ? this.hashToken(activationToken) : null;
    const tokenExpiresAt = this.passwordPolicy.temporaryPasswordExpiresAt();

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          firstName: this.normalizeRequiredText(dto.firstName, 'El nombre del usuario es obligatorio.'),
          lastName: this.normalizeRequiredText(dto.lastName, 'El apellido del usuario es obligatorio.'),
          passwordHash,
          role,
          restaurantId,
          isActive: true,
          mustChangePassword: true,
          temporaryPasswordExpiresAt: tokenExpiresAt,
        },
        select: this.safeUserSelect(),
      });

      await tx.passwordHistory.create({
        data: { userId: user.id, passwordHash },
      });

      if (activationTokenHash) {
        await tx.passwordResetToken.create({
          data: {
            tokenHash: activationTokenHash,
            userId: user.id,
            expiresAt: tokenExpiresAt,
          },
        });
      }

      return user;
    });

    if (sendInvitation && activationToken) {
      await this.sendStaffInvitation(restaurantId, created, activationToken);
    }

    await this.auditLog.record({
      tenantId: restaurantId,
      actorUserId: actor?.sub,
      actorRole: actor?.role,
      action: sendInvitation ? 'USER_INVITED' : 'USER_CREATED',
      entity: 'User',
      entityId: created.id,
      newValue: { ...created, invitationEmailSent: sendInvitation },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      result: 'SUCCESS',
    });

    return { ...created, invitationEmailSent: sendInvitation };
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

  private async sendStaffInvitation(
    restaurantId: string,
    user: { id: string; email: string; firstName: string | null; lastName: string | null },
    token: string,
  ): Promise<void> {
    const restaurant = await this.prisma.restaurant.findUniqueOrThrow({
      where: { id: restaurantId },
      select: { id: true, slug: true, name: true, locale: true },
    });
    const webAppUrl = this.configService.get<string>('WEB_APP_URL', 'http://localhost:4200');
    const activationLink = `${webAppUrl}/auth/reset-password?token=${token}`;
    const staffName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;

    await this.emailQueue.addStaffInvitationJob({
      tenantId: restaurant.slug,
      restaurantId: restaurant.id,
      templateName: 'staff/invitation',
      locale: restaurant.locale ?? 'es-ES',
      to: user.email,
      staffName,
      restaurantName: restaurant.name,
      activationLink,
      traceId: crypto.randomUUID(),
      invitedAt: new Date().toISOString(),
    });
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

  private generateTemporaryPassword(): string {
    return `${crypto.randomBytes(18).toString('base64url')}Aa1!`;
  }

  private createRawToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
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