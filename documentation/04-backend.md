# AuditFlow — Backend (NestJS Modular Monolith)

## 1. Struktura katalogów

```
apps/api/src/
│
├── app.module.ts                  ← Root module, importuje wszystkie
│
├── modules/
│   ├── analysis/                  ← Core Domain
│   │   ├── domain/
│   │   │   ├── audit.aggregate.ts
│   │   │   ├── audit-checker.interface.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── url.vo.ts
│   │   │   │   └── audit-score.vo.ts
│   │   │   ├── events/
│   │   │   │   ├── audit-started.event.ts
│   │   │   │   └── audit-finished.event.ts
│   │   │   └── repositories/
│   │   │       └── audit.repository.interface.ts
│   │   ├── application/
│   │   │   ├── start-audit.use-case.ts
│   │   │   ├── get-audit-status.use-case.ts
│   │   │   └── checkers/
│   │   │       ├── seo-checker.ts
│   │   │       └── performance-checker.ts
│   │   ├── infrastructure/
│   │   │   ├── audit.entity.ts         ← TypeORM entity
│   │   │   ├── audit.repository.ts     ← Implementacja repo
│   │   │   └── audit.queue.consumer.ts ← BullMQ Worker
│   │   ├── api/
│   │   │   ├── audit.controller.ts
│   │   │   ├── audit.gateway.ts        ← WebSocket
│   │   │   └── dto/
│   │   └── analysis.module.ts
│   │
│   ├── reporting/                 ← Supporting Domain
│   │   ├── domain/
│   │   │   └── report.aggregate.ts
│   │   ├── application/
│   │   │   ├── generate-report.use-case.ts
│   │   │   └── on-audit-finished.handler.ts  ← Słucha na AuditFinished
│   │   ├── infrastructure/
│   │   │   ├── report.entity.ts
│   │   │   └── pdf-generator.service.ts
│   │   ├── api/
│   │   │   ├── report.controller.ts
│   │   │   └── dto/
│   │   └── reporting.module.ts
│   │
│   ├── client-project/            ← Generic Domain
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   ├── api/
│   │   └── client-project.module.ts
│   │
│   └── notification/              ← Generic Domain
│       ├── application/
│       │   └── on-audit-finished.handler.ts  ← Wysyła e-mail
│       ├── infrastructure/
│       │   └── email.service.ts
│       └── notification.module.ts
│
├── shared/
│   ├── events/                    ← Typy Domain Events (bez logiki)
│   │   ├── audit-finished.event.ts
│   │   └── report-generated.event.ts
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   └── database/
│       ├── database.module.ts
│       └── migrations/
│
└── infrastructure/
    ├── queue/
    │   └── bull.module.ts
    └── crawler/
        ├── puppeteer.adapter.ts
        └── cheerio.adapter.ts
```

---

## 2. Moduły i ich odpowiedzialności

### AnalysisModule (Core Domain)

Serce systemu. Zawiera:
- **Aggregate `Audit`** — patrz `05-ddd-tactical.md`
- **Checkery** — implementacje `AuditCheckerInterface`:
  - `SeoChecker`: sprawdza title, meta description, nagłówki h1-h6, alt obrazków
  - `PerformanceChecker`: sprawdza rozmiar strony, liczba requestów (Phase 2: PageSpeed API)
- **BullMQ Consumer** — pobiera joba z kolejki, orkiestruje checkery, emituje postęp przez WebSocket
- **WebSocket Gateway** — wysyła zdarzenia `audit.{id}.progress` i `audit.{id}.status` do klienta

```ts
// analysis/api/audit.gateway.ts
@WebSocketGateway({ cors: true })
export class AuditGateway {
  @WebSocketServer() server: Server;

  emitProgress(auditId: string, percent: number) {
    this.server.emit(`audit.${auditId}.progress`, { percent });
  }

  emitStatusChange(auditId: string, status: AuditStatus) {
    this.server.emit(`audit.${auditId}.status`, { status });
  }
}
```

### ReportingModule (Supporting Domain)

- Nasłuchuje na `AuditFinished` (przez NestJS `EventEmitter2`)
- Generuje PDF przy użyciu Puppeteer (renderuje HTML template → drukuje PDF)
- Zapisuje raport do bazy i do lokalnego filestorage / S3

### ClientProjectModule (Generic Domain)

Standard CRUD:
- `Client` — nazwa firmy, kontakt
- `Project` — URL strony, powiązany klient, lista audytów

### NotificationModule (Generic Domain)

