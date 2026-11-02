# Betrieb im kostenlosen Tarif

## Supabase wach halten
Kostenlose Supabase-Projekte werden nach **einer Woche ohne Aktivität pausiert** (https://supabase.com/pricing). Ein pausiertes Projekt verliert keine Daten, aber Login und Sync gehen erst wieder, wenn du es im Dashboard mit **Restore project** aufweckst. Motion selbst funktioniert in der Zeit weiter offline, und alle Änderungen warten auf dem Gerät.

Damit es möglichst nicht dazu kommt, ruft die GitHub Action `.github/workflows/keep-alive.yml` jeden Tag um 04:17 UTC die Datenbankfunktion `keep_alive()` auf. Sie liest keine Nutzerdaten und gibt nur `"ok"` zurück. Sie braucht die Repository-Secrets `SUPABASE_URL` und `SUPABASE_PUBLISHABLE_KEY` (Anleitung: `SUPABASE.md`, Schritt 9).

**Kann der Mechanismus selbst einschlafen?** Laut GitHub-Doku werden zeitgesteuerte Workflows automatisch deaktiviert, wenn **in einem öffentlichen Repository** 60 Tage lang nichts passiert (https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/disabling-and-enabling-a-workflow). `motion-web` ist **privat**; für private Repos nennt die Doku diese Regel nicht. Ganz ausschließen kann ich es nicht. Prüfe deshalb ab und zu unter **Actions → Keep Supabase awake**, ob der letzte Lauf grün ist. Ist der Workflow deaktiviert, dort **Enable workflow** klicken.

Weitere Grenzen:
- Supabase sagt nicht, was genau als Aktivität zählt. Ein Datenbankaufruf über die API ist die sicherste Wahl, die ohne Nutzerdaten möglich ist.
- GitHub kann zeitgesteuerte Läufe bei hoher Last verzögern oder ausfallen lassen. Einmal am Tag reicht bei einer Frist von 7 Tagen mit großem Puffer.
- Private Repos haben im Gratis-Tarif ein Kontingent an Action-Minuten. Der Aufruf dauert wenige Sekunden pro Tag.

## Backups
Im Gratis-Tarif macht Supabase **keine automatischen Backups** (https://supabase.com/docs/guides/platform/backups). Es gibt drei Ebenen:

1. **Jedes Gerät hat eine vollständige Kopie** der Daten seines Kontos (IndexedDB). Fällt die Cloud aus, ist auf den Geräten nichts verloren.
2. **Export in der App:** Einstellungen → Sicherung → „Sicherung exportieren (JSON)“. Das kann jeder Nutzer selbst.
3. **Backup der ganzen Datenbank (machst du als Betreiber):**

### Backup erstellen (Mac, einmal im Monat empfohlen)
Voraussetzung: das Datenbank-Passwort aus `SUPABASE.md`, Schritt 1, und einmalig `brew install libpq` (bringt `pg_dump` und `psql` mit; danach den Hinweis von Homebrew zum `PATH` befolgen).

1. Im Supabase-Dashboard oben auf **Connect** klicken und unter **Session pooler** die Verbindungsadresse kopieren. Sie sieht etwa so aus: `postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`. `[YOUR-PASSWORD]` durch das Datenbank-Passwort ersetzen.
2. Im Terminal:
   ```bash
   pg_dump "VERBINDUNGSADRESSE" --data-only --table=auth.users --table=auth.identities -f backup-$(date +%F)-konten.sql
   pg_dump "VERBINDUNGSADRESSE" --data-only --schema=public -f backup-$(date +%F)-daten.sql
   ```
   Die erste Datei enthält die Konten (E-Mail-Adressen, Google-Verknüpfungen), die zweite alle Trainingsdaten.
3. Die Dateien **nicht ins Repo** legen (sie enthalten alle Nutzerdaten), sondern verschlüsselt sichern, zum Beispiel in einem verschlüsselten Ordner oder als Passwort-Manager-Anhang.

Supabase empfiehlt für Gratis-Projekte alternativ `supabase db dump` aus der Supabase-CLI; die braucht aber Docker, deshalb hier `pg_dump`. Ich habe die Befehle noch nicht gegen dein Projekt ausgeführt, weil es noch nicht existiert. Beim ersten Mal machen wir das zusammen.

### Backup wiederherstellen
Nur nötig, wenn Daten in der Cloud verloren gegangen sind.
1. Neues oder leeres Projekt: zuerst die Migrationen aus `supabase/migrations/` einspielen (`SUPABASE.md`, Schritt 2).
2. Konten, dann Daten zurückspielen:
   ```bash
   psql "VERBINDUNGSADRESSE" -f backup-JJJJ-MM-TT-konten.sql
   psql "VERBINDUNGSADRESSE" -f backup-JJJJ-MM-TT-daten.sql
   ```
3. Geräte gleichen sich danach selbst ab: Was auf einem Gerät neuer ist, wird hochgeladen; was in der Cloud neuer ist, wird geladen.

Im Zweifel frag mich vorher. Ein Wiederherstellen in ein Projekt mit vorhandenen Daten bricht mit Fehlern wegen doppelter Schlüssel ab.

## Was regelmäßig zu prüfen ist
| Wann | Was |
|---|---|
| monatlich | Backup erstellen; Lauf „Keep Supabase awake“ grün? |
| bei Fehlermeldungen beim Anmelden | Supabase-Projekt pausiert? Gmail-Tageslimit erreicht oder App-Passwort widerrufen? |
| bis Ende 2026 | Supabase löst die alten `anon`-Schlüssel ab. Motion nutzt schon den Publishable Key; nichts zu tun |
