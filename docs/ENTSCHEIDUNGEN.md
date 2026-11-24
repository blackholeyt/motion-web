# Entscheidungen

## Phase 0 (bestätigt am 02.11.2026: „Vorschläge übernehmen“)

| Nr | Frage | Entscheidung |
|---|---|---|
| 1 | Importweg | **Der CSV-Import aus der alten App muss auf jeden Fall funktionieren** (Vorgabe vom 02.11.2026). Unterstützt werden alle CSV-Formate der alten App: v18 (aktueller „Export CSV“), die älteren Motion-Backups v1–v17 und die einfache Workout-CSV. Das JSON-Backup wird zusätzlich unterstützt. |
| 2 | Früher importierte Apple-Health- und Strava-Workouts | Werden vorerst weggelassen. Der Import überspringt sie und nennt ihre Anzahl im Bericht. Die Originaldatei bleibt bei dir, ein späterer Import mit der nativen App ist also möglich. |
| 3 | Offene Entwürfe beim Import | Werden mitgenommen. |
| 4 | Daten vor dem ersten Login | Werden nach einer Rückfrage beim ersten Login ins Konto übernommen. |
| 5 | Gratis-Limit von 3 Blueprints | Version 1 hat kein Limit. Käufe kommen mit der nativen App. |
| 6 | Krone (PR-Tracking) | Wie in der alten App: wird nur über ein Lastziel eingeschaltet. Bestätigt am 02.11.2026. |
| 7 | Schrift | Systemschrift-Stack (`system-ui`, gerundete Ziffern über `ui-rounded`). Es wird keine Schrift geladen. |
| 8 | Sprache | Englisch und Deutsch, Umschalter in den Einstellungen, Standard nach Gerätesprache. |

## Phase 3 (umgesetzt am 02.11.2026, Abnahme offen)

| Nr | Punkt | Umsetzung |
|---|---|---|
| 1 | XP für Trainings aus Phase 2 | Keine nachträglichen XP, wie in der iOS-App („XP nur für neu abgeschlossene Trainings“). |
| 2 | Einführungstext „No registration …“ | Ehrlich umformuliert: „Keine Registrierung nötig. Dein Training wird zuerst auf diesem Gerät gespeichert; ein optionales Konto zur Sicherung folgt später.“ |
| 3 | „Restore backup“ in der Einführung | Zeigt vorerst einen Hinweis, dass der Import mit Phase 5 kommt. |
| 4 | Einführung und Tipps | Gerätezustand in `localStorage`, nicht in der Datenbank und nicht in Sicherungen (wie iOS). Wer schon Daten aus Phase 2 hat, sieht die Einführung nicht. |
| 5 | Demo und Einführungstest | Eigene Wegwerf-IndexedDB statt einer Ansicht auf die echten Daten; beim Beenden gelöscht. |
| 6 | JSON-Sicherung | Phase 3 liefert den Export im neuen Format; Wiederherstellen und Import der alten Formate in Phase 5. |
| 7 | Alte Beispieldaten entfernen | Verschoben auf Phase 5, weil markierte Beispieldaten nur über den Import ins Web kommen können. |
| 8 | Schlaf | Nur der manuell eingetragene Apple-Schlafindex; Dauer und Phasen aus Health bleiben nativ. |

## Phase 4 (gebaut und eingerichtet am 02.11.2026, Abnahme auf Geräten offen)

| Nr | Punkt | Umsetzung |
|---|---|---|
| 1 | Gastdaten beim ersten Login | Rückfrage mit „Ins Konto übernehmen“ / „Nur auf diesem Gerät behalten“ (Phase-0-Entscheidung 4). |
| 2 | Konflikte bei offenen Trainings | Gerät behält seinen Stand, Cloud-Version wird Konfliktkopie, Auswahl unter Einstellungen → Konto (siehe `DATENMODELL.md`, Abschnitt 6). |
| 3 | Abgleich | Kein Realtime-Kanal, sondern Abgleich nach jeder Änderung (1,5 s verzögert), beim Zurückkehren in die App, bei wiederhergestellter Verbindung und alle 30 s, solange die App sichtbar ist. Spart Verbindungen im Gratis-Tarif. |
| 4 | Schlüssel | Publishable Key statt des alten `anon`-Schlüssels, weil Supabase die alten bis Ende 2026 ablöst. |
| 5 | Ohne Cloud-Einstellungen | Die App läuft weiter rein lokal und zeigt keinen Konto-Bereich. So bleibt die Live-Version bis zur Einrichtung unverändert. |
| 6 | Zwei-Konten-Test | Zweimal: automatisch in CI gegen die echten Migrationen in einem eingebetteten Postgres (PGlite) und einmal gegen dein echtes Projekt (`npm run test:rls-live`). |
| 7 | Logout | Konto-Datenbank bleibt geschlossen auf dem Gerät; beim nächsten Login mit demselben Konto ist sie sofort da. Löschen der lokalen Daten kommt mit „Konto löschen“ in Phase 6 (umgesetzt am 03.11.2026). |


