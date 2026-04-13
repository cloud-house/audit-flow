# AuditFlow — Roadmap i Fazy Realizacji

## Faza 1 — MVP

**Cel:** Działający produkt pozwalający ręcznie uruchomić audyt, zobaczyć wyniki i pobrać PDF.

### Epiki i User Stories

#### 1.1 Autentykacja
- [ ] Rejestracja konta (email + hasło)
- [ ] Logowanie, wylogowanie
- [ ] Odświeżanie JWT (refresh token w HTTP-only cookie)
- [ ] Ochrona wszystkich tras wymagające zalogowania

#### 1.2 Zarządzanie Klientami i Projektami (MFE-Inventory)
- [ ] Lista klientów z paginacją
- [ ] Dodawanie / edycja / usuwanie klienta
- [ ] Lista projektów klienta
- [ ] Dodawanie / edycja / usuwanie projektu (z walidacją URL)
- [ ] Karta projektu pokazuje ostatni wynik audytu

#### 1.3 Silnik Audytowy (AnalysisModule + MFE-Analyzer)
- [ ] Endpoint POST `/api/audits` dodający job do kolejki BullMQ
- [ ] Worker: crawl strony przez Cheerio (static) / Puppeteer (SPA)
- [ ] SEO Checker:
  - [ ] Sprawdzenie obecności `<title>` i długości (10-60 znaków)
  - [ ] Sprawdzenie `<meta name="description">` i długości (50-160 znaków)
  - [ ] Weryfikacja dokładnie jednego `<h1>` na stronie
  - [ ] Sprawdzenie ciągłości hierarchii nagłówków h1-h6
  - [ ] Weryfikacja atrybutu `alt` na wszystkich `<img>`
  - [ ] Sprawdzenie canonicala
- [ ] Performance Checker (podstawowy, bez PageSpeed API):
  - [ ] Liczba requestów HTTP (> 80 = WARNING)
  - [ ] Rozmiar strony (> 3MB = WARNING)
  - [ ] Sprawdzenie HTTP → HTTPS redirect
  - [ ] Obecność meta viewport (responsive)
- [ ] Obliczanie score 0-100 per kategoria (formuła w Audit Aggregate)
- [ ] WebSocket: emisja progress i status
- [ ] MFE-Analyzer: live feed postępu, lista błędów w czasie rzeczywistym

#### 1.4 Dashboard Wyników (MFE-Reports)
- [ ] Karty ze score per kategoria (duże cyfry, kolor wg progu)
- [ ] RadialBar chart aktualnych wyników
- [ ] Lista błędów z filtrowaniem po severity i kategorii
- [ ] Statystyki: liczba CRITICAL / WARNING / INFO

#### 1.5 Eksport PDF (ReportingModule)
- [ ] Generowanie PDF przez Puppeteer (print HTML template)
- [ ] Endpoint GET `/api/reports/:auditId/pdf`
- [ ] Przycisk pobierania w MFE-Reports

#### 1.6 Infrastruktura
- [ ] Monorepo pnpm workspaces + Turborepo
- [ ] docker-compose: postgres + redis
- [ ] TypeORM migracje (wszystkie tabele z `06-database.md`)
- [ ] Zmienne środowiskowe `.env.example`
- [ ] Podstawowe testy jednostkowe domeny (Audit Aggregate, Value Objects)

---

## Faza 2 — Extended

**Cel:** Automatyzacja monitoringu i porównywanie wyników w czasie.

### 2.1 Audyty Cykliczne
- [ ] Pole `cronSchedule` w projekcie (np. `0 9 * * 1` = poniedziałek 9:00)
- [ ] Cron job w NestJS sprawdzający projekty z aktywnym harmonogramem
- [ ] Powiadomienie e-mail po zakończeniu automatycznego audytu
- [ ] Historia audytów: lista ostatnich 30 skanów per projekt

### 2.2 Porównywarka (Wykrywanie Regresji)
- [ ] Wybór dwóch audytów projektu do zestawienia
- [ ] Widok diff: które błędy pojawiły się nowe, które zostały naprawione
- [ ] LineChart trendów wyników (Faza 1 zbiera dane, Faza 2 je prezentuje)

### 2.3 Integracja Google PageSpeed Insights API
- [ ] Konfiguracja API Key w ustawieniach konta
- [ ] PerformanceChecker v2: wywołanie PSI API zamiast/oprócz własnego crawlingu
- [ ] Dodatkowe metryki: LCP, CLS, INP, FCP, TTFB
- [ ] Prezentacja Web Vitals w dashboardzie

### 2.4 Powiadomienia Slack
- [ ] Konfiguracja Webhook URL per projekt
- [ ] Wysyłka wiadomości po zakończeniu audytu z linkiem do raportu
- [ ] Alertowanie gdy score spadnie poniżej progu

---

## Faza 3 — Growth (Poza zakresem MVP)

- Panel klienta (read-only, dostęp tylko do swoich raportów)
- Plany subskrypcyjne (limit audytów per miesiąc)
- Testy dostępności WCAG 2.1 (axe-core integration)
- Multi-URL crawl (cały serwis, nie tylko jeden URL)
- White-label PDF z logo klienta
- API Publiczne (klienci mogą triggerować audyty z zewnętrznych systemów)

---

## Metryki Sukcesu — Checklist

Po zakończeniu Fazy 1 sprawdź:

### Izolacja MFE
```bash
# Zbuduj tylko MFE-Reports — pozostałe powinny działać
pnpm --filter mfe-reports build

# Sprawdź że shell ładuje się bez mfe-reports (ErrorBoundary)
# Wyłącz serwer mfe-reports i odśwież shell — powinien pokazać fallback, nie crash
```

### Czystość domeny
```bash
# Upewnij się, że pliki w domain/ nie importują NestJS ani TypeORM
grep -r "@nestjs\|typeorm\|@Injectable\|@Entity" \
  apps/api/src/modules/analysis/domain/
# Wynik powinien być pusty
```

### Komunikacja przez Event Bus (nie Redux)
```bash
# Znajdź wszystkie cross-MFE importy — nie powinno być żadnych
grep -r "mfeInventory\|mfeAnalyzer\|mfeReports" \
  apps/shell/src apps/mfe-*/src \
  --include="*.ts" --include="*.tsx" \
  | grep -v "webpack.config\|remoteEntry"
# Wynik: brak bezpośrednich importów między MFE
```

### Testowalność logiki domenowej
```bash
# Testy jednostkowe domeny — bez bazy, bez serwera
pnpm --filter api test -- --testPathPattern="domain"
# Powinny przechodzić w < 1 sekundę bez żadnych side effectów
```

### Czas generowania raportu
```bash
# Uruchom audyt na stronie z ~20 podstronami
# Czas od POST /api/audits do dostępności PDF powinien być < 5 minut
# (audyt Faza 1 crawluje 1 URL, więc < 30 sekund)
```

---

## Definicja ukończenia (Definition of Done)

Każda funkcja jest "Done" gdy:
1. Kod napisany i poddany review (lub self-review dla projektu solo)
2. Testy jednostkowe dla logiki domenowej
3. Endpoint przetestowany manualnie (Insomnia / Postman)
4. Widok przetestowany manualnie w przeglądarce (Chrome + Firefox)
5. Brak błędów TypeScript (`pnpm typecheck`)
6. Brak błędów linter (`pnpm lint`)
