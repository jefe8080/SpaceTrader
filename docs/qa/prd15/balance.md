# PRD 15: Vergleichsszenarien der Kampfbalance

Erzeugt mit `node sim/prd15-balance.js` am 2026-10-31 (5 Läufe je Szenario, echte Schlacht-KI, Seite A offensiv, Seite B Standardhaltung).

Treffer, Ziele und Rückzüge enthalten Zufall; die Tabelle zeigt Tendenzen, keine exakten Gewinnraten.

| Szenario | Kosten A / B (Cr) | Siege A | Siege B | Unentschieden | Ø Dauer (s) | Ø Restrumpf A / B |
|---|---|---|---|---|---|---|
| Flotten gleicher Kosten: 3 Sperber gegen 1 Greif | 2.400.000 / 2.400.000 | 5 | 0 | 0 | 90 | 88 % / 5 % |
| Staffeln gegen schwere Waffen: 4 Hornissen + 2 Wespen gegen 1 Bastion | 880.000 / 7.000.000 | 0 | 5 | 0 | 27 | 4 % / 72 % |
| Ionen gegen Schilde: Netzkreuzer gegen Bastion | 14.000.000 / 7.000.000 | 5 | 0 | 0 | 135 | 69 % / 0 % |
| Flankenangriff gegen Frontspezialist: 2 Karawanen gegen 2 Sternenläufer | 40.000.000 / 48.000.000 | 0 | 5 | 0 | 54 | 2 % / 78 % |
| Fraktionsmodell gegen Standard: Sternenläufer gegen Sperber | 24.000.000 / 800.000 | 5 | 0 | 0 | 62 | 93 % / 0 % |
| Eskorte gegen Raid: 2 Habicht gegen Lastesel + Habicht | 440.000 / 260.000 | 5 | 0 | 0 | 19 | 86 % / 42 % |

Verarmter Sektor und Wiederaufbau sowie schneller Frachter gegen Verfolger sind als automatisierte Tests in `tests/prd15-factions.test.js` und `tests/prd15-integration.test.js` abgedeckt.
