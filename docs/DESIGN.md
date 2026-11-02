# Design der alten App

Quellen: `MotionTheme.swift`, `SilverMotion.swift`, `DashboardComponents.swift`, `PersonalRecordCelebration.swift`, `OnboardingPage.swift`, `WorkoutSetRow.swift`, `OpeningAnimationView.swift`, `OpeningSculpture.swift`, `OpeningTimeline.swift`, `MotionHaptics.swift`, `Assets.xcassets`, `Docs/MotionAppIcon.md`, `AGENTS.md` des alten Projekts.

## Grundidee
- **Dark Mode zuerst:** Graphit, Silber und Weiß als Basis.
- **Akzentfarben:** dezentes Jade für Aktionen und Abschluss, Champagner für persönliche Rekorde und Ziele.
- **Farbe ist nie das einzige Signal:** Jeder Zustand hat zusätzlich Text oder Symbol.
- **Standarddarstellung** ist Dunkel. Hell und „System“ sind wählbar.
- **Hoher Kontrast:** Für einige Farben gibt es eigene Werte (iOS „Kontrast erhöhen“). Im Web entspricht das `@media (prefers-contrast: more)`.

## Farben

| Name | Hell | Dunkel | Hell, hoher Kontrast | Dunkel, hoher Kontrast | Verwendung |
|---|---|---|---|---|---|
| background | `#F4F7F6` | `#0D1114` | wie hell | `#050708` | Seitenhintergrund, Eingabefelder |
| surface | `#FFFFFF` | `#171D21` | wie hell | `#202A30` | Karten |
| secondaryText | `#495A62` | `#AEBAC1` | wie hell | `#DCE5E9` | Nebentexte |
| border | `#CDD7D5` | `#344249` | `#667A73` | `#84979F` | Ränder, Trennlinien, leere Balken |
| action (Jade) | `#00624F` | `#A5DDCB` | `#004737` | `#C8F5E5` | Akzent, Tint, Erfolg |
| onAccent | `#FFFFFF` | `#10271F` | `#FFFFFF` | `#10271F` | Text auf action |
| achievement (Champagner) | `#72521C` | `#E4C58F` | `#513500` | `#FFE2AB` | Krone, Rekorde, Ziele, Level-up |
| achievementHighlight | `#72521C` | `#F5E4C6` | `#513500` | `#FFF2D9` | Verlaufsende des Zielbalkens |
| chartHistory | `#627A73` | `#829B93` | wie hell | `#B7CDC5` | vergangene Balken |
| completedSurface | `#E0F3EB` | `#1A332C` | wie hell | `#244B3D` | erledigte Sätze, Icon-Kacheln |
| openingWordmarkTop | `#263C42` | `#FFFFFF` | – | – | Wortmarke oben |
| openingWordmarkBottom | `#53676B` | `#A8A8A8` | – | – | Wortmarke unten |
| openingDetail | `#455E58` | `#FFFFFF` | – | – | Details der Opening-Animation |

Feste Farben, gleich in hell und dunkel:

| Name | Wert | Verwendung |
|---|---|---|
| actionFill | `#7BC9B2` | gefüllte Haupt-Knöpfe |
| actionHighlight | `#D7F2E7` | Verlaufsanfang |
| onAction | `#10271F` | Text auf gefüllten Knöpfen |
| onActionSecondary | `#294E41` | Nebentext auf der Start-Karte |
| actionGradient | Verlauf `actionHighlight` → `actionFill`, oben links nach unten rechts | Start-Karte, XP-Balken |

Die Farbe des Splash-Hintergrunds entspricht `background` (`#F4F7F6` / `#0D1114`).

## Schrift
- **Systemschrift (SF Pro)** mit iOS-Textstilen: largeTitle, title, title2, title3, headline, subheadline, body, callout, footnote, caption, caption2. Die Größen folgen der Dynamic Type-Einstellung.
- **Gerundete Variante** (`design: .rounded`) für große Zahlen und Überschriften: Dashboard-Begrüßung, Level, Start-Karte, Tag im Verlauf, Eingabefelder.
- **Ziffern mit fester Breite** (`monospacedDigit`) für alle Zahlen, die sich ändern.

Feste Größen:

| Element | Größe / Gewicht |
|---|---|
| Opening-Wortmarke „MOTION“ | min(Breite/5,1; 94) pt, heavy, Laufweite −2 |
| Opening-Zeilen | 10 pt medium, Laufweite 3 bzw. 3,5 |
| Feier-Masthead „MOTION“ | 13 pt semibold, Laufweite 4 |
| Feier-Masthead „TRAINING JOURNAL“ | 9 pt medium, Laufweite 1,5 |
| Dashboard-Begrüßung | 32 pt semibold rounded |
| Start-Karte Titel | 30 pt semibold rounded |
| Level-Anzeige | 28 pt semibold rounded |
| XP-Feier „+N XP“ | 42 pt semibold |
| Feier-Titel | 32–34 pt semibold/bold |
| Verlauf Tag | 30 pt bold rounded |
| Kategorie-Labels (z. B. „YOUR NEXT SESSION“) | caption/caption2 semibold, Großbuchstaben, Laufweite 1–2,5 |

**Web-Umsetzung:**
- SF Pro darf laut Lizenz nicht auf Webseiten eingebunden werden.
- Vorschlag: Systemschrift-Stack `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` und für gerundete Zahlen `ui-rounded`. Auf iPhone und Mac erscheint so echtes SF Pro, auf Android Roboto, ohne Download.
- Falls ein einheitlicher Look gewünscht ist, eine freie Schrift selbst hosten. Das ist eine offene Frage.

## Abstände
| Stelle | Wert |
|---|---|
| Karteninnenabstand (`dashboardCard`) | 20 |
| Dashboard seitlich | 20, vertikaler Abstand der Blöcke 28 |
| Einführung, Feiern, Verlauf seitlich | 24 |
| Start-Karte innen | 24, Abstand Kopf/Titel 30 |
| Auswahl-Zeilen innen | 16–20 |
| Max. Breite Einführung | 560 |
| Fixe Leisten (Timer) | 16 seitlich, 8 vertikal |

## Ecken (Radien)
| Element | Radius |
|---|---|
| Dashboard-Karte | 24 |
| Start-Karte | 26 |
| Auswahl-Zeilen, Onboarding-Felder, Hinweisboxen | 20 |
| Onboarding-Auswahl | 18 |
| Feier-Knopf, große Abschnittsknöpfe | 14 |
| Icon-Kachel im Onboarding-Feld | 13 |
| Eingabefelder, kleine Abschnittsknöpfe, Rekord-Icon | 10 |
| Diagrammbalken | 3–4 |
| Fortschrittsbalken | Kapsel (voll gerundet) |

## Bedienflächen
- Mindestens 44 × 44 pt für alle Knöpfe.
- Eingabefelder im Training: 48 pt hoch. Abhak-Kästchen 44 × 48 mit 26-pt-Symbol.
- Haupt-Knöpfe: 52–54 pt hoch.
- Bei sehr großer Schrift stellen sich Zeilen von nebeneinander auf untereinander um, Auswahlen werden zu Menüs.

## Komponenten
| Komponente | Aussehen | Quelle |
|---|---|---|
| Karte | surface, Radius 24, Rand border 1 pt, Innenabstand 20 | `DashboardComponents.swift` |
| Start-Karte „YOUR NEXT SESSION“ | Jade-Verlauf, Radius 26, Kopfzeile mit Symbol und Pfeil im Kreis (schwarz 7 %, 40 pt), Titel 30 pt, Untertitel onActionSecondary | `DashboardComponents.swift` |
| Feier-Knopf „Continue“ | action-Fläche, Text onAction headline, 54 hoch, Radius 14; gedrückt 6 % dunkler und 98,5 % groß | `PersonalRecordCelebration.swift` |
| Masthead | „MOTION“ links, „TRAINING JOURNAL“ rechts, darunter Linie border 1 pt mit 36 × 2 pt Akzentstück, darunter Kategorie in Akzentfarbe | `PersonalRecordCelebration.swift` |
| Silberner Zielbalken | Kapsel 7 pt, Hintergrund border, Füllung Verlauf achievement → achievementHighlight | `SilverMotion.swift` |
| XP-Balken | Kapsel 8 pt, Hintergrund border 65 %, Füllung actionGradient, Schatten action 25 % (Puls bis 60 %) | `WorkoutProgressCard.swift` |
| Eingabefeld Training | gerundete Ziffern, Hintergrund background, Radius 10, Rand 1 pt border bzw. 2 pt action bei Fokus, gesperrt 50 % | `WorkoutSetRow.swift` |
| Satz-Zeile erledigt | Hintergrund completedSurface, „Set recorded.“ in action | `WorkoutSetRow.swift` |
| Onboarding-Seite | Masthead mit Kategorie, Symbol 42 pt light action, Titel largeTitle semibold, Detail subheadline, Fußbereich mit Knöpfen, „Back“ und „n / N“ | `OnboardingPage.swift` |
| Onboarding-Auswahl | Zeile mit Symbol in action, Titel headline, Chevron; surface, Radius 18, Rand | `OnboardingPage.swift` |
| Abschnittsnavigation Blueprints | große Schaltfläche (aktiv: action-Text, action 14 % Hintergrund, Haken) und drei kleine (aktiv: semibold, 10 % Hintergrund, Jade-Strich 20 × 3 unten) | `BlueprintListView.swift` |
| Rekord-Zeile Dashboard | Krone champagner in 36-pt-Kachel completedSurface Radius 10, Name, Datum, Gewicht, Chevron, optional Zielbalken | `DashboardComponents.swift` |
| Pausen-Leiste | fest am unteren Rand, surface, obere Linie border | `FloatingRestTimer.swift` |
| Demo-Banner | „DEMO · Synthetic data“ mit Kolben-Symbol und „Exit demo“ in action auf surface | `DemoSession.swift` |
| Diagramme | Balken: aktuelle Woche/heute action, sonst chartHistory. Linien und Punkte action. Ziellinie gestrichelt 6/4 in secondaryText | `DashboardComponents.swift`, `BodyWeightViews.swift`, `SleepViews.swift` |

## Icons
- Die alte App nutzt **SF Symbols**. Diese dürfen laut Apple-Lizenz nur auf Apple-Plattformen verwendet werden, **nicht im Web**.
- Für die Web-App braucht es freie, selbst eingebundene Ersatz-Icons in ähnlicher Strichstärke, z. B. Lucide (ISC-Lizenz). Das ist eine Web-Anpassung.
- Wichtigste Symbole und ihre Bedeutung:

| SF Symbol | Bedeutung |
|---|---|
| square.grid.2x2 | Tab Dashboard |
| list.bullet.rectangle | Tab Blueprints, Vorlage |
| clock.arrow.circlepath | Tab History |
| gearshape | Tab Settings |
| figure.strengthtraining.traditional | Kraft-Session |
| figure.run | Cardio |
| shuffle | Freestyle |
| crown / crown.fill | PR-Tracking, Rekord |
| target | Ziel |
| scalemass | Körpergewicht |
| moon.zzz.fill | Schlaf |
| timer | Pause |
| flame / dumbbell | Aufwärm- / Arbeitssatz |
| checkmark.square.fill / square | Satz erledigt / offen |
| calendar, calendar.badge.plus | Trainingsplan, nachtragen |
| sparkles | Starter-Vorlagen, Einführung |
| play.fill | Workout starten / fortsetzen |
| arrow.uturn.backward | Undo |
| ellipsis / ellipsis.circle | Menü |
| info.circle | Erklärung |
| trophy.fill | Gewichtsziel erreicht |
| flask / flask.fill | Übung, Demo |
| diamond, bolt.fill, shield.lefthalf.filled, crown.fill, star.circle.fill, laurel.leading | Ränge Foundation bis Legend |

## App-Icon
- Ein breites, nach vorn geneigtes „M“ mit Silberschimmer und einem Jade-Knick auf Graphit.
- Drei PNG-Dateien mit 1024 × 1024 px: `Tracker/Assets.xcassets/AppIcon.appiconset/Motion-Default.png`, `Motion-Dark.png` (identisch) und `Motion-Tinted.png` (Graustufen).
- Vektor-Vorlage: `Scripts/GenerateAppIcon.swift`.
- Für die PWA in Phase 1 kopiere ich `Motion-Default.png` in den neuen Ordner und erzeuge daraus die Größen 192, 512, maskable und Apple-Touch.

## Animationen
Alle Animationen werden bei „Bewegung reduzieren“ abgeschaltet oder durch ein statisches Bild ersetzt (Web: `prefers-reduced-motion`).

| Animation | Ablauf | Bei reduzierter Bewegung |
|---|---|---|
| Opening | 2,2 s, ein gemeinsamer Takt. Bänderskulptur (6 Bänder × 64 Segmente, 3D-Projektion, Perspektive 650) fließt und sammelt sich zu einer aufsteigenden Form (Phase 0,12–0,68). Kamera dreht (yaw −0,55 → +0,25). Ein Lichtstreifen wandert. Horizontlinie blendet ein (0,45–0,75). Buchstaben von „MOTION“ gleiten nacheinander hoch (0,42 + i·0,018 → 0,65 + i·0,018). Unterzeile blendet ein (0,67–0,82). Ausblenden ab 0,86. Easing überall smoothstep x²(3−2x). Querformat: Skulptur links, Wortmarke rechts | 0,35 s, statisches Bild bei Fortschritt 0,82, ohne Skulptur, Ausblenden ab 0,55 |
| Silberschimmer | ein einzelner heller Streifen (weiß 23 %, 45 % Breite, 25° geneigt), 0,6 s easeInOut nach 0,16 s | aus |
| Feier-Eingang | Inhalt blendet ein und gleitet 16 pt hoch, 0,35 s easeOut | nur einblenden |
| Rekord-Zielbalken | nach 250 ms vom alten auf den neuen Wert, 0,75 s easeInOut | sofort Endwert |
| XP-Feier | Gesamtdauer 2,8 s. XP zählen ab 0,25 s für 1,8 s hoch (ease-out kubisch). Level-Grenze: ein Lichtpuls am Balken, klingt in 0,7 s ab. Schimmer 1,85–2,55 s | sofort Endstand |
| Satz abhaken | Hintergrundwechsel 0,1 s easeOut | ohne Animation |
| Knopf drücken | 6 % dunkler, 98,5 % Größe | gleich |

## Haptik
- Siehe `FUNKTIONEN.md`, Abschnitt 15.
- Im Web gibt es Vibration nur über `navigator.vibrate`. Das funktioniert auf Android-Chrome, nicht in Safari auf dem iPhone. Das ist eine Web-Anpassung.

## Barrierefreiheit (Vorbild für die Web-App)
- Jede Grafik hat eine Textbeschreibung (Diagrammbalken mit Datum und Wert, Fortschrittsbalken mit Prozent).
- Wichtige Ereignisse werden angesagt: Rekord und „Rest complete. Ready for your next set.“
- Der Fokus springt in der Einführung auf den Titel jeder Seite.
- Unterstützt werden Dynamic Type (große Schrift), Kontrast erhöhen und Bewegung reduzieren.
