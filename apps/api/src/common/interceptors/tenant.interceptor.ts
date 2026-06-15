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
      const redisClient = (this.redis as any).client || (this.redis as any).getDriver?.() || this.redis;
      if (redisClient && typeof redisClient.get === 'function') {
        restaurantId = await redisClient.get(cacheKey);
      }
    } catch (e) {
      console.warn('⚠️ Alerta de Caché: Falló la lectura en Redis, recurriendo a PostgreSQL de respaldo.');
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
        const redisClient = (this.redis as any).client || (this.redis as any).getDriver?.() || this.redis;
        if (redisClient && typeof redisClient.set === 'function') {
          await redisClient.set(cacheKey, restaurantId, 'EX', 3600); // Guardar 1 hora
        }
      } catch (e) {}
    }

    // 3. Aislamiento de contexto inmutable compatible con el tipado de compilación de Express/NestJS
    request['tenantId'] = restaurantId;
    request['tenantSlug'] = slug;

    return next.handle();
  }
}
