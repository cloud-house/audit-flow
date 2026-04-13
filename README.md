# AuditFlow

Platforma SaaS do automatycznych audytów technicznych stron WWW — SEO, Performance, Accessibility.

## Stack

| Warstwa | Technologie |
|---|---|
| **Backend** | NestJS, TypeORM, PostgreSQL, BullMQ (Redis), Socket.IO |
| **Frontend** | React 18, Webpack Module Federation, Tailwind CSS |
| **Monorepo** | Turborepo, pnpm workspaces |
| **Infrastruktura** | Docker Compose (Postgres + Redis) |

## Architektura

Projekt zbudowany w podejściu **DDD (Domain-Driven Design)**:

- **Backend** — moduły NestJS z podziałem na `domain/`, `application/`, `infrastructure/`, `api/`
- **Frontend** — Microfrontends (Webpack Module Federation), każdy MFE jako osobny Bounded Context z warstwami `domain/`, `application/`, `infrastructure/`, `pages/`

```
apps/
├── shell/           # Host App — routing, layout, auth (port 3000)
├── mfe-inventory/   # Zarządzanie projektami (port 3001)
├── mfe-analyzer/    # Uruchamianie audytów + live progress (port 3002)
├── mfe-reports/     # Raporty i wykresy (port 3003)
└── api/             # NestJS REST API + WebSocket (port 4000)

packages/
├── types/           # Współdzielone typy TypeScript (DTOs, enums)
└── event-bus/       # Komunikacja między MFE przez CustomEvent
```

## Wymagania

- Node.js 20+
- pnpm 9+
- Docker (dla Postgres i Redis)

## Uruchomienie

### 1. Infrastruktura (Postgres + Redis)

```bash
docker-compose up -d
```

### 2. Zależności

```bash
pnpm install
```

### 3. Zmienne środowiskowe

```bash
cp .env.example apps/api/.env
```

### 4. Uruchomienie wszystkich serwisów

```bash
pnpm turbo dev
```

Lub osobno:

```bash
pnpm --filter api dev          # :4000
pnpm --filter shell dev        # :3000
pnpm --filter mfe-inventory dev  # :3001
pnpm --filter mfe-analyzer dev   # :3002
pnpm --filter mfe-reports dev    # :3003
```

Aplikacja dostępna pod `http://localhost:3000`.

## Dokumentacja

Szczegółowa dokumentacja w katalogu [`documentation/`](./documentation/):

| Plik | Zawartość |
|---|---|
| [01-overview.md](./documentation/01-overview.md) | Cel projektu, zakres MVP, metryki sukcesu |
| [02-architecture.md](./documentation/02-architecture.md) | Diagram architektury, decyzje projektowe |
| [03-frontend.md](./documentation/03-frontend.md) | Struktura MFE, warstwy DDD, Module Federation |
| [04-backend.md](./documentation/04-backend.md) | Moduły NestJS, kolejki, WebSocket |
| [05-ddd-tactical.md](./documentation/05-ddd-tactical.md) | Agregaty, Value Objects, Domain Events |
| [06-database.md](./documentation/06-database.md) | Schema bazy danych, migracje |
| [07-api.md](./documentation/07-api.md) | Endpointy REST API |
| [08-roadmap.md](./documentation/08-roadmap.md) | Mapa drogowa, fazy rozwoju |
