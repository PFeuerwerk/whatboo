import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PhoneValidationModule } from './common/phone/phone-validation.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

import { PrismaModule } from './infrastructure/database/prisma.module';
import { RedisModule } from "./infrastructure/cache/redis.module";
import { RedisThrottlerStorage } from './infrastructure/cache/redis-throttler.storage';
import { EventsModule } from "./infrastructure/observability/events/events.module";
import { envValidationSchema } from './config/env.validation';

import { AiModule } from './integrations/ai/ai.module';
import { RestaurantsModule } from './modules/business/restaurants/restaurants.module';
import { CustomersModule } from './modules/business/customers/customers.module';
import { AvailabilityModule } from './modules/business/availability/availability.module';
import { ReservationsModule } from './modules/business/reservations/reservations.module';
import { WhatsappModule } from './modules/business/whatsapp/whatsapp.module';
import { UsersModule } from './modules/business/users/users.module';

import { HealthModule } from './modules/platform/health/health.module';
import { AuthModule } from './modules/platform/auth/auth.module';
import { PlatformAdminModule } from './modules/platform/admin/platform-admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
    }),

    // Configuración Distribuida de Control de Tráfico con Redis (Fase B.1)
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: config.get<number>('RATE_LIMIT_SHORT_TTL_MS', 1000),
            limit: config.get<number>('RATE_LIMIT_SHORT_LIMIT', 20),
          },
          {
            name: 'long',
            ttl: config.get<number>('RATE_LIMIT_LONG_TTL_MS', 60000),
            limit: config.get<number>('RATE_LIMIT_LONG_LIMIT', 300),
          },
        ],
        storage: new RedisThrottlerStorage(config),
        getTracker: (req: Record<string, any>) => {
          const forwarded = String(req.headers?.['x-forwarded-for'] ?? '').split(',')[0]?.trim();
          return forwarded || req.ip || req.socket?.remoteAddress || 'unknown';
        },
      }),
    }),

    PrismaModule,
    RedisModule,
    EventsModule,
    PhoneValidationModule,
    AiModule,
    RestaurantsModule,
    CustomersModule,
    AvailabilityModule,
    ReservationsModule,
    WhatsappModule,
    UsersModule,
    HealthModule,
    AuthModule,
    PlatformAdminModule,
  ],
  providers: [
    // Protección y Activación Global de Rate Limiting (Fase B)
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('{*path}');
  }
}
