# PRD: SpaceTrader Erweiterung "Galaxie"

Stand: 2026-10-06 · Status: Entwurf, im Interview abgestimmt

## 1. Ziel

SpaceTrader wird von einem kleinen Handelsprototyp auf einer flachen, unendlichen Ebene zu einem langfristig motivierenden Handels- und Aufbauspiel erweitert. Die Erweiterung umfasst:

- **Welt:** eine strukturierte Welt aus Sektoren, Sonnensystemen und Spezialorten
- **Wirtschaft:** eine deutlich tiefere Wirtschaft mit etwa 60 Waren, langen Produktionsketten und standortabhängigen Preisen
- **Progression:** über Schiffe, Upgrades, Module, Lizenzen und Besitz von Planeten und Stationen
- **Geldsenken:** exponentiell steigende Kosten, die das Spätspiel tragen
- **Komfort:** für große Flotten (Flottenliste, Befehlsqueue, Routenvorlagen, Übersichten)

Zielgruppe: kleiner Freundeskreis, Multiplayer auf einem gemeinsamen Server.

## 2. Ausgangslage (Codestand)

- **Technik:** Node.js, Express, Socket.IO, Vanilla JS mit Canvas 2D, ca. 2.000 Zeilen. Es gibt keine Tests und keinen Build-Schritt.
- **Welt:** unendlich und prozedural, in 3.000er-Chunks erzeugt (`server/world.js`). Systeme, Cluster oder Sprungpunkte gibt es nicht.
- **Wirtschaft:**
  - 20 Waren, Balancing zentral in `shared/config.js`.
  - Der Preis hängt nur vom Füllstand ab.
  - Kaufen ist nur an Produzenten möglich, Verkaufen nur an Verbrauchern.
- **Schiffe:** 4 Typen, ohne Treibstoff und ohne Upgrades. NPC-Werften bauen automatisch aus angelieferten Materialien.
- **Befehle:** ein Befehl pro Schiff, keine Queue. Routen sind Endlosschleifen, die je Schiff kopiert werden.
- **Persistenz:** eine einzelne `data/save.json`. Passt die Version nicht, wird die Welt neu erzeugt.
- **Netzwerk:** Alle bekannten Märkte gehen alle 2 s an jeden Client.
- **Login:** Login nur über Namen, ohne Authentifizierung.

## 3. Grundsatzentscheidungen

| # | Entscheidung |
|---|---|
| G1 | Die Welt bleibt unendlich. Generierungseinheit ist ein **Sektor um ein Schwarzes Loch**, der vollständig am Stück erzeugt wird. |
| G2 | Sektoren liegen in einem **Hex-Raster** und sind wirtschaftlich unabhängig voneinander. |
| G3 | Weltresets sind unproblematisch und in jeder Phase erlaubt. Eine Migration alter Welten entfällt. |
| G4 | Die Geldbalance folgt der Variante **hohe Erträge, exponentielle Senken** mit dem Faktor ×1,6 je Stufe. |
| G5 | Persistenz über **SQLite** und Netzwerk über ein **Subscription- und Delta-Modell**. |
| G6 | Es gibt **keine Authentifizierung** (bewusstes Risiko, siehe Kapitel 13). |
| G7 | Der Chat entfällt vollständig. |

## 4. Welt

### 4.1 Sektoren

- **Anordnung:** Hex-Raster. Das Schwarze Loch sitzt mit kleinem Zufallsversatz im Zentrum der Zelle.
- **Maßstab** (Flugzeit bei Speed 150):
  - Sonnensystem ca. 1 Minute (ca. 8.000 Einheiten)
  - Sektor-Durchmesser 15 bis 20 Minuten (ca. 150.000)
  - Leerraum zwischen Sektorrändern ca. 10 Minuten (ca. 90.000)
- **Nachgenerierung:** Kommt ein Schiff näher als 30.000 Einheiten an den Rand eines Sektors, wird der Nachbarsektor auf der anderen Seite als Ganzes erzeugt.
- **Freier Flug** ist zwischen allen Sektoren möglich.
- **Determinismus:** Die Generierung ist deterministisch aus dem Weltseed und der Hex-Koordinate.

### 4.2 Inhalt eines Sektors

