import { Module } from '@nestjs/common';
import { CustomersController } from './controllers/customers.controller';
import { CustomerRepository } from './repositories/customer.repository';
import { CustomersService } from './services/customers.service';

@Module({
  controllers: [CustomersController],
  providers: [CustomerRepository, CustomersService],
  exports: [CustomerRepository, CustomersService],
})
export class CustomersModule {}
