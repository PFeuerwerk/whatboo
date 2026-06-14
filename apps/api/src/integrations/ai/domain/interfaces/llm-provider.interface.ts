export interface ReservationIntent {
  intent: string;
  guests: number | null;
  date: string | null;
  time: string | null;
  confirmationCode: string | null;
  confidence: number;
}

export interface LlmProvider {
  extractReservationIntent(
    message: string,
  ): Promise<ReservationIntent>;
}