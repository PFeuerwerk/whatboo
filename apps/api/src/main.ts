import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { securityHeadersMiddleware } from './common/security/security-headers.middleware';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get<ConfigService>(ConfigService);
  const httpInstance = app.getHttpAdapter().getInstance() as { disable?: (name: string) => void };
  httpInstance.disable?.('x-powered-by');
  app.use(securityHeadersMiddleware(configService));

  const corsOrigins = configService
    .get<string>('CORS_ORIGINS', 'http://localhost:4200,http://127.0.0.1:4200')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // 1. Configuracion robusta de seguridad perimetral CORS
  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Tenant-Slug', 'X-Tenant-ID'],
  });

  // 2. Prefijo Global de Endpoints Transaccionales
  app.setGlobalPrefix('api/v1');

  // 3. Tubería de Validación Global para DTOs Estrictos
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = configService.get<number>('PORT', 3000);

  await app.listen(port);
  logger.log(`API en ejecucion de forma inmutable sobre: http://localhost:${port}/api/v1`);
}
bootstrap();
