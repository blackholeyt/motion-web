# Motion Web

Neuaufbau des Motion-Workout-Trackers als installierbare Web-App (PWA).

- Läuft auf iPhone, Android, Tablet und Desktop, ohne Apple-Developer-Account
- Local-first: Alle Daten werden zuerst auf dem Gerät gespeichert und funktionieren offline
- Später optional per Capacitor als native App im App Store

## Stand (03.11.2026)
Alle Phasen 0–7 sind gebaut. Live: https://motion-web.pages.dev. Motion läuft privat, nur auf Einladung.

| Phase | Inhalt | Abnahme |
|---|---|---|
| 0 | Analyse der iOS-App (`docs/FUNKTIONEN.md`, `docs/DATENMODELL.md`) | erledigt |
| 1 | Grundgerüst, Design-System, Startanimation, PWA mit Offline-Start, Tests, CI | erledigt (iPhone) |
| 2 | Lokaler Kern: Routinen, Katalog, Vorlagen, Trainingsplan, Training mit Pausen-Timer, Supersätzen und Rückgängig, offene Trainings, Nachtragen, Verlauf | mit Phase 7 |
| 3 | Rekorde, XP, Level, Feiern, Übungsbibliothek, Rekordziele, Cardio, Profil, Körpergewicht, Schlafindex, Quiet Mode, Einführung, Demo | mit Phase 7 |
| 4 | Konto (Google, E-Mail-Code), Schema mit RLS, Sync, Schutz offener Trainings | RLS live 13/13; Geräte offen |
| 5a/5b | Import der iOS-Sicherung: JSON, CSV v18, ältere CSV v1–v17, einfache Workout-CSV | offen: mit deinen echten Dateien |
| 6 | Einwilligung, Export JSON/CSV, Konto löschen, Gerätedaten löschen, privater Betrieb | Löschtest live 2/2 |
| 7 | Kompletter Durchlauf als Test, Geheimnis-Scan, Einrichtung/Betrieb, Abweichungsliste | Geräte-Checkliste offen (`docs/ABNAHME.md`) |

Was anders ist als in der iOS-App oder noch fehlt: `docs/PARITAET.md`, Abschnitt „Abweichungen“.

## Einrichtung von Null
Für den Fall, dass alles neu aufgesetzt werden muss (neuer Rechner, neues Supabase-Projekt). Reihenfolge:

1. **Rechner:** Node.js 26 (`.node-version`), dann im Repo `npm install`. Für Browser-Tests einmalig `npx playwright install chromium webkit`.
2. **Supabase** (Frankfurt, Free): Projekt anlegen, alle Dateien aus `supabase/migrations/` der Reihe nach im SQL Editor einspielen, Gmail-SMTP, 6-stelliger Code, Adressen, Google-Login, Registrierung schließen. Schritt für Schritt: `docs/SUPABASE.md`, Schritte 1–7 und 12.
3. **Lokale Werte:** `.env.example` nach `.env.local` kopieren und `VITE_SUPABASE_URL` sowie `VITE_SUPABASE_PUBLISHABLE_KEY` eintragen. Für die Live-Tests zusätzlich `.env.test.local` mit dem Secret Key. Beide Dateien kommen nie ins Repo (`.gitignore`).
4. **Cloudflare Pages:** Repo verbinden, Build `npm run build`, Ausgabe `dist`, `NODE_VERSION=26` und die beiden `VITE_…`-Werte: `docs/DEPLOYMENT.md` und `docs/SUPABASE.md`, Schritt 8.
5. **GitHub-Secrets** `SUPABASE_URL` und `SUPABASE_PUBLISHABLE_KEY` für das tägliche Wachhalten: `docs/SUPABASE.md`, Schritt 9.
6. **Prüfen:** `npm run test:rls-live` und `npm run test:delete-live` (legen kurz Test-Konten an und löschen sie wieder), dann die Geräte-Checkliste in `docs/ABNAHME.md`.

Ohne Schritt 2–4 läuft Motion rein lokal ohne Konto-Bereich.

## Betrieb
| Aufgabe | Wie | Doku |
|---|---|---|
| Neue Version ausliefern | Push auf `main`. Cloudflare baut neu, CI prüft Typen, Unit-, Browser-Tests und die Historie auf Geheimnisse. Installierte Apps holen das Update beim nächsten Öffnen | `docs/DEPLOYMENT.md` |
| Datenbank ändern | neue Datei in `supabase/migrations/`, im SQL Editor einspielen, **bevor** der Code dazu live geht | `docs/SUPABASE.md`, Schritt 2 |
| Freund einladen / entfernen | Konto im Supabase-Dashboard anlegen; entfernen per SQL oder er löscht selbst in der App | `docs/DATENSCHUTZ.md`, Abschnitt 5 |
| Backup der Cloud | monatlich `pg_dump`, verschlüsselt ablegen, nie ins Repo | `docs/BETRIEB.md` |
| Supabase wach halten | läuft täglich per GitHub Action; ab und zu prüfen, ob der letzte Lauf grün ist | `docs/BETRIEB.md` |
| Anmeldung geht nicht | Projekt pausiert? Gmail-Limit oder App-Passwort widerrufen? | `docs/BETRIEB.md` |
| Live-Version testen | `E2E_BASE_URL=https://motion-web.pages.dev/ npm run test:e2e` | `docs/DEPLOYMENT.md` |
| Vor einer Veröffentlichung | AVV mit Supabase, Mailanbieter mit AVV statt Gmail, Impressum und Datenschutzerklärung aus Commit `22223c3`, Commit-Adresse anonymisieren | `docs/DATENSCHUTZ.md`, Abschnitt 5; `docs/ABNAHME.md`, Abschnitt 2 |

## Entwickeln
Voraussetzung: Node.js 26 (siehe `.node-version`).

```bash
npm install
npm run dev
```

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver |
| `npm run build` | Typprüfung und Produktions-Build nach `dist/` |
| `npm run preview` | Build lokal ansehen (inkl. Offline-Funktion) |
| `npm test` | Unit-Tests (Vitest) |
| `npm run test:rls-live` | Zwei-Konten-Test gegen dein Supabase-Projekt (braucht `.env.test.local`, siehe `docs/SUPABASE.md`) |
| `npm run test:delete-live` | Löschtest gegen dein Supabase-Projekt (ebenso) |
| `npm run test:e2e` | Browser-Tests (Playwright: Chrome mobil/Desktop, WebKit iPhone). Einmalig vorher: `npx playwright install chromium webkit` |
| `node scripts/missing-translations.mjs` | Zeigt Texte ohne deutsche Übersetzung |
| `npm run icons` | App-Icons aus `design/app-icon-1024.png` neu erzeugen (macOS) |

## Aufbau
| Ordner | Inhalt |
|---|---|
| `src/app` | App-Rahmen, Navigation, Routen, Wegwerf-Datenbanken für Demo und Einführungstest (`sandbox.ts`) |
| `src/data` | Lokale Datenbank (Dexie), Datentypen, Schreib-Helfer mit Sync-Warteschlange |
| `src/domain` | Reine Fachlogik aus der iOS-App (Einheiten, Ziele, Trainingsplan, Timer, Sätze, Katalog) |
| `src/store` | Lesen und Schreiben je Bereich (Profil, Routinen, Plan, Verlauf) |
| `src/features` | Bildschirme je Bereich (u. a. `progress`, `body`, `cardio`, `onboarding`, `demo`) |
| `src/ui` | Design-System (Farben, Komponenten) |
| `src/i18n` | Englisch/Deutsch |
| `src/sync` | Supabase-Verbindung, Konto und lokale Datenbank pro Konto, Sync-Engine, Konflikte |
| `src/import` | Import der iOS-Sicherung: CSV-Decoder, Prüfung, Übernahme (Oberfläche in `src/features/import`) |
| `src/platform` | Gerätefunktionen hinter eigenen Schnittstellen (für Capacitor später) |
| `src/pwa` | Installationshinweis, Updates |
| `docs` | Analyse, Entscheidungen, Deployment, Plattformgrenzen |
| `supabase/migrations` | Datenbank-Schema als versionierte Migrationen |
| `supabase/tests` | Zwei-Konten-Test (RLS) gegen eingebettetes Postgres und gegen das echte Projekt |

## Dokumente
- `docs/FUNKTIONEN.md`: alle Funktionen der alten App
- `docs/PARITAET.md`: Status jeder Funktion
- `docs/DATENMODELL.md`: Datenmodell alt/neu
- `docs/DESIGN.md`: Design-Werte
- `docs/IMPORT.md`: Import der alten Daten
- `docs/ENTSCHEIDUNGEN.md`: getroffene Entscheidungen
- `docs/DEPLOYMENT.md`: Cloudflare Pages und Installation auf dem Handy
- `docs/PLATTFORM.md`: was im Web auf iPhone und Android geht und was nicht
- `docs/SUPABASE.md`: Cloud einrichten (Supabase, Google, E-Mail-Code)
- `docs/BETRIEB.md`: Wachhalten, Backups, regelmäßige Prüfungen
- `docs/DATENSCHUTZ.md`: Einwilligung, Löschen, Export, privater Betrieb, Freunde einladen
- `docs/ABNAHME.md`: was automatisch geprüft wird und die Geräte-Checkliste
- `docs/IDEEN.md`: nicht beauftragte Ideen
