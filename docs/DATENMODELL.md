# Datenmodell

Dieses Dokument beschreibt das Modell der alten iOS-App (SwiftData), das geplante Modell der Web-App (Dexie lokal, Supabase/Postgres in der Cloud) und wie beides zusammenpasst.

Das neue Modell ist ein **Entwurf** aus Phase 0. Es wird in Phase 2 (lokal) und Phase 4 (Cloud) umgesetzt und dabei noch angepasst.

---

## 1. Altes Modell (SwiftData, `MotionSchemaV1`)

Quellen: `Models.swift`, `LocalProfile.swift`, `SleepScoreEntry.swift`, `TrainingPlanStore.swift`, `WorkoutAwardReceipt.swift`, `OnboardingState.swift`, `HealthWorkoutImport.swift`

Gespeichert werden immer kg, km und Sekunden pro km. Die Anzeigeeinheiten ändern nur die Darstellung.

### Exercise (Übungsbibliothek)
| Feld | Typ | Bedeutung |
|---|---|---|
| stableID | UUID? | dauerhafte Identität; ältere Datensätze haben keine, beim Export wird sie aus der internen ID abgeleitet |
| name | String | Name, in der Bibliothek eindeutig (Groß-/Kleinschreibung egal) |
| goalWeight | Double? | Lastziel in kg |
| isPRTracked | Bool | Krone: Rekorde verfolgen |
| restSeconds | Int? | Standardpause der Übung (in der Oberfläche nicht einstellbar) |
| metadataJSON | String? | JSON `ExerciseMetadata`: `catalogueID?`, `equipment` (Standard „Other“), `muscle` (Standard „Other“), `measurement` (Standard „Load & reps“), `guidance` (Anleitung), `trackProgress` (Standard true) |
| blueprintExercises | Beziehung | Verwendung in Routinen |

### Blueprint (Routine)
| Feld | Typ | Bedeutung |
|---|---|---|
| stableID | UUID | Identität |
| name | String | Name |
| cardioType | String? | gesetzt = Cardio-Blueprint (Running, Bicycle, …) |
| cardioMinutes | Double? | Zielzeit |
| cardioDistance | Double? | Zieldistanz km |
| targetExercises | [BlueprintExercise] | wird mitgelöscht |

### BlueprintExercise (Übung in Routine)
| Feld | Typ | Bedeutung |
|---|---|---|
| exercise | Exercise | Verweis |
| sortOrder | Int | Reihenfolge (bei Gleichstand nach Name) |
| targetSets | Int | Arbeitssätze 1–1000 |
| warmUpSets | Int | Aufwärmsätze 0–20 |
| supersetGroup | String? | „A“–„D“ |
| routineGuidanceJSON | String? | JSON `RoutineGuidance`: `measurement?`, `minimumReps?`, `maximumReps?`, `durationSeconds?`, `restSeconds?`, `notes`, `progression` |
| (keine eigene ID) | | beim Export nur über Blueprint + Exercise identifiziert |

### Workout (Session, auch Entwurf)
| Feld | Typ | Bedeutung |
|---|---|---|
| draftID | UUID? | Session-Identität (im Backup als `id`) |
| name | String | Name (Blueprint-Name, „Freestyle“ oder Cardio-Aktivität) |
| date | Date | Zeitpunkt |
| isCompleted | Bool | false = Entwurf |
| isFreestyle | Bool | |
| isRetrospective | Bool | nachgetragen |
| isSample | Bool | alte Beispieldaten, überall ausgeschlossen |
| blueprintID | UUID? | Herkunft |
| notes | String? | Notizen |
| earnedXP | Int | einmal beim Abschluss vergeben |
| draftUpdatedAt | Date? | für Sortierung der Entwürfe |
| trainingPlanTicketData | Data? | JSON `TrainingPlanTicket` |
| restTimerData | Data? | JSON `RestTimerState` (Endzeitpunkt) |
| editUndoData | Data? | JSON `[WorkoutEditSnapshot]`, max. 100 |
| cardioType / cardioSeconds / cardioDistance / cardioPace | | Cardio-Ergebnis (s, km, s/km) |
| healthWorkoutID / healthDetailsData | | Import aus Apple Health inkl. Herzfrequenz |
| activationStartedAt / FirstSetAt / WarmUpAt / FinishedAt, activationPreviousShown | | nur für interne Ereignisse (ohne Übertragung) |
| completedExercises | [WorkoutExercise] | wird mitgelöscht |

