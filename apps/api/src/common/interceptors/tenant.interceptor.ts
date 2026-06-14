import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const host = request.headers.host || '';
    const tenantSlugHeader = request.headers['x-tenant-slug'] as string;
    
    let slug = tenantSlugHeader || (host.includes('.') ? host.split('.')[0] : null);

    if (request.url.includes('/auth/register-tenant') || request.url.includes('/health')) {
      return next.handle();
    }

    if (!slug) {
      throw new BadRequestException('No se ha podido determinar el inquilino (Tenant Slug ausente).');
    }

    const cacheKey = `tenant:slug:${slug}`;
    let restaurantId = await this.redis.get(cacheKey);

    if (!restaurantId) {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { slug, status: 'ACTIVE' },
        select: { id: true }
      });

      if (!restaurant) {
        throw new BadRequestException('El restaurante solicitado no existe o se encuentra inactivo.');
      }

      restaurantId = restaurant.id;
      await this.redis.set(cacheKey, restaurantId);
    }

    request.tenantId = restaurantId;
    request.tenantSlug = slug;

    return next.handle();
  }
}
