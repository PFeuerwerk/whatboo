import { Injectable } from '@nestjs/common';

@Injectable()
export class DateNormalizer {
  normalize(
    text: string,
  ): string | null {
    const message =
      text.toLowerCase();

    const today = new Date();

    if (
      message.includes('mañana')
    ) {
      const date = new Date(
        today,
      );

      date.setDate(
        date.getDate() + 1,
      );

      return this.toIsoDate(
        date,
      );
    }

    if (
      message.includes(
        'pasado mañana',
      )
    ) {
      const date = new Date(
        today,
      );

      date.setDate(
        date.getDate() + 2,
      );

      return this.toIsoDate(
        date,
      );
    }

    const weekdays = [
      'domingo',
      'lunes',
      'martes',
      'miércoles',
      'miercoles',
      'jueves',
      'viernes',
      'sábado',
      'sabado',
    ];

    for (
      const weekday of weekdays
    ) {
      if (
        message.includes(
          `este ${weekday}`,
        )
      ) {
        const targetDay =
          this.getWeekdayNumber(
            weekday,
          );

        const currentDay =
          today.getDay();

        let diff =
          targetDay -
          currentDay;

        if (diff < 0) {
          diff += 7;
        }

        const date =
          new Date(today);

        date.setDate(
          today.getDate() +
            diff,
        );

        return this.toIsoDate(
          date,
        );
      }
    }

    return null;
  }

  private toIsoDate(
    date: Date,
  ): string {
    const year =
      date.getFullYear();

    const month = String(
      date.getMonth() + 1,
    ).padStart(2, '0');

    const day = String(
      date.getDate(),
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getWeekdayNumber(
    weekday: string,
  ): number {
    switch (
      weekday
    ) {
      case 'domingo':
        return 0;

      case 'lunes':
        return 1;

      case 'martes':
        return 2;

      case 'miércoles':
      case 'miercoles':
        return 3;

      case 'jueves':
        return 4;

      case 'viernes':
        return 5;

      case 'sábado':
      case 'sabado':
        return 6;

      default:
        return 0;
    }
  }
}