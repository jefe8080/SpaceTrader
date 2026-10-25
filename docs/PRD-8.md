# PRD 8 – Gezeichnete planetare Stadtansicht

## Ziel und Freigabe

Die bisherige Planetenansicht wird durch eine zusammenhängende, gezeichnete 2D-Stadt in schräger Vogelperspektive ersetzt. Grundlage sind die bestätigte Grilling-Planung und der am 25.10.2026 freigegebene [Agrarstadt-Entwurf](art/prd8/agrar-concept.png). Die Umsetzung ist direkt die reguläre Ansicht, ohne Vorschau-Schalter. Wirtschaft, Berechtigungen, Quests, Bau, Dialoge und Minispiele bleiben unverändert.

## Anforderungen

- Europäischer Comic-/Fantasy-/Science-Fiction-Stil: Tuschekonturen, gemalte Oberflächen, Ocker, verwittertes Türkis und warme Betriebslichter; bestehende Gebäude dürfen passend weiterverwendet werden.
- Alle 13 Typen: Agrar, Ozean, Wüste, Bergbau, Eis, Stadt, Ferien, Gasriese, Dschungel, Vulkan, Kolonie, Industrie und Ruinen-Heimatwelt. Jeder Typ erhält einen eigenen Grundriss und passende Landschaft. Innerhalb eines Typs wird zunächst derselbe Grundriss verwendet.
- Zusammenhängende Wege und Plätze, Wohnbebauung und Umgebungsdetails statt lose verteilter Gebäude. Landschaft läuft über Bildränder weiter.
- Lager werden nach visuellen Warenfamilien unterschieden (Tanks, Silos, Kühlung, Schüttgut, Maschinen, Gefahrstoffe, Fracht, Passagiere, Technik), mit warenspezifischer Kennzeichnung. Dies fügt keine Wirtschaftsmechanik hinzu.
- Bettler und Hund sind echte Figuren, keine Gebäudesprites.
- Dezente Animationen, keine Verkehrssimulation oder Menschenmengen.
- Direkter Klick/Touch auf alle bisherigen Objekte mit ausreichend großen, eindeutigen Trefferflächen. Hover-Namen und zuschaltbare Namen; kein Objekt-Auswahlbalken und kein Gebäude-Dropdown. Der Verlassen-Button bleibt dauerhaft erreichbar.
- Verschieben, Mausrad-/Pinch-Zoom, automatische Fokussierung und Rückkehr zur Übersicht; bestehende Panels und Escape-Verhalten bleiben erhalten. Bedienung auch bei schmalen Ansichten und geöffnetem Panel.
- Stabile Objektidentitäten und Positionen bei Markt-/Bauaktualisierungen; keine verlorenen dynamischen Fabriken/Bauplätze. Ruinenwelt zeigt Ruinen, Baustellen, fertige Einrichtungen und Orbital-Ausbau.

## Umfang und Architektur

Ein eigener Canvas-2D-Renderer übernimmt dieselbe Viewer-Schnittstelle wie bisher (`show/hide/reset/load/select/pick/render`). `buildItems`, Panels, Aktionen und Serverlogik bleiben die fachliche Quelle. Typabhängige Stadtplanung, visuelle Warenklassifikation und Hit-Tests werden separat prüfbar gehalten. Gezeichnete modulare Assets werden mit Wegen, Umgebung und Dekoration zu dynamischen Städten komponiert. Der Entwurf ist eine Stil- und Kompositionsvorlage; ein einziges starres Hintergrundbild wäre für dynamische Bauten nicht ausreichend.

## Teilschritte und Fortschritt

- [x] P1: Planung und Freigaben dokumentieren, Referenz sichern; Planungscommit.
- [x] P2: Stadtpläne für alle Typen, vollständige Objektplatzierung, Warenfamilien und kompatible Heimatausbaustände implementieren und prüfen. `node --test tests/planet-city.test.js`: 4 Prüfungen erfolgreich, einschließlich 13 Typen, Überlappungsfreiheit, Trefferflächen, stabilen Positionen und Ausbauständen.
- [ ] P3: Gezeichnete Assets, Canvas-Stadtansicht, Umgebung und dezente Animationen implementieren; neue Ansicht und reduzierte Bedienung integrieren.
- [ ] P4: Alle Typen und dynamische Zustände visuell prüfen; Interaktion, Kamera, Touch und bestehende Spielfunktionen testen, Befunde korrigieren und dokumentieren.

Jeder abgeschlossene Schritt wird mit aktualisiertem Fortschritt separat committed. Kein Push ohne Zustimmung.

## Abnahmekriterien

1. Jeder Typ besitzt eine erkennbare eigene Umgebung und einen eigenen zusammenhängenden Stadtplan.
2. Jedes von `buildItems` gelieferte Objekt ist sichtbar und direkt erreichbar, auch nach Bau und Zustandsänderungen; stabile Schlüssel verbinden dieselben bisherigen Panels.
3. Agrar-Wasser-, Dünger-, Maschinen- und Konsumgüterlager sind bereits an ihrer Bauform unterscheidbar. Andere Waren nutzen passende Familien und individuelle Kennzeichnung.
4. Bettler und Hund sind als Mensch und Tier erkennbar und öffnen ihre bisherigen Aktionen.
5. Heimatwelt erhält alle Einrichtungen, Bauplätze, Strukturen, Baustände und Orbitalstufen.
6. Kein Gebäude-Dropdown oder bisheriger Auswahlbalken; Verlassen, Namen, Zoom, Verschieben, Fokus und Escape funktionieren.
7. Automatisierte Layout-/Hit-Test-Prüfungen sowie passende bestehende Tests bestehen. Browserprüfung mit Screenshots für alle Typen, schmale Ansicht und ausgewählten Ort; verbleibende Einschränkungen werden ausdrücklich festgehalten.

## Nicht im Umfang

Neue Wirtschaftssysteme, geänderte Waren oder Aktionen, individuelle Stadtpläne je Einzelplanet, frei laufende Figuren, Veröffentlichung und Push.
