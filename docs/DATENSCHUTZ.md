# Datenschutz und Konto (Phase 6)

Stand: 24.11.2026. Das ist keine Rechtsberatung. Die Texte beschreiben, was die App technisch tut. Seit 24.11.2026 ist die Registrierung offen (Abschnitt 5).

## 1. Überblick
| Baustein | Wo | Code |
|---|---|---|
| Einwilligung beim ersten Start | Vor der Einführung, vor allem anderen | `src/features/privacy/ConsentScreen.tsx`, `src/privacy/consent.ts` |
| Einwilligung zur Cloud | Im Anmeldefenster, Pflicht vor Google oder E-Mail-Code | `src/features/account/SignInSheet.tsx` |
| Datenschutzhinweis, „Über dieses Projekt“ | Aus der Einwilligung und unter Einstellungen → Hilfe & Datenschutz | `src/privacy/legal.ts`, `src/features/privacy/LegalSheet.tsx` |
| Export JSON und CSV | Einstellungen → Sicherung, und im Löschen-Fenster | `src/store/backup.ts`, `src/store/csvExport.ts` |
| Konto löschen | Einstellungen → Konto → „Konto löschen“ | `src/sync/account.ts` (`deleteAccount`), Migration `20261103120000_delete_account.sql` |
| Daten auf diesem Gerät löschen | Einstellungen → Konto (ohne Anmeldung) | `src/sync/account.ts` (`deleteDeviceData`) |

## 2. Einwilligung
**Erster Start:** Ein Bildschirm erklärt in vier Punkten, was wo gespeichert wird, verlinkt Datenschutzhinweis und „Über dieses Projekt“ und verlangt zwei Häkchen:
1. Datenschutzerklärung gelesen, ausdrückliche Einwilligung in die Verarbeitung von Trainings- und Gesundheitsdaten (Körpergewicht) auf dem Gerät (Art. 9 Abs. 2 lit. a DSGVO).
2. Mindestens 16 Jahre alt oder Eltern einverstanden (Art. 8 DSGVO, Altersgrenze in Deutschland 16).

Wer schon angemeldet ist (frühere Versionen), bestätigt zusätzlich die Cloud-Sicherung oder meldet sich ab und nutzt Motion ohne Konto.

**Anmelden:** Google und „Code senden“ bleiben gesperrt, bis die Cloud-Einwilligung angehakt ist.

**Gespeichert wird:** auf dem Gerät unter `localStorage["motion.consent.v1"]` (Version, Zeitpunkt, Zeitpunkt der Cloud-Einwilligung). Die Cloud-Einwilligung steht zusätzlich beim Login selbst in `auth.users.raw_user_meta_data.privacy_consent` und verschwindet mit dem Konto.

**Neue Fassung:** Bei einer wesentlichen Änderung der Datenschutzerklärung `consentVersion` in `src/privacy/consent.ts` erhöhen. Dann fragt Motion beim nächsten Start alle erneut.

**Widerruf:** so einfach wie die Erteilung: „Konto löschen“ bzw. „Daten auf diesem Gerät löschen“. Das Gerät-Löschen setzt auch die Einwilligung zurück, Motion beginnt dann mit dem Einwilligungsbildschirm.

## 3. Konto löschen
1. Das Fenster zählt auf, was gelöscht wird, bietet zuerst den Export (JSON, CSV) an und verlangt das Häkchen „Mir ist klar, dass sich das nicht rückgängig machen lässt“.
2. Die App braucht eine Verbindung und eine gültige Sitzung, hält den Sync an und ruft die Datenbankfunktion `delete_account()` auf.
3. `delete_account()` (security definer) nimmt immer das Konto des Aufrufers (`auth.uid()`), nie einen Parameter. Sie löscht in allen 13 Tabellen jede Zeile des Kontos endgültig (keine Grabsteine) und danach den Login in `auth.users` (Identitäten, Sitzungen und Refresh-Tokens hängen daran und gehen mit). Sie meldet die Zahl gelöschter Zeilen je Tabelle zurück.
4. Danach löscht die App die Konto-Datenbank `motion-<user id>` auf diesem Gerät und wechselt zu den Gastdaten. Die Gastdaten dieses Geräts gehören nicht zum Konto und bleiben.

**Andere Geräte desselben Kontos:** Ein Zugriffstoken gilt nach dem Löschen noch bis zu einer Stunde. Damit ein anderes Gerät in dieser Zeit keine Zeilen zurückbringt, nimmt die Schreibregel `motion_accept_write` nur noch Zeilen für Konten an, die in `auth.users` existieren. Das andere Gerät zeigt dann „Dieses Konto wurde auf einem anderen Gerät gelöscht“ und bietet „Seine Daten von diesem Gerät entfernen“ an. Spätestens wenn das Token abläuft, ist die Sitzung dort beendet; die lokale Kopie bleibt, bis man sich dort abmeldet und die Daten löscht oder die App entfernt. Das steht so in der Datenschutzerklärung.

**Nicht automatisch gelöscht:** eigene Datenbank-Sicherungen (`supabase db dump`, siehe `BETRIEB.md`) und Dateien, die du exportiert hast. Dumps nicht länger als nötig aufbewahren.

**Hinweis zu Supabase:** Supabase dokumentiert offiziell das Löschen über die Admin-API mit dem Secret Key. Das Löschen per SQL-Funktion aus `auth.users` ist ein verbreitetes Muster, aber nicht offiziell beschrieben. Deshalb prüft der Live-Test (Abschnitt 6) genau diesen Weg gegen dein Projekt. Schlägt er fehl, ist der Ausweg eine Edge Function mit dem Secret Key.

## 4. Export
- **JSON** (`Motion-Backup-JJJJ-MM-TT.json`): vollständige Kopie aller 13 Tabellen inklusive gelöschter Einträge (Grabsteine). Das ist die Kopie für Art. 15 und Art. 20 DSGVO.
- **CSV** (`Motion-Export-JJJJ-MM-TT.csv`): Tabelle zum Auswerten in Numbers, Excel oder Google Sheets. Eine Zeile je abgeschlossenem Training, Satz, Ausdauer-Einheit und Körpergewicht; erste Spalte `type` zum Filtern. Einheiten immer kg, km, Sekunden; Datum und Uhrzeit in der Zeit des Geräts. Offene Trainings, Routinen, Pläne und das Profil stehen nur im JSON. UTF-8 mit BOM, Komma als Trenner, Texte, die mit `= + - @` beginnen, bekommen ein `'` vorangestellt (Schutz vor Formeln).

Spalten: `type, date, time, workout, exercise, set, set_type, weight_kg, reps, duration_seconds, distance_km, pace_s_per_km, value, completed, notes`. `value` ist bei `workout` die XP, bei `body_weight` die Kilogramm.

## 5. Betrieb: offene Registrierung (Entscheidung vom 24.11.2026)
**Neu seit 24.11.2026:** Auf Wunsch von Mathis ist die Einladungspflicht weg. Wer die Adresse kennt, kann sich mit E-Mail-Code oder Google selbst ein Konto anlegen (`shouldCreateUser: true`, in Supabase „Allow new users to sign up“ an, Google-Projekt veröffentlicht statt Testmodus). Damit ist der Kreis nicht mehr geschlossen, und die Ausnahme unten trägt nicht mehr sicher. Die Punkte unter „Wenn Motion doch öffentlich wird“ gelten deshalb jetzt als offene Aufgaben, vor allem Impressum, AVV mit Supabase und ein Mailanbieter mit AVV statt Gmail.

Bisherige Begründung (03.11.2026): Motion lief für Mathis und ein, zwei Freunde, nicht öffentlich. Für einen rein privaten Kreis gilt die DSGVO nach Art. 2 Abs. 2 lit. c nicht („ausschließlich persönliche oder familiäre Tätigkeiten“), und eine Impressumspflicht nach § 5 DDG besteht nur für geschäftsmäßige Angebote. Diese Ausnahme trägt aber nur, solange der Kreis wirklich geschlossen ist. Deshalb:

- ~~**Registrierung geschlossen**~~ (bis 24.11.2026): In Supabase war „Allow new users to sign up“ aus, die App forderte keine neuen Konten an.
- ~~**Google-Login im Testmodus**~~ (bis 24.11.2026): nur eingetragene Test-Nutzer kamen durch.
- **Texte:** kurzer, ehrlicher Datenschutzhinweis und „Über dieses Projekt“ statt Impressum, ohne Namen und Anschrift. Kontakt: motion.web.support@gmail.com. Kein Entwurfshinweis mehr (`legalDraft = false`); ein Test stellt sicher, dass keine Anschrift in den Texten steht.

### Einen Freund einladen (nicht mehr nötig)
Seit der offenen Registrierung meldet sich ein Freund einfach selbst an. Der alte Weg funktioniert weiter:
1. Supabase → **Authentication → Users → Add user → Create new user**.
2. E-Mail-Adresse des Freundes eintragen, Passwort leer lassen bzw. ein zufälliges setzen, **Auto Confirm User** anhaken, erstellen. Es wird keine Mail verschickt.
3. Wenn er sich mit Google anmelden will: dieselbe Adresse in der Google Cloud Console unter **Google Auth Platform → Audience → Test users** eintragen.
4. Der Freund öffnet https://blackholeyt.github.io/motion-web/, gibt seine Adresse ein und bekommt den 6-stelligen Code.

