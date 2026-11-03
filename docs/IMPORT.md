# Import der alten Daten

## 1. Wie die alte App speichert
- Alle Trainingsdaten liegen in einer **SwiftData-Datenbank** (SQLite) im privaten App-Ordner auf dem iPhone (`TrackerApp.swift`, `IdentityStoreLoader.swift`). Ohne Entwicklerwerkzeuge kommt man an diese Datei nicht heran, und sie ist kein stabiles Austauschformat.
- Einstellungen liegen in `UserDefaults`.
- Der Einführungsstand liegt in der Datenbank, wird aber bewusst nicht exportiert.
- Die alte App lädt nichts in eine Cloud. Es gibt kein Konto und keinen Server.

## 2. Vorhandene Exporte in der alten App
Die alte App hat **einen vollständigen, gut geprüften Export**. Es braucht keine Änderung an der alten App.

| Weg in der alten App | Datei | Inhalt |
|---|---|---|
| Settings → „Full Motion backup“ → „Export Backup“ | `Motion-Backup-JJJJ-MM-TT.json` | alles, siehe unten |
| Settings → „CSV compatibility“ → „Export CSV“ | `MotionBackup.csv` | **genau derselbe Inhalt** wie die JSON-Datei, nur als CSV mit einer Zeile pro Datensatz (Kopfzeile `motion_backup_v18,record_index,value_json`) |

### Inhalt des Backups (Format `motion.full-backup`, Version 1)
Quellen: `MotionBackup.swift`, `MotionBackupStore.swift`, `MotionBackupValidation.swift`

- `library`: Übungen mit ID, Name, Lastziel, Krone, Pause und Metadaten
- `routines`: Blueprints mit Übungen, Reihenfolge, Sätzen, Aufwärmsätzen, Superset und Zielen
- `workouts`: alle Sessions **inklusive Entwürfen**, mit Übungen, Sätzen, Notizen, XP, Plan-Ticket, Pausen-Timer und Undo-Verlauf. Dazu Cardio-Werte und importierte Health-Workouts mit Herzfrequenz-Proben
- `profile`: Name, Einheiten, Zielgewicht, bereits gefeierte Gewichtsziele
- `weights`, `weightRewards`: Körpergewicht und tägliche XP-Belege
- `workoutAwards`: XP-Belege pro Workout
- `sleepScores`: manuell eingetragene Schlafwerte (die Web-App übergeht sie seit 03.11.2026)
- `trainingPlan`: Trainingsplan
- `preferences`: Einstellungen (Darstellung, Quiet Mode und Haptik (beide übergeht die Web-App seit 03.11.2026), Opening, Wiederholungen, Pausendauer, Schrittziel, Körpergewicht-Ziel)
- `healthReceipts`, `healthArchive`, `nutrition`: Health-Daten, in V1 nicht gebraucht

**Nicht enthalten:** Beispieldaten (`isSample`), Einführungsstand, Käufe, Berechtigungen.

### Technische Besonderheiten, die der Import beachten muss
- **Datumswerte** sind Zahlen in **Sekunden seit dem 1. Januar 2001** (Swifts Standard), nicht seit 1970. Umrechnung: Unix-Zeit = Wert + 978.307.200.
- **Kalendertage** (`dayKey`) haben das Format `Ära-Jahr-Monat-Tag` ohne führende Nullen, z. B. `1-2026-11-2` → `2026-11-02`.
- **Gewichte** sind immer kg, **Distanzen** km, **Pace** Sekunden pro km, **Dauer** Sekunden.
- **IDs** sind UUIDs. Alte Datensätze ohne eigene UUID bekommen beim Export eine feste, aus der internen ID abgeleitete UUID. Mehrfaches Exportieren ergibt deshalb dieselben IDs.
- **Größen:** JSON höchstens 32 MB, CSV höchstens 64 MB.
- Die alte App prüft das Backup beim Export mit denselben Regeln wie beim Import (`MotionBackupValidation.swift`). Diese Regeln übernehme ich als Prüfung im Web-Import.

## 3. Mögliche Importwege

| Weg | Aufwand für dich | Vollständigkeit | Bewertung |
|---|---|---|---|
| **A. JSON-Backup** aus der alten App exportieren und in der Web-App hochladen | gering: 1× exportieren, Datei per AirDrop, Dateien-App oder Mail auf das Gerät mit der Web-App | vollständig | **empfohlen** |
| **B. CSV v18** aus der alten App | gleich wie A | vollständig, identisch zu A | als Alternative, gleicher Importcode |
| C. Ältere CSV-Dateien (`motion_backup_v1` bis `v17`) oder die einfache Workout-CSV | nur wenn du solche Dateien noch hast | je nach Version unvollständig | eingebaut seit Phase 5b |
| D. Datenbankdatei direkt vom iPhone auslesen | hoch (Xcode, Geräte-Container) | technisch möglich, fehleranfällig | nicht empfohlen |

