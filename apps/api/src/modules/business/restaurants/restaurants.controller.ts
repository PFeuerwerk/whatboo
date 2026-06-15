import { Controller, Get, Post, Patch, Body, UseInterceptors, Req } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TenantInterceptor } from '../../../common/interceptors/tenant.interceptor';

@Controller('restaurants')
@UseInterceptors(TenantInterceptor) // Fuerza el aislamiento multi-tenant por token/cabecera (Fase A)
export class RestaurantsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Endpoint: Obtener las zonas físicas filtradas estrictamente por el restaurante logueado
   */
  @Get('zones')
  async getZones(@Req() req: any) {
    return this.prisma.restaurantZone.findMany({
      where: { restaurantId: req.tenantId, active: true },
      orderBy: { priority: 'asc' }
    });
  }

  /**
   * Endpoint: Obtener el inventario de mesas operativas de este inquilino aislado
   */
  @Get('tables')
  async getTables(@Req() req: any) {
    return this.prisma.restaurantTable.findMany({
      where: { restaurantId: req.tenantId, active: true },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Endpoint: Persistir una nueva mesa operativa amarrada al restaurantId aislado en PostgreSQL
   */
  @Post('tables')
  async createTable(@Req() req: any, @Body() dto: { name: string; capacity: number; zoneId: string }) {
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

  /**
   * Endpoint: Obtener las reglas de negocio, aforos y estados del bot de WhatsApp
   */
  @Get('settings')
  async getSettings(@Req() req: any) {
    return this.prisma.restaurant.findUnique({
      where: { id: req.tenantId },
      select: {
        id: true,
        defaultReservationDuration: true,
        slotIntervalMinutes: true,
        bufferTimeMinutes: true,
        autoConfirm: true,
        allowWaitlist: true
      }
    });
  }

  /**
   * Endpoint: Actualizar y guardar las reglas horarias del restaurante en tiempo real
   */
  @Patch('settings')
  async updateSettings(
    @Req() req: any,
    @Body() dto: { 
      slotIntervalMinutes: number; 
      bufferTimeMinutes: number; 
      defaultReservationDuration: number; 
      autoConfirm: boolean; 
      allowWaitlist: boolean; 
    }
  ) {
    return this.prisma.restaurant.update({
      where: { id: req.tenantId },
      data: {
        slotIntervalMinutes: Number(dto.slotIntervalMinutes),
        bufferTimeMinutes: Number(dto.bufferTimeMinutes),
        defaultReservationDuration: Number(dto.defaultReservationDuration),
        autoConfirm: Boolean(dto.autoConfirm),
        allowWaitlist: Boolean(dto.allowWaitlist)
      }
    });
  }
}
