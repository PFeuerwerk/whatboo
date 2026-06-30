import {
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
import { UserRole } from '@prisma/client';
import { TenantRequest } from '../../../common/http/tenant-request';
import { JwtAuthGuard } from '../../platform/auth/guards/jwt-auth.guard';
import { OperationalReportQueryDto } from './dto/operational-report-query.dto';
import { CreateLegacyStaffDto, UpdateLegacyStaffDto } from './dto/legacy-staff.dto';
import { UpdateMetaCredentialsDto } from './dto/meta-credentials.dto';
import { CreateRestaurantTableDto, UpdateRestaurantTableDto } from './dto/restaurant-table.dto';
import { UpdateRestaurantSettingsDto } from './dto/restaurant-settings.dto';
import { CreateRestaurantZoneDto, UpdateRestaurantZoneDto } from './dto/restaurant-zone.dto';
import { RestaurantAnalyticsService } from './services/restaurant-analytics.service';
import { RestaurantLegacyService } from './services/restaurant-legacy.service';
import { MANAGEMENT_ROLES } from './services/restaurant-input-normalizer';
import { RestaurantSettingsService } from './services/restaurant-settings.service';
import { RestaurantTablesService } from './services/restaurant-tables.service';
import { RestaurantZonesService } from './services/restaurant-zones.service';

@Controller('restaurants')
@UseGuards(JwtAuthGuard)
export class RestaurantsController {
  constructor(
    private readonly zonesService: RestaurantZonesService,
    private readonly tablesService: RestaurantTablesService,
    private readonly settingsService: RestaurantSettingsService,
    private readonly analyticsService: RestaurantAnalyticsService,
    private readonly legacyService: RestaurantLegacyService,
  ) {}

  @Get('zones')
  getZones(@Req() req: TenantRequest) {
    return this.zonesService.list(req.tenantId);
  }

  @Post('zones')
  createZone(@Req() req: TenantRequest, @Body() dto: CreateRestaurantZoneDto) {
    this.assertManagementRole(req);
    return this.zonesService.create(req.tenantId, dto);
  }

  @Patch('zones/:zoneId')
  updateZone(@Req() req: TenantRequest, @Param('zoneId') zoneId: string, @Body() dto: UpdateRestaurantZoneDto) {
    this.assertManagementRole(req);
    return this.zonesService.update(req.tenantId, zoneId, dto);
  }

  @Delete('zones/:zoneId')
  deleteZone(@Req() req: TenantRequest, @Param('zoneId') zoneId: string) {
    this.assertManagementRole(req);
    return this.zonesService.deactivate(req.tenantId, zoneId);
  }

  @Get('tables')
  getTables(@Req() req: TenantRequest) {
    return this.tablesService.list(req.tenantId);
  }

  @Post('tables')
  createTable(@Req() req: TenantRequest, @Body() dto: CreateRestaurantTableDto) {
    this.assertManagementRole(req);
    return this.tablesService.create(req.tenantId, dto);
  }

  @Patch('tables/:tableId')
  updateTable(@Req() req: TenantRequest, @Param('tableId') tableId: string, @Body() dto: UpdateRestaurantTableDto) {
    this.assertManagementRole(req);
    return this.tablesService.update(req.tenantId, tableId, dto);
  }

  @Delete('tables/:tableId')
  deleteTable(@Req() req: TenantRequest, @Param('tableId') tableId: string) {
    this.assertManagementRole(req);
    return this.tablesService.deactivate(req.tenantId, tableId);
  }

  @Get('settings')
  getSettings(@Req() req: TenantRequest) {
    return this.settingsService.getOperationalSettings(req.tenantId);
  }

  @Patch('settings')
  updateSettings(@Req() req: TenantRequest, @Body() dto: UpdateRestaurantSettingsDto) {
    this.assertManagementRole(req);
    return this.settingsService.updateOperationalSettings(req.tenantId, dto);
  }

  @Get('staff')
  getStaff(@Req() req: TenantRequest) {
    return this.legacyService.listStaff(req.tenantId);
  }

  @Post('staff')
  createStaff(@Req() req: TenantRequest, @Body() dto: CreateLegacyStaffDto) {
    this.assertManagementRole(req);
    return this.legacyService.createStaff(req.tenantId, req.user, dto);
  }

  @Patch('staff/:userId')
  updateStaff(@Req() req: TenantRequest, @Param('userId') userId: string, @Body() dto: UpdateLegacyStaffDto) {
    this.assertManagementRole(req);
    return this.legacyService.updateStaff(req.tenantId, req.user, userId, dto);
  }

  @Get('analytics')
  getAnalytics(@Req() req: TenantRequest, @Query('date') date?: string) {
    return this.analyticsService.dailyAnalytics(req.tenantId, date);
  }

  @Get('meta-credentials')
  getTenantMetaCredentials(@Req() req: TenantRequest) {
    this.assertManagementRole(req);
    return this.legacyService.getMetaCredentials(req.tenantId);
  }

  @Patch('meta-credentials')
  updateTenantMetaCredentials(@Req() req: TenantRequest, @Body() dto: UpdateMetaCredentialsDto) {
    this.assertManagementRole(req);
    return this.legacyService.updateMetaCredentials(req.tenantId, dto);
  }

  @Get('reports/operational')
  getOperationalReport(@Req() req: TenantRequest, @Query() query: OperationalReportQueryDto) {
    return this.analyticsService.operationalReport(req.tenantId, query.from, query.to);
  }

  @Get(':slug/analytics')
  @Header('Deprecation', 'true')
  @Header('Sunset', '2026-09-30')
  getAnalyticsBySlug(@Req() req: TenantRequest, @Query('date') date?: string) {
    return this.analyticsService.dailyAnalytics(req.tenantId, date);
  }

  @Get(':slug/customers')
  @Header('Deprecation', 'true')
  @Header('Sunset', '2026-09-30')
  getCustomers(@Req() req: TenantRequest) {
    return this.legacyService.listCustomers(req.tenantId);
  }

  @Get(':slug/meta-credentials')
  @Header('Deprecation', 'true')
  @Header('Sunset', '2026-09-30')
  getMetaCredentials(@Req() req: TenantRequest) {
    this.assertManagementRole(req);
    return this.legacyService.getMetaCredentials(req.tenantId);
  }

  @Patch(':slug/meta-credentials')
  @Header('Deprecation', 'true')
  @Header('Sunset', '2026-09-30')
  updateMetaCredentials(@Req() req: TenantRequest, @Body() dto: UpdateMetaCredentialsDto) {
    this.assertManagementRole(req);
    return this.legacyService.updateMetaCredentials(req.tenantId, dto);
  }

  @Patch(':slug/staff/:userId')
  @Header('Deprecation', 'true')
  @Header('Sunset', '2026-09-30')
  updateStaffStatusLegacy(@Req() req: TenantRequest, @Param('userId') userId: string, @Body() dto: UpdateLegacyStaffDto) {
    return this.updateStaff(req, userId, dto);
  }

  private assertManagementRole(req: TenantRequest): void {
    const role = req.user?.role as UserRole | undefined;
    if (!role || !MANAGEMENT_ROLES.includes(role)) {
      throw new ForbiddenException('No tienes permisos para modificar esta configuración.');
    }
  }
}
