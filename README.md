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

- **Phase 5a (gebaut, Abnahme mit deinem echten Export offen):** Import der Sicherung aus der iOS-App als JSON („Export Backup“) oder CSV v18 („Export CSV“) unter Einstellungen → Sicherung und in der Einführung („Restore backup“). Prüfung nach den Regeln der alten App mit Fehlerbericht, Vorschau mit Anzahlen und den letzten Trainings, Schutz vor doppeltem Import, Abschlussbericht. Neue Cloud-Tabelle `legacy_imports`: Migration `supabase/migrations/20261102180000_legacy_imports.sql` muss einmal im SQL Editor eingespielt werden (`docs/SUPABASE.md`, Schritt 2). Details: `docs/IMPORT.md`, Abschnitt 6.
- **Phase 5b (gebaut am 03.11.2026, Abnahme offen):** Derselbe Import liest jetzt auch ältere Motion-CSV-Dateien (`motion_backup_v1` bis `v17`) und die einfache Workout-CSV. Sie werden in die vollständige Sicherung umgewandelt und laufen dann durch dieselbe Prüfung, Vorschau und Übernahme. Fehler werden mit Zeilennummer gemeldet. Details: `docs/IMPORT.md`, Abschnitt 7.
- **Phase 4 (gebaut und eingerichtet, Abnahme auf Geräten offen):** Konto mit Google-Login oder 6-stelligem E-Mail-Code, Datenbank-Schema mit Row Level Security, Sync zwischen Geräten mit Warteschlange, „letzte Änderung gewinnt“ und Schutz offener Trainings, getrennte lokale Daten pro Konto, Sync-Status, tägliches Wachhalten von Supabase. Einrichtung: `docs/SUPABASE.md`.

## Nächste Phasen (Plan, Stand 02.11.2026)
Gearbeitet wird Phase für Phase; nach jeder Phase wartet die Arbeit auf dein OK.

- **Vor Phase 5:** Abnahme von Phase 4 auf echten Geräten (macht Mathis selbst): beide Login-Wege in iPhone-Safari und in der installierten App, Änderung erscheint auf einem zweiten Gerät, offline Eingetragenes kommt später ohne Duplikate an.
- **Phase 5a: Import der aktuellen Exporte.** JSON-Backup und CSV v18 der alten App (`Export Backup` / `Export CSV`), Prüfung nach den Regeln der alten App, Vorschau mit Anzahlen und Stichproben, Fehlerbericht, Schutz vor doppeltem Import (Fingerabdruck in `legacy_imports`, neue Migration und Gerätedatenbank Version 3), Abschlussbericht. Health-/Strava-Workouts werden übersprungen und gezählt, Entwürfe mitgenommen. Abnahme: Zahlen und Stichproben stimmen mit deinem echten Export überein. Details: `docs/IMPORT.md`, Abschnitt 4.
- **Phase 5b (gebaut am 03.11.2026):** eingebauter Import der älteren Formate v1–v17 und der einfachen Workout-CSV. Die alte CSV-Datei von Mathis geht damit direkt durch den Import, eine Umwandlung außerhalb der App ist nicht mehr nötig. Abnahme: Mathis importiert seine alte Datei, Zahlen und Stichproben passen zur alten App.
- **Phase 6: Datenschutz und Konto.** Einwilligung beim ersten Start, Datenschutzerklärung und Impressum als markierte Entwürfe mit Platzhaltern, Export als JSON und CSV, Konto löschen (Cloud und Gerät) über eine serverseitige Funktion, Hinweis zum Vertrag zur Auftragsverarbeitung mit Supabase. Abnahme: nach dem Löschen nachweislich keine Daten des Kontos mehr in den Tabellen.
- **Phase 7: Abschluss.** Kompletter Durchlauf (neues Konto, Installation, Offline-Training, Sync, zweites Gerät, Export, Konto löschen), Prüfung auf iPhone, Android und Desktop, Repo-Historie auf Geheimnisse prüfen, README für Einrichtung und Betrieb, ehrliche Liste aller Abweichungen in `docs/PARITAET.md`.

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
- `docs/IDEEN.md`: nicht beauftragte Ideen
