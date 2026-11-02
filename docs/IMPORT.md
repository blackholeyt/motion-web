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
- `sleepScores`: manuell eingetragene Schlafwerte
- `trainingPlan`: Trainingsplan
- `preferences`: Einstellungen (Darstellung, Quiet Mode, Haptik, Opening, Wiederholungen, Pausendauer, Schrittziel, Körpergewicht-Ziel)
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
| C. Ältere CSV-Dateien (`motion_backup_v1` bis `v17`) oder die einfache Workout-CSV | nur wenn du solche Dateien noch hast | je nach Version unvollständig | nur auf Wunsch |
| D. Datenbankdatei direkt vom iPhone auslesen | hoch (Xcode, Geräte-Container) | technisch möglich, fehleranfällig | nicht empfohlen |

**Wichtig zur alten App:** Wurde sie mit einem kostenlosen Apple-Account aus Xcode installiert, startet sie nach etwa 7 Tagen nicht mehr, bis man sie erneut aus Xcode installiert. Die Daten bleiben dabei erhalten. Für den Export muss die App also noch starten. Am sichersten exportierst du das Backup bald einmal und hebst die Datei auf.

## 4. Geplanter Import in der Web-App (Phase 5)
1. Datei wählen (JSON oder CSV v18). Die CSV wird intern in dasselbe JSON zurückverwandelt.
2. Prüfung mit den Regeln der alten App. Bei einem Fehler wird nichts importiert, und ein verständlicher Fehlerbericht erscheint.
3. **Vorschau** mit Anzahlen: Workouts, Entwürfe, Sätze, Übungen, Routinen, Körpergewicht, Schlafwerte, XP-Belege, Rekorde. Dazu Stichproben, z. B. die letzten 3 Workouts mit Sätzen.
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
