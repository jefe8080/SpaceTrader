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
- [x] P3: Gezeichnete Assets, Canvas-Stadtansicht, Umgebung und dezente Animationen implementieren; neue Ansicht und reduzierte Bedienung integrieren. 25 modulare Sprites und 13 Landschaften, gepflasterte Straßen/Platz, Wohnbebauung und Landeplatz, Figuren, Fokus/Pan/Zoom/Touch sowie zugängliche Tastaturziele. Auswahlbalken entfernt; Verlassen/Übersicht/Namen bleiben als Einzelbuttons. Erste Browserprüfung aller Typen und 11 gezielte Tests erfolgreich.
- [x] P4: Alle Typen und dynamische Zustände visuell prüfen; Interaktion, Kamera, Touch und bestehende Spielfunktionen testen, Befunde korrigieren und dokumentieren. 311/311 automatisierte Tests; Browserprüfung von 13 Typen/238 Objekten ohne Fehlertreffer oder JavaScript-Fehler, Touch/Pinch, Keyboard, Escape, Fokus und dynamische Heimatwelt geprüft. PRD-7-Browserregression ebenfalls erfolgreich. [Abnahmeprotokoll und Bilder](qa/prd8/README.md).

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

## Gestalterische Korrektur – Agrarwelt vor erneuter Freigabe

Die erste technische Umsetzung wurde vom Nutzer gestalterisch abgelehnt: zu große Abweichung vom freigegebenen Testbild, rechteckiges Raster, ungeeignete und falsch platzierte Dekorhäuser, übereinander gezeichnete Straßen und offensichtlich gespiegelte Landschaft. P1–P4 dokumentieren die erste Umsetzung und stellen **keine gestalterische Nutzerabnahme** dar.

Bestätigte Entscheidungen am 25.10.2026:

- Zuerst die tatsächliche Agrar-Spielansicht überarbeiten und mit Screenshots zur gestalterischen Prüfung vorlegen. Die anderen zwölf Typen werden erst nach dieser Freigabe übertragen.
- Wohnhäuser, Straßen, Plätze und Landschaft werden gemeinsam komponiert und gezeichnet, eng am ursprünglichen Entwurf. Keine separat verteilten Umgebungshäuser und kein rechteckiges Straßenraster.
- Eine großzügig über die eigentliche Stadt hinausreichende Landschaft ersetzt die gespiegelten Kacheln. Kamera und minimaler Zoom werden so begrenzt, dass nie ein Bildrand sichtbar wird; die Stadt soll dabei natürlich in die Umgebung übergehen.
- Funktionale Orte erhalten individuell gesetzte, überprüfte Standorte. Fest gezeichnete Gebäude dürfen über präzise Trefferflächen ihre bisherigen Panels öffnen; variable Bauten und Figuren bleiben eigene Ebenen. Bauplätze/Fabriken liegen in eigens gestalteten, angeschlossenen Erweiterungsvierteln.
- Alle bisherigen Funktionen, Warenunterschiede, dynamischen Bauten und Bedienelemente bleiben erhalten. Visuelle Kontrolle prüft nun ausdrücklich auch Standorte gegen Wasser, Bebauung, Wege und Bildkomposition; überlappungsfreie mathematische Rechtecke allein reichen nicht aus.

### Korrekturschritte

- [x] K1: Kritik, Architekturkorrektur und Agrar-Zwischenabnahme dokumentieren; Planungscommit.
- [x] K2: Zusammenhängende große Agrar-Stadtillustration, individuelle Funktionsstandorte und geplantes Erweiterungsviertel integrieren. Rasterstraßen, Dekorhausverteilung und Spiegelung für Agrar entfernt. Die Kamera hält alle vier sichtbaren Bildecken innerhalb der Illustration. Feste gezeichnete Funktionsgebäude besitzen eigene Trefferflächen; vier dynamische Fabrikplätze teilen die vorherigen Bauplatzstandorte. 14 gezielte Tests erfolgreich, einschließlich maximaler Agrar-Ausstattung und Kameragrenzen in fünf Bildschirmformaten. Erste Browserprüfung aller 13 Typen ebenfalls erfolgreich; neue Komposition nur für Agrar. Produktionsdetails unter [agrar-revision.md](art/prd8/agrar-revision.md).
- [x] K3: Tatsächliche Agrar-Spielansicht auf Desktop und mobil visuell geprüft, unterschiedliche Ausstattung und Bauänderungen getestet, Screenshots und Prüfergebnisse gesichert. 314/314 automatisierte Tests; Browserprüfung aller 13 Typen als Regression, zusätzlich Agrar-Prüfung mit genau einem Landschaftsbild pro Frame, ohne Dekorhäuser/Straßenberechnung/Spiegelung. 48 echte Browser-Kamera-Grenzfälle, vier Fabrikhöfe und zusätzliche Waren geprüft. [Tatsächliche Spielansicht und Prüfprotokoll](qa/prd8/agrar-revision/README.md). Die gestalterische Nutzerabnahme bleibt K4.
- [x] K4: Tatsächliche Agrar-Spielansicht vom Nutzer als Grundlage für die anderen Planetentypen freigegeben; Übertragung ausdrücklich beauftragt.

### Übertragung auf die übrigen zwölf Typen

- [x] T1: Freigabe und Übertragungsplan dokumentieren; Planungscommit.
- [ ] T2: Elf weitere bewohnte Planetentypen erhalten eigene zusammenhängende Stadtillustrationen, passende Waren-/Servicegebäude, individuell gesetzte Trefferflächen, angeschlossene Fabrikhöfe und begrenzte Kamera. Keine generierten Rasterstraßen, separat verteilten Umgebungshäuser oder gespiegelten Ränder. Agrar-Freigabe bleibt Maßstab; geprüfter Umsetzungscommit.
- [ ] T3: Ruinen-Heimatwelt als zusammenhängende bewohnte Ruinenlandschaft integrieren. Alle Einrichtungen, Baustellen, freien Grundstücke, gebauten Strukturen und Orbitalstufen bleiben dynamisch an fest gestalteten Standorten; geprüfter Umsetzungscommit.
- [ ] T4: Vollständige funktionale Regression, Browserprüfung aller Typen und Kameragrenzen, mobile Darstellung, variable Ausstattung und Bauänderungen sowie visuelle Kontrolle mit Übersicht und Einzelbildern. Befunde korrigieren, PRD und Abnahmeprotokoll aktualisieren; Abschlusscommit.

Für alle Typen gelten die beim Agrarplaneten bestätigte räumlich zusammenhängende Gestaltung und dieselben Bedienfunktionen. Gezeichnete, aktuell nicht aktive Geschäfte bleiben Stadtbestandteil ohne Aktion. Änderliche Strukturen und Figuren werden als eigene Ebenen an geprüften Standorten ergänzt. Alle 13 Ansichten werden anhand tatsächlicher Spielaufnahmen beurteilt. Kein automatischer Push; die zuletzt erteilte Push-Freigabe bezog sich auf die damaligen vier ursprünglichen PRD-8-Commits.
