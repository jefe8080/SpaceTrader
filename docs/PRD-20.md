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
- [ ] Nutzerabnahme (ausstehend).
- [ ] Nach gesonderter Freigabe: transparente Einzelgrafiken in geeigneter Auflösung ausarbeiten, integrieren und im Spiel prüfen.

## Abnahmekriterien
Jeder vorhandene stationäre Objekt-/Ressourcentyp ist auf einer beschrifteten oder eindeutig zugeordneten Vorschau vertreten. Die Entwurfstafeln sind Vorschauen, keine fertigen Sprite-Atlanten. Hintergründe halten ausreichend dunkle Flächen für die Lesbarkeit frei. Kein bestehendes Spielasset und kein Renderer wird vor Abnahme geändert. Prompts und Dateien bleiben unter docs/art/prd20 nachvollziehbar. Für diesen reinen Bildschritt werden Dateien und Zuordnung geprüft; Spieltests sind erst bei Integration erforderlich.
