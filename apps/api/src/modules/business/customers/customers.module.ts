import { Module } from '@nestjs/common';
import { CustomersController } from './controllers/customers.controller';
import { CustomerRepository } from './repositories/customer.repository';

@Module({
  controllers: [
    CustomersController // Registro del controlador público para inyección de dependencias
  ],
  providers: [CustomerRepository],
  exports: [CustomerRepository],
})
export class CustomersModule {}