| Element | Regel |
|---|---|
| Sonnensysteme | 8 bis 15, Abstand untereinander mindestens 3 Minuten Flugzeit |
| Inhalt eines Systems | 2 bis 6 Planeten, 1 bis 4 Stationen, 0 bis 2 Asteroidengürtel |
| Spezialisierung | 1 bis 2 Rohstoff-Tags je System, die die Typwahrscheinlichkeit etwa verdreifachen |
| Schiffstreibstoff | rein zufällig, Zielwert ca. 70 % der Systeme, ohne Garantie |
| Handels-Hub | genau 1, große Station nahe dem Schwarzen Loch |
| Große Werft | genau 1 |
| Normale Werften | 0 bis 1 je System, ca. 3 bis 5 je Sektor |
| Produzenten ultraseltener Waren | 1 bis 3 je Sektor |
| Fraktionscluster | ca. 1 je 3 Sektoren, ersetzt 2 bis 3 normale Systeme |
| Wurmlöcher | 0 bis 2 je Sektor |
| Sondergebiete | 0 bis 3 je Sektor |

### 4.3 Startsystem

- **Aufbau:** Handgebaut ist nur das Startsystem im Startsektor. Es enthält Hub, Werft, Treibstoff und alle Grundrohstoffe nah beieinander. Der restliche Startsektor wird normal generiert.
- **Langsam-Modifier:** Produktion und Verbrauch laufen mit ca. 25 % der normalen Rate, die Lager sind entsprechend kleiner (Annahme, Wert wird kalibriert).
- **Ziel:** Mehr als ein Schiff soll sich im Startsystem nicht lohnen.
- Das Startsystem ist nicht kaufbar.

### 4.4 Wurmlöcher

- Sie haben zwei Endpunkte, sind bidirektional und kostenlos. Der Durchflug dauert 5 s und verbraucht keinen Treibstoff.
- Die Endpunkte liegen in Systemen des eigenen Sektors oder eines Nachbarsektors.
- Ein Wurmloch ist sichtbar, sobald ein Endpunkt aufgedeckt ist. Das Ziel bleibt unbekannt, bis man durchgeflogen ist oder es aufgedeckt hat.
- **Navigation:** Bei "Fliege zu" und bei Routenstopps berechnet der Server den schnellsten Weg über **bekannte** Wurmlöcher (Graph-Suche). Der Pfad wird auf der Karte angezeigt.

### 4.5 Sondergebiete

Sondergebiete sind kreis- oder ellipsenförmige Zonen.

| Gebiet | Wirkung innerhalb |
|---|---|
| Gravitationsstörung | −50 % Geschwindigkeit |
| Ionensturm | +100 % Treibstoffverbrauch |
| Dichter Nebel | Sensorreichweite −70 % |
| Sonnenwindkorridor | +40 % Geschwindigkeit |
| Plasmawolke | Abbau von Spezialressourcen (z. B. Nebelgas) |

- Schiffe fliegen weiterhin gerade Linien. Es gibt **kein automatisches Ausweichen**.
- Beim Planen zeigt das Interface eine geschätzte Flugzeit an, Zonen und Wurmlöcher eingerechnet.

## 5. Wirtschaft

### 5.1 Warensortiment

Das Sortiment umfasst etwa **60 Waren** in tiefen Ketten mit 4 bis 5 Verarbeitungsstufen. Zwischenprodukte speisen auch andere Zwischenprodukte, zum Beispiel:

`Erz (+Brennstoff) → Barren (+Hydrauliköl) → Platten (+Fräser) → Zahnräder → Roboter`

- **Ultraseltene Waren** (ca. 6): Gold, Diamant, Uran, Antimaterie, Exotische Kristalle, Nebelgas.
- **Frachtklassen:**
  - **Normal:** jeder Laderaum
  - **Gefährlich:** braucht eine Geschirmte Kammer (z. B. Uran, Säure, Antimaterie, Reaktorkerne, Chemikalien)
  - **Passagiere:** brauchen eine Passagierkabine
- **Abbauklassen:**
  - **Standard:** Erz, Eis, Kristalle, Seltene Erden
  - **Spezial:** je Ressource ein eigenes Modul (Gaskollektor, Tiefbohrer, Säureextraktor)
- **Schiffstreibstoff und Brennstoff sind getrennte Waren.** Schiffstreibstoff dient zum Tanken, Brennstoff ist ein industrielles Zwischenprodukt.
- Der genaue Warenkatalog und die Rezepttabelle werden als eigenes Arbeitspaket in `shared/config.js` ausgearbeitet.

