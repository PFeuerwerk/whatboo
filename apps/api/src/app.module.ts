import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { envValidationSchema } from './config/env.validation';
import { RestaurantsModule } from './modules/business/restaurants/restaurants.module';
import { CustomersModule } from './modules/business/customers/customers.module';
import { AvailabilityModule } from './modules/business/availability/availability.module';
import { ReservationsModule } from './modules/business/reservations/reservations.module';
import { WhatsappModule } from './modules/business/whatsapp/whatsapp.module';
import { HealthModule } from './modules/platform/health/health.module';
import { AuthModule } from './modules/platform/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    AuthModule,
    RestaurantsModule,
    CustomersModule,
    AvailabilityModule,
    ReservationsModule,
    WhatsappModule,
    HealthModule,
  ],
})
export class AppModule {}
