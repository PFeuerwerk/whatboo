import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BillingStatus, Prisma, RestaurantStatus, UserRole } from '@prisma/client';
import { normalizePagination, paginatedResponse } from '../../../common/pagination/paginated-response';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { UpdatePlatformRestaurantDto } from './dto/update-platform-restaurant.dto';

const PLATFORM_ROLES = new Set<string>([UserRole.ADMIN, UserRole.PLATFORM_ADMIN]);

@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  assertPlatformRole(role?: string): void {
    if (!role || !PLATFORM_ROLES.has(role)) {
      throw new ForbiddenException('Se requiere rol PLATFORM_ADMIN o ADMIN.');
    }
  }

  async getDashboard() {
    const [
      totalRestaurants,
      activeRestaurants,
      inactiveRestaurants,
      suspendedRestaurants,
      totalUsers,
      totalReservations,
      billingTrial,
      billingActive,
      billingPastDue,
      billingSuspended,
      metricsByTenant,
    ] = await Promise.all([
      this.prisma.restaurant.count({ where: { deletedAt: null } }),
      this.prisma.restaurant.count({ where: { status: RestaurantStatus.ACTIVE, deletedAt: null } }),
      this.prisma.restaurant.count({ where: { status: RestaurantStatus.INACTIVE, deletedAt: null } }),
      this.prisma.restaurant.count({ where: { status: RestaurantStatus.SUSPENDED, deletedAt: null } }),
      this.prisma.user.count(),
      this.prisma.reservation.count({ where: { deletedAt: null } }),
      this.prisma.restaurant.count({ where: { billingStatus: BillingStatus.TRIAL, deletedAt: null } }),
      this.prisma.restaurant.count({ where: { billingStatus: BillingStatus.ACTIVE, deletedAt: null } }),
      this.prisma.restaurant.count({ where: { billingStatus: BillingStatus.PAST_DUE, deletedAt: null } }),
      this.prisma.restaurant.count({ where: { billingStatus: BillingStatus.SUSPENDED, deletedAt: null } }),
      this.getTenantMetrics(),
    ]);

    return {
      totals: {
        restaurants: totalRestaurants,
        restaurantsActive: activeRestaurants,
        restaurantsInactive: inactiveRestaurants,
        restaurantsSuspended: suspendedRestaurants,
        billingTrial,
        billingActive,
        billingPastDue,
        billingSuspended,
        users: totalUsers,
        reservations: totalReservations,
      },
      metricsByTenant,
    };
  }

  async listRestaurants(query: { q?: string; status?: RestaurantStatus; take?: number; skip?: number }) {
    const { take, skip } = normalizePagination(query);
    const q = query.q?.trim();
    const where: Prisma.RestaurantWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(q
        ? {
            OR: [
              { slug: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              { legalName: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { city: { contains: q, mode: 'insensitive' } },
              { country: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.restaurant.findMany({
        where,
        select: this.restaurantListSelect(),
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take,
        skip,
      }),
      this.prisma.restaurant.count({ where }),
    ]);

    return paginatedResponse(data, total, { take, skip });
  }

  async getRestaurant(id: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...this.restaurantListSelect(),
        taxId: true,
        website: true,
        addressLine1: true,
        allowWaitlist: true,
        autoConfirm: true,
        billingEmail: true,
        billingCustomerReference: true,
        trialEndsAt: true,
        currentPeriodEndsAt: true,
        defaultReservationDuration: true,
        slotIntervalMinutes: true,
        bufferTimeMinutes: true,
        whatsappAccounts: {
          select: {
            id: true,
            phoneNumber: true,
            displayName: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        openingHours: {
          where: { deletedAt: null },
          orderBy: { dayOfWeek: 'asc' },
        },
        capacityRules: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurante no encontrado.');
    }

    return restaurant;
  }

  async updateRestaurant(id: string, dto: UpdatePlatformRestaurantDto) {
    await this.ensureRestaurant(id);

    return this.prisma.restaurant.update({
      where: { id },
      data: {
        name: this.optionalText(dto.name),
        legalName: this.nullableText(dto.legalName),
        taxId: this.nullableText(dto.taxId),
        email: this.nullableText(dto.email),
        phone: this.nullableText(dto.phone),
        website: this.nullableText(dto.website),
        addressLine1: this.nullableText(dto.addressLine1),
        city: this.nullableText(dto.city),
        country: this.nullableText(dto.country),
        timezone: this.optionalText(dto.timezone),
        currency: this.optionalText(dto.currency),
        locale: this.optionalText(dto.locale),
        maxCapacity: dto.maxCapacity === undefined ? undefined : dto.maxCapacity,
        allowWaitlist: dto.allowWaitlist,
        autoConfirm: dto.autoConfirm,
        status: dto.status,
        billingPlan: dto.billingPlan,
        billingStatus: dto.billingStatus,
        billingEmail: this.nullableText(dto.billingEmail),
        billingCustomerReference: this.nullableText(dto.billingCustomerReference),
        trialEndsAt: this.nullableDate(dto.trialEndsAt),
        currentPeriodEndsAt: this.nullableDate(dto.currentPeriodEndsAt),
      },
      select: this.restaurantListSelect(),
    });
  }

  async updateRestaurantStatus(id: string, status: RestaurantStatus) {
    await this.ensureRestaurant(id);

    return this.prisma.restaurant.update({
      where: { id },
      data: { status },
      select: this.restaurantListSelect(),
    });
  }

  async listPlatformUsers() {
    return this.prisma.user.findMany({
      where: {
        role: { in: [UserRole.ADMIN, UserRole.PLATFORM_ADMIN] },
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        restaurantId: true,
        restaurant: {
          select: {
            id: true,
            slug: true,
            name: true,
            status: true,
          },
        },
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: [{ role: 'desc' }, { email: 'asc' }],
    });
  }

  async getObservability() {
    const [db, redis, recentEvents] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.prisma.whatsappInboundLog.findMany({
        select: {
          id: true,
          rawPhoneNumber: true,
          isValid: true,
          reason: true,
          errorMessage: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      api: { status: 'ok', checkedAt: new Date().toISOString() },
      database: db,
      redis,
      recentEvents,
    };
  }

  private async getTenantMetrics() {
    const restaurants = await this.prisma.restaurant.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        _count: {
          select: {
            users: true,
            customers: true,
            reservations: true,
            tables: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    return restaurants.map((restaurant) => ({
      id: restaurant.id,
      slug: restaurant.slug,
      name: restaurant.name,
      status: restaurant.status,
      users: restaurant._count.users,
      customers: restaurant._count.customers,
      reservations: restaurant._count.reservations,
      tables: restaurant._count.tables,
    }));
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Database check failed',
      };
    }
  }

  private async checkRedis() {
    try {
      const response = await this.redis.ping();
      return { status: response === 'PONG' ? 'ok' : 'degraded', response };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Redis check failed',
      };
    }
  }

  private async ensureRestaurant(id: string): Promise<void> {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurante no encontrado.');
    }
  }

  private restaurantListSelect() {
    return {
      id: true,
      slug: true,
      name: true,
      legalName: true,
      email: true,
      phone: true,
      city: true,
      country: true,
      timezone: true,
      currency: true,
      locale: true,
      maxCapacity: true,
      status: true,
      billingPlan: true,
      billingStatus: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          users: true,
          customers: true,
          reservations: true,
          tables: true,
        },
      },
    } as const;
  }

  private optionalText(value?: string | null): string | undefined {
    if (value === undefined) return undefined;
    const normalized = String(value ?? '').trim();
    return normalized || undefined;
  }

  private nullableText(value?: string | null): string | null | undefined {
    if (value === undefined) return undefined;
    const normalized = String(value ?? '').trim();
    return normalized || null;
  }

  private nullableDate(value?: string | null): Date | null | undefined {
    if (value === undefined) return undefined;
    const normalized = String(value ?? '').trim();
    if (!normalized) return null;
    return new Date(normalized);
  }
}
