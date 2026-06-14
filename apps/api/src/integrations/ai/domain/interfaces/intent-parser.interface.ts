import { ReservationIntent } from './llm-provider.interface';

export interface IntentParserResult {
  intent: ReservationIntent;
  source: 'regex' | 'ai' | 'mock';
  usedFallback: boolean;
}

export interface IntentParser {
  parseReservation(
    message: string,
  ): Promise<IntentParserResult>;
}