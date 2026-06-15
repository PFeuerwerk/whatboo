import { Module } from '@nestjs/common';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantRepository } from './repositories/restaurant.repository';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RestaurantsController], // Registrado de forma canónica
  providers: [RestaurantRepository],
  exports: [RestaurantRepository],
})
export class RestaurantsModule {}