- Nasłuchuje na `AuditFinished`
- Wysyła e-mail z linkiem do raportu (nodemailer / zewnętrzny SMTP)
- Phase 2: webhook Slack

---

## 3. Task Queue — BullMQ

### Producent (przy POST /api/audits)

```ts
// analysis/application/start-audit.use-case.ts
@Injectable()
export class StartAuditUseCase {
  constructor(
    private readonly auditRepo: AuditRepositoryInterface,
    @InjectQueue('audits') private readonly auditQueue: Queue,
  ) {}

  async execute(projectId: string, categories: AuditCategory[]): Promise<string> {
    const audit = Audit.create({ projectId, categories });
    await this.auditRepo.save(audit);

    await this.auditQueue.add('run-audit', {
      auditId: audit.id,
      projectUrl: audit.projectUrl,
      categories,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    return audit.id;
  }
}
```

### Konsument (Worker)

```ts
// analysis/infrastructure/audit.queue.consumer.ts
@Processor('audits')
export class AuditQueueConsumer {
  constructor(
    private readonly auditRepo: AuditRepositoryInterface,
    private readonly seoChecker: SeoChecker,
    private readonly perfChecker: PerformanceChecker,
    private readonly gateway: AuditGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Process('run-audit')
  async handle(job: Job<{ auditId: string; projectUrl: string; categories: AuditCategory[] }>) {
    const audit = await this.auditRepo.findById(job.data.auditId);
    audit.start();
    await this.auditRepo.save(audit);
    this.gateway.emitStatusChange(audit.id, 'RUNNING');

    const checkers = this.resolveCheckers(job.data.categories);
    let completed = 0;

    for (const checker of checkers) {
      const results = await checker.run(job.data.projectUrl);
      audit.addCheckResults(checker.category, results);
      completed++;
      this.gateway.emitProgress(audit.id, Math.round((completed / checkers.length) * 100));
      await this.auditRepo.save(audit);
    }

    audit.complete();
    await this.auditRepo.save(audit);
    this.gateway.emitStatusChange(audit.id, 'COMPLETED');

    this.eventEmitter.emit('audit.finished', new AuditFinishedEvent(audit.id, audit.projectId));
  }
}
```

---

## 4. Strategia Crawlingu

### Wybór narzędzia

| Scenariusz | Narzędzie |
|------------|-----------|
| Strona renderowana przez JS (React, Vue, Angular SPA) | Puppeteer |
| Strona statyczna (WordPress, klasyczne HTML) | Cheerio (szybszy, brak narzutu przeglądarki) |
| Sprawdzenie nagłówków HTTP, redirectów | Axios / fetch |

### Detekcja rodzaju strony

```ts
// infrastructure/crawler/crawler.factory.ts
export class CrawlerFactory {
  static async create(url: string): Promise<CrawlerAdapter> {
    const response = await fetch(url);
    const html = await response.text();

    // Heurystyka: jeśli strona ma dużo data-react-root / ng-app / __NEXT_DATA__
    const isClientRendered = /<div[^>]+id="(root|app)"/.test(html)
      || html.includes('__NEXT_DATA__');

    return isClientRendered
      ? new PuppeteerAdapter()
      : new CheerioAdapter();
  }
}
```

---

## 5. Autentykacja

- **Strategia**: JWT (access token 15 min + refresh token 7 dni, HTTP-only cookie)
- **Guard**: `JwtAuthGuard` dekoruje wszystkie kontrolery przez `APP_GUARD` (globalnie)
- **Wyjątki**: `@Public()` dekorator dla endpointów logowania/rejestracji

---

## 6. Konfiguracja środowiska

```env
# .env.example
DATABASE_URL=postgresql://user:password@localhost:5432/auditflow
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-in-production
JWT_REFRESH_SECRET=change-me-too
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@auditflow.io
SMTP_PASS=secret
GOOGLE_PAGESPEED_API_KEY=   # Phase 2
```

---

## 7. Uruchomienie lokalne

```bash
# Wymagania: Node 20+, pnpm, Docker

# Baza danych i Redis
docker compose up -d postgres redis

# Instalacja zależności
pnpm install

# Migracje
pnpm --filter api typeorm migration:run

# Backend
pnpm --filter api dev        # http://localhost:4000

# Frontendy (każdy w osobnym terminalu)
pnpm --filter shell dev       # http://localhost:3000
pnpm --filter mfe-inventory dev
pnpm --filter mfe-analyzer dev
pnpm --filter mfe-reports dev
```
