import { Module } from '@nestjs/common';
import { ReservationRepository } from './repositories/reservation.repository';
import { ReservationEngineService } from './services/reservation-engine.service';
import { ReservationsController } from './controllers/reservations.controller';
import { AvailabilityModule } from '../availability/availability.module';
import { CustomersModule } from '../customers/customers.module';
import { RestaurantsModule } from "../restaurants/restaurants.module";


@Module({
  imports: [AvailabilityModule, CustomersModule, RestaurantsModule],
  controllers: [ReservationsController],
  providers: [ReservationRepository, ReservationEngineService],
  exports: [ReservationRepository, ReservationEngineService],
})
export class ReservationsModule {}
