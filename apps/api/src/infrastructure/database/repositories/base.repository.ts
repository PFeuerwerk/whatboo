import { PrismaService } from '../prisma.service';

export abstract class BaseRepository {
  constructor(protected readonly prisma: PrismaService) {}

  protected requireRestaurantId(restaurantId: string): void {
    if (!restaurantId || restaurantId.trim() === '') {
      throw new Error(
        'restaurantId is required — tenant isolation violation prevented',
      );
    }
  }
}
