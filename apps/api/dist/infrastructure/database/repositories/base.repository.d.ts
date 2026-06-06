import { PrismaService } from '../prisma.service';
export declare abstract class BaseRepository {
    protected readonly prisma: PrismaService;
    constructor(prisma: PrismaService);
    protected requireRestaurantId(restaurantId: string): void;
}