**Wichtig zur alten App:** Wurde sie mit einem kostenlosen Apple-Account aus Xcode installiert, startet sie nach etwa 7 Tagen nicht mehr, bis man sie erneut aus Xcode installiert. Die Daten bleiben dabei erhalten. Für den Export muss die App also noch starten. Am sichersten exportierst du das Backup bald einmal und hebst die Datei auf.

## 4. Geplanter Import in der Web-App (Phase 5a)

**Aufteilung seit 02.11.2026:** Phase 5a baut den Import für JSON und CSV v18. Ältere Dateien von Mathis werden einmalig außerhalb der App in v18/JSON umgewandelt. Ein eingebauter Import für v1–v17 und die einfache Workout-CSV kommt nur bei Bedarf (Phase 5b). Siehe README, „Nächste Phasen“.
1. Datei wählen (JSON oder CSV v18). Die CSV wird intern in dasselbe JSON zurückverwandelt.
2. Prüfung mit den Regeln der alten App. Bei einem Fehler wird nichts importiert, und ein verständlicher Fehlerbericht erscheint.
3. **Vorschau** mit Anzahlen: Workouts, Entwürfe, Sätze, Übungen, Routinen, Körpergewicht, XP-Belege, Rekorde. Dazu Stichproben, z. B. die letzten 3 Workouts mit Sätzen.
4. **Import nach den Regeln der alten App:**
   - Fehlende Datensätze werden ergänzt, vorhandene bleiben unverändert (Abgleich über die IDs).
   - Es werden **keine neuen XP berechnet**, XP und Belege kommen aus der Datei.
   - Profil und Einstellungen werden übernommen.
5. **Schutz vor doppeltem Import:** gleiche IDs werden übersprungen. Zusätzlich speichere ich einen Fingerabdruck der Datei (`legacy_imports`). Bei einer bereits importierten Datei erscheint ein Hinweis.
6. **Abschlussbericht** mit den konkreten Zahlen zum Abgleich mit der alten App.

## 5. Entscheidungen

Am 02.11.2026 entschieden:
- Der CSV-Import muss auf jeden Fall funktionieren, für alle CSV-Formate der alten App (v18, v1–v17 und die einfache Workout-CSV). JSON wird zusätzlich unterstützt.
- Health- und Strava-Workouts werden vorerst übersprungen; der Bericht nennt ihre Anzahl.
- Entwürfe werden mitgenommen.

Details in `ENTSCHEIDUNGEN.md`. Die ursprünglichen Fragen:
1. Importweg A (JSON) als Standard? CSV v18 wird ohne Mehraufwand mitunterstützt.
2. Hast du noch ältere CSV-Dateien (v1–v17) oder die einfache Workout-CSV, die importiert werden müssen?
3. Was passiert mit **früher aus Apple Health oder Strava importierten Workouts**, die in deinen Daten stehen?
   - (a) als schreibgeschützte Verlaufseinträge mitnehmen (Name, Datum, Dauer, Distanz; die Herzfrequenzdaten werden aufbewahrt, aber erst in der nativen App angezeigt)
   - (b) weglassen
4. **Offene Entwürfe** (unfertige Workouts) mitnehmen? Mein Vorschlag: ja.

## 6. Umsetzung in Phase 5a (02.11.2026)

**Wo:** Einstellungen → Sicherung → „Import aus der iOS-App“ und in der Einführung auf Seite 3 → „Restore backup“. Im Demo-Modus und im Einführungstest gesperrt.

**Code:** `src/import/csv.ts` (CSV-Parser und v18-Decoder wie `CompleteCSVCodec.swift`), `src/import/legacyBackup.ts` (Struktur und Prüfregeln wie `MotionBackupValidation.swift`), `src/import/importer.ts` (Vorschau und Übernahme wie `MotionBackupRestore.swift`), Oberfläche `src/features/import/ImportSheet.tsx`.

**Ablauf**
1. Datei wählen. JSON oder CSV wird am Inhalt erkannt, nicht an der Endung. Größen: JSON bis 32 MB, CSV bis 64 MB.
2. Prüfung: zuerst Dateityp und Version, dann die vollständige Struktur, dann die Regeln der alten App. Anders als die alte App sammelt der Import **alle** Probleme (höchstens 50) mit Fundstelle, z. B. „Training 4 › Übung 1 › Satz 3: ungültiger Satz“. Ältere Motion-CSV (v1–v17) und die einfache Workout-CSV werden seit Phase 5b ebenfalls gelesen (Abschnitt 7).
3. Vorschau: Tabelle „In der Datei / Neu / Schon vorhanden“ für Trainings, Entwürfe, erledigte Sätze, Übungen, Routinen, Körpergewicht, XP-Belege, Übungen mit Rekord und XP. Dazu die 3 neuesten Trainings mit Übungen und Sätzen. Es wird noch nichts geschrieben.
4. Import in **einer** Transaktion: entweder alles Neue oder nichts. Alles Neue kommt in die Sync-Warteschlange.
5. Abschlussbericht mit denselben Spalten.

