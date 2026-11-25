# Funktionen der alten App (Motion, iOS)

Quelle: `~/Documents/Xcode/Tracker`, Branch `motion-baseline`, Stand Commit `7b4bf9f` (02.11.2026).
Alle Dateiverweise beziehen sich auf den Ordner `Tracker/` im alten Projekt, sofern nicht anders angegeben.

Die Oberflächentexte der alten App sind englisch (Basissprache). Etwa 70 % sind zusätzlich ins Deutsche übersetzt (`Localizable.xcstrings`). Texte stehen hier im englischen Original in Anführungszeichen, damit sie 1:1 übernommen werden können.

Der Quellcode ist maßgeblich. Einige Dokumente in `Docs/` beschreiben ältere Stände (z. B. eine Opening-Animation mit „TRACKER“-Schriftzug und 1 s Dauer). Wo Code und Doku sich widersprechen, gilt der Code.

---

## 1. App-Aufbau und Navigation

Quellen: `TrackerApp.swift`, `ContentView.swift`, `AppLaunchView.swift`, `OnboardingView.swift` (`ProfileGateView`)

- Start: Datenbank öffnen → Opening-Animation (optional) → Einführung, solange sie nicht abgeschlossen ist → Haupt-App.
- Datenbank lässt sich nicht öffnen: Fehlerbild „Could not open training data“ mit Erklärung. Daten werden nie automatisch zurückgesetzt.
- Haupt-App hat 4 Tabs in dieser Reihenfolge: **Dashboard**, **Blueprints**, **History**, **Settings**. Icons: Raster (`square.grid.2x2`), Liste (`list.bullet.rectangle`), Uhr mit Pfeil (`clock.arrow.circlepath`), Zahnrad (`gearshape`).
- Ein Tab-Wechsel löst eine leichte Haptik aus.
- Deep Link `motion://dashboard` öffnet das Dashboard.
- Beim Start und bei jeder Rückkehr in die App: Pausen-Benachrichtigungen abgleichen, Live Activity abgleichen, Apple-Health-Workouts und Schritte neu lesen, Kaufstatus prüfen.
- Während eines Workouts ist die Tab-Leiste ausgeblendet.

## 2. Opening-Animation

Quellen: `OpeningAnimationView.swift`, `OpeningSculpture.swift`, `OpeningTimeline.swift`, `AppLaunchView.swift`

- Läuft beim Kaltstart, wenn die Einstellung „Opening Animation“ an ist (Standard: an) **und** kein unfertiges Workout existiert.
- Dauer 2,2 s, bei „Bewegung reduzieren“ 0,35 s (statisches Bild ohne 3D-Skulptur).
- Wird abgebrochen, wenn die App in den Hintergrund geht oder die Einstellung ausgeschaltet wird.
- Inhalt: 3D-Bänderskulptur, Horizontlinie, oben „STRENGTH IN MOTION“, Wortmarke „MOTION“, Unterzeile „MAKE EVERY REP COUNT.“. Details zu Timing und Geometrie stehen in `DESIGN.md`.
- Vorschau jederzeit über Settings → „Preview Opening“.
- Die Feier-Bildschirme und einige Sheets legen die Animation als Overlay über sich (`appOpeningOverlay`).

## 3. Einführung (Onboarding)

Quellen: `OnboardingState.swift`, `OnboardingView.swift`, `OnboardingProfileView.swift`, `OnboardingPlanPages.swift`, `OnboardingDestinations.swift`, `OnboardingPage.swift`, `OnboardingMiniDemo.swift`, `OnboardingTourPage.swift`, `OnboardingTestView.swift`, `WorkoutOnboardingSupport.swift`

### 3.1 Zustand
- Der Fortschritt wird als JSON gespeichert (`OnboardingRecord`), nur auf dem Gerät und **nicht** im Backup.
- Status: `notStarted`, `inProgress`, `completed`, `skipped`, `legacyCompleted`.
- Gespeichert werden: gewählter Weg (`template` / `ownRoutine` / `freestyle`), Filter „Ausrüstung“ (Standard „Machines & cables“) und „Zeit“ (Standard 20 Minuten), bestätigter Plan, Name der eigenen Routine, ausstehendes Ziel nach der Einführung und drei erledigte Tipps.
- Gibt es schon Daten, aber keinen Einführungs-Datensatz (Update einer alten Version), gilt die Einführung als erledigt (`legacyCompleted`).
- Beim Abschluss wird bei Bedarf ein internes Profil mit dem Namen „Motion“ und der Einheit kg angelegt.

### 3.2 Ablauf
1. **Profil** (nur wenn noch kein Profil existiert und der Schritt nicht übersprungen wurde). Kategorie „YOUR PROFILE“. Bei Ziel 6 Schritte, sonst 4:
   1. „Make Motion yours“ – Name (max. 40 Zeichen, leer → „Motion“)
   2. „Your preferred unit“ – kg/lb für das Körpergewicht
   3. „Your starting point“ – aktuelles Gewicht, optional
   4. „A goal of your own“ – Schalter „Set a weight goal“
   5. „Choose your direction“ – Lose/Gain
   6. „Your target weight“ – Zielgewicht
   - Prüfungen: „Use up to 40 characters for your name.“, „Enter a valid current weight.“, „Enter your current and target weight to set a goal.“, „For weight loss, your target must be below your current weight.“, „For weight gain, your target must be above your current weight.“
   - Wechselt man die Einheit, werden schon eingegebene Werte umgerechnet. „Skip for now“ überspringt den ganzen Profilschritt.
2. **Training**, Kategorie „YOUR TRAINING“, 3 Seiten:
   - Seite 1 „Log today. Pick up here next time.“ mit dem Hinweis „No registration. Your training data stays on this device.“ und „How it works“ (Mini-Demo)
   - Seite 2 „Your first workout. Your way.“: „Start with a template“, „Create my own routine“, „Train without a template“ und „More ways to start“
   - Seite 3 „More ways to start“: „Restore backup“, „Cardio“, „Import from Apple Health“
   - Immer verfügbar: „Explore first“ (Einführung überspringen)
   - Bei sehr großer Schrift erscheinen die Auswahlen als Menü.
3. **Vorlage**, Kategorie „YOUR TEMPLATE“: Ausrüstung → Zeit (20/30/45 min) → Vorlage wählen → jede Übung einzeln ansehen → „Use template“.
4. **Eigene Routine**, Kategorie „YOUR ROUTINE“: Name eingeben → „Create routine“ → Blueprint-Detail.
5. **Freestyle**, Kategorie „FREESTYLE“: „Start workout“ → aktives Workout.
- Nach der Einführung führt das Dashboard einmalig zum gewählten Ziel (Plan-Auswahl, Routine, Freestyle, Backup wiederherstellen, Cardio, Health-Import). Existiert die Routine nicht mehr: „This routine is no longer available. Choose another starting point.“

### 3.3 Mini-Demo „How it works“
- 3 Seiten mit Beispielwerten, es wird nichts gespeichert („Example — not saved“): „Record a set.“ → „One tap to finish.“ → „This is how you find your starting point again.“ → „Start my own training“.
- Aufrufbar aus der Einführung und aus Settings.