### WorkoutExercise (Übung in Session, Momentaufnahme)
| Feld | Typ | Bedeutung |
|---|---|---|
| snapshotID | UUID? | Identität |
| exerciseID | UUID? | Verweis auf Exercise.stableID; nil = unverknüpft |
| exerciseName | String | Name zum Zeitpunkt des Trainings |
| measurementType | String | „Load & reps“, „Bodyweight reps“, „Assisted reps“, „Duration“ |
| routineGuidanceJSON | String? | Ziele zum Zeitpunkt des Trainings |
| supersetGroup | String? | |
| restSeconds | Int? | Pause für diese Session |
| acknowledgedRecordWeight | Double? | zuletzt gefeierter Rekord in dieser Session |
| isHistoryOnly | Bool | eigene Übung ohne Statistik/PR/Verbesserungs-XP |
| isRemoved | Bool | im Training entfernt (für Undo behalten) |
| draftOrder | Int | Reihenfolge |
| identityReviewed | Bool | Migrations-Kennzeichen |
| sets | [SetLog] | wird mitgelöscht |

### SetLog (Satz)
| Feld | Typ | Bedeutung |
|---|---|---|
| stableID | UUID? | Identität |
| setIndex | Int | Nummer innerhalb der Übung |
| weight | Double | kg (Last, Zusatzlast oder Unterstützung) |
| reps | Int? | Wiederholungen |
| durationSeconds | Double? | bei „Duration“ |
| isCompleted / isWarmUp / isSkipped / isRemoved | Bool | Status |
| draftWeightText / draftWeightUnit / draftRepsText / draftDurationText | String? | unfertige Eingaben exakt wiederherstellen |
| activationUsedPrevious | Bool | nur für interne Ereignisse |

### Weitere Modelle
| Modell | Felder | Bedeutung |
|---|---|---|
| LocalProfile | name, weightUnit, exerciseLoadUnit, distanceUnitPreference, targetWeightKilograms?, celebratedWeightGoals [String], createdAt | genau ein Profil |
| BodyWeightEntry | dayKey, recordedAt, kilograms | ein Eintrag pro Kalendertag |
| WeightCheckInReward | dayKey, awardedAt, earnedXP (=25) | XP-Beleg pro Tag, bleibt beim Löschen des Gewichts |
| WorkoutAwardReceipt | sessionID, earnedXP | XP-Beleg pro Session, ohne Beziehung (bleibt beim Löschen) |
| SleepScoreEntry | dayKey, date, score 0–100 | manueller Apple Sleep Score |
| TrainingPlan | data (JSON `TrainingSchedule`) | höchstens einer |
| HealthWorkoutReceipt | healthID | verhindert doppelten Health-Import |
| OnboardingRecord | payload (JSON) | nur Gerät, nicht im Backup |

**dayKey:** Format `„<Ära>-<Jahr>-<Monat>-<Tag>“` ohne führende Nullen, z. B. `1-2026-11-2`, nach lokalem Kalender.

**Eingebettete JSON-Strukturen:** `TrainingSchedule` (id, revision, enabled, mode `rotation|weekdays`, startDate, entries [{id, blueprintID, weekday?}], weekdays Set 1–7 mit 1 = Sonntag, cursor, rotationToken, notBefore?, consumed Set<String>), `TrainingPlanTicket` (planID, revision, entryID, rotationToken?, date, dayKey), `RestTimerState` (deadline?, noticeUntil?, duration, remaining, sourceSetID?, exerciseName?), `WorkoutEditSnapshot`.

**Einstellungen** liegen in `UserDefaults`: siehe `FUNKTIONEN.md`, Abschnitt 11.

**Katalog:** 36 feste Bewegungen im Code (`ExerciseCatalogue.swift`), nicht in der Datenbank:

| ID | Name | Ausrüstung | Muskel | Messart |
|---|---|---|---|---|
| bench | Bench Press | Barbell | Chest | Load & reps |
| incline-db | Incline Dumbbell Press | Dumbbell | Chest | Load & reps |
| db-press | Dumbbell Bench Press | Dumbbell | Chest | Load & reps |
| pushup | Push-Up | Bodyweight | Chest | Bodyweight reps |
| chest-machine | Chest Press | Machine | Chest | Load & reps |
| fly | Cable Fly | Cable | Chest | Load & reps |
| ohp | Overhead Press | Barbell | Shoulders | Load & reps |
| db-shoulder | Dumbbell Shoulder Press | Dumbbell | Shoulders | Load & reps |
| lateral | Lateral Raise | Dumbbell | Shoulders | Load & reps |
| facepull | Face Pull | Cable | Shoulders | Load & reps |
| reverse-fly | Reverse Fly | Dumbbell | Shoulders | Load & reps |
| deadlift | Deadlift | Barbell | Posterior chain | Load & reps |
| rdl | Romanian Deadlift | Barbell | Posterior chain | Load & reps |
| row | Barbell Row | Barbell | Back | Load & reps |
| db-row | Dumbbell Row | Dumbbell | Back | Load & reps |
| pulldown | Lat Pulldown | Cable | Back | Load & reps |
| cable-row | Seated Cable Row | Cable | Back | Load & reps |
| pullup | Pull-Up | Bodyweight | Back | Bodyweight reps |
| squat | Squats | Barbell | Legs | Load & reps |
| goblet | Goblet Squat | Dumbbell | Legs | Load & reps |
| front-squat | Front Squat | Barbell | Legs | Load & reps |
| legpress | Leg Press | Machine | Legs | Load & reps |
| split | Split Squat | Dumbbell | Legs | Load & reps |
| lunge | Reverse Lunge | Dumbbell | Legs | Load & reps |
| stepup | Step-Up | Dumbbell | Legs | Load & reps |
| extension | Leg Extension | Machine | Legs | Load & reps |
| curl-leg | Seated Leg Curl | Machine | Posterior chain | Load & reps |
| hipthrust | Hip Thrust | Barbell | Posterior chain | Load & reps |
| calf | Calf Raise | Machine | Calves | Load & reps |
| curl | Dumbbell Curl | Dumbbell | Arms | Load & reps |
| hammer | Hammer Curl | Dumbbell | Arms | Load & reps |
| pushdown | Triceps Pushdown | Cable | Arms | Load & reps |
| triceps | Overhead Triceps Extension | Dumbbell | Arms | Load & reps |
| crunch | Cable Crunch | Cable | Core | Load & reps |
| plank | Plank | Bodyweight | Core | Duration |
| carry | Farmer Carry | Dumbbell | Other | Distance & duration (nicht loggbar) |

Die Anleitungstexte stehen wörtlich in `ExerciseCatalogue.swift`, Zeilen 34–69, und werden 1:1 übernommen.

---

## 2. Neues Modell (Entwurf)

### 2.1 Grundregeln für jede synchronisierte Tabelle
| Spalte | Typ | Regel |
|---|---|---|
| `id` | uuid | auf dem Gerät erzeugt (`crypto.randomUUID()`), Primärschlüssel |
| `user_id` | uuid | Konto, Pflicht; RLS `auth.uid() = user_id` |
| `created_at` | timestamptz | einmal auf dem Gerät gesetzt |
| `updated_at` | timestamptz | bei jeder Änderung auf dem Gerät gesetzt, Grundlage für „letzte Änderung gewinnt“ |
| `deleted_at` | timestamptz null | weiches Löschen; gelöschte Zeilen werden mitsynchronisiert und ausgeblendet |