### 5.2 Marktrollen

Jede Ware hat je Markt eine von drei Rollen:

- **Produzent:** verkauft die Ware.
- **Verbraucher:** kauft die Ware.
- **Händler:** kauft und verkauft, hat nur ein Puffer-Lager und produziert nicht selbst.

Verteilung der Händler-Waren:
- **Planeten** bekommen zusätzlich 5 bis 10 Händler-Waren aus dem nicht ultraseltenen Sortiment.
- **Stationen** behalten ihr Rezept und bekommen 0 bis 3 Händler-Waren.
- **Ultraseltene Waren** werden **nur am Hub angekauft** und sind nie Händler-Ware.

### 5.3 Preisbildung

```
Preis = Basispreis × Standort-Modifier × Füllstandskurve(stock/cap) ± Spread
```

- **Füllstandskurve:** wie heute (`shared/config.js`, `priceFor`).
- **Standort-Modifier:** wird einmalig bei der Sektorgenerierung je Markt und Ware berechnet und bleibt danach fest.
  - **Zufallsanteil:** ±15 %.
  - **Glättung:** mit dem Mittel der Märkte im selben System.
  - **Entfernungsprämie** für Waren, die der Markt kauft. Grundlage ist die Flugzeit zum nächsten Produzenten im Sektor, die Prämie steigt progressiv:

    | Flugzeit zum nächsten Produzenten | Prämie |
    |---|---|
    | ≤ 2 Minuten | 0 % |
    | 5 Minuten | ca. +25 % |
    | 10 Minuten | ca. +60 % |
    | Obergrenze | +100 % |

### 5.4 Eigenverbrauch

- Liegt der Füllstand über 80 %, verbraucht der Markt den Anteil oberhalb dieser Schwelle mit ca. 2 % pro Minute. Das gilt für alle Rollen.
- **Ausnahme:** Märkte in Spielerbesitz (Annahme).

### 5.5 Geldbalance

Zielwerte für die Kalibrierung, alle Zahlen sind Annahmen:

| Phase | Gewinn | Typische Ausgabe |
|---|---|---|
| Start (1 Spatz) | 1 bis 3 k Cr/h | Kleinschiff 3 bis 5 k |
| Früh (3 bis 5 Schiffe) | 20 bis 50 k Cr/h | Pilotenlizenz 2, M-Schiffe |
| Mitte (10 bis 20 Schiffe) | 200 bis 500 k Cr/h | erste Station 0,5 bis 2 M |
| Spät | Millionen/h | Upgrades 10 bis 100 M, Fraktionsschiffe |

- **Faktor ×1,6 je Stufe** für Schiffe, Lizenzen und Upgrades.
- **Start-Credits:** 5.000 statt heute 1.500.
- **Laufende Kosten:** Es gibt keine Wartungskosten für Schiffe und keine Unterhaltskosten für Besitztümer. Laufende Senke ist nur der Treibstoff.

## 6. Schiffe

### 6.1 Katalog

Es gibt etwa 16 Typen. Alle Werte sind Größenordnungen und werden kalibriert.

| Klasse | Typen | Laderaum | Speed | Preis | Bezug | Lizenz |
|---|---|---|---|---|---|---|
| S | 3 | 30 bis 60 | 150 bis 260 | 3 bis 15 k | jede Werft | P1 |
| M | 4 | 100 bis 250 | 100 bis 200 | 25 bis 120 k | jede Werft | P2 |
| L | 4 | 400 bis 900 | 70 bis 140 | 250 k bis 1,5 M | große Werft | P3 |
| XL | 2 | 1.500 bis 3.000 | 50 bis 90 | 3 bis 10 M | große Werft | P5 |
| Fraktion | je Fraktion 1 Variante | stark über Klassenniveau | stark | Geld plus seltene Ressource (z. B. 8 M + 500 Diamant) | nur im Fraktionscluster | P4 |

### 6.2 Werften

- **NPC-Werften** bauen weiterhin selbstständig aus angelieferten Materialien, mit maximal 3 Schiffen im Angebot.
  - **Neu:** Der Verkaufspreis ergibt sich aus Materialkosten plus Marge.
