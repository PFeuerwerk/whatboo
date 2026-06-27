import { Injectable } from '@nestjs/common';

import {
  IntentParser,
  IntentParserResult,
} from '../../domain/interfaces/intent-parser.interface';

import { OllamaProvider } from '../../infrastructure/providers/ollama.provider';

@Injectable()
export class OllamaIntentParser
  implements IntentParser
{
  constructor(
    private readonly ollamaProvider: OllamaProvider,
  ) {}

  async parseReservation(
    message: string,
  ): Promise<IntentParserResult> {
    const intent =
      await this.ollamaProvider.extractReservationIntent(
        message,
      );

    return {
      intent,
      source: 'ai',
      usedFallback: true,
    };
  }
}