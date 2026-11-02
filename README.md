# Motion Web

Neuaufbau des Motion-Workout-Trackers als installierbare Web-App (PWA).

- Läuft auf iPhone, Android, Tablet und Desktop, ohne Apple-Developer-Account
- Local-first: Alle Daten werden zuerst auf dem Gerät gespeichert und funktionieren offline
- Später optional per Capacitor als native App im App Store

## Stand
- **Phase 0 (fertig):** Analyse der alten iOS-App, siehe `docs/`.
- **Phase 1 (fertig):** Grundgerüst mit Design-System, Navigation, Startanimation, Einstellungen für Darstellung und Sprache, PWA mit Offline-Start, Tests und CI. Die Trainingsfunktionen folgen ab Phase 2.

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
| `npm run test:e2e` | Browser-Tests (Playwright: Chrome mobil/Desktop, WebKit iPhone). Einmalig vorher: `npx playwright install chromium webkit` |
| `npm run icons` | App-Icons aus `design/app-icon-1024.png` neu erzeugen (macOS) |

## Aufbau
| Ordner | Inhalt |
|---|---|
| `src/app` | App-Rahmen, Navigation, Routen |
| `src/features` | Bildschirme und Fachlogik je Bereich |
| `src/ui` | Design-System (Farben, Komponenten) |
| `src/i18n` | Englisch/Deutsch |
| `src/platform` | Gerätefunktionen hinter eigenen Schnittstellen (für Capacitor später) |
| `src/pwa` | Installationshinweis, Updates |
| `docs` | Analyse, Entscheidungen, Deployment, Plattformgrenzen |

## Dokumente
- `docs/FUNKTIONEN.md`: alle Funktionen der alten App
- `docs/PARITAET.md`: Status jeder Funktion
- `docs/DATENMODELL.md`: Datenmodell alt/neu
- `docs/DESIGN.md`: Design-Werte
- `docs/IMPORT.md`: Import der alten Daten
- `docs/ENTSCHEIDUNGEN.md`: getroffene Entscheidungen
- `docs/DEPLOYMENT.md`: Cloudflare Pages und Installation auf dem Handy
- `docs/PLATTFORM.md`: was im Web auf iPhone und Android geht und was nicht
- `docs/IDEEN.md`: nicht beauftragte Ideen
