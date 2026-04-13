# AuditFlow — Project Overview

## 1. Cel projektu

AuditFlow to platforma SaaS do automatycznego przeprowadzania audytów technicznych stron WWW. System umożliwia analizę pod kątem SEO, wydajności (Performance) oraz dostępności (Accessibility/WCAG), a następnie prezentuje wyniki w formie czytelnych raportów i historii zmian.

**Główne potrzeby biznesowe:**
- Agencje digital i freelancerzy chcą regularnie monitorować jakość techniczną stron klientów bez ręcznej pracy.
- Klienci końcowi potrzebują prostego raportu PDF, który rozumieją bez wiedzy technicznej.
- Menedżerowie projektów potrzebują historii audytów, aby śledzić postęp i wykrywać regresje.

---

## 2. Użytkownicy systemu

| Rola | Opis |
|------|------|
| **Audytor** | Pracownik agencji / freelancer — dodaje projekty, uruchamia audyty, generuje raporty |
| **Klient** | Odbiorca raportu PDF; brak dostępu do panelu (w MVP) |
| **Administrator** | Zarządza użytkownikami i planami subskrypcyjnymi (poza MVP) |

---

## 3. Zakres MVP

### Funkcje wchodzące w zakres MVP

1. **Panel Zarządzania Projektami**
   - Dodawanie/edycja/usuwanie klientów i ich stron (domen).
   - Lista wszystkich projektów z ostatnim wynikiem audytu.

2. **Silnik Audytowy**
   - Ręczne wyzwolenie skanowania dla podanego URL.
   - Sprawdzanie: statusy HTTP, tagi `<title>` i `<meta description>`, atrybuty `alt` obrazków, struktura nagłówków `h1–h6`.
   - Wynik punktowy 0–100 dla kategorii SEO i Wydajność.
   - Śledzenie postępu audytu "na żywo" (WebSocket).

3. **Dashboard Wyników**
   - Wykresy punktów per kategoria.
   - Lista błędów z priorytetem (Critical / Warning / Info).

4. **Eksport do PDF**
   - Generowanie raportu PDF gotowego do wysłania klientowi.

### Funkcje poza zakresem MVP (Extended)

| Funkcja | Faza |
|---------|------|
| Audyty cykliczne (cron co tydzień) | Phase 2 |
| Porównywarka dwóch terminów (wykrywanie regresji) | Phase 2 |
| Integracja z Google PageSpeed Insights API | Phase 2 |
| Panel klienta z dostępem tylko do jego raportów | Phase 3 |
| Plany subskrypcyjne i billing | Phase 3 |
| Testy WCAG (dostępność) | Phase 3 |

---

## 4. Metryki sukcesu projektu

| Metryka | Definicja sukcesu |
|---------|-------------------|
| **Izolacja modułów** | Zmiana w MFE-Reports nie powoduje błędów w MFE-Inventory (osobne bundle, osobne deploye) |
| **Czystość domeny** | Klasy domenowe (np. `Audit`, `AuditScore`) nie importują NestJS ani TypeORM |
| **Komunikacja MFE** | Moduły wymieniają dane przez URL params lub Event Bus — brak współdzielonego stanu Redux |
| **Testowalność** | Logika obliczania score SEO testowana jednostkowo bez spinania bazy danych |
| **Czas generowania raportu** | PDF generowany poniżej 5 sekund dla strony z ≤50 URLami |
