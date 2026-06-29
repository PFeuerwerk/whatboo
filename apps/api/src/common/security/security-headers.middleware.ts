import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

export function securityHeadersMiddleware(config: ConfigService) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const csp = config.get<string>(
      'HTTP_CSP',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' http://localhost:3000 http://localhost:4200 ws://localhost:3000 ws://localhost:4200; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );

    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');

    if (config.get<string>('NODE_ENV') === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }

    res.removeHeader('X-Powered-By');
    next();
  };
}