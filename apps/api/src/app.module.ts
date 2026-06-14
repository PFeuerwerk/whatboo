import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PhoneValidationModule } from './common/phone/phone-validation.module';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';

import { PrismaModule } from './infrastructure/database/prisma.module';
import { RedisModule } from "./infrastructure/cache/redis.module";
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
      useFactory: (config: ConfigService) => [
        {
          name: 'short',
          ttl: 1000,      // Ventana de 1 segundo
          limit: 10,     // Máximo 10 peticiones/seg por IP para mitigar ráfagas
        },
        {
          name: 'long',
          ttl: 60000,    // Ventana de 1 minuto
          limit: 100,    // Protección contra spam continuo
        }
      ],
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
  ],
  providers: [
    // Aislamiento Multi-Tenant Dinámico Perimetral (Fase A)
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
    // Protección y Activación Global de Rate Limiting (Fase B)
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
