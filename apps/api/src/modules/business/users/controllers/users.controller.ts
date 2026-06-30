import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../../../../common/auth/roles.decorator';
import { RolesGuard } from '../../../../common/auth/roles.guard';
import { TenantRequest, requestMetadata } from '../../../../common/http/tenant-request';
import { JwtAuthGuard } from '../../../../modules/platform/auth/guards/jwt-auth.guard';
import { CreateUserDto } from '../dto/create-user.dto';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UsersService } from '../services/users.service';

const MANAGEMENT_ROLES: UserRole[] = [UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN, UserRole.PLATFORM_ADMIN];

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Request() req: TenantRequest, @Query() query: ListUsersQueryDto) {
    return this.usersService.findAll(this.getTenantId(req), query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Request() req: TenantRequest, @Param('id') id: string) {
    return this.usersService.findOne(this.getTenantId(req), id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(...MANAGEMENT_ROLES)
  async create(@Request() req: TenantRequest, @Body() dto: CreateUserDto) {
    return this.usersService.create(this.getTenantId(req), req.user, dto, requestMetadata(req));
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(...MANAGEMENT_ROLES)
  async update(@Request() req: TenantRequest, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(this.getTenantId(req), req.user, id, dto, requestMetadata(req));
  }

  private getTenantId(req: TenantRequest): string {
    return req.tenantId ?? req.user.restaurantId!;
  }
}