### 3.4 Lerntipps im ersten Workout
- „Enter what you did. Tap the checkmark to complete the set.“ (am ersten Satz)
- „These were your last values. Use them or adjust them.“ (am ersten Satz mit Vorwert)
- Beide lassen sich mit „Got it“ ausblenden. Nach dem ersten gespeicherten Workout erscheint statt der großen Feier „Workout saved.“ mit „Next time, you can use these values as your starting point.“

### 3.5 Einführung testen
- Settings → „Test onboarding“ startet die echte Einführung in einem Wegwerf-Speicher („Onboarding test · Changes are not saved“).

## 4. Dashboard

Quellen: `DashboardView.swift`, `DashboardComponents.swift`, `DashboardStatistics.swift`, `TrainingPlanDashboard.swift`, `DashboardBlueprintPicker.swift`, `WorkoutDraftsView.swift`, `PastWorkoutPicker.swift`

Von oben nach unten (aktualisiert sich jede Minute):
1. Datum (z. B. „MONDAY, NOV 2“) und die Begrüßung „<Name>,\nyour training in perspective.“. Heißt das Profil „Motion“ oder gibt es keines: „Your training,\nin perspective.“
2. Offene Entwürfe: „Continue workout“ mit dem Namen des neuesten Entwurfs und „Unfinished workouts (N)“.
3. Start-Karte „YOUR NEXT SESSION“:
   - Ohne aktiven Trainingsplan: „Start workout“ / „Choose your blueprint. Make it count.“ → Auswahl-Bildschirm. Darunter „Plan your training“ oder „Training plan“ und ggf. ein Hinweis auf ein Planproblem.
   - Mit aktivem Plan: „Start workout“ (bzw. „Start early“, wenn die Session erst später fällig ist) mit dem Blueprint-Namen. Darunter das Fälligkeitsdatum: „Whenever you're ready“, „Today“ oder ein Datum. Dazu das Menü „Choose another workout“, „Edit training plan“, „Replace planned session“, „Skip session“.
   - Session überspringen: „Skip this planned session?“ / „Moves to the following session without saving a workout or awarding XP.“
4. „Log past workout“ → Workout nachtragen (siehe 6.6).
5. Level-Karte (nicht im Quiet Mode).
6. Körpergewicht-Karte (wenn „Show body-weight tracking“ an ist).
7. Schlaf-, Schritte- und Ernährungskarten. Im Demo-Modus steht stattdessen „Demo · Apple Health is disconnected“.
8. „Calendar weeks“ / „Monday–Sunday · 5 full weeks and this week“ mit dem Balkendiagramm „Consistency“ und der Kennzeichnung „6 WEEKS“.
9. „Recorded load bests“ / „Heaviest completed external-load working sets. Not a strength estimate. Tap to edit a load goal.“ mit Bestwert-Liste. Antippen öffnet den Lastziel-Editor.

### 4.1 Auswahl-Bildschirm „Start workout“ (Vollbild)
- „Make time for you.“ / „Choose your training. Find your rhythm.“
- Umschalter „Strength“ / „Cardio“
- Hervorgehobene Zeile „Freestyle strength“ („Build your session as you go“) bzw. „Freestyle cardio“ („Choose an activity and log your session“)
- Bei Kraft zusätzlich „Browse Starter Plans“
- „YOUR BLUEPRINTS“ mit „Manage“ (springt zum Blueprints-Tab). Jede Zeile zeigt Name und „N exercises · N sets“ bzw. die Cardio-Art. Ohne Blueprints: „No strength|cardio blueprints yet. Start freestyle or create a plan in Blueprints.“ Leere Blueprints sind deaktiviert.
- Bei Cardio: „Import from Apple Health“ und „Import from Strava“

### 4.2 Statistik-Regeln (`DashboardStatistics.swift`)
- Zählt nur abgeschlossene Workouts, die keine Beispieldaten sind und deren Datum nicht in der Zukunft liegt.
- **Wochen:** ISO-Wochen von Montag bis Sonntag, 5 volle Wochen plus die aktuelle. Beschriftung „Week <Kalenderwoche>“. Die aktuelle Woche ist jadefarben hervorgehoben. Die Y-Achse geht mindestens bis 3.
- **Bestwerte:** Für jede Übung mit Krone (PR-Tracking) die schwerste Session. Eine Session zählt mit ihrem Top-Satz: höchstes Gewicht, bei Gleichstand die meisten Wiederholungen. Gewertet werden nur Arbeitssätze mit „Load & reps“. Übungen ohne Bibliotheksverknüpfung heißen „<Name> · Unlinked · <Datum>“.
- **Leerer Zustand:** „No recorded load best yet.“ / „Enable the crown on an exercise and finish a workout to see its best weight here.“
- **Zeile mit Ziel:** silberner Fortschrittsbalken, „Goal · X“ und „Goal reached“ oder „X to go“. Ohne Ziel: „Set your next target“.

## 5. Blueprints-Tab

Quellen: `BlueprintListView.swift`, `BlueprintDetailView.swift`, `TrainingStructureControls.swift`, `RoutineGuidanceEditor.swift`, `RoutineGuidance.swift`, `PlanChooser.swift`, `StarterPlans.swift`, `CardioViews.swift`, `PRGoalsView.swift`, `ExerciseLibraryView.swift`, `ExerciseBrowser.swift`, `ExerciseEditor.swift`, `ExerciseHistoryMappingView.swift`, `TrainingPlanEditor.swift`

### 5.1 Navigation im Tab
- Oben die große Schaltfläche „Blueprints“, darunter drei kleine: „PR Goals“, „Exercises“, „Cardio“.
- Der Titel wechselt mit: „Blueprints“, „PR Goals“, „Exercises“, „Cardio“.

### 5.2 Blueprint-Liste
- Feste Einträge oben: „Training plan“ (öffnet den Plan-Editor), „Browse Starter Plans“, „Start Freestyle“.
- Danach alle Blueprints nach Name sortiert, jeweils mit „N exercises“ bzw. der Cardio-Aktivität. Wischen löscht.
- Plus oben rechts („Create blueprint“) öffnet „New Blueprint“: Name, Umschalter „Strength“/„Cardio“, bei Cardio die Zielwerte.
- **Gratis-Limit:** Ohne Motion Pro lassen sich höchstens 3 Blueprints über diesen Plus-Knopf anlegen, danach erscheint die Paywall. Andere Wege wie Vorlage kopieren, „Create my own routine“ oder die Einführung prüfen das Limit **nicht**.

### 5.3 Blueprint-Detail
- Name bearbeiten (Platzhalter „e.g. Push, Pull or Legs“). Gespeichert wird beim Bestätigen oder Verlassen, ein leerer Name wird ignoriert.
- Übungsliste: Sortieren per „Edit“, Wischen zum Entfernen. Leer: „Add an exercise to get started.“ Fußtext: „Targets, measurement, notes and rest overrides belong to this routine. Manage shared exercise PR tracking in the exercise library. Tap Edit to drag exercises into order, or swipe left to remove one.“
- Jede Übungszeile enthält:
  - Name, bei PR-Tracking eine Krone
  - „N working sets“ (1–1000)
  - Messart
  - „N warm-up sets“ (0–20)
  - Superset-Gruppe (None, A–D) mit dem Hinweis „Same group: alternate working sets in routine order, then rest. Each exercise keeps its own results. Targets and measurement edits apply only to this routine’s future sessions.“
  - Zielzusammenfassung und „Rest: Ns“
  - „Targets, rest & notes“ (öffnet den Editor)
