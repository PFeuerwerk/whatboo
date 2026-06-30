import { Logger } from '@nestjs/common';
import {
  LlmProvider,
  ReservationIntent,
} from '../../domain/interfaces/llm-provider.interface';

export class MockProvider implements LlmProvider {
  private readonly logger = new Logger(MockProvider.name);

  async extractReservationIntent(
    message: string,
  ): Promise<ReservationIntent> {
    this.logger.debug(`Mock AI received message: ${message}`);

    return {
      intent: 'reservation',
      guests: 4,
      date: '2026-06-10',
      time: '21:00',
        confirmationCode: null,
      confidence: 0.95,
    };
  }
}
