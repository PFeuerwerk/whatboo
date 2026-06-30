// ============================================================================
// CONTRATOS TYPESCRIPT ALINEADOS CON PRISMA / NESTJS / POSTGRESQL
// Fase 1-3: Infraestructura de Datos + Gestión de Planta Multi-Tenant
// ============================================================================

export enum RestaurantStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

export enum BillingPlan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE'
}

export enum BillingStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED'
}

export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN'
}

export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW'
}

export enum ReservationSource {
  WHATSAPP = 'WHATSAPP',
  DASHBOARD = 'DASHBOARD',
  PHONE = 'PHONE',
  WALK_IN = 'WALK_IN',
  API = 'API'
}

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY'
}

export enum WhatsappAccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

export type IsoDateString = string;
export type DateLike = Date | IsoDateString;

// ============================================================================
// ENTIDADES PRINCIPALES
// ============================================================================

export interface Restaurant {
  id: string;
  slug?: string;
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  country?: string | null;
  timezone: string;
  currency: string;
  locale: string;
  defaultReservationDuration: number;
  slotIntervalMinutes: number;
  bufferTimeMinutes: number;
  maxCapacity: number | null;
  allowWaitlist: boolean;
  autoConfirm: boolean;
  status?: RestaurantStatus;
  billingPlan?: BillingPlan;
  billingStatus?: BillingStatus;
  billingEmail?: string | null;
  billingCustomerReference?: string | null;
  trialEndsAt?: DateLike | null;
  currentPeriodEndsAt?: DateLike | null;
  createdAt?: DateLike;
  invitationEmailSent?: boolean;
  updatedAt?: DateLike;
  deletedAt?: DateLike | null;

  zones?: RestaurantZone[];
  tables?: RestaurantTable[];
  reservations?: Reservation[];
  openingHours?: OpeningHour[];
}

/** Respuesta real de GET /api/v1/restaurants/settings. */
export interface RestaurantSettings {
  id: string;
  name: string;
  timezone: string;
  currency: string;
  locale: string;
  maxCapacity: number | null;
  defaultReservationDuration: number;
  slotIntervalMinutes: number;
  bufferTimeMinutes: number;
  autoConfirm: boolean;
  allowWaitlist: boolean;
  closingHourLimit: string;
  openingHours: OpeningHour[];
  capacityRule: CapacityRule;
}

export type UpdateRestaurantSettingsDto = Partial<Pick<
  RestaurantSettings,
  | 'name'
  | 'timezone'
  | 'currency'
  | 'locale'
  | 'maxCapacity'
  | 'defaultReservationDuration'
  | 'slotIntervalMinutes'
  | 'bufferTimeMinutes'
  | 'autoConfirm'
  | 'allowWaitlist'
  | 'closingHourLimit'
>> & {
  openingHours?: UpdateOpeningHourDto[];
  capacityRule?: UpdateCapacityRuleDto;
};


export interface CapacityRule {
  id: string | null;
  restaurantId: string;
  maxGuestsPerReservation: number | null;
  maxReservationsPerSlot: number | null;
  slotDurationMinutes: number;
  bufferMinutes: number;
  maxDailyCapacity: number | null;
  overbookingAllowed: boolean;
  active: boolean;
  createdAt?: DateLike;
  updatedAt?: DateLike;
  deletedAt?: DateLike | null;
}

export type UpdateCapacityRuleDto = Partial<Pick<
  CapacityRule,
  | 'maxGuestsPerReservation'
  | 'maxReservationsPerSlot'
  | 'slotDurationMinutes'
  | 'bufferMinutes'
  | 'maxDailyCapacity'
  | 'overbookingAllowed'
  | 'active'
>>;

export interface UpdateOpeningHourDto {
  dayOfWeek: DayOfWeek;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  active?: boolean;
}

export interface RestaurantZone {
  id: string;
  restaurantId: string;
  name: string;
  priority: number;
  active: boolean;
  createdAt: DateLike;
  updatedAt: DateLike;
  tables?: RestaurantTable[];
}

export interface CreateRestaurantZoneDto {
  name: string;
  priority?: number;
}

export interface UpdateRestaurantZoneDto {
  name?: string;
  priority?: number;
  active?: boolean;
}

export interface CreateRestaurantTableDto {
  name: string;
  capacity: number;
  zoneId?: string | null;
}

export interface UpdateRestaurantTableDto {
  name?: string;
  capacity?: number;
  zoneId?: string | null;
  active?: boolean;
}

export interface RestaurantTable {
  id: string;
  restaurantId: string;
  name: string;
  capacity: number;
  zoneId: string | null;
  active: boolean;
  createdAt: DateLike;
  updatedAt: DateLike;
  zone?: RestaurantZone | null;
}

export interface Customer {
  id: string;
  restaurantId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  email: string | null;
  preferredLanguage: string;
  notes: string | null;
  totalReservations: number;
  lastReservationAt: DateLike | null;
  active: boolean;
  createdAt: DateLike;
  updatedAt: DateLike;
}

/** Relación real Prisma ReservationTable devuelta por backend. */
export interface ReservationTableAssignment {
  reservationId: string;
  tableId: string;
  assignedAt: DateLike;
  autoAssigned: boolean;
  table: RestaurantTable;
}

export interface Reservation {
  id: string;
  restaurantId: string;
  customerId: string;
  reservationDate: DateLike;
  reservationStart: DateLike;
  reservationEnd: DateLike;
  guestCount: number;
  status: ReservationStatus;
  source: ReservationSource;
  notes: string | null;
  confirmationCode: string | null;
  confirmedAt: DateLike | null;
  cancelledAt: DateLike | null;
  completedAt: DateLike | null;
  noShowAt: DateLike | null;
  createdAt: DateLike;
  updatedAt: DateLike;
  deletedAt: DateLike | null;

  customer?: Customer;
  assignedTables?: ReservationTableAssignment[];
}

export interface OpeningHour {
  id: string;
  restaurantId: string;
  dayOfWeek: DayOfWeek;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  active: boolean;
  createdAt: DateLike;
  updatedAt: DateLike;
  deletedAt: DateLike | null;
}


export interface StaffUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: DateLike | null;
  createdAt?: DateLike;
}

export interface CreateStaffUserDto {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole.OWNER | UserRole.MANAGER | UserRole.STAFF;
  password?: string;
  sendInvitation?: boolean;
}

export interface UpdateStaffUserDto {
  firstName?: string;
  lastName?: string;
  role?: UserRole.OWNER | UserRole.MANAGER | UserRole.STAFF;
  isActive?: boolean;
}
