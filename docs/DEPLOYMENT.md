# Deployment auf GitHub Pages

Die App ist eine rein statische Website: Der Ordner `dist/` aus `npm run build` ist alles, was ausgeliefert wird. Es gibt keinen Server.

Live: **https://blackholeyt.github.io/motion-web/** (seit 24.11.2026; vorher Cloudflare Pages unter `motion-web.pages.dev`).

## Wie es läuft
- Jeder Push auf `main` startet die GitHub-Action **„Deploy to GitHub Pages“** (`.github/workflows/pages.yml`): `npm ci`, `npm run build` mit den Supabase-Werten, dann Veröffentlichung von `dist/`.
- Die Supabase-Werte kommen aus den Repository-Secrets `SUPABASE_URL` und `SUPABASE_PUBLISHABLE_KEY` (dieselben wie fürs Wachhalten, `SUPABASE.md`, Schritt 8). Fehlen sie, bricht der Build ab, statt eine App ohne Konto auszuliefern.
- Parallel prüft die Action **„CI“** Typen, Unit-Tests, Browser-Tests und die Historie auf Geheimnisse.
- Von Hand neu veröffentlichen: **Actions → Deploy to GitHub Pages → Run workflow**.

## Geprüfte Bedingungen (offizielle GitHub-Doku, gelesen am 24.11.2026)
| Punkt | GitHub Free |
|---|---|
| Repo | Pages gibt es im Free-Tarif nur für **öffentliche** Repos. Für ein privates Repo bräuchte es GitHub Pro |
| Größe | veröffentlichte Website bis 1 GB |
| Bandbreite | weiches Limit 100 GB pro Monat |
| Builds | das weiche Limit von 10 Builds pro Stunde gilt nicht für eigene Actions-Workflows wie diesen |
| Deployment | Abbruch nach 10 Minuten |

Quelle: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

## Unterschiede zu Cloudflare
- **Unterpfad:** Die App liegt unter `/motion-web/`. Das ist kein Problem, weil Vite mit relativem `base: './'` baut und Manifest, Service Worker und Icons relative Pfade nutzen.
- **Keine 404-Weiterleitung nötig:** Motion nutzt `HashRouter` (`#/…`). Es gibt keine Pfade, die der Server kennen müsste.
- **Keine `_headers`-Datei:** GitHub Pages kann keine eigenen Header setzen; die Cloudflare-Datei ist entfernt. Updates kommen trotzdem an: Browser prüfen den Service Worker bei jedem Start am Netz am HTTP-Cache vorbei, und GitHub liefert alle Dateien mit kurzer Cache-Dauer aus. Die Referrer-Policy steht jetzt als `<meta name="referrer">` in `index.html`. `Permissions-Policy` lässt sich ohne Header nicht setzen; Motion fragt ohnehin weder Kamera, Mikrofon noch Standort an.
- **Neue Adresse = neuer Speicher:** Der Browser behandelt `blackholeyt.github.io` als andere App als `motion-web.pages.dev`. Wer ein Konto hat, meldet sich neu an und bekommt seine Daten per Sync zurück. Daten ohne Konto vorher in der alten App exportieren (Einstellungen → Export, JSON) und in der neuen importieren. Die alte App vom Home-Bildschirm entfernen und die neue installieren.

## Einrichtung von Null (einmalig)
1. Repo **öffentlich** lassen (Settings → General → Danger Zone → Change visibility), sonst bietet GitHub Free kein Pages an.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Secrets `SUPABASE_URL` und `SUPABASE_PUBLISHABLE_KEY` anlegen (`SUPABASE.md`, Schritt 8).
4. **Actions → Deploy to GitHub Pages → Run workflow**. Nach 1–3 Minuten ist die Seite live.
5. In Supabase die Adresse freigeben (`SUPABASE.md`, Schritt 6).

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
E2E_BASE_URL=https://blackholeyt.github.io/motion-web/ npm run test:e2e
```