- **Große Werft:** baut L- und XL-Schiffe aus höherstufigen Waren (z. B. Platten, Schiffsbauteile, Reaktorkerne). Sie bietet außerdem 1 bis 2 Module an.
- **Schiffsverkauf:** an jeder Werft und am Hub. Der Spieler erhält 60 % des aktuellen Marktpreises plus 50 % des Werts der eingebauten Upgrades.

### 6.3 Stufen-Upgrades

- Drei eigenständige Linien: **Geschwindigkeit, Tankgröße, Laderaum**.
- Die maximale Stufe hängt von der Pilotenlizenz ab (1 bis 6). Die Kosten steigen mit ×1,6 je Stufe.
- Speed-Upgrades erhöhen den Treibstoffverbrauch nicht.

### 6.4 Module

- **Platzbedarf:** Ein Modul belegt **30 Frachteinheiten**. Es gibt keine Slots, die Zahl der Module begrenzt nur der Laderaum.
- **Kapazitäten** sind getrennt: Normaler Laderaum, Passagiere und Gefahrgut zählen jeweils für sich. Ohne passendes Modul lädt ein Schiff weder Passagiere noch Gefahrgut.
- **Kombo-Bonus:** Jedes weitere gleiche Modul bringt +5 Kapazität. Für Passagiere heißt das:

  | Anzahl Passagiermodule | Kapazität |
  |---|---|
  | 1 | 30 |
  | 2 | 65 |
  | 3 | 100 |

- **Modultypen:**
  - Passagierkabine
  - Geschirmte Kammer
  - Gaskollektor
  - Tiefbohrer
  - Säureextraktor
  - Abbaumodule schalten Abbau frei. Jedes weitere gleiche Modul bringt +100 % Abbaurate plus Kombo-Bonus (Wert wird kalibriert).
- **Bezug:**
  - **Nur in Fraktionssystemen:** Jedes Fraktionssystem bietet zufällig 60 % des Modulkatalogs an.
  - **Große Werften** bieten 1 bis 2 Module an.
- **Ausbau:** an jeder Werft möglich, mit 50 % Erstattung (Annahme).

### 6.5 Treibstoff

- **Verbrauch:**
  - Nur im Flug. Tankgröße und Verbrauch je Typ sind auf ca. 8 h Flugzeit bei Grundgeschwindigkeit ausgelegt.
  - Größere Schiffe verbrauchen absolut mehr.
- **Tanken:**
  - Getankt wird die Ware Schiffstreibstoff aus dem Marktbestand, zum Marktpreis.
  - Zielwert: Eine Tankfüllung kostet 2 bis 5 % des Schiffspreises.
  - Möglich ist das manuell, als Routenaktion "Tanken" oder über die Schiffseinstellung **Auto-Tanken unter X %** (Standard 30 %), die beim Andocken an einen Markt mit Treibstoff greift.
- **Leerer Tank:**
  - Das Schiff fliegt mit 30 % Speed weiter, der Befehl läuft weiter.
  - Im Interface erscheinen eine Warnung und ein ⚠-Symbol.

## 7. Spieler und Lizenzen

Kauf und Upgrade von Lizenzen sind nur am Hub möglich.
- Lizenzen gelten galaxieweit.
- Sie kosten nur Geld, ohne weitere Voraussetzungen.
- Man kann sie nicht verlieren oder zurückstufen.

### 7.1 Pilotenlizenz

Stufe 1 hat jeder Spieler von Beginn an.

| Stufe | Max. Schiffe | Klassen | Max. Upgrade-Stufe | Kosten (Annahme) |
|---|---|---|---|---|
| 1 | 3 | S | 1 | - |
| 2 | 6 | + M | 2 | 20 k |
| 3 | 12 | + L | 3 | 150 k |
| 4 | 20 | + Fraktion | 4 | 1 M |
| 5 | 35 | + XL | 5 | 6 M |
| 6 | 60 | - | 6 | 30 M |

### 7.2 Gouverneurslizenz

Beim ersten Erwerb benennt der Spieler seine eigene Fraktion (Name, Farbe).

| Stufe | Max. Besitztümer | Max. Ausbaustufe | Freischaltung | Kosten (Annahme) |
|---|---|---|---|---|
| 1 | 1 | 2 | Fabriken, Raffinerien | 250 k |
| 2 | 3 | 3 | Werften | 1,5 M |
| 3 | 6 | 4 | Planeten, Zoll | 6 M |
| 4 | 10 | 5 | große Werften | 20 M |
| 5 | 16 | 6 | (Stützpunkt, zurückgestellt) | 60 M |
| 6 | 25 | 7 | - | 150 M |

