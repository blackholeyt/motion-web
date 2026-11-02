# Deployment auf Cloudflare Pages

Die App ist eine rein statische Website: Der Ordner `dist/` aus `npm run build` ist alles, was ausgeliefert wird. Es gibt keinen Server.

## Geprüfte Bedingungen (offizielle Cloudflare-Doku, gelesen am 02.11.2026)
| Punkt | Free-Tarif |
|---|---|
| Builds | 500 pro Monat, 1 gleichzeitig, Abbruch nach 20 Minuten |
| Dateien | bis 20.000 pro Website, einzelne Datei bis 25 MiB |
| Eigene Domains | bis 100 pro Projekt |
| Bandbreite und Aufrufe für statische Dateien | kein Limit genannt, Aufrufe statischer Dateien sind kostenlos |
| Single-Page-App | ohne eigene `404.html` liefert Pages bei unbekannten Pfaden automatisch die Startseite aus |
| `_headers`-Datei | unterstützt (max. 100 Regeln). Motion nutzt sie, damit installierte Apps Updates sofort bekommen |

Quellen:
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/pages/configuration/serving-pages/
- https://developers.cloudflare.com/pages/configuration/headers/
- https://developers.cloudflare.com/pages/configuration/build-configuration/

**Abweichung vom Auftrag:** Cloudflare schreibt auf der Pages-Startseite inzwischen „Start new projects with Workers“. Pages wird aber weiter betrieben und ist nicht abgekündigt. Ich bleibe deshalb bei Pages, wie festgelegt. Weil Motion nur aus statischen Dateien besteht, ist ein späterer Umzug zu „Workers Static Assets“ mit wenig Aufwand möglich.

**Privates Repo:** Die Doku nennt keine Einschränkung für private Repos. In der GitHub-Verbindung kann man gezielt einzelne Repos freigeben. Dass das im Free-Tarif klappt, ist sehr wahrscheinlich, steht aber nicht ausdrücklich in der Doku. Das prüfen wir bei der Einrichtung.

## Schritt für Schritt (machst du selbst, einmalig)

1. **Konto anlegen:** Öffne https://dash.cloudflare.com/sign-up und registriere dich mit deiner E-Mail-Adresse. Wähle keinen kostenpflichtigen Tarif.
2. Im Dashboard links **„Workers & Pages“** öffnen, dann **„Create application“** wählen.
3. Den Reiter bzw. Link **„Pages“** wählen, dann **„Connect to Git“** / **„Import an existing Git repository“**.
   - Achtung: Cloudflare zeigt zuerst den Workers-Weg an. Für dieses Projekt brauchst du **Pages**.
4. **GitHub verbinden:** Bei der Frage nach dem Zugriff **„Only select repositories“** wählen und nur `blackholeyt/motion-web` freigeben.
5. Repo `motion-web` auswählen, dann **„Begin setup“**.
6. **Build-Einstellungen:**
   - Project name: `motion-web` (daraus wird die Adresse `https://motion-web.pages.dev`; ist der Name vergeben, hängt Cloudflare etwas an)
   - Production branch: `main`
   - Framework preset: **React (Vite)**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Unter „Environment variables“: Variable `NODE_VERSION`, Wert `26`
7. **„Save and Deploy“** klicken. Der erste Build dauert 1–3 Minuten.
8. Fertig. Die Live-Version läuft unter **https://motion-web.pages.dev** (eingerichtet am 02.11.2026).

Danach baut Cloudflare bei jedem Push auf `main` automatisch neu. Die GitHub-Action „CI“ prüft parallel Typen, Unit-Tests und Browser-Tests.

## Auf dem iPhone installieren
1. Die Adresse in **Safari** öffnen. Andere Browser zeigen einen Hinweis, dass sie die Installation nicht anbieten.
2. Unten auf **Teilen** tippen (Quadrat mit Pfeil nach oben).
3. **„Zum Home-Bildschirm“** wählen, dann **„Hinzufügen“**.
4. Motion einmal vom Home-Bildschirm öffnen und ein paar Sekunden warten, bis die App alles für den Offline-Betrieb gespeichert hat.
5. **Flugmodus-Test:** Flugmodus einschalten, Motion vollständig schließen (App-Umschalter, nach oben wischen), wieder öffnen. Die App startet ohne Netz.

## Auf Android installieren
Die Adresse in Chrome öffnen, im Menü (⋮) **„App installieren“** bzw. **„Zum Startbildschirm hinzufügen“** wählen.

## Lokal testen
```bash
npm run build
npx vite preview --port 4173
```

## Live-Version testen
```bash
E2E_BASE_URL=https://motion-web.pages.dev/ npm run test:e2e
```
