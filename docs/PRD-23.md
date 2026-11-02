# PRD 23: Aktives Abfangen gegnerischer Angriffe

## Ziel und bestätigte Regeln

Kriegsschiffe in Haltung Abfangen fliegen sichtbare gegnerische Angreifer bereits
vor dem Beginn einer Schlacht aktiv an. Geschützt werden eigene und militärisch
verbündete Einheiten sowie Planeten. Alle verfügbaren Kriegsschiffe beziehungsweise
militärischen Gruppen rücken aus; laufende Kampf- und Reparatureinsätze bleiben bestehen.

Der bestehende Radius `COMBAT.INTERCEPT` (75.000 Spieleinheiten) bleibt erhalten.
Bei Einsatzbeginn gilt die Schiffsposition als fester Ausgangspunkt. Bricht der
Gegner seinen Angriff ab oder verlässt diesen Radius, endet die Verfolgung.
Bisherige Aufträge werden anschließend fortgesetzt. Es gibt keine Teleportation;
ein langsamer Abfänger kann einen schnellen Angriff weiterhin verpassen.

## Umfang und Abnahme

- Sichtbare aktive Schiffangriffe und Planetenraids lösen vor der Bewegung aus.
- Eigene und aktive militärische Bündnisse werden berücksichtigt, passive und
  bewachende Schiffe lösen keine aktive Verfolgung aus.
- Mehrere Abfänger verfolgen denselben Gegner, stellen ihn auf Waffenreichweite
  und treten einer daraus entstehenden Schlacht auf derselben Seite bei.
- Unsichtbare, geschützte oder nicht feindliche Angreifer lösen nicht aus.
- Abbruch, feste Radiusgrenze und Fortsetzung unterbrochener Aufträge sind getestet.
- Bestehende Schlachtunterstützung und Bewachen bleiben verfügbar.

## Teilschritte und Fortschritt

1. [x] Regeln und bestehende Radiusdefinition klären; PRD anlegen.
2. [ ] Aktive Bedrohungserkennung, Anflug, Abbruch und Schlachtbeitritt umsetzen;
   UI-Beschreibung anpassen und Regressionstests ausführen.

## Prüfung

Ausstehend.
