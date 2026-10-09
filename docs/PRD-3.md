# PRD: SpaceTrader Erweiterung "Gemeinschaft"

Stand: 2026-10-09 · Status: Entwurf, im Interview abgestimmt · Baut auf [PRD.md](PRD.md) ("Galaxie") und [PRD-2.md](PRD-2.md) ("Progression") auf

## 1. Ziel

Spieler sollen gemeinsam etwas aufbauen können, und Planeten sollen mehr sein als ein Markt mit Preisliste. Die Erweiterung umfasst:

- **Zusammenspiel:** Konsortien mit gemeinsamem Geldpool, gemeinsamem Besitz, Karten- und Schiffshandel
- **Ereignisse:** Sondernachfrage je Sektor mit festem Höchstpreis
- **Planetare Ansicht:** neue Zoomstufe mit Gebäuden, Gebäude-Ausbau, Fabrik-Bauplätzen, Minispielen und Kleinigkeiten (Schmuggler, Bettler, Hund, Schule)
- **Atmosphäre:** eigener Klang für jeden Planeten
- **Kalibrierung:** XP aus Quests rauf, XP aus Erkundung runter

Alle Zahlen in diesem Dokument sind Kalibrierungsannahmen und gehören zentral nach `shared/*`.

## 2. Ausgangslage (Codestand nach PRD-2)

- **Besitz:** nur einzelne Spieler (`game.ownership`, Spalte `player`). Der Besitzer erhält Erlöse aus Fremdhandel, Zoll und Fixpreis-Verbrauch. Eigene Schiffe tauschen kostenlos mit dem Lager (`ownerTransfer`). Grenzen über die Gouverneurslizenz: 1 bis 25 Besitztümer, Ausbau bis Stufe 2 bis 7.
- **Geld:** Es gibt keinen Geldtransfer zwischen Spielern und keinen Handel von Schiffen oder Kartendaten.
- **Kartendaten:** je Spieler aufgedeckte Nebelzellen (`p.revealed`, Raster 1.000) und Entdeckungen (`p.known`: system, sector, zone, wh, recipe, ship, module). Das Aufdecken einer Zelle bucht nebenbei Almanach-Einträge mit XP.
- **Planeten:** Märkte mit Waren der Rolle `produce` oder `consume`, keine Rezepte. Fabriken mit Rezepten sind Stationen.
- **Quests:** Annehmen im Detailfenster an Planeten und Werften.
- **XP:** Quests 1,0 XP je Aufwandsminute, Sektor 60 bzw. 20 XP, Almanach 5 bzw. 10 XP. Kalibrierung: 83 bis 107 XP/h, Ziel 100 bis 200 XP/h. Fraktionsruf = Quest-XP, Questgeber-XP = Quest-XP.
- **Letztes Schiff:** `sellShip` und `recycle` verweigern bereits das letzte Schiff. Ein leerer Tank bremst auf 30 % Tempo, das Schiff bleibt flugfähig. Kurierquests brauchen kein Startkapital. Es gibt also keinen Softlock.

## 3. Grundsatzentscheidungen

| # | Entscheidung |
|---|---|
| G1 | Die Spieler sind vertrauenswürdig (Freundeskreis, keine Authentifizierung). Es gibt keinen Schutz vor Missbrauch innerhalb eines Konsortiums, keinen Gründerstatus und keine Sperrfristen. Manipulierbare Client-Ergebnisse (Geschicklichkeitsspiele) sind akzeptiert. |
| G2 | Gebühren sind eine **Geldsenke**: Sie verschwinden aus dem Spiel. |
| G3 | Das Konsortium besitzt Geld und Planeten, aber **keine Schiffe**. |
| G4 | Fortschritt bleibt an aktive Handlungen gebunden (PRD-2 P2). Gekaufte Kartendaten, Gebäude-Ausbau, Sondernachfrage und Minispiele bringen keine Piloten-XP. |
| G5 | Es werden keine neuen Waren oder Rezepte erfunden. Fabrik-Bauplätze nutzen die vorhandenen 40 Rezepte. |
| G6 | Die planetare Ansicht wird prozedural im Canvas gezeichnet, ohne neue Bilddateien. Ihre Ausstattung ist deterministisch aus der Planeten-ID. |
| G7 | Migration statt Weltreset: Die neuen Daten kommen als neue Tabellen per `user_version`. Ein Weltreset bleibt erlaubt, falls die Umsetzung es erfordert. |

