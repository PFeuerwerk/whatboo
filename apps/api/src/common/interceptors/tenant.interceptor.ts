import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { TenantRequest } from '../http/tenant-request';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantInterceptor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const host = request.headers.host || '';
    const tenantSlugHeader = request.headers['x-tenant-slug'] as string;
    
    // 1. Extracción atómica priorizando la cabecera limpia enviada por el Frontend
    let slug: string | null = tenantSlugHeader || null;

    // 2. Fallback de subdominio elástico controlado para producción (Evita colapsos por IPs)
    if (!slug && host && host.includes('.') && !/^[0-9.:]+$/.test(host)) {
      const parts = host.split('.');
      if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'app') {
        slug = parts[0];
      }
    }

    // Bypass perimetral seguro para pasarelas globales sin inquilino asignado
    if (request.url.includes('/auth/register-tenant') || request.url.includes('/health')) {
      return next.handle();
    }

    if (!slug) {
      throw new BadRequestException('No se ha podido determinar el inquilino (Cabecera X-Tenant-Slug ausente o inválida).');
    }

    const cacheKey = `tenant:slug:${slug}`;
    let restaurantId: string | null = null;

    // Tolerancia a fallos: Lectura blindada de la caché de Redis
    try {
      restaurantId = await this.redis.get(cacheKey);
    } catch (e) {
      this.logger.warn('Fallo la lectura de tenant en Redis; se usara PostgreSQL como respaldo.');
    }

    // Fallback elástico a PostgreSQL con validación estricta de estado corporativo
    if (!restaurantId) {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { slug, status: 'ACTIVE' },
        select: { id: true }
      });

      if (!restaurant) {
        throw new BadRequestException(`El restaurante solicitado "${slug}" no existe, se encuentra inactivo o ha sido suspendido.`);
      }

      restaurantId = restaurant.id;

      // Persistencia asíncrona de alta velocidad en Redis
      try {
        await this.redis.set(cacheKey, restaurantId, 3600);
      } catch (e) {
        this.logger.warn('Fallo la escritura de tenant en Redis; PostgreSQL sigue siendo la fuente de verdad.');
      }
    }

    // 3. Aislamiento de contexto inmutable compatible con el tipado de compilación de Express/NestJS
    request['tenantId'] = restaurantId;
    request['tenantSlug'] = slug;

    return next.handle();
  }
}
