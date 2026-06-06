import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BaseRepository } from '../../../../infrastructure/database/repositories/base.repository';
import { Customer } from '@prisma/client';
export declare class CustomerRepository extends BaseRepository {
    constructor(prisma: PrismaService);
    findByPhone(restaurantId: string, phone: string): Promise<Customer | null>;
    findById(restaurantId: string, id: string): Promise<Customer | null>;
    findAll(restaurantId: string): Promise<Customer[]>;
    findOrCreate(restaurantId: string, phone: string, data?: {
        firstName?: string;
        lastName?: string;
    }): Promise<Customer>;
    update(restaurantId: string, id: string, data: Partial<Customer>): Promise<Customer>;
}
