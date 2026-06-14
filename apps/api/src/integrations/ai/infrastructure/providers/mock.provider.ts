import {
  LlmProvider,
  ReservationIntent,
} from '../../domain/interfaces/llm-provider.interface';

export class MockProvider implements LlmProvider {
  async extractReservationIntent(
    message: string,
  ): Promise<ReservationIntent> {
    console.log('Mock AI received:', message);

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