## 4. Konsortien

### 4.1 Gründung und Mitgliedschaft

- **Gründung:** Pilotenlevel ab 2, ein eigenes Schiff angedockt an einem Hub, 2.000 Cr aus dem Privatgeld. Der Gründer wird Handelsmeister. Er hat danach keine Sonderrolle.
- **Name:** eindeutig, 3 bis 24 Zeichen. Die **Farbe** ist frei wählbar und wird für die Besitzanzeige auf der Karte verwendet (`ownerName`, `ownerColor`).
- **Ein Konsortium je Spieler.**
- **Ränge:**

  | Rang | Rechte |
  |---|---|
  | Händler | einzahlen, Kartendaten und Schiffe anbieten und kaufen, eigene Planeten übertragen, Schwarzes Brett bearbeiten, Konsortiumslager nutzen |
  | Handelsmeister | zusätzlich auszahlen, einladen, befördern, herabstufen, rausschmeißen, für das Konsortium kaufen und ausbauen, Planeten herauskaufen, Levelaufstieg, Log einsehen, Konsortiumsbesitz verwalten |

- **Einladung:** Ein Handelsmeister lädt per Spielername ein. Der Spieler nimmt an oder lehnt ab. Die Einladung verfällt nach 24 h. Für Mitglieder gibt es kein Mindestlevel.
- **Rausschmiss und Herabstufung:** Handelsmeister können jedes andere Mitglied entfernen oder herabstufen, auch andere Handelsmeister.
- **Austritt:** jederzeit. Das Privatgeld bleibt beim Spieler, es gibt keine Auszahlung aus dem Pool. Offene Karten- und Schiffsangebote des Spielers verschwinden, angebotene Schiffe werden entsperrt.
- **Letzter Handelsmeister:** Er kann erst austreten, wenn er jemanden befördert hat. Ist er das letzte Mitglied, wird das Konsortium aufgelöst. Seine Planeten werden herrenlos, also wieder NPC-Märkte wie nach einem Besitzverlust, und der Pool verfällt.
- **Keine Mitgliederobergrenze.**

### 4.2 Level

Aufstieg auf Level n kostet das Fünffache der Gouverneurslizenz n−1. Bezahlt wird aus dem Pool, auslösen darf ein Handelsmeister, ortsunabhängig im Konsortiumsfenster.

| Level | Kosten | Max. Besitztümer | Max. Ausbaustufe |
|---|---|---|---|
| 1 | 2.000 (Gründung, Privatgeld) | 3 | 2 |
| 2 | 1,25 Mio | 15 | 3 |
| 3 | 7,5 Mio | 35 | 4 |
| 4 | 30 Mio | 80 | 5 |
| 5 | 100 Mio | 150 | 6 |
| 6 | 300 Mio | 300 | 7 |

Konsortiumsbesitz zählt nur gegen das Konsortiumslimit, nicht gegen `maxProps` der Mitglieder.

### 4.3 Geldpool

- Der Pool ist vom Privatgeld getrennt und kann nicht negativ werden.
- **Einzahlen** (alle Mitglieder): Der Spieler zahlt X, der Pool erhält 0,9 × X.
- **Auszahlen** (Handelsmeister): Der Pool verliert X, der Handelsmeister erhält 0,8 × X auf das eigene Privatkonto. Eine Auszahlung an andere ist nicht möglich.
- **Gebührenfrei** sind:
  - Erlöse der Konsortiumsplaneten (Fremdhandel, Zoll, Fixpreis-Verbrauch) in den Pool
  - Mitgliederhandel mit dem Konsortiumslager (Kapitel 4.4)
  - Käufe, Ausbau, Fabrikbau und Levelaufstieg aus dem Pool
  - Herauskauf eines Planeten

### 4.4 Konsortiumsbesitz

- **Kauf:** Knopf "Für Konsortium kaufen" unter "Kaufen", mit Anzeige des Poolstands. Bedingungen:
  - Der Käufer ist Handelsmeister.
  - Ein eigenes Schiff ist angedockt.
  - Die eigene Gouverneurslizenz schaltet die Objektart frei (Fabrik, Werft, Planet, große Werft).
  - Das Konsortiumslimit hat Platz.
  - Der Pool deckt den Preis.

  Ist der Knopf ausgegraut, nennt ein Tooltip den Grund.
