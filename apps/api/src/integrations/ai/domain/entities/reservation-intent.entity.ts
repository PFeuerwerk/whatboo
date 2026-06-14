export class ReservationIntentEntity {
  constructor(
    public readonly intent: string,
    public readonly guests: number | null,
    public readonly date: string | null,
    public readonly time: string | null,
    public readonly confidence: number,
  ) {}
}