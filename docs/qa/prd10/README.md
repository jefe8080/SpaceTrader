# PRD 10 – Abschlussprüfung

Stand: 26.10.2026. Alle Umsetzungsschritte U1–U8 abgeschlossen.

## Automatisierte Prüfung

`npm test`: **349 Tests bestanden, 0 fehlgeschlagen** (einschließlich Korrektur K1).

K1 ergänzt `tests/route-extraction.test.js`: alle neun Feldarten einschließlich
Säure-/Tiefbohrerabbau, Null-/Teillimits, vorhandene Fracht, tatsächliche
Einlagerung, Reservierung über mehrere Ticks, unveränderter manueller/ungeschützter
Abbau sowie Nebelgas-Sammlereinkäufe mit gemeinsamem Zielplatz für Bergbau und Handel.

| Abnahme im PRD | Nachweis |
|---|---|
| 1–2: Lagerkosten, Stufen, Betrieb, alter/neuer Beitrag, Neustart | `tests/prd10.test.js`, `tests/homeworld-operations.test.js` |
| 3: Leitstellenpreise und bezahlte Altprojekte | `tests/prd10.test.js`, `tests/coverage.test.js` |
| 4: Erwerbswege ohne Flottenlimit, übrige Lizenzregeln | `tests/prd10.test.js`, `tests/ships.test.js`, `tests/consortium.test.js` |
| 5: Bestätigung, geschützte Einrichtungen, Abhängigkeiten, Projekte, beide Lagerklassen und Module | `tests/prd10.test.js` |
| 6: Null-/Teillimits, unabhängige Reserven, Sammeländerung | `tests/prd10.test.js`, Browserprüfung |
| 7–10: Zielplatz, Teilmengen, Duplikate, geladene Ware, mehrere Schiffe/Waren, Lebenszyklus | `tests/route-capacity.test.js`, `tests/routes-target.test.js`, `tests/route-management.test.js`, `tests/prd10.test.js` |
| 11–12: Schwellen, Rückstufung, Versorgungsunabhängigkeit, alle bebaubaren Typen und öffentliche Daten | `tests/planet-development.test.js`, Bildprüfung |
| 13: Alte Lagerstufen, Werte, Fracht und laufende Projekte ohne Reset/Nachzahlung | `tests/prd10.test.js` und bestehende Persistenztests der Gesamtsuite |

## Browser- und Bildprüfung

`scripts/verify-prd10.mjs` läuft mit Playwright und installiertem Edge.
Ein externes Playwright-Modul lässt sich über `PLAYWRIGHT_MODULE` auswählen.
Der Prüfserver wird separat gestartet, mit `WORLD_PROFILE=homeworld`,
`PORT=3010` und einer ausdrücklich separaten temporären `DB_FILE`.
`PRD10_URL` kann eine andere lokale Prüfadresse festlegen.
Die reguläre Spieldatenbank wird dabei nicht verwendet.

Die Browserprüfung verwendet für Dialoge kontrollierte lokale Zustände nach
Anmeldung und zeichnet die ausgelösten Befehlspayloads auf. Die tatsächliche
Serverausführung und SQLite-Persistenz prüfen die oben genannten Node-Tests.

- `exterior-stages.png`: vier Ruinenstufen, fertiger kleiner/großer Ring und zusätzliche Bebauung anderer Typen. Mit demselben Renderer wie die äußere Spielansicht erzeugt und visuell geprüft.
- `storage-controls.png`: direkte Regler, unabhängige Zahlenfelder und Warnhinweis.
- `storage-narrow.png`: schmale Ansicht; kein horizontaler Überlauf.
- `storage-upgrade.png`: tatsächliche Lagerstufe, nächster Preis und Abrissfolge.
- `route-option.png`: Checkbox und Erläuterung im Routeneditor.
- `results.json`: Browserergebnis, keine JavaScript-Laufzeitfehler.

Geprüft wurden außerdem: laufende Eingabe gegen Live-Neurendering, Slider-
Speicherung erst beim Änderungsabschluss, bestätigtes Zahlenfeld, Sammelvorschau
inklusive Erhalt nach Fokuswechsel, expliziter Anwenden-Klick, Abrissbestätigung
mit Kapazitätsverlust und Weitergabe der Routenoption an `routeSave`.

Die Bebauung zählt fertig reparierte ursprüngliche Bodeneinrichtungen mit.
Ausbauten belegen keinen zusätzlichen Gebäudeplatz; Orbitalringe zählen separat.
Bei normalen Planeten zählen vorhandene Rohstoffgebäude, Fabriken und fertig
errichtete Infrastruktur. Die innere Planetenansicht wurde nicht umgestaltet.

### Korrektur der Weltraumansicht (2026-10-27)

Die ursprüngliche Bildprüfung rief den Außenansichtszeichner direkt auf und
deckte dessen fehlenden Aufruf im eigentlichen Weltraumrenderer nicht ab.
`drawPlanet` bindet ihn jetzt ein: Ringhälften erscheinen hinter und vor dem
Planetenbild, erreichte Bebauungsstufen darüber. Bereits fertige Ringe werden
beim nächsten Zeichnen aus dem vorhandenen Zustand berücksichtigt.
`tests/planet-exterior-render.test.js` prüft den tatsächlichen `drawPlanet`-
Einstieg zusammen mit dem Außenansichtszeichner für kleine und große Ringe,
Bebauung sowie den Ersatzkreis bei fehlendem Sprite. Zusammen mit den drei
Entwicklungs-/Serialisierungstests bestehen alle fünf gezielten Prüfungen.