## 8. Besitz von Planeten und Stationen

### 8.1 Kauf

- Kaufbar sind alle NPC-Planeten und -Stationen. **Ausnahmen:** Hubs, Fraktionscluster und das Startsystem.
- **Preis:** Basiswert je Typ × Größe × Ausbaustufe. Planeten sind deutlich teurer als Stationen.
- **Kaufort:** vor Ort. Ein eigenes Schiff muss angedockt sein.

### 8.2 Besitzerwirtschaft

- **Lager:**
  - Das Lager gehört dem Besitzer.
  - Er kann kostenlos auf eigene Schiffe laden und kostenlos einlagern.
- **Geldflüsse:**
  - Kaufen Fremde, also andere Spieler oder NPC-Versorger, dort ein, bekommt der Besitzer den Erlös.
  - Verkaufen Fremde dort Waren, zahlt der Besitzer aus seinem Konto. Bei leerem Konto oder aktivem Stop-Loss nimmt der Markt nichts an.
- **Produktion** läuft automatisch weiter.
- **Fixpreis-Verbrauch:**
  - **Grundprinzip:** Der eigene Verbrauch eines Planeten, z. B. Luxusgüter für die Bevölkerung, wird aus dem Lager entnommen. Der Planet bezahlt ihn an den Besitzer.
  - **Preisspanne:** Der Besitzer setzt einen Fixpreis zwischen 30 % und 70 % des Preisfensters dieses Planeten (Position `s` im Fenster `[pmin, pmax]`).
  - **Verbrauchstempo:** Es hängt vom Preis ab. Bei vollständiger Belieferung bringt `s = 0,3` doppelt so viel Erlös wie `s = 0,7`.
  - **Formel:**
    ```
    Preis(s)       = pmin + s × (pmax − pmin)
    Erlös/h(s)     = R_ref × 2^((0,7 − s) / 0,4)
    Verbrauch/h(s) = Erlös/h(s) / Preis(s)
    ```
    `R_ref` wird je Ware und Planetengröße kalibriert.
- **Handelsmodus:** **offen** oder **privat**. Eine Whitelist gibt es nicht.
- **Zoll:**
  - Prozentaufschlag auf alle Geschäfte von Fremden, also anderen Spielern und NPC-Versorgern.
  - Freigeschaltet ab Gouverneurslizenz 3.
- **NPC-Versorger:** Bei offenem Modus beliefern sie auch Spielerbesitz, der Besitzer zahlt den Marktpreis. Bei privatem Modus fallen sie weg.
- Es gibt keine laufenden Unterhaltskosten.

### 8.3 Upgrades für Besitztümer

- Es gibt 4 Upgradelinien.
- Die maximale Stufe ergibt sich aus der Gouverneurslizenz.
- Jede Stufe kostet Geld (×1,6) **plus angelieferte Waren**.

| Linie | Wirkung je Stufe |
|---|---|
| Lager | +50 % Kapazität |
| Produktionstempo | +20 % Zyklusgeschwindigkeit |
| Ertrag | +10 % Output bei gleichem Input |
| Zusatzproduktion | +1 Rezept aus einer typgebundenen Liste |

### 8.4 Eigene Werften

- **Bau nur auf Befehl:**
  - Der Spieler wählt einen Typ, die Materialien werden aus dem Werftlager abgezogen, nach der Bauzeit ist das Schiff fertig.
  - Es kostet nur Material, kein Geld.
- **Baubare Klassen:** Die Bauliste schaltet Klassen per Upgrade frei. Eine normale Werft baut bis M, eine eigene große Werft bis XL. Fraktionsschiffe sind nie selbst baubar.
- **Fertige Schiffe** stehen zunächst im **Werftbestand**:
  - Der Besitzer übernimmt sie in seine Flotte.
  - Ist der Verkauf freigeschaltet, können andere Spieler sie zum vom Besitzer festgelegten Preis kaufen, solange sie noch im Bestand stehen. Annahme: kein zusätzlicher Zoll.
- **Recycling:** 50 % der Materialien gehen ins Werftlager.
- **Module und Upgrades** baut man an eigenen Werften zum Selbstkostenpreis ein.

## 9. NPC-Fraktionen

