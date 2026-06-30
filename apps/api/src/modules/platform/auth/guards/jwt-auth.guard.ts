import { ForbiddenException, Injectable } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OptionalTenantRequest } from '../../../../common/http/tenant-request';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) return false;

    const request = context.switchToHttp().getRequest<OptionalTenantRequest>();
    const userRestaurantId = request.user?.restaurantId;
    const tenantId = request.tenantId;
    const role = request.user?.role;

    if (tenantId && userRestaurantId && userRestaurantId !== tenantId && role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('El token no pertenece al inquilino solicitado.');
    }

    return true;
  }
}