- **Lager für Mitglieder:** Alle Mitglieder handeln mit dem Lager zum **Fixpreis** des Objekts. Entnahme bezahlt das Mitglied an den Pool, Einlagerung bezahlt der Pool an das Mitglied, jeweils zollfrei und ohne Gebühr. Ohne Fixpreis wird die Fixpreis-Position 0,5 (`FIXED.DEFAULT`) verwendet. Deckt der Pool eine Einlagerung nicht, wird nur so viel eingelagert, wie bezahlt werden kann.
- **Verwaltung** nur durch Handelsmeister: Modus offen/privat, Zoll, Fixpreise, Ausbau (Credits aus dem Pool, Waren aus den Laderäumen angedockter Schiffe des Handelsmeisters), Bau auf Befehl an Konsortiumswerften (aus dem Pool, das Schiff gehört dem Auslösenden).
- **Ausbaugrenze:** durch das Konsortiumslevel (Kapitel 4.2), nicht durch die Lizenz des Handelsmeisters.
- **Privat zu Konsortium:** Jedes Mitglied kann eigene Besitztümer übertragen, ohne Gegenleistung (Schenkung), wenn das Konsortiumslimit Platz hat.
- **Herauskaufen:** Ein Handelsmeister kauft einen Konsortiumsbesitz zum aktuellen `propertyPrice` (inkl. Ausbau) aus dem Privatgeld in den Pool, ohne Gebühr. Bedingungen sind die passende eigene Gouverneurslizenz und ein freier `maxProps`-Platz. Das Schiff muss nicht angedockt sein.
- **Datenmodell:** `ownership.player` enthält bei Konsortiumsbesitz die Konsortium-ID mit Präfix `c:`. Alle Stellen, die heute `prop.player === ship.owner` prüfen, nutzen eine gemeinsame Funktion `canUseStorage(prop, playerId)`.

### 4.5 Kartendaten

- **Angebot:** Ein Mitglied wählt einen Sektor mit eigenen aufgedeckten Zellen und setzt einen Preis. Angezeigt werden Sektorname, Anzahl Zellen und Aufdeckungsgrad in Prozent.
- **Kauf:** Der Käufer erhält den Stand des Verkäufers **zum Kaufzeitpunkt**: Zellen, Sonnensysteme, Zonen und Wurmloch-Verbindungen, deren beide Enden danach bekannt sind. Spätere Funde werden nicht nachgeliefert, ein erneuter Kauf zum vollen Preis ist möglich.
- Das Angebot bleibt, bis der Ersteller es löscht oder austritt. Es kann beliebig oft gekauft werden, nicht vom Ersteller selbst.
- **Geld:** Der Käufer zahlt aus dem Privatgeld, der Verkäufer erhält 90 %. Der Pool ist nicht beteiligt.
- **Keine XP, kein Almanach:** Gekaufte Zellen buchen weder Almanach-Einträge noch Sektor-XP noch Fortschritt in Erkundungsquests. Almanach-Einträge entstehen weiterhin nur in eigener Sensorreichweite. Umsetzung: `revealAround` und die Kartenübernahme bekommen getrennte Pfade, nur der eigene Pfad bucht Almanach und Quests.

### 4.6 Schiffshandel

- **Angebot:** Ein Mitglied wählt ein eigenes Schiff und setzt einen Preis. Bedingungen:
  - Das Schiff ist angedockt.
  - Der Laderaum ist leer.
  - Es hat keine Route und keine Queue.
  - Es ist nicht das Hauptschiff.
  - Es ist **nicht das letzte Schiff** des Spielers.

  Das Schiff ist während des Angebots gesperrt und nimmt keine Befehle an.
- **Kauf:** genau ein Käufer, danach ist das Angebot weg. Der Käufer braucht die Pilotenlizenz für die Klasse, bei Fraktionsschiffen zusätzlich den Rang. Er muss nicht vor Ort sein.
- **Übergang:** Das Schiff wechselt an Ort und Stelle den Besitzer, mit Upgrades, Modulen, Treibstoff und Namen.
- **Geld:** Der Käufer zahlt aus dem Privatgeld, der Verkäufer erhält 90 %.

### 4.7 Schwarzes Brett und Log

