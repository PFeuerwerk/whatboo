import { Controller, Get, UseGuards, Request, HttpStatus, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../modules/platform/auth/guards/jwt-auth.guard';
import { CustomerRepository } from '../repositories/customer.repository';
import { JwtPayload } from '../../../../modules/platform/auth/strategies/jwt.strategy';

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
  async findAll(@Request() req: AuthRequest) {
    // Garantiza el estricto aislamiento de datos corporativos (Tenant Isolation)
    const restaurantId = req.user.restaurantId!;
    
    return this.customerRepository.findAll(restaurantId);
  }
}
