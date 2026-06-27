import { Body, Controller, Get, Param, Patch, Post, Req, UseInterceptors } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { TenantInterceptor } from '../../../common/interceptors/tenant.interceptor';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Controller('restaurants')
@UseInterceptors(TenantInterceptor)
export class RestaurantsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('zones')
  async getZones(@Req() req: any) {
    return this.prisma.restaurantZone.findMany({
      where: { restaurantId: req.tenantId, active: true },
      orderBy: { priority: 'asc' },
    });
  }

  @Get('tables')
  async getTables(@Req() req: any) {
    return this.prisma.restaurantTable.findMany({
      where: { restaurantId: req.tenantId, active: true },
      orderBy: { name: 'asc' },
    });
  }

  @Post('tables')
  async createTable(@Req() req: any, @Body() dto: any) {
    return this.prisma.restaurantTable.create({
      data: {
        name: dto.name,
        capacity: Number(dto.capacity),
        zoneId: dto.zoneId,
        restaurantId: req.tenantId,
        active: true,
      },
    });
  }

  @Get('settings')
  async getSettings(@Req() req: any) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: req.tenantId },
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
    });

    return {
      ...restaurant,
      closingHourLimit: '03:00',
    };
  }

  @Patch('settings')
  async updateSettings(@Req() req: any, @Body() dto: any) {
    const updated = await this.prisma.restaurant.update({
      where: { id: req.tenantId },
      data: {
        name: dto.name,
        timezone: dto.timezone,
        currency: dto.currency,
        locale: dto.locale,
        maxCapacity: dto.maxCapacity !== undefined ? Number(dto.maxCapacity) : undefined,
        slotIntervalMinutes: dto.slotIntervalMinutes !== undefined ? Number(dto.slotIntervalMinutes) : undefined,
        bufferTimeMinutes: dto.bufferTimeMinutes !== undefined ? Number(dto.bufferTimeMinutes) : undefined,
        defaultReservationDuration:
          dto.defaultReservationDuration !== undefined ? Number(dto.defaultReservationDuration) : undefined,
        autoConfirm: dto.autoConfirm !== undefined ? Boolean(dto.autoConfirm) : undefined,
        allowWaitlist: dto.allowWaitlist !== undefined ? Boolean(dto.allowWaitlist) : undefined,
      },
    });

    return {
      ...updated,
      closingHourLimit: dto.closingHourLimit ?? '03:00',
    };
  }

  @Get('staff')
  async getStaff(@Req() req: any) {
    const staff = await this.prisma.user.findMany({
      where: { restaurantId: req.tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
      },
      orderBy: { role: 'asc' },
    });

    return staff.map((user: any) => ({ ...user, shift: null }));
  }

  @Post('staff')
  async createStaff(@Req() req: any, @Body() dto: any) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: String(dto.email).toLowerCase().trim(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        role: dto.role ?? UserRole.STAFF,
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
      },
    });

    return { ...user, shift: dto.shift ?? null };
  }

  @Get(':slug/analytics')
  async getAnalytics(@Req() req: any) {
    const totalReservations = await this.prisma.reservation.count({
      where: { restaurantId: req.tenantId, deletedAt: null },
    });

    const aggregateGuests = await this.prisma.reservation.aggregate({
      where: { restaurantId: req.tenantId, deletedAt: null },
      _sum: { guestCount: true },
    });

    return {
      totalReservations: totalReservations || 0,
      totalPax: aggregateGuests._sum?.guestCount || 0,
      attendanceRate: 100,
      hourlyData: [
        { time: '13:00', count: 0, percentage: 0 },
        { time: '14:00', count: 0, percentage: 0 },
        { time: '21:00', count: 0, percentage: 0 },
        { time: '22:00', count: 0, percentage: 0 },
      ],
    };
  }

  @Get(':slug/customers')
  async getCustomers(@Req() req: any) {
    return this.prisma.customer.findMany({
      where: { restaurantId: req.tenantId },
      orderBy: { firstName: 'asc' },
    });
  }

  @Get(':slug/meta-credentials')
  async getMetaCredentials(@Req() req: any) {
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
  async updateMetaCredentials(@Req() req: any, @Body() dto: any) {
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
  async updateStaffStatus(@Req() req: any, @Param('userId') userId: string, @Body() dto: { isActive: boolean }) {
    return this.prisma.user.updateMany({
      where: { id: userId, restaurantId: req.tenantId },
      data: { isActive: Boolean(dto.isActive) },
    });
  }
}
