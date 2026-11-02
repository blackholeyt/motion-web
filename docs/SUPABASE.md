# Cloud einrichten: Supabase, Google-Login, E-Mail-Code

Diese Schritte machst du selbst, einmalig. Du brauchst dafür etwa 45 Minuten. Ich lege keine Konten für dich an und wähle keine kostenpflichtigen Tarife.

Solange die Schritte nicht erledigt sind, läuft Motion wie bisher **ohne Konto**. Die Live-Version merkt erst nach Schritt 6, dass es eine Cloud gibt.

## Geprüfte Bedingungen (offizielle Dokumentation, gelesen am 02.11.2026)
| Punkt | Stand | Quelle |
|---|---|---|
| Pausieren | Kostenlose Projekte werden **nach 1 Woche ohne Aktivität pausiert**. Höchstens 2 aktive Gratis-Projekte. Was als Aktivität zählt, steht nicht in der Doku | https://supabase.com/pricing, https://supabase.com/docs/guides/platform/billing-on-supabase |
| Backups | Im Gratis-Tarif **keine automatischen Backups**. Supabase empfiehlt eigenen Export mit `supabase db dump` (siehe `BETRIEB.md`) | https://supabase.com/docs/guides/platform/backups |
| Region | Frankfurt heißt `Central EU (Frankfurt)`, technisch `eu-central-1` | https://supabase.com/docs/guides/platform/regions |
| E-Mail-Code | Code statt Link: In der Vorlage **„Magic Link“** `{{ .Token }}` statt des Links einsetzen. Code gilt standardmäßig 1 Stunde, neuer Code frühestens nach 60 Sekunden | https://supabase.com/docs/guides/auth/auth-email-passwordless |
| Code-Länge | Die Doku spricht von „six-digit code“, nennt aber keine Einstellung dafür. Die App akzeptiert 6 bis 10 Ziffern, falls Supabase etwas anderes schickt | ebd. |
| Mail-Limit | Mit dem eingebauten Mailversand nur 2 Mails pro Stunde, deshalb eigenes SMTP. Nach dem Speichern eines eigenen SMTP gilt zunächst **30 Mails pro Stunde** (in den Rate-Limits änderbar) | https://supabase.com/docs/guides/auth/auth-smtp, https://supabase.com/docs/guides/auth/rate-limits |
| Schlüssel | Neue Projekte haben einen **Publishable Key** (`sb_publishable_…`, darf ins Frontend) und einen **Secret Key** (`sb_secret_…`, nie ins Frontend). Die alten `anon`/`service_role`-Schlüssel werden laut Supabase bis Ende 2026 abgelöst; Motion nimmt deshalb den Publishable Key | https://supabase.com/docs/guides/api/api-keys |
| Google | OAuth-Client vom Typ „Web application“; bei „Authorized redirect URIs“ die Callback-Adresse aus dem Supabase-Dashboard eintragen | https://supabase.com/docs/guides/auth/social-login/auth-google |
| Brevo | **Nicht geprüft:** Die Preis- und Hilfeseiten von Brevo ließen sich nicht automatisch lesen. Laut meinem Wissensstand: Gratis-Tarif 300 Mails pro Tag, SMTP-Server `smtp-relay.brevo.com`, Port 587. **Bitte im Brevo-Dashboard bestätigen** (Schritt 4) | – |

**Abweichung vom Auftrag:** keine. Einziger Hinweis: Der Auftrag nennt „Brevo“ als Beispiel; dessen Bedingungen konnte ich nicht aus der offiziellen Doku bestätigen.

---

## 1. Supabase-Projekt in Frankfurt anlegen
1. https://supabase.com/dashboard öffnen und mit GitHub oder E-Mail registrieren. Tarif **Free** lassen.
2. **New project**:
   - Name: `motion-web`
   - Database Password: ein langes Passwort erzeugen lassen und **in deinem Passwort-Manager speichern** (brauchst du für Backups)
   - Region: **Central EU (Frankfurt)**
3. Warten, bis das Projekt bereit ist (1–2 Minuten).

## 2. Datenbank-Schema einspielen
1. Links **SQL Editor** → **New query**.
2. Den kompletten Inhalt von `supabase/migrations/20261102120000_initial_schema.sql` hineinkopieren und **Run** drücken.
3. Erwartet: „Success. No rows returned“.
4. Kontrolle: Links **Table Editor**. Es gibt 12 Tabellen (`profiles`, `workouts`, …). Jede zeigt „RLS enabled“.

Spätere Änderungen kommen als neue Dateien in `supabase/migrations/` und werden genauso eingespielt, immer in Reihenfolge des Dateinamens.

## 3. Schlüssel abholen
1. **Project Settings → API Keys**.
2. Notiere:
   - **Project URL** (`https://<ref>.supabase.co`, steht unter **Data API** bzw. oben auf der Seite)
   - **Publishable key** (`sb_publishable_…`)
   - **Secret key** (`sb_secret_…`): nur für den Zwei-Konten-Test auf deinem Mac (Schritt 7). Nirgends sonst eintragen.
3. Falls keine Publishable/Secret Keys angezeigt werden: **Create new API keys** klicken.