## Phase 5 (geplant am 02.11.2026)

| Nr | Punkt | Entscheidung |
|---|---|---|
| 1 | Aufteilung | Phase 5a: Import von JSON und CSV v18 in der App, mit Vorschau, Prüfung, Fehlerbericht, Doppelschutz und Abschlussbericht. |
| 2 | Ältere CSV-Formate (v1–v17, einfache Workout-CSV) | **Ändert Phase-0-Entscheidung 1** („alle CSV-Formate müssen in der App funktionieren“): Mathis' alte Datei wird einmalig außerhalb der App in v18/JSON umgewandelt und dann über den normalen Import eingelesen. Ein eingebauter Import für diese Formate (Phase 5b) wird nur gebaut, wenn er später gebraucht wird. Grund: deutlich weniger Aufwand bei gleichem Ergebnis für die vorhandenen Daten. |
| 3 | Umgang mit der Datei | Die Datei bleibt auf dem Mac und kommt nie ins Repo, weil sie persönliche Trainingsdaten enthält. |
| 4 | Fehlerbericht | Umgesetzt am 02.11.2026: Statt beim ersten Fehler abzubrechen (alte App), sammelt der Import bis zu 50 Probleme mit Fundstelle. Importiert wird bei jedem Fehler nichts. |
| 5 | Erneuter Import derselben Datei | Hinweis mit Datum des ersten Imports, Import bleibt möglich und fügt nichts doppelt hinzu (Abgleich über IDs). |
| 6 | Gelöschte Datensätze | Ein Datensatz, der hier gelöscht wurde, wird durch einen Import nicht wiederbelebt. |
| 7 | Unbekannte Kalendertage | Ära 0 oder Monat 13 (nicht-gregorianischer Kalender auf dem iPhone) brechen den Import mit Fehlerbericht ab, statt Tage falsch umzurechnen. |
| 8 | Phase 5b gebaut (03.11.2026) | Auf Wunsch von Mathis doch eingebaut: v1–v17 und die einfache Workout-CSV werden in der App gelesen. Damit gilt Phase-0-Entscheidung 1 wieder, die einmalige Umwandlung außerhalb der App (Nr. 2) ist nicht mehr nötig. |
| 9 | IDs in älteren Dateien | Trainings ohne Entwurfs-ID, Übungen ohne Snapshot-ID und Sätze ohne Satz-ID bekommen eine aus dem Inhalt abgeleitete ID. Dieselbe Datei ergibt so immer dieselben IDs, ein zweiter Import fügt nichts doppelt hinzu. |
| 10 | Abgleich ohne IDs | Wie in der alten App gilt ein Training aus einer älteren Datei als vorhanden, wenn hier eines mit gleichem Namen, gleichem Abschlussstatus und gleicher Sekunde existiert. Es bleibt dann unverändert. |
| 11 | Fehlende Teile älterer Dateien | Einstellungen, Schlafwerte und Trainingsplan stehen nicht darin; das Gerät behält seine eigenen. Beispieltrainings werden wie in der vollständigen Sicherung weggelassen. |

## Phase 6 (gebaut am 03.11.2026, Abnahme offen)

| Nr | Punkt | Umsetzung |
|---|---|---|
| 1 | Einwilligung | Zwei Stufen: beim ersten Start Gesundheitsdaten auf dem Gerät und Mindestalter 16, beim Anmelden die Cloud-Sicherung. Gespeichert auf dem Gerät mit Version; die Cloud-Einwilligung zusätzlich in den Metadaten des Logins. Wer schon angemeldet ist, bestätigt die Cloud einmal nachträglich oder meldet sich ab. |
| 2 | Konto löschen | Datenbankfunktion `delete_account()` statt Edge Function: kein Secret Key, keine weitere Einrichtung außer der Migration. Endgültig gelöscht, keine Grabsteine. Der Live-Test prüft, dass Supabase das Löschen aus `auth.users` per Funktion erlaubt. |
| 3 | Andere Geräte nach dem Löschen | Schreibregel nimmt nur Zeilen existierender Konten an; das Gerät erkennt die Ablehnung und bietet an, die lokale Kopie zu entfernen. |
| 4 | Gastdaten | Gehören nicht zum Konto und bleiben beim Konto-Löschen. Ohne Konto gibt es „Daten auf diesem Gerät löschen“, das auch die Einwilligung zurücksetzt. |
| 5 | CSV-Format | Lesbare Tabelle (eine Zeile je Training, Satz, Ausdauer, Gewicht) statt einer Kopie des JSON. Die vollständige Kopie bleibt das JSON. |
| 6 | Rechtstexte | Nur Deutsch, als Entwurf mit markierten Platzhaltern; ein Test verhindert das Abschalten des Entwurfshinweises mit offenen Platzhaltern. Ehrliche Angaben zu Cloudflare, Supabase, Gmail und Google. |
| 7 | Gmail-Versand | Bleibt für den privaten Betrieb. Bei einer Veröffentlichung nötig: Mailanbieter mit AVV (siehe `DATENSCHUTZ.md`, Abschnitt 5). |
| 8 | Privater Betrieb (03.11.2026) | Motion bleibt privat für Mathis und ein, zwei Freunde: Registrierung in Supabase geschlossen, App legt keine Konten an, Freunde werden im Dashboard angelegt. Statt Impressum und langer Datenschutzerklärung ein kurzer Datenschutzhinweis und „Über dieses Projekt“ ohne Namen und Anschrift. Die Entwürfe für eine Veröffentlichung liegen in Commit `22223c3`. |


