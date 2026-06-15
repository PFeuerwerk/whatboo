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
    
    // Extracción atómica del identificador Multi-Tenant
    let slug = tenantSlugHeader || (host.includes('.') ? host.split('.')[0] : null);

    // Bypass perimetral seguro para pasarelas globales sin inquilino asignado
    if (request.url.includes('/auth/register-tenant') || request.url.includes('/health')) {
      return next.handle();
    }

    if (!slug) {
      throw new BadRequestException('No se ha podido determinar el inquilino (Tenant Slug ausente).');
    }

    const cacheKey = `tenant:slug:${slug}`;
    let restaurantId: string | null = null;

    // Tolerancia a fallos: Intenta leer de Redis protegiendo el hilo ante diferencias en la API de ioredis
    try {
      const redisClient = (this.redis as any).client || (this.redis as any).getDriver?.() || this.redis;
      if (redisClient && typeof redisClient.get === 'function') {
        restaurantId = await redisClient.get(cacheKey);
      }
    } catch (e) {
      console.warn('⚠️ Alerta de Caché: Falló la lectura en Redis, recurriendo a PostgreSQL de respaldo.');
    }

    // Fallback elástico: Si no está en caché, valida e indexa desde PostgreSQL
    if (!restaurantId) {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { slug, status: 'ACTIVE' },
        select: { id: true }
      });

      if (!restaurant) {
        throw new BadRequestException(`El restaurante solicitado "${slug}" no existe o se encuentra inactivo.`);
      }

      restaurantId = restaurant.id;

      // Intenta escribir el registro de alta velocidad en Redis de fondo de forma asíncrona
      try {
        const redisClient = (this.redis as any).client || (this.redis as any).getDriver?.() || this.redis;
        if (redisClient && typeof redisClient.set === 'function') {
          await redisClient.set(cacheKey, restaurantId, 'EX', 3600); // Guardar 1 hora
        }
      } catch (e) {}
    }

    // Aislamiento de contexto: Inyectar identificadores en el objeto request (Fase A)
    request.tenantId = restaurantId;
    request.tenantSlug = slug;

    return next.handle();
  }
}
