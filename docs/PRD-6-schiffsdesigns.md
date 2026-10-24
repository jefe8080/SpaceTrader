# PRD 6 – Freigegebene Schiffsdesigns und Zoomdarstellung

## Ziel und abgestimmte Anforderungen
Die drei vom Nutzer freigegebenen Entwurfstafeln werden für alle 32 vorhandenen Schiffstypen eingebunden. Fantasy-Sci-Fi-Steampunk-Comiclook, individuelle Silhouetten und die sechs Fraktionsidentitäten bleiben erhalten. Spätere Änderungen sollen durch austauschbare Bilddateien möglich bleiben. Keine Änderungen an Schiffswerten, Wirtschaft oder Spielständen.

Die ausdrückliche Freigabe der Vorschau bildet die Designentscheidung für diese Umsetzung; ein erneutes Designinterview ist nicht erforderlich.

## Umfang und Abnahme
- 14 zivile und 18 Fraktionsschiffe erscheinen auf Karte, in Werften, Flotte, Details und Almanach mit den freigegebenen Designs.
- Freigestellte Bilder ohne Beschriftung, Tafelrahmen oder Hintergrund; Ausrichtung nach rechts; Seitenverhältnis bleibt erhalten.
- Besitzer- und Statusfarben bleiben über Kartenmarkierungen erkennbar; Fraktionsfarben der Illustrationen bleiben erhalten.
- Schiffe bleiben in der gesamten Systemansicht als mindestens 24 Bildschirmpixel große Grafiken sichtbar. Erst die Sektoransicht (Zoom < 0,035) verwendet Dreieckspfeile; die bisherige Galaxieübersicht bleibt bestehen.
- Bestehende SVGs bleiben als Rückfall und als historische Quelle erhalten.

## Teilschritte und Fortschritt
- [x] Bestand und bestehende Zoomschwelle untersucht, Designfreigabe übernommen.
- [x] 1. Freigegebene Tafeln archivieren, freigestellte Sprite-Tafeln mit Imagegen erstellen und einzelne Schiffe als PNG aufbereiten; Vollständigkeit und Darstellung prüfen.
- [ ] 2. Gemeinsamen Assetloader für PNG-Schiffe erweitern, Kartenrendering und Zoomgrenze anpassen, UI-Einbindung und Besitzererkennung prüfen.
- [ ] 3. Automatische Regressionstests und visuelle Vorschau prüfen, Ergebnisse dokumentieren.

## Prüfungen
Assetprüfung auf alle Schiffstypen, PNG-Abmessungen und Transparenz; gezielte Tests für Assetloader und Zoomdarstellung; bestehende Testsuite. Visuelle Kontrolle der extrahierten Flotten und der Integration im Browser, sofern verfügbar.

Schritt 1: Alle 32 RGBA-PNGs mit 512 × 512 Pixeln geprüft. Visuelle Flottenkontrolle bestanden. Erster Prüflauf fand 576 statt 512 Pixel durch die Reihenfolge von Skalierung und Randzugabe; korrigiert, erneuter Lauf erfolgreich. Freistellung mit dem eingebauten Imagegen-Tool; Alpha-Restflächen beim Verpacken entfernt. Quellen unter `docs/art/ships/`, austauschbare Spielgrafiken unter `client/assets/art/ships/`.
