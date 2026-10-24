# U7 – Betrieb und Aufbau

Alle 170 Tests erfolgreich. Zehn neue Integrationstests prüfen Materialbindung,
parallele Bauzeiten, tatsächliche Teams und Qualifikationen, Ausbildungspausen,
geschützte Reserven, gemeinsame Lagergrenzen, vollständige Rezeptzyklen,
Brennstoffverbrauch, Wachstum, eine Woche Unterversorgung und Neustarts.

`npm run sim:homeworld -- --seed 42` erreicht H04 bei 510 s, H05 bei 1.170 s
und H06 bei 1.997 s mit zwei Schiffen, 101 Einwohnern und 7.826 Cr.
Flüge, Rohstoffeinkäufe und Transfers laufen tatsächlich über die Spielregeln.
Dies ist weiterhin keine abschließende Balanceabnahme für U17.

Browserprüfung auf localhost:3007, isolierte Datenbank `data/prd5/qa-u7.db`:
Ausgangspunkt ist dieselbe Einstiegssimulation. Ausschließlich für die Bauprüfung
wurden anschließend 100.000 Cr und je 100 Barren, Glas, Platten und Elektronik
bereitgestellt. Diese Testausstattung gehört nicht zum regulären Einstieg.

- Schule über Bauplatz 1 beauftragt: 10.000 Cr, 12 Platten und 6 Elektronik
  einmalig abgezogen; Bauplatz belegt, Bauzeit und Bauteam sichtbar.
- `school-building.png`: tatsächlich gerenderter Bauzustand.
- `warehouse-reserve.png`: 40 Wasser geschützt, Bilanz trennt verfügbare und
  geschützte Menge; Lager bleibt gemeinsame physische Kapazität.

Die geometrische Oberfläche verwendet noch Übergangsmodelle. Die freigegebene
gezeichnete Gestaltung wird mit U16 vervollständigt.

Die fertige Schule startet über die Oberfläche eine Ausbildung; training.png zeigt zehn reservierte Einwohner und die verbleibende Zeit. Keine Browserfehler.