**Einen Freund entfernen:** Am einfachsten löscht er sein Konto selbst in der App. Sonst im SQL Editor (E-Mail eintragen), das entfernt alle seine Zeilen und danach den Login:
```sql
do $$
declare
  account uuid := (select id from auth.users where email = 'freund@example.com');
  t text;
begin
  foreach t in array array['profiles', 'exercises', 'blueprints', 'blueprint_exercises', 'workouts', 'workout_exercises',
    'set_logs', 'training_plans', 'body_weights', 'weight_rewards', 'workout_awards', 'sleep_scores', 'legacy_imports'] loop  -- sleep_scores: Altbestand vor dem 03.11.2026
    execute format('delete from public.%I where user_id = $1', t) using account;
  end loop;
  delete from auth.users where id = account;
end;
$$;
```

### Wenn Motion doch öffentlich wird (App Store, Link öffentlich geteilt, größerer Kreis, Einnahmen)
Dann gilt die DSGVO voll, und ein Impressum ist nötig. Die ausführlichen Entwürfe dafür (Datenschutzerklärung mit Rechtsgrundlagen, Impressum nach § 5 DDG, Platzhalter) liegen in Commit `22223c3`, Datei `src/privacy/legal.ts`. Zusätzlich:

1. **Vertrag zur Auftragsverarbeitung (AVV/DPA) mit Supabase** abschließen: im Dashboard auf der Seite **Legal Documents** der Organisation anfordern, die verbindliche Fassung kommt als PandaDoc-Dokument. Lesefassung: https://supabase.com/legal/dpa. Vorher die Anweisungen im PandaDoc lesen (früher musste der DPA zusätzlich an privacy@supabase.com).
2. **E-Mail-Versand:** Ein privates Gmail-Konto hat keinen AVV; dann auf einen Mailanbieter mit AVV wechseln (verlangt meist eine Postadresse).
3. **GitHub Pages:** Datenschutzangaben von GitHub zu Pages prüfen (Zugriffsprotokolle mit IP-Adressen), ggf. eigene Domain.
4. **Impressum** mit Name und ladungsfähiger Anschrift (oder einem kostenpflichtigen Anschriftsdienst).
5. **Minderjährigkeit:** Veröffentlichung mit den Eltern absprechen; für Verträge wie den DPA kann ihre Zustimmung nötig sein.
6. **Aufsichtsbehörde** nennen (in NRW: LDI NRW), `consentVersion` erhöhen, Registrierung wieder öffnen.

## 6. Abnahme: nach dem Löschen keine Daten mehr
Automatisch in jeder CI-Runde, auf den echten Migrationen in einem eingebetteten Postgres:
- `supabase/tests/deleteAccount.test.ts`: Konto A hat in jeder der 13 Tabellen zwei Zeilen, Konto B eine. Nach `delete_account()` als A: 0 Zeilen von A in allen Tabellen, Login weg, B unverändert, Besucher ohne Login dürfen die Funktion nicht aufrufen, und ein Gerät von A mit noch gültigem Token kann in keine Tabelle mehr schreiben.
- `src/sync/sync.test.ts` („deleting the account“): zwei Geräte desselben Kontos synchronisieren, Konto wird gelöscht, das zweite Gerät kann seine Warteschlange nicht mehr hochladen.

Einmal gegen dein echtes Projekt (machst du selbst):
1. Migration `20261103120000_delete_account.sql` im SQL Editor einspielen (`SUPABASE.md`, Schritt 2).
2. `.env.test.local` wie für den Zwei-Konten-Test füllen.
3. `npm run test:delete-live`
4. Erwartet: 2 bestandene Tests. Der Test legt zwei Wegwerf-Konten an, füllt alle Tabellen, löscht das erste über `delete_account()` wie die App, zählt danach mit dem Secret Key in jeder Tabelle 0 Zeilen für dieses Konto, prüft, dass der Login weg ist und das zweite Konto alles behalten hat, und räumt am Ende auf.

**Ergebnis am 03.11.2026:** Migration im Projekt eingespielt (Funktionen vorhanden, Besitzer `postgres` darf aus `auth.users` löschen, kein bestehendes Konto blockiert). `npm run test:delete-live`: 2 von 2 bestanden, keine Testkonten übrig.
