# Prüfung – Schiffsdesigns und Zoom

24.10.2026, isolierter statischer Server, echter Client-Assetloader und Kartenrenderer, Edge headless (1360 × 820). Keine Server-Spielstände geöffnet.

- `npm test`: 290 erfolgreich, 0 Fehler; vollständiges Ergebnis in `tests.txt`.
- `node --test tests/ship-art.test.js`: Vollständigkeit der 32 RGBA-PNGs, Größe, gemeinsame Nutzung je Typ, SVG-Rückfall mit Farbersetzung und Mindestdarstellungsgröße geprüft.
- `scripts/check-ship-art-browser.cjs`: Zoom 1, 0,32, 0,1, 0,035 zeichnet jeweils 32 PNGs; 0,034 und 0,007 zeichnen Marker statt PNGs. Klickauswahl bei allen sechs Stufen korrekt, UI-Bilder geladen, keine JavaScript-Fehler.
- Visuell geprüft: `all-ships.png`, `zoom-1.png`, `zoom-0.035.png`, `zoom-0.034.png`. Keine rechteckigen Hintergründe oder abgeschnittenen Schiffe. Größenunterschiede bei Nahansicht und Mindestgröße bei Fernansicht sichtbar.
- Der erste PNG-Test meldete 576 statt 512 Pixel. Verpackung korrigiert, Test wiederholt und bestanden. Der erste Browserstart fand keinen gebündelten Chromium; anschließend vorhandenen Edge verwendet und vollständig bestanden.

Wiederholung: statischen Express-Server mit `client/` unter `/`, `shared/` unter `/shared` und `tests/browser/` unter `/qa` starten; danach das Browserprüfskript ausführen. Optional `SHIP_QA_URL`, `PLAYWRIGHT_MODULE` und `BROWSER_EXE` setzen. Die Prüfvorschau verteilt Schiffe für jede Zoomstufe auf feste Bildschirmpositionen, damit alle 32 Motive im selben Durchlauf kontrolliert werden.
