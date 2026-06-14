import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Interceptor funcional de Angular 19 (High Performance Functional Interceptor)
 * Auto-descubre el subdominio del navegador y lo inyecta en el perímetro de red del Backend
 */
export const tenantInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  // 1. Extracción léxica del host del navegador (ej: ://tu-saas.com)
  const hostname = window.location.hostname;
  
  // Omitir inyección si estamos operando en desarrollo directo por IP pura
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // En desarrollo local simularemos pasándole un Tenant por defecto via cabecera
    const devReq = req.clone({
      setHeaders: {
        'X-Tenant-Slug': 'default-tenant-id'
      }
    });
    return next(devReq);
  }

  // 2. Extraer el primer segmento del dominio (el slug dinámico del restaurante)
  const domainSegments = hostname.split('.');
  const tenantSlug = domainSegments[0];

  // 3. Mutación inmutable de la petición adjuntando el aislamiento perimetral
  const tenantReq = req.clone({
    setHeaders: {
      'X-Tenant-Slug': tenantSlug
    }
  });

  return next(tenantReq);
};
