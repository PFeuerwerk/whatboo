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
import { JwtAuthGuard } from '../../../../modules/platform/auth/guards/jwt-auth.guard';
import { JwtPayload } from '../../../../modules/platform/auth/strategies/jwt.strategy';
import { CreateUserDto } from '../dto/create-user.dto';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UsersService } from '../services/users.service';

interface AuthRequest extends Request {
  user: JwtPayload;
  tenantId?: string;
}

const MANAGEMENT_ROLES: UserRole[] = [UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN, UserRole.PLATFORM_ADMIN];

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Request() req: AuthRequest, @Query() query: ListUsersQueryDto) {
    return this.usersService.findAll(this.getTenantId(req), query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.usersService.findOne(this.getTenantId(req), id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(...MANAGEMENT_ROLES)
  async create(@Request() req: AuthRequest, @Body() dto: CreateUserDto) {
    return this.usersService.create(this.getTenantId(req), req.user, dto, this.requestMetadata(req));
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(...MANAGEMENT_ROLES)
  async update(@Request() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(this.getTenantId(req), req.user, id, dto, this.requestMetadata(req));
  }

  private requestMetadata(req: any) {
    const forwarded = String(req.headers?.['x-forwarded-for'] ?? '').split(',')[0]?.trim();
    return {
      ipAddress: forwarded || req.ip || req.socket?.remoteAddress,
      userAgent: String(req.headers?.['user-agent'] ?? ''),
    };
  }

  private getTenantId(req: AuthRequest): string {
    return req.tenantId ?? req.user.restaurantId!;
  }
}
