import { Injectable } from '@nestjs/common';

@Injectable()
export class TimeNormalizer {
  normalize(
    text: string,
  ): string | null {
    const message =
      text.toLowerCase();

    if (
      message.includes(
        'por la noche',
      )
    ) {
      return '20:00';
    }

    if (
      message.includes(
        'esta noche',
      )
    ) {
      return '20:00';
    }

    if (
      message.includes(
        'para cenar',
      )
    ) {
      return '20:00';
    }

    if (
      message.includes(
        'a la hora de cenar',
      )
    ) {
      return '20:00';
    }

    if (
      message.includes(
        'mediodía',
      ) ||
      message.includes(
        'mediodia',
      )
    ) {
      return '13:00';
    }

    if (
      message.includes(
        'para comer',
      )
    ) {
      return '13:00';
    }

    if (
      message.includes(
        'por la tarde',
      )
    ) {
      return '18:00';
    }

    const hourRegex =
      /\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/;

    const hourMatch =
      message.match(
        hourRegex,
      );

    if (hourMatch) {
      return `${hourMatch[1].padStart(
        2,
        '0',
      )}:${hourMatch[2]}`;
    }

    const dictionary: Record<
      string,
      string
    > = {
      una: '13:00',
      dos: '14:00',
      tres: '15:00',
      cuatro: '16:00',
      cinco: '17:00',
      seis: '18:00',
      siete: '19:00',
      ocho: '20:00',
      nueve: '21:00',
      diez: '22:00',
      once: '23:00',
    };

    for (const [
      word,
      time,
    ] of Object.entries(
      dictionary,
    )) {
      if (
        message.includes(
          `a las ${word}`,
        ) ||
        message.includes(
          `sobre las ${word}`,
        ) ||
        message.includes(
          `hacia las ${word}`,
        )
      ) {
        return time;
      }
    }

    const simpleHourRegex =
      /\ba las\s+(\d{1,2})\b/;

    const simpleMatch =
      message.match(
        simpleHourRegex,
      );

    if (simpleMatch) {
      const hour =
        Number(
          simpleMatch[1],
        );

      if (
        hour >= 1 &&
        hour <= 11
      ) {
        return `${String(
          hour + 12,
        ).padStart(
          2,
          '0',
        )}:00`;
      }

      return `${String(
        hour,
      ).padStart(
        2,
        '0',
      )}:00`;
    }

    return null;
  }
}