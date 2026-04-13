# AuditFlow — Kontrakt API (REST + WebSocket)

## 1. Konwencje

- Base URL: `https://api.auditflow.io/api` (lokalnie: `http://localhost:4000/api`)
- Autentykacja: `Authorization: Bearer <access_token>` (JWT)
- Format danych: JSON (`Content-Type: application/json`)
- Daty: ISO 8601 UTC (`2025-11-01T14:30:00.000Z`)
- Błędy: RFC 7807 Problem Details

### Format błędu

```json
{
  "type": "https://auditflow.io/errors/validation",
  "title": "Validation Failed",
  "status": 422,
  "detail": "Field 'url' is not a valid URL",
  "instance": "/api/projects"
}
```

---

## 2. Autentykacja

### `POST /api/auth/login`

```
Request:
{
  "email": "audytor@example.com",
  "password": "secret"
}

Response 200:
{
  "accessToken": "<jwt>",
  "expiresIn": 900
}
Set-Cookie: refresh_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh
```

### `POST /api/auth/refresh`

```
Cookie: refresh_token=<jwt>

Response 200:
{
  "accessToken": "<jwt>",
  "expiresIn": 900
}
```

### `POST /api/auth/logout`

```
Response 204 No Content
(Usuwa refresh_token z bazy i czyści cookie)
```

---

## 3. Klienci

### `GET /api/clients`

```
Query params:
  page     integer  default: 1
  limit    integer  default: 20, max: 100
  search   string   szuka w polu name

Response 200:
{
  "data": [
    { "id": "uuid", "name": "Firma ABC", "contactEmail": "...", "projectsCount": 3, "createdAt": "..." }
  ],
  "meta": { "page": 1, "limit": 20, "total": 45 }
}
```

### `POST /api/clients`

```
Request:
{ "name": "Firma ABC Sp. z o.o.", "contactEmail": "tech@firma-abc.pl" }

Response 201:
{ "id": "uuid", "name": "Firma ABC Sp. z o.o.", "contactEmail": "...", "createdAt": "..." }
```

### `GET /api/clients/:id`

```
Response 200: { ...client, "projects": [...] }
Response 404: Problem Details
```

### `PUT /api/clients/:id`

```
Request: { "name": "Nowa Nazwa" }
Response 200: { ...updatedClient }
```

### `DELETE /api/clients/:id`

```
Response 204 No Content
(Kaskadowo usuwa projekty i powiązane audyty — soft delete zalecane w produkcji)
```

---

## 4. Projekty

### `GET /api/projects`

```
Query params: page, limit, clientId (filter), search

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "clientId": "uuid",
      "clientName": "Firma ABC",
      "name": "Strona główna",
      "url": "https://firma-abc.pl",
      "lastAudit": {
        "auditId": "uuid",
        "scoreSeo": 73,
        "scorePerf": 61,
        "completedAt": "2025-11-01T14:00:00Z"
      }
    }
  ],
  "meta": { ... }
}
```

### `POST /api/projects`

```
Request:
{ "clientId": "uuid", "name": "Strona główna", "url": "https://firma-abc.pl", "description": "..." }

Response 201: { ...project }
Błąd 422: jeśli url nie jest prawidłowym URL
```

### `GET /api/projects/:id`

```
Response 200: { ...project, "auditsCount": 12 }
```

### `PUT /api/projects/:id`

```
Request: { "name": "Nowa Nazwa", "url": "https://nowy.pl" }
Response 200: { ...updatedProject }
```

### `DELETE /api/projects/:id`

```
Response 204 No Content
```

---

## 5. Audyty

### `POST /api/audits` — wyzwolenie audytu

```
Request:
{
  "projectId": "uuid",
  "categories": ["SEO", "PERFORMANCE"]
}

Response 202 Accepted:
{
  "auditId": "uuid",
  "status": "PENDING",
  "createdAt": "2025-11-01T14:30:00Z"
}
```

