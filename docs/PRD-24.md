# PRD 24: Fraktionsgrenzen und ultraseltene Rohstoffe

## Status und Ziel

Planung vom 13.11.2026 abgeschlossen. Die Grundregeln und die Preiserhöhung
sind mit dem Nutzer bestätigt. Umsetzung am 13.11.2026 beauftragt.

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
- Die Einkaufspreise der sechs ultraseltenen Rohstoffe an Förderstationen
  steigen um 20 %, damit
  Einkauf, Verarbeitung und Weiterverkauf weniger Gewinn abwerfen.
- Bestehende Verkaufserlöse und die Preisbasis veredelter Waren bleiben
  unverändert, damit die beabsichtigte Margensenkung erhalten bleibt.

### 5. Welt und Spielstände

- Die Änderung wird für neue Welten und neue Spielstände geplant.
- Keine Migration oder Kompatibilitätsarbeit für bisherige Welten erforderlich.
- Keine automatische Löschung vorhandener Spielstände als Teil dieses PRD.

## Bestätigte Preisentscheidung

Bestätigt am 13.11.2026: Spieler zahlen an ultraseltenen Förderstationen
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
2. [x] Preishöhe und Preiswirkung bestätigen; Planung abschließen.
3. [x] Zielauswahl auf eigenen Sektor begrenzen; Verfolgung und Fraktionskriege
   durch Regressionstests absichern.
4. [x] Aggressionsgebiet und Rate anpassen; Ausnahmen und Nachbarsektoren testen.
5. [x] Asteroidenverteilung und Garantie umsetzen; Förderstationen erhalten.
6. [x] Bestätigte Preisanpassung umsetzen und Margen vorher/nachher prüfen.
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

Umsetzung Schritt 3: Sektorprüfung anhand der Zielposition bei offensiver und
defensiver Spielerzielauswahl. Bestehende Verfolgung bleibt unverändert.
Prüfung: `node --test tests/prd24-war.test.js tests/prd15-raids.test.js` (6/6).

Umsetzung Schritt 4: Nur eigene Sektoraktivität zählt, Rate 1,0 pro Minute.
Fraktionswirtschaft unverändert. Prüfung: PRD24-Krieg, PRD15-Raids und
PRD15-Fraktionen (14/14 Tests).

Umsetzung Schritt 5: Normale Systeme filtern ultraseltene Felder außerhalb von
Fraktionssektoren. Jedes Fraktionssystem reserviert vor den übrigen Objekten
ein ultraseltenes Feld; maximal zwei Felder pro System bleiben erhalten.
Förderstationen werden weiterhin separat erzeugt. Keine Migration/Löschung.
Prüfung: 245 Sektoren (5 Seeds), Determinismus, Garantie, Überlappungen,
normale Systeme und fraktionsfreie Förderstationen; Weltregression (11/11).
Die alten Weltprüfsummen wurden wegen der absichtlichen Generierungsänderung
auf neue Referenzwelten aktualisiert.

Umsetzung Schritt 6: Kaufaufschlag als `buyFactor: 1.2` ausschließlich am
Rohstoffangebot der Förderstationen. `buyPrice` und Client-Serialisierung
berücksichtigen ihn; Mittel-/Verkaufspreise, Warenbasis und Rezepte unverändert.
Prüfung: sechs Ketten bei vier Füllständen und drei Standortmodifikatoren,
unveränderte Rezept-/Preisreferenz, Clientpreis und tatsächliche Abbuchung
(2/2 Preistests; 10/10 Weltregression).

### Margenvergleich je Rezeptdurchlauf

Rechenbeispiel: alle Slots zu 70 % gefüllt, Standortfaktor 1, Zutaten werden
gekauft, veredelte Ware verkauft; ohne Flugkosten und weitere Gebühren.
Gleiche Slots, Rezepte und Verkaufserlöse vor/nach dem Kaufaufschlag.

| Rohstoff | Kaufpreis vorher | Kaufpreis nachher | Marge vorher | Marge nachher |
|---|---:|---:|---:|---:|
| Rohgold | 303.66 | 364.39 | 183.39 | 61.93 |
| Rohdiamanten | 469.95 | 563.94 | 410.60 | 222.62 |
| Uranerz | 375.96 | 451.15 | 277.89 | 127.51 |
| Unstabile Antimaterie | 1373.69 | 1648.43 | 682.86 | 408.12 |
| Exotische Rohkristalle | 636.24 | 763.48 | 527.33 | 272.83 |
| Rohes Nebelgas | 224.13 | 268.95 | 252.11 | 117.63 |