- Einheiten in der Datenbank: kg, km, Sekunden, Sekunden pro km, wie in der alten App.
- Zeitpunkte als ISO-Zeitstempel mit Zeitzone.
- Kalendertage als `date` im Format `JJJJ-MM-TT` nach der lokalen Zeitzone des Geräts. Das ersetzt das alte dayKey-Format.
- **Tägliche Datensätze** (Körpergewicht, Gewichts-XP, Schlafwert) bekommen eine **aus Konto und Tag abgeleitete UUID** (UUIDv5). So erzeugen zwei Geräte am selben Tag dieselbe ID, und der Upsert führt sie zusammen, statt ein Duplikat anzulegen. Dasselbe gilt für den XP-Beleg pro Workout (aus der Workout-ID) und den einen Trainingsplan pro Konto.
- Verschachtelte Strukturen, die immer als Ganzes gelesen werden (Ziele, Plan, Timer, Undo-Verlauf), bleiben JSON-Spalten (`jsonb`).

### 2.2 Tabellen
| Tabelle | Wichtige Spalten |
|---|---|
| `profiles` | name, body_weight_unit, load_unit, distance_unit, target_weight_kg, celebrated_weight_goals jsonb, body_weight_goal, preferences jsonb (appearance, quiet_mode, body_weight_tracking_visible, opening_animation, haptics, track_reps, rest_timer_seconds) |
| `exercises` | name, goal_weight_kg, is_pr_tracked, rest_seconds, catalogue_id, equipment, muscle, measurement, guidance, track_progress |
| `blueprints` | name, cardio_type, cardio_minutes, cardio_distance_km |
| `blueprint_exercises` | blueprint_id, exercise_id, sort_order, target_sets, warm_up_sets, superset_group, guidance jsonb |
| `workouts` | name, performed_at, is_completed, is_freestyle, is_retrospective, blueprint_id, notes, earned_xp, draft_updated_at, plan_ticket jsonb, rest_timer jsonb, undo_history jsonb, cardio_type, cardio_seconds, cardio_distance_km, cardio_pace_s_per_km, source (`motion` oder `legacy_health`), legacy_health jsonb |
| `workout_exercises` | workout_id, exercise_id (null = unverknüpft), exercise_name, measurement, guidance jsonb, superset_group, rest_seconds, acknowledged_record_kg, is_history_only, is_removed, sort_order |
| `set_logs` | workout_exercise_id, set_index, weight_kg, reps, duration_seconds, is_completed, is_warm_up, is_skipped, is_removed, draft_weight_text, draft_weight_unit, draft_reps_text, draft_duration_text |
| `body_weights` | day, recorded_at, kilograms |
| `weight_rewards` | day, awarded_at, earned_xp (immer 25; wird nie weich gelöscht) |
| `workout_awards` | workout_id, earned_xp (wird nie weich gelöscht) |
| `sleep_scores` | day, score |
| `training_plans` | schedule jsonb (ein Datensatz pro Konto) |
| `legacy_imports` | Fingerabdruck der importierten Datei, Datum, Anzahlen (Schutz vor doppeltem Import, Phase 5) |

### 2.3 Nur auf dem Gerät (Dexie, nicht synchronisiert)
| Tabelle | Zweck |
|---|---|
| `outbox` | Warteschlange der Änderungen: Tabelle, ID, Zeitstempel, Versuche |
| `sync_state` | letzter Abgleich pro Tabelle |
| `onboarding` | Einführungsstand und Tipps, wie in der alten App gerätelokal |
| `device_settings` | gerätegebundene Werte: Benachrichtigungen erlaubt, zuletzt angemeldetes Konto |

