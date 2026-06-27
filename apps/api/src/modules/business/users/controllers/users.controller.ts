import { Controller, Get, UseGuards, Request, HttpStatus, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../modules/platform/auth/guards/jwt-auth.guard';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { JwtPayload } from '../../../../modules/platform/auth/strategies/jwt.strategy';

interface AuthRequest extends Request {
  user: JwtPayload;
}

@Controller('users')
@UseGuards(JwtAuthGuard) // Protege el perímetro HTTP forzando autenticación mediante token
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene el listado completo de personal vinculado de forma aislada al restaurante activo.
   * Filtra las credenciales sensibles (passwordHash) para mitigar fugas de información.
   * Ruta: GET /api/v1/users
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Request() req: AuthRequest) {
    // Garantiza el estricto aislamiento de datos corporativos (Tenant Isolation)
    const restaurantId = req.user.restaurantId!;

    return this.prisma.user.findMany({
      where: {
        restaurantId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: {
        role: 'asc', // Agrupa jerárquicamente (OWNER -> MANAGER -> STAFF)
      },
    });
  }
}
