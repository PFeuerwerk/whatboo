import { Module } from '@nestjs/common';
import { AvailabilityRepository } from './repositories/availability.repository';

@Module({
  providers: [AvailabilityRepository],
  exports: [AvailabilityRepository],
})
export class AvailabilityModule {}
