# Funktionsgleichheit (Parität)

**Status-Werte:**
- `übernehmen`: geht im Web genauso
- `Web-Anpassung nötig`: geht im Web, aber anders oder eingeschränkt
- `später nativ`: entfällt in V1 und kommt mit der Capacitor-App zurück

Die Spalte „Phase“ zeigt, wann die Funktion gebaut wird. Die Spalte „Test“ nennt, wo die Funktion geprüft wird: Unit-Tests (Vitest, `src/**/*.test.ts`), Browser-Tests (Playwright, `tests/e2e/`) oder ein manueller Prüfschritt.

**Stand nach Phase 3:** Alle Zeilen mit Phase 1, 2 und 3 sind gebaut. Ausnahmen und Anpassungen:
- Nr. 78: In Phase 3 kommt nur der **Export** im neuen JSON-Format (Einstellungen → Sicherung). Wiederherstellen folgt mit Phase 5.
- Nr. 82: Markierte Beispieldaten kann es im Web nur durch den Import alter Daten geben. Das Entfernen kommt deshalb mit dem Import in Phase 5.
- Nr. 10/61: Die Texte sagen ehrlich „vorerst auf diesem Gerät, Konto und Cloud-Sicherung folgen“.
- Nr. 10: Mit eingerichteter Cloud sagt der Text „… ein optionales Konto zur Sicherung kannst du in den Einstellungen anlegen“.

**Phase 4:** Konto, Sync und Sync-Status sind gebaut (siehe „Neu durch die Web-Version“). Tests: `supabase/tests/rls.test.ts` (Zwei-Konten-Test, 62 Prüfungen), `src/sync/sync.test.ts` (zwei Geräte, offline ohne Duplikate, Löschungen, letzte Änderung gewinnt, offene Trainings, Gastdaten, Datenbank-Update), `supabase/tests/rls.live.test.ts` (gegen dein Projekt: am 02.11.2026 bestanden, 13/13, Test-Konten danach nachweislich gelöscht). Lokal getestet am 02.11.2026: Anmeldung mit E-Mail-Code und mit Google, Sicherung in der Cloud. Offen: iPhone (Safari und installierte App), zweites Gerät, Offline-Abgleich auf echten Geräten.

- Trainings, die in Phase 2 abgeschlossen wurden, bekommen nachträglich keine XP (wie in der iOS-App: XP nur für neu abgeschlossene Trainings).

Details zu jeder Funktion: `FUNKTIONEN.md` (Abschnittsnummer in Klammern).

