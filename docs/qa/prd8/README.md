# PRD 8 – Abnahme der ersten 2D-Stadtversion

Stand: 25.10.2026. Ausführung auf einem getrennten Homeworld-Testserver, Port 3008, Datenbank ausschließlich `:memory:`. Kein bestehender Spielstand wurde verändert.

## Ergebnisse

- Vollständige Testsuite: **311/311 erfolgreich**. Ausgabe in `test-results.txt`.
- Neue Stadtprüfungen: alle 13 Typen, überlappungsfreie direkte Trefferflächen, vollständige Objekte, stabile Positionen nach Fabrikzugängen/Entfernung von Bauplätzen, Lagerfamilien und Heimatwelt-/Orbitalzustände.
- Browserprüfung mit `scripts/verify-prd8.mjs`: **13 Typen, 238 interaktive Objekte, keine fehlenden Treffer, keine JavaScript-Fehler**. Einzelresultate in `browser-results.json`.
- Reguläre Heimatwelt: Rathaus über den neuen Canvas geöffnet, Escape schließt erst Panel und danach die Planetenansicht.
- Repräsentative Agrar-Panels über Zeiger geöffnet: Wasserlager, Bettler, Hund und Fabrik. Namen ein-/ausgeschaltet, Mausrad, Ziehen, Fokus/Übersicht und Tastaturaktivierung geprüft.
- Schmale Ansicht: 390×844, tatsächlicher Touch-Tap und Zwei-Finger-Zoom über Browser-Touch-Ereignisse; kein versehentliches Öffnen beim Pinch. Verlassen-Button liegt unter der Kopfzeile und bleibt erreichbar.
- Dynamische Heimatweltänderung: Einrichtungen fertiggestellt, Wohnhaus im Bau, zusätzliche Schule und Orbitalprojekt. Bestehende Standorte bleiben unverändert; Darstellung reagiert auf neue Zustände.
- PRD-7-Browserregression: **erfolgreich** für Profil, Dialogbestätigung, Rathaus, Verbindungsverlust/-wiederherstellung und fünf Bildschirmbreiten. Ergebnisse im Unterordner `prd7-regression/`. Der Verbindungsstatus wird jetzt im jeweiligen Heimatwelt-Panel geprüft, weil der frühere Auswahlbalken entfällt.

## Visuelle Prüfung und Korrekturen

Alle Typen gemeinsam: [all-types.png](all-types.png). Einzelbilder `<typ>.png`, ausgewählte Dialoge `agrar-*.png`, mobile Ansicht `mobile-dog.png` und Heimatweltänderung `ruins-development.png`.

In der Prüfung korrigiert: unscharfe kleine Umgebungskacheln durch 13 Einzelbilder ersetzt; getrennte Figuren mit ausreichenden Touch-Flächen; Kopfzeilenüberlagerung auf schmalen Ansichten beseitigt; kleine Atlas-Randfragmente beim Sprite-Laden ausgesondert; typabhängige Wohn-/Versorgungsbebauung, zusätzliche Ringstraße und Landeplatz ergänzt; große/kleine Orbitalringe unterscheiden sich in der Größe. Begrenzte Kamera und gespiegelte Landschaftsfortsetzung vermeiden leere Bildränder. Animationen beachten reduzierte Bewegung.

## Einordnung

Die neue Ansicht ist direkt der Standardrenderer, ohne Vorschau-Schalter. Die Städte sind modular und verwenden gemeinsame Gebäude-Archetypen sowie eigene Landschaften und versetzte Grundrisse je Typ. Die interaktiven Browser-Serien verwenden nach dem regulären Heimatweltcheck lokale Markt-/Bau-Fixtures; Serveränderungen werden dabei getrennt, damit echte Schiffpositionsupdates die Fixtures nicht verlassen lassen. Wirtschaftsaktionen werden durch die unveränderten Panels und die bestehende Testsuite abgesichert; die Bildserie simuliert keine vollständige Spielerwirtschaft für jeden Typ.

## Erneut ausführen

Separaten Server mit `PORT=3008`, `DB_FILE=:memory:`, `WORLD_PROFILE=homeworld`, `DEV_TOOLS=1` starten. Danach `node scripts/verify-prd8.mjs`; bei extern installiertem Playwright dessen Modulpfad in `PLAYWRIGHT_MODULE` setzen. `PRD8_URL` erlaubt eine andere lokale Serveradresse. Die PNGs und Ergebnisse werden dabei neu erzeugt.
