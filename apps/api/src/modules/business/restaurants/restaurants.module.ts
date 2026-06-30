import { Module } from '@nestjs/common';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantRepository } from './repositories/restaurant.repository';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { RestaurantAnalyticsService } from './services/restaurant-analytics.service';
import { RestaurantLegacyService } from './services/restaurant-legacy.service';
import { RestaurantSettingsService } from './services/restaurant-settings.service';
import { RestaurantTablesService } from './services/restaurant-tables.service';
import { RestaurantZonesService } from './services/restaurant-zones.service';

@Module({
  imports: [PrismaModule],
  controllers: [RestaurantsController], // Registrado de forma canónica
  providers: [
    RestaurantRepository,
    RestaurantAnalyticsService,
    RestaurantLegacyService,
    RestaurantSettingsService,
    RestaurantTablesService,
    RestaurantZonesService,
  ],
  exports: [RestaurantRepository],
})
export class RestaurantsModule {}
