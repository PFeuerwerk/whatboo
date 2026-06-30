import type { Request } from 'express';

export interface RequestUser {
  sub: string;
  id?: string;
  email: string;
  role: string;
  restaurantId: string | null;
}

export interface OptionalTenantRequest extends Request {
  user?: RequestUser;
  tenantId?: string;
  tenantSlug?: string;
}

export interface TenantRequest extends OptionalTenantRequest {
  user: RequestUser;
  tenantId: string;
}

export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export function requestMetadata(req: Request): RequestMetadata {
  const forwarded = String(req.headers?.['x-forwarded-for'] ?? '').split(',')[0]?.trim();
  return {
    ipAddress: forwarded || req.ip || req.socket?.remoteAddress,
    userAgent: String(req.headers?.['user-agent'] ?? ''),
  };
}
