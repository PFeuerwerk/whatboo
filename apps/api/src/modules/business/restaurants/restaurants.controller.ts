import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DayOfWeek, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { JwtAuthGuard } from '../../platform/auth/guards/jwt-auth.guard';

const STAFF_ROLES: UserRole[] = [UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF];
const MANAGEMENT_ROLES: UserRole[] = [UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN, UserRole.PLATFORM_ADMIN];
const WEEK_DAYS: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
];

@Controller('restaurants')
@UseGuards(JwtAuthGuard)
export class RestaurantsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('zones')
  async getZones(@Req() req: any) {
    return this.prisma.restaurantZone.findMany({
      where: { restaurantId: req.tenantId, active: true },
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    });
  }

  @Post('zones')
  async createZone(@Req() req: any, @Body() dto: any) {
    this.assertManagementRole(req);
    const name = this.normalizeRequiredText(dto.name, 'El nombre de la zona es obligatorio.');

    return this.prisma.restaurantZone.create({
      data: {
        restaurantId: req.tenantId,
        name,
        priority: this.normalizePositiveInt(dto.priority, 1),
        active: true,
      },
    });
  }

  @Patch('zones/:zoneId')
  async updateZone(@Req() req: any, @Param('zoneId') zoneId: string, @Body() dto: any) {
    this.assertManagementRole(req);
    const data: any = {};

    if (dto.name !== undefined) {
      data.name = this.normalizeRequiredText(dto.name, 'El nombre de la zona es obligatorio.');
    }

    if (dto.priority !== undefined) {
      data.priority = this.normalizePositiveInt(dto.priority, 1);
    }

    if (dto.active !== undefined) {
      data.active = Boolean(dto.active);
    }

    const result = await this.prisma.restaurantZone.updateMany({
      where: { id: zoneId, restaurantId: req.tenantId },
      data,
    });

    if (result.count === 0) {
      throw new BadRequestException('La zona no existe o no pertenece al restaurante actual.');
    }

    return this.prisma.restaurantZone.findFirstOrThrow({
      where: { id: zoneId, restaurantId: req.tenantId },
    });
  }

  @Delete('zones/:zoneId')
  async deleteZone(@Req() req: any, @Param('zoneId') zoneId: string) {
    this.assertManagementRole(req);
    const activeTables = await this.prisma.restaurantTable.count({
      where: { restaurantId: req.tenantId, zoneId, active: true },
    });

    if (activeTables > 0) {
      throw new BadRequestException('No se puede desactivar una zona con mesas activas.');
    }

    const result = await this.prisma.restaurantZone.updateMany({
      where: { id: zoneId, restaurantId: req.tenantId },
      data: { active: false },
    });

    if (result.count === 0) {
      throw new BadRequestException('La zona no existe o no pertenece al restaurante actual.');
    }

    return this.prisma.restaurantZone.findFirstOrThrow({
      where: { id: zoneId, restaurantId: req.tenantId },
    });
  }

  @Get('tables')
  async getTables(@Req() req: any) {
    return this.prisma.restaurantTable.findMany({
      where: { restaurantId: req.tenantId, active: true },
      include: { zone: true },
      orderBy: [{ zone: { priority: 'asc' } }, { name: 'asc' }],
    });
  }

  @Post('tables')
  async createTable(@Req() req: any, @Body() dto: any) {
    this.assertManagementRole(req);
    const name = this.normalizeRequiredText(dto.name, 'El nombre de la mesa es obligatorio.');
    const zoneId = dto.zoneId ? String(dto.zoneId) : null;

    if (zoneId) {
      await this.assertZoneBelongsToTenant(req.tenantId, zoneId);
    }

    return this.prisma.restaurantTable.create({
      data: {
        name,
        capacity: this.normalizePositiveInt(dto.capacity, 1),
        zoneId,
        restaurantId: req.tenantId,
        active: true,
      },
      include: { zone: true },
    });
  }

  @Patch('tables/:tableId')
  async updateTable(@Req() req: any, @Param('tableId') tableId: string, @Body() dto: any) {
    this.assertManagementRole(req);
    const data: any = {};

    if (dto.name !== undefined) {
      data.name = this.normalizeRequiredText(dto.name, 'El nombre de la mesa es obligatorio.');
    }

    if (dto.capacity !== undefined) {
      data.capacity = this.normalizePositiveInt(dto.capacity, 1);
    }

    if (dto.zoneId !== undefined) {
      data.zoneId = dto.zoneId ? String(dto.zoneId) : null;
      if (data.zoneId) {
        await this.assertZoneBelongsToTenant(req.tenantId, data.zoneId);
      }
    }

    if (dto.active !== undefined) {
      data.active = Boolean(dto.active);
    }

    const result = await this.prisma.restaurantTable.updateMany({
      where: { id: tableId, restaurantId: req.tenantId },
      data,
    });

    if (result.count === 0) {
      throw new BadRequestException('La mesa no existe o no pertenece al restaurante actual.');
    }

    return this.prisma.restaurantTable.findFirstOrThrow({
      where: { id: tableId, restaurantId: req.tenantId },
      include: { zone: true },
    });
  }

  @Delete('tables/:tableId')
  async deleteTable(@Req() req: any, @Param('tableId') tableId: string) {
    this.assertManagementRole(req);
    const result = await this.prisma.restaurantTable.updateMany({
      where: { id: tableId, restaurantId: req.tenantId },
      data: { active: false },
    });

    if (result.count === 0) {
      throw new BadRequestException('La mesa no existe o no pertenece al restaurante actual.');
    }

    return this.prisma.restaurantTable.findFirstOrThrow({
      where: { id: tableId, restaurantId: req.tenantId },
      include: { zone: true },
    });
  }

  @Get('settings')
  async getSettings(@Req() req: any) {
    return this.buildOperationalSettings(req.tenantId);
  }

  @Patch('settings')
  async updateSettings(@Req() req: any, @Body() dto: any) {
    this.assertManagementRole(req);

    await this.prisma.$transaction(async (tx) => {
      await tx.restaurant.update({
        where: { id: req.tenantId },
        data: {
          name: dto.name !== undefined ? this.normalizeOptionalText(dto.name) : undefined,
          timezone: dto.timezone !== undefined ? this.normalizeOptionalText(dto.timezone) : undefined,
          currency: dto.currency !== undefined ? this.normalizeOptionalText(dto.currency) : undefined,
          locale: dto.locale !== undefined ? this.normalizeOptionalText(dto.locale) : undefined,
          maxCapacity: dto.maxCapacity !== undefined ? this.normalizeNullablePositiveInt(dto.maxCapacity) : undefined,
          slotIntervalMinutes: dto.slotIntervalMinutes !== undefined ? this.normalizeSlotInterval(dto.slotIntervalMinutes) : undefined,
          bufferTimeMinutes: dto.bufferTimeMinutes !== undefined ? this.normalizeNonNegativeInt(dto.bufferTimeMinutes) : undefined,
          defaultReservationDuration:
            dto.defaultReservationDuration !== undefined ? this.normalizePositiveInt(dto.defaultReservationDuration, 90) : undefined,
          autoConfirm: dto.autoConfirm !== undefined ? Boolean(dto.autoConfirm) : undefined,
          allowWaitlist: dto.allowWaitlist !== undefined ? Boolean(dto.allowWaitlist) : undefined,
        },
      });

      if (dto.capacityRule) {
        await tx.capacityRule.upsert({
          where: { restaurantId: req.tenantId },
          update: {
            maxGuestsPerReservation:
              dto.capacityRule.maxGuestsPerReservation !== undefined
                ? this.normalizeNullablePositiveInt(dto.capacityRule.maxGuestsPerReservation)
                : undefined,
            maxReservationsPerSlot:
              dto.capacityRule.maxReservationsPerSlot !== undefined
                ? this.normalizeNullablePositiveInt(dto.capacityRule.maxReservationsPerSlot)
                : undefined,
            slotDurationMinutes:
              dto.capacityRule.slotDurationMinutes !== undefined
                ? this.normalizePositiveInt(dto.capacityRule.slotDurationMinutes, 120)
                : undefined,
            bufferMinutes:
              dto.capacityRule.bufferMinutes !== undefined
                ? this.normalizeNonNegativeInt(dto.capacityRule.bufferMinutes)
                : undefined,
            maxDailyCapacity:
              dto.capacityRule.maxDailyCapacity !== undefined
                ? this.normalizeNullablePositiveInt(dto.capacityRule.maxDailyCapacity)
                : undefined,
            overbookingAllowed:
              dto.capacityRule.overbookingAllowed !== undefined ? Boolean(dto.capacityRule.overbookingAllowed) : undefined,
            active: true,
          },
          create: {
            restaurantId: req.tenantId,
            maxGuestsPerReservation: this.normalizeNullablePositiveInt(dto.capacityRule.maxGuestsPerReservation),
            maxReservationsPerSlot: this.normalizeNullablePositiveInt(dto.capacityRule.maxReservationsPerSlot),
            slotDurationMinutes: this.normalizePositiveInt(dto.capacityRule.slotDurationMinutes, 120),
            bufferMinutes: this.normalizeNonNegativeInt(dto.capacityRule.bufferMinutes ?? 15),
            maxDailyCapacity: this.normalizeNullablePositiveInt(dto.capacityRule.maxDailyCapacity),
            overbookingAllowed: Boolean(dto.capacityRule.overbookingAllowed),
            active: true,
          },
        });
      }

      if (Array.isArray(dto.openingHours)) {
        for (const hour of dto.openingHours) {
          const dayOfWeek = this.normalizeDayOfWeek(hour.dayOfWeek);
          await tx.openingHour.upsert({
            where: { restaurantId_dayOfWeek: { restaurantId: req.tenantId, dayOfWeek } },
            update: {
              openTime: this.normalizeTime(hour.openTime, 'Hora de apertura inválida.'),
              closeTime: this.normalizeTime(hour.closeTime, 'Hora de cierre inválida.'),
              isClosed: Boolean(hour.isClosed),
              active: hour.active !== undefined ? Boolean(hour.active) : true,
              deletedAt: null,
            },
            create: {
              restaurantId: req.tenantId,
              dayOfWeek,
              openTime: this.normalizeTime(hour.openTime, 'Hora de apertura inválida.'),
              closeTime: this.normalizeTime(hour.closeTime, 'Hora de cierre inválida.'),
              isClosed: Boolean(hour.isClosed),
              active: hour.active !== undefined ? Boolean(hour.active) : true,
            },
          });
        }
      }
    });

    return this.buildOperationalSettings(req.tenantId);
  }

  @Get('staff')
  async getStaff(@Req() req: any) {
    return this.prisma.user.findMany({
      where: { restaurantId: req.tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
    });
  }

  @Post('staff')
  async createStaff(@Req() req: any, @Body() dto: any) {
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
        restaurantId: req.tenantId,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  @Patch('staff/:userId')
  async updateStaff(@Req() req: any, @Param('userId') userId: string, @Body() dto: any) {
    this.assertManagementRole(req);

    const current = await this.prisma.user.findFirst({
      where: { id: userId, restaurantId: req.tenantId },
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

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  @Get('analytics')
  async getAnalytics(@Req() req: any, @Query('date') date?: string) {
    return this.buildDailyAnalytics(req.tenantId, date);
  }

  @Get(':slug/analytics')
  @Header('Deprecation', 'true')
  @Header('Sunset', '2026-09-30')
  async getAnalyticsBySlug(@Req() req: any, @Query('date') date?: string) {
    return this.buildDailyAnalytics(req.tenantId, date);
  }

  @Get(':slug/customers')
  @Header('Deprecation', 'true')
  @Header('Sunset', '2026-09-30')
  async getCustomers(@Req() req: any) {
    return this.prisma.customer.findMany({
      where: { restaurantId: req.tenantId },
      orderBy: { firstName: 'asc' },
    });
  }

  @Get(':slug/meta-credentials')
  @Header('Deprecation', 'true')
  @Header('Sunset', '2026-09-30')
  async getMetaCredentials(@Req() req: any) {
    this.assertManagementRole(req);
    const account = await this.prisma.whatsappAccount.findFirst({
      where: { restaurantId: req.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      phoneNumberId: account?.phoneNumber ?? '',
      businessAccountId: '',
      accessToken: '',
      appSecret: '',
    };
  }

  @Patch(':slug/meta-credentials')
  @Header('Deprecation', 'true')
  @Header('Sunset', '2026-09-30')
  async updateMetaCredentials(@Req() req: any, @Body() dto: any) {
    this.assertManagementRole(req);
    const phoneNumber = String(dto.phoneNumberId ?? '').trim();

    if (!phoneNumber) {
      return this.getMetaCredentials(req);
    }

    await this.prisma.whatsappAccount.upsert({
      where: { phoneNumber },
      update: {
        restaurantId: req.tenantId,
        displayName: dto.businessAccountId ?? undefined,
      },
      create: {
        restaurantId: req.tenantId,
        phoneNumber,
        displayName: dto.businessAccountId ?? undefined,
      },
    });

    return this.getMetaCredentials(req);
  }

  @Patch(':slug/staff/:userId')
  @Header('Deprecation', 'true')
  @Header('Sunset', '2026-09-30')
  async updateStaffStatusLegacy(@Req() req: any, @Param('userId') userId: string, @Body() dto: any) {
    return this.updateStaff(req, userId, dto);
  }

  private async buildOperationalSettings(restaurantId: string) {
    const [restaurant, openingHours, capacityRule] = await Promise.all([
      this.prisma.restaurant.findUniqueOrThrow({
        where: { id: restaurantId },
        select: {
          id: true,
          name: true,
          timezone: true,
          currency: true,
          locale: true,
          maxCapacity: true,
          defaultReservationDuration: true,
          slotIntervalMinutes: true,
          bufferTimeMinutes: true,
          autoConfirm: true,
          allowWaitlist: true,
        },
      }),
      this.prisma.openingHour.findMany({
        where: { restaurantId, active: true, deletedAt: null },
        orderBy: { dayOfWeek: 'asc' },
      }),
      this.prisma.capacityRule.findUnique({
        where: { restaurantId },
      }),
    ]);

    const normalizedOpeningHours = this.mergeOpeningHours(openingHours);

    return {
      ...restaurant,
      closingHourLimit: this.calculateClosingHourLimit(normalizedOpeningHours),
      openingHours: normalizedOpeningHours,
      capacityRule: capacityRule ?? {
        id: null,
        restaurantId,
        maxGuestsPerReservation: null,
        maxReservationsPerSlot: null,
        slotDurationMinutes: restaurant.defaultReservationDuration,
        bufferMinutes: restaurant.bufferTimeMinutes,
        maxDailyCapacity: restaurant.maxCapacity,
        overbookingAllowed: false,
        active: true,
      },
    };
  }

  private mergeOpeningHours(openingHours: any[]) {
    return WEEK_DAYS.map((dayOfWeek) => {
      const existing = openingHours.find((hour) => hour.dayOfWeek === dayOfWeek);
      return existing ?? {
        id: '',
        restaurantId: '',
        dayOfWeek,
        openTime: '12:00',
        closeTime: '22:00',
        isClosed: false,
        active: true,
        deletedAt: null,
      };
    });
  }

  private calculateClosingHourLimit(openingHours: any[]): string {
    const closeTimes = openingHours
      .filter((hour) => !hour.isClosed)
      .map((hour) => String(hour.closeTime))
      .sort();

    return closeTimes.length > 0 ? closeTimes[closeTimes.length - 1] : '22:00';
  }

  private async buildDailyAnalytics(restaurantId: string, date?: string) {
    const { start, end } = this.getDayRange(date);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        restaurantId,
        deletedAt: null,
        reservationStart: { gte: start, lte: end },
      },
      select: {
        reservationStart: true,
        guestCount: true,
        status: true,
      },
      orderBy: { reservationStart: 'asc' },
    });

    const totalReservations = reservations.length;
    const totalPax = reservations.reduce((sum, reservation) => sum + reservation.guestCount, 0);
    const attendedReservations = reservations.filter((reservation) =>
      ['CONFIRMED', 'COMPLETED'].includes(reservation.status),
    ).length;
    const actionableReservations = reservations.filter((reservation) => reservation.status !== 'CANCELLED').length;
    const attendanceRate = actionableReservations > 0
      ? Math.round((attendedReservations / actionableReservations) * 100)
      : 0;

    const slotCounts = new Map<string, number>();

    for (const reservation of reservations) {
      const hour = reservation.reservationStart.getHours().toString().padStart(2, '0');
      const minute = reservation.reservationStart.getMinutes().toString().padStart(2, '0');
      const slot = `${hour}:${minute}`;
      slotCounts.set(slot, (slotCounts.get(slot) ?? 0) + 1);
    }

    const maxSlotCount = Math.max(...slotCounts.values(), 0);
    const hourlyData = Array.from(slotCounts.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([time, count]) => ({
        time,
        count,
        percentage: maxSlotCount > 0 ? Math.round((count / maxSlotCount) * 100) : 0,
      }));

    return {
      date: start.toISOString().slice(0, 10),
      totalReservations,
      totalPax,
      attendanceRate,
      hourlyData,
    };
  }

  private getDayRange(date?: string): { start: Date; end: Date } {
    const start = date ? new Date(date) : new Date();

    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('Formato de fecha inválido. Usa YYYY-MM-DD.');
    }

    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  private assertManagementRole(req: any): void {
    const role = req.user?.role as UserRole | undefined;
    if (!role || !MANAGEMENT_ROLES.includes(role)) {
      throw new ForbiddenException('No tienes permisos para modificar esta configuración.');
    }
  }

  private normalizeStaffRole(value: unknown): UserRole {
    const role = String(value ?? '').trim().toUpperCase() as UserRole;

    if (!STAFF_ROLES.includes(role)) {
      throw new BadRequestException('Rol inválido. Usa OWNER, MANAGER o STAFF.');
    }

    return role;
  }

  private normalizeDayOfWeek(value: unknown): DayOfWeek {
    const day = String(value ?? '').trim().toUpperCase() as DayOfWeek;

    if (!WEEK_DAYS.includes(day)) {
      throw new BadRequestException('Día de operación inválido.');
    }

    return day;
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

  private normalizeOptionalText(value: unknown): string | undefined {
    const normalized = String(value ?? '').trim();
    return normalized || undefined;
  }

  private normalizePositiveInt(value: unknown, fallback: number): number {
    const parsed = Number(value ?? fallback);

    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException('El valor numérico debe ser un entero positivo.');
    }

    return parsed;
  }

  private normalizeNullablePositiveInt(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    return this.normalizePositiveInt(value, 1);
  }

  private normalizeNonNegativeInt(value: unknown): number {
    const parsed = Number(value ?? 0);

    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new BadRequestException('El valor numérico debe ser un entero positivo o cero.');
    }

    return parsed;
  }

  private normalizeSlotInterval(value: unknown): number {
    const parsed = this.normalizePositiveInt(value, 30);

    if (![15, 30, 60].includes(parsed)) {
      throw new BadRequestException('El intervalo de slots debe ser 15, 30 o 60 minutos.');
    }

    return parsed;
  }

  private normalizeTime(value: unknown, errorMessage: string): string {
    const normalized = String(value ?? '').trim();

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
      throw new BadRequestException(errorMessage);
    }

    return normalized;
  }

  private async assertZoneBelongsToTenant(restaurantId: string, zoneId: string): Promise<void> {
    const zone = await this.prisma.restaurantZone.findFirst({
      where: { id: zoneId, restaurantId, active: true },
      select: { id: true },
    });

    if (!zone) {
      throw new BadRequestException('La zona seleccionada no existe o no pertenece al restaurante actual.');
    }
  }
}
