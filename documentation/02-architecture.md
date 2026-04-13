# AuditFlow — Architektura Systemu

## 1. Diagram kontekstowy C4 (Level 1)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET                                     │
│                                                                     │
│   ┌──────────────┐        ┌──────────────────────────────────────┐  │
│   │   Audytor    │──HTTP─▶│            AuditFlow SaaS            │  │
│   │  (przeglądarka)       │                                      │  │
│   └──────────────┘        │  ┌─────────┐  ┌───────────────────┐ │  │
│                           │  │ Shell   │  │  Backend API      │ │  │
│   ┌──────────────┐        │  │ App     │  │  (NestJS)         │ │  │
│   │   Klient     │◀─PDF──▶│  │ (React) │  │                   │ │  │
│   │  (e-mail)    │        │  └─────────┘  └───────────────────┘ │  │
│   └──────────────┘        └──────────────────────────────────────┘  │
│                                      │                              │
│                           ┌──────────▼──────────┐                  │
│                           │  Google PageSpeed   │  (Phase 2)        │
│                           │  Insights API       │                  │
│                           └─────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Bounded Contexts (DDD)

```
┌─────────────────────────────────────────────────────────┐
│                    AuditFlow System                      │
│                                                         │
│  ┌──────────────────────────┐  ┌──────────────────────┐ │
│  │   ANALIZA (Core Domain)  │  │  RAPORTOWANIE        │ │
│  │                          │  │  (Supporting Domain) │ │
│  │  - Crawling strony       │  │                      │ │
│  │  - Checkers (SEO, Perf)  │──▶  - Generowanie PDF   │ │
│  │  - Aggregate: Audit      │  │  - Wykresy/HTML      │ │
│  │  - Event: AuditFinished  │  │                      │ │
│  └──────────────────────────┘  └──────────────────────┘ │
│                                                         │
│  ┌──────────────────────────┐  ┌──────────────────────┐ │
│  │  KLIENT & PROJEKT        │  │  KOMUNIKACJA         │ │
│  │  (Generic Domain)        │  │  (Generic Domain)    │ │
│  │                          │  │                      │ │
│  │  - Klienci               │  │  - Powiadomienia     │ │
│  │  - Projekty (domeny)     │  │    e-mail / Slack    │ │
│  │  - Historia audytów      │  │  - Subskrypcja       │ │
│  └──────────────────────────┘  │    zdarzeń           │ │
│                                └──────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Reguła komunikacji między kontekstami:** Konteksty NIE importują klas domenowych nawzajem.
Komunikacja odbywa się wyłącznie przez Domain Events (wewnętrzny event bus NestJS `EventEmitter2`).

---

## 3. Topologia Microfrontend (MFE)

```
Browser
│
├── Shell App (Host)                        :3000
│   ├── Autoryzacja (JWT, route guards)
│   ├── Menu boczne + layout
│   ├── Ładuje zdalne moduły via ModuleFederation
│   └── Event Bus (globalny CustomEvent)
│
├── MFE-Inventory (Remote)                  :3001
│   ├── Lista klientów i projektów
│   └── Formularz dodawania projektu
│
├── MFE-Analyzer (Remote)                   :3002
│   ├── Konfiguracja audytu (wybór kategorii)
│   ├── Pasek postępu (WebSocket → NestJS Gateway)
│   └── Podgląd błędów w czasie rzeczywistym
│
└── MFE-Reports (Remote)                    :3003
    ├── Lista raportów projektu
    ├── Dashboard wykresów (Recharts)
    └── Przycisk pobierania PDF
```

**Zasada izolacji:** Każdy MFE buduje się osobno (`webpack build`). Awaria jednego nie blokuje pozostałych.

---

## 4. Backend — Modular Monolith (NestJS)

```
apps/
└── api/                          ← Jeden proces NestJS
    └── src/
        ├── main.ts
        ├── app.module.ts         ← Importuje wszystkie moduły
        │
        ├── modules/
        │   ├── analysis/         ← Core Domain
        │   ├── reporting/        ← Supporting Domain
        │   ├── client-project/   ← Generic Domain
        │   └── notification/     ← Generic Domain
        │
        ├── shared/
        │   ├── events/           ← Definicje Domain Events (DTO)
        │   ├── guards/           ← JWT AuthGuard
        │   └── database/         ← TypeORM setup, migrations
        │
        └── infrastructure/
            ├── queue/            ← BullMQ producers/consumers
            └── crawler/          ← Puppeteer / Cheerio adapters
```

---

## 5. Stack Technologiczny

| Warstwa | Technologia | Uzasadnienie |
|---------|-------------|--------------|
| Frontend Shell | React 18 + Webpack 5 Module Federation | Izolacja MFE, lazy loading |
| Frontend UI | Tailwind CSS + shadcn/ui | Spójny design bez narzutu CSS-in-JS |
| MFE wykresy | Recharts | Lekka biblioteka oparta na SVG, prosta konfiguracja |
| Backend | NestJS 10 (TypeScript) | Modularność, DI, dekorators — idealne dla DDD |
| ORM | TypeORM | Dobra integracja z NestJS, migracje |
| Baza danych | PostgreSQL 16 | ACID, JSON support, sprawdzony w produkcji |
| Kolejka zadań | Redis 7 + BullMQ | Asynchroniczne przetwarzanie audytów bez blokowania API |
| Crawling | Puppeteer (JS rendering) + Cheerio (static HTML) | Puppeteer dla SPA, Cheerio szybszy dla statycznych stron |
| WebSocket | NestJS Gateway (socket.io) | Postęp audytu w czasie rzeczywistym |
| PDF | Puppeteer (headless print) lub `@react-pdf/renderer` | Generowanie raportów |
| Autentykacja | JWT (access + refresh token) | Bezstanowy, skalowalny |
| Monorepo | pnpm workspaces + Turborepo | Jedno repo, niezależne buildy |

---

## 6. Przepływ danych — uruchomienie audytu

```
1. Audytor klika "Start Audit" w MFE-Analyzer
2. POST /api/audits  →  NestJS API Gateway
3. Handler tworzy Aggregate Audit (status: PENDING)
4. Audit zapisywany do PostgreSQL
5. Job "audit:{id}" dodany do kolejki BullMQ (Redis)
6. WebSocket event: audit.status.updated {status: "PENDING"}

7. BullMQ Worker pobiera job
8. Crawler (Puppeteer) otwiera stronę
9. Kolejno uruchamiane Checkery (SEO, Performance)
10. Każdy Checker aktualizuje Audit Aggregate
11. WebSocket events co N sekund: audit.progress {percent: 40}

12. Wszystkie Checkery gotowe → Audit.complete()
13. Domain Event: AuditFinished emitowany do EventEmitter2
14. ReportingModule słucha → generuje PDF asynchronicznie
15. NotificationModule słucha → wysyła e-mail
16. WebSocket event: audit.status.updated {status: "COMPLETED"}
17. MFE-Analyzer przekierowuje do MFE-Reports
```
