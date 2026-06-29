import { Controller, Get, UseGuards, Request, HttpStatus, HttpCode, Param, Query, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../modules/platform/auth/guards/jwt-auth.guard';
import { CustomerRepository } from '../repositories/customer.repository';
import { JwtPayload } from '../../../../modules/platform/auth/strategies/jwt.strategy';
import { ListCustomersQueryDto } from '../dto/list-customers-query.dto';

interface AuthRequest extends Request {
  user: JwtPayload;
}

@Controller('customers')
@UseGuards(JwtAuthGuard) // Protege el endpoint forzando autenticación JWT perimetral
export class CustomersController {
  constructor(
    private readonly customerRepository: CustomerRepository,
  ) {}

  /**
   * Obtiene el listado completo de comensales vinculados de forma aislada al restaurante activo.
   * Ordena los resultados automáticamente para facilitar la analítica del Maître.
   * Ruta: GET /api/v1/customers
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Request() req: AuthRequest & { tenantId?: string },
    @Query() query: ListCustomersQueryDto,
  ) {
    const restaurantId = this.getTenantId(req);

    return this.customerRepository.search(restaurantId, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Request() req: AuthRequest & { tenantId?: string }, @Param('id') id: string) {
    const restaurantId = this.getTenantId(req);
    const customer = await this.customerRepository.findById(restaurantId, id);

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    return customer;
  }

  private getTenantId(req: AuthRequest & { tenantId?: string }): string {
    return req.tenantId ?? req.user.restaurantId!;
  }
}
