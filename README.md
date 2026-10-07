# Space Trader

Multiplayer-Handels- und Aufbauspiel in einer unendlichen Galaxie aus Sektoren um Schwarze Löcher.
Umsetzung des PRD [docs/PRD.md](docs/PRD.md) (Erweiterung "Galaxie").

## Start

```bash
nvm use 24.13.0
npm install
npm start
```

Dann http://localhost:3000 öffnen. Entwicklung mit automatischem Neustart: `npm run dev`.

| Befehl | Zweck |
|---|---|
| `npm test` | Unit-Tests (node:test) |
| `npm run sim -- --hours 8 --bots 3` | Headless-Simulation mit Handelsbots zur Kalibrierung |
| `npm run reset` | Weltreset: löscht `data/spacetrader.db` (Server vorher beenden) |
| `npm run sprites` | Schiffsgrafiken neu erzeugen |

Der Spielstand liegt in `data/spacetrader.db` (SQLite, alle 15 s und beim Beenden mit Strg+C gespeichert).
Ändert sich die Weltgenerierung inkompatibel (`WORLD_GEN_VERSION` in `server/game.js`), wird die Welt neu erzeugt.

**Sicherheit:** Es gibt keine Authentifizierung. Wer einen Spielernamen kennt, übernimmt das Konto.
Nur im Freundeskreis betreiben. Vor einem öffentlichen Betrieb sind Authentifizierung und HTTPS zwingend.

## Steuerung

| Eingabe | Wirkung |
|---|---|
| Linksklick | Schiff oder Objekt auswählen; in Sektor- und Galaxieansicht: hineinzoomen |
| Strg/Shift+Klick (Flottenliste) | Mehrfachauswahl |
| Doppelklick | Schiff auswählen und Kamera folgen lassen |
| Rechtsklick | Befehl an alle gewählten Schiffe, ersetzt die Queue |
| Mittelklick, Shift+Rechtsklick | Befehl an die Queue anhängen (Firefox: nur Mittelklick) |
| 1 / 2 / 3 | Zoom: System, Sektor, Galaxie |
| R, F, A, B | Routenübersicht, Favoriten, Almanach, Besitz |
| Leertaste, Esc | Kamera folgen, Fenster schließen bzw. Auswahl aufheben |

## Aufbau

| Pfad | Inhalt |
|---|---|
| `shared/config.js` | Zentrale Konstanten, Preisformel, Standort-Modifier, Treibstoff; re-exportiert die Kataloge |
| `shared/goods.js` | 60 Waren, 40 Rezepte, Planeten-, Stations- und Asteroidentypen; Stufen und Basispreise werden berechnet |
| `shared/ships.js` | Schiffskatalog, Klassen, Upgrades, Module, Pilotenlizenz, abgeleitete Schiffswerte |
| `shared/factions.js` | 6 Fraktions-Archetypen und Fraktionsschiffe |
| `shared/property.js` | Gouverneurslizenz, Besitzpreise, Besitz-Upgrades, Fixpreis-Verbrauch |
| `shared/hex.js`, `shared/nav.js` | Hex-Raster, Navigation über Wurmlöcher (Dijkstra), Sondergebiete |
| `server/db.js` | SQLite mit Migrationen (`user_version`) und Dirty-Tracking je Zeile |
| `server/worldgen.js` | Deterministische Sektorgenerierung aus Seed und Hex-Koordinate |
| `server/world.js` | Sektoren, räumlicher Index, Nachgenerierung |
| `server/markets.js` | Märkte nach Rollen (produce/consume/trade) und Strategien (planet, factory, hub, shipyard ...) |
| `server/ships.js` | Befehlsqueue, Flug, Navigation, Treibstoff, Abbau, Routen, NPC-Versorger |
| `server/property.js` | Besitzerwirtschaft (Lager, Fremdhandel, Fixpreis-Verbrauch, Werften) |
| `server/game.js` | Spielzustand, Simulation, Handel, Entdeckungen, Persistenz |
| `server/net.js` | Socket.IO mit Subscription- und Delta-Modell |
| `server/handlers/*` | Client-Befehle als Handler-Module mit Eingabevalidierung |
| `client/js/render.js` | Canvas-Renderer mit System-, Sektor- und Galaxieansicht |
| `client/js/ui/*` | Oberfläche: Flotte, Details, Routen, Favoriten, Almanach, Werft, Besitz |
| `sim/simulate.js` | Headless-Simulation mit Bots |
| `tests/*.test.js` | Tests für Preisformel, Modifier, Fixpreis, Kombo-Kapazität, Navigation, Generierung u.a. |

## Spielregeln im Überblick

- **Welt:** Sektoren (Ø 150.000) im Hex-Raster, 90.000 Leerraum dazwischen. 8 bis 15 Sonnensysteme je Sektor,
  ein Handels-Hub am Schwarzen Loch, eine große Werft, 3 bis 5 Werften, 0 bis 2 Wurmlöcher, 0 bis 3 Sondergebiete.
  Ca. jeder dritte Sektor hat einen Fraktionscluster.
