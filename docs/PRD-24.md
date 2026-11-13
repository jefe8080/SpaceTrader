# PRD 24: Fraktionsgrenzen und ultraseltene Rohstoffe

## Status und Ziel

Planungsentwurf vom 13.11.2026. Die unten aufgeführten Grundregeln sind mit
dem Nutzer geklärt; die Preiserhöhung ist noch offen. Keine Umsetzung beauftragt.

Fraktionen sollen neue Angriffe auf Spieler auf ihren eigenen Sektor begrenzen.
Kostenlos abbaubare ultraseltene Rohstoffe werden auf Fraktionssektoren
konzentriert. Der Einkauf mit anschließender Verarbeitung und Verkauf soll
weniger lukrativ werden.

## Bestätigte Anforderungen

### 1. Auswahl neuer Angriffe auf Spieler

- Ein Fraktionsverband darf ein Spielerziel nur auswählen, wenn sich das Ziel
  innerhalb seines eigenen Fraktionssektors befindet.
- Die Grenze gilt für neue offensive Angriffe und neue defensive Zielauswahl,
  insbesondere Grenzabfangen. Der bisherige Schutzradius allein genügt nicht.
- Ein bereits begonnener Angriff darf ein Schiff über Sektorgrenzen hinweg
  verfolgen. Ein Grenzübertritt allein beendet weder Angriff noch Verfolgung.
- Sonstige Abbruchbedingungen bleiben bestehen. Eine spätere neue Zielauswahl
  muss die Sektorgrenze erneut prüfen.
- Angriffe zwischen Fraktionen bleiben einschließlich sektorübergreifender
  Angriffe unverändert.

### 2. Aggression gegen Spieler

- Aggressionszuwachs berücksichtigt nur Spieleraktivität innerhalb des eigenen
  Sektors des jeweiligen Fraktionsverbandes; Nachbarsektoren zählen nicht mehr.
- Der Zuwachs steigt von 0,5 auf 1,0 pro aktiver Spielminute (Faktor 2).
- Bei unveränderter Raid-Schwelle von 60 wird diese ausgehend von 0 nach
  60 anrechenbaren aktiven Spielminuten erreicht statt nach 120.
- Friedenstimer, Freundschaft, Neutralitätsphase, Versorgungspause,
  Aggressionsabbau und Raid-Cooldown bleiben unverändert.
- Die Aktivitätsauswertung für andere Mechaniken, etwa Fraktionswirtschaft,
  wird dadurch nicht pauschal verändert.

### 3. Ultraseltene Asteroidenfelder

- Ultraseltene Asteroidenfelder entstehen ausschließlich in Sektoren mit
  Fraktionspräsenz.
- Jedes Fraktionssonnensystem enthält bei der Generierung garantiert mindestens
  ein ultraseltenes Asteroidenfeld. Eine Förderstation erfüllt diese Garantie nicht.
- Die Garantie verlangt mindestens eine Rohstoffart, nicht alle sechs Arten.
- Normale Sonnensysteme innerhalb eines Fraktionssektors dürfen weiterhin
  ultraseltene Asteroidenfelder nach den bisherigen Zufallsregeln enthalten.
- Außerhalb von Fraktionssektoren entstehen keine ultraseltenen Asteroidenfelder,
  auch nicht über alternative Generierungspfade.
- Betroffen sind Rohgold, Rohdiamanten, Uranerz, instabile Antimaterie,
  exotische Rohkristalle und rohes Nebelgas.

### 4. Förderstationen und Preise

- Förderstationen bleiben weiterhin selten in allen Sektortypen möglich.
  Ihre bisherige Verteilung wird durch die Asteroidenregel nicht eingeschränkt.
- Die Einkaufspreise ultraseltener Rohstoffe sollen etwas steigen, damit
  Einkauf, Verarbeitung und Weiterverkauf weniger Gewinn abwerfen.
- Die Höhe und technische Ausgestaltung der Erhöhung sind noch zu bestätigen.
- Verkaufspreise veredelter Waren dürfen nicht automatisch im gleichen Maß
  steigen und damit die beabsichtigte Margensenkung aufheben.

### 5. Welt und Spielstände

- Die Änderung wird für neue Welten und neue Spielstände geplant.
- Keine Migration oder Kompatibilitätsarbeit für bisherige Welten erforderlich.
- Keine automatische Löschung vorhandener Spielstände als Teil dieses PRD.