- Es gibt etwa **6 Archetypen** (z. B. Bergbaugilde, Tech-Konsortium, Nomadenclan, Tiefraum-Orden).
- **Identität:** eigenes Namensschema für Systeme, Planeten und Stationen, eigene Farbe, eigene Sprite-Varianten.
- **Fraktionscluster:** 2 bis 3 Systeme. Pro Sektor wird ein Archetyp gewürfelt, Archetypen können sich in mehreren Sektoren wiederholen.
- **Märkte:** normale Märkte mit thematischer Spezialisierung. Dauerhafte Nachfrage nach der seltenen Ressource, die als Schiffswährung dient.
- **Angebot:** Fraktionsschiffe für Geld plus seltene Ressource, ab Pilotenlizenz 4, sowie 60 % des Modulkatalogs.
- **Nicht im Umfang:** Ruf, Quests, Feindschaften (siehe Kapitel 12).

## 10. Oberfläche und Steuerung

### 10.1 Zoomstufen

- Der Zoom bleibt stufenlos, die Darstellung wechselt semantisch:
  - **System:** wie heute, mit Sprites und Labels.
  - **Sektor:** Systeme als Symbole mit Spezialisierungs-Icons. Hub, große Werft, Fraktionscluster, Wurmlöcher und Zonen sind hervorgehoben. Schiffe erscheinen als Marker.
  - **Galaxie:** Hex-Raster mit Fog. Wurmlochverbindungen sind sichtbar, eigene Schiffe erscheinen als Zähler-Badge je Sektor.
- **Schnellwahl** über die Tasten 1, 2 und 3.
- **Marker:**
  - Jedes Schiff hat eine frei wählbare Markerfarbe, Standard ist die Spielerfarbe.
  - Optional zeigt der Marker statt der eigenen Farbe den Zustand.
  - Fremde Schiffe erscheinen in der Farbe ihres Besitzers, NPCs grau.

### 10.2 Flottenliste

- **Zustandssymbole:**
  - ↻ auf Route
  - ➤ in Bewegung
  - ⚓ angedockt untätig
  - ⏸ untätig
  - ⛏ baut ab
  - zusätzlich ⚠ als Warnung (Tank leer, Stop-Loss, Route blockiert)
- **Klickverhalten:**
  - **Einfachklick** wählt nur aus.
  - **Doppelklick** wählt aus und lässt die Kamera folgen.
  - **Mehrfachauswahl** per Ctrl/Shift+Klick, für Gruppenbefehle.
- **Umbenennen:** maximal 24 Zeichen, eindeutig je Spieler.
- **Ordnen:** Drag & Drop und einklappbare **Gruppen**. Die Reihenfolge wird serverseitig gespeichert.
- **Filter:** alle / untätig / auf Route / Warnung.
- **Saldo-Spalte:** Einnahmen der letzten Stunde je Schiff.

### 10.3 Schiffsstatistik

- **Kennzahlen:** Flüge (angedockte Stopps), Einnahmen, Ausgaben (Einkauf, Treibstoff, Upgrades), Saldo und zurückgelegte Strecke.
- **Zeiträume:** gesamt, 24 h und 1 h.

### 10.4 Befehlsqueue

- Jedes Schiff hat eine Queue.
- **Befehlstypen:**
  - Fliege zu
  - Andocken und Aktionen (kaufen, verkaufen, tanken, Modul ausbauen)
  - Abbauen bis voll
  - Warte N Sekunden
  - Route starten (endlos oder N Runden)
- **Bedienung:**
  - **Rechtsklick** ersetzt die Queue, **Shift+Rechtsklick** hängt einen Befehl an.
  - Im Detailpanel lassen sich Einträge löschen und umsortieren.
- **Fehlerverhalten:**
  - Eine fehlgeschlagene Aktion wird übersprungen und im Schiffslog vermerkt.
  - Nach 3 Fehlschlägen derselben Aktion in Folge erscheint ⚠.

### 10.5 Handelsrouten

- **Vorlagen:** Routen sind Vorlagen, die mehreren Schiffen zugewiesen werden. Ändert man die Vorlage, wirkt das auf alle zugewiesenen Schiffe.
- **Neue Aktionen:**
  - **"Warten bis":** Das Schiff wartet, bis ein Bestand oder Preis erreicht ist, mit Timeout.
  - **"Tanken".**
