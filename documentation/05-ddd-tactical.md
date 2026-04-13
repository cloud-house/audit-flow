# AuditFlow — Taktyczne DDD

> Ten dokument opisuje, jak wzorce taktyczne DDD są zastosowane konkretnie w module `analysis`.
> Celem jest nauka pisania kodu domenowego, który nie zależy od frameworka ani bazy danych.

---

## 1. Zasada czystości domeny

**Reguła:** Pliki w `modules/analysis/domain/` nie mogą importować niczego z:
- `@nestjs/*` (brak dekoratorów, brak DI)
- `typeorm` (brak `@Entity`, `@Column`)
- zewnętrznych bibliotek infrastrukturalnych

Domena operuje wyłącznie na czystych klasach TypeScript i rzuca własne wyjątki domenowe.

---

## 2. Value Objects

Value Objects reprezentują pojęcia domeny, które nie mają tożsamości — liczy się tylko ich wartość.
Są **niemutowalne** (readonly properties). Dwa VOs z tą samą wartością są równoważne.

### `Url`

```ts
// domain/value-objects/url.vo.ts

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
      throw new InvalidUrlException(`"${raw}" nie jest poprawnym adresem URL`);
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new InvalidUrlException('URL musi używać protokołu http lub https');
    }

    return new Url(parsed.href);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Url): boolean {
    return this.value === other.value;
  }
}
```

**Dlaczego:** Zamiast trzymać URL jako `string` i walidować go wszędzie, walidacja jest enkapsulowana.
Jeśli masz obiekt `Url`, masz gwarancję, że jest poprawny.

### `AuditScore`

```ts
// domain/value-objects/audit-score.vo.ts

export class AuditScore {
  private readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(value: number): AuditScore {
    if (value < 0 || value > 100) {
      throw new InvalidScoreException(`Score musi być między 0 a 100, otrzymano: ${value}`);
    }
    return new AuditScore(Math.round(value));
  }

  static zero(): AuditScore {
    return new AuditScore(0);
  }

  toNumber(): number {
    return this.value;
  }

  isCritical(): boolean {
    return this.value < 50;
  }
}
```

### `CheckResult`

```ts
// domain/value-objects/check-result.vo.ts

export type CheckSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type AuditCategory = 'SEO' | 'PERFORMANCE' | 'ACCESSIBILITY';

export class CheckResult {
  constructor(
    readonly ruleId: string,
    readonly category: AuditCategory,
    readonly severity: CheckSeverity,
    readonly message: string,
    readonly affectedUrl: string,
    readonly details?: string,
  ) {}

  isPassing(): boolean {
    return this.severity === 'INFO';
  }
}
```

---

## 3. Aggregate — `Audit`

Aggregate to cluster encapsulated objects with one root entity. Aggregate Root (`Audit`) jest jedynym punktem
wejścia — nic z zewnątrz nie modyfikuje bezpośrednio wewnętrznych obiektów.

**Niezmienniki chronione przez Aggregate:**
1. Nie można wywołać `complete()` dopóki nie zostały dodane wyniki dla wszystkich żądanych kategorii.
2. Nie można uruchomić audytu, który jest już `COMPLETED` lub `FAILED`.
3. Score jest obliczany wyłącznie wewnątrz Aggregate — nie można go ustawić z zewnątrz.

```ts
// domain/audit.aggregate.ts

export type AuditStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

interface AuditProps {
  id: string;
  projectId: string;
  url: Url;
  requestedCategories: AuditCategory[];
  status: AuditStatus;
  checkResults: CheckResult[];
  scores: Map<AuditCategory, AuditScore>;
  startedAt: Date | null;
  completedAt: Date | null;
  domainEvents: DomainEvent[];
}

export class Audit {
  private readonly props: AuditProps;

  private constructor(props: AuditProps) {
    this.props = props;
  }

  // --- Factory method ---

  static create(params: {
    projectId: string;
    url: string;
    categories: AuditCategory[];
  }): Audit {
    return new Audit({
      id: crypto.randomUUID(),
      projectId: params.projectId,
      url: Url.create(params.url),           // walidacja URL tutaj
      requestedCategories: params.categories,
      status: 'PENDING',
      checkResults: [],
      scores: new Map(),
      startedAt: null,
      completedAt: null,
      domainEvents: [],
    });
  }

  // Odtworzenie z bazy (bez walidacji — dane już zatwierdzone)
  static reconstitute(props: AuditProps): Audit {
    return new Audit(props);
  }

  // --- Gettery ---

  get id()         { return this.props.id; }
  get projectId()  { return this.props.projectId; }
  get status()     { return this.props.status; }
  get scores()     { return new Map(this.props.scores); } // kopia — immutability
  get checkResults() { return [...this.props.checkResults]; }
  get domainEvents() { return [...this.props.domainEvents]; }

  // --- Komendy domenowe ---

  start(): void {
    if (this.props.status !== 'PENDING') {
      throw new AuditAlreadyStartedException(this.props.id);
    }
    this.props.status = 'RUNNING';
    this.props.startedAt = new Date();
    this.addDomainEvent(new AuditStartedEvent(this.props.id, this.props.projectId));
  }

  addCheckResults(category: AuditCategory, results: CheckResult[]): void {
    if (this.props.status !== 'RUNNING') {
      throw new AuditNotRunningException(this.props.id);
    }
    this.props.checkResults.push(...results);
    const score = this.calculateScore(category, results);
    this.props.scores.set(category, score);
  }

  complete(): void {
    if (this.props.status !== 'RUNNING') {
      throw new AuditNotRunningException(this.props.id);
    }

    const missingCategories = this.props.requestedCategories
      .filter(cat => !this.props.scores.has(cat));

    if (missingCategories.length > 0) {
      throw new AuditIncompleteException(
        `Brakujące wyniki dla kategorii: ${missingCategories.join(', ')}`
      );
    }

    this.props.status = 'COMPLETED';
    this.props.completedAt = new Date();
    this.addDomainEvent(
      new AuditFinishedEvent(this.props.id, this.props.projectId, Object.fromEntries(this.props.scores))
    );
  }

  fail(reason: string): void {
    this.props.status = 'FAILED';
    this.props.completedAt = new Date();
    this.addDomainEvent(new AuditFailedEvent(this.props.id, reason));
  }

  clearDomainEvents(): void {
    this.props.domainEvents = [];
  }

  // --- Logika prywatna ---

  private calculateScore(category: AuditCategory, results: CheckResult[]): AuditScore {
    if (results.length === 0) return AuditScore.create(100);

    const weights = { CRITICAL: 10, WARNING: 3, INFO: 0 };
    const totalPenalty = results.reduce((sum, r) => sum + weights[r.severity], 0);
    const raw = Math.max(0, 100 - totalPenalty);
    return AuditScore.create(raw);
  }

  private addDomainEvent(event: DomainEvent): void {
    this.props.domainEvents.push(event);
  }
}
```

