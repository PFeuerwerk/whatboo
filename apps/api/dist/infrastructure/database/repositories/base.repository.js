"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
class BaseRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    requireRestaurantId(restaurantId) {
        if (!restaurantId || restaurantId.trim() === '') {
            throw new Error('restaurantId is required — tenant isolation violation prevented');
        }
    }
}
exports.BaseRepository = BaseRepository;
//# sourceMappingURL=base.repository.js.map