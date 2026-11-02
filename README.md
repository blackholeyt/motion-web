# Motion Web

Neuaufbau des Motion-Workout-Trackers als installierbare Web-App (PWA).

- Läuft auf iPhone, Android, Tablet und Desktop, ohne Apple-Developer-Account
- Local-first: Alle Daten werden zuerst auf dem Gerät gespeichert und funktionieren offline
- Später optional per Capacitor als native App im App Store

## Stand
- **Phase 0 (fertig):** Analyse der alten iOS-App, siehe `docs/`.
- **Live:** https://motion-web.pages.dev
- **Phase 1 (fertig):** Grundgerüst mit Design-System, Navigation, Startanimation, Einstellungen für Darstellung und Sprache, PWA mit Offline-Start, Tests und CI.
- **Phase 2 (fertig):** Lokaler Kern ohne Konto: Routinen, Übungskatalog, Starter-Vorlagen, Trainingsplan, Training aufzeichnen mit Pausen-Timer, Supersätzen und Rückgängig, offene Trainings, Training nachtragen und Verlauf. Alles wird sofort auf dem Gerät gespeichert (IndexedDB).
- **Phase 3 (fertig):** Rekorde mit Hinweis im Training, XP, Level und Ränge, Feier-Bildschirme, Level-Karte, Kalenderwochen und Gewichtsrekorde auf der Übersicht, Übungsbibliothek mit Bearbeiten und Verlaufsverknüpfungen, Rekordziele, Ausdauer (Cardio) mit Plan-Abgleich, Profil mit drei Einheiten, Körpergewicht mit Tages-XP und Zielfeier, Apple-Schlafindex (manuell), Quiet Mode, Einführung mit Mini-Demo und Lerntipps, Demo-Modus und Einführungstest in eigener Wegwerf-Datenbank, Export der Sicherung als JSON.

- **Phase 4 (gebaut, Einrichtung offen):** Konto mit Google-Login oder 6-stelligem E-Mail-Code, Datenbank-Schema mit Row Level Security, Sync zwischen Geräten mit Warteschlange, „letzte Änderung gewinnt“ und Schutz offener Trainings, getrennte lokale Daten pro Konto, Sync-Status, tägliches Wachhalten von Supabase. Einrichtung: `docs/SUPABASE.md`.

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
- `docs/IDEEN.md`: nicht beauftragte Ideen
