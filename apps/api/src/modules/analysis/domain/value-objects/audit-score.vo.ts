import { InvalidScoreException } from '../exceptions/audit.exceptions';

export class AuditScore {
  private readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(value: number): AuditScore {
    if (value < 0 || value > 100) {
      throw new InvalidScoreException(
        `Score must be between 0 and 100, got: ${value}`,
      );
    }
    return new AuditScore(Math.round(value));
  }

  static zero(): AuditScore {
    return new AuditScore(0);
  }

  static perfect(): AuditScore {
    return new AuditScore(100);
  }

  toNumber(): number {
    return this.value;
  }

  isCritical(): boolean {
    return this.value < 50;
  }

  isWarning(): boolean {
    return this.value >= 50 && this.value < 80;
  }

  isGood(): boolean {
    return this.value >= 80;
  }
}
