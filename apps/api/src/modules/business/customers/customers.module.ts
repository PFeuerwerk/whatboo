import { Module } from '@nestjs/common';
import { CustomerRepository } from './repositories/customer.repository';

@Module({
  providers: [CustomerRepository],
  exports: [CustomerRepository],
})
export class CustomersModule {}
