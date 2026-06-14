// ============================================================================
// ENUMS TRANSACCIONALES DEL DOMINIO (SINCRO CONFIGURACIÓN / COMPILACIÓN PRISMA)
// ============================================================================
export enum RestaurantStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
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

// ============================================================================
// CONTRATOS E INTERFACES DE ENTIDADES DEL MAÎTRE DASHBOARD (MULTI-TENANT REAL)
// ============================================================================
export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  addressLine1: string | null;
  city: string | null;
  country: string | null;
  timezone: string;
  currency: string;
  locale: string;
  defaultReservationDuration: number;
  slotIntervalMinutes: number;
  bufferTimeMinutes: number;
  maxCapacity: number | null;
  allowWaitlist: boolean;
  autoConfirm: boolean;
  status: RestaurantStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt: Date | string | null;
  
  zones?: RestaurantZone[];
  tables?: RestaurantTable[];
  reservations?: Reservation[];
  openingHours?: OpeningHour[];
}

export interface RestaurantZone {
  id: string;
  restaurantId: string;
  name: string;
  priority: number; // Permite priorizar qué zonas llenar primero (ej: 1 = Salón, 2 = Terraza)
  active: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  tables?: RestaurantTable[];
}

export interface RestaurantTable {
  id: string;
  restaurantId: string;
  name: string;
  capacity: number;
  zoneId: string | null;
  active: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  zone?: RestaurantZone | null;
}

export interface Reservation {
  id: string;
  restaurantId: string;
  customerId: string;
  reservationDate: Date | string;
  reservationStart: Date | string;
  reservationEnd: Date | string;
  guestCount: number;
  status: ReservationStatus;
  source: ReservationSource;
  notes: string | null;
  confirmationCode: string | null; // Código alfanumérico único estilo aerolínea (PNR) para confirmaciones automáticas
  confirmedAt: Date | string | null;
  cancelledAt: Date | string | null;
  completedAt: Date | string | null;
  noShowAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt: Date | string | null;
  
  customer?: any; 
  assignedTables?: RestaurantTable[];
}

export interface OpeningHour {
  id: string;
  restaurantId: string;
  dayOfWeek: DayOfWeek;
  openTime: string; // Formato estricto "HH:MM"
  closeTime: string; // Formato estricto "HH:MM"
  isClosed: boolean;
  active: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt: Date | string | null;
}
