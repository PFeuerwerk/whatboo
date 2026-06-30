import { BadRequestException } from '@nestjs/common';
import { DayOfWeek, UserRole } from '@prisma/client';

export const STAFF_ROLES: UserRole[] = [UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF];
export const MANAGEMENT_ROLES: UserRole[] = [UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN, UserRole.PLATFORM_ADMIN];
export const WEEK_DAYS: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
];

export function normalizeStaffRole(value: unknown): UserRole {
  const role = String(value ?? '').trim().toUpperCase() as UserRole;

  if (!STAFF_ROLES.includes(role)) {
    throw new BadRequestException('Rol inválido. Usa OWNER, MANAGER o STAFF.');
  }

  return role;
}

export function normalizeDayOfWeek(value: unknown): DayOfWeek {
  const day = String(value ?? '').trim().toUpperCase() as DayOfWeek;

  if (!WEEK_DAYS.includes(day)) {
    throw new BadRequestException('Día de operación inválido.');
  }

  return day;
}

export function normalizeEmail(value: unknown): string {
  const email = String(value ?? '').trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BadRequestException('Correo electrónico inválido.');
  }

  return email;
}

export function normalizeRequiredText(value: unknown, errorMessage: string): string {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    throw new BadRequestException(errorMessage);
  }

  return normalized;
}

export function normalizeOptionalText(value: unknown): string | undefined {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
}

export function normalizePositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value ?? fallback);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestException('El valor numérico debe ser un entero positivo.');
  }

  return parsed;
}

export function normalizeNullablePositiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return normalizePositiveInt(value, 1);
}

export function normalizeNonNegativeInt(value: unknown): number {
  const parsed = Number(value ?? 0);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new BadRequestException('El valor numérico debe ser un entero positivo o cero.');
  }

  return parsed;
}

export function normalizeSlotInterval(value: unknown): number {
  const parsed = normalizePositiveInt(value, 30);

  if (![15, 30, 60].includes(parsed)) {
    throw new BadRequestException('El intervalo de slots debe ser 15, 30 o 60 minutos.');
  }

  return parsed;
}

export function normalizeTime(value: unknown, errorMessage: string): string {
  const normalized = String(value ?? '').trim();

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
    throw new BadRequestException(errorMessage);
  }

  return normalized;
}
