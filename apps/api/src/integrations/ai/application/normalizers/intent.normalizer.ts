import { Injectable } from '@nestjs/common';

export type IntentType =
  | 'reservation'
  | 'modify'
  | 'cancel'
  | 'availability'
  | 'greeting'
  | 'check_reservation'
  | 'unknown';

@Injectable()
export class IntentNormalizer {
  // Expresión regular estricta para detectar códigos de confirmación alfanuméricos de 6 caracteres (ej: D48DC1, 0081DD)
  private readonly confirmationCodeRegex = /\b([A-Z0-9]{6})\b/i;

  normalize(
    text: string,
  ): IntentType {
    const message =
      text.toLowerCase();

    if (
      message.includes('hola') ||
      message.includes('buenas') ||
      message.includes('buenos días') ||
      message.includes('buenos dias') ||
      message.includes('buenas tardes') ||
      message.includes('buenas noches')
    ) {
      if (
        message.trim().length <
        20
      ) {
        return 'greeting';
      }
    }

    // Cancelación (Robusta: evalúa intención directa o intención acompañada del código)
    const hasConfirmationCode = this.confirmationCodeRegex.test(text);
    const cancelPatterns = [
      'cancelar',
      'anular',
      'eliminar reserva',
      'cancela mi reserva',
      'quiero cancelar',
      'dar de baja',
    ];

    if (
      cancelPatterns.some(pattern => message.includes(pattern)) ||
      (hasConfirmationCode && (message.includes('baja') || message.includes('quitar')))
    ) {
      return 'cancel';
    }

    // Modificación
    if (
      message.includes('modificar') ||
      message.includes('cambiar') ||
      message.includes('reprogramar') ||
      message.includes('mover reserva')
    ) {
      return 'modify';
    }

      if (
        message.includes("consultar") ||
        message.includes("ver reserva") ||
        message.includes("mi reserva") ||
        message.includes("estado reserva") ||
        message.includes("consulta reserva")
      ) {
        return 'check_reservation';
      }


    // Disponibilidad
    const availabilityPatterns =
      [
        'disponibilidad',
        'hay mesa',
        'hay mesas',
        'tenéis mesa',
        'tienen mesa',
        'tenéis sitio',
        'tienen sitio',
        'hay sitio',
        'mesa disponible',
        'mesas disponibles',
        'hay disponibilidad',
        'tienen disponibilidad',
        'tenéis disponibilidad',
        'queda sitio',
        'quedan mesas',
        'hay hueco',
        'hay un hueco',
        'tenéis hueco',
        'tienen hueco',
        'hay lugar',
        'hay espacio',
        'podemos ir',
        'podemos reservar',
      ];

    if (
      availabilityPatterns.some(
        pattern =>
          message.includes(
            pattern,
          ),
      )
    ) {
      return 'availability';
    }

    // Reserva
    const reservationPatterns =
      [
        'reservar',
        'reserva',
        'mesa para',
        'quiero una mesa',
        'queremos una mesa',
        'quería reservar',
        'quisiera reservar',
        'vamos a cenar',
        'queremos cenar',
        'cenar este',
        'cenar mañana',
        'cenar esta noche',
        'vamos a comer',
        'queremos comer',
        'comer mañana',
        'comer este',
        'somos ',
        'seremos ',
        'iremos ',
        'cenaremos ',
        'comeremos ',
      ];

    if (
      reservationPatterns.some(
        pattern =>
          message.includes(
            pattern,
          ),
      )
    ) {
      return 'reservation';
    }

    return 'unknown';
  }
}