- **Routenübersicht** (Taste R):
  - **Je Route:** Name, Schiffe mit Zustand, Saldo für 1 h und 24 h, Fehlerstatus.
  - **Aufgeklappt** zeigt sie die Stopps mit ihren Aktionen, je gehandelter Ware eine Preis-Sparkline der letzten 3 h mit eingezeichnetem Limit und einen Füllstandsbalken.
  - **Aktionen:** bearbeiten, Schiff zuweisen oder entfernen, pausieren, löschen.

### 10.6 Stop-Loss

- **Global:** Ein Schwellenwert in Credits. Fällt der Kontostand darunter, finden keine automatischen Einkäufe aus Routen mehr statt.
  - Er gilt auch für Einkäufe der eigenen Stationen von Fremdlieferanten.
  - Verkäufe, Tanken, manuelle Käufe und der Fixpreis-Verbrauch laufen weiter.
- **Je Route:** optional ein eigener Mindestkontostand.
- **Anzeige:** Hinweis in der Topbar und ⚠ auf den betroffenen Schiffen.

### 10.7 Favoriten

- **Markieren:** per Stern im Detailpanel. Die Liste öffnet sich mit Taste F.
- **Je Eintrag:** Name, System, Sektor, Typ, Besitzer, Flugzeit vom gewählten Schiff, kompakte Preiszeile und eine eigene Notiz.
- **Aktionen** für die ausgewählten Schiffe:
  - Anfliegen (mit Shift angehängt)
  - Einkaufen (reiht "Fliege hin + kaufe" in die Queue ein)
  - Route erstellen
  - Zu bestehender Route hinzufügen
- **Sortierung und Filter:** nach Sektor und Ware.

### 10.8 Almanach

Der Almanach öffnet sich mit Taste A. Alles darin wird erst nach Entdeckung sichtbar, Unentdecktes erscheint als "???".

- **Rezepte:**
  - Je Ware: Stufe, Frachtklasse, Abbauklasse, welche Station oder welcher Planetentyp sie produziert und wo sie Input ist.
  - Dazu ein Ketten-Graph mit Vor- und Nachstufen. Konkrete Planetennamen erscheinen nicht.
  - **Entdeckt** ist ein Rezept, sobald ein Markt mit diesem Rezept in Sensorreichweite war (Annahme).
- **Schiffe:**
  - Je Typ: Klasse, Werte, zuletzt gesehener Preis, Produktionsmaterialien, Lizenzstufe und Bezugsort.
  - Sichtbar sind gesehene oder gekaufte Typen.
- **Module:** gleiches Prinzip wie bei den Schiffen.

## 11. Technik

- **Persistenz:**
  - SQLite (`better-sqlite3`) mit Tabellen für Sektoren, Märkte, Schiffe, Spieler, Routenvorlagen, Favoriten, Entdeckungen und Besitz.
  - Gespeichert wird nur, was sich geändert hat (Dirty-Tracking).
  - Statistiken liegen in eigenen Ringpuffer-Tabellen.
  - Eine Migrations-Infrastruktur ersetzt die heutige Logik "Version passt nicht, also neue Welt".
- **Netzwerk:**
  - **Märkte:**
    - Der Client abonniert die Systeme, die gerade auf dem Bildschirm sind.
    - Zusätzlich abonniert er alles, was offene Dialoge brauchen (Detailpanel, Routenübersicht, Favoriten, Routeneditor).
    - Übertragen werden nur abonnierte Märkte, als Delta.
  - **Schiffe:** Schiffsdaten werden ebenfalls nach Sichtbereich gefiltert.
- **Server-Struktur:**
  - Der Switch in `Game.command` wird in Handler-Module aufgeteilt, mit Validierung der Eingaben.
  - Für Märkte gibt es ein Rollen- und Strategie-Modell statt Verzweigungen nach `kind`/`type`.
- **Tests:**
  - Unit-Tests für die Preisformel, den Standort-Modifier, den Fixpreis-Verbrauch, Kombo-Kapazitäten, Navigation über Wurmlöcher und die Sektorgenerierung (deterministisch je Seed).
  - Eine Headless-Simulation mit Bots dient der Kalibrierung.

## 12. Nicht im Umfang

