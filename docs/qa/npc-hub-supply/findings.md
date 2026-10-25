# NPC-Planetenversorgung: Hub-Verkehr

Stand: 2026-10-25. Klar abgegrenzte Fehlerkorrektur ohne eigenes PRD.

## Befund

Die lokalen Datenbanken enthielten keine aktiven NPC-Versorgungsaufträge und erlauben keine Aussage zum laufenden Server des Nutzers.
Eine frische In-Memory-Welt (homeworld, Seed 42, nur Startsektor) wurde 3600 Spielsekunden mit Einsekundenschritten simuliert. Der Sektor wurde vor jedem Schritt als aktiv markiert. Kein Spieler wurde angelegt und keine Bestände oder Geldmittel wurden verändert.

Vorher: nach 600 Sekunden 143 Versorgungsschiffe, alle mit Hub als Quelle; Maximum 145; nach 3600 Sekunden noch 128. Laufzeit etwa 24,5 Sekunden.
Nachher: nach 600 Sekunden 7 Versorgungsschiffe; Maximum 9; nach 3600 Sekunden 0. Die verbleibenden Hub-Aufträge gehören öffentlichen Stationen, nicht Planeten. Laufzeit etwa 9,2 Sekunden.

Das belegt übermäßigen Hub-Verkehr und eine deutliche Verringerung der Simulationslast. Die Laufzeiten sind Einzelmessungen ohne Benchmark-Isolation; eine konkrete Verbesserung der Client-Bildrate oder die alleinige Ursache auf dem laufenden Server ist damit nicht bewiesen. Schiffspositionen beim Erzeugen sind zufällig, daher können Einzelzahlen leicht schwanken.

## Korrektur und Abnahme

- [x] Automatische NPC-Planetenversorgung schließt Hubs als Bezugsquelle aus (aktueller und älterer Versorgungsweg).
- [x] Echte Produzenten bleiben als Quelle erlaubt; Spielerhandel bleibt unberührt.
- [x] Bereits gespeicherte Einkaufsaufträge kehren ohne weiteren Hub-Einkauf zurück. Normale Abrechnung erstattet reserviertes Geld und liefert bezahlte Fracht aus.
- [x] Hubs sind auch als alternative Abnehmer dieser Planetentransporte ausgeschlossen; gespeicherte Umleitungen werden zurückgeführt.
- [x] Regressionstests für Quellenauswahl, direkte Ladesperre, Rückkehr, Geld, Fracht und Freigabe der Transportbelegung.
- [x] Gesamte Testsuite: 322 Tests erfolgreich.

Die Änderung greift nach Neustart des Servers mit dem neuen Code. Bestehende Schiffe verschwinden nach ihrer Rückkehr und Abrechnung, nicht sofort.
