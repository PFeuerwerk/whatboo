import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtAuthGuard } from '../../../../modules/platform/auth/guards/jwt-auth.guard';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { JwtPayload } from '../../../../modules/platform/auth/strategies/jwt.strategy';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

interface AuthRequest extends Request {
  user: JwtPayload;
  tenantId?: string;
}

const STAFF_ROLES: UserRole[] = [UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF];
const MANAGEMENT_ROLES: UserRole[] = [UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN, UserRole.PLATFORM_ADMIN];

@Controller('users')
@UseGuards(JwtAuthGuard) // Protege el perímetro HTTP forzando autenticación mediante token
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene el listado completo de personal vinculado de forma aislada al restaurante activo.
   * Filtra las credenciales sensibles (passwordHash) para mitigar fugas de información.
   * Ruta: GET /api/v1/users
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Request() req: AuthRequest) {
    const restaurantId = this.getTenantId(req);

    return this.prisma.user.findMany({
      where: {
        restaurantId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    const restaurantId = this.getTenantId(req);

    return this.prisma.user.findFirst({
      where: { id, restaurantId },
      select: this.safeUserSelect(),
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: AuthRequest, @Body() dto: CreateUserDto) {
    this.assertManagementRole(req);
    const role = this.normalizeStaffRole(dto.role ?? UserRole.STAFF);

    if (role === UserRole.OWNER && req.user?.role !== UserRole.OWNER) {
      throw new ForbiddenException('Solo OWNER puede crear otros usuarios OWNER.');
    }

    const password = String(dto.password ?? '').trim();
    if (password.length < 8) {
      throw new BadRequestException('La contraseña temporal debe tener al menos 8 caracteres.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: {
        email: this.normalizeEmail(dto.email),
        firstName: this.normalizeRequiredText(dto.firstName, 'El nombre del usuario es obligatorio.'),
        lastName: this.normalizeRequiredText(dto.lastName, 'El apellido del usuario es obligatorio.'),
        passwordHash,
        role,
        restaurantId: this.getTenantId(req),
        isActive: true,
      },
      select: this.safeUserSelect(),
    });
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Request() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    this.assertManagementRole(req);
    const restaurantId = this.getTenantId(req);

    const current = await this.prisma.user.findFirst({
      where: { id, restaurantId },
      select: { id: true, role: true },
    });

    if (!current) {
      throw new BadRequestException('El usuario no existe o no pertenece al restaurante actual.');
    }

    if (current.role === UserRole.OWNER && req.user?.role !== UserRole.OWNER) {
      throw new ForbiddenException('Solo OWNER puede modificar otro OWNER.');
    }

    const data: any = {};

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
      const password = String(dto.password ?? '').trim();
      if (password.length < 8) {
        throw new BadRequestException('La contraseña temporal debe tener al menos 8 caracteres.');
      }
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: this.safeUserSelect(),
    });
  }

  private getTenantId(req: AuthRequest): string {
    return req.tenantId ?? req.user.restaurantId!;
  }

  private assertManagementRole(req: AuthRequest): void {
    const role = req.user?.role as UserRole | undefined;
    if (!role || !MANAGEMENT_ROLES.includes(role)) {
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
    };
  }
}
