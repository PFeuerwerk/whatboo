import { Controller, Get, UseGuards, Request, HttpStatus, HttpCode, Param, Query } from '@nestjs/common';
import { TenantRequest } from '../../../../common/http/tenant-request';
import { JwtAuthGuard } from '../../../../modules/platform/auth/guards/jwt-auth.guard';
import { ListCustomersQueryDto } from '../dto/list-customers-query.dto';
import { CustomersService } from '../services/customers.service';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Request() req: TenantRequest,
    @Query() query: ListCustomersQueryDto,
  ) {
    const restaurantId = this.getTenantId(req);
    return this.customersService.search(restaurantId, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Request() req: TenantRequest,
    @Param('id') id: string,
    @Query() query: ListCustomersQueryDto,
  ) {
    const restaurantId = this.getTenantId(req);
    return this.customersService.getProfile(restaurantId, id, query);
  }

  private getTenantId(req: TenantRequest): string {
    return req.tenantId ?? req.user.restaurantId!;
  }
}
