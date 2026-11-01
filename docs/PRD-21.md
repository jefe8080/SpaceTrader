# PRD 21 – Industrielle Orbitalringe in der Weltraumansicht

## Ziel und Umfang
Neue gezeichnete Comic-Sci-Fi-Entwürfe für die vorhandenen Orbital-Ausbaustufen: deutlich größer und wuchtiger, als industrielle Werftringe erkennbar. Derselbe Stil wie die unter PRD 20 freigegebenen Schiffe, Stationen und Planeten. Zunächst Entwürfe zur Bildabnahme, noch keine Renderer-Änderung. Die etablierte Bildabnahme vor Einbau gilt weiterhin. Weitere Planungsfragen sind für diesen klar begrenzten Designauftrag nicht nötig.

## Vorhandene Spielzustände
Quelle: server/orbital.js und client/js/ui/homeworld.js. Gebrochener/nicht wiederhergestellter kleiner Ring; betriebsbereiter kleiner Ring (small); erster fertiger großer Abschnitt (largeStage=1); großer Ring vollständig (large und largeStage=2); Doppelwerft (doubleYard). Laufende Projekte sind zusätzliche Bauzustände, keine neue Spielmechanik. Die derzeitige Kartenzeichnung in orbitalRings.js zeigt nur dünne geometrische kleine/große Ringe; Abschnitt und Doppelwerft haben bisher keine eigene Silhouette.

## Gestaltungsanforderungen
- Nutzerfeedback zur ersten Tafel: deutlich zu wuchtig, kaum Freiraum zwischen Ring und Planet. Fassung 1 verworfen. Fassung 2 reduziert Ringbreite und Modulvolumen stark und schafft sichtbare dunkle Zwischenräume. Diese Proportionen müssen vor Detailausarbeitung bestätigt werden.
- Massive zusammenhängende druckfeste Ringsegmente, breite industrielle Tragwerke, angeschlossene Docks und sichtbar wachsende Werftkapazität.
- Creme und verwittertes Teal, dunkle Tuschekonturen, Messing/Kupfer, warme Arbeitslichter; passende gemalte Dreiviertelperspektive.
- In der Übersicht derselbe Planet in allen fünf Zuständen, ohne Veränderung seiner Boden-Ausbaustufe und ohne blauen Atmosphärensaum.
- Ringebene mit Vorder-/Hintergrund um den Planeten; der Planet bleibt gut lesbar. Große Werft ist ein physisches Bauwerk, kein Leuchtring.
- Kleiner fertiger Ring: geschlossener Träger mit kompakten Werkstatt-/Versorgungsmodulen und kleinen Baudocks.
- Großausbau Abschnitt 1: kleiner Ring bleibt; äußerer Ring etwa halb aufgebaut, Rest offen mit klaren Bau-Enden.
- Großausbau fertig: kleiner und vollständiger massiver äußerer Ring; große Werftbuchten und Logistik.
- Doppelwerft: gleiche beiden Ringradien wie beim großen Ausbau; zwei gleichwertige große Baudock-Komplexe, mehr Industrievolumen, kein zusätzlicher dritter Ring.

## Schritte und Abnahmekriterien
- [x] Vorhandene Zustände und Referenzen prüfen; Designumfang festlegen.
- [x] Fünf Zustände als gemeinsame Vergleichstafel zeichnen; zweite Fassung nach Nutzerfeedback erstellt.
- [x] Zusätzlicher Detailentwurf entfällt: Nutzer hat Fassung 2 freigegeben und direkte Umsetzung beauftragt.
- [x] Bilder auf Perspektive, Fortschritt, Lesbarkeit und Vollständigkeit prüfen; Prompts und Ergebnisse unter docs/art/prd21 gesichert. Fassung 2 zeigt fünf Zustände, zwei Ringe bei Großausbau/Doppelwerft, größere Freiräume und lokalisierte Baudocks. Noch keine Spielintegration.
- [x] Nutzerabnahme am 01.11.2026: zweite Fassung bestätigt; Umsetzung und anschließender Push ausdrücklich autorisiert.
- [ ] A: fünf freigestellte Ringzustände ohne eingebrannten Planeten erstellen und reproduzierbar in deckungsgleiche Vorder-/Hintergrundteile verpacken.
- [ ] B: zentrale Zustandsauswahl und gemalte Kartenzeichnung integrieren; alte geometrische Ringe vollständig ersetzen. Bodenentwicklung bleibt unabhängig, Planeten werden zwischen den Ringteilen gezeichnet.
- [ ] C: Zustände, laufende Projekte, Zoom/Anschnitt und Serienzustand prüfen; gesamte Testsuite und Browserprüfung; Nachweise dokumentieren und pushen.

## Implementierungsentscheidungen
Gebrochener Ring wird auf Ruinenwelten ohne fertigen kleinen Ring gezeigt, auch ohne bereits initialisiertes orbital-Objekt. Fertiger kleiner Ring, largeStage=1, large/largeStage=2 und doubleYard wählen die vier aufeinanderfolgenden fertigen Ausbaubilder. Ein laufendes Bauprojekt schaltet nicht vorzeitig auf das fertige Bild um. Kleine/Ruinenringe haben denselben Abstand zum Planeten; beim Großausbau kommen äußere Abschnitte hinzu, ohne den inneren Ring zu verschieben. Für die Zukunft größere Bilder: Ringdateien mit transparentem Hintergrund, gemeinsamer Anker im Planetenzentrum, zwei Ebenen pro Zustand. Ringbilder gehören zum zentralen Assetkatalog, Spiel-/Questdaten bleiben unverändert. Sichtbereich und Auswahl berücksichtigen das größere Ringbauwerk.

Keine Änderung an Baukosten, Bauzeit, Kapazitäten oder gespeicherten Spielzuständen in diesem Designauftrag. Der Bodenausbau der Ruinenwelt bleibt unabhängig vom Orbitalzustand. Für reine Entwürfe sind Dateiprüfung und visuelle Prüfung angemessen; Renderer- und Spieltests folgen bei Integration.