- „Add Exercise“: „Browse exercise catalogue“, „Choose Existing Exercise“, „New Exercise“ (Name und Satzanzahl, Standard 3).
- Übung schon enthalten: „This exercise is already in the blueprint. Adjust its target sets in the exercise list.“
- Unten fest: „Start Workout“, deaktiviert ohne Übungen, dann mit „Add an exercise to start your workout.“

### 5.4 Ziele, Pause und Notizen pro Routine-Übung
Diese Einstellungen gelten nur für diese Routine.
- **Messart:** „Load & reps“, „Bodyweight reps“, „Assisted reps“, „Duration“. Ein Wechsel leert die Ziele und die Progression.
- **Ziele:** „Minimum reps“/„Maximum reps“ (1–1000, min ≤ max) oder „Duration target (seconds)“ (1–604.800). Alles optional.
- **Pause:** „Rest override (seconds)“, 5–3600.
- **Notizen:** max. 2000 Zeichen.
- **Progression:** „Not selected“, „Keep targets steady“, „Build repetitions first“ (nicht bei Dauer), „Build external load“ (nur Last), „Build duration“ (nur Dauer). Das ist nur eine gespeicherte Vorliebe, die App ändert nie automatisch Ziele.
- **Fehlertexte:** „Keep notes within 2,000 characters.“, „Rest must be 5–3,600 seconds.“, „Timed exercises cannot have rep targets.“, „Duration must be 1–604,800 seconds.“, „Rep exercises cannot have duration targets.“, „Enter both rep bounds, from 1–1,000, with minimum no greater than maximum.“, „Choose a progression preference compatible with this measurement.“, „Use whole numbers, or leave optional targets blank.“
- **Pausendauer, Rangfolge:** Routine-Übung → Bibliotheks-Übung → globale Einstellung (Standard 90 s).
- **Anzeige:** „Target: 8–12 reps per working set“ bzw. „Target: N seconds per working set“ und „Preference: … · no automatic adjustments“.

### 5.5 Starter-Vorlagen (`StarterPlans.swift`, `PlanChooser.swift`)
| ID | Name | Ausrüstung | Minuten | Sätze/Übung | Übungen |
|---|---|---|---|---|---|
| full-quick | Full Body · Start Simple | Machines & cables | 20 | 1 | Leg Press, Seated Leg Curl, Chest Press, Lat Pulldown, Calf Raise, Plank |
| full-machines | Full Body · Machines | Machines & cables | 35 | 2 | wie oben |
| full-dumbbells | Full Body · Dumbbells | Dumbbells & bench | 30 | 2 | Goblet Squat, Split Squat, Dumbbell Bench Press, Dumbbell Row, Plank |
| push | Push | Full gym | 35 | 3 | Bench Press, Overhead Press, Triceps Pushdown |
| pull | Pull | Full gym | 35 | 3 | Deadlift, Barbell Row, Lat Pulldown |
| legs | Legs | Full gym | 35 | 3 | Squats, Leg Press, Calf Raise |

- **Passende Vorlagen:** Ausrüstung gleich oder „Full gym“ gewählt, und Minuten ≤ Zeitbudget.
- **Kopieren einer Vorlage:** Es entsteht ein neuer Blueprint. Vorhandene Bibliotheks-Übungen werden über Katalog-ID und Messart wiederverwendet. Jede Übung bekommt 8–12 Wiederholungen (nicht bei Dauer), 90 s Pause und als Notiz die Katalog-Anleitung plus „ Choose a manageable effort; no starting weight is prescribed.“ (bei Dauer: „ Choose a comfortable hold duration; no fixed target is supplied.“).
- **Auswahl-Bildschirm:** Abschnitte „Equipment & time“, „Matching templates“ (max. 3, die erste trägt „Matches your equipment & time“), „All other templates“ und „Other starting points“. Gibt es keine passende Vorlage: „No starter matches both choices. Try more time, browse alternatives, or start freestyle.“
- Die Beschreibungstexte jeder Vorlage stehen in `StarterPlans.swift`, Zeilen 21–52.

### 5.6 Übungskatalog (`ExerciseCatalogue.swift`)
- 36 feste Bewegungen mit Katalog-ID, Name, Ausrüstung, Muskelgruppe, Messart und Anleitungstext (Zeilen 34–69). Die komplette Liste steht in `DATENMODELL.md`, Abschnitt Katalog.
- „Farmer Carry“ hat die Messart „Distance & duration“ und kann nicht geloggt werden („logging unavailable“).
- **Abgleich:** Eine Bibliotheks-Übung ohne Metadaten, deren Name eindeutig gleich lautet (Groß-/Kleinschreibung egal), bekommt automatisch die Katalog-Metadaten.

### 5.7 Übungsbibliothek („Exercises“)
- **Suche** (Platzhalter „Name, equipment or muscle“) durchsucht Name, Ausrüstung, Muskel und Anleitung. Dazu kommen drei Filter:
  - Ausrüstung: Barbell, Dumbbell, Cable, Machine, Bodyweight, Other
  - Muskel: Chest, Back, Shoulders, Legs, Posterior chain, Calves, Arms, Core, Other
  - Messart
- **Abschnitte:**
  - „Your exercises“: Name und „Progress tracking“ bzw. „History only“
  - „Starter catalogue · 36 movements“: Name und „Ausrüstung · Muskel“
  - Hinweis: „Load, bodyweight, assistance and duration logging are supported. Distance-based set logging is not available.“
- **Katalog-Eintrag antippen:**
  - Anleitung und der Text „Already saved under another name? …“
  - „Use <Name>“ für jede eigene Übung
  - „Add as a new movement“: Bei mehreren Treffern erscheint „Multiple saved exercises match. Choose the correct entry explicitly.“
- **Neue eigene Übung (Plus):**
  - Der Name muss eindeutig sein, sonst „That name already exists.“
  - Neue Übungen sind zunächst „History only“.
- **Übung bearbeiten („Edit Exercise“):**
  - Name, Ausrüstung, Muskel, Messart, „Setup and notes“, Schalter „Track progress“
  - Wenn „Track progress“ an ist: Unter „Include historical results · optional“ lassen sich frühere „History only“-Einträge gezielt mit der Übung verknüpfen. Es wird nichts automatisch ausgewählt.
  - Doppelter Name: „That name is already in your library.“
  - „Delete Exercise“ entfernt die Übung aus der Bibliothek und allen Routinen, der Verlauf bleibt erhalten.
- **„History links“:** Jeder frühere Übungseintrag lässt sich mit einer Bibliotheks-Übung verknüpfen oder bewusst unverknüpft lassen („Leave unlinked“). Namen und XP ändern sich dadurch nie.
- **Besonderheit:** Für die Krone (PR-Tracking) gibt es in der alten Oberfläche **keinen eigenen Schalter** mehr. Sie wird gesetzt, wenn man ein Lastziel speichert, und kommt sonst nur aus alten Daten oder Backups. Mehrere Texte verweisen trotzdem auf „the crown“ (siehe offene Fragen).

### 5.8 PR-Ziele („PR Goals“)
- Kopf: „Recorded load goals.“ und eine Erklärung.
- Liste aller Übungen mit „Load & reps“. Jede Karte zeigt den bisherigen Bestwert, das Ziel und einen Fortschrittsbalken in Champagner: „X / Y · Goal reached|Keep building“ oder „Set a goal“.
- Leer: „Add an exercise first“ / „Create an exercise in a blueprint to set its goal.“
- **Lastziel-Editor:**
  - Ziel in kg/lb, muss positiv sein.
  - Speichern schaltet das PR-Tracking dieser Übung ein. „Remove goal“ löscht das Ziel.
  - Fußtext: „Aim for a positive weight. Reaching a goal fills the progress bar; you can then choose a new target.“

### 5.9 Trainingsplan (`TrainingSchedule.swift`, `TrainingPlanStore.swift`, `TrainingPlanEditor.swift`)
- **Grundeinstellungen:**
  - Schalter „Training plan active“. Pausieren behält Reihenfolge und Fortschritt.
  - Modus „Rotation“ oder „Fixed weekdays“. Ein Moduswechsel leert die Zuordnungen.
  - „Start date“.
- **Rotation:**
  - Geordnete Liste von Blueprints (max. 100, Wiederholungen erlaubt) mit einem Zeiger auf die nächste Session („Next position“).
  - Optional „Training days“ (Mo–So). Ohne Trainingstage gibt es eine Rotation ohne Datum („Whenever you're ready“).
  - Eine abgeschlossene Session rückt den Zeiger um 1 vor.
  - Mit Trainingstagen ist die nächste Session frühestens am Tag danach fällig.
  - Verpasste Tage behalten dieselbe nächste Session.
- **Feste Wochentage:**
  - Jedem Wochentag ist ein Blueprint oder „Rest day“ zugeordnet.
  - Eine erledigte oder übersprungene Session wird pro Tag als verbraucht markiert. Die nächste ist der nächste geplante Tag.
- **Fortschritt beim Speichern eines Workouts:**
  - Die Session wurde aus dem Plan gestartet (Ticket): Der Plan rückt vor.
  - Ohne Ticket: Ein Cardio-Workout von heute erfüllt den heute fälligen Rotations-Slot, wenn dort ein Cardio-Blueprint mit derselben Aktivität steht. Das klappt höchstens einmal pro Tag.
  - Nachgetragene Workouts und Health-Importe bewegen den Plan nie.
- **Änderungen am Plan:** Werden Zuordnungen, Datum oder Zeiger geändert, verlieren offene Tickets ihre Gültigkeit (neue Revision).
- **Problemmeldungen:** „Review the training plan settings.“, „Add a blueprint to your training plan.“, „A planned blueprint was deleted. Edit your training plan to replace it.“, „A planned blueprint is not ready to start. Review its exercises and targets.“
- **Vorschau** im Editor: „Next session“ mit Name und Datum, bzw. „Plan paused. You can still choose any workout.“
- **Blueprint wählen** („Choose blueprint“): Nicht startbare Blueprints sind deaktiviert. Ohne Blueprints: „Create a blueprint first, then add it to your plan.“

### 5.10 Cardio (`CardioSession.swift`, `CardioViews.swift`)
- **Aktivitäten:** Running, Bicycle, Swimming, Walking, Rowing, Elliptical, Other cardio.
- **Eingabe:** „Time · minutes“, „Distance · km|mi“, „Pace · min:sec/km (optional)“. Die Pace darf als „5:30“ oder als Dezimalminuten („5.5“ / „5,5“) eingegeben werden. Bleibt sie leer, wird sie aus Zeit und Distanz berechnet. Angezeigt wird „Calculated pace“.
- **Gültig ist eine Eingabe, wenn:**
  - die Dauer größer als 0 und höchstens 604.800 s ist,
  - die Distanz größer als 0 und höchstens 10.000 km ist,
  - die Pace höchstens um max(1 s, 1 %) von Zeit ÷ Distanz abweicht.
- **Fehlertexte:** „Enter pace as min:sec (5:30) or decimal minutes (5.5 or 5,5).“, „Enter a positive duration and distance. Pace must match time divided by distance.“
- **Cardio-Blueprint:** Aktivität, Zielzeit und Zieldistanz. Wird eine Pace eingegeben, berechnet die App daraus die Zielzeit.
- **Cardio-Session:**
  - Felder vorbelegt aus dem Blueprint, dazu Notizen und „Finish cardio“.
  - Danach „Cardio complete“ mit „+100 XP“ und dem Text „Duration and distance saved. Training conditions and intended effort are not recorded, so no improvement claim is made.“
  - Cardio gibt **nur** die 100 Abschluss-XP.
- **Kein Entwurf:** Eine Cardio-Session wird erst beim Abschluss gespeichert.
- **Cardio-Bereich im Blueprints-Tab:** „Start cardio“ (7 Aktivitäten) und „Cardio blueprints“ mit „Create cardio blueprint“.

## 6. Training aufzeichnen (aktives Workout)

Quellen: `ActiveWorkoutEngine.swift`, `ActiveWorkoutView.swift`, `WorkoutSetInput.swift`, `WorkoutSetRow.swift`, `WorkoutSessionEdits.swift`, `WorkoutSessionEditControls.swift`, `ActiveWorkoutRest.swift`, `RestTimerState.swift`, `FloatingRestTimer.swift`, `RestConfigurationViews.swift`, `RestNotifications.swift`, `FreestyleExercisePicker.swift`, `InSessionRecordAcknowledgment.swift`, `WorkoutNotesSection.swift`, `TrainingStructure.swift`

### 6.1 Starten
- **Aus einem Blueprint:**
  - Prüfungen vor dem Start: „Add exercises with at least one target set before starting.“ und „Review this routine’s targets and measurement types before starting.“
  - Jede Übung wird als **Momentaufnahme** kopiert: Name, Messart, Ziele, Superset und Pause. Spätere Änderungen an der Bibliothek ändern den Verlauf nicht.
  - Sätze: zuerst die Aufwärmsätze, dann die Arbeitssätze.
- **Freestyle:** Ein Workout „Freestyle“ ohne Übungen; Übungen kommen über „Add Exercise“ dazu.
- **Gespeichert wird sofort** als Entwurf. Jede Änderung speichert mit 300 ms Verzögerung, beim Verlassen oder Wechsel in den Hintergrund sofort.
- **Konflikt mit einem offenen Entwurf:** Dialog „Unfinished workout“ mit „Resume unfinished workout“, „Keep for later and start new“, „Discard and start new“ (Rückfrage „This permanently deletes this draft and its sets.“) und „Cancel“.

### 6.2 Vorwerte („Previous“)
- Für Arbeitssatz Nr. i wird Arbeitssatz Nr. i der **letzten abgeschlossenen** Session derselben Übung (gleiche Identität) angezeigt, und nur bei gleicher Messart.
- **Anzeigetexte:**
  - „Previous: 60 kg × 8 reps · 3 Nov 2026“
  - bei Bodyweight bzw. Assisted mit „ added“ bzw. „ assistance“
  - ohne Lastvergleich zusätzlich „ · no load-based progression“
  - bei Dauer „Previous: 30 seconds · no load-based progression“
  - Aufwärmsatz: „Warm-up · excluded from working totals and progression“
  - ohne Vorwert: „Baseline · no comparable previous working set“
- **Schnellaktionen:**
  - „Use last“ übernimmt den Vorwert
  - „Copy previous set“ übernimmt den vorherigen Satz derselben Übung, wenn dieser nicht übersprungen ist und denselben Aufwärm-Status hat
  - „Clear“ leert den Satz

### 6.3 Satz-Zeile
- **Menü** „Warm-up set“/„Working set“ mit: „Undo completion“, „Use last“, „Copy previous set“, „Clear“, „Make working set“/„Make warm-up“, „Skip set“/„Unskip set“, „Remove set“.
- **Felder:**
  - Menge: Gewicht, „Added load (optional)“, „Assistance“ oder Dauer in Sekunden, mit Einheit
  - Wiederholungen
  - Abhak-Kästchen
- **Wann Wiederholungen nötig sind:**
  - bei Dauer nie
  - bei „Load & reps“ nur, wenn „Track Repetitions“ an ist
  - sonst immer
- **Zahleneingabe:** nur Ziffern, Punkt oder Komma, höchstens 2 Nachkommastellen, keine Tausendertrennzeichen. Bei Bodyweight bedeutet ein leeres Feld 0.
- **Abgehakt:** „Set recorded.“ und „Undo“, die Zeile wird leicht grün hinterlegt.
- **Fehlertexte beim Abhaken:**
  - „Enter a duration greater than zero, up to 604800 seconds.“
  - „Enter a nonnegative weight|added load (optional)|assistance and a positive rep count when required.“
- **Übersprungene Sätze** sind ausgegraut und gesperrt.
- **Entfernen:** Nachfrage „Remove this set?“ / „Use Undo edit in workout options to restore this set.“. Nichts wird physisch gelöscht, die Daten bleiben für „Undo“ erhalten.
- **Tastatur-Leiste:** „Next“ springt zum nächsten Feld (Gewicht → Wiederholungen → nächster Satz), „Done“ schließt die Tastatur.

### 6.4 Supersets
- Übungen derselben Gruppe (A–D) laufen abwechselnd: erst alle Aufwärmsätze, dann Runde 1 jeder Übung, Runde 2 usw.
- Die Pause startet erst, wenn alle Übungen der Runde erledigt oder übersprungen sind. Ein Aufwärmsatz startet immer eine Pause.
- Die Reihenfolge wird erzwungen: „Superset order: complete or skip <Übung> set N first.“

### 6.5 Workout-Optionen und Bearbeiten während des Trainings
- **Kopfbereich:** „Completed sets n / N“ und „Next: <Übung> · set N“.
- **Lasteinheit:** „Training load unit: kg“ (kg/lb, gilt fürs Profil). Ist eine Eingabe unvollständig: „Finish or clear the current load before changing units.“
- **„Workout options“:**
  - „N working · N warm-up sets completed“
  - „Undo edit“: bis zu 100 Schritte, bleibt beim Neustart erhalten
  - „Switch to Freestyle“
  - „Leave to save a draft. Routine changes apply only to this workout.“
- **Freestyle:** „Add Exercise“ öffnet die Auswahl aus Bibliothek/Katalog oder legt eine eigene Übung an.
  - Eigene Übungen sind „History only“: im Verlauf sichtbar, aber ohne Statistik, Rekorde und Verbesserungs-XP.
  - Schon verwendete eigene Namen stehen unter „Saved custom exercises · history only“.
  - Fehlertexte: „Enter an exercise name.“, „This exercise is already in your workout. Use Add Set instead.“, „Choose the existing exercise from the library to retain its tracking.“, „Logging for this measurement type is not available yet.“
- **Pro Übung:**
  - „Add Set“
  - „Exercise options“: Ziele, Superset-Gruppe, Pausenwahl nur für diese Session („Rest default: 90s · global“ mit 30–600 s oder „Use global default“), „Start rest“
  - „Edit exercise“: „Replace exercise“, „Move up“, „Move down“, „Remove exercise“
  - Ersetzen: Erledigte Sätze behalten die alte Übung, offene werden übersprungen, und das Workout wird zu Freestyle.
- **Notizen:** Abschnitt „Workout notes“ mit „Optional: how it felt, technique reminders or plans for next time.“
- **„Finish“:** Sind nicht alle Sätze erledigt, fragt die App „Finish this session?“ mit Zusammenfassung „N completed · N unfinished · N skipped · N removed. …“ und „Save completed sets“ / „Keep training“. Mindestens ein erledigter Satz ist nötig.

### 6.6 Workout nachtragen („Log past workout“)
- Datum (bis heute), optional mit Uhrzeit, dann Freestyle oder ein Kraft-Blueprint.
- Unterschiede zum normalen Workout:
  - kein Pausen-Timer
  - kein Trainingsplan-Fortschritt
  - Vorwerte nur aus Workouts **vor** diesem Datum
- XP werden normal vergeben.

### 6.7 Pausen-Timer
- Startet automatisch nach einem abgehakten Satz, außer wenn alle Sätze fertig sind oder das Workout nachgetragen wird. Manueller Start über „Start rest“.
- **Gespeichert wird der Endzeitpunkt**, nicht die Restzeit. Der Timer stimmt deshalb nach Sperren, Wechseln oder Neustart.
- **Leiste unten:**
  - „Rest m:ss“ bzw. „Rest complete“ (4 s lang) bzw. „Rest timer“, darunter der Übungsname oder „Starts after a completed set“
  - „Stop“
  - Menü: „Restart last interval“, „Skip rest“, „Cancel timer“, „Rest notifications…“
- **Regeln:**
  - Wird der auslösende Satz bearbeitet oder rückgängig gemacht, bricht die Pause ab. „Undo“ startet nie eine alte Pause neu.
  - Läuft die Zeit im Vordergrund ab: Erfolgs-Haptik und Ansage „Rest complete. Ready for your next set.“
  - Nach Rückkehr aus dem Hintergrund wird eine abgelaufene Pause still beendet.
  - Grenzen: Dauer 1–3600 s, global einstellbar 5–240 s (Standard 90).
- **Benachrichtigungen** (optional, nur nach Zustimmung): eine lokale Mitteilung „Rest complete“ / „Your rest after <Übung> is complete.“, wenn die App im Hintergrund ist. Im Vordergrund erscheint kein Banner. Beim Abschließen oder Verwerfen wird die Mitteilung gelöscht. Die Einstellungsseite „Rest notifications“ erklärt Status und Verhalten.

### 6.8 Rekord während des Trainings
- Hakt man einen Arbeitssatz mit einem neuen Höchstgewicht ab, erscheint unter dem Satz „Recorded load · <Übung>: <Last>.“ mit Krone und Schließen-Knopf. Dazu kommen Erfolgs-Haptik und eine VoiceOver-Ansage, im Quiet Mode nichts davon.
- Voraussetzungen: PR-Tracking an, Arbeitssatz, „Load & reps“. Die erste Session einer Übung legt nur die Basis fest. Der neue Wert muss den bisherigen Bestwert um mehr als 0,011 kg übertreffen.

### 6.9 Abschluss
- Beim Speichern werden Recap und XP berechnet (siehe Abschnitt 8). Der XP-Beleg verhindert eine doppelte Vergabe, der Plan rückt vor, Timer und Mitteilung werden beendet.
- Danach erscheint im Normalfall der Vollbild-Feierbildschirm. Im Quiet Mode oder beim allerersten Workout kommt der schlichte Bildschirm „Workout saved.“.

### 6.10 Unfertige Workouts
- Liste „Unfinished workouts“ mit Name, Datum und „N completed sets“. Wischen „Discard“ fragt „Discard unfinished workout?“.
- Leer: „No unfinished workouts“. Ein gelöschter Entwurf zeigt „Workout unavailable“ / „This draft has been removed.“

## 7. Verlauf (History-Tab)

Quellen: `WorkoutHistoryView.swift`, `WorkoutHistoryEditor.swift`, `HistorySetFields.swift`

- **Kopf:** „The work you put in.“ und „N saved sessions“, darüber die offenen Entwürfe.
- **Einträge,** neueste zuerst:
  - großer Tag und Monat, Name, Wochentag/Jahr/Uhrzeit
  - Zusammenfassung „N exercises · N working · N warm-up“ bzw. die Cardio-Zusammenfassung „Running · 30 min · 5 km · 6:00 /km“
  - Notizen (2 Zeilen), bis zu 3 Übungs-Chips
- **Leer:** „Your story starts here“ / „Finish a workout to save it here.“
- **Antippen öffnet „Edit Session“:**
  - Name, Datum, Notizen, bei Cardio die Cardio-Felder
  - Hinweis auf nicht ausgeführte Sätze
  - Superset-Gruppen
  - pro erledigtem Satz: Aufwärmen ja/nein, Wert, Wiederholungen
  - „Delete workout“ (nicht umkehrbar)
- **Regeln beim Bearbeiten:**
  - Änderungen ändern **nie** die verdienten XP.
  - Nur bei „Load & reps“ dürfen die Wiederholungen leer sein.
  - Die Messart bleibt unverändert.
  - Wird ein Workout gelöscht, fallen seine XP weg.

## 8. Fortschritt: Verbesserungen, Rekorde, XP, Level, Ränge

Quellen: `WorkoutRecap.swift`, `RecordedComparison.swift`, `WorkoutProgress.swift`, `WorkoutAwardReceipt.swift`, `XPRewardTimeline.swift`, `WorkoutXPRewardView.swift`, `WorkoutProgressCard.swift`, `WorkoutRanksView.swift`, `PersonalRecordCelebration.swift`

### 8.1 Vergleichbarkeit
Eine Übung in einem Workout ist nur vergleichbar, wenn **alle** Bedingungen erfüllt sind:
- Sie ist mit der Bibliothek verknüpft, nicht „History only“, nicht entfernt und keine Beispieldaten.
- Ihre Messart ist „Load & reps“ oder „Bodyweight reps“.
- Gültige Ziele mit Minimum **und** Maximum an Wiederholungen sind gesetzt.
- Die Progression ist „Build external load“ oder „Build repetitions first“.
- Alle Arbeitssätze sind erledigt, mit Gewicht ≥ 0 und Wiederholungen > 0.

Verglichen wird **nur mit der jüngsten früheren Session** derselben Übung. Ältere, leichtere Sessions werden nie als Vergleichsbasis gesucht. Zusätzlich müssen Übung, Messart, Anzahl der Arbeitssätze, Min/Max-Wiederholungen, Progression und Notizen gleich sein.

### 8.2 Verbesserungen
- **Last-Verbesserung:** Das Top-Gewicht ist um mehr als 0,011 höher, die Messart ist „Load & reps“, kein Satz hat weniger Wiederholungen oder weniger Last, und mindestens ein Satz hat mehr Last.
- **Wiederholungs-Verbesserung:** Alle Lasten sind gleich (±0,011), kein Satz hat weniger Wiederholungen, und mindestens ein Satz hat mehr.

### 8.3 Rekord
Eine Übung erzielt einen Rekord, wenn:
- das PR-Tracking an ist,
- sie in dieser Session eine Last-Verbesserung hat,
- und ihr Top-Gewicht das Allzeit-Maximum aller früheren Sessions um mehr als 0,011 übertrifft.

### 8.4 XP pro Workout
- Abschluss: **+100**
- pro verbesserter Übung **+25**
- pro Rekord-Übung **+75** statt der 25
- Pro Übung gibt es höchstens 75 Bonus-XP. Cardio gibt nur 100.
- Ein Beleg pro Session (`WorkoutAwardReceipt`) verhindert eine doppelte Vergabe. Historische XP werden nie neu berechnet.
- Beispieldaten und Workouts aus alten CSV-Importen bringen keine XP.

### 8.5 XP fürs Körpergewicht
- **+25** einmal pro Kalendertag beim ersten Eintrag.
- Der Beleg bleibt auch, wenn der Eintrag gelöscht wird.

### 8.6 Level
- Ein Level kostet 200 + min(Level−1, 8) × 50 XP, also 200, 250, … und ab Level 9 jeweils 600.
- Schwellen: L1 0, L2 200, L3 450, L4 750, L5 1100, L6 1500, L7 1950, L8 2450, L9 3000, danach +600 pro Level.

### 8.7 Ränge
Alle 5 Level ein neuer Rang:
| Rang | ab Level | Symbol |
|---|---|---|
| Foundation | 1 | Raute |
| Momentum | 6 | Blitz |
| Vanguard | 11 | Schild |
| Elite | 16 | Krone |
| Master | 21 | Stern |
| Legend | 26 | Lorbeer |

Ab Level 26 steigen die Level weiter, der Rang bleibt Legend.

### 8.8 Recap-Texte
- **Erste Session überhaupt:** „First recorded session: a baseline, not an improvement claim.“
- **Sonst:** „Compared N exercises with their most recent recorded session. Matching identity, measurement, explicit targets and complete working sets are required. Missing context, changed targets and easier plans are not failed progress.“
- **Regelmäßigkeit:** ab 3 Trainingstagen in den letzten 28 Tagen „Training recorded on N distinct days in the 28 days ending with this session.“. Das bringt keine XP.

### 8.9 Feier-Bildschirme
- **Mit XP:**
  - Kopf „WORKOUT“, darunter „SESSION COMPLETE“, „LEVEL UP“ oder „RANK UNLOCKED“
  - Überschrift „You earned this.“, „Level N“ oder der Rangname
  - „+N XP“ zählt in 1,8 s hoch, die Level-Karte füllt sich mit
  - Aufschlüsselung „Workout complete“, „Load or rep improvements · N“, „Load records · N“
- **Danach:**
  - Karte „RECORDED LOAD IMPROVEMENTS“ (alt → neu, „+X kg“)
  - Wiederholungs-Verbesserungen
  - Regelmäßigkeits- und Vergleichstext
  - Rekord-Karten „LOAD RECORD“ mit Zielbalken, der von alt auf neu animiert
  - „Continue“
- **Ohne XP** (z. B. erneut gespeichert): „Session saved.“ / „<Name> · N working · N warm-up sets“.
- Erklärseite „Your progression“: alle Ränge mit Status und den Regeltexten (`WorkoutRanksView.swift`, Zeilen 12–43).

### 8.10 Level-Karte (Dashboard)
- Rang, Info-Knopf, „Level N“, „N XP“ und ein Fortschrittsbalken.
- „N XP to Level N+1“ und „<Rang> at Level N · N XP away“ bzw. „Legend rank · Your next level is always ahead.“
- Ohne XP: „Your next completed workout starts your climb.“

## 9. Körpergewicht und Profil

Quellen: `LocalProfile.swift`, `LocalProfileView.swift`, `BodyWeightViews.swift`, `WeightCheckInCelebration.swift`, `WeightGoalAchievement.swift`, `BodyWeightGoal.swift`

- **Profil** („Your profile“):
  - Name (1–40 Zeichen)
  - Einheit Körpergewicht (kg/lb), Zielgewicht
  - Einheit für Trainingslasten (kg/lb), Einheit für Distanz und Pace (km/mi)
  - „Save profile“ meldet „Profile saved.“
- **Gespeichert wird immer in kg und km.** Die Einheiten ändern nur die Anzeige.
- **Körpergewicht-Ziel** (in Settings): „Lose Weight“, „Gain Weight“, „Maintain Weight“. Das ist nur eine Vorliebe ohne Einfluss auf Training oder XP.
- **Dashboard-Karte „Body weight“:**
  - letzter Wert und „Latest check-in · <Datum>“
  - Diagramm der letzten 30 Einträge mit gestrichelter Ziellinie und „Distance to target · X“
  - „Update weight“ und „+25 XP for your first check-in each day“
  - Leer: „Start with one check-in.“ / „See your weight over time, at your own pace.“
- **Eintragen:**
  - Pro Kalendertag gibt es einen Eintrag, ein weiterer Eintrag am selben Tag überschreibt ihn.
  - Gültig sind 1–700 kg. Fehlertexte: „Enter a valid weight (1–700 kg or equivalent in lb).“ und „Enter a valid weight between 1 and 700 kg (2.3–1543 lb).“
- **„Weight history“:**
  - Diagramm und Liste. Antippen korrigiert einen Eintrag (Datum bleibt, keine XP).
  - Wischen löscht. Die XP bleiben, damit man sie nicht zweimal bekommt.
- **Ziel erreicht:**
  - Gilt bei Abnehmen für Gewicht ≤ Ziel, bei Zunehmen für Gewicht ≥ Ziel.
  - Dann erscheint **einmal pro Ziel** die Feier „Goal reached!“ mit Pokal. Gemerkt wird das über den Schlüssel `<richtung>:<ziel·1000>`.
  - Im Quiet Mode erscheint keine Feier.
- **Feier nach dem Eintragen:**
  - Titel „Check-in complete.“, „Weight updated.“ oder „Measurement corrected.“
  - Karte „SAVED MEASUREMENT“ mit Wert, Datum und „+25 XP“ bzw. „XP unchanged“
- **Vorschau** der Ziel-Feier in Settings, ohne Datenänderung („Preview · Your data stays unchanged“).
- **„Show body-weight tracking“** blendet alle Gewichtsanzeigen aus. Die Daten bleiben erhalten.

## 10. Schlaf (manueller Teil)

Quellen: `SleepScoreEntry.swift`, `SleepViews.swift`, `SleepSummary.swift`

- Pro Nacht lässt sich ein **Apple Sleep Score (0–100)** von Hand eintragen. Datum ist die Nacht, die an diesem Tag endet. Datum ≤ heute, sonst „Choose a past or current date and a score from 0 to 100.“
- **Dashboard-Karte „Sleep score“:**
  - Auswahl „Night ending“ (letzte 7 Tage)
  - großer Wert „NN/100“ bzw. „—“
  - Balkendiagramm „Score · last 7 days“, ein Tag lässt sich antippen
  - Durchschnitt der vorhandenen Werte: „Average: NN/100 · N recorded nights“
  - Knopf „Add Apple Sleep Score“ bzw. „Edit Apple Sleep Score“
- **Editor:** „Night ending“, „Score (0–100)“, „Delete score“.
- **Einstellungsseite** mit der Liste aller eingetragenen Werte.
- Schlafdauer und Schlafphasen aus Apple Health entfallen in Version 1 (siehe `PARITAET.md`).

## 11. Einstellungen

Quelle: `SettingsView.swift` (Abschnitte in dieser Reihenfolge)

1. **„Help & Privacy“:** Hilfeseite, „How it works“ (Mini-Demo, danach optional die Workout-Auswahl), „Test onboarding“
2. **„Motion Pro“:** Kaufstatus, „Get Motion Pro“, „Manage subscription“, „Restore purchases“, sowie „Advanced analytics“ und „Themes“ als gesperrte Platzhalter mit „coming soon“
3. **„Local account“:** „Profile & body weight“ mit „Stored on this device. No email, password or online account.“
4. **„Language“:** zeigt die App-Sprache und öffnet die iOS-Einstellungen
5. **„Appearance“:**
   - Dark (Standard), Light oder System
   - „Preview Opening“
   - Schalter „Opening Animation“
6. **„Apple Health“:** Schlaf, Schritte, Ernährung, Apple-Workouts-Import, Strava
7. **„Feedback“:**
   - „Quiet mode“: blendet Ränge und große Feiern aus, XP werden trotzdem gespeichert
   - „App Haptics“
8. **„Rest alerts“:** „Rest notifications“
9. **„Tracking“:**
   - Körpergewicht-Ziel und Vorschau der Ziel-Feier
   - „Show body-weight tracking“
   - „Track Repetitions“
   - „Rest Timer: Xm Ys“, Regler 5 s bis 4 min in 5-s-Schritten
10. **„Demonstration“:** „Explore demo“, „Remove marked samples (N)“
11. **„Full Motion backup“:** JSON-Export und -Import mit Vorschau
12. **„CSV compatibility“:** „Export CSV“, „Import CSV“

Gespeicherte Einstellungen (Standardwerte): `motionAppearance` = dark, `quietMode` = false, `bodyWeightTrackingVisible` = true, `launchAnimationEnabled` = true, `xpHapticsEnabled` = true, `isRepTrackingEnabled` = true, `restTimerSeconds` = 90, `restNotificationsEnabled` = false, `bodyWeightGoal` = maintain, `stepGoalEnabled` = false, `dailyStepGoal` = 8000.

## 12. Hilfe & Datenschutz

Quelle: `HelpPrivacyView.swift`

- Abschnitte: „Local app data“, „Backup & export“, „Apple Health“, „Unfinished workouts“, „Units & preferences“, „Onboarding preview“, „Privacy policy & support“.
- Links für Datenschutzerklärung und Support sind nicht konfiguriert („… URL — not configured“).
- Mehrere Texte versprechen „nur auf diesem Gerät, kein Konto“. Für die Web-App mit Konto und Cloud stimmen diese Texte nicht mehr und müssen ehrlich umgeschrieben werden.

## 13. Datensicherung, Export und Import

Quellen: `MotionBackup*.swift`, `FullBackupSection.swift`, `CompleteCSVCodec.swift`, `MotionCompleteCSV.swift`, `MotionBackupCSV.swift`, `WorkoutCSVImporter.swift`, `WorkoutCSV.swift`

- **JSON-Backup** „Export Backup“: eine Datei `Motion-Backup-JJJJ-MM-TT.json` mit allen Daten außer Beispieldaten, Einführungsstand, Käufen und Berechtigungen.
- **„Import Backup“:**
  - Erst kommt eine Vorschau („Restore preview“) mit Anzahlen und Erklärung.
  - Danach wird zusammengeführt: Fehlende Datensätze werden ergänzt, vorhandene bleiben unverändert, nichts wird doppelt angelegt und es entstehen keine neuen XP.
  - Profil und Einstellungen werden ersetzt.
- **„Export CSV“:** derselbe Inhalt wie das JSON-Backup, nur als CSV mit einer Zeile pro Datensatz (Format `motion_backup_v18`).
- **„Import CSV“** liest v18, alle älteren Motion-CSV-Versionen (v1–v17) und eine einfache Workout-CSV.
- **Fehlertexte:**
  - „Invalid Motion backup: <Grund>. Nothing was restored.“
  - „This Motion backup version is not supported. Nothing was restored.“
  - „Save your current edits before restoring a backup. Nothing was restored.“
  - „This file is not a valid Motion CSV backup. Nothing was imported.“
- Details zum Format stehen in `IMPORT.md`.

## 14. Demo-Modus und Beispieldaten

Quellen: `DemoSession.swift`, `SampleDataStore.swift`, `BlueprintStore.swift`

- **„Explore demo“** öffnet eine vollständige Kopie der App mit **getrennten** synthetischen Daten:
  - Profil „Demo Alex“
  - 7 Tage Gewicht
  - 6 Wochen Push/Pull/Legs mit steigenden Lasten; Bankdrücken stagniert absichtlich
  - Push/Pull/Legs-Blueprints
- **Banner** auf jedem Bildschirm: „DEMO · Synthetic data“ und „Exit demo“.
- **Im Demo gesperrt:** Import, Export, Health, Benachrichtigungen und Haptik. Fehlertext: „Import, export and Apple Health are unavailable in the demo. Exit demo to use your personal data.“
- **Beim Verlassen** wird alles verworfen.
- **Alte Beispieldaten** (`isSample`) sind überall ausgeschlossen und lassen sich mit „Remove marked samples“ löschen.

## 15. Haptik

Quelle: `MotionHaptics.swift`

| Ereignis | Wann | Art |
|---|---|---|
| selection | Tab-Wechsel, Satz rückgängig, Timer stoppen | leichtes Tippen |
| action | Satz/Übung hinzugefügt, Blueprint gespeichert | leichter Stoß |
| completion | Satz abgehakt, XP gutgeschrieben | mittlerer Stoß |
| success | Rekord, Pause fertig, Feier, Ziel gespeichert | Erfolg |
| error | Fehlermeldung | Fehler |

- Ganz aus, wenn „App Haptics“ oder der Quiet Mode es abschalten oder der Demo-Modus läuft.
- **Drosselung:** „success“ höchstens alle 0,8 s, die anderen Ereignisse höchstens alle 0,12 s und frühestens 0,8 s nach einem „success“.

## 16. Motion Pro (In-App-Käufe)

Quellen: `MotionStore.swift`, `ProGate.swift`, `ProIntegration.swift`, `MotionEntitlementSource.swift`, `MotionProSection.swift`, `PaywallView.swift`

- **Produkte:** monatlich, jährlich, lebenslang. Die Abos haben 7 Tage Testphase.
- **Gratis bleibt immer:** Aufzeichnen, Verlauf, Export, alle Daten.
- **Pro schaltet frei:**
  - mehr als 3 Blueprints
  - „Advanced analytics“ (noch nicht gebaut)
  - „Themes“ (noch nicht gebaut)
- **Paywall:**
  - Kopf „Motion Pro“ und „Your training, logging, history and exports stay free forever.“
  - Produktliste, „Restore purchases“
  - Links zu Nutzungsbedingungen und Datenschutz

## 17. Widgets und Live Activity

Quellen: `MotionWidgets/*`, `WidgetShared/*`, `WidgetSnapshotPublisher.swift`, `WorkoutLiveActivity.swift`, `WorkoutActivityActions.swift`

- **Widgets:** „Body weight“, „Recent PRs“ (letzte Last-Verbesserung in 28 Tagen), „Today’s steps“, „6-week consistency“.
- **Live Activity / Dynamic Island** während des Trainings: Sätze n/N, Pausen-Countdown, nächster Satz, „Stop rest“.

## 18. Apple-Health-Funktionen

Quellen: `SleepStore.swift`, `StepsStore.swift`, `StepsViews.swift`, `Nutrition*.swift`, `HealthWorkoutImport.swift`, `HealthWorkoutSettingsView.swift`, `HealthWorkoutDetails.swift`, `HealthWorkoutDetailSection.swift`, `StravaHealthSettingsView.swift`, `HealthBackupArchive.swift`

- **Schlafdauer und -phasen**
- **Schritte** mit Tagesziel und 7-Tage-Diagramm
- **Ernährung:** Kalorien und Makros aus genau einer gewählten Tracker-App, mit 30-Tage-Verlauf
- **Import von Apple-Workouts und Strava** (über Health) als Verlaufseinträge mit Herzfrequenz-Diagramm. Dafür gibt es keine XP, und jedes Workout wird nur einmal importiert.
- **Archiv** der gelesenen Health-Werte für den Export
- Diese Module habe ich auf Ebene von Oberfläche, Texten und Datenformat gelesen, nicht Zeile für Zeile. In Version 1 entfallen sie vollständig.

## 19. Nicht verwendeter Code im alten Projekt

Diese Teile existieren im Code, werden aber nirgends angezeigt. Ich übernehme sie nicht:
- `DashboardReturnCard` („Your last starting point“), `ExerciseProgressCard` (Linienchart „LATEST TOP SET“), `DashboardMetric`
- Bilder `Tour*.imageset` (10 Tour-Screenshots)
- `MotionActivation` / `MotionEvent`: interne Ereignisse ohne Übertragung (Noop). Laut Vorgabe gibt es kein Tracking.
- `Exercise.restSeconds` wird in der Oberfläche nirgends gesetzt, nur durch Backups.

## 20. Tests im alten Projekt

`TrackerTests/` (42 Dateien) und `TrackerUITests/` (18 Dateien) enthalten viele erwartete Werte, etwa für Rekorde, XP, Pausen-Timer, Supersets, Backup und Trainingsplan. Sie dienen in Phase 3 als Vorlage für die Unit-Tests gegen die alte Logik.
