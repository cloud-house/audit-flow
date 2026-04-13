# AuditFlow — Frontend (Microfrontends)

## 1. Struktura monorepo

```
apps/
├── shell/           ← Host App (port 3000)
├── mfe-inventory/   ← Remote: zarządzanie projektami (port 3001)
├── mfe-analyzer/    ← Remote: konfiguracja i postęp audytu (port 3002)
└── mfe-reports/     ← Remote: raporty i wykresy (port 3003)

packages/
├── types/           ← Współdzielone typy TypeScript (DTOs, enums)
└── event-bus/       ← Implementacja globalnego Event Bus
```

---

## 2. Architektura warstwowa — DDD na frontendzie

Każde MFE może zawierać **jeden lub więcej modułów domenowych**. Każdy moduł to osobny Bounded Context
ze swoimi czterema warstwami. Jeśli granice między MFE się zmieniają, moduł można przenieść
do innego MFE bez zmian wewnętrznych — wystarczy zaktualizować webpack `exposes`.

```
src/
├── shared/               ← infrastruktura techniczna wspólna dla wszystkich modułów w MFE
│   └── http.ts           ← apiFetch, fetchBlob — zero logiki domenowej
│
├── {moduł}/              ← jeden katalog per Bounded Context, np. project/, audit/, report/
│   ├── domain/           ← porty (interfejsy repozytoriów) + czyste typy domenowe
│   ├── application/      ← custom hooks = use cases (orkiestracja: repo + stan React)
│   ├── infrastructure/   ← adaptery HTTP/WebSocket implementujące porty
│   ├── pages/            ← eksponowane przez Module Federation; tylko JSX + wywołanie hooków
│   └── components/       ← czysto prezentacyjne komponenty React
│
└── styles.css            ← importowany przez każdą eksponowaną stronę
```

### Jak dodać nowy moduł domenowy do istniejącego MFE

1. Utwórz katalog `src/{nowa-domena}/` z czterema podkatalogami
2. Zacznij od `domain/` — zdefiniuj interfejs repozytorium
3. Zaimplementuj w `infrastructure/`, orkiestruj w `application/`, wyrenderuj w `pages/`
4. Dodaj nowy wpis do `exposes` w `webpack.config.js`:
   ```js
   './NewDomainPage': './src/new-domain/pages/NewDomainPage'
   ```
5. Zarejestruj route w shell

### Zasady zależności

| Warstwa | Co może importować | Czego NIE może importować |
|---|---|---|
| `domain/` | `@auditflow/types` | React, fetch, socket.io, cokolwiek z infra |
| `application/` | `domain/`, `infrastructure/` (przez domyślny argument) | fetch, socket.io bezpośrednio |
| `infrastructure/` | `domain/`, `shared/`, zewnętrzne libs | React components, inne moduły domenowe |
| `pages/` + `components/` | `application/`, `components/` | `infrastructure/` bezpośrednio |

### Dlaczego taki podział?

- **Testowalność:** domain i application można testować jednostkowo bez przeglądarki — wystarczy podmienić repozytorium przez argument hooka.
- **Wymienność adapterów:** zmiana endpointu API lub protokołu (np. REST → GraphQL) wymaga edycji tylko `infrastructure/`.
- **Czytelność stron:** `pages/` to wyłącznie JSX — żadnego `fetch`, `localStorage` ani logiki biznesowej.

---

## 3. Przykład — mfe-inventory

### domain/project.repository.ts — port (interfejs)

```typescript
export interface IProjectRepository {
  list(query: ProjectListQuery): Promise<ProjectListResult>;
  findById(id: string): Promise<ProjectDto>;
  findAudits(projectId: string): Promise<AuditSummary[]>;
  create(data: { name: string; url: string }): Promise<ProjectDto>;
  remove(id: string): Promise<void>;
}
```

### infrastructure/project.repository.ts — adapter HTTP

```typescript
export class ProjectHttpRepository implements IProjectRepository {
  async list({ search, limit = 50 } = {}) {
    const r = await apiFetch<{ data: ProjectWithLastAudit[] }>(`/projects?limit=${limit}`);
    return { data: r.data, total: r.meta.total };
  }
  // ...pozostałe metody
}

export const projectRepository = new ProjectHttpRepository(); // singleton
```

### application/useProjectList.ts — use case

```typescript
export function useProjectList(
  search: string,
  repo: IProjectRepository = projectRepository, // ← domyślny adapter; można podmienić w testach
) {
  const [projects, setProjects] = useState<ProjectWithLastAudit[]>([]);
  // ...loading, error, deleteProject, createProject
  return { projects, loading, error, deleteProject, createProject };
}
```

### pages/ProjectListPage.tsx — tylko UI

```typescript
export default function ProjectListPage() {
  const [search, setSearch] = useState('');
  const { projects, loading, error, deleteProject, createProject } = useProjectList(search);
  // wyłącznie JSX — żadnego fetch, żadnego localStorage
}
```

---

## 4. Mapa warstw per MFE

### mfe-inventory