- **Schwarzes Brett:** alle Mitglieder lesen und bearbeiten. Klartext bis 2.000 Zeichen mit der Angabe "zuletzt bearbeitet von X um Y". Wer zuletzt speichert, gewinnt. Hat sich der Text seit dem Öffnen geändert, erscheint ein Hinweis.
- **Log** (nur Handelsmeister): Zeitpunkt, Spieler, Aktion, Betrag, Objekt. Erfasst werden:
  - Ein- und Auszahlungen mit Gebühr
  - Käufe, Übertragungen und Herauskäufe von Planeten und Stationen
  - Schiffs- und Kartenverkäufe
  - Levelaufstiege, Ausbau und Fabrikbau
  - Beitritt, Austritt, Rausschmiss, Beförderung und Herabstufung

  Erlöse der Konsortiumsplaneten erscheinen stündlich aggregiert je Objekt. Aufbewahrt werden die letzten 1.000 Einträge, höchstens 30 Tage.

### 4.8 Oberfläche

Konsortiumsfenster mit Taste **K** und aufklappbaren Bereichen:

| Bereich | Inhalt |
|---|---|
| Übersicht | Name, Farbe, Level mit Aufstieg, Pool, Besitz x / Limit |
| Mitglieder | Rang, Pilotenlevel, Einladen, Befördern, Herabstufen, Rausschmiss, Austritt |
| Pool | Einzahlen, Auszahlen mit Gebührenvorschau |
| Besitz | Liste der Konsortiumsplaneten, Übertragen, Herauskaufen |
| Kartendaten | eigene Angebote, alle Angebote, Kaufen |
| Schiffshandel | eigene Angebote, alle Angebote, Kaufen |
| Schwarzes Brett | Textfeld |
| Log | nur für Handelsmeister |

Ohne Mitgliedschaft zeigt das Fenster offene Einladungen und, am Hub, die Gründung.

## 5. Sondernachfrage

- **Geltungsbereich:** je Sektor. Ein Sektor ist aktiv, solange mindestens ein Spielerschiff darin ist.
- **Timer:** Beim ersten Aktivwerden und nach jedem Event-Ende wird ein Zufallstimer von 20 bis 60 min gewürfelt. Er läuft nur in aktiven Sektoren, sonst pausiert er. Ein laufendes Event läuft bis zum Ende weiter, auch wenn alle Spieler den Sektor verlassen.
- **Planet:** zufälliger NPC-Planet im Sektor, keine Spieler- oder Konsortiumsplaneten.
- **Ware:** zufällig aus den Waren, die im Sektor produziert werden. Ausgeschlossen sind Passagiere und ultraseltene Waren. Der Planet muss die Ware sonst nicht handeln.
- **Preis:** 2 × Ankaufspreis der Ware an diesem Planeten bei leerem Lager (inkl. Standort-Modifier), fest für die ganze Laufzeit.
- **Menge:** `min(100 × L, ceil(2.000 × L / Basispreis))`, mindestens 5. L ist das niedrigste Pilotenlevel der Spieler mit Schiffen im Sektor beim Auslösen.

  | Ware (L = 2) | Basispreis | Menge |
  |---|---|---|
  | Erz | 10 | 200 |
  | Nahrung | 27 | 149 |
  | Elektronik | 175 | 23 |
  | KI-Kerne | 3.408 | 5 |

- **Kein Rückgang:** Event-Lieferungen gehen nicht ins Marktlager und ändern weder Füllstand noch Preis.
- **Was zählt:** nur manuelle Verkäufe über den Handelsbefehl eines eigenen Schiffs. Routen, Stop-Loss, Besitzer- und Konsortiumslager-Transfers sowie NPC-Schiffe zählen nicht.
- **Gemeinsamer Topf:** Wer zuerst liefert, bekommt den Zuschlag. Ein Überschuss über die Restmenge geht zum normalen Marktpreis.
- **Ende:** nach 30 min oder wenn die Menge erfüllt ist.
- **XP:** keine.
- **Anzeige:** Toast an alle Spieler mit Schiffen im Sektor, Event-Liste mit Ware, Preis, Restmenge und Restzeit, Marker am Planeten in System- und Sektoransicht.

## 6. Planetare Ansicht

### 6.1 Zugang und Darstellung

- **Zugang:** Doppelklick auf einen Planeten oder Knopf "Landen" im Detailfenster, nur wenn ein eigenes Schiff dort angedockt ist. Sonst erscheint der Toast "Kein Schiff angedockt". Nur Planeten haben diese Ansicht, Stationen, Hubs und Werften nicht.
- **Verlassen:** Esc oder Taste 1/2/3. Fliegt das letzte angedockte eigene Schiff ab, endet die Ansicht.
- **Darstellung:** Canvas-Szene in Seitenansicht, horizontal scrollbar. Himmel, Boden und Farben kommen aus dem Planetentyp, die Gebäude sind prozedurale Formen. Anordnung und Ausstattung sind deterministisch aus der Planeten-ID.
- **Die Simulation läuft weiter**, Flotte, HUD und Toasts bleiben bedienbar.
- **Gebäude anklicken** öffnet das zugehörige Panel.
- Andere Spieler sind nicht sichtbar. Gebäudelevel und Ausstattung sind global, der Hunde-Buff ist persönlich.

### 6.2 Gebäude

| Gebäude | Vorkommen | Funktion |
|---|---|---|
| Questhaus | jeder Planet | Questtafel, Annehmen |
| Produktionsgebäude | je Ware mit Rolle `produce` | Ausbau (Kapitel 6.3). Das Aussehen hängt von der Ware ab: Farm, Bohrturm, Silo, Mine, Fallback Lagerhalle. |
| Verbrauchsgebäude | je Ware mit Rolle `consume` | Ausbau (Kapitel 6.3) |
| Fabrik | nur auf Bauplätzen eigener Planeten | Kapitel 6.4 |
| Unterhaltung | 0 bis 3 je Planet | Minispiele (Kapitel 6.5) |
| Schmugglerhöhle | 20 % | Kapitel 6.6 |
| Bettler | 20 % | Kapitel 6.6 |
| Hund | 20 % | Kapitel 6.6 |
| Schule | 20 % | Kapitel 6.6 |

Zusatzwaren aus Planetenlevel oder Besitz-Ausbau bekommen ein Gebäude, sobald sie aktiv sind.

**Quests:** An Planeten werden Quests nur noch im Questhaus angenommen. Im Detailfenster bleibt die Tafel sichtbar, der Knopf verweist auf "Im Questhaus annehmen (landen)". An **Werften** bleibt das Annehmen im Detailfenster. Fortschritt und Abschluss laufen unverändert automatisch. Der Server prüft weiterhin nur "angedockt", der Quest-Bot der Simulation bleibt unverändert.

### 6.3 Gebäude-Ausbau

- **Wirkung je Level:** Rate dieser Ware +20 % und Lager dieser Ware +15 %, multiplikativ mit Planetenlevel und Besitz-Ausbau. Level 6 ergibt ×2,2 Rate, Level 10 ×3,0. Bei NPC-Märkten erhöht die Rate die Grenze der Drift, also den Durchsatz für Händler.
- **Grenzen:** Level 0 bis 6 an jedem Planeten, 7 bis 10 nur bei eigenem Besitz bzw. bei Konsortiumsbesitz durch Handelsmeister. Geht der Besitz verloren, bleibt das Level gespeichert, die Wirkung ist aber auf 6 gedeckelt.
- **Wer darf:** jeder Spieler mit angedocktem eigenen Schiff. Das Level ist global.
- **Kosten:** Credits `50.000 × 1,8^(L−1) × Planetengröße`, dazu Waren aus den Laderäumen angedockter eigener Schiffe. Die Mengen steigen mit dem Level wie bei `propUpgradeCost`.

  | Level | Waren |
  |---|---|
  | 1 bis 3 | Platten, Maschinen, Zahnräder |
  | 4 bis 6 | Elektronik, Roboter, Hüllenteile |
  | 7 bis 10 | Roboter, KI-Kerne, Habitate |

- **Konsortiumsplaneten:** Credits aus dem Pool, Waren vom Handelsmeister.
- **XP:** keine Piloten-XP. Der Planet erhält 1 Questgeber-XP je 2.000 Cr Ausbauwert (Credits plus Warenwert zum Basispreis).

### 6.4 Fabrik-Bauplätze auf eigenen Planeten

Die 40 Rezepte sind in vier Kategorien eingeteilt:

