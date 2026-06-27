import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Interceptor funcional de Angular 19 (High Performance Functional Interceptor)
 * Modificado: Detecta y prioriza el slug del formulario de Login para evitar bloqueos locales
 */
export const tenantInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const hostname = window.location.hostname;
  
  // 1. Si la petición ya trae una cabecera X-Tenant-Slug explícita (desde el Login), la respeta de forma prioritaria
  if (req.headers.has('X-Tenant-Slug')) {
    return next(req);
  }

  // 2. Comportamiento en desarrollo local por IP o localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const devReq = req.clone({
      setHeaders: {
        'X-Tenant-Slug': 'la-bella-italia' // Cambiado al slug demo sembrado para pruebas locales automáticas
      }
    });
    return next(devReq);
  }

  // 3. Extracción de subdominios para entornos de producción elásticos
  const domainSegments = hostname.split('.');
  const tenantSlug = domainSegments[0];

  const tenantReq = req.clone({
    setHeaders: {
      'X-Tenant-Slug': tenantSlug
    }
  });

  return next(tenantReq);
};
