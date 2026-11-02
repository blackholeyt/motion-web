# Gerätefunktionen im Web: was geht und was nicht

Alle Gerätefunktionen laufen über `src/platform/` (Schnittstellen in `types.ts`, Web-Umsetzung in `web.ts`). Eine spätere Capacitor-App tauscht nur diese Umsetzung aus.

| Funktion | Android (Chrome) | iPhone (Safari / installierte PWA) | Native App später |
|---|---|---|---|
| Offline-Start nach dem ersten Besuch | ja | ja | ja |
| Pausen-Timer korrekt nach Sperren, Wechseln oder Neuladen | ja, weil er aus dem gespeicherten Endzeitpunkt rechnet | ja, gleicher Grund | ja |
| Ton, Vibration oder Ansage bei Pausen-Ende **im Vordergrund** | ja | Ansage und Bildschirmhinweis ja, **keine Vibration** | ja |
| Mitteilung bei Pausen-Ende, **während die App im Hintergrund ist** | nur solange der Browser die Seite nicht anhält, also unzuverlässig | **nicht zuverlässig.** iOS hält Web-Apps im Hintergrund nach kurzer Zeit an. Zeitgesteuerte lokale Mitteilungen gibt es im Web nicht | ja (lokale Mitteilung wie in der alten App) |
| Bildschirm bleibt im Training an (Wake Lock) | ja | ja, in aktuellen iOS-Versionen; wird beim Verlassen der App automatisch aufgehoben | ja |
| Vibration (Haptik) | ja | nein (Safari unterstützt `navigator.vibrate` nicht) | ja |
| Dateien sichern / teilen | Teilen-Menü oder Download | Teilen-Menü | ja |
| Speicher vor automatischem Löschen schützen (`navigator.storage.persist`) | wird angefragt | wird angefragt. Installierte PWAs sind besser geschützt; ein Browser-Tab, der lange nicht geöffnet wurde, kann seine Daten verlieren. Mit Konto fängt die Cloud-Sicherung das ab | entfällt |
| Anmelden mit E-Mail-Code | ja | ja, auch in der installierten App: Der Code wird in der App eingetippt, es wird kein Link geöffnet. iOS schlägt den Code aus der Mail-App oft direkt über der Tastatur vor | ja |
| Anmelden mit Google | ja | Safari ja. In der installierten App öffnet iOS die Google-Seite in einem eingebetteten Browser und kehrt danach in die App zurück. **Noch auf deinem iPhone zu prüfen** (Abnahme Phase 4) | ja, später mit nativer Anmeldung |
| Abgleich im Hintergrund | nur solange die Seite läuft | nur solange die App geöffnet ist. Änderungen warten auf dem Gerät und gehen beim nächsten Öffnen raus | ja |
| Apple Health | – | – | ja (Platzhalter `health` in `src/platform/types.ts`) |

**Folge für das Training auf dem iPhone:** Die Pause stimmt immer, sobald du zur App zurückkehrst. Eine Benachrichtigung, während du in einer anderen App bist, kann die Web-Version auf dem iPhone aber nicht zuverlässig schicken. Am besten lässt du Motion während der Pause geöffnet. Dank Wake Lock bleibt der Bildschirm an.
