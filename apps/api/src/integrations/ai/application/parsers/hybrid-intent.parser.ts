import { Injectable } from '@nestjs/common';

import {
  IntentParser,
  IntentParserResult,
} from '../../domain/interfaces/intent-parser.interface';

import { RegexIntentParser } from './regex-intent.parser';
import { OllamaIntentParser } from './ollama-intent.parser';

import { EntityExtractorService } from '../services/entity-extractor.service';
import { IntentClassifierService } from '../services/intent-classifier.service';

@Injectable()
export class HybridIntentParser
  implements IntentParser
{
  private readonly threshold = 0.9;

  constructor(
    private readonly regexParser: RegexIntentParser,
    private readonly ollamaParser: OllamaIntentParser,
    private readonly entityExtractor: EntityExtractorService,
    private readonly intentClassifier: IntentClassifierService,
  ) {}

  async parseReservation(
    message: string,
  ): Promise<IntentParserResult> {
    const intent =
      this.intentClassifier.classify(
        message,
      );

    const entities =
      this.entityExtractor.extract(
        message,
      );

    const hasEntities =
      entities.guests !== null ||
      entities.date !== null ||
      entities.time !== null;

    if (hasEntities) {
      return {
        intent: {
          intent: intent,
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

    if (
      intent === 'reservation'
    ) {
      const regexResult =
        await this.regexParser.parseReservation(
          message,
        );

      if (
        regexResult.intent
          .confidence >=
        this.threshold
      ) {
        return regexResult;
      }
    }

      return {
        intent: {
          intent,
          guests: entities.guests,
          date: entities.date,
          time: entities.time,
          confirmationCode: entities.confirmationCode,
          confidence: entities.confidence,
        },
        source: "regex",
        usedFallback: true,
      };
  }
}