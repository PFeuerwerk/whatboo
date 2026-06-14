import { Injectable } from '@nestjs/common';

@Injectable()
export class GuestNormalizer {
  normalize(
    text: string,
  ): number | null {
    const message =
      text.toLowerCase();

    const numericMatch =
      message.match(
        /\b(\d{1,2})\s*(persona|personas|comensal|comensales|adulto|adultos|niño|niños)\b/,
      );

    if (numericMatch) {
      return Number(
        numericMatch[1],
      );
    }

    const dictionary: Record<
      string,
      number
    > = {
      uno: 1,
      una: 1,
      dos: 2,
      tres: 3,
      cuatro: 4,
      cinco: 5,
      seis: 6,
      siete: 7,
      ocho: 8,
      nueve: 9,
      diez: 10,
      once: 11,
      doce: 12,
    };

    for (const [
      word,
      value,
    ] of Object.entries(
      dictionary,
    )) {
      const patterns = [
        `para ${word}`,
        `somos ${word}`,
        `iremos ${word}`,
        `seremos ${word}`,
        `cenaremos ${word}`,
        `comeremos ${word}`,
        `${word} personas`,
        `${word} comensales`,
        `${word} adultos`,
        `grupo de ${word}`,
      ];

      if (
        patterns.some(
          pattern =>
            message.includes(
              pattern,
            ),
        )
      ) {
        return value;
      }
    }

    return null;
  }
}