### 2.4 Lokale Datenbanken pro Konto
- Jede Kontositzung nutzt eine eigene IndexedDB mit dem Namen `motion-<user_id>`.
- Beim Logout wird die aktive Datenbank geschlossen, und das nächste Konto sieht sie nicht. Vor dem Logout warnt die App, wenn die Warteschlange noch Einträge hat.
- Vor Phase 4 (ohne Login) gibt es eine Gast-Datenbank `motion-local`. Was mit ihr beim ersten Login passiert, ist eine offene Frage (siehe Phase-0-Bericht).

### 2.5 Aktive Workouts und Konflikte
- Grundregel: Pro Datensatz gewinnt die letzte Änderung.
- Schutz für laufende Workouts: Würde eine Cloud-Version einen **lokal noch nicht abgeschlossenen** Workout-Datensatz (oder seine Übungen und Sätze) mit älteren Daten überschreiben, behält das Gerät seinen Stand. Die Cloud-Version wird als Konfliktkopie aufbewahrt. Der Nutzer sieht einen Hinweis und verliert nichts unbemerkt. Die genaue Umsetzung folgt in Phase 4.

---

## 3. Zuordnung alt → neu

| Alt | Neu | Hinweis |
|---|---|---|
| Exercise.stableID | exercises.id | fehlt sie, wird sie wie in der alten App deterministisch abgeleitet (steht bereits so im Backup) |
| Exercise.metadataJSON | exercises.catalogue_id, equipment, muscle, measurement, guidance, track_progress | als Spalten statt JSON |
| Blueprint.stableID | blueprints.id | |
| BlueprintExercise (ohne ID) | blueprint_exercises.id | beim Import neu erzeugt, deterministisch aus Blueprint-ID + Exercise-ID |
| BlueprintExercise.routineGuidanceJSON | blueprint_exercises.guidance | |
| Workout.draftID | workouts.id | |
| Workout.date | workouts.performed_at | |
| Workout.trainingPlanTicketData / restTimerData / editUndoData | plan_ticket / rest_timer / undo_history | JSON übernehmen, Zeitpunkte umrechnen |
| Workout.activation* / SetLog.activationUsedPrevious | entfällt | nur interne Ereignisse, kein Tracking |
| Workout.isSample | entfällt | Beispieldaten werden nicht importiert (stehen ohnehin nicht im Backup) |
| Workout.healthWorkoutID / healthDetailsData | source = `legacy_health`, legacy_health jsonb | nur falls du dich für das Mitnehmen alter Health-Importe entscheidest |
| WorkoutExercise.snapshotID | workout_exercises.id | |
| WorkoutExercise.draftOrder | workout_exercises.sort_order | |
| WorkoutExercise.identityReviewed | entfällt | nach der Migration immer true |
| SetLog.stableID | set_logs.id | |
| LocalProfile | profiles | eine Zeile pro Konto |
| UserDefaults-Einstellungen | profiles.preferences | Benachrichtigungen und Schrittziel ausgenommen |
| BodyWeightEntry | body_weights | dayKey → day |
| WeightCheckInReward | weight_rewards | |
| WorkoutAwardReceipt | workout_awards | |
| SleepScoreEntry | sleep_scores | |
| TrainingPlan.data | training_plans.schedule | Wochentage bleiben 1 = Sonntag … 7 = Samstag wie in Apples Kalender, damit die Logik 1:1 testbar ist |
| HealthWorkoutReceipt | entfällt in V1 | kommt mit der nativen App zurück |
| OnboardingRecord | Dexie `onboarding` | wird nicht importiert |
| Health-Archiv, Ernährung, Schrittziel | entfällt in V1 | in `SPAETER_NATIV.md` |

---

## 4. Umsetzung in Phase 2

- Datenbank: `src/data/db.ts` (Dexie, Version 1), Typen in `src/data/types.ts`.
- Jede Änderung läuft über `src/data/repo.ts`: Dort werden `updated_at` gesetzt, gelöschte Datensätze weich gelöscht (`deleted_at`) und der Datensatz in die Warteschlange `outbox` gelegt. Die Sync in Phase 4 lädt genau diese Einträge hoch.
- `set_logs` enthalten zusätzlich `workout_id`, damit ein Training mit einer Abfrage geladen werden kann.
- Geräteeinstellungen (Darstellung, Startanimation, Sprache, Installationshinweis) liegen vorerst in `localStorage`. Trainingseinstellungen (Wiederholungen, Pause, Haptik, Mitteilungen) liegen im Profil und werden später synchronisiert.

## 5. Ergänzungen in Phase 3
- XP: `workouts.earned_xp` plus ein Beleg in `workout_awards` pro Training. Der Beleg wird nie gelöscht; ein erneut abgeschlossenes oder wiederhergestelltes Training bekommt dadurch keine XP doppelt. Die Gesamt-XP sind die Summe aus `earned_xp` aller nicht gelöschten, abgeschlossenen Trainings und allen `weight_rewards`.
- Körpergewicht: ein Eintrag pro Kalendertag (`body_weights.day`), Tages-XP in `weight_rewards` (bleibt beim Löschen der Messung erhalten). Gefeierte Gewichtsziele stehen in `profiles.celebrated_weight_goals` als `richtung:gramm`.
- Schlaf: ein manueller Wert pro Tag in `sleep_scores`.
- Cardio: `workouts.cardio_*` in kg/km/Sekunden; Plan-Abgleich am selben Tag wird in `training_plans.schedule.consumed` als `cardio/JJJJ-MM-TT` vermerkt.
- Einführung und Lerntipps sind **Gerätezustand** und liegen nicht in der Datenbank, sondern in `localStorage` (`motion.onboarding.v1.<Datenbankname>`). Sie werden nicht synchronisiert und nicht gesichert, wie in der iOS-App.
- Demo und Einführungstest laufen in einer eigenen IndexedDB (`motion-demo-…`, `motion-onboardingTest-…`), die beim Beenden gelöscht wird. Übrig gebliebene werden beim nächsten Start entfernt.
- Sicherung: `motion-web-backup` Version 1 enthält alle zwölf Tabellen inklusive gelöschter Einträge (Grabsteine).


