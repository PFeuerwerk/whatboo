import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

export const DEFAULT_TIMEZONE = 'Europe/Madrid';
export const DEFAULT_LOCALE = 'es-ES';

export function resolveRestaurantTimezone(timezone?: string | null): string {
  return timezone?.trim() || DEFAULT_TIMEZONE;
}

export function resolveRestaurantLocale(locale?: string | null): string {
  return locale?.trim() || DEFAULT_LOCALE;
}

export function buildUtcDateFromRestaurantLocalTime(
  date: string,
  time: string,
  timezone?: string | null,
): Date {
  const safeTimezone = resolveRestaurantTimezone(timezone);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid reservation date format: ${date}`);
  }

  if (!/^\d{1,2}:\d{2}$/.test(time)) {
    throw new Error(`Invalid reservation time format: ${time}`);
  }

  const [hours, minutes] = time.split(':').map(Number);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid reservation time value: ${time}`);
  }

  return fromZonedTime(`${date}T${time}:00`, safeTimezone);
}

export function formatDateInRestaurantTimezone(
  date: Date,
  timezone?: string | null,
  pattern = 'dd/MM',
): string {
  return formatInTimeZone(
    date,
    resolveRestaurantTimezone(timezone),
    pattern,
  );
}

export function formatTimeInRestaurantTimezone(
  date: Date,
  timezone?: string | null,
  pattern = 'HH:mm',
): string {
  return formatInTimeZone(
    date,
    resolveRestaurantTimezone(timezone),
    pattern,
  );
}

export function getRestaurantLocalDayIndex(
  date: Date,
  timezone?: string | null,
): number {
  return toZonedTime(
    date,
    resolveRestaurantTimezone(timezone),
  ).getDay();
}

export function getRestaurantLocalTimeValue(
  date: Date,
  timezone?: string | null,
): string {
  return formatInTimeZone(
    date,
    resolveRestaurantTimezone(timezone),
    'HH:mm',
  );
}

export function getRestaurantLocalDateValue(
  date: Date,
  timezone?: string | null,
): string {
  return formatInTimeZone(
    date,
    resolveRestaurantTimezone(timezone),
    'yyyy-MM-dd',
  );
}

export function getUtcDayRangeFromRestaurantDate(
  date: Date,
  timezone?: string | null,
): {
  startOfDayUtc: Date;
  endOfDayUtc: Date;
} {
  const safeTimezone = resolveRestaurantTimezone(timezone);
  const localDate = getRestaurantLocalDateValue(date, safeTimezone);

  return {
    startOfDayUtc: fromZonedTime(`${localDate}T00:00:00`, safeTimezone),
    endOfDayUtc: fromZonedTime(`${localDate}T23:59:59.999`, safeTimezone),
  };
}
