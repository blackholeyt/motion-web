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
