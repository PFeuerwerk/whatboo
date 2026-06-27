import { Injectable } from '@nestjs/common';

import {
  IntentParser,
  IntentParserResult,
} from '../../domain/interfaces/intent-parser.interface';

import { EntityExtractorService } from '../services/entity-extractor.service';

@Injectable()
export class RegexIntentParser
  implements IntentParser
{
  constructor(
    private readonly entityExtractor: EntityExtractorService,
  ) {}

  async parseReservation(
    message: string,
  ): Promise<IntentParserResult> {
    const entities =
      this.entityExtractor.extract(
        message,
      );

    return {
      intent: {
        intent: 'reservation',
        guests:
          entities.guests,
        date:
          entities.date,
        time:
          entities.time,
        confirmationCode:
          entities.confirmationCode,
        confidence:
          entities.confidence,
      },
      source: 'regex',
      usedFallback: false,
    };
  }
}