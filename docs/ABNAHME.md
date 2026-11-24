# Abnahme (Phase 7)

Was automatisch geprüft wird, was ich geprüft habe und was nur auf echten Geräten geht.

## 1. Automatisch (bei jedem Push in CI)
| Prüfung | Wo | Was sie abdeckt |
|---|---|---|
| Kompletter Durchlauf | `src/sync/sync.test.ts`, „complete run-through (phase 7)“ | Gast trainiert → neues Konto übernimmt die Gastdaten → ganzes Training ohne Netz (bleibt in der Warteschlange) → wieder online, genau einmal hochgeladen → zweites Gerät bekommt alles und schickt eigene Änderungen zurück → Export JSON und CSV auf dem zweiten Gerät → Konto löschen: keine Zeile und kein Login mehr, das zweite Gerät kann nichts zurückschreiben → Gerätedatenbanken weg. Läuft gegen die echten Migrationen mit RLS in einem eingebetteten Postgres. |
| Installation und Offline-Start | `tests/e2e/app.spec.ts` | Manifest, Service Worker, Start ohne Netz nach dem ersten Besuch |
| Training offline, Neustart mitten im Training | `tests/e2e/workout.spec.ts` | ganzes Training im Flugmodus, Seite schließen und wieder öffnen, nichts verloren |
| Import, Einwilligung, Export, Gerätedaten löschen | `tests/e2e/import.spec.ts`, `tests/e2e/privacy.spec.ts` | Abläufe im Browser |
| Geräteprofile | `playwright.config.ts` | jeder Browser-Test läuft als Android-Handy (Chrome, Pixel 7), Desktop-Chrome und iPhone (WebKit, iPhone 15) |
| Geheimnisse | CI-Job „Secret scan“ (gitleaks) | ganze Repo-Historie bei jedem Push |

WebKit in Playwright ist nicht Safari auf dem iPhone. Es fängt Layout- und Speicherfehler ab, aber nicht das Verhalten der installierten App (Hintergrund, Home-Bildschirm, Google-Anmeldung im eingebetteten Browser).

## 2. Von mir geprüft am 03.11.2026
- **Repo-Historie auf Geheimnisse:** `gitleaks git` über alle 49 Commits: keine Funde. Zusätzlich von Hand gesucht nach `sb_secret_`, Publishable Keys, JWTs (`eyJ…`), Google-Client-Secrets (`GOCSPX`), privaten Schlüsseln, Passwörtern und `.env`-Dateien: nur Platzhalter in `.env.example` und der Doku. `.env.local` und `.env.test.local` waren nie im Repo. Die Supabase-Projekt-ID steht nirgends im Repo.
- **Persönliche Angaben im Repo:** Vorname „Mathis“ in Doku und Testdaten, die Projekt-Adresse `motion.web.support@gmail.com` im Datenschutzhinweis, und deine GMX-Adresse als Autor jedes Commits (Git-Metadaten). Kein Geheimnis, aber sichtbar für jeden mit Lesezugriff. Solange das Repo privat ist, unkritisch. Vor einem öffentlichen Repo: Commit-Adresse auf die GitHub-`noreply`-Adresse umstellen (`git config user.email`), die Historie müsste dafür neu geschrieben werden.
- **Typprüfung, Unit-Tests, Browser-Tests:** lokal grün (196 Unit-Tests, 33 Browser-Tests in drei Geräteprofilen). Die Browser-Tests zusätzlich gegen die damalige Live-Version auf Cloudflare: grün. Seit 24.11.2026 läuft Motion auf GitHub Pages; gegen die neue Adresse mit `E2E_BASE_URL=https://blackholeyt.github.io/motion-web/ npm run test:e2e` prüfen.

## 3. Machst du auf echten Geräten (ca. 30 Minuten)
Ich lege auf deinem echten Supabase-Projekt keine Konten an. Für den Durchlauf brauchst du ein Test-Konto: Supabase → Authentication → Users → **Add user** mit einer zweiten Adresse von dir (`DATENSCHUTZ.md`, Abschnitt 5). Am Ende löschst du es in der App, das ist gleich der Löschtest.

Abhaken in dieser Reihenfolge:

**iPhone (Safari, dann installiert)**
- [ ] https://blackholeyt.github.io/motion-web/ in Safari öffnen, Einwilligung, Einführung durchklicken
- [ ] Teilen → Zum Home-Bildschirm, App vom Home-Bildschirm öffnen, ein paar Sekunden warten
- [ ] Einstellungen → Konto → mit dem Test-Konto per E-Mail-Code anmelden („Ins Konto übernehmen“ wählen, falls gefragt)
- [ ] Flugmodus an, App ganz schließen und wieder öffnen: startet
- [ ] Im Flugmodus ein Training mit zwei Sätzen abschließen; Sync-Status zeigt wartende Änderungen
- [ ] Flugmodus aus, App öffnen: Sync-Status „aktuell“
- [ ] Einmal mit Google anmelden (vorher abmelden): kommt in die installierte App zurück

**Android (Chrome)**
- [ ] Adresse öffnen, ⋮ → App installieren, mit demselben Test-Konto anmelden
- [ ] Das Training vom iPhone ist da, nur einmal
- [ ] Körpergewicht eintragen; erscheint nach dem Öffnen auf dem iPhone

**Desktop (Chrome oder Safari)**
- [ ] Anmelden, Verlauf zeigt beide Einträge; Fenster schmal ziehen und breit: Tab-Leiste bzw. Seitenleiste
- [ ] Einstellungen → Sicherung: JSON und CSV exportieren, Dateien öffnen sich, das Training steht drin
- [ ] Optional ohne Konto in einem privaten Fenster: Einwilligung, dann „Sicherung importieren oder wiederherstellen“ mit der JSON-Datei. Vorschau zeigt das Training als neu, danach ist es im Verlauf

**Löschen**
- [ ] Am Desktop Einstellungen → Konto → Konto löschen
- [ ] Supabase → Authentication → Users: Test-Konto ist weg. Optional im SQL Editor `select count(*) from public.workouts where user_id = '<ID>'` → 0
- [ ] Auf Android etwas eintragen (z. B. Körpergewicht): Einstellungen → Konto zeigt, dass das Konto gelöscht ist, lokale Kopie entfernen. Ohne neue Änderung merkt ein Gerät das Löschen erst, wenn es seine Anmeldung erneuern will (Supabase-Standard: nach einer Stunde). Was es dann zeigt, habe ich nicht gegen das echte Projekt geprüft; bitte notieren
- [ ] iPhone genauso

Wenn etwas hakt: Gerät, Schritt und was du gesehen hast an mich, gern mit Screenshot.

Zusätzlich offen aus früheren Phasen: Import deines echten Exports (Phase 5a) und deiner alten CSV-Datei (Phase 5b), siehe `IMPORT.md`.
