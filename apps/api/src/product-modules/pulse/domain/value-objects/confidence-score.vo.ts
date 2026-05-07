export class ConfidenceScore {
  static readonly HIGH = 0.75;
  static readonly MINIMUM = 0.35;

  private constructor(private readonly value: number) {}

  static of(value: number): ConfidenceScore {
    if (value < 0 || value > 1) {
      throw new Error(`Confidence must be between 0 and 1, got ${value}`);
    }
    return new ConfidenceScore(value);
  }

  isHigh(): boolean {
    return this.value >= ConfidenceScore.HIGH;
  }

  isTooLow(): boolean {
    return this.value < ConfidenceScore.MINIMUM;
  }

  toNumber(): number {
    return this.value;
  }
}
