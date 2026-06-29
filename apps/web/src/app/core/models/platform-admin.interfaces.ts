import { DateLike, RestaurantStatus, UserRole, WhatsappAccountStatus } from './restaurant.interfaces';

export interface PlatformTenantMetric {
  id: string;
  slug: string;
  name: string;
  status: RestaurantStatus;
  users: number;
  customers: number;
  reservations: number;
  tables: number;
}

export interface PlatformDashboard {
  totals: {
    restaurants: number;
    restaurantsActive: number;
    restaurantsInactive: number;
    restaurantsSuspended: number;
    users: number;
    reservations: number;
  };
  metricsByTenant: PlatformTenantMetric[];
}

export interface PlatformRestaurantListItem {
  id: string;
  slug: string;
  name: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  timezone: string;
  currency: string;
  locale: string;
  maxCapacity: number | null;
  status: RestaurantStatus;
  createdAt: DateLike;
  updatedAt: DateLike;
  _count: {
    users: number;
    customers: number;
    reservations: number;
    tables: number;
  };
}

export interface PlatformRestaurantDetail extends PlatformRestaurantListItem {
  taxId: string | null;
  website: string | null;
  addressLine1: string | null;
  allowWaitlist: boolean;
  autoConfirm: boolean;
  defaultReservationDuration: number;
  slotIntervalMinutes: number;
  bufferTimeMinutes: number;
  whatsappAccounts: Array<{
    id: string;
    phoneNumber: string;
    displayName: string | null;
    status: WhatsappAccountStatus;
    createdAt: DateLike;
    updatedAt: DateLike;
  }>;
  openingHours: unknown[];
  capacityRules: unknown[];
}

export interface PlatformListResponse<T> {
  data: T[];
  total: number;
}

export interface PlatformUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  restaurantId: string;
  restaurant: {
    id: string;
    slug: string;
    name: string;
    status: RestaurantStatus;
  };
  lastLoginAt: DateLike | null;
  createdAt: DateLike;
}

export interface PlatformObservability {
  api: {
    status: string;
    checkedAt: string;
  };
  database: {
    status: string;
    message?: string;
  };
  redis: {
    status: string;
    response?: string;
    message?: string;
  };
  recentEvents: Array<{
    id: string;
    rawPhoneNumber: string;
    isValid: boolean;
    reason: string;
    errorMessage: string;
    createdAt: DateLike;
  }>;
}

export interface UpdatePlatformRestaurantDto {
  name?: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  timezone?: string;
  currency?: string;
  locale?: string;
  maxCapacity?: number | null;
  status?: RestaurantStatus;
}