## Phase 7 (03.11.2026)

| Nr | Punkt | Umsetzung |
|---|---|---|
| 1 | Kompletter Durchlauf | Als ein automatischer Test gegen die echten Migrationen in eingebettetem Postgres (`src/sync/sync.test.ts`), läuft in CI. Gegen das echte Projekt lege ich keine Konten an; dort decken `test:rls-live` und `test:delete-live` die Server-Regeln ab, den Rest die Geräte-Checkliste in `ABNAHME.md`. |
| 2 | Geheimnis-Scan | Einmalig über die ganze Historie (keine Funde) und dauerhaft als CI-Job mit gitleaks. |
| 3 | Wiederherstellen der Web-Sicherung (A1) | Nachgebaut am 03.11.2026 im selben Import-Dialog. Regel wie beim Sync: pro Eintrag gewinnt die neuere Fassung, auch Löschungen; ein auf diesem Gerät offenes Training behält seinen Stand. Kein Doppelschutz-Beleg nötig, weil ein zweites Wiederherstellen nichts ändert. |

## Aufräumen (03.11.2026)

| Nr | Punkt | Umsetzung |
|---|---|---|
| 1 | Schlafindex | Ganz entfernt (Karte, Einstellungen, Speicher, Sync, Export, Import). Dexie-Version 4 löscht die lokale Tabelle samt wartender Uploads. Alte Sicherungen mit Schlafwerten lassen sich weiter importieren; die Werte werden still übergangen. Die Cloud-Tabelle `sleep_scores` bleibt, die App liest und schreibt sie nur nicht mehr. |
| 2 | Ruhemodus | Einstellung und alles, was davon abhing, ersatzlos entfernt: Level-Karte und Feiern erscheinen immer. Der Wert aus iOS-Sicherungen wird übergangen; alte Profile verlieren den Schlüssel bei der nächsten Einstellungsänderung. |
| 3 | Haptik | Ganz entfernt (Plattform-Schnittstelle, Hook, alle Aufrufe, Schalter in den Einstellungen), weil Safari auf dem iPhone nicht vibrieren kann. Kommt bei Bedarf mit der nativen App über die Plattform-Schicht zurück. |
| 4 | kg/lb im Training | Das Einheiten-Menü im Training und `changeLoadUnit` sind entfernt. Die Einheit kommt aus dem Profil und bleibt in Einstellungen → Profil & Körpergewicht änderbar; Sätze eines offenen Trainings behalten ihre eigene Eingabe-Einheit. |

## Hosting (24.11.2026)

| Nr | Punkt | Umsetzung |
|---|---|---|
| 1 | GitHub Pages statt Cloudflare Pages | Auf Wunsch von Mathis wird nur noch über GitHub gehostet: Action `pages.yml` baut bei jedem Push auf `main` und veröffentlicht unter https://blackholeyt.github.io/motion-web/. Dafür ist das Repo öffentlich, weil GitHub Free Pages nur für öffentliche Repos anbietet. Das Cloudflare-Projekt wird nach dem Umzug gelöscht. |
| 2 | Supabase-Werte im Build | Kommen aus den vorhandenen Secrets `SUPABASE_URL` und `SUPABASE_PUBLISHABLE_KEY`; der Build bricht ab, wenn sie fehlen. Supabase erlaubt die neue Adresse unter Site URL und Redirect URLs. |
| 3 | `_headers` entfernt | GitHub Pages kann keine eigenen Header setzen. Referrer-Policy jetzt als Meta-Tag; Cache-Regeln sind dank kurzer Cache-Dauer bei GitHub und Service-Worker-Update am HTTP-Cache vorbei nicht nötig. |
| 4 | Datenschutzhinweis | Abschnitt „Laden der App“ nennt jetzt GitHub statt Cloudflare. `consentVersion` bleibt, weil sich an den gespeicherten Daten und den Einwilligungen nichts ändert. |

## Registrierung (24.11.2026)

| Nr | Punkt | Umsetzung |
|---|---|---|
| 1 | Keine Einladungspflicht mehr | Auf Wunsch von Mathis: Die App legt beim ersten Code bzw. Google-Login ein Konto an (`shouldCreateUser: true`); der Hinweis „nur auf Einladung“ und `isNotInvited` sind entfernt. In Supabase ist „Allow new users to sign up“ an, das Google-Projekt ist veröffentlicht. Folge: Der private Ausnahmefall aus Datenschutz Nr. 8 trägt nicht mehr sicher, siehe `DATENSCHUTZ.md`, Abschnitt 5. |
