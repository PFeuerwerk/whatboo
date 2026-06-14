import { Injectable } from '@nestjs/common';
import { CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js';

import { normalizePhone } from './phone-normalizer.util';
import {
  PhoneValidationResult,
} from './phone-validation.types';

@Injectable()
export class PhoneValidationService {

  validate(
    phone: string,
    defaultCountry?: CountryCode,
  ): PhoneValidationResult {
    if (!phone || typeof phone !== "string") {
      return { isValid: false, reason: "PHONE_REQUIRED" };
    }

    try {
      // Normalizar limpiando caracteres inválidos comunes, manteniendo el +
      const cleaned = phone.trim().replace(/[^\d+]/g, "");
      
      // Intentar parsear el número de teléfono
      // Si no empieza con +, libphonenumber-js usará el defaultCountry del restaurante como Fallback
      const parsedNumber = parsePhoneNumberFromString(
        cleaned.startsWith("+") ? cleaned : `+${cleaned}`,
        defaultCountry
      );

      if (!parsedNumber || !parsedNumber.isValid()) {
        // Fallback secundario: Intentar parsearlo asumiendo que es internacional directo sin el signo +
        const fallbackParsed = parsePhoneNumberFromString(`+${cleaned}`);
        if (fallbackParsed && fallbackParsed.isValid()) {
          return {
            isValid: true,
            normalizedPhone: fallbackParsed.number,
            country: fallbackParsed.country,
            countryCode: fallbackParsed.countryCallingCode,
            internationalFormat: fallbackParsed.formatInternational(),
          };
        }
        return { isValid: false, reason: "INVALID_PHONE" };
      }

      return {
        isValid: true,
        normalizedPhone: parsedNumber.number,
        country: parsedNumber.country,
        countryCode: parsedNumber.countryCallingCode,
        internationalFormat: parsedNumber.formatInternational(),
      };
    } catch (error) {
      return { isValid: false, reason: "INVALID_PHONE" };
    }
  }
  getFriendlyError(reason: string): { message: string; suggestion: string } {
    const errors: Record<string, { message: string; suggestion: string }> = {
      PHONE_REQUIRED: {
        message: "El número de teléfono es obligatorio.",
        suggestion: "Por favor, introduce un número válido."
      },
      INVALID_PHONE: {
        message: "El número de teléfono ingresado no es válido.",
        suggestion: "Asegúrate de incluir el código internacional de tu país (ej: +52, +34)."
      }
    };
    return errors[reason] || {
      message: "Ocurrió un error al verificar tu número.",
      suggestion: "Por favor, inténtalo de nuevo más tarde."
    };
  }
}