| Kategorie | Rezepte |
|---|---|
| Bio | waterworks, foodplant, weavery, fertilizerplant, pharma, cannery, tailor |
| Chemie | refinery, oilworks, chemworks, chemplant, coolantworks, fueldepot, glassworks, siliconworks |
| Schwer | smelter, rollingmill, alloyworks, refinery2, toolworks, gearworks, hullworks, machineworks, engineworks, reactorworks |
| Hightech | chipfab, cableworks, electronicsworks, opticsworks, batteryplant, cellworks, sensorworks, robotics, computerworks, aiforge, medtechworks, consumerworks, shippartsworks, habitatworks, jeweler |

Bauplätze je Planetentyp:

| Typ | Bio | Chemie | Schwer | Hightech |
|---|---|---|---|---|
| agrar | 3 | 1 | 0 | 0 |
| ocean | 2 | 2 | 0 | 0 |
| jungle | 3 | 1 | 0 | 0 |
| desert | 0 | 2 | 1 | 1 |
| ice | 1 | 2 | 0 | 1 |
| mining | 0 | 1 | 3 | 0 |
| volcanic | 0 | 2 | 2 | 0 |
| gasgiant | 0 | 3 | 1 | 0 |
| colony | 1 | 0 | 2 | 1 |
| urban | 1 | 0 | 0 | 3 |
| resort | 2 | 0 | 0 | 1 |
| industrial | 0 | 1 | 2 | 2 |

- **Mechanik:** Die Fabrik nutzt das Planetenlager. Zutaten werden `consume`-Waren, Produkte werden `produce`-Waren, analog zur Zusatzproduktion in `applyProperty`. Fixpreis-Verbrauch, Fremdhandel und Gebäude-Ausbau greifen damit automatisch.
- **Rate:** wie bei der gleichnamigen Station. Dasselbe Rezept darf mehrfach gebaut werden.
- **Kosten:** 50 % des Stationspreises, also `200.000 × (1 + 0,35 × Stufe)`, dazu Platten und Maschinen aus dem Laderaum. Gebaut wird sofort.
- **Abriss:** jederzeit, ohne Erstattung. Der Platz wird frei.
- **Konsortiumsplaneten:** Bau und Abriss nur durch Handelsmeister, Kosten aus dem Pool.

### 6.5 Minispiele

- **Einsatz:** 10, 20 oder 50 × Pilotenlevel. Ein Gewinn zahlt den Einsatz plus denselben Betrag aus.
- **Gewinnchance:** 60 %, mit Hunde-Buff 70 %.
- **Stundenlimit:** höchstens 20 Spiele je Spieler und Stunde, über alle Planeten. Danach erscheint "Der Croupier macht Pause" mit Countdown.
- **Dauer:** 5 bis 40 s je Spiel.
- **Glücksspiele:** Der Server würfelt das Ergebnis, der Client animiert es nur.
- **Geschicklichkeitsspiele:** Der Server liefert Seed und Schwierigkeit, der Client meldet das Ergebnis. Die Schwierigkeit wird auf ca. 60 % Erfolg kalibriert. Der Hund erleichtert das Spiel (Zielzone breiter, Tempo langsamer, ein Versuch mehr).

| Gebäude | Spiele | Art |
|---|---|---|
| Taverne | Würfeln, Höher oder Tiefer (Karten) | Glück |
| Kasino | 1 bis 3 aus: Slotmaschine, Weltraum-Roulette (Glück), Lichtpunkt in der Mitte stoppen (Geschick) | gemischt |
| Jahrmarktbude | Hütchenspiel mit 3 Hütchen, Dosenwerfen in Schwerelosigkeit | Geschick |
| Rennbahn | Pferderennen, Wette auf ein Pferd | Glück |
| Stollen | Erzsuche mit dem Hammer im Sand | Geschick |

### 6.6 Kleinigkeiten

- **Schmugglerhöhle (20 %):**
  - **Wurmloch-Tipp:** Für 5.000 Cr wird ein dem Spieler unbekannter Wurmloch-Eingang im aktuellen Sektor aufgedeckt, also das Objekt und die Zellen darum. Gibt es keinen mehr, ist der Knopf ausgegraut ("Hier gibt's nichts mehr zu holen"). Es gibt keine XP. Almanach und Wurmloch-Verbindung werden normal gebucht.
  - **Lieferquest:** eigener Slot mit den Typen Beschaffung oder Kurier. Belohnung ×2 Credits gegenüber `questReward`, 0 XP, kein Questgeber-Level, kein Fraktionsruf. Sie zählt als die eine aktive Quest.
