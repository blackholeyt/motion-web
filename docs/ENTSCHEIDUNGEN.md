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