---

## 4. Domain Events

Domain Events komunikują, że coś ważnego wydarzyło się w domenie.
Nie zawierają logiki — są rekordami faktów.

```ts
// domain/events/audit-started.event.ts
export class AuditStartedEvent {
  readonly occurredAt = new Date();
  constructor(
    readonly auditId: string,
    readonly projectId: string,
  ) {}
}

// domain/events/audit-finished.event.ts
export class AuditFinishedEvent {
  readonly occurredAt = new Date();
  constructor(
    readonly auditId: string,
    readonly projectId: string,
    readonly scores: Record<string, number>,
  ) {}
}
```

### Przepływ Domain Events

```
1. audit.complete() dodaje AuditFinishedEvent do props.domainEvents

2. AuditRepository.save(audit) po zapisaniu do bazy:
   - Pobiera audit.domainEvents
   - Publikuje każde zdarzenie przez EventEmitter2
   - Wywołuje audit.clearDomainEvents()

3. ReportingModule: @OnEvent('audit.finished')
   → GenerateReportUseCase.execute(auditId)

4. NotificationModule: @OnEvent('audit.finished')
   → EmailService.sendAuditCompletedEmail(projectId)
```

```ts
// infrastructure/audit.repository.ts
@Injectable()
export class AuditRepository implements AuditRepositoryInterface {
  constructor(
    @InjectRepository(AuditEntity) private readonly orm: Repository<AuditEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async save(audit: Audit): Promise<void> {
    const entity = AuditMapper.toEntity(audit);
    await this.orm.save(entity);

    // Dispatch domain events AFTER successful DB write
    for (const event of audit.domainEvents) {
      await this.eventEmitter.emitAsync(
        event.constructor.name.replace('Event', '').toLowerCase().replace(/([A-Z])/g, '.$1').slice(1),
        event,
      );
      // AuditFinishedEvent → 'audit.finished'
    }
    audit.clearDomainEvents();
  }
}
```

---

## 5. Repository Interface

Domena definiuje kontrakt — infrastruktura go implementuje.

```ts
// domain/repositories/audit.repository.interface.ts
export interface AuditRepositoryInterface {
  save(audit: Audit): Promise<void>;
  findById(id: string): Promise<Audit | null>;
  findByProjectId(projectId: string): Promise<Audit[]>;
}

// W analysis.module.ts:
providers: [
  { provide: AuditRepositoryInterface, useClass: AuditRepository }
]
```

---

## 6. Checker Interface

```ts
// domain/audit-checker.interface.ts
export interface AuditCheckerInterface {
  readonly category: AuditCategory;
  run(url: string): Promise<CheckResult[]>;
}
```

Implementacje (`SeoChecker`, `PerformanceChecker`) żyją w `application/checkers/` lub `infrastructure/`
i mogą importować Puppeteer, Axios itd. — domena o tym nie wie.

---

## 7. Wyjątki domenowe

```ts
// domain/exceptions/audit.exceptions.ts
export class InvalidUrlException extends Error {
  constructor(message: string) { super(message); this.name = 'InvalidUrlException'; }
}
export class AuditAlreadyStartedException extends Error { ... }
export class AuditNotRunningException extends Error { ... }
export class AuditIncompleteException extends Error { ... }
```

Wyjątki domenowe NIE rozszerzają `HttpException` z NestJS.
Warstwa API (`audit.controller.ts`) łapie wyjątki domenowe i mapuje je na odpowiednie kody HTTP.
