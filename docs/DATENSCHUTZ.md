# Datenschutz und Konto (Phase 6)

Stand: 03.11.2026. Das ist keine Rechtsberatung. Die Texte und Hinweise beschreiben, was die App technisch tut, und markieren, was vor einer Veröffentlichung noch geprüft oder ergänzt werden muss.

## 1. Überblick
| Baustein | Wo | Code |
|---|---|---|
| Einwilligung beim ersten Start | Vor der Einführung, vor allem anderen | `src/features/privacy/ConsentScreen.tsx`, `src/privacy/consent.ts` |
| Einwilligung zur Cloud | Im Anmeldefenster, Pflicht vor Google oder E-Mail-Code | `src/features/account/SignInSheet.tsx` |
| Datenschutzerklärung, Impressum | Aus der Einwilligung und unter Einstellungen → Hilfe & Datenschutz | `src/privacy/legal.ts`, `src/features/privacy/LegalSheet.tsx` |
| Export JSON und CSV | Einstellungen → Sicherung, und im Löschen-Fenster | `src/store/backup.ts`, `src/store/csvExport.ts` |
| Konto löschen | Einstellungen → Konto → „Konto löschen“ | `src/sync/account.ts` (`deleteAccount`), Migration `20261103120000_delete_account.sql` |
| Daten auf diesem Gerät löschen | Einstellungen → Konto (ohne Anmeldung) | `src/sync/account.ts` (`deleteDeviceData`) |

## 2. Einwilligung
**Erster Start:** Ein Bildschirm erklärt in vier Punkten, was wo gespeichert wird, verlinkt Datenschutzerklärung und Impressum und verlangt zwei Häkchen:
1. Datenschutzerklärung gelesen, ausdrückliche Einwilligung in die Verarbeitung von Trainings- und Gesundheitsdaten (Körpergewicht, Schlafindex) auf dem Gerät (Art. 9 Abs. 2 lit. a DSGVO).
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

**Nicht automatisch gelöscht:** eigene Datenbank-Sicherungen (`supabase db dump`, siehe `BETRIEB.md`) und Dateien, die du exportiert hast. Für Dumps eine Aufbewahrungsfrist festlegen (Platzhalter in der Datenschutzerklärung, Abschnitt 8).

**Hinweis zu Supabase:** Supabase dokumentiert offiziell das Löschen über die Admin-API mit dem Secret Key. Das Löschen per SQL-Funktion aus `auth.users` ist ein verbreitetes Muster, aber nicht offiziell beschrieben. Deshalb prüft der Live-Test (Abschnitt 6) genau diesen Weg gegen dein Projekt. Schlägt er fehl, ist der Ausweg eine Edge Function mit dem Secret Key.

## 4. Export
- **JSON** (`Motion-Backup-JJJJ-MM-TT.json`): vollständige Kopie aller 13 Tabellen inklusive gelöschter Einträge (Grabsteine). Das ist die Kopie für Art. 15 und Art. 20 DSGVO.
- **CSV** (`Motion-Export-JJJJ-MM-TT.csv`): Tabelle zum Auswerten in Numbers, Excel oder Google Sheets. Eine Zeile je abgeschlossenem Training, Satz, Ausdauer-Einheit, Körpergewicht und Schlafindex; erste Spalte `type` zum Filtern. Einheiten immer kg, km, Sekunden; Datum und Uhrzeit in der Zeit des Geräts. Offene Trainings, Routinen, Pläne und das Profil stehen nur im JSON. UTF-8 mit BOM, Komma als Trenner, Texte, die mit `= + - @` beginnen, bekommen ein `'` vorangestellt (Schutz vor Formeln).

Spalten: `type, date, time, workout, exercise, set, set_type, weight_kg, reps, duration_seconds, distance_km, pace_s_per_km, value, completed, notes`. `value` ist bei `workout` die XP, bei `body_weight` die Kilogramm, bei `sleep_score` der Index.

## 5. Vor einer Veröffentlichung (Checkliste)
Die Texte sind Entwürfe. Jeder Platzhalter steht in eckigen Klammern und ist in der App gelb markiert; oben steht ein Entwurfshinweis, solange `legalDraft = true` in `src/privacy/legal.ts` steht. Der Test `legal.test.ts` schlägt fehl, wenn jemand `legalDraft` ausschaltet und noch Platzhalter übrig sind.

1. **Vertrag zur Auftragsverarbeitung (AVV/DPA) mit Supabase abschließen.** Supabase verarbeitet die Konto- und Gesundheitsdaten in deinem Auftrag, dafür ist ein Vertrag nach Art. 28 DSGVO nötig. Laut Supabase: im Dashboard auf der Seite **Legal Documents** der Organisation den DPA anfordern; die verbindliche Fassung kommt als PandaDoc-Dokument zum Unterschreiben. Eine PDF-Fassung zum Lesen gibt es unter https://supabase.com/legal/dpa. Datum und Firmenanschrift aus dem DPA in die Datenschutzerklärung (Abschnitt 5) übernehmen. Vorher die Anweisungen im PandaDoc-Dokument lesen (früher musste der unterschriebene DPA zusätzlich an privacy@supabase.com geschickt werden; ob das noch gilt, ist unklar).
2. **E-Mail-Versand:** Ein privates Gmail-Konto hat keinen AVV. Für eine Veröffentlichung auf einen Mailanbieter mit AVV wechseln (z. B. Google Workspace oder einen Versanddienst mit EU-Servern). Das widerspricht deiner Vorgabe, keine Postadresse anzugeben, weil fast alle solchen Anbieter eine verlangen. Für dich und Freunde im Testbetrieb ist das bewusst offen gelassen.
3. **Cloudflare:** Prüfen, dass der Self-Serve-DPA von Cloudflare greift, und die Speicherdauer der Zugriffsprotokolle eintragen.
4. **Impressum:** Name, ladungsfähige Anschrift und E-Mail sind Pflicht, sobald Motion öffentlich angeboten wird (§ 5 DDG). Wenn du deine Wohnadresse nicht veröffentlichen willst, gibt es kostenpflichtige Impressum-/Anschriftsdienste. Für ein rein privates Angebot im Freundeskreis ist ein Impressum je nach Einzelfall nicht nötig; das sollte jemand mit Rechtskenntnis bewerten.
5. **Minderjährigkeit:** Du bist 16. Als Betreiber und Verantwortlicher im Sinne der DSGVO solltest du die Veröffentlichung mit deinen Eltern absprechen; bei Verträgen (z. B. dem DPA) kann ihre Zustimmung nötig sein.
6. **Aufsichtsbehörde:** In NRW die Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW). Eintragen, sobald der Wohnsitz des Verantwortlichen feststeht.
7. Alle `[PRÜFEN]`-Stellen klären, Platzhalter ersetzen, `legalUpdated` setzen, `legalDraft = false`.

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
