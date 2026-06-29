import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';

const PUBLIC_PATHS = [
  '/api/v1/auth/register-tenant',
  '/api/v1/auth/reset-password',
  '/api/v1/platform/admin',
  '/api/v1/whatsapp/webhook',
  '/api/v1/whatsapp/test-message',
  '/api/v1/health',
  '/health',
];

const RESERVED_SUBDOMAINS = new Set(['app', 'api', 'www', 'admin']);

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async use(req: Request & { tenantId?: string; tenantSlug?: string }, _res: Response, next: NextFunction) {
    if (this.isPublicPath(req.path)) {
      return next();
    }

    const tenantIdentifier = this.extractTenantIdentifier(req);

    if (!tenantIdentifier) {
      return next(new BadRequestException('No se ha podido determinar el inquilino de la petición.'));
    }

    const restaurant = await this.resolveRestaurant(tenantIdentifier);

    if (!restaurant) {
      return next(new BadRequestException('El restaurante solicitado no existe, está inactivo o ha sido suspendido.'));
    }

    req.tenantId = restaurant.id;
    req.tenantSlug = restaurant.slug;
    return next();
  }

  private isPublicPath(path: string): boolean {
    return PUBLIC_PATHS.some((publicPath) => path.startsWith(publicPath));
  }

  private extractTenantIdentifier(req: Request): string | null {
    const explicitSlug = this.normalizeHeader(req.headers['x-tenant-slug']);
    if (explicitSlug) return explicitSlug;

    const legacyTenantId = this.normalizeHeader(req.headers['x-tenant-id']);
    if (legacyTenantId) return legacyTenantId;

    const bodySlug = this.normalizeBodyTenant((req as Request & { body?: Record<string, unknown> }).body);
    if (bodySlug) return bodySlug;

    const host = this.normalizeHost(req.headers['x-forwarded-host'] ?? req.headers.host);
    if (!host || this.isLocalHost(host)) return null;

    const subdomain = host.split('.')[0]?.toLowerCase();
    if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) return null;

    return subdomain;
  }

  private async resolveRestaurant(identifier: string): Promise<{ id: string; slug: string } | null> {
    const cacheKey = `tenant:identifier:${identifier}`;
    const cached = await this.safeCacheGet(cacheKey);
    if (cached) {
      const [id, slug] = cached.split(':');
      if (id && slug) return { id, slug };
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
    const restaurant = await this.prisma.restaurant.findFirst({
      where: isUuid
        ? { id: identifier, status: 'ACTIVE', deletedAt: null }
        : { slug: identifier, status: 'ACTIVE', deletedAt: null },
      select: { id: true, slug: true },
    });

    if (restaurant) {
      await this.safeCacheSet(cacheKey, `${restaurant.id}:${restaurant.slug}`);
    }

    return restaurant;
  }

  private normalizeHeader(value: string | string[] | undefined): string | null {
    const raw = Array.isArray(value) ? value[0] : value;
    const normalized = String(raw ?? '').trim().toLowerCase();
    return normalized || null;
  }

  private normalizeHost(value: string | string[] | undefined): string | null {
    const raw = Array.isArray(value) ? value[0] : value;
    const host = String(raw ?? '').trim().toLowerCase().split(':')[0];
    return host || null;
  }

  private normalizeBodyTenant(body?: Record<string, unknown>): string | null {
    const value = body?.restaurantSlug ?? body?.tenantSlug;
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized || null;
  }

  private isLocalHost(host: string): boolean {
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || /^[0-9.]+$/.test(host);
  }

  private async safeCacheGet(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch {
      return null;
    }
  }

  private async safeCacheSet(key: string, value: string): Promise<void> {
    try {
      await this.redis.set(key, value, 3600);
    } catch {
      // Redis is an optimization; PostgreSQL remains the source of truth.
    }
  }
}