## 6. Umsetzung in Phase 4 (Konto und Sync)
- **Schema:** `supabase/migrations/20261102120000_initial_schema.sql`, Spalten 1:1 wie die Gerätedatensätze (`src/data/types.ts`). Ein Test (`src/sync/sync.test.ts`) prüft, dass jedes Feld, das die App speichert, eine Spalte in der Cloud hat.
- **Primärschlüssel `(user_id, id)`** statt nur `id`: Eine ID, die ein Konto wählt, kann nie die Zeile eines anderen Kontos treffen. Dadurch dürfen stabile IDs (unten) ohne Konto berechnet werden.
- **Stabile IDs (UUIDv5)** aus `src/data/ids.ts` für Profil, Trainingsplan, Körpergewicht/Gewichts-XP/Schlafwert pro Tag und den XP-Beleg pro Training. Zwei Geräte erzeugen für denselben Tag dieselbe ID; die Cloud führt sie zu einer Zeile zusammen. Abweichung zum Entwurf in 2.1: Die ID hängt nicht vom Konto ab, weil der Schlüssel das Konto schon enthält; so behalten Gastdaten ihre IDs beim ersten Login.
- **Gerätedatenbank Version 2:** neue Tabellen `sync_state` (Stand des letzten Abgleichs pro Tabelle) und `conflicts` (Konfliktkopien). Beim Update stellt das Gerät seine bisherigen Tages- und Einzeldatensätze auf die stabilen IDs um. Gab es lokal mehrere für denselben Tag, bleibt der nicht gelöschte, zuletzt geänderte.
- **Standardprofil** (`Motion`, kg, km) wird mit Zeitstempel 1970 angelegt. So gewinnt beim ersten Abgleich eines neuen Geräts immer das echte Profil aus der Cloud.
- **Serverspalte `synced_at`:** wird bei jedem angenommenen Schreibvorgang von der Datenbank gesetzt (`clock_timestamp()`). Geräte laden alles mit neuerem `synced_at` als beim letzten Mal, mit 2 Minuten Überlappung. So kommen auch Daten an, die ein anderes Gerät erst Tage später hochlädt.
- **Letzte Änderung gewinnt** auf dem Server: Ein Trigger verwirft Uploads, deren `updated_at` älter ist als die gespeicherte Zeile. Auf dem Gerät gilt dieselbe Regel beim Laden.
- **Keine Fremdschlüssel** in der Cloud: Geräte laden in beliebiger Reihenfolge hoch und behalten Grabsteine (`deleted_at`).
- **Offene Trainings (2.5):** Lehnt der Server einen Upload ab, weil ein anderes Gerät dasselbe offene Training neuer geändert hat, behält das Gerät seinen Stand, speichert die Cloud-Version als Konfliktkopie in `conflicts` und lädt seinen Stand erneut als neueste Änderung hoch. Kommt beim Laden eine neuere Version für ein offenes Training, während hier noch Änderungen warten, passiert dasselbe. Unter Einstellungen → Konto erscheint dann „Änderungen von einem anderen Gerät prüfen“; dort wählt man pro Training „Stand dieses Geräts behalten“ oder „Version des anderen Geräts verwenden“. Ohne wartende Änderungen übernimmt das Gerät neuere Stände ganz normal (so sieht das zweite Gerät den Fortschritt).
- **Datenbanken pro Konto (2.4):** Gast `motion-local`, Konto `motion-<user_id>`. Welches Konto angemeldet ist, steht in `localStorage` (`motion.account.v1`), nicht im Login-Token. Ein abgelaufenes Token im Funkloch schaltet also nie mitten im Training auf die Gast-Datenbank um; die App zeigt dann „Anmeldung abgelaufen“ und speichert weiter lokal.
- **Erster Login mit Gastdaten:** Hat das Gerät schon Daten (mehr als das automatische Profil), fragt die App „Ins Konto übernehmen“ oder „Nur auf diesem Gerät behalten“. Beim Übernehmen lädt sie zuerst den Cloud-Stand (falls online) und führt dann pro Datensatz nach „letzte Änderung gewinnt“ zusammen. Danach ist die Gast-Datenbank leer.
- **Logout:** warnt, wenn noch Änderungen warten. Die Konto-Datenbank bleibt auf dem Gerät (für den nächsten Login mit demselben Konto), wird aber geschlossen; das Gerät zeigt danach die Gast-Datenbank.

## 7. Ergänzungen in Phase 5a (Import)
- **Neue Tabelle `legacy_imports`** (Gerät und Cloud): fingerprint (SHA-256 der Sicherung mit sortierten Schlüsseln), file_name, source_format (`json`/`csv`), exported_at, imported_at, counts jsonb (`file` und `added`). Die ID ist eine UUIDv5 aus dem Fingerabdruck, sodass zwei Geräte für dieselbe Datei eine Zeile ergeben.
- **Gerätedatenbank Version 3:** Tabelle `legacy_imports` mit Index auf `fingerprint`. Keine Datenumstellung.
- **Cloud-Migration** `supabase/migrations/20261102180000_legacy_imports.sql` mit denselben fünf Grundspalten, `synced_at`, Schreibregel und RLS wie alle anderen Tabellen.
- Routineneinträge aus der alten App bekommen die ID `UUIDv5("blueprint_exercises/<Routine>/<Übung>")` (siehe Zuordnung in Abschnitt 3).
- Regeln und Umrechnungen: `IMPORT.md`, Abschnitt 6.