## 4. E-Mail-Versand über Brevo (SMTP)
1. https://www.brevo.com registrieren (Gratis-Tarif). **Bitte prüfe auf der Preisseite das Tageslimit des Gratis-Tarifs** und sag mir, falls es von 300 abweicht.
2. Absender bestätigen: **Senders, Domains & Dedicated IPs → Senders → Add a sender**. Am einfachsten deine eigene E-Mail-Adresse; Brevo schickt einen Bestätigungslink.
   - Hinweis: Mails von einer Gmail- oder GMX-Adresse über fremde Server landen öfter im Spam. Eine eigene Domain wäre besser, ist für dich und Freunde aber nicht nötig.
3. **SMTP & API → SMTP**: Dort stehen Server, Port und Login. **Generate a new SMTP key** und den Schlüssel kopieren.
4. In Supabase: **Authentication → Emails → SMTP Settings → Enable custom SMTP**:
   - Sender email: die bestätigte Absenderadresse
   - Sender name: `Motion`
   - Host / Port / Username: aus Brevo (laut meinem Stand `smtp-relay.brevo.com`, `587`)
   - Password: der SMTP-Schlüssel aus Brevo
5. Speichern.

## 5. Sechsstelligen Code statt Link einstellen
1. **Authentication → Emails → Templates → Magic Link**.
2. Betreff: `Dein Motion-Code`
3. Inhalt ersetzen durch:
   ```html
   <h2>Dein Code für Motion</h2>
   <p>Gib diesen Code in der App ein:</p>
   <p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
   <p>Der Code gilt eine Stunde. Wenn du dich nicht anmelden wolltest, ignoriere diese E-Mail.</p>
   ```
4. Dasselbe in der Vorlage **Confirm signup** eintragen (neue Konten bekommen sonst einen Link).
5. Speichern. Wichtig: In keiner der beiden Vorlagen darf `{{ .ConfirmationURL }}` stehen bleiben, sonst kommt wieder ein Link.

## 6. Adressen freigeben (URL Configuration)
**Authentication → URL Configuration**:
- Site URL: `https://motion-web.pages.dev`
- Redirect URLs, jeweils **Add URL**:
  - `https://motion-web.pages.dev/**`
  - `http://localhost:5173/**` (Entwicklung auf dem Mac)

## 7. Google-Login
1. https://console.cloud.google.com öffnen, oben **Projekt auswählen → Neues Projekt** `Motion`.
2. **Google Auth Platform → Branding**: App-Name `Motion`, Support-E-Mail deine Adresse. Unter **Audience** „External“ wählen. Solange die App im Modus „Testing“ ist, können sich nur Google-Konten anmelden, die du unter **Test users** einträgst (du und deine Freunde). Für mehr Nutzer später „Publish app“.
3. **Google Auth Platform → Clients → Create client**:
   - Application type: **Web application**
   - Authorized JavaScript origins: `https://motion-web.pages.dev` und `http://localhost:5173`
   - Authorized redirect URIs: die **Callback URL** aus Supabase. Du findest sie unter **Authentication → Sign In / Providers → Google**. Sie sieht so aus: `https://<ref>.supabase.co/auth/v1/callback`
4. **Create**, dann Client ID und Client Secret kopieren.
5. In Supabase **Authentication → Sign In / Providers → Google**: aktivieren, Client ID und Client Secret einfügen, speichern.

## 8. Cloudflare Pages: Werte für die App
1. Cloudflare-Dashboard → **Workers & Pages → motion-web → Settings → Variables and Secrets**.
2. Für **Production** (und, wenn du willst, Preview) zwei Variablen vom Typ **Text** anlegen:
   - `VITE_SUPABASE_URL` = Project URL aus Schritt 3
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = Publishable key aus Schritt 3
3. **Deployments → letzte Bereitstellung → Retry deployment**, damit neu gebaut wird. Die Werte werden beim Bauen in die App geschrieben.
4. Danach zeigt Motion unter Einstellungen den Bereich **Konto** mit „Anmelden“.

Lokal auf dem Mac: `.env.example` nach `.env.local` kopieren und die zwei `VITE_…`-Werte eintragen.

## 9. Tägliches Wachhalten (GitHub Action)
1. https://github.com/blackholeyt/motion-web → **Settings → Secrets and variables → Actions → New repository secret**:
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_PUBLISHABLE_KEY` = Publishable key
2. **Actions → Keep Supabase awake → Run workflow**, einmal von Hand starten. Erwartet: grüner Haken und im Log `Supabase answered: "ok"`.

Details und Grenzen: `BETRIEB.md`.

## 10. Zwei-Konten-Test gegen dein Projekt (Abnahme Phase 4)
Auf dem Mac im Ordner `motion-web`:
1. `.env.example` nach `.env.test.local` kopieren und die drei `SUPABASE_…`-Werte eintragen (hier auch den **Secret key**).
2. `npm run test:rls-live`
3. Erwartet: 13 bestandene Tests. Der Test legt zwei Wegwerf-Konten an (`motion-rls-…@example.com`, es werden keine Mails verschickt), prüft, dass Konto B die Daten von Konto A weder lesen noch ändern noch löschen kann, und löscht beide Konten wieder.

Danach kannst du `.env.test.local` löschen. Die Datei wird ohnehin nie committet.
