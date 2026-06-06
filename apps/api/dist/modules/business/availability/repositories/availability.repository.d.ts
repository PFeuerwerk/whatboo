import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BaseRepository } from '../../../../infrastructure/database/repositories/base.repository';
import { OpeningHour, RestaurantTable, BlockedDate } from '@prisma/client';
export declare class AvailabilityRepository extends BaseRepository {
    constructor(prisma: PrismaService);
    findOpeningHours(restaurantId: string): Promise<OpeningHour[]>;
    findActiveTables(restaurantId: string): Promise<RestaurantTable[]>;
    findBlockedDates(restaurantId: string, date: Date): Promise<BlockedDate[]>;
    findAvailableTables(restaurantId: string, start: Date, end: Date, partySize: number): Promise<RestaurantTable[]>;
}
