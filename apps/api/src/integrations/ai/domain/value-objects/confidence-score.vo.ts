export class ConfidenceScore {
  constructor(
    private readonly value: number,
  ) {
    if (value < 0 || value > 1) {
      throw new Error(
        'Confidence score must be between 0 and 1',
      );
    }
  }

  getValue(): number {
    return this.value;
  }

  isHigh(threshold = 0.9): boolean {
    return this.value >= threshold;
  }
}