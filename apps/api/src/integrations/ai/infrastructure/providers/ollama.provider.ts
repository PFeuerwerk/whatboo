import { Injectable, Logger } from '@nestjs/common';

import {
  LlmProvider,
  ReservationIntent,
} from '../../domain/interfaces/llm-provider.interface';

import { RESERVATION_PROMPT } from '../../prompts/reservation.prompt';

@Injectable()
export class OllamaProvider implements LlmProvider {
  private readonly logger = new Logger(OllamaProvider.name);

  async extractReservationIntent(
    message: string,
  ): Promise<ReservationIntent> {
    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      30000,
    );

    try {
      const response = await fetch(
        'http://127.0.0.1:11434/api/generate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: 'qwen3:1.7b',
            stream: false,
            format: 'json',
            options: {
              temperature: 0,
            },
            prompt: `
${RESERVATION_PROMPT}

Message:
${message}
`,
          }),
        },
      );

      const data = await response.json();

      this.logger.debug(`Ollama raw response: ${data.response}`);

      let parsed: any;

      try {
        parsed = JSON.parse(data.response);
      } catch {
        return {
          intent: 'unknown',
          guests: null,
          date: null,
          time: null,
            confirmationCode: null,
          confidence: 0,
        };
      }

      return {
        intent:
          parsed.intent ??
          'reservation',

        guests:
          parsed.guests ?? null,

        date:
          parsed.date ?? null,

        time:
          parsed.time ?? null,
          confirmationCode:
            parsed.confirmationCode ?? null,

        confidence:
          parsed.confidence ?? 0.5,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
