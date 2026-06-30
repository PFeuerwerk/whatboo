import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RestaurantStatus } from '@prisma/client';
import { OptionalTenantRequest } from '../../../common/http/tenant-request';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminService } from './platform-admin.service';
import { UpdatePlatformRestaurantDto } from './dto/update-platform-restaurant.dto';
import { UpdateRestaurantStatusDto } from './dto/update-restaurant-status.dto';

@Controller('platform/admin')
@UseGuards(JwtAuthGuard)
export class PlatformAdminController {
  constructor(private readonly platformAdminService: PlatformAdminService) {}

  @Get('dashboard')
  dashboard(@Req() req: OptionalTenantRequest) {
    this.platformAdminService.assertPlatformRole(req.user?.role);
    return this.platformAdminService.getDashboard();
  }

  @Get('restaurants')
  restaurants(
    @Req() req: OptionalTenantRequest,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    this.platformAdminService.assertPlatformRole(req.user?.role);
    return this.platformAdminService.listRestaurants({
      q,
      status: this.parseRestaurantStatus(status),
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @Get('restaurants/:id')
  restaurant(@Req() req: OptionalTenantRequest, @Param('id') id: string) {
    this.platformAdminService.assertPlatformRole(req.user?.role);
    return this.platformAdminService.getRestaurant(id);
  }

  @Patch('restaurants/:id')
  updateRestaurant(
    @Req() req: OptionalTenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdatePlatformRestaurantDto,
  ) {
    this.platformAdminService.assertPlatformRole(req.user?.role);
    return this.platformAdminService.updateRestaurant(id, dto);
  }

  @Patch('restaurants/:id/status')
  updateRestaurantStatus(
    @Req() req: OptionalTenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdateRestaurantStatusDto,
  ) {
    this.platformAdminService.assertPlatformRole(req.user?.role);
    return this.platformAdminService.updateRestaurantStatus(id, dto.status);
  }

  @Get('users')
  users(@Req() req: OptionalTenantRequest) {
    this.platformAdminService.assertPlatformRole(req.user?.role);
    return this.platformAdminService.listPlatformUsers();
  }

  @Get('observability')
  observability(@Req() req: OptionalTenantRequest) {
    this.platformAdminService.assertPlatformRole(req.user?.role);
    return this.platformAdminService.getObservability();
  }

  private parseRestaurantStatus(status?: string): RestaurantStatus | undefined {
    if (!status) return undefined;
    if (!Object.values(RestaurantStatus).includes(status as RestaurantStatus)) {
      throw new BadRequestException('Estado de restaurante no valido.');
    }
    return status as RestaurantStatus;
  }
}
