# PRD 21 – Industrielle Orbitalringe in der Weltraumansicht

## Ziel und Umfang
Neue gezeichnete Comic-Sci-Fi-Entwürfe für die vorhandenen Orbital-Ausbaustufen: deutlich größer und wuchtiger, als industrielle Werftringe erkennbar. Derselbe Stil wie die unter PRD 20 freigegebenen Schiffe, Stationen und Planeten. Zunächst Entwürfe zur Bildabnahme, noch keine Renderer-Änderung. Die etablierte Bildabnahme vor Einbau gilt weiterhin. Weitere Planungsfragen sind für diesen klar begrenzten Designauftrag nicht nötig.

## Vorhandene Spielzustände
Quelle: server/orbital.js und client/js/ui/homeworld.js. Gebrochener/nicht wiederhergestellter kleiner Ring; betriebsbereiter kleiner Ring (small); erster fertiger großer Abschnitt (largeStage=1); großer Ring vollständig (large und largeStage=2); Doppelwerft (doubleYard). Laufende Projekte sind zusätzliche Bauzustände, keine neue Spielmechanik. Die derzeitige Kartenzeichnung in orbitalRings.js zeigt nur dünne geometrische kleine/große Ringe; Abschnitt und Doppelwerft haben bisher keine eigene Silhouette.

## Gestaltungsanforderungen
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
- [ ] Fünf Zustände als gemeinsame Vergleichstafel zeichnen.
- [ ] Detailentwurf der fertigen Doppelwerft zeichnen.
- [ ] Bilder auf Perspektive, Fortschritt, Lesbarkeit und Vollständigkeit prüfen; Prompts und Ergebnisse unter docs/art/prd21 sichern.
- [ ] Nutzerabnahme.
- [ ] Erst nach Abnahme: Produktionsgrafiken mit getrennten Vorder-/Hintergrundteilen erstellen, alte geometrische Ringzeichnung ersetzen und im Spiel prüfen.

Keine Änderung an Baukosten, Bauzeit, Kapazitäten oder gespeicherten Spielzuständen in diesem Designauftrag. Der Bodenausbau der Ruinenwelt bleibt unabhängig vom Orbitalzustand. Für reine Entwürfe sind Dateiprüfung und visuelle Prüfung angemessen; Renderer- und Spieltests folgen bei Integration.
