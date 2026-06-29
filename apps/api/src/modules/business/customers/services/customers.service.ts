import { Injectable, NotFoundException } from '@nestjs/common';
import { Customer } from '@prisma/client';
import { PaginatedResponse } from '../../../../common/pagination/paginated-response';
import { ListCustomersQueryDto } from '../dto/list-customers-query.dto';
import { CustomerRepository } from '../repositories/customer.repository';

@Injectable()
export class CustomersService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  search(restaurantId: string, query: ListCustomersQueryDto): Promise<PaginatedResponse<Customer>> {
    return this.customerRepository.search(restaurantId, query);
  }

  async getProfile(restaurantId: string, id: string): Promise<Customer> {
    const customer = await this.customerRepository.findById(restaurantId, id);

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    return customer;
  }
}
