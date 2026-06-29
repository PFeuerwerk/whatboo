/**
 * Compatibilidad temporal para imports antiguos.
 *
 * La fuente única de contratos de Fase 1 ahora es restaurant.interfaces.ts,
 * alineada con Prisma y con las respuestas reales del backend NestJS.
 */
export {
  type RestaurantSettings,
  type UpdateRestaurantSettingsDto,
  type RestaurantZone as Zone,
  type RestaurantTable as Table,
  type CreateRestaurantTableDto,
  type UpdateRestaurantTableDto,
  type Reservation,
  type ReservationTableAssignment,
  ReservationStatus,
  ReservationSource,
  DayOfWeek,
  UserRole,
  RestaurantStatus,
  WhatsappAccountStatus
} from './restaurant.interfaces';
