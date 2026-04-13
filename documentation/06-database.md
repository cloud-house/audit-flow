# AuditFlow — Schemat Bazy Danych (PostgreSQL)

## 1. Diagram ER

```
clients
────────────────────────
PK  id              UUID
    name            VARCHAR(255)
    contact_email   VARCHAR(255)
    created_at      TIMESTAMPTZ
    updated_at      TIMESTAMPTZ

         │ 1
         │ has many
         ▼ N

projects
────────────────────────
PK  id              UUID
FK  client_id       UUID → clients.id
    name            VARCHAR(255)
    url             VARCHAR(2048)       ← znormalizowany URL
    description     TEXT
    created_at      TIMESTAMPTZ
    updated_at      TIMESTAMPTZ

         │ 1
         │ has many
         ▼ N

audits
────────────────────────
PK  id              UUID
FK  project_id      UUID → projects.id
    status          audit_status        ← enum: PENDING|RUNNING|COMPLETED|FAILED
    categories      TEXT[]              ← {SEO, PERFORMANCE, ACCESSIBILITY}
    score_seo       SMALLINT            ← 0-100, NULL jeśli nie sprawdzano
    score_perf      SMALLINT            ← 0-100, NULL jeśli nie sprawdzano
    score_a11y      SMALLINT            ← 0-100, NULL jeśli nie sprawdzano
    failure_reason  TEXT                ← NULL przy sukcesie
    started_at      TIMESTAMPTZ
    completed_at    TIMESTAMPTZ
    created_at      TIMESTAMPTZ

         │ 1
         │ has many
         ▼ N

audit_checks
────────────────────────
PK  id              UUID
FK  audit_id        UUID → audits.id
    rule_id         VARCHAR(64)         ← np. 'seo.missing-alt', 'seo.missing-title'
    category        audit_category      ← enum: SEO|PERFORMANCE|ACCESSIBILITY
    severity        check_severity      ← enum: CRITICAL|WARNING|INFO
    message         TEXT
    affected_url    VARCHAR(2048)
    details         JSONB               ← dodatkowe dane (np. lista URLi bez alt)
    created_at      TIMESTAMPTZ

         ▲ 1
         │ belongs to
         │ N

audits (powrót — relacja 1:1 do raportu)

reports
────────────────────────
PK  id              UUID
FK  audit_id        UUID → audits.id   UNIQUE (jeden raport na audyt)
    pdf_path        VARCHAR(1024)       ← ścieżka do pliku PDF na dysku/S3
    html_snapshot   TEXT               ← HTML wersja raportu (opcjonalnie)
    generated_at    TIMESTAMPTZ
    created_at      TIMESTAMPTZ

users
────────────────────────
PK  id              UUID
    email           VARCHAR(255)        UNIQUE
    password_hash   VARCHAR(255)
    full_name       VARCHAR(255)
    role            user_role           ← enum: ADMIN|AUDITOR
    refresh_token   VARCHAR(512)        ← hashed, NULL po wylogowaniu
    created_at      TIMESTAMPTZ
    updated_at      TIMESTAMPTZ
```

---

## 2. Typy ENUM (PostgreSQL custom types)

```sql
CREATE TYPE audit_status   AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE audit_category AS ENUM ('SEO', 'PERFORMANCE', 'ACCESSIBILITY');
CREATE TYPE check_severity AS ENUM ('CRITICAL', 'WARNING', 'INFO');
CREATE TYPE user_role      AS ENUM ('ADMIN', 'AUDITOR');
```

---

## 3. Pełne DDL

```sql
-- clients
CREATE TABLE clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- projects
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  url         VARCHAR(2048) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- audits
CREATE TABLE audits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status         audit_status NOT NULL DEFAULT 'PENDING',
  categories     TEXT[]       NOT NULL DEFAULT '{}',
  score_seo      SMALLINT     CHECK (score_seo BETWEEN 0 AND 100),
  score_perf     SMALLINT     CHECK (score_perf BETWEEN 0 AND 100),
  score_a11y     SMALLINT     CHECK (score_a11y BETWEEN 0 AND 100),
  failure_reason TEXT,
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- audit_checks
CREATE TABLE audit_checks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id     UUID           NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  rule_id      VARCHAR(64)    NOT NULL,
  category     audit_category NOT NULL,
  severity     check_severity NOT NULL,
  message      TEXT           NOT NULL,
  affected_url VARCHAR(2048)  NOT NULL,
  details      JSONB,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- reports
CREATE TABLE reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id      UUID         NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  pdf_path      VARCHAR(1024),
  html_snapshot TEXT,
  generated_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT reports_audit_id_unique UNIQUE (audit_id)
);

-- users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  role          user_role    NOT NULL DEFAULT 'AUDITOR',
  refresh_token VARCHAR(512),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

---

## 4. Indeksy

```sql
-- Najczęstsze zapytania: lista audytów projektu, filtrowanie po statusie
CREATE INDEX idx_audits_project_id     ON audits(project_id);
CREATE INDEX idx_audits_status         ON audits(status);
CREATE INDEX idx_audits_created_at     ON audits(created_at DESC);

-- Szybkie pobieranie wyników dla danego audytu
CREATE INDEX idx_audit_checks_audit_id ON audit_checks(audit_id);
CREATE INDEX idx_audit_checks_severity ON audit_checks(audit_id, severity);

-- Projekty klienta
CREATE INDEX idx_projects_client_id    ON projects(client_id);
```

---

## 5. Migracje (TypeORM)

```
apps/api/src/shared/database/migrations/
├── 1700000001-CreateEnums.ts
├── 1700000002-CreateUsers.ts
├── 1700000003-CreateClientsAndProjects.ts
├── 1700000004-CreateAudits.ts
├── 1700000005-CreateAuditChecks.ts
└── 1700000006-CreateReports.ts
```

```bash
# Generowanie nowej migracji
pnpm --filter api typeorm migration:generate src/shared/database/migrations/AddSomeFeature

# Uruchomienie migracji
pnpm --filter api typeorm migration:run

# Cofnięcie ostatniej migracji
pnpm --filter api typeorm migration:revert
```

---

## 6. Przykładowe dane testowe (seed)

```sql
-- Klient testowy
INSERT INTO clients (name, contact_email) VALUES ('Firma ABC Sp. z o.o.', 'tech@firma-abc.pl');

-- Projekt testowy
INSERT INTO projects (client_id, name, url)
  SELECT id, 'Strona główna', 'https://firma-abc.pl' FROM clients WHERE name = 'Firma ABC Sp. z o.o.';

-- Przykładowy zakończony audyt
INSERT INTO audits (project_id, status, categories, score_seo, score_perf, started_at, completed_at)
  SELECT id, 'COMPLETED', ARRAY['SEO','PERFORMANCE'], 73, 61, NOW() - interval '10 minutes', NOW()
  FROM projects WHERE url = 'https://firma-abc.pl';
```