- **Bettler (20 %):** Jede Spende kostet 10 Cr. Dafür gibt es ein zufälliges Kompliment in einer Sprechblase aus einer Liste von ca. 60. Gleichzeitig verliert jedes angedockte eigene Schiff 5 % seines aktuellen Treibstoffs. Es gibt kein Limit.
- **Hund (20 %):** Streicheln setzt den persönlichen Buff auf 5 min, er wirkt auf allen Planeten. Erneutes Streicheln frischt ihn auf, er stapelt nicht. Im HUD erscheint ein Symbol mit Restzeit.
- **Schule (20 %):** Die Tafel zeigt bei jedem Betreten einen zufälligen Eintrag, ein Knopf "Nächster Fakt" ist vorhanden. Die Liste hat ca. 400 eigene Formulierungen in `shared/facts.js`, je etwa 1/3:
  - Wissenschaft und Natur
  - Geschichte und Kurioses
  - Geoguessr-Tipps zu stabilen Merkmalen: Fahrseite, Schrift, Poller, Kennzeichen, Straßenmarkierungen

  Aufgenommen werden nur gesicherte Fakten.

## 7. Planeten-Klang

- **Auslöser:** Linksklick-Auswahl eines Planeten in System- oder Sektoransicht, nicht beim Doppelklick und nicht im Galaxiezoom. Ein erneuter Klick auf denselben Planeten innerhalb 1 s spielt keinen Ton.
- **Seed:** Hash der gerundeten Koordinaten. Jeder Planet klingt immer gleich, für alle Spieler.
- **Tonfolge** aus dem Seed: 2 bis 3 Töne, 0,3 bis 0,7 s, Grundton aus einer pentatonischen Skala über 2 Oktaven, Intervallfolge, Hüllkurve, Vibrato bzw. Hall-Anteil.
- **Klangfarbe** aus dem Planetentyp: Wellenform und Filter, z. B. Eis glasig, Vulkan dumpf, Gasriese weich.
- **Lautstärke:** Regler "Effekte" im Tonmenü, Umsetzung per WebAudio in `client/js/audio.js`.

## 8. XP-Anpassung

| Wert | Bisher | Neu |
|---|---|---|
| `QUEST.XP_PER_MIN` | 1,0 | 1,5 |
| Faktor auf XP von Erkundungsquests | 1,0 | 0,5 (netto 0,75 XP je Minute) |
| `XP.SECTOR_FIRST` | 60 | 30 |
| `XP.SECTOR_VISIT` | 20 | 10 |
| Almanach-XP | 5 / 10 | unverändert |
| `REP.PER_XP` | 1 | 0,67 |
| Questgeber-XP | = Quest-XP | Quest-XP / 1,5 |

Erwartung: 125 bis 160 XP/h beim Questen mit dem Hauptschiff. Fraktionsränge und Planetenlevel steigen so schnell wie bisher.

## 9. Letztes Schiff

Es bleibt bei der bestehenden Regel: Das letzte Schiff kann nicht abgegeben werden. Die Prüfung wird zentral als `canGiveAway(player, ship)` umgesetzt und gilt für Verkauf an Werft oder Hub, Recycling und das Schiffsangebot im Konsortium. Ein Spieler ohne Credits bleibt über Kurierquests und den Langsamflug mit leerem Tank handlungsfähig.

## 10. Datenmodell

Neue Tabellen per Migration in `server/db.js`:

| Tabelle | Schlüssel | Inhalt |
|---|---|---|
| `consortia` | id | Name, Farbe, Level, Pool, Mitglieder mit Rang, Schwarzes Brett, Einladungen |
| `consortium_log` | consortium, seq | Logeintrag |
| `map_offers` | id | Verkäufer, Sektor, Preis |
| `ship_offers` | ship | Verkäufer, Preis |
| `planet_buildings` | entity | Gebäudelevel je Ware, Fabriken auf Bauplätzen |
| `sector_events` | sector | Timer bzw. laufendes Event (Planet, Ware, Preis, Restmenge, Ende) |

Am Spieler kommen hinzu: `consortium`, Hunde-Buff (Ablaufzeit), Minispiel-Zähler der laufenden Stunde. Die Ausstattung eines Planeten (Unterhaltung, Schmuggler, Bettler, Hund, Schule) wird nicht gespeichert, sondern aus der Planeten-ID berechnet.

