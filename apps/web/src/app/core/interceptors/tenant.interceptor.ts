import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

const TENANT_SLUG_KEY = 'tenant_slug';
const LOCAL_DEMO_TENANT = 'la-bella-italia';
const RESERVED_HOSTS = new Set(['app', 'api', 'www', 'admin']);

export const tenantInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  if (req.headers.has('X-Tenant-Slug') || req.headers.has('X-Tenant-ID')) {
    return next(req);
  }

  const tenantSlug = getTenantSlug(req);
  if (!tenantSlug) return next(req);

  return next(req.clone({
    setHeaders: {
      'X-Tenant-Slug': tenantSlug,
      'X-Tenant-ID': tenantSlug,
    }
  }));
};

function getTenantSlug(req: HttpRequest<unknown>): string | null {
  const bodySlug = getTenantFromBody(req.body);
  if (bodySlug) return bodySlug;

  const storedSlug = normalizeTenant(localStorage.getItem(TENANT_SLUG_KEY));
  if (storedSlug) return storedSlug;

  const subdomain = getTenantFromHost(window.location.hostname);
  if (subdomain) return subdomain;

  if (isLocalHost(window.location.hostname)) return LOCAL_DEMO_TENANT;

  return null;
}

function getTenantFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const candidate = (body as { restaurantSlug?: unknown; tenantSlug?: unknown }).restaurantSlug
    ?? (body as { tenantSlug?: unknown }).tenantSlug;
  return normalizeTenant(candidate);
}

function getTenantFromHost(hostname: string): string | null {
  const host = hostname.toLowerCase();
  if (isLocalHost(host) || /^[0-9.]+$/.test(host)) return null;

  const subdomain = normalizeTenant(host.split('.')[0]);
  if (!subdomain || RESERVED_HOSTS.has(subdomain)) return null;

  return subdomain;
}

function normalizeTenant(value: unknown): string | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized || null;
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}
