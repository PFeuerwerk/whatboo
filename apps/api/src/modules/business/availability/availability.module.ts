import { Module } from '@nestjs/common';
import { AvailabilityRepository } from './repositories/availability.repository';
import { AvailabilityService } from './services/availability.service';

@Module({
  providers: [AvailabilityRepository, AvailabilityService],
  exports: [AvailabilityRepository, AvailabilityService],
})
export class AvailabilityModule {}