| Thema | Status |
|---|---|
| Chat | gestrichen |
| Authentifizierung, Passwörter | vorerst nicht, nur Freundeskreis |
| Stützpunkt | zurückgestellt. Späterer Rahmen: Titel für genau ein Besitztum, +1 Upgradestufe über dem Lizenzlimit, mehrere Rezepte gleichzeitig, Heimathafen |
| Fraktionsruf, Quests, Events | später |
| Feindschaften, Kampf | nicht geplant |
| Unterhaltskosten für Besitz | vorerst nicht |
| Whitelist im Handelsmodus | nicht geplant |
| Automatisches Ausweichen um Sondergebiete | nicht geplant |

## 13. Risiken

- **Keine Authentifizierung:**
  - Wer einen Namen kennt, kann das Konto samt Besitz und Millionen-Credits übernehmen.
  - Das ist nur im Freundeskreis tragbar.
  - Bevor der Server öffentlich erreichbar wird, sind zwingend Authentifizierung und HTTPS nötig.
- **Balancing:**
  - Besitz (kostenloser Lagerzugriff, Fixpreis-Verbrauch) und Fraktionsschiffe können den freien Handel entwerten.
  - Gegenmittel: Kalibrierung per Simulation (Phase 7) und Zielwerte aus 5.5.
- **Umfang:** Mehrere Monate Hobbyentwicklung. Jede Phase muss für sich spielbar sein.
- **Rendering:** Sektor- und Galaxie-Zoom mit vielen Objekten braucht Level-of-Detail im Canvas-Renderer.

## 14. Phasenplan

Jede Phase ist für sich spielbar. Ein Weltreset ist in jeder Phase erlaubt.

| Phase | Inhalt |
|---|---|
| 0 Fundament | SQLite und Migrationen, Subscription- und Delta-Netzwerk, Aufteilung in Command-Handler, erste Tests |
| 1 Komfort | Flottenliste (Symbole, Klick/Doppelklick, Umbenennen, Gruppen, Filter, Mehrfachauswahl), Schiffsstatistik, Befehlsqueue, Routenvorlagen, Routenübersicht, Stop-Loss, Favoriten |
| 2 Neue Welt | Hex-Sektoren, Systeme, Spezialisierung, Hub, große Werft, Startsystem mit Langsam-Modifier, Wurmlöcher und Navigation, Sondergebiete, Zoomstufen und Marker |
| 3 Wirtschaft | ca. 60 Waren und tiefe Ketten, Händlerrolle, Standort-Modifier, Entfernungsprämie, Eigenverbrauch, ultraseltene Waren, Treibstoff und Brennstoff, Almanach Rezepte |
| 4 Schiffe und Spieler | 16 Schiffstypen, Stufen-Upgrades, Module, Pilotenlizenz, Schiffsverkauf, Almanach Schiffe und Module |
| 5 Fraktionen | Fraktionscluster, Archetypen, Fraktionsschiffe, Modulverkauf |
| 6 Besitz | Gouverneurslizenz, Kauf von Planeten und Stationen, Upgrades, Fixpreis-Verbrauch, Zoll, offen/privat, eigene Werften, Schiffsverkauf zwischen Spielern, Recycling |
| 7 Balancing | Simulationsskript mit Headless-Bots, begleitend ab Phase 3 |

## 15. Offene Punkte und Annahmen

1. **Annahmen zur Kalibrierung:**
   - Langsam-Modifier des Startsystems mit 25 %
   - alle Preise, Lizenzkosten und Kapazitäten
   - `R_ref` beim Fixpreis-Verbrauch
   - Abbauraten der Module
2. **Annahmen zu Regeln:**
   - Kein Eigenverbrauch über 80 % bei Spielerbesitz.
   - Beim Modulausbau gibt es 50 % Erstattung.
   - Beim Schiffsverkauf aus Spielerwerften fällt kein zusätzlicher Zoll an.
   - Ein Rezept gilt als entdeckt, sobald ein Markt mit diesem Rezept in Sensorreichweite war.
3. **Ausarbeitungen:**
   - Der vollständige Warenkatalog (ca. 60) mit Rezepttabelle und Frachtklassen ist ein eigenes Arbeitspaket vor Phase 3.
   - Ebenso die konkreten Werte der 16 Schiffstypen und Fraktionsschiffe, vor Phase 4.
   - Ebenso die Namensschemata und visuellen Varianten der 6 Fraktionsarchetypen, vor Phase 5.
4. **Rundungsfragen:** Wie Sektorgrenzen, Fog-Zellen (heute 500er) und die 30.000er-Vorlaufdistanz zusammenspielen, wird in Phase 2 geklärt.
