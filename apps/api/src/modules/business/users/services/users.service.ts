import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { normalizePagination, paginatedResponse } from '../../../../common/pagination/paginated-response';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';

const STAFF_ROLES: UserRole[] = [UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF];
const MANAGEMENT_ROLES: UserRole[] = [UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN, UserRole.PLATFORM_ADMIN];

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(restaurantId: string, actorRole: UserRole | string | undefined, dto: CreateUserDto) {
    this.assertManagementRole(actorRole);
    const role = this.normalizeStaffRole(dto.role ?? UserRole.STAFF);

    if (role === UserRole.OWNER && actorRole !== UserRole.OWNER) {
      throw new ForbiddenException('Solo OWNER puede crear otros usuarios OWNER.');
    }

    const passwordHash = await bcrypt.hash(this.normalizePassword(dto.password), 10);

    return this.prisma.user.create({
      data: {
        email: this.normalizeEmail(dto.email),
        firstName: this.normalizeRequiredText(dto.firstName, 'El nombre del usuario es obligatorio.'),
        lastName: this.normalizeRequiredText(dto.lastName, 'El apellido del usuario es obligatorio.'),
        passwordHash,
        role,
        restaurantId,
        isActive: true,
      },
      select: this.safeUserSelect(),
    });
  }

  async update(restaurantId: string, actorRole: UserRole | string | undefined, id: string, dto: UpdateUserDto) {
    this.assertManagementRole(actorRole);

    const current = await this.prisma.user.findFirst({
      where: { id, restaurantId },
      select: { id: true, role: true },
    });

    if (!current) {
      throw new BadRequestException('El usuario no existe o no pertenece al restaurante actual.');
    }

    if (current.role === UserRole.OWNER && actorRole !== UserRole.OWNER) {
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
      data.passwordHash = await bcrypt.hash(this.normalizePassword(dto.password), 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: this.safeUserSelect(),
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

    if (password.length < 8) {
      throw new BadRequestException('La contraseña temporal debe tener al menos 8 caracteres.');
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
      lastLoginAt: true,
      createdAt: true,
    } as const;
  }
}