## Offene Preisentscheidung

Vorschlag, noch nicht bestätigt: Spieler zahlen an ultraseltenen Förderstationen
20 % mehr für die sechs Rohstoffe. Bestehende Verkaufserlöse und die Preisbasis
veredelter Waren bleiben unverändert. Vor Umsetzung die Preisableitung prüfen,
damit eine höhere Rohstoffbasis nicht indirekt auch Veredelungserlöse erhöht.

## Technische Ausgangslage

- `server/war/raids.js`: `tickAggression` berücksichtigt aktuell auch die sechs
  Nachbarsektoren; `launchRaids` und `borderDefense` brauchen getrennt von
  laufenden Angriffen eine Sektorprüfung für Spielerziele.
- `server/war/engage.js`: bestehende Verfolgung bei Grenzübertritt erhalten.
- `shared/warfare.js`: `AGGRESSION.RISE_PER_MIN` aktuell 0,5.
- `server/worldgen.js`: zufällige Asteroidenfelder in normalen und
  Fraktionssystemen von der separaten Förderstationsgenerierung unterscheiden.
- `shared/goods.js`: Rohstoffe und veredelte Waren tragen beide `ultra: true`;
  keine pauschale Preisänderung aller so markierten Waren.
- Vor Preisimplementierung die tatsächliche Kauf-/Verkaufspreisberechnung und
  die abgeleiteten Veredelungspreise nachvollziehen.

## Teilschritte und Fortschritt

1. [x] Grundregeln klären und PRD-Entwurf anlegen.
2. [ ] Preishöhe und Preiswirkung bestätigen; Planung abschließen.
3. [ ] Zielauswahl auf eigenen Sektor begrenzen; Verfolgung und Fraktionskriege
   durch Regressionstests absichern.
4. [ ] Aggressionsgebiet und Rate anpassen; Ausnahmen und Nachbarsektoren testen.
5. [ ] Asteroidenverteilung und Garantie umsetzen; Förderstationen erhalten.
6. [ ] Bestätigte Preisanpassung umsetzen und Margen vorher/nachher prüfen.
7. [ ] Gesamte Regression prüfen, relevante Spielbeschreibungen aktualisieren
   und Abnahme dokumentieren.

Jeder abgeschlossene Umsetzungsschritt erhält passende Prüfungen und einen
eigenen Commit einschließlich aktualisiertem PRD-Fortschritt.

## Abnahmekriterien

- Spielerziel im eigenen Sektor: neue Angriffe unter den bisherigen weiteren
  Voraussetzungen möglich; Spielerziel jenseits der Grenze: keine neue Auswahl.
- Begonnene Verfolgung über die Grenze bleibt aktiv; nach Ende darf ein Ziel
  außerhalb nicht erneut ausgewählt werden.
- Fraktionsangriffe auf andere Fraktionen funktionieren weiterhin über Grenzen.
- Aktivität nur im Nachbarsektor erhöht die lokale Aggression nicht; Aktivität
  im eigenen Sektor erhöht sie um 1,0 pro anrechenbarer Spielminute.
- Bisherige Aggressionsausnahmen bleiben wirksam.
- Generierungstests über mehrere Seeds und Sektorkoordinaten finden keine
  ultraseltenen Asteroidenfelder in fraktionsfreien Sektoren und mindestens
  eines in jedem Fraktionssonnensystem.
- Förderstationen bleiben auch in fraktionsfreien Sektoren nachweisbar und
  erfüllen nicht ersatzweise die Asteroiden-Garantie.
- Gleicher Seed und gleiche Koordinaten erzeugen weiterhin gleiche Ergebnisse.
- Für jede der sechs Rohstoff-Veredelungsketten ist die Marge beim Einkauf an
  Förderstationen nach der bestätigten Preisänderung geringer als vorher;
  Rezepte, Ausbeuten und veredelte Verkaufserlöse bleiben dabei gleich.
- Keine Bestandsmigration wird benötigt; Tests verwenden neue Welten.

## Prüfstand

Nur Planung und lesende Codeprüfung; keine Spielcodeänderung und keine
Laufzeittests. Dokumentprüfung vor dem Planungscommit: `git diff --check`.