```
src/
├── shared/
│   └── http.ts                           apiFetch
└── project/                              Bounded Context: Projects
    ├── domain/
    │   └── project.repository.ts         IProjectRepository
    ├── infrastructure/
    │   └── project.repository.ts         ProjectHttpRepository + singleton
    ├── application/
    │   ├── useProjectList.ts             lista projektów + CRUD
    │   └── useProjectDetail.ts           szczegóły + historia audytów
    ├── pages/
    │   ├── ProjectListPage.tsx           ← expose: './ProjectListPage'
    │   └── ProjectDetailPage.tsx         ← expose: './ProjectDetailPage'
    └── components/
        └── ProjectCard.tsx
```

### mfe-analyzer

```
src/
├── shared/
│   └── http.ts                           apiFetch
└── audit/                                Bounded Context: Audit Execution
    ├── domain/
    │   └── audit.repository.ts           IAuditRepository
    ├── infrastructure/
    │   ├── audit.repository.ts           AuditHttpRepository + singleton
    │   └── audit.socket.ts               useAuditSocket (WebSocket adapter)
    ├── application/
    │   └── useStartAudit.ts              start audytu + stan (auditId, starting, error)
    └── pages/
        └── AuditRunPage.tsx              ← expose: './AuditRunPage'
```

### mfe-reports

```
src/
├── shared/
│   └── http.ts                           apiFetch + fetchBlob
├── components/                           komponenty współdzielone między modułami
│   ├── ChecksList.tsx
│   └── ScoreGauge.tsx
└── report/                               Bounded Context: Reporting
    ├── domain/
    │   └── report.repository.ts          IReportRepository (ReportData, ReportMeta)
    ├── infrastructure/
    │   └── report.repository.ts          ReportHttpRepository + singleton
    ├── application/
    │   └── useReport.ts                  ładowanie raportu + download PDF
    ├── pages/
    │   └── ReportPage.tsx                ← expose: './ReportPage'
    └── components/                       re-exporty ze src/components/
        ├── ChecksList.tsx
        └── ScoreGauge.tsx
```

---

## 5. Shell App (Host)

### Odpowiedzialności
- Renderuje layout aplikacji (sidebar, topbar, obszar treści).
- Zarządza sesją JWT: logowanie, wylogowanie, odświeżanie tokenów.
- Definiuje route'y i dynamicznie ładuje zdalne komponenty (lazy import via Module Federation).
- Subskrybuje `auditflow:navigate` z Event Bus i wykonuje `router.push(route)`.

### Routing

```
/                    → redirect → /projects
/projects            → lazy MFE-Inventory (ProjectListPage)
/projects/:id        → lazy MFE-Inventory (ProjectDetailPage)
/projects/:id/audit  → lazy MFE-Analyzer (AuditRunPage)
/reports/:auditId    → lazy MFE-Reports (ReportPage)
/login               → Shell (LoginPage, bez MFE)
```

### Obsługa błędów MFE
Każdy zdalny komponent jest owinięty w `<ErrorBoundary>` + `<Suspense fallback={<Skeleton/>}>`.
Awaria jednego MFE nie blokuje reszty aplikacji.

---

## 6. Globalny Event Bus

Moduły nie importują się nawzajem. Komunikacja przez `CustomEvent` na `window`.

```typescript
// packages/event-bus/src/index.ts
export type AuditFlowEvent =
  | { type: 'auditflow:navigate';        payload: { route: string } }
  | { type: 'auditflow:audit-completed'; payload: { auditId: string } };

export function emit(event: AuditFlowEvent): void {
  window.dispatchEvent(new CustomEvent(event.type, { detail: event.payload }));
}
```

**Zasada:** Shell subskrybuje `auditflow:navigate` i wywołuje `router.push`.
Żaden MFE nie importuje React Router z Shella — nawigacja wyłącznie przez Event Bus.

---

## 7. Współdzielone typy

Pakiet `@auditflow/types` eksportuje DTO i enumy używane przez wszystkie MFE i backend.
Typy te pełnią rolę **kontraktu** między Bounded Contexts — zmiany wymagają aktualizacji
we wszystkich konsumentach (TypeScript pilnuje kompatybilności na etapie kompilacji).

```typescript
// packages/types/src/audit.ts
export type AuditStatus   = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type AuditCategory = 'SEO' | 'PERFORMANCE' | 'ACCESSIBILITY';
export type CheckSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface AuditSummary { ... }
export interface CheckResultDto { ... }
```

---

## 8. Webpack Module Federation

### publicPath

Shell musi mieć `publicPath: '/'` (nie `'auto'`), żeby skrypty ładowały się z roota
niezależnie od aktualnej ścieżki routera.

### Shared dependencies

```javascript
shared: {
  react:              { singleton: true, requiredVersion: '^18.3.1' },
  'react-dom':        { singleton: true, requiredVersion: '^18.3.1' },
  'react-router-dom': { singleton: true, requiredVersion: '^6.27.0' },
  // event-bus i types NIE są shared — każdy MFE dostaje kopię
}
```

### CSS w MFE

Każda strona eksponowana przez Module Federation musi zawierać `import '../styles.css'`
bezpośrednio w pliku strony — samo importowanie w `bootstrap.tsx` nie wystarcza,
ponieważ Module Federation ładuje eksponowane moduły leniwie, z pominięciem bootstrap.
