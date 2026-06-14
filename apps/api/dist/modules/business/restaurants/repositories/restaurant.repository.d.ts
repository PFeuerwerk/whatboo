import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BaseRepository } from '../../../../infrastructure/database/repositories/base.repository';
import { Restaurant } from '@prisma/client';
export declare class RestaurantRepository extends BaseRepository {
    constructor(prisma: PrismaService);
    findById(id: string): Promise<Restaurant | null>;
    findSettings(id: string): Promise<{
        timezone: string;
        locale: string;
    } | null>;
    findBySlug(slug: string): Promise<Restaurant | null>;
    findAll(): Promise<Restaurant[]>;
    create(data: {
        slug: string;
        name: string;
        phone: string;
        timezone?: string;
    }): Promise<Restaurant>;
    update(id: string, data: Partial<Restaurant>): Promise<Restaurant>;
    softDelete(id: string): Promise<Restaurant>;
}
