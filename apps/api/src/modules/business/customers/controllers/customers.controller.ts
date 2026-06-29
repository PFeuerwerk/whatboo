import { Controller, Get, UseGuards, Request, HttpStatus, HttpCode, Param, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../modules/platform/auth/guards/jwt-auth.guard';
import { JwtPayload } from '../../../../modules/platform/auth/strategies/jwt.strategy';
import { ListCustomersQueryDto } from '../dto/list-customers-query.dto';
import { CustomersService } from '../services/customers.service';

interface AuthRequest extends Request {
  user: JwtPayload;
}

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Request() req: AuthRequest & { tenantId?: string },
    @Query() query: ListCustomersQueryDto,
  ) {
    const restaurantId = this.getTenantId(req);
    return this.customersService.search(restaurantId, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Request() req: AuthRequest & { tenantId?: string },
    @Param('id') id: string,
    @Query() query: ListCustomersQueryDto,
  ) {
    const restaurantId = this.getTenantId(req);
    return this.customersService.getProfile(restaurantId, id, query);
  }

  private getTenantId(req: AuthRequest & { tenantId?: string }): string {
    return req.tenantId ?? req.user.restaurantId!;
  }
}