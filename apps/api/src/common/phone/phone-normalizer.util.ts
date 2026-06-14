import {
  parsePhoneNumberFromString,
  CountryCode,
} from 'libphonenumber-js';

export interface NormalizedPhoneResult {
  normalizedPhone: string;
  country?: string;
  isValid: boolean;
}

export function normalizePhone(
  phone: string,
  defaultCountry?: CountryCode,
): NormalizedPhoneResult {
  try {
    const parsed = parsePhoneNumberFromString(
      phone,
      defaultCountry,
    );

    if (!parsed) {
      return {
        normalizedPhone: phone.replace(/\D/g, ''),
        isValid: false,
      };
    }

    return {
      normalizedPhone: parsed.number.replace('+', ''),
      country: parsed.country,
      isValid: parsed.isValid(),
    };
  } catch {
    return {
      normalizedPhone: phone.replace(/\D/g, ''),
      isValid: false,
    };
  }
}

export function isValidPhone(
  phone: string,
  defaultCountry?: CountryCode,
): boolean {
  return normalizePhone(
    phone,
    defaultCountry,
  ).isValid;
}

export function getPhoneCountry(
  phone: string,
  defaultCountry?: CountryCode,
): string | undefined {
  return normalizePhone(
    phone,
    defaultCountry,
  ).country;
}