| Nr | Funktion | Quelle (alt) | Status | Phase | Anmerkung | Test |
|---|---|---|---|---|---|---|
| 1 | Vier Tabs Dashboard/Blueprints/History/Settings (1) | `ContentView.swift` | übernehmen | 1 | Tab-Leiste unten auf dem Handy, Seitenleiste auf Tablet/Desktop | E2E: `app.spec.ts` (Tabs) |
| 2 | Deep Link `motion://dashboard` (1) | `ContentView.swift` | Web-Anpassung nötig | 1 | wird zur URL `/` bzw. `/#/dashboard` | E2E: `app.spec.ts` |
| 3 | Fehlerbild „Could not open training data“ (1) | `TrackerApp.swift` | übernehmen | 2 | für IndexedDB-Fehler | manuell (Browser): IndexedDB sperren → Fehlerbild |
| 4 | Opening-Animation inkl. Querformat und reduzierter Bewegung (2) | `Opening*.swift` | übernehmen | 1 | Canvas/WebGL statt SwiftUI Canvas, gleiche Mathematik | Unit: `opening/timeline.test.ts`; E2E: `app.spec.ts` |
| 5 | Opening an/aus und „Preview Opening“ (2, 11) | `SettingsView.swift` | übernehmen | 1 | | manuell (Browser): Einstellungen → Startanimation |
| 6 | Einführung: Profil-Schritte mit Prüfungen (3.2) | `OnboardingProfileView.swift` | übernehmen | 3 | | Unit: `App.test.tsx` (Profil, Gewicht); E2E: `introduction.spec.ts` |
| 7 | Einführung: Trainingswahl, Vorlage, eigene Routine, Freestyle (3.2) | `OnboardingView.swift`, `OnboardingPlanPages.swift`, `OnboardingDestinations.swift` | übernehmen | 3 | | Unit: `App.test.tsx` (Vorlage); E2E: `introduction.spec.ts` |
| 8 | Einführung: „Restore backup“ (3.2) | `OnboardingDestinations.swift` | Web-Anpassung nötig | 5 | führt zum Web-Import der alten Daten | – (Phase 5) |
| 9 | Einführung: „Import from Apple Health“ (3.2) | `OnboardingView.swift` | später nativ | – | Auswahl in V1 ausblenden | – (ausgeblendet) |
| 10 | Einführungstext „No registration. Your training data stays on this device.“ (3.2) | `OnboardingView.swift` | Web-Anpassung nötig | 3/4 | stimmt mit Konto und Cloud nicht mehr; ehrlich umformulieren | manuell (Browser): Startseite der Einführung, Text „Keine Registrierung nötig …“ |
| 11 | Mini-Demo „How it works“ (3.3) | `OnboardingMiniDemo.swift` | übernehmen | 3 | | manuell (Browser): Einstellungen → „So funktioniert’s“ |
| 12 | Lerntipps im ersten Workout und „Workout saved.“ (3.4) | `ActiveWorkoutView.swift`, `WorkoutOnboardingSupport.swift` | übernehmen | 3 | | E2E: `introduction.spec.ts` (Tipp erster Satz, „Workout saved.“) |
| 13 | „Test onboarding“ im Wegwerf-Speicher (3.5) | `OnboardingTestView.swift` | übernehmen | 3 | eigene temporäre IndexedDB | manuell (Browser): Einstellungen → „Einführung testen“; Daten bleiben unberührt |
| 14 | Dashboard-Begrüßung mit Datum (4) | `DashboardView.swift` | übernehmen | 2 | | E2E: `app.spec.ts` |
| 15 | Offene Entwürfe auf Dashboard und Verlauf (4, 6.10) | `WorkoutDraftsView.swift` | übernehmen | 2 | | E2E: `workout.spec.ts` (Fortsetzen) |
| 16 | Start-Karte und Auswahl-Bildschirm „Start workout“ (4.1) | `DashboardComponents.swift`, `DashboardBlueprintPicker.swift` | übernehmen | 2 | ohne die Health/Strava-Links | E2E: `workout.spec.ts` |
| 17 | Trainingsplan auf dem Dashboard: Start, früher starten, ersetzen, überspringen (4) | `TrainingPlanDashboard.swift` | übernehmen | 2 | | Unit: `schedule.test.ts`, `engine.test.ts` |
| 18 | Level-Karte (4, 8.10) | `WorkoutProgressCard.swift` | übernehmen | 3 | | Unit: `progress.test.ts` (Level, Ränge); E2E: `introduction.spec.ts` (100 XP) |
| 19 | Wochen-Diagramm „Consistency“ (4.2) | `DashboardComponents.swift`, `DashboardStatistics.swift` | übernehmen | 3 | | Unit: `statistics.test.ts` |
| 20 | Bestwerte „Recorded load bests“ mit Zielbalken (4.2) | `DashboardComponents.swift` | übernehmen | 3 | | E2E: `introduction.spec.ts` (Demo-Bestwerte) |
| 21 | Blueprint-Liste, Anlegen (Kraft/Cardio), Löschen (5.2) | `BlueprintListView.swift`, `CardioViews.swift` | übernehmen | 2 | | E2E: `workout.spec.ts`; Unit: `cardio.test.ts` |
| 22 | Gratis-Limit 3 Blueprints mit Paywall (5.2, 16) | `ProGate.swift` | später nativ | – | Käufe gehen im Web nicht; in V1 kein Limit (entschieden, siehe `ENTSCHEIDUNGEN.md`) | – (nativ) |
| 23 | Blueprint-Detail: Name, Reihenfolge, Sätze, Aufwärmsätze, Superset (5.3) | `BlueprintDetailView.swift`, `TrainingStructureControls.swift` | übernehmen | 2 | Sortieren per Ziehen bzw. Knöpfe | E2E: `workout.spec.ts` |
| 24 | Ziele, Pause, Notizen, Progression pro Routine-Übung (5.4) | `RoutineGuidance*.swift` | übernehmen | 2 | | Unit: `sets.test.ts` |
| 25 | Starter-Vorlagen, Auswahl und Kopie (5.5) | `StarterPlans.swift`, `PlanChooser.swift` | übernehmen | 2 | | E2E: `workout.spec.ts` |
| 26 | Übungskatalog mit 36 Bewegungen (5.6) | `ExerciseCatalogue.swift` | übernehmen | 2 | Texte 1:1 | Unit: Katalogdaten |
| 27 | Übungsbibliothek: Suche, Filter, Katalog übernehmen, eigene Übung (5.7) | `ExerciseBrowser.swift`, `ExerciseLibraryView.swift` | übernehmen | 3 | | manuell (Browser): Routinen → Übungen (Suche, Filter, neue Übung); Unit: `library.test.ts` |
| 28 | Übung bearbeiten inkl. „Track progress“ und historische Einträge verknüpfen (5.7) | `ExerciseEditor.swift` | übernehmen | 3 | | Unit: `library.test.ts` (Track progress, Verlauf einbeziehen, Löschen) |
| 29 | „History links“ (5.7) | `ExerciseHistoryMappingView.swift` | übernehmen | 3 | | Unit: `library.test.ts` (Verknüpfung lösen) |
| 30 | PR-Ziele und Lastziel-Editor (5.8) | `PRGoalsView.swift` | übernehmen | 3 | | manuell (Browser): Routinen → Rekordziele, Ziel setzen schaltet Krone ein |
| 31 | Trainingsplan Rotation und feste Wochentage mit Editor und Vorschau (5.9) | `TrainingSchedule.swift`, `TrainingPlanStore.swift`, `TrainingPlanEditor.swift` | übernehmen | 2 | Logik mit Unit-Tests gegen die alte | Unit: `schedule.test.ts` |
| 32 | Cardio: Bibliothek, Blueprint, Session, Pace-Logik, 100 XP (5.10) | `CardioSession.swift`, `CardioViews.swift` | übernehmen | 3 | | Unit: `cardio.test.ts` (Pace, 100 XP, Plan-Abgleich) |
| 33 | Workout aus Blueprint starten, Momentaufnahme, sofortiger Entwurf (6.1) | `ActiveWorkoutEngine.swift` | übernehmen | 2 | | Unit: `engine.test.ts` |
| 34 | Konflikt-Dialog bei offenem Entwurf (6.1) | `ActiveWorkoutView.swift` | übernehmen | 2 | | E2E: `workout.spec.ts` |
| 35 | Freestyle-Workout und „Add Exercise“ inkl. eigener Übungen (6.1, 6.5) | `ActiveWorkoutEngine.swift`, `FreestyleExercisePicker.swift` | übernehmen | 2 | | Unit: `engine.test.ts` |
| 36 | Vorwerte, „Use last“, „Copy previous set“, „Clear“ (6.2) | `WorkoutSetInput.swift`, `ActiveWorkoutEngine.swift` | übernehmen | 2 | | Unit: `engine.test.ts` |
| 37 | Satz-Zeile mit Menü, Abhaken, Prüfungen, Überspringen, Entfernen (6.3) | `WorkoutSetRow.swift` | übernehmen | 2 | | Unit: `engine.test.ts` |
| 38 | Zahleneingabe mit Punkt oder Komma, exakte Werte ohne Rundungsverlust (6.3) | `MeasurementUnits.swift`, `WorkoutSetInput.swift` | übernehmen | 2 | | Unit: `sets.test.ts`; E2E: `workout.spec.ts` (62,5) |
| 39 | Tastatur-Leiste „Next“/„Done“ (6.3) | `ActiveWorkoutView.swift` | Web-Anpassung nötig | 2 | iOS-Safari erlaubt keine eigene Tastaturleiste; „Weiter“-Taste der Tastatur (`enterkeyhint`) und Fokus-Logik stattdessen | manuell (Browser): Tastatur „Weiter“ |
| 40 | Supersets mit erzwungener Reihenfolge und Pausenregel (6.4) | `TrainingStructure.swift`, `ActiveWorkoutEngine.swift` | übernehmen | 2 | | Unit: `engine.test.ts` |
| 41 | Lasteinheit im Training umschalten (6.5) | `WorkoutOnboardingSupport.swift` | übernehmen | 2 | | manuell (Browser): Einheit im Training umschalten |
| 42 | Undo bis 100 Schritte, übersteht Neustart (6.5) | `WorkoutSessionEdits.swift` | übernehmen | 2 | | Unit: `engine.test.ts` |
| 43 | Übung ersetzen, verschieben, entfernen, zu Freestyle wechseln (6.5) | `WorkoutSessionEdits.swift`, `WorkoutSessionEditControls.swift` | übernehmen | 2 | | manuell (Browser): Übungsmenü im Training |
| 44 | Pause pro Übung nur für diese Session, „Start rest“ (6.5) | `ActiveWorkoutRest.swift`, `RestConfigurationViews.swift` | übernehmen | 2 | | manuell (Browser): Pause pro Übung |
| 45 | Workout-Notizen (6.5) | `WorkoutNotesSection.swift` | übernehmen | 2 | | manuell (Browser): Notizen im Training |
| 46 | „Finish“ mit Zusammenfassung (6.5, 6.9) | `ActiveWorkoutView.swift` | übernehmen | 2 | | E2E: `workout.spec.ts` |
| 47 | Workout nachtragen (6.6) | `PastWorkoutPicker.swift` | übernehmen | 2 | | Unit: `engine.test.ts` |
| 48 | Pausen-Timer aus gespeichertem Endzeitpunkt, Leiste, Stop/Skip/Restart/Cancel (6.7) | `RestTimerState.swift`, `FloatingRestTimer.swift` | übernehmen | 2 | | Unit: `restTimer.test.ts` |
| 49 | Pausen-Ende im Vordergrund: Haptik und Ansage (6.7) | `FloatingRestTimer.swift` | Web-Anpassung nötig | 2 | Ansage per `aria-live`; Vibration nur Android; optional Ton | Unit: `haptics.test.ts` |
| 50 | Lokale Mitteilung bei Pausen-Ende im Hintergrund (6.7) | `RestNotifications.swift` | Web-Anpassung nötig | 2 | Web hat keine zeitgesteuerten lokalen Mitteilungen. Auf iPhone nicht zuverlässig, auch nicht als installierte PWA. Ehrlich dokumentieren; zuverlässig erst nativ | – (Plattformgrenze dokumentiert) |
| 51 | Bildschirm bleibt im Training an | – (iOS-Verhalten) | Web-Anpassung nötig | 2 | Wake Lock, wo unterstützt (neu, nach Vorgabe) | manuell (Browser): Bildschirm bleibt an |
| 52 | Rekord-Hinweis während des Trainings (6.8) | `ActiveWorkoutEngine.swift`, `InSessionRecordAcknowledgment.swift` | übernehmen | 3 | | Unit: `engine.test.ts` (Rekordhinweis) |
| 53 | Unfertige Workouts: Liste, Fortsetzen, Verwerfen (6.10) | `WorkoutDraftsView.swift` | übernehmen | 2 | | E2E: `workout.spec.ts` |
| 54 | Verlauf: Liste, Leerzustand, Zusammenfassungen (7) | `WorkoutHistoryView.swift` | übernehmen | 2 | | E2E: `workout.spec.ts` |
| 55 | Session bearbeiten und löschen, ohne XP-Änderung (7) | `WorkoutHistoryEditor.swift`, `HistorySetFields.swift` | übernehmen | 2 | | manuell (Browser): Verlauf → Training bearbeiten/löschen |
| 56 | Vergleich, Verbesserungen, Rekorde (8.1–8.3) | `WorkoutRecap.swift`, `RecordedComparison.swift` | übernehmen | 3 | Unit-Tests gegen alte Logik | Unit: `progress.test.ts` (Vergleich, Rekorde, neutrale Fälle) |
| 57 | XP pro Workout und XP-Belege (8.4) | `WorkoutProgress.swift`, `WorkoutAwardReceipt.swift` | übernehmen | 3 | | Unit: `progress.test.ts`, `engine.test.ts` (XP genau einmal) |
| 58 | Level und Ränge (8.6, 8.7) | `WorkoutProgress.swift` | übernehmen | 3 | | Unit: `progress.test.ts` (jede Levelgrenze, Ränge) |
| 59 | Recap-Texte und Regelmäßigkeit (8.8) | `WorkoutRecap.swift` | übernehmen | 3 | | Unit: `progress.test.ts` (Regelmäßigkeit) |
| 60 | Feier-Bildschirme mit XP-Animation, Rekordkarten, „Your progression“ (8.9) | `WorkoutXPRewardView.swift`, `PersonalRecordCelebration.swift`, `WorkoutRanksView.swift`, `XPRewardTimeline.swift` | übernehmen | 3 | | Unit: `progress.test.ts` (Zeitachse); manuell (Browser): Demo → Training mit Rekord |
| 61 | Profil mit drei Einheiten (9) | `LocalProfileView.swift` | übernehmen | 3 | Fußtext zu „nur lokal“ anpassen (siehe 10) | manuell (Browser): Einstellungen → Profil & Körpergewicht |
| 62 | Körpergewicht: Karte, Diagramm, Eintrag pro Tag, +25 XP, Verlauf, Korrektur, Löschen (9) | `BodyWeightViews.swift`, `LocalProfile.swift` | übernehmen | 3 | manuelle Daten, bleiben | Unit: `body.test.ts` (+25 XP/Tag, Löschen behält XP) |
| 63 | Gewichtsziel erreicht: einmalige Feier und Vorschau (9) | `WeightGoalAchievement.swift`, `WeightCheckInCelebration.swift` | übernehmen | 3 | | Unit: `body.test.ts` (einmalige Feier, Quiet Mode) |
| 64 | Körpergewicht-Ziel (abnehmen/zunehmen/halten) und „Show body-weight tracking“ (9, 11) | `BodyWeightGoal.swift`, `SettingsView.swift` | übernehmen | 3 | | Unit: `body.test.ts`; manuell (Browser): Vorschau in den Einstellungen |
| 65 | Manueller Apple Sleep Score mit Karte, Diagramm, Editor, Liste (10) | `SleepScoreEntry.swift`, `SleepViews.swift` | übernehmen | 3 | manuelle Daten, bleiben; Health-Teile der Karte entfallen | Unit: `body.test.ts` (ein Wert pro Tag, keine Zukunft) |
| 66 | Schlafdauer und -phasen aus Apple Health (18) | `SleepStore.swift`, `SleepViews.swift` | später nativ | – | | – (nativ) |
| 67 | Schritte und Tagesziel (18) | `StepsStore.swift`, `StepsViews.swift` | später nativ | – | Schrittziel-Einstellung aus dem Backup wird aufbewahrt | – (nativ) |
| 68 | Ernährung aus Health (18) | `Nutrition*.swift` | später nativ | – | | – (nativ) |
| 69 | Import von Apple-Workouts und Strava, Herzfrequenz-Diagramm (18) | `HealthWorkout*.swift`, `StravaHealthSettingsView.swift` | später nativ | – | alte importierte Einträge werden beim Import vorerst übersprungen | – (nativ) |
| 70 | Health-Archiv im Backup (18) | `HealthBackupArchive.swift` | später nativ | – | | – (nativ) |
| 71 | Einstellungen: Darstellung Dunkel/Hell/System (11) | `SettingsView.swift`, `MotionTheme.swift` | übernehmen | 1 | | Unit: `App.test.tsx` |
| 72 | Einstellungen: Sprache (11) | `SettingsView.swift` | Web-Anpassung nötig | 1 | Web kann keine iOS-Einstellungen öffnen; eigene Sprachwahl Englisch/Deutsch in der App | E2E: `app.spec.ts` |
| 73 | Einstellungen: Quiet Mode (11) | `SettingsView.swift` | übernehmen | 3 | | manuell (Browser): Quiet Mode: keine Level-Karte, keine Feier |
| 74 | Einstellungen: App-Haptik an/aus (11, 15) | `MotionHaptics.swift` | Web-Anpassung nötig | 2 | Vibration nur auf Android; Schalter bleibt, Hinweis für iPhone | Unit: `haptics.test.ts` |
| 75 | Einstellungen: Wiederholungen tracken, globale Pause 5 s–4 min (11) | `SettingsView.swift` | übernehmen | 2 | | manuell (Browser): Einstellungen → Pausen-Regler |
| 76 | Einstellungen: Pausen-Mitteilungen (6.7, 11) | `RestConfigurationViews.swift` | Web-Anpassung nötig | 2 | siehe Nr. 50; Texte an Web-Verhalten anpassen | manuell (Browser): Einstellungen → Pausen-Mitteilungen |
| 77 | Hilfe & Datenschutz (12) | `HelpPrivacyView.swift` | Web-Anpassung nötig | 6 | Texte zu Konto, Cloud und Health neu; Links zu Datenschutz und Impressum | – (Phase 6) |
| 78 | JSON-Backup exportieren (13) | `MotionBackupStore.swift`, `FullBackupSection.swift` | Web-Anpassung nötig | 3 (Export)/6 | Download statt Datei-Dialog; neues Format plus Import des alten Formats | Unit: `backup.test.ts` (Export) |
| 79 | JSON-Backup importieren mit Vorschau und Zusammenführung (13) | `MotionBackupRestore.swift`, `FullBackupSection.swift` | Web-Anpassung nötig | 5 | Upload statt Datei-Dialog; Regeln gleich | – (Phase 5) |
| 80 | CSV exportieren und importieren (13) | `CompleteCSVCodec.swift`, `WorkoutCSVImporter.swift`, `MotionBackupCSV.swift` | Web-Anpassung nötig | 5/6 | Pflicht: alle alten CSV-Formate (v1–v18 und einfache Workout-CSV) importierbar | – (Phase 5/6) |
| 81 | Demo-Modus mit synthetischen Daten (14) | `DemoSession.swift`, `SampleDataStore.swift` | übernehmen | 3 | eigene temporäre IndexedDB | E2E: `introduction.spec.ts` (Demo, persönliche Daten unberührt) |
| 82 | Alte Beispieldaten entfernen (14) | `SettingsView.swift`, `SampleDataStore.swift` | übernehmen | 5 (verschoben) | betrifft nur importierte Daten, falls vorhanden | – (Phase 5, mit dem Import) |
| 83 | Haptik-Ereignisse mit Drosselung (15) | `MotionHaptics.swift` | Web-Anpassung nötig | 2 | `src/platform/haptics`; iPhone ohne Wirkung | Unit: `haptics.test.ts` |
| 84 | Motion Pro: Paywall, Abo, Kauf wiederherstellen, Status (16) | `MotionStore.swift`, `PaywallView.swift`, `MotionProSection.swift` | später nativ | – | Käufe nur über App Store bzw. Capacitor | – (nativ) |
| 85 | Platzhalter „Advanced analytics“ und „Themes“ (16) | `MotionProSection.swift` | später nativ | – | in V1 ausgeblendet | – (nativ) |
| 86 | Widgets: Körpergewicht, PRs, Schritte, Konsistenz (17) | `MotionWidgets/*` | später nativ | – | | – (nativ) |
| 87 | Live Activity / Dynamic Island im Training (17) | `WorkoutLiveActivity.swift`, `WorkoutLiveActivityWidget.swift` | später nativ | – | | – (nativ) |
| 88 | Zweisprachige Oberfläche Englisch/Deutsch (alle) | `Localizable.xcstrings` | übernehmen | 1 | 1011 Texte, davon 707 mit deutscher Übersetzung; restliche deutsche Texte ergänze ich | Unit: `i18n.test.ts`; `scripts/missing-translations.mjs` meldet 0 fehlende |
| 89 | Barrierefreiheit: Beschreibungen, Ansagen, große Schrift, Bewegung reduzieren, hoher Kontrast | viele | Web-Anpassung nötig | 1–3 | ARIA, `prefers-reduced-motion`, `prefers-contrast`, rem-Schriftgrößen | manuell (Browser): Bewegung reduzieren, Kontrast; ARIA-Labels in den Komponenten |

## Nicht übernommen (im alten Code vorhanden, aber nirgends angezeigt)
- `DashboardReturnCard`, `ExerciseProgressCard`, `DashboardMetric`
- Tour-Bilder `Tour*.imageset`
- Interne Aktivierungs-Ereignisse `MotionActivation` / `MotionEvent`; laut Vorgabe gibt es kein Tracking

## Neu durch die Web-Version (aus deinem Auftrag, nicht aus der alten App)
- Konto mit Google-Login und E-Mail-Code, Cloud-Sync und Sync-Status
- Installationshinweis für das iPhone, Speicher-Persistenz, Wake Lock
- Einwilligung, Datenschutz-Entwürfe, Konto löschen, Datenexport JSON und CSV im neuen Format
