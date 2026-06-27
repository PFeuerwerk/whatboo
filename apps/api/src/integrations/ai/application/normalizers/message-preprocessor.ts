import { Injectable } from '@nestjs/common';

import { DateNormalizer } from './date.normalizer';
import { TimeNormalizer } from './time.normalizer';
import { GuestNormalizer } from './guest.normalizer';

import { ExtractedEntities } from '../../domain/entities/extracted-entities.entity';

@Injectable()
export class MessagePreprocessor {
  constructor(
    private readonly dateNormalizer: DateNormalizer,
    private readonly timeNormalizer: TimeNormalizer,
    private readonly guestNormalizer: GuestNormalizer,
  ) {}

  preprocess(
    message: string,
  ): ExtractedEntities {
    const date =
      this.dateNormalizer.normalize(
        message,
      );

    const time =
      this.timeNormalizer.normalize(
        message,
      );

    const guests =
      this.guestNormalizer.normalize(
        message,
      );


    const confirmationCodeMatch = message.match(/\b([A-Z0-9]{6})\b/i);

    const confirmationCode =
      confirmationCodeMatch
        ? confirmationCodeMatch[1].toUpperCase()
        : null;

    const detectedFields = [
      date,
      time,
      guests,
    ].filter(
      value =>
        value !== null,
    ).length;

    const confidence =
      detectedFields / 3;

    return {
      guests,
      date,
      time,
      confirmationCode,
      confidence,
      source:
        'normalizer',
    };
  }
}