- **Wirtschaft:** Preis = Basispreis × Standort-Modifier × Füllstandskurve ± 6 % Spread. Händler kaufen und verkaufen
  dieselbe Ware. Ultraseltene Waren kauft nur der Hub (und Fraktionen als Schiffswährung).
- **Schiffe:** S, M, L, XL und Fraktion. Pilotenlizenz 1 bis 6 am Hub. Upgrades (Tempo, Tank, Laderaum) und Module
  (Passagierkabine, Geschirmte Kammer, Abbaugeräte).
- **Besitz:** Gouverneurslizenz am Hub, Kauf vor Ort. Eigenes Lager, Erlöse aus Fremdhandel, Fixpreis-Verbrauch auf
  Planeten, Zoll, offen/privat, Ausbau in vier Linien, eigene Werften mit Bau auf Befehl.

## Annahmen und Entscheidungen (PRD Kapitel 15)

Alle Zahlen sind Kalibrierungsannahmen und zentral in `shared/*` änderbar.

- **Maßstab und Nebel (15.4):** Nebelzellen 1.000 Einheiten, Sensorreichweite 2.500, Fernortung von Sonnensystemen
  bis 50.000. Ein Nachbarsektor wird erzeugt, sobald ein Schiff dessen Mittelpunkt näher als
  `HEX_SPACING − SECTOR_RADIUS + 30.000` (= 195.000) kommt, also 30.000 vor dem eigenen Sektorrand.
- **Startsystem:** Langsam-Modifier 25 % auf Raten und Lager. Start-Credits 5.000, ein Spatz für 2.500 im Angebot.
- **Treibstoff:** Tank für ca. 8 h Flug. Bei S/M kostet eine Füllung grob 2 bis 5 % des Schiffspreises, bei L/XL
  unter 2 %, sonst wären Tankstellenlager unrealistisch groß.
- **Upgrades:** +8 % Tempo, +25 % Tank, +12 % Laderaum je Stufe; Stufe 1 kostet 12 % des Schiffspreises, ×1,6 je Stufe.
- **Module:** 30 Fracht je Modul, Kombo +5 Kapazität bzw. +10 % Abbau je weiterem Modul, Ausbau mit 50 % Erstattung.
- **Werften:** Preis = Materialkosten (Basis × Standort-Modifier) + 25 % Marge. NPC-Werften warten bis 15 min auf
  Material für den nächsten Typ der Bauliste und schicken NPC-Versorger für fehlendes Material.
- **Besitz:** Kein Eigenverbrauch über 80 % bei Spielerbesitz. Fixpreis-Position standardmäßig 0,5, Spanne 0,3 bis 0,7.
  Zoll bis 50 %. Waren für den Ausbau kommen aus den Laderäumen der angedockten eigenen Schiffe.
  Die Linie "Zusatzproduktion" schaltet bei eigenen Werften die nächste Schiffsklasse frei.
  Upgrades und Module kosten an eigenen Werften die Hälfte (Selbstkosten). Kein Zoll beim Schiffsverkauf aus Spielerwerften.
- **Almanach:** Ein Rezept gilt als entdeckt, sobald ein Markt mit diesem Rezept in Sensorreichweite war.
  Schiffe und Module, sobald sie in einem Angebot gesehen oder gekauft wurden.
- **Preisspanne nach Stufe (Ergebnis der Simulation):** Füllstandskurve Stufe 0: ×1,8 bis ×0,45, Stufe 5: ×1,3 bis ×0,7;
  Entfernungsprämie für hohe Stufen gedämpft (Stufe 5: halbe Prämie).

## Stand der Kalibrierung

`npm run sim` mit 3 Bots über 12 h im Heimatsektor (Seed 42):

- Frühe Phase (3 bis 5 Schiffe): je nach Lauf Ø 12 bis 30 k Cr/h, Ziel 20 bis 50 k Cr/h.
- Erste M-Schiffe erscheinen nach ca. 10 bis 12 h, weil NPC-Werften auf Material warten.
- Die mittlere Phase (10 bis 20 Schiffe) erreichen die Bots im Simulationszeitraum nicht; dafür müssten sie Sektoren
  wechseln und Besitz aufbauen. Weitere Kalibrierung sollte mit echten Spielsitzungen erfolgen.
- Etwa die Hälfte der Fabriken wartet mit vollem Lager auf Abnehmer. Das ist gewollt (Handelsgelegenheiten),
  sollte aber im Spiel beobachtet werden.

## Nicht im Umfang

Chat, Authentifizierung, Stützpunkt, Fraktionsruf, Quests, Events, Kampf, Unterhaltskosten, Whitelist im Handelsmodus
und automatisches Ausweichen um Sondergebiete (siehe PRD Kapitel 12).
