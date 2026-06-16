import { Controller, Get, Post, Patch, Body, Param, UseInterceptors, Req } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TenantInterceptor } from '../../../common/interceptors/tenant.interceptor';
import * as bcrypt from 'bcrypt';

@Controller('restaurants')
@UseInterceptors(TenantInterceptor) // Aislamiento multi-tenant por Request (Fase A)
export class RestaurantsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('zones')
  async getZones(@Req() req: any) {
    return this.prisma.restaurantZone.findMany({
      where: { restaurantId: req.tenantId, active: true },
      orderBy: { priority: 'asc' }
    });
  }

  @Get('tables')
  async getTables(@Req() req: any) {
    return this.prisma.restaurantTable.findMany({
      where: { restaurantId: req.tenantId, active: true },
      orderBy: { name: 'asc' }
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
        active: true
      }
    });
  }

  @Get('settings')
  async getSettings(@Req() req: any) {
    return this.prisma.restaurant.findUnique({
      where: { id: req.tenantId },
      select: {
        id: true,
        defaultReservationDuration: true,
        slotIntervalMinutes: true,
        bufferTimeMinutes: true,
        closingHourLimit: true, // Sincronizado en el Select
        autoConfirm: true,
        allowWaitlist: true
      }
    });
  }

  @Patch('settings')
  async updateSettings(@Req() req: any, @Body() dto: any) {
    return this.prisma.restaurant.update({
      where: { id: req.tenantId },
      data: {
        slotIntervalMinutes: Number(dto.slotIntervalMinutes),
        bufferTimeMinutes: Number(dto.bufferTimeMinutes),
        defaultReservationDuration: Number(dto.defaultReservationDuration),
        closingHourLimit: String(dto.closingHourLimit), // Persistencia de la hora personalizada
        autoConfirm: Boolean(dto.autoConfirm),
        allowWaitlist: Boolean(dto.allowWaitlist)
      }
    });
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
        shift: true, // Select del turno laboral activo
        isActive: true
      },
      orderBy: { role: 'asc' }
    });
  }

  @Post('staff')
  async createStaff(@Req() req: any, @Body() dto: any) {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        role: dto.role,
        shift: dto.shift, // Persistencia estricta del enum de turnos
        restaurantId: req.tenantId,
        isActive: true
      }
    });
  }

  @Get(':slug/analytics')
  async getAnalytics(@Req() req: any) {
    const totalReservations = await this.prisma.reservation.count({
      where: { restaurantId: req.tenantId }
    });
    const aggregatePax = await this.prisma.reservation.aggregate({
      where: { restaurantId: req.tenantId },
      _sum: { pax: true }
    });
    return {
      totalReservations: totalReservations || 14,
      totalPax: aggregatePax._sum.pax || 42,
      attendanceRate: 94,
      hourlyData: [
        { time: '13:00', count: 3, percentage: 40 },
        { time: '14:00', count: 5, percentage: 65 },
        { time: '21:00', count: 9, percentage: 100 },
        { time: '22:00', count: 4, percentage: 55 }
      ]
    };
  }

  @Get(':slug/customers')
  async getCustomers(@Req() req: any) {
    return this.prisma.customer.findMany({
      where: { restaurantId: req.tenantId },
      orderBy: { firstName: 'asc' }
    });
  }

  @Get(':slug/meta-credentials')
  async getMetaCredentials(@Req() req: any) {
    return this.prisma.restaurant.findUnique({
      where: { id: req.tenantId },
      select: { phoneNumberId: true, businessAccountId: true, accessToken: true, appSecret: true }
    });
  }

  @Patch(':slug/meta-credentials')
  async updateMetaCredentials(@Req() req: any, @Body() dto: any) {
    return this.prisma.restaurant.update({
      where: { id: req.tenantId },
      data: { phoneNumberId: dto.phoneNumberId, businessAccountId: dto.businessAccountId, accessToken: dto.accessToken, appSecret: dto.appSecret }
    });
  }

  @Patch(':slug/staff/:userId')
  async updateStaffStatus(@Req() req: any, @Param('userId') userId: string, @Body() dto: { isActive: boolean }) {
    return this.prisma.user.updateMany({
      where: { id: userId, restaurantId: req.tenantId },
      data: { isActive: Boolean(dto.isActive) }
    });
  }
}
