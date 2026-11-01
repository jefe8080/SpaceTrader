# PRD 20 – Gezeichnete Weltraumgrafiken zur Abnahme

## Ziel und Freigabe
Alle stationären Weltraumobjekte erhalten Entwürfe im vorhandenen gemalten Comic-Sci-Fi-Stil. Der Nutzer hat am 01.11.2026 eine selbständige Planung ohne weiteres Grilling erlaubt. Zunächst ausschließlich Vorschauen; Integration erst nach ausdrücklicher Bildabnahme.

## Stil
Nutzerkorrektur: Keine blauen Ringe oder leuchtenden Atmosphärensäume um Planeten. Zusätzlich sechs Ansichten derselben Ruinenwelt mit wachsender Hausanzahl und Infrastruktur. Nach Bildabnahme ersetzt diese Progression die bisherige Gebäudeanzeige der Weltraumkarte. Bestehender Stand: planetDevelopment liefert für Ruinenwelt vier Stufen (0–3), abhängig von fertigen Gebäuden und Leitstellenstufe; planetExterior zeichnet darauf zufallsfeste Gebäudemarker. Die spätere Integration benötigt sechs Zustände (0–5), klare monotone Schwellen und Ersatz dieser Marker durch das jeweilige Gesamtbild. Schwellen werden bei der Integration anhand der tatsächlichen Bauprogression festgelegt. Orbitalausbau bleibt ein eigener Spielzustand; Darstellung wird bei Integration geprüft.

Referenzen: `client/assets/art/ships/ship_spatz.png` und `client/assets/art/cities/agrar-city-v2.png`. Dunkle Tuschekonturen, plastische gemalte Schattierung, organisch gerundete Technik, verwittertes Creme/Teal, Messing und warme Fenster. Keine einfachen Vektorformen oder fotorealistischen 3D-Renderings. Planeten als vollständige Kugeln mit charakteristischer Oberfläche; Stationen in erhöhter Dreiviertelansicht.

## Umfang
- 13 Planeten einschließlich eigener Ruinenwelt (bisher gemeinsames Sprite mit Kolonie).
- Alle 56 Stationstypen aus STATION_TYPES, einschließlich 46 Produktionsanlagen, Bergungswrack und neun Sonderstationen.
- Archivstelle, Studienfundstelle, Reliktwrack.
- Alle zehn Ressourcenfeldtypen einschließlich Trümmern.
- Wurmloch, Sonnenvarianten und zwei Schwarze-Loch-Entwürfe.
- Zwei ruhige, dunkle, gemalte Weltraumhintergründe.

## Schritte und Fortschritt
- [x] Bestand und Referenzen prüfen; Umfang und Abnahmegrenze festlegen.
- [x] Entwurfstafeln und Hintergründe mit eingebautem ImageGen erzeugen; Prompts und Zuordnung dokumentieren (15 PNGs unter docs/art/prd20).
- [x] Bilder auf Vollständigkeit, erkennbare Silhouetten, Stil und Beschnitt prüfen; lokale Abnahmegalerie index.html erstellen. Alle 13 Planeten, 56 Stationen, drei Fundstellen und zehn Ressourcenfeldtypen sind vertreten; zusätzlich sechs Ruinenwelt-Stufen, sechs Sonnenfarben, zwei Schwarze-Loch-Varianten, Wurmloch, fünf Zonen und zwei Hintergründe. Planetentafeln nach Nutzerkorrektur ohne blauen Leuchtring neu erzeugt.
- [x] Alle Vorschauen dem Nutzer vorlegen (inline und lokale Galerie).
- [x] Nutzerabnahme am 01.11.2026: alle Entwürfe freigegeben, Planeten ausschließlich zweite Fassung ohne blauen Rand. Umsetzung ausdrücklich beauftragt.
- [ ] Umsetzung A: freigegebene Motive mit ImageGen freistellen und als Einzelgrafiken verpacken; Zuordnung und Alpha prüfen.
- [ ] Umsetzung B: zentralen Grafikresolver und Laden für Karte, Vorschaubilder und Objektführer integrieren; Hintergründe, Sonnen, schwarze Löcher, Wurmloch und Zonen ersetzen.
- [ ] Umsetzung C: alte Vier-Stufen-Entwicklung und generierte Gebäudemarker vollständig entfernen; neue sechs Ruinenwelt-Bilder implementieren und gezielt testen.
- [ ] Umsetzung D: gesamte Testsuite und Browserprüfung einschließlich Bildladen, Entwicklungsstufen und Zoom; Fortschritt und Ergebnisse dokumentieren.

## Umsetzung nach Freigabe

Sechs Stufen (Index 0–5): Ankunft, Siedlung, Gemeinde, Stadt, Großstadt, wiederaufgebaute Welt. Schwellen: 0/4/8/16/24/36 Ausbaupunkte. Jeder fertige Eintrag in homeworld.structures oder homeworld.facilities zählt eins; abgeschlossene Gebäudeerweiterungen und zusätzliche Wohn-/Lagerstufen zählen zusätzlich. Nur fertige Bausubstanz zählt, keine laufenden Bauaufträge, Versorgung oder Leitstellenpflicht. Die Stufe wird aus öffentlichen vorhandenen Baudaten abgeleitet; kein gespeicherter Legacy-Zustand und keine Datenmigration. Abriss kann die Stufe entsprechend senken. Die bestehenden Module planet-development.js und planetExterior.js mit Vier-Stufen-Logik und Gebäuderechtecken werden entfernt. Tatsächlich gebaute Orbitalringe bleiben getrennte Bauwerke, ohne blauen Planetenleuchtsaum.

Freigestellte Tafeln dienen nur als Produktionsquellen. Ein reproduzierbarer Verpackungsschritt erzeugt transparente Einzel-PNGs; alle Motive erhalten eindeutige IDs (keine gemeinsame Fabrik- oder Archiv-Ersatzgrafik). Vorhandene Spieler-/Fraktionskennzeichnung bleibt über Kartenmarkierungen erhalten. PNG-Grafiken werden nicht verzerrt oder willkürlich gedreht. Beide Hintergründe und beide Schwarze-Loch-Varianten werden deterministisch verwendet.

## Abnahmekriterien
Jeder vorhandene stationäre Objekt-/Ressourcentyp ist auf einer beschrifteten oder eindeutig zugeordneten Vorschau vertreten. Die Entwurfstafeln sind Vorschauen, keine fertigen Sprite-Atlanten. Hintergründe halten ausreichend dunkle Flächen für die Lesbarkeit frei. Kein bestehendes Spielasset und kein Renderer wird vor Abnahme geändert. Prompts und Dateien bleiben unter docs/art/prd20 nachvollziehbar. Für diesen reinen Bildschritt werden Dateien und Zuordnung geprüft; Spieltests sind erst bei Integration erforderlich.
