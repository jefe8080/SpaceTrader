# Space Trader

Multiplayer-Handels- und Aufbauspiel in einer unendlichen Galaxie aus Sektoren um Schwarze Löcher.
Umsetzung des PRD [docs/PRD.md](docs/PRD.md) (Erweiterung "Galaxie") , [docs/PRD-2.md](docs/PRD-2.md) (Erweiterung "Progression") und [docs/PRD-3.md](docs/PRD-3.md) (Erweiterung "Gemeinschaft").

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
| `npm run sim -- --hours 8 --bots 3` | Headless-Simulation mit Handels- und Quest-Bots zur Kalibrierung |
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
| R, F, A, B, K | Routenübersicht, Favoriten, Almanach, Besitz, Konsortium |
| Doppelklick auf Planet, "Landen" | Planetare Ansicht (nur mit angedocktem eigenem Schiff), verlassen mit Esc oder 1/2/3 |
| Leertaste, Esc | Kamera folgen, Fenster schließen bzw. Auswahl aufheben |

## Aufbau

| Pfad | Inhalt |
|---|---|
| `shared/config.js` | Zentrale Konstanten, Preisformel, Standort-Modifier, Treibstoff; re-exportiert die Kataloge |
| `shared/goods.js` | 60 Waren, 40 Rezepte, Planeten-, Stations- und Asteroidentypen; Stufen und Basispreise werden berechnet |
| `shared/ships.js` | Schiffskatalog, Klassen, Upgrades, Module, Pilotenlizenz, abgeleitete Schiffswerte |
| `shared/factions.js` | 6 Fraktions-Archetypen, 18 Fraktionsschiffe (L, XL, Spezial) und Fähigkeiten |
| `shared/progression.js` | Pilotenlevel, XP-Quellen, Questkatalog und Belohnung, Level von Planeten und Werften, Fraktionsruf |
| `shared/property.js` | Gouverneurslizenz, Besitzpreise, Besitz-Upgrades, Fixpreis-Verbrauch |
| `shared/consortium.js` | Konsortiumslevel, Gebühren, Ränge, Logaktionen |
| `shared/events.js` | Sondernachfrage: Timer, Festpreis, Mengenformel |
| `shared/planetside.js` | Gebäude-Ausbau, Fabrik-Bauplätze, Ausstattung der Planeten, Minispiel-Regeln |
| `shared/facts.js`, `shared/compliments.js` | Schulfakten (402) und Komplimente des Bettlers (60) |
| `shared/hex.js`, `shared/nav.js` | Hex-Raster, Navigation über Wurmlöcher (Dijkstra), Sondergebiete |
| `server/db.js` | SQLite mit Migrationen (`user_version`) und Dirty-Tracking je Zeile |
| `server/worldgen.js` | Deterministische Sektorgenerierung aus Seed und Hex-Koordinate |
| `server/world.js` | Sektoren, räumlicher Index, Nachgenerierung |
| `server/markets.js` | Märkte nach Rollen und Strategien, Drift zum Ziel-Füllstand, Planetenlevel, Werftbau mit Bestellslot |
| `server/ships.js` | Befehlsqueue, Flug, Navigation, Treibstoff, Abbau, Routen, NPC-Versorger und -Abholer |
| `server/quests.js` | Questtafeln, 6 Questtypen, Annehmen, Fortschritt, Abschluss |
| `server/property.js` | Besitzerwirtschaft (Lager, Fremdhandel, Fixpreis-Verbrauch, Werften) |
| `server/consortium.js`, `server/offers.js` | Konsortien (Mitglieder, Pool, Level, Log), Karten- und Schiffshandel |
| `server/events.js` | Sondernachfrage je Sektor |
| `server/game.js` | Spielzustand, Simulation, Handel, Entdeckungen, Persistenz |
| `server/net.js` | Socket.IO mit Subscription- und Delta-Modell |
| `server/handlers/*` | Client-Befehle als Handler-Module mit Eingabevalidierung |
| `client/js/render.js` | Canvas-Renderer mit System-, Sektor- und Galaxieansicht |
| `client/js/planetside.js` | Planetare Ansicht: prozedurale Seitenansicht mit Gebäuden |
| `client/js/ui/*` | Oberfläche: Flotte, Details, Routen, Favoriten, Almanach, Werft, Besitz, Quests, Tonmenü, Konsortium, Sondernachfrage, Gebäude-Panel, Minispiele |
| `client/js/audio.js` | Prozedurale Effekte und Ambient-Musik per WebAudio (keine Audiodateien) |
| `sim/simulate.js` | Headless-Simulation mit Bots |
| `tests/*.test.js` | Tests für Preisformel, Modifier, Fixpreis, Kombo-Kapazität, Navigation, Generierung u.a. |

## Spielregeln im Überblick

- **Welt:** Sektoren (Ø 150.000) im Hex-Raster, 90.000 Leerraum dazwischen. 8 bis 15 Sonnensysteme je Sektor,
  ein Handels-Hub am Schwarzen Loch, eine große Werft, 3 bis 5 Werften, 0 bis 2 Wurmlöcher, 0 bis 3 Sondergebiete.
  Ca. jeder dritte Sektor hat einen Fraktionscluster.
- **Wirtschaft:** Preis = Basispreis × Standort-Modifier × Füllstandskurve ± 6 % Spread. Händler kaufen und verkaufen
  dieselbe Ware. Ultraseltene Waren kauft nur der Hub (und Fraktionen als Schiffswährung).
  NPC-Märkte kehren zum Ziel-Füllstand zurück (Halbwertszeit 45 min), Planeten würfeln ihre Nachfrage alle 2 bis 6 h neu.
  Planeten schicken in Sektoren mit Spieleraktivität Abholer zu Fabriken; NPC-Schiffe laden höchstens 40 Einheiten.
- **Schiffe:** S, M, L, XL und Fraktion. Pilotenlizenz 1 bis 6 am Hub, Lizenz n erfordert Pilotenlevel n. Upgrades
  (Tempo, Tank, Laderaum) und Module (Passagierkabine, Geschirmte Kammer, Abbaugeräte, Sensorphalanx).
  Ein Schiff kann **Hauptschiff** sein: Tempo ×4, Verbrauch ×4 pro Sekunde, keine Routen, 5 min Sperre nach jedem Wechsel.
- **Erfahrung:** XP aus Quests (Hauptquelle), Sektorbesuchen, Almanach-Einträgen und manuellem Handel des Hauptschiffs.
  Routenhandel bringt keine XP. Pilotenlevel 1 bis 7, Level 7 trägt einen Titel.
- **Quests:** Questtafeln an Planeten und Werften (Beschaffung, Kurier, Rundreise, Erkundung, Abbau, Eilbestellung),
  eine Quest je Spieler, keine Fristen, Abbruch sperrt 10 min. Planeten und Werften steigen dadurch bis Level 6:
  Planeten produzieren mehr und schalten Waren frei, Werften bauen bessere Schiffe (+5 % je Level).
- **Fraktionen:** Ruf aus Quests bei Fraktionsplaneten, Ränge 0 bis 3. Je Fraktion ein L-, XL- und Spezialschiff,
  gesperrt durch Rang und Pilotenlizenz, Preis in Credits plus Schiffswährung.
- **Bestellslot:** NPC-Werften nehmen eine Bestellung an (Anzahlung 2 × Katalogpreis), die Vorrang vor der Bauliste hat.
- **Besitz:** Gouverneurslizenz am Hub, Kauf vor Ort. Eigenes Lager, Erlöse aus Fremdhandel, Fixpreis-Verbrauch auf
  Planeten, Zoll, offen/privat, Ausbau in vier Linien, eigene Werften mit Bau auf Befehl.
- **Konsortien:** Gründung am Hub ab Pilotenlevel 2, Ränge Händler und Handelsmeister, Pool mit Gebühren (Einzahlen 10 %,
  Auszahlen 20 %), Level 1 bis 6, gemeinsamer Besitz mit Lager zum Fixpreis, Karten- und Schiffshandel, Schwarzes Brett, Log.
- **Sondernachfrage:** In Sektoren mit Spielerschiffen alle 20 bis 60 min ein Event an einem NPC-Planeten, Festpreis
  2 × Ankaufspreis bei leerem Lager, nur manuelle Verkäufe, keine XP.
- **Planetare Ansicht:** Questhaus (Quests an Planeten nur dort), Gebäude-Ausbau je Ware, Fabriken auf Bauplätzen eigener
  Planeten, Minispiele (20 je Stunde), Schmugglerhöhle, Bettler, Hund, Schule. Jeder Planet hat einen eigenen Klang.

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
- **Besitz:** Keine Drift und keine Nachfrage-Schwankung bei Spielerbesitz. Fixpreis-Position standardmäßig 0,5, Spanne 0,3 bis 0,7.
  Zoll bis 50 %. Waren für den Ausbau kommen aus den Laderäumen der angedockten eigenen Schiffe.
  Die Linie "Zusatzproduktion" schaltet bei eigenen Werften die nächste Schiffsklasse frei.
  Upgrades und Module kosten an eigenen Werften die Hälfte (Selbstkosten). Kein Zoll beim Schiffsverkauf aus Spielerwerften.
- **Almanach:** Ein Rezept gilt als entdeckt, sobald ein Markt mit diesem Rezept in Sensorreichweite war.
  Schiffe und Module, sobald sie in einem Angebot gesehen oder gekauft wurden.
- **Preisspanne nach Stufe (Ergebnis der Simulation):** Füllstandskurve Stufe 0: ×1,8 bis ×0,45, Stufe 5: ×1,3 bis ×0,7;
  Entfernungsprämie für hohe Stufen gedämpft (Stufe 5: halbe Prämie).

## Annahmen und Entscheidungen (PRD-2)

Die offenen Punkte aus PRD-2 Kapitel 16 sind in Kapitel 17 entschieden. Bei der Umsetzung kamen diese Annahmen hinzu:

- **Drift statt eigener Raten:** Bei NPC-Märkten bestimmt allein die Drift den Bestand. Produktion und Verbrauch laufen
  nominal mit (Statistik, Effizienz) und begrenzen die Drift: Ein Produzent füllt sein Lager nicht schneller auf, als er
  produziert, ein Verbraucher leert es nicht schneller, als er verbraucht. In die Gegenrichtung wirkt die Drift als
  Hintergrundhandel unbegrenzt. Ohne diese Regel würden die eigenen Raten die Drift um ein Vielfaches übersteigen und die
  Märkte kippten weiter auf 0 oder 100 %. Werften haben keine Drift, sie bauen aus echtem Material.
- **Ziel-Füllstände:** Produzenten 60 bis 70 %, Verbraucher 30 bis 40 %, Händler 45 bis 55 %. Schwankungsspannen der
  Planeten: 45 bis 85 %, 15 bis 55 % bzw. 30 bis 70 %.
- **NPC-Schiffe:** Versorger starten bei NPC-Fabriken erst, wenn eine Zutat 10 Prozentpunkte unter dem Ziel liegt.
  Werften schicken je fehlender Ware einen Versorger, damit kleinere Ladungen den Bau nicht ausbremsen.
- **Sensorphalanx:** 90.000 Cr.
- **Quests:** Belohnung = 60 Cr × Aufwandsminute × 1,7^Questlevel + 125 % des Warenwerts (Erstattung des Einkaufs).
  XP = Aufwandsminuten × (1 + 0,1 × Questlevel). Questlevel zufällig zwischen Level des Questgebers minus 2 und dessen Level.
  Kurierfracht und Touristen belegen keinen Laderaum, Touristen setzen aber passende Passagierkabinen voraus.
  Erkundung schließt automatisch ab. Quests, deren Quelle oder Ziel dem Annehmenden gehört, lassen sich nicht annehmen.
  Volle Tafeln ersetzen Angebote, die älter als 3 h sind. Tafeln laufen in Sektoren mit Spielerschiffen oder Spielerbesitz.
- **Level der Questgeber:** Schwellen 60 / 180 / 400 / 800 / 1.500 / 3.000 XP. Der Questgeber erhält die Quest-XP,
  dazu 1 XP je 20.000 Cr Umsatz der Spieler.
- **Fraktionsruf:** Ruf = Quest-XP, Abbruch kostet 25 % der Quest-XP als Ruf.
- **Fraktionsschiffe:** Die Spezialschiffe bleiben Klasse F (Pilotenlizenz 5). Erzbrecher baut ultraseltene Vorkommen mit
  0,8 Einheiten/s ab. Fraktionsschiffe sind nicht über den Bestellslot erhältlich, weil sie an der Fraktionswerft
  dauerhaft im Angebot sind.
- **Bestellslot:** Bestellen nur mit einem angedockten eigenen Schiff. Das fertige Schiff ist das vierte im Angebot.

## Annahmen und Entscheidungen (PRD-3)

- **Zeitbasis:** Einladungen (24 h), Log (30 Tage) und Schwarzes Brett nutzen Echtzeit, alles Übrige Spielzeit.
  Das Minispiel-Limit gilt für ein Fenster von 60 min ab dem ersten Spiel.