**Regeln**
- Abgleich über die IDs der Datei (in Kleinbuchstaben, weil Swift UUIDs groß schreibt und Postgres sie klein zurückgibt). Vorhandene Datensätze bleiben unverändert, auch gelöschte (sie werden nicht wiederbelebt).
- Körpergewicht und Tages-XP bekommen die stabile Tages-ID der Web-App. Ein Tag, der hier schon existiert, bleibt unverändert.
- Routineneinträge haben in der alten App keine ID; sie bekommen eine feste ID aus Routine und Übung.
- Keine neuen XP: Trainings behalten `earnedXP`, XP-Belege kommen aus der Datei. Ein vorhandener Beleg gewinnt. Ein abgeschlossenes Training ohne Beleg bekommt einen mit seinen XP aus der Datei.
- Health- und Strava-Workouts (`healthWorkoutID` gesetzt) werden übersprungen und gezählt. Ihre XP-Belege werden wie in der alten App übernommen; sie zählen nicht zu den Gesamt-XP, weil die Web-App XP aus den Trainings summiert.
- Entwürfe kommen mit Pausentimer, Rückgängig-Verlauf und unfertigen Eingaben.
- Profil (Name, Einheiten, Zielgewicht, Erstelldatum) und Trainingseinstellungen (Körpergewicht anzeigen, Wiederholungen, Pausendauer, Körpergewicht-Ziel) werden übernommen, gefeierte Gewichtsziele zusammengeführt. Darstellung und Startanimation gelten danach für dieses Gerät. Benachrichtigungen bleiben, wie sie sind.
- Der Trainingsplan wird nur übernommen, wenn dieses Gerät keinen hat. Tage in verbrauchten Plan-Slots werden ins Web-Format umgerechnet.
- Zeitpunkte: Sekunden seit 2001 → ISO-Zeit (UTC). Kalendertage: `1-2026-11-2` → `2026-11-02`. Tage außerhalb des gregorianischen Kalenders (Ära 0, Monat 13) brechen den Import mit Fehlerbericht ab.
- **Doppelschutz:** Fingerabdruck = SHA-256 der Sicherung mit sortierten Schlüsseln. JSON- und CSV-Export derselben Sicherung haben also denselben Fingerabdruck. Der Beleg liegt in `legacy_imports` (Gerätedatenbank Version 3, Cloud-Migration `20261102180000_legacy_imports.sql`) und wird mitsynchronisiert. Bei bekannter Datei erscheint ein Hinweis; ein erneuter Import ist erlaubt und fügt nichts doppelt hinzu.
- Verwendet ein neues Training Übungs- oder Satz-IDs, die hier schon zu einem anderen Training gehören, bricht der Import ab (wie in der alten App).
- Nicht übernommen: Health-Archiv, Ernährung, Health-Belege, Schrittziel. Sie werden nur als vorhandene Objekte geprüft, nicht im Detail.

**Tests:** `src/import/importer.test.ts` (Lesen, Prüfung, Umrechnung, Übernahme, Doppelschutz, Konflikt), `tests/e2e/import.spec.ts` (Ablauf im Browser auf Chrome mobil/Desktop und iPhone-WebKit). Testdaten im Format der alten App: `src/test/legacyBackup.ts`.

**Abnahme (offen):** Mathis exportiert in der alten App „Export Backup“ und importiert die Datei. Die Zahlen und Stichproben müssen zur alten App passen.

## 7. Ältere CSV-Dateien (Phase 5b, 03.11.2026)

**Code:** `src/import/olderCSV.ts` (Umwandlung wie `MotionBackupCSV.swift` und `WorkoutCSVImporter.swift`), Tests `src/import/olderCSV.test.ts` und `tests/e2e/import.spec.ts`, Testdateien `src/test/olderCSV.ts`.

**Ablauf:** Die Kopfzeile bestimmt das Format. Sie muss exakt einer der 17 Versionen der alten App oder der einfachen Workout-CSV entsprechen. Die Datei wird in die vollständige Sicherung umgewandelt; danach gelten Prüfung, Vorschau, Übernahme, Doppelschutz und Abschlussbericht aus Abschnitt 6 unverändert. Die Vorschau nennt das Format und statt des Exportdatums den neuesten Eintrag der Datei.