Status `202 Accepted` oznacza, że zadanie zostało przyjęte do kolejki — wynik dostępny przez polling lub WebSocket.

### `GET /api/audits/:id`

```
Response 200:
{
  "id": "uuid",
  "projectId": "uuid",
  "status": "COMPLETED",
  "categories": ["SEO", "PERFORMANCE"],
  "scores": {
    "SEO": 73,
    "PERFORMANCE": 61
  },
  "startedAt": "2025-11-01T14:30:00Z",
  "completedAt": "2025-11-01T14:32:45Z",
  "checksCount": {
    "CRITICAL": 4,
    "WARNING": 11,
    "INFO": 23
  }
}
```

### `GET /api/audits/:id/checks`

```
Query params:
  category   SEO | PERFORMANCE | ACCESSIBILITY
  severity   CRITICAL | WARNING | INFO
  page, limit

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "ruleId": "seo.missing-alt",
      "category": "SEO",
      "severity": "WARNING",
      "message": "Obraz bez atrybutu alt",
      "affectedUrl": "https://firma-abc.pl/about",
      "details": { "selector": "img.hero-image" }
    }
  ],
  "meta": { ... }
}
```

### `GET /api/projects/:id/audits` — historia audytów projektu

```
Query params: page, limit, status

Response 200:
{
  "data": [ ...array of AuditSummary ],
  "meta": { ... }
}
```

---

## 6. Raporty

### `GET /api/reports/:auditId`

```
Response 200:
{
  "id": "uuid",
  "auditId": "uuid",
  "generatedAt": "2025-11-01T14:33:10Z",
  "pdfAvailable": true
}

Response 404: Raport jeszcze nie wygenerowany (audyt może być w toku)
```

### `GET /api/reports/:auditId/pdf` — pobieranie PDF

```
Response 200:
Content-Type: application/pdf
Content-Disposition: attachment; filename="audit-report-2025-11-01.pdf"
<binary PDF content>

Response 404: Raport nie istnieje
Response 202: Raport jest generowany — spróbuj za chwilę
```

---

## 7. WebSocket API (socket.io)

### Połączenie

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: { token: 'Bearer <jwt>' }
});
```

### Zdarzenia emitowane przez serwer

| Zdarzenie | Payload | Kiedy |
|-----------|---------|-------|
| `audit.{id}.status` | `{ status: AuditStatus }` | Zmiana statusu audytu |
| `audit.{id}.progress` | `{ percent: number, currentUrl: string }` | Co sprawdzony URL |
| `audit.{id}.check` | `CheckResult` | Natychmiastowo po wykryciu błędu |

### Przykład nasłuchiwania

```js
const auditId = 'abc-123';

socket.on(`audit.${auditId}.status`, ({ status }) => {
  console.log('Status zmieniony na:', status);
  if (status === 'COMPLETED') {
    // Przekieruj do raportu
  }
});

socket.on(`audit.${auditId}.progress`, ({ percent, currentUrl }) => {
  updateProgressBar(percent);
  setCurrentlyScanningUrl(currentUrl);
});

socket.on(`audit.${auditId}.check`, (check) => {
  appendToLiveFeed(check);
});
```

---

## 8. Statusy HTTP — tabela referencyjna

| Kod | Kiedy używany |
|-----|--------------|
| 200 | Zwykłe GET / PUT / POST które zwraca natychmiastowy wynik |
| 201 | POST tworzy nowy zasób (klient, projekt) |
| 202 | POST który tworzy zadanie asynchroniczne (audyt) |
| 204 | DELETE lub akcja bez body odpowiedzi |
| 400 | Nieprawidłowe ciało żądania (parse error) |
| 401 | Brak lub wygasły token JWT |
| 403 | Zalogowany, ale brak uprawnień do zasobu |
| 404 | Zasób nie istnieje |
| 409 | Konflikt (np. audyt już uruchomiony) |
| 422 | Walidacja biznesowa nie powiodła się (np. nieprawidłowy URL) |
| 500 | Błąd wewnętrzny serwera |