- **Konsortiumsbesitz:** Zoll ist ohne eigene Lizenzstufe möglich. Konsortiumswerften verkaufen Mitgliedern auch ohne
  "an andere verkaufen", der Erlös geht in den Pool; Upgrades und Module kosten Mitgliedern dort die Hälfte, Recycling
  ist für Mitglieder möglich. Lagerhandel der Mitglieder bringt keine Handels-XP.
- **Angebotene Schiffe** zählen bei der Prüfung "letztes Schiff" nicht mit, sonst bliebe nach dem Verkauf keines übrig.
- **Sondernachfrage:** Festpreis = 2 × Basispreis × Standort-Modifier × Füllstandskurve bei leerem Lager × (1 − Spread).
  Kennt der Planet die Ware nicht, gilt Modifier 1. Das Planeten-Klicken in der Sektoransicht wählt Systeme, nicht
  Planeten; der Planeten-Klang erklingt daher nur in der Systemansicht.
- **Gebäude-Ausbau:** Waren je Stufe: 1 bis 3 Platten 10, Maschinen 2, Zahnräder 4; 4 bis 6 Elektronik 4, Roboter 1,
  Rumpfsegmente 1; 7 bis 10 Roboter 2, KI-Kerne 1, Habitatmodule 1, jeweils × Level.
- **Fabriken auf Bauplätzen:** eigene Lagerplätze mit Rate 0 (die Bevölkerung verbraucht Zutaten nicht), Lager wie bei
  Stationen (400 bzw. 300 je Rezepteinheit). Beim Abriss fallen Lagerplätze weg, die keine andere Fabrik braucht.
- **Geschicklichkeitsspiele:** Die Schwierigkeit (Zonenbreite, Tempo, Zahl der Versuche) ist eine Schätzung für ca. 60 %
  Erfolg und muss im Spiel geprüft werden. Offene Spiele verfallen nach 3 min als verloren.
- **Schmuggelaufträge** erscheinen nach der Annahme erneut nach 30 bis 60 min, die Tafeln laufen nur in aktiven Sektoren.

## Stand der Kalibrierung

`npm run sim` mit 3 Bots über 12 h im Heimatsektor (Seed 42), Stand PRD-2:

- **Märkte:** keine leeren oder vollen Lagerplätze mehr (vorher dauerhaft 0 oder 100 %), mittlere Abweichung vom
  Ziel-Füllstand ca. 5 Prozentpunkte. Keine Fabrik steht still.
- **Quests (Hauptschiff, Spatz):** 86 bis 117 Quests in 12 h, 11 bis 26 k Cr/h Belohnung, 83 bis 107 XP/h,
  Pilotenlevel 3 nach 12 h. Ziel laut PRD-2 sind 100 bis 200 XP/h; Erkundung und Rundreisen macht der Bot nicht.
- **Handel:** Der Handelsgewinn der Bots ist deutlich gesunken (frühe Phase Ø ca. 3 k Cr/h, ohne Drift 12 bis 30 k Cr/h).
  Er enthält allerdings auch die Einkäufe für Beschaffungsquests, deren Erstattung als Questbelohnung zählt.
  Ursache ist die Drift: Ein leergekaufter Markt erholt sich wie gewollt erst in 1 bis 2 h, der Durchsatz je Markt
  sinkt dadurch. Das ist das Risiko aus PRD-2 Kapitel 14; Stellschraube ist `ECON.HALF_LIFE` in `shared/config.js`.
- Die mittlere Phase (10 bis 20 Schiffe) erreichen die Bots nicht. Weitere Kalibrierung mit echten Spielsitzungen.
- **PRD-3 (6 h, 3 Bots):** 94 bis 173 XP/h je Bot mit Quests (Ziel 125 bis 160). Einzelne Bots bleiben in manchen Läufen
  am Start hängen (0 Handelsaufträge, unter 60 XP/h); das tritt auch ohne PRD-3 auf und liegt am Bot, nicht am Spiel.
  Konsortien, Sondernachfrage, Gebäude-Ausbau und Minispiele nutzt der Bot nicht, sie sind noch nicht kalibriert.

## Nicht im Umfang

Chat, Authentifizierung, Stützpunkt, Kampf, Unterhaltskosten, Whitelist im Handelsmodus, automatisches Ausweichen
um Sondergebiete (siehe PRD Kapitel 12), Questfristen, Rivalität zwischen Fraktionen, Gruppenquests, Schiffe im Besitz von Konsortien, Bündnisse zwischen Konsortien, planetare Ansicht
für Stationen (siehe PRD-2 Kapitel 13 und PRD-3 Kapitel 11).