**Motion-CSV v1–v17**
- Eine Zeile pro Datensatz (`workout`, `exercise`, `set`, `library_exercise`, `blueprint`, `blueprint_exercise`, `profile`, `body_weight`, `weight_reward`, `workout_award`, `nutrition`), verknüpft über Schlüssel innerhalb der Datei. Ältere Versionen haben weniger Spalten; fehlende gelten als leer.
- Zeilenprüfung wie in der alten App: erlaubte Spalten je Zeilenart, Wahrheitswerte, UUIDs, Zahlenbereiche, Namen mit Apostroph-Schutz, Cardio-Werte mit passender Pace, Regeln für Dauer-Übungen, Verweise auf vorhandene Trainings, Übungen und Routinen, doppelte Schlüssel und Satznummern. Alle Probleme (höchstens 50) erscheinen mit Zeilennummer, die Kopfzeile ist Zeile 1.
- **Datumswerte sind Unix-Sekunden** (nicht Sekunden seit 2001) und werden umgerechnet.
- IDs: Entwurfs-ID, Snapshot-ID und Satz-ID werden übernommen, wenn vorhanden. Sonst wird eine feste ID aus dem Inhalt abgeleitet (Training: Status, Sekunde, Name; Übung: Training und Position; Satz: Übung und Satznummer).
- Ein Training mit gleichem Namen, Status und gleicher Sekunde wie eines auf diesem Gerät gilt als vorhanden (Regel der alten App). So entstehen keine Doppelten, wenn vorher schon die vollständige Sicherung importiert wurde.
- XP: Ein Trainings-XP-Beleg in der Datei gewinnt gegen die XP des Trainings. Abgeschlossene Trainings ohne Beleg bekommen einen mit ihren XP aus der Datei.
- Rückgängig-Verlauf und Pausentimer kommen mit. Verweisen sie auf Sätze, die es in der Datei nicht gibt, wird der Verlauf bzw. der Bezug des Timers weggelassen statt den Import abzubrechen.
- Beispieltrainings werden weggelassen. Health- und Strava-Workouts werden wie bisher übersprungen und gezählt. Ernährung wird nicht übernommen.
- Nicht enthalten in diesen Dateien: Einstellungen, Trainingsplan, gefeierte Gewichtsziele. Das Gerät behält seine eigenen; Darstellung und Startanimation bleiben unverändert.

**Einfache Workout-CSV** (`workout_date,workout_name,exercise,set_index,weight_kg,reps,set_completed`)
- Eine Zeile pro Satz. Ein Training sind alle Zeilen mit gleicher Zeit (ISO 8601) und gleichem Namen, eine Übung alle Zeilen mit gleichem Übungsnamen darin.
- Alle Trainings gelten als abgeschlossen, mit 0 XP und Messart „Gewicht & Wiederholungen“. Ein Apostroph vor Namen, die wie eine Formel beginnen, wird entfernt.
- Doppelte Satznummern in einer Übung und ungültige Zeiten brechen mit Zeilennummer ab.

**Abnahme (offen):** Mathis importiert seine alte CSV-Datei. Zahlen und Stichproben müssen zur alten App passen.

## 8. Web-Sicherung wiederherstellen (03.11.2026)

**Wo:** derselbe Dialog wie der Import (Einstellungen → Sicherung → „Sicherung importieren oder wiederherstellen“, Einführung → „Restore backup“). Eine JSON-Datei mit `"format": "motion-web-backup"` geht an die Wiederherstellung, alles andere an den iOS-Import.

**Code:** `src/import/webBackup.ts`, Tests `src/import/webBackup.test.ts` und `tests/e2e/import.spec.ts`.

**Regeln**
- Prüfung: Format und Version, dann jeder Eintrag: gültige ID, keine doppelte ID je Tabelle, gültige Zeitpunkte, Pflichtfelder je Tabelle. Alle Probleme (höchstens 50) mit Fundstelle, z. B. „Satz 2: ungültige ID“. Bei einem Fehler wird nichts geschrieben.
- Pro Eintrag gewinnt die neuere Fassung (`updated_at`), wie beim Sync: Was nach dem Export hier geändert wurde, bleibt. Eine Löschung in der Datei, die neuer ist, löscht hier; was hier später gelöscht wurde, bleibt gelöscht.
- Ein Training, das auf diesem Gerät gerade offen ist, behält seinen Stand.
- Alles Übernommene kommt in die Sync-Warteschlange. Mit Konto landet es also auch wieder in der Cloud.
- Sicherungen von vor Phase 5a ohne `legacy_imports` werden angenommen.
- Ein zweites Wiederherstellen derselben Datei ändert nichts; deshalb gibt es hier keinen Doppelschutz-Beleg.
- Die Spalte „Neu“ der Vorschau zählt auch Einträge, die in der Datei in neuerer Fassung stehen.
- Nicht in der Sicherung und deshalb nicht wiederhergestellt: Geräte-Einstellungen wie Darstellung, Sprache und Startanimation.
