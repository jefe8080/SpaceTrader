# PRD 13 – Abnahme am 31.10.2026

Die vollständige Node-Testsuite besteht: **370 Tests, 0 Fehler**.
Der vollständige Lauf ist in [tests.txt](tests.txt) abgelegt.

## Gezielte Regressionen

- Bestehende Heimat-, Zugangs-, Planeten-, Wirtschafts-, Bevölkerungs- und
  Spezialisierungstests bestehen weiterhin.
- `tests/prd13.test.js` prüft Schulpersonal bei Fertigstellung und Migration,
  mehrere Schulen, Neubau und Akademieupgrade ohne weitere Personalzugabe.
  Ein tatsächlicher SQLite-Neustart prüft die gespeicherten Kennzeichnungen
  auf Ruinenwelten und normalen Planeten.
- Werkstattreparaturen sind vor H04 gesperrt und nach H04 auch auf einer
  weiteren Ruinenwelt möglich. Fremder Besitz und fehlende Verbindung
  verhindern den Eingriff; ein wiederholter Auftrag zieht keine Kosten ab.
- Fabrikbau in der aktuellen Wirtschaft erfordert Besitz, ein eigenes
  angedocktes Schiff und Baumaterial. Kosten, Kategoriegrenzen, Produktionslager,
  tatsächliche Produktion, Stillstand ohne Besitz und Abriss ohne Erstattung
  werden geprüft.
- Der entfernte Serverbefehl für manuelle Warengebäude-Upgrades wird abgewiesen.

## Browserabnahme

Isolierter Server mit Datenbank `:memory:` und aktivierten Entwicklungstools;
keine bestehenden Spielstände verändert. Wiederholbare Testseite:
`/dev/prd13.html`.

Bei **1440 × 900** und **390 × 844** geprüft:

- Alle Versorgungswerte befinden sich im Planetenbalken, einschließlich
  Qualifikationen, getrennten Lagern und roten Mangelmarkierungen.
- Der Wechsel zur Agrarwelt aktualisiert Namen und Werte; unbekannte Werte
  erscheinen als „—“. Im Weltall ist die Versorgung unsichtbar.
- Flotte auf- und zuklappbar; kompakt bleiben Zustand und Schiffsgrafik sichtbar.
  Schiffsnamen bleiben als `title` verfügbar, Auswahl markiert das gewählte Schiff.
- Der aktive Routenfilter bleibt beim Einklappen wirksam. Neuladen und
  Ansichtswechsel behalten den gespeicherten Klappzustand.
- Die sieben Bio-Rezepte eines normalen Planeten sind erreichbar und zeigen
  die bisherigen Kosten; bei vorhandenem Geld und angedocktem Baumaterial sind
  die Bauknöpfe aktiv. Die tatsächliche Buchung wird im Servertest geprüft.
- Rezeptpanel, Balken und Flottenpfeil überdecken einander nicht.

Screenshots:

- [Breite Planetenansicht](planet-wide.jpg)
- [Schmale Planetenansicht mit kompakter Flotte](planet-narrow.jpg)
- [Fabrikbau breit](factory-build-wide.jpg)
- [Fabrikbau schmal](factory-build-narrow.jpg)

Die zusätzlichen QA-Knöpfe am unteren Bildrand gehören ausschließlich zur
Testseite. Die Browsergröße wurde nach der Prüfung zurückgesetzt.

## Zwischenprüfungen

Ein anfänglicher Syntaxfehler bei der Bearbeitung von Dateien mit verschiedenen
Zeilenenden wurde vor dem Fabrikbau-Commit behoben. Frühere Tests erwarteten
noch die pauschale Fabrikbausperre beziehungsweise unveränderte Schulpopulationen.
Diese Erwartungen wurden an PRD 13 angepasst; die anschließenden gezielten und
vollständigen Läufe bestehen. Es verbleiben keine fehlgeschlagenen oder
nicht ausführbaren Prüfungen.

## Korrektur der Ressourcenposition nach Nutzerabnahme

Die Ressourcen sind jetzt Bestandteil der globalen obersten Leiste neben
den bestehenden Navigationselementen. Jede Kennzahl hat eine eigene
Beschriftung oberhalb ihres Wertepaars; die drei Planetenbuttons stehen
wieder einzeln rechts darunter. Die Höhe der Leiste wird für die Position
der Flotte berücksichtigt. Die bisherigen Screenshots dokumentieren den
ersten Stand; maßgeblich für die korrigierte Position sind:

- [Korrigierte obere Leiste, breit](resources-topbar-wide.jpg)
- [Korrigierte obere Leiste, schmal](resources-topbar-narrow.jpg)

Erneut geprüft: 12 Tests aus PRD 12 und 13 bestanden, JavaScript-Syntax
fehlerfrei, Browser bei 1440 × 900 und 390 × 844 sowie Ausblenden der
Ressourcen nach Verlassen des Planeten.
