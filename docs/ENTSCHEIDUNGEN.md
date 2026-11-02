# Entscheidungen

## Phase 0 (bestätigt am 02.11.2026: „Vorschläge übernehmen“)

| Nr | Frage | Entscheidung |
|---|---|---|
| 1 | Importweg | JSON-Backup ist der Standard, CSV v18 wird mit unterstützt. Ältere CSV-Versionen (v1–v17) und die einfache Workout-CSV werden nicht gebaut, solange keine solche Datei auftaucht. |
| 2 | Früher importierte Apple-Health- und Strava-Workouts | Werden als schreibgeschützte Verlaufseinträge mitgenommen. Die Herzfrequenzdaten werden aufbewahrt, angezeigt werden sie erst in der nativen App. (Hier gab es keinen Vorschlag von mir; ich habe die Variante ohne Datenverlust gewählt.) |
| 3 | Offene Entwürfe beim Import | Werden mitgenommen. |
| 4 | Daten vor dem ersten Login | Werden nach einer Rückfrage beim ersten Login ins Konto übernommen. |
| 5 | Gratis-Limit von 3 Blueprints | Version 1 hat kein Limit. Käufe kommen mit der nativen App. |
| 6 | Krone (PR-Tracking) | Wie in der alten App: wird nur über ein Lastziel eingeschaltet. Ein eigener Schalter wäre eine neue Funktion und steht deshalb in `IDEEN.md`. (Auch hier gab es keinen Vorschlag; ich habe „nichts ändern“ gewählt.) |
| 7 | Schrift | Systemschrift-Stack (`system-ui`, gerundete Ziffern über `ui-rounded`). Es wird keine Schrift geladen. |
| 8 | Sprache | Englisch und Deutsch, Umschalter in den Einstellungen, Standard nach Gerätesprache. |
