import { InvalidUrlException } from '../exceptions/audit.exceptions';

export class Url {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): Url {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new InvalidUrlException(`"${raw}" is not a valid URL`);
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new InvalidUrlException('URL must use http or https protocol');
    }

    return new Url(parsed.href);
  }

  static reconstitute(value: string): Url {
    return new Url(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Url): boolean {
    return this.value === other.value;
  }
}