## 11. Nicht im Umfang

- Chat, private Nachrichten, Geldtransfer zwischen Spielern außerhalb von Karten- und Schiffshandel
- Schiffe im Besitz eines Konsortiums
- Mehrere Konsortien je Spieler, Bündnisse oder Rivalität zwischen Konsortien
- Planetare Ansicht für Stationen, Hubs und Werften
- Neue Waren oder Rezepte
- Weiterhin nicht im Umfang (siehe [PRD.md](PRD.md) Kapitel 12 und [PRD-2.md](PRD-2.md) Kapitel 13): Kampf, Authentifizierung, Questfristen, Gruppenquests

## 12. Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Poolgeld lässt sich gebührenfrei privatisieren: Bau auf Befehl an Konsortiumswerften aus dem Pool, das Schiff gehört dem Auslösenden und wird verkauft oder recycelt | Bewusst akzeptiert (G1). Bei Bedarf später: Werftbau aus dem Pool nur zu Gebühr |
| Karten- und Schiffshandel als gebührengünstiger Geldtransfer (10 %) zwischen Mitgliedern | Bewusst akzeptiert (G1). Er ist günstiger als Pool ein und aus (28 %) |
| Gebäude-Ausbau bis ×3 Rate verschiebt das Gleichgewicht von Drift und Füllständen | In der Simulation mit ausgebauten Planeten kalibrieren, Stellschrauben Rate je Level und Kostenkurve |
| Fabrik-Bauplätze machen Stationen als Besitz unattraktiv | Beobachten. Bauplätze sind auf 4 je Planet begrenzt und kosten nur halb so viel, haben aber keine eigene Lagergröße |
| Konsortiumslager-Handel zum Fixpreis wird zum Arbitrage-Werkzeug (billig entnehmen, am Nachbarmarkt teuer verkaufen) | Ist gewollt, das Geld bleibt im Konsortium. Die Fixpreis-Spanne 0,3 bis 0,7 begrenzt es |
| Sondernachfrage lohnt nur für Spieler mit großem Laderaum, die Menge richtet sich aber nach dem niedrigsten Level | Gemeinsamer Topf: Wer schneller liefert, profitiert. Mengenformel kalibrieren |
| 400 Schulfakten enthalten Fehler oder veraltete Geoguessr-Tipps | Nur gesicherte Fakten, nur stabile Merkmale, Liste zentral pflegbar |
| Die planetare Ansicht wird zur zeitraubenden Pflicht, weil Quests nur dort annehmbar sind | Landen per Knopf im Detailfenster, Questhaus immer links im Bild |

## 13. Phasenplan

Jede Phase ist für sich spielbar.

| Phase | Inhalt |
|---|---|
| 13 Kalibrierung | XP-Anpassung (Kapitel 8), zentrale Prüfung "letztes Schiff" (Kapitel 9), Simulation nachziehen |
| 14 Konsortium Kern | Gründung, Mitglieder, Ränge, Einladungen, Pool mit Gebühren, Level, Log, Schwarzes Brett, Konsortiumsfenster |
| 15 Konsortium Besitz und Handel | Konsortiumskauf, Lager zum Fixpreis, Übertragen und Herauskaufen, Kartendaten, Schiffshandel |
| 16 Sondernachfrage | Event-Timer je Sektor, Auswahl, Annahme manueller Verkäufe, Anzeige |
| 17 Planetare Ansicht | Zoomstufe, Szene, Questhaus, Gebäude, Gebäude-Ausbau, Fabrik-Bauplätze, Planeten-Klang |
| 18 Unterhaltung | Minispiel-Rahmen mit Stundenlimit, 9 Minispiele, Schmugglerhöhle, Bettler, Hund, Schule mit Faktenliste |

## 14. Annahmen

Alle Zahlen sind Annahmen für die erste Kalibrierung, insbesondere:
- Konsortiumslimits und -kosten
- Mengenformel der Sondernachfrage
- Wirkung und Kosten des Gebäude-Ausbaus
- Bauplätze je Planetentyp
- Minispiel-Stundenlimit
- XP-Faktoren

Unsicher ist, ob die Minispiele mit Stundenlimit attraktiv genug bleiben. Das zeigt sich erst im Spiel.
