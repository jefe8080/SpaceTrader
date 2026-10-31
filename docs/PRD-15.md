# PRD 15: Flottenstacks, Weltraumschlachten und Fraktionskrieg

## Ziel und Planungsstand

Spieler organisieren gemeinsam reisende Flottenstacks, verteidigen Handel und
Planeten und kämpfen auf einer eigenständigen taktischen Karte. Ein modulares
Schadensmodell macht Positionierung, Waffenrollen, Systemausfälle und Rückzug
relevant. Die sechs NPC-Fraktionen erhalten eine sektorale Wirtschaft,
Versorgungstransporte, militärische Flotten und nachvollziehbare Diplomatie.

Das Gesamtpaket wurde am 31.10.2026 mit dem Skill `grilling` in Q1–Q81
abgestimmt. Q81 bestätigt das gemeinsame Verständnis und die Erstellung dieses
PRD. Grundlage ist `SpaceTraderV15.txt`; die hier dokumentierten Entscheidungen
ersetzen abweichende Stellen dieser Vorlage. Nachträglich bestätigt wurde die
verbindliche Orientierung aller neuen Grafiken am bisherigen
Fantasy-Comic-Sci-Fi-Stil.

Dieser Auftrag umfasst ausschließlich Planung, PRD und dessen Commit.
Implementierung ist nicht beauftragt. PRD 14 wird unabhängig durch einen
Kollegen bearbeitet und ist nach Nutzerangabe eine andere Baustelle.

### Ausgangslage

- Bestehende Flottengruppen dienen Organisation und Auswahl, nicht gemeinsamer
  physischer Bewegung. Handelsrouten und Befehlsqueues laufen pro Schiff.
- Schiffstypen besitzen bislang insbesondere Wirtschafts- und Navigationswerte;
  Schlachtinstanzen, Kampfwerte, Systemschaden und Raids sind neu aufzubauen.
- Sechs Fraktionen, Fraktionswerften, Ruf, Quests, Konsortien und 18 illustrierte
  Fraktionsschiffe existieren. Sektorale Militärwirtschaft und Diplomatie fehlen.
- Leitstellenstufe 2 deckt erstmals den eigenen Sektor ab. Ein eigener
  Ruinenplanet ist nach bestätigter Spielvoraussetzung immer vorhanden.

### Verbindliche Abgrenzungen

- Das PRD umfasst die gesamte abgestimmte Vorlage und wird in Lieferpaketen
  umgesetzt; es ist kein reines Stack- oder Kampf-MVP.
- Keine Träger und keine Hangars: weder bauen noch in diesem PRD vorplanen.
  Jäger- und Bomberstaffeln sind eigenständige Schiffe.
- Kein frei konfigurierbarer Schiffseditor, keine regulären Dreiparteienschlachten,
  keine Planetenübernahme durch Raids und keine handelbare/herstellbare Munition.
- Konkrete Balancewerte werden in U02/U03/U09/U10 als vollständige zentrale
  Wertetabellen erarbeitet. Bereits bestätigte Zahlen dieses PRD sind verbindlich.
- Alle neuen Grafiken, insbesondere Schiffsbilder, taktische Elemente, Symbole,
  Waffen-, Schild- und Schadenseffekte, orientieren sich verbindlich am bisherigen
  Fantasy-Comic-Sci-Fi-Stil. Vorhandene freigegebene Fraktionsschiffbilder bleiben
  erhalten; Form, Farben, Silhouette und Perspektive werden nicht neu entworfen.

## 1. Spielzeit, Autorität und Speicherung

1. Reisen, Schlachten, KI-Verhalten, automatische Verteidigung und Raids laufen
   bei ausgeloggten Besitzern weiter, solange der Server läuft.
2. Der Server entscheidet über Bewegung, Beitritt, Befehlsrechte, Treffer,
   Schaden, Besitzwechsel und wirtschaftliche Transaktionen. Direkte oder
   manipulierte Clientbefehle dürfen keine Regeln umgehen.
3. Stacks, Schlachten einschließlich laufender Angriffe und Rückzugsvorbereitung,
   Schäden, Gefangene, Auftragsfortsetzungen, Transporte, Geldpools, Aggression,
   Schutzfristen und Trümmer werden gespeichert und überstehen Neustarts.
4. Bei ausgeschaltetem Server verstreicht keine Simulationszeit und es wird
   keine Simulation nachgeholt. Minuten, Stunden und Fristen dieses PRD meinen
   laufende Server-Spielzeit. Das gilt auch für 24-Stunden-Schutz und Aktivität.
5. Wechsel zwischen Ansicht, KI und manueller Steuerung sowie Verbindungsabbruch
   pausieren oder initialisieren die Schlacht nicht neu. Bei Abbruch übernimmt
   die KI nahtlos mit bestehenden Zuständen.

## 2. Physische Stacks und Handelsrouten

### 2.1 Bildung und Auswahl

- Stacks enthalten ausschließlich Schiffe desselben Spielers. Jedes Schiff
  gehört höchstens einem physischen Stack an. Organisatorische Flottengruppen
  bleiben unabhängig davon bestehen.
- Ein ausgewähltes Schiff wird per Rechtsklick zu einem anderen geschickt.
  Der Stack entsteht erst beim tatsächlichen Zusammentreffen, nicht bereits
  bei Auftragserteilung. Zusammenführungen bestehender Stacks beachten dieselben
  Besitz- und Exklusivitätsregeln.
- Außerhalb von Schlachten wird ein Stack wie ein Schiff bedient. Auswahl öffnet
  daneben ein Fenster mit seinen Mitgliedern. Einzelne Mitglieder sind auswählbar;
  ein eigener Bewegungsbefehl löst das gewählte Mitglied aus dem Stack.
- Pfeile im Stackfenster ändern die Reihenfolge der Schiffe. Diese bestimmt
  insbesondere die Abarbeitung an Handelsroutenstationen.

### 2.2 Gemeinsame Bewegung

- Der Stack reist und springt gemeinsam, so schnell wie sein langsamstes Schiff.
  Reisebereitschaft, Treibstoff und Sprungfähigkeit werden je Mitglied geprüft.
- Kann ein Mitglied die Strecke nicht bewältigen, wird der gemeinsame Auftrag
  mit konkretem Grund blockiert. Kein automatisches Zurücklassen.
- Beim Anlegen erledigen alle Mitglieder ihre jeweiligen zugewiesenen Aufgaben.
  Während einer Schlacht erscheinen Stackmitglieder als einzelne taktische
  Einheiten und lassen sich einzeln oder gemeinsam befehligen.
- Einzelne Schiffe dürfen separat zurückziehen. Nach Schlachtende bilden die
  verbliebenen Mitglieder ihren ursprünglichen Stack; zurückgezogene Schiffe
  bleiben getrennt. Zerstörung und Besitzwechsel entfernen Mitglieder eindeutig.

### 2.3 Handelsrouten

- Der Routeneditor erlaubt je Schiff eine Stacknummer von 1 bis 9 oder keine
  Nummer. Gleiche Nummern bilden nur innerhalb derselben Route einen Stack.
- Routenstacks setzen eine gemeinsame Haltestellenfolge voraus. Die individuellen
  Handelsaufgaben werden je Halt in der eingestellten Schiffsreihenfolge
  abgearbeitet. Erst danach fährt der gesamte Stack weiter.
- Ohne Nummer bleibt das Schiff eigenständig. Gleiche Nummern unterschiedlicher
  Routen führen nicht zur Zusammenlegung.
- Zusammenflug, Unterbrechung, fehlende Reisebereitschaft und Reparaturpausen
  müssen sichtbar sein. Die Fortsetzung darf weder Halte überspringen noch
  abgeschlossene Transaktionen nochmals ausführen.

## 3. Schiffsklassen, Baupläne und Ausrüstung

### 3.1 Drei Klassen

| Klasse | Aufgaben und Kampfverhalten |
|---|---|
| Zivil | Frachter, Bergbau und Arbeit; fliehen oder kapitulieren, kämpfen nicht |
| Mehrzweck | Handel/Arbeit und Selbstverteidigung; kein automatisches Abfangen |
| Krieg | Aktiver Angriff, Bewachen, Abfangen; nur kleine Versorgungs-/Beuteladeräume |

- Spatz und Pelikan werden Mehrzweckschiffe. Zwei weitere frei verfügbare
  Mehrzweckmodelle entstehen: schneller bewaffneter Kurier und robuster
  bewaffneter Frachter. Sie tauschen merkliche Frachtleistung gegen Kampfkraft.
- Die militärische Grundreihe umfasst Abfangjägerstaffel, Bomberstaffel,
  Korvette, Fregatte, Zerstörer und Kreuzer. Ihre Rollen sind Staffelabwehr,
  Systemangriff, Eskorte, vielseitiger Kampf, schwerer Angriff und ausdauernder
  Flottenkampf.
- Alle bisherigen Typen werden mit konsistenten Klassenzuordnungen und
  Kampfdefinitionen überarbeitet. Die bestehende zivile Typenzahl reicht aus.
  Schnelle zivile Modelle werden schneller und müssen ohne schnelle Abfangjäger
  oder geeignete schnelle Eskorte schwer einzuholen sein.
- Jede Waffen-, System-, Panzerungs- und Hardpointausstattung ist fest im Bauplan
  definiert. Bestehende Module und Tempo-/Tank-/Frachtverbesserungen werden auf
  Wechselwirkungen geprüft, nicht ungeprüft auf neue Kampfwerte angewandt.

### 3.2 Fraktionsschiffe

Alle 18 bestehenden Fraktionsmodelle behalten Namen und freigegebene Bilder.
Werte, Klassen und Fähigkeiten werden von Grund auf neu gestaltet. Alle werden
Mehrzweck- oder Kriegsschiffe, mit eigener Rolle und besonderer Fähigkeit je
Modell. Alte Spezialfähigkeiten dürfen ersetzt werden.

| Fraktion | Bestehende Modelle | Verbindliches militärisches Profil |
|---|---|---|
| Bergbaugilde | Gildenhauer, Tiefenbrecher, Erzbrecher | Robuste Mehrzweckschiffe, präzise Systemzerstörung; langsam und schlecht im Verfolgen |
| Tech-Konsortium | Datenpfeil, Netzkreuzer, Quantensegler | Sensorik, Ionenstörung, Schildtechnik; schwacher Rumpf und hohe Kosten |
| Nomadenclan | Wanderzelt, Sippenschiff, Karawane | Geschwindigkeit, Flankenangriff, Rückzug; wenig Panzerung und geringe Beschussausdauer |
| Tiefraum-Orden | Novize, Kathedrale, Sternenläufer | Konzentrierte Strahlenwaffen, starke Front; begrenzte Feuerwinkel und schwache Flanken |
| Handelsliga | Kontorkogge, Großkogge, Hansekogge | Bewaffnete Frachter, Punktverteidigung, Verbandsschutz; schwächere Offensive |
| Schwerindustrie-Syndikat | Stahlträger, Schmiedeberg, Stahlkoloss | Schwere Panzerung, Torpedos, Belagerung; träge und auf Staffelabwehr angewiesen |

Fraktionsmodelle sollen gegenüber normalen Gegenstücken spürbar, aber moderat
mächtiger sein. Preis und Freischaltung berücksichtigen den Vorteil. Besondere
Mechaniken besitzen spürbare Nachteile; keine vollständigen Immunitäten und
keine Umgehung des gemeinsamen Schadensmodells. Unterschiedliche Flotten
vergleichbarer Kosten müssen sinnvolle Gegenstrategien ermöglichen.

### 3.3 Schutzmodul

- Ein neues einbaubares Modul macht ausschließlich seinen Träger unangreifbar,
  verhindert dessen Gefangennahme und deaktiviert jede Bewaffnung.
- Es halbiert die reguläre Frachtkapazität und setzt die Geschwindigkeit auf
  70 % des sonst gültigen Werts. Normaler Ausrüstungsplatz beziehungsweise
  bestehender Modulbedarf kommt zusätzlich hinzu (derzeit 30 Frachteinheiten).
- Ein- und Ausbau erfolgen ausschließlich an einer Werft außerhalb von Reise
  und Schlacht. Der Einbau scheitert, wenn die Ladung danach nicht hineinpasst.
- Geschützte Mitglieder liefern keinen Geleitschutz, kämpfen nicht und dürfen
  weder plündern noch Raid-Frachtkapazität bereitstellen. Normales Handeln und
  Reisen bleiben möglich. Der Planet des Besitzers wird dadurch nicht geschützt.
- Ungeschützte Stackmitglieder bleiben angreifbar. Ein vollständig geschützter
  Stack eröffnet keine Schlacht; für vollständigen Schutz benötigt jedes
  Mitglied sein eigenes Modul.

## 4. Begegnung, Unterstützung und Schlachtinstanzen

### 4.1 Angriff und Beitritt

- Spieler greifen feindliche Ziele mit einem ausdrücklichen Angriffsbefehl an.
  Normale Flugbefehle sind keine Angriffsbefehle. NPC-Angriffe folgen ihren
  Aggressions-, Raid- und Grenzverteidigungsregeln.
- Eigene Einheiten und Mitglieder desselben Konsortiums sind nicht angreifbar.
  Die direkte Attacke auf die eigene befreundete NPC-Fraktion ist gesperrt;
  die bestätigte Konsortiumsverteidigung bleibt eine Ausnahme.
- Eine Schlacht beginnt, wenn ein Angreifer das Ziel auf Waffenreichweite
  erreicht. Vorher kann ein schnelleres ziviles Ziel entkommen.
- Beteiligte Einheiten pausieren ihre strategische Reise und erscheinen als
  Schlachtsymbol an der Begegnungsposition. Stacks kämpfen immer gemeinsam;
  das Schutzmodul bleibt eine Ausnahme vom aktiven Mitkämpfen.
- Eine Schlacht hat genau zwei gegnerische Seiten. Verstärkung muss real zum
  Symbol fliegen und tritt am Kartenrand ihrer Anflugrichtung bei. Sie darf nur
  einer kompatiblen Seite beitreten; keine eigenständige dritte Partei.
- Zurückgezogene Einheiten dürfen derselben Schlacht nicht erneut beitreten.

### 4.2 Bewachen und Abfangen

- Nur Kriegsschiffe und Stacks mit Kriegsschiffen lösen Unterstützung aus.
  Zivil- und Mehrzweckschiffe unterstützen nicht eigenständig, nehmen aber
  gemäß ihren Klassenregeln am Kampf ihres Stacks teil.
- Der lokale Unterstützungsradius beträgt ein Viertel des Sonnensystemdurchmessers.
  „Bewachen“ sichert die aktuelle Position oder ein gewähltes Schutzobjekt und
  unterstützt ausschließlich innerhalb dieses Radius. Anschließend Rückkehr.
- Standard ist „Abfangen“: Bei einem Angriff auf eigene oder militärisch
  verbündete Schiffe, Stacks oder Planeten darf bis zu einer Entfernung von
  einer halben Sektorweite zur Hilfe geflogen werden. Ankunft muss rechtzeitig
  erfolgen; keine sofortige Übertragung in die Schlacht.
- Abfangen unterbricht Reise-/Handelsaufträge und setzt sie anschließend fort.
  Ein laufender Kampfeinsatz wird nicht für weitere Hilferufe abgebrochen.
  Bei mehreren Hilferufen hat das nächste erreichbare Ziel Vorrang.
- Reparaturfahrt und Reparatur nehmen keine neuen Hilferufe an. Bei eigenem
  Angriff verteidigt sich der Stack; anschließend gilt wieder sein Reparaturziel.

### 4.3 Taktische Karte und Steuerung

- Die eigenständige taktische 2D-Karte läuft unabhängig von Zuschauern weiter.
  Schiffe besitzen Orientierung, Bug, Heck, Backbord und Steuerbord. Höhe ist
  ausschließlich Darstellung und beeinflusst Treffer/Erreichbarkeit nicht.
- Doppelklick auf ein sichtbares Schlachtsymbol öffnet die Ansicht. Jeder darf
  zuschauen, ausschließlich beteiligte Besitzer dürfen eigene Einheiten lenken.
  Auch Konsortiumsmitglieder erhalten keine Steuerung fremder Schiffe.
- Zuschauer sehen sichtbare Kampfhandlungen, aber keine zusätzlichen verdeckten
  Systeme, Rückzugsregeln oder gespeicherten Befehle. Zuschauen gewährt keiner
  Seite Aufklärung. Es gibt kein globales Verzeichnis aller Schlachten.
- Auswahl funktioniert für einzelne Schiffe, Staffeln und mehrere Einheiten.
  Waffen feuern automatisch; kein manuelles Zielen einzelner Geschütztürme.
  Pro Schiff ist der Wechsel zwischen manuellen Aufträgen und KI möglich.
- Kartenfläche und -rand begrenzen die Einheiten. Herausfliegen ersetzt nicht
  den regulären Rückzug.

## 5. Modulares Schadensmodell

### 5.1 Ebenen und Systeme

Ein Schiff besitzt Schilde, Panzerung, gemeinsame Rumpf-Lebenspunkte und
separate Schiffssysteme mit eigenen Lebenspunkten und festen Positionen.
Bug, Heck, Backbord und Steuerbord haben eigene Panzerungswerte und sichtbare
Schadenszustände, aber keine zusätzlichen Rumpf-Lebenspunkte.

| Treffbares System | Ausfallwirkung |
|---|---|
| Hauptantriebsgruppe | Ihr Anteil an Beschleunigung/Höchstgeschwindigkeit entfällt |
| Manövrieranlage | Ihr Anteil an Drehen und Bremsen entfällt |
| Schildgenerator | Zugeordnete Schildsektoren brechen zusammen |
| Leichte/schwere Waffenbatterie | Zugeordnete Waffen fallen aus |
| Ionenbatterie | Zugeordnete Ionenwaffen fallen aus |
| Raketen-/Torpedowerfer | Werfer fällt aus; seine übrige Munition ist nicht nutzbar |
| Punktverteidigung | Zugeordneter Abwehrbereich verliert Schutz |
| Sensoranlage | Erfassung und Zielverfolgung sinken |
| Brücke/Feuerleitung | Koordination und zugeordnete Fähigkeiten sinken; Spieler behält Befehlsgewalt |
| Reaktor | Zugeordnete Energieverbraucher verlieren Leistung/fallen aus |
| Sprungantrieb | Individueller Sprungrückzug ist nicht möglich |
| Bergbau-/Arbeitsanlage | Zugeordnete zivile Funktion fällt aus |

Ein System kann mehrere sichtbare Bauteile umfassen. Ausstattung und Anzahl
bestimmt der Bauplan; nicht jeder Typ benötigt jedes System.

| Schiffstyp | Richtwert anwählbarer Systeme |
|---|---|
| Jäger-/Bomberfluggeräte | Keine |
| Kleine Zivilschiffe | 2–3 |
| Mittlere Frachter/Korvetten | 3–5 |
| Fregatten/große Frachter | 5–8 |
| Große Kriegsschiffe | 8–12 |

Als Referenz für zwölf Systeme dienen zwei Hauptantriebsgruppen, eine
Manövrieranlage, zwei Generatoren für je zwei Schildsektoren, vier
Waffenbatterien, Sensorik, Brücke/Feuerleitung und Sprungantrieb. Andere
Baupläne dürfen beispielsweise ein Reaktorsystem vorsehen, niemals Hangars.
Frachträume, Tanks und Munitionslager werden keine zusätzlichen Einzelziele;
keine automatischen Munitionsdetonationen oder Kettenreaktionen.

### 5.2 Systemzustände

| Zustand | System-Lebenspunkte | Wirkung |
|---|---|---|
| Intakt | Über 50 % | Volle Funktion |
| Beschädigt | Über 25 % bis einschließlich 50 % | Eingeschränkt |
| Kritisch | Über 0 % bis einschließlich 25 % | Stark eingeschränkt |
| Zerstört | 0 % | Keine Funktion |
| Gestört | Zeitlich begrenzter Zusatzzustand | Vorübergehender Ausfall durch Ionen |

Auswirkungen sind pro System festzulegen: Waffen verlieren Feuerrate und
Zielverfolgung, Antriebe Schub, Manövrieranlagen Dreh-/Bremsleistung,
Generatoren Regeneration, Sensoren Reichweite/Zielverfolgung, Feuerleitung
Genauigkeits-/Koordinationsboni, Sprungantriebe Vorbereitungsgeschwindigkeit
und Reaktoren Leistung ihrer Verbraucher. Normale Regeneration und Schlachtende
stellen zerstörte Systeme nicht wieder her.

### 5.3 Schilde und Panzerung

- Kleine Schiffe können einen Rundumschild, größere vier Sektoren besitzen.
  Jeder Sektor definiert aktuelle/maximale Punkte, Regeneration,
  Regenerationsverzögerung nach Treffern und den zuständigen Generator.
- Der tatsächliche Anflugwinkel bestimmt den getroffenen Sektor. Dieser schützt
  auch gezielt beschossene Systeme, außer bei ausdrücklich definierter
  Schilddurchdringung. Drehen kann einen noch intakten Sektor zuwenden.
- Leer geschossene Schilde regenerieren bei funktionsfähigem Generator ohne
  Verbrauchsgüter. Generatorzerstörung deaktiviert seine Sektoren sofort bis zur
  Reparatur, auch wenn dort vorher noch Schildpunkte vorhanden waren.
- Rumpfzonen und Systeme besitzen getrennte Panzerungseigenschaften ohne eigene
  Lebenspunkte oder Abtragung. Schadenstyp, Panzerungsklasse und Durchschlag
  bestimmen die Reduktion. Schwere Panzerung schwächt leichte Waffen deutlich,
  erzeugt aber keine pauschale vollständige Unwirksamkeit gewöhnlicher Waffen.

### 5.4 Aufklärung und Zielerreichbarkeit

- Erfasste Schiffe zeigen zunächst Typ, Schilde und Rumpf. Einzelne Systeme
  werden innerhalb der Sensorreichweite identifiziert. Bekannte Positionen
  bleiben der Schlachtseite bekannt; Zustände aktualisieren sich nur bei Kontakt.
- Spieler und KI erhalten dieselben Informationen und kennen keine verdeckten
  Systeme automatisch.
- Ein Angriff auf das ganze Schiff priorisiert Rumpfschaden. Ein Systemangriff
  erfordert erfasstes Schiff, bekannte Systemposition, Reichweite, Feuerwinkel
  und einen nicht durch den Schiffskörper verdeckten Angriffsweg.
- Keine gezielten Schüsse durch den gesamten Rumpf auf die gegenüberliegende
  Seite. Lenkwaffen dürfen verdeckte Systeme nur mit ausdrücklich geeignetem
  Anflug angreifen.
- Bei unerreichbarem System versucht der Angreifer eine geeignete Position
  einzunehmen, fliegt ohne entsprechende Ausweichfreigabe aber nicht unbegrenzt
  in gegnerische Verbände.

### 5.5 Verbindlicher Schadensablauf

1. Ziel, Reichweite und Feuerwinkel prüfen.
2. Treffer/Verfehlen aus Genauigkeit, Zielgröße, Bewegung und Störung ermitteln.
3. Bei Lenkwaffen Abwehr oder Zielverlust behandeln.
4. Getroffenen Schildsektor aus tatsächlichem Anflug bestimmen.
5. Schildwirkung und ausdrücklich definierte Durchdringung berechnen.
6. Verbleibenden Schaden an der passenden Panzerung reduzieren.
7. Schaden eindeutig auf Rumpf und gegebenenfalls Zielsystem verteilen.
8. Ausfälle, Störungen und Zerstörung auslösen.

Schildüberschuss wird in derselben Schadensart weitergereicht. Jede Waffe
definiert für Systemtreffer einen Strukturanteil. Nach Schild und Panzerung
werden System- und Rumpfanteil aus demselben verfügbaren Schaden gebildet;
ihre Summe darf diesen nicht überschreiten. Bei 100 Schaden und 30 %
Strukturanteil gehen 70 ans System und 30 an den Rumpf. Überschüssiger
Systemschaden geht nach dessen Zerstörung auf den Rumpf über.

Direkte Rumpftreffer beschädigen keine zufälligen Systeme. Flächenwirkung ist
eine ausdrückliche Ausnahme. Ist ein Zielsystem vor Einschlag bereits zerstört,
treffen fliegende Geschosse seine Position als Rumpftreffer; neue Schüsse wählen
ein anderes gültiges Ziel. Kapitulierende Schiffe sind hiervon ausgenommen und
dürfen auch durch bereits fliegende Geschosse keinen weiteren Schaden erleiden.

### 5.6 Waffenrollen und Sonderwirkungen

| Waffenart | Rolle und Einschränkung |
|---|---|
| Leichter Laser | Hohe Zielverfolgung gegen kleine Ziele; schwach gegen schwere Panzerung |
| Schwere Energiewaffe | Hoher Schaden gegen große Ziele; begrenzte Zielverfolgung |
| Ionenwaffe | Starke Schildwirkung und Systemstörung; wenig Strukturzerstörung |
| Rakete | Gelenkt gegen bewegliche Ziele; begrenzte Munition, abfangbar |
| Torpedo | Schwerer Schiffs-/Systemschaden; langsam/weniger wendig, abfangbar |
| Strahlenwaffe | Konzentrierte Wirkung bei gehaltenem Feuerkontakt |
| Flak | Flächenwirkung gegen kleine Ziele; schwach gegen schwere Schiffe |
| Punktverteidigung | Lenkwaffenabwehr; begrenzte Reichweite, Winkel und Kapazität |

- Jede Waffe definiert Reichweite, Mindestreichweite, Feuerrate, Feuerwinkel,
  Zielverfolgung, Geschossgeschwindigkeit, Schadenstyp, Strukturanteil und
  gegebenenfalls Munition. Schwere Waffen treffen Staffeln schlecht, aber diese
  sind ihnen gegenüber nicht pauschal unverwundbar.
- Raketen/Torpedos besitzen begrenzte Vorräte. Auffüllen kostet ausschließlich
  Geld an zugänglichen Werften oder reparaturfähigen eigenen Ruinenplaneten.
  Munition ist kein herstellbares oder handelbares Gut. Energiewaffen benötigen
  keine Verbrauchsgüter.
- Schilddurchdringung ist pro Waffentyp explizit: abgeschirmter und umgehender
  Anteil werden getrennt behandelt. Der umgehende Anteil trifft trotz Schild
  auf die passende Panzerung. Nicht alle Lenkwaffen durchdringen Schilde.
- Aktive Schilde verhindern Ionenstörung aus dem abgeschirmten Anteil.
  Ungeschützte Systeme sammeln Belastung bis zur Störschwelle; ohne Treffer
  klingt sie ab. Verlängerungen haben eine feste Höchstdauer. Störung zerstört
  nicht und endet auch bei beschädigten Systemen regulär.
- Flächenwaffen definieren Radius und Entfernungsabfall. Je Explosion wird jedes
  betroffene System höchstens einmal und der gemeinsame Rumpf je Schiff nur
  einmal getroffen; mehrere benachbarte Hardpoints dürfen Schaden erhalten.
- Geeignete Angriffe/kritische Treffer können begrenzte Brände mit begrenztem
  zusätzlichem Rumpfschaden auslösen. Keine unkontrollierten Kettenreaktionen.

## 6. Bewegung, KI, Staffeln und Schlachtende

### 6.1 Bewegung und Rückzug

- Beschleunigung, Bremsleistung und Drehgeschwindigkeit sind eigenständige Werte.
  Orientierung bestimmt Feuerwinkel, Schildsektor, erreichbare Systeme und
  Rückzugsmanöver. Batterien schießen nicht durch den eigenen Rumpf.
- Ausfall einzelner Hauptantriebsgruppen reduziert ihren Bauplananteil.
  Ohne Hauptantrieb keine Beschleunigung; intakte Manövrieranlagen ermöglichen
  weiter Drehen und Bremsen. Ohne beide Antriebsarten verliert das Schiff
  seine Restbewegung langsam und bleibt liegen; keine gezielten Bewegungsbefehle.
- Rückzug erfordert funktionsfähigen Haupt- und Sprungantrieb, Erreichen eines
  zulässigen Bereichs am Kartenrand, abgeschlossene Sprungvorbereitung und keine
  aktive Sprungsperre. Beschuss allein unterbricht die Vorbereitung nicht.
- Sprungsperren stammen ausschließlich von ausdrücklich ausgerüsteten Schiffen
  und wirken in einem sichtbaren begrenzten Radius, nicht pauschal kartenweit.
- Erfolgreicher Rückzug platziert das Schiff sicher außerhalb der Schlacht im
  Herkunftssystem, ohne kostenlose Reise in ein anderes System.

### 6.2 Befehle und KI

Verfügbar sind Position anfliegen/Formation halten, Ziel oder System angreifen,
Waffen/Antrieb/Schilde priorisieren, eskortieren, Position verteidigen, Abstand
halten, Feuer einstellen sowie einzelner oder gemeinsamer Rückzug.

Strategische Haltung (Bewachen/Abfangen), taktische Grundhaltung und
Rückzugspolitik sind getrennt speicherbar. Taktische Haltungen umfassen
offensiv, defensiv und Eskortschutz. Rückzugsregeln können Rumpfzustand,
Flottenverluste und wesentliche Systemausfälle berücksichtigen.

- Neue militärische Einheiten: Abfangen, taktisch defensiv; Rückzugsversuch bei
  weniger als 25 % Rumpf oder vollständigem Waffenausfall.
- Zivile Schiffe: sofortiger Fluchtversuch vor dem Stellen. Ohne kampffähigen
  Geleitschutz kapitulieren sie beim Schlachtbeginn; mit Geleitschutz dürfen sie
  den regulären Rückzug versuchen. Fällt der letzte kampffähige Beschützer aus,
  kapitulieren verbliebene zivile Schiffe.
- Mehrzweckschiffe: defensive Gegenwehr, Rückzugsversuch unter 40 % Rumpf,
  automatische Kapitulation unter 30 %, auch bei verbleibendem Geleitschutz.

### 6.3 Eigenständige Staffeln

Staffeln reisen eigenständig und zählen strategisch als ein Schiff. Taktisch
bestehen sie aus einzeln zerstörbaren Fluggeräten; Verluste reduzieren Stärke
und Kampfkraft. Fluggeräte besitzen Rumpf und gegebenenfalls Schild, keine
einzeln anwählbaren Systeme. Bomber dürfen freigelegte Systeme angreifen,
Jäger bekämpfen Staffeln und schützen Bomber. Ersatz verlorener Fluggeräte
kostet Geld und wird nicht automatisch kostenlos nach Gefechten gewährt.

### 6.4 Kapitulation, Sieg und Unentschieden

- Kapitulierende Schiffe scheiden sofort aus: unangreifbar, keine Waffen,
  Aufklärung, Eskorte oder Rückzug. Bereits fliegende Geschosse richten an
  ihnen keinen Schaden an.
- Die Schlacht endet, sobald eine Seite keine weiterkämpfenden Einheiten mehr
  besitzt, weil diese zerstört, geflohen oder kapituliert sind.
- Nach 120 Sekunden ohne mögliche Schadenswirkung, ohne laufende Angriffe und
  ohne zulaufende Verstärkung endet eine festgefahrene Schlacht unentschieden.
- Kapitulierte Schiffe werden ausschließlich bei Niederlage ihrer Seite
  Gefangene. Bei Sieg oder Unentschieden werden sie wieder steuerbar und bleiben
  beim Besitzer. Mehrzweckschiffe unter 30 % müssen vor erneutem Kampfeinsatz
  repariert werden.
- Bewegungsunfähige überlebende Kriegsschiffe gehen bei Niederlage unmittelbar
  an den Sieger. Bei Unentschieden behält jede Seite ihre Schiffe.

## 7. Verluste, Gefangene und Trümmer

- Bei null Rumpf wird ein Schiff zerstört und verliert sofort alle Funktionen.
  Eine Explosion verursacht nur mit ausdrücklicher Bauplaneigenschaft Schaden.
  Entwaffnung und Bewegungsunfähigkeit allein sind keine Zerstörung.
- Kapitulierte zivile und Mehrzweckschiffe sind bei Niederlage freikaufbare
  Gefangene, nicht nutzbare Schiffe des Siegers. Ihre Ladung erhält der Sieger.
  Gefangene bleiben unbegrenzt freikaufbar; menschliche Sieger nutzen dieselbe
  feste Spieloberfläche statt frei ausgehandelter Lösegelder.
- Freikauf kostet 25 % des regulären Kaufpreises und zahlt an den Sieger.
  Preis und Zielplanet werden vor Bestätigung angezeigt. Rückgabe erfolgt ohne
  Ladung, mit verbliebenen Schäden, angedockt am vom Schlachtort aus
  nächstgelegenen eigenen Ruinenplaneten. Eigene Gefangene zählen weiter zum
  eigenen Schiffsbestand.
- Zerstörte Kriegsschiffe hinterlassen für alle Spieler abbaubare Trümmer mit
  einem Teil ihrer Baurohstoffe. Vorhandene Bergbautechnik genügt.
- Trümmer verschwinden nach **30 Minuten** laufender Spielzeit. Die frühere
  Zehn-Minuten-Vorgabe entfällt. Abgebaute Mengen sind endgültig entnommen;
  zerstörte Ladung wird nicht zusätzlich vollständig ausgeschüttet.

## 8. Reparatur und automatische Auftragsfortsetzung

### 8.1 Wiederherstellung

- Schildregeneration läuft automatisch bei funktionsfähigem Generator.
- Schadenskontrolle im Gefecht hat begrenzte Kapazität, stabilisiert Brände und
  repariert beschädigte, nicht zerstörte Systeme begrenzt. Spieler/KI setzen
  Prioritäten. Kein Wiederaufbau zerstörter Systeme und keine Rumpfreparatur.
- Eigene Ruinenplaneten mit reparierter Antriebswerkstatt und zugängliche
  Werften reparieren Rumpf und zerstörte Systeme gegen Geld und Zeit. Die
  Antriebswerkstatt erhält ausdrücklich diese zusätzliche Funktion.
- Vollreparaturen erfolgen nur angedockt, mit Kosten-/Dauervorschau.
  Schäden bleiben andernfalls nach Schlachtende bestehen.

### 8.2 Automatische Reparatur

- Jeder Stack und jedes Einzelschiff erhält eine abschaltbare, standardmäßig
  aktive Reparaturautomatik. Ein beschädigter Rumpf oder ein beschädigtes/
  zerstörtes System eines Mitglieds löst nach dem Gefecht beziehungsweise bei
  Feststellung außerhalb eines Gefechts die Reparaturfahrt des ganzen Stacks aus.
- Fehlende Schildpunkte, vorübergehende Ionenstörung und leere Munition allein
  lösen keine zusätzliche Reparaturfahrt aus. Während der Schlacht gelten
  zunächst die Rückzugsregeln.
- Ziel ist die nach tatsächlicher Flugzeit nächste erreichbare und zugängliche
  Stelle mit vollständiger Reparaturleistung. Bekannte feindliche Schutzbereiche
  werden möglichst umgangen. Der Stack bleibt zusammen.
- Die Automatik repariert alle Rumpf-/Systemschäden vollständig, ersetzt
  Staffelverluste kostenpflichtig und füllt beim Besuch Munition gegen Geld auf.
- Reparatur, Staffelersatz, Munition und nötiges Abschleppen dürfen ohne weitere
  Bestätigung aus regulär verfügbaren eigenen Mitteln bezahlt werden. Keine
  Schulden und kein automatischer Warenverkauf.
- Geld-/Treibstoffmangel oder fehlende erreichbare Werkstatt pausieren den
  Auftrag mit sichtbarem Grund. Nach Wegfall des Hindernisses wird erneut
  versucht; Zahlungen dürfen nicht mehrfach ausgelöst werden.
- Bewegungsunfähige Überlebende können nach der Schlacht durch einen
  kostenpflichtigen Bergungsdienst mit zusätzlicher Wartezeit zur gewählten
  Reparaturstelle gebracht werden. Keine Bergung im laufenden Gefecht und kein
  Umgehen von Gefangennahme oder Besitzübertragung nach Niederlage.
- Ursprünglicher Auftrag und Handelsroutenposition werden gespeichert und nach
  vollständiger Reparatur fortgesetzt. Bewacher kehren zum Schutzort zurück.
  Entfallene/unzulässige Ziele führen zu Warten mit Hinweis. Ein neuer manueller
  Auftrag ersetzt die gespeicherte Fortsetzung.
- Während Reparaturfahrt und Reparatur keine neuen Abfangeinsätze. Eigene
  Angriffe führen zur Selbstverteidigung, danach zur Fortsetzung der Reparatur.

## 9. Diplomatie und Freundschaftsquests

### 9.1 Spieler und Konsortien

- Kampfregeln gelten für PvP und NPC-Kämpfe einschließlich Gefangennahme und
  Planetenraids. Eigene und konsortiumseigene Mitglieder bleiben unangreifbar.
- Eine standardmäßig aktive Checkbox aktiviert das militärische Bündnis des
  gesamten Konsortiums. Nur die Konsortiumsleitung darf sie ändern.
- Aktiv: automatische Unterstützung. Inaktiv: keine automatische Unterstützung,
  direkte Angriffe zwischen Mitgliedern bleiben trotzdem verboten.
- Änderungen gelten für neue Begegnungen, nicht rückwirkend für Schlachtseiten.
- Verteidigt ein Spieler ein militärisch verbündetes Konsortiumsmitglied gegen
  seine eigene befreundete NPC-Fraktion, darf er diese bekämpfen: kein Rufmalus,
  kein Freundschaftsverlust und keine anschließende Vergeltung gegen ihn.
- NPC-Fraktionen unterstützen nicht automatisch befreundete Spieler. Alle sechs
  NPC-Fraktionen sind untereinander verfeindet und unterstützen ausschließlich
  Sektoren derselben Fraktion. Die Vorlage zu verschiedenen verbündeten
  NPC-Fraktionen wird dadurch ersetzt.

### 9.2 Erste und zweite Freundschaft

- Beim ersten Ausbau der Leitstelle auf sektorweite Reichweite (aktuell Stufe 2)
  startet einmalig eine Geschenk-/Freundschaftsquest zu einem Verwaltungsplaneten
  einer frei gewählten Fraktion.
- Vor Abschluss sind alle NPC-Fraktionen gegenüber dem Spieler neutral,
  Aggression bleibt null und automatische Angriffe einschließlich militärischer
  Grenzabfangangriffe unterbleiben.
- Abschluss befreundet dauerhaft die gewählte Fraktion und verfeindet die fünf
  anderen. Kein regulärer Fraktionswechsel.
- Während die Quest offen ist, sind ab fünf vorhandenen eigenen Schiffen nur
  **Bau und Kauf** weiterer Schiffe gesperrt. Vorhandene größere Flotten bleiben
  erhalten. Geschenke, Übernahmen und Freikäufe bleiben erlaubt. Die Regel soll
  zur Nutzung der Friedenszeit anhalten, nicht andere Erwerbswege bestrafen.
- Eine Staffel zählt als ein Schiff; gefangene eigene Schiffe zählen zum Bestand.
- Das neue einmalige und sehr teure Leitstellenmodul „galaktische Freundschaft“
  öffnet eine zweite Geschenkquest. Erst ihr Abschluss befreundet eine zweite
  Fraktion und hebt deren Feindschaft auf.
- Die beiden befreundeten Fraktionen bleiben untereinander feindlich. Der Spieler
  unterstützt in ihren gegenseitigen Kämpfen nicht automatisch eine Seite.
  Stillstand oder Verlust der Leitstelle beendet erworbene Freundschaften nicht.

## 10. Fraktionssektoren, Versorgung und Wachstum

### 10.1 Verwaltung und Geldpool

- Jede im Sektor vertretene Fraktion erhält einen Verwaltungsplaneten in einem
  ihrer dortigen Systeme. Im selben Sonnensystem liegt ihre zugehörige Werft;
  ihre Flottenstacks sind am Verwaltungsplaneten in Abfangstellung stationiert.
- Alle Fraktionsquests dieses Sektors laufen ausschließlich über diesen Planeten.
  Andere Fraktionsplaneten verlieren die alte Questannahme, -generierung und
  -abgabe einschließlich der alten Inhalte.
- Verwaltung ist einheitlich **pro Fraktion und Sektor** organisiert: ein Geldpool
  und ein Fraktionssektorlevel, das für ihre Planeten im Sektor gilt. Frühere
  Formulierungen mit separaten Geldpools/Leveln pro Sonnensystem entfallen.
- Pooldeckel: 10 Millionen Credits × Fraktionssektorlevel. Ausgaben können den
  Pool nicht unter null bringen. Geld oberhalb des Deckels verfällt.
- Ein sehr langsames passives Einkommen ermöglicht Wiederaufbau auch nach
  vollständiger Verarmung. Voraussetzung ist Spieleraktivität im eigenen oder
  direkt angrenzenden Sektor innerhalb der letzten 24 laufenden Spielstunden.
  Wirtschaftliche oder militärische Aktionen zählen; bloßes Eingeloggtsein nicht.

### 10.2 Grundversorgung und Warenannahme

- Laufende Grundversorgung besteht aus Wasser und Nahrung; Bedarf und begrenzter
  Puffer wachsen mit dem Fraktionssektorlevel. Nur tatsächlich vorhandene, für
  den Verbrauch verfügbare Bestände gelten als Versorgung.
- Außerhalb von Quests dürfen Fraktionen ausschließlich diese Grundrohstoffe
  für das Verwaltungszentrum kaufen. Andere erhaltene Waren aus Quests, Raids
  oder Versorgung werden zum regulären Bestpreis in Geld umgewandelt.
- Erbeutetes Wasser/Nahrung füllt zuerst die Versorgung auf. **Ist deren Lager
  voll, wird weiteres Abladen verweigert; Überschüsse werden nicht automatisch
  verkauft.** Diese Regel gilt auch bei Lieferungen statt Beute. Mengenprüfungen
  dürfen keine Ware löschen oder zusätzliche Verkaufsgutschriften erzeugen.
- Bestpreis basiert auf regulären Marktpreisen, nicht frei gesetzten
  Spielerangeboten. Versorgungsgold verwendet den gesonderten festen Kurs.
- Feindliche Verwaltungsplaneten erlauben ausdrücklich gekennzeichnete Abgabe
  von Wasser/Nahrung trotz Feindschaft. Sie gibt keinen Ruf/Questbonus, ändert
  keine Diplomatie und schützt eindringende Kriegsschiffe nicht vor Abfangen.
- Ausreichende Versorgung pausiert den Aggressionsanstieg gegenüber allen
  Spielern, deren Leitstelle diesen feindlichen Sektor abdeckt. Versorgung ist
  ein gemeinsamer physischer Bestand, keine getrennte Spende pro Spieler.

### 10.3 Level, Ruf und Flottenbau

- Dauerhaft erfüllte Grundversorgung erzeugt Fortschritt zum nächsten
  Fraktionssektorlevel. Lücken pausieren Fortschritt, senken erreichte Level
  nicht. Der Aufstieg kostet zusätzlich Geld aus dem lokalen Pool.
- Fraktionssektorlevel begrenzt lokal baubare NPC-Schiffe. Kriegsschifflimit ist
  10 × Fraktionssektorlevel pro Sektor, gezählt als einzelne Kriegsschiffe
  einschließlich Staffeln, unabhängig von Stackaufteilung. Zivile Schiffe und
  Versorgungsschiffe zählen nicht. Ersatz kostet Geld und Bauzeit.
- NPCs bauen innerhalb von Geld-, Level- und Flottenlimit. Ein Teil ihrer Flotte
  bleibt als Verteidigung zurück statt vollständig auf Raids zu gehen.
- Persönlicher Ruflevel ist davon getrennt und fraktionsweit gültig. Er bestimmt
  kaufbare Fraktionsschiffe; jeweils einen Ruflevel später erhält der Spieler
  den Bauplan zum Bau im eigenen Orbitalring.
- Neue Quests geben persönlichen Ruf und Fraktions-XP, keine Credits. Annahme
  und Bearbeitung bleiben bei Versorgungslücken möglich; Abgabe setzt
  ausreichende Grundversorgung voraus. Fortschritt wird nicht gelöscht.

### 10.4 Physische Versorgungstransporte

- Alle 10–25 Minuten senden Fraktionssektoren ein Versorgungs-/Abholschiff zu
  einem anderen Sektor derselben Fraktion. Diese Transporte verschieben Geld
  physisch als verarbeitetes Gold.
- Startpool wird belastet, Zielpool erst nach tatsächlicher Ankunft gutgeschrieben.
  Fester Umrechnungskurs, verlustfreie Umrechnung ohne Handelsgewinn und ohne
  zusätzliches Geld aus bloßer Hin-/Rückumwandlung.
- Transporte sind angreifbar. Bei Verlust wird am vorgesehenen Ziel nichts
  gutgeschrieben. Gegnerische Fraktionen können Beute ihrem eigenen lokalen
  Pool zuführen und dadurch wachsen. Pooldeckel gelten weiterhin.
- Abfahrtsmengen müssen Poolbestand, Zielkapazität und tatsächlichen Frachtraum
  beachten; laufende Transporte sind bei weiteren Dispositionen einzurechnen.

## 11. Aggression, NPC-Krieg und Planetenraids

### 11.1 Aggression und Grenzverteidigung

- Aggression wird je feindlicher Fraktion, Sektor und Spieler gespeichert.
  Ausgangswert null; nach Friedenszeit steigt sie langsam durch Spieleraktivität
  im betreffenden oder einem angrenzenden Sektor.
- Ein feindlicher Sektor beginnt bei erstmaliger Erfassung durch die eigene
  Leitstelle einmalig einen 24-Stunden-Friedenstimer. Ausbau, Verlust und
  Wiederherstellung der Abdeckung setzen ihn nicht zurück.
- Der Timer verhindert Aggressionsanstieg und daraus ausgelöste Raids.
  Ausreichende Versorgung pausiert anschließend den Anstieg, senkt bestehende
  Aggression nicht und ruft bereits gestartete Raids nicht zurück.
- Betreten Kriegsschiffe/Stacks mit Kriegsschiffen den Schutzradius einer
  feindlichen NPC-Fraktion, startet deren Abfangangriff unabhängig von Aggression
  und dieser Friedenszeit. Vor erster Freundschaft gilt jedoch die Neutralität.
- Ab ausreichender Aggression entsendet die Fraktion Kriegsschiffstacks gegen
  Handelsschiffe oder Planeten. Zielauswahl gewichtet Flugzeit, Schutz durch
  Kriegsschiffe und Zufall. Versorgung des Gegners kann dessen Wachstum fördern.

### 11.2 Raidablauf und Folgen

- Spieler und NPCs dürfen feindliche Planeten raiden. NPC-Fraktionen dürfen auch
  gegnerische NPC-Transporte und Verwaltungsplaneten angreifen.
- Ein Planetenraid muss zunächst Verteidigungsschiffe besiegen/vertreiben und
  danach eine sichtbare Plünderungsphase am Planeten durchlaufen. Weitere
  Verteidiger können währenddessen eingreifen.
- Erfolgreiche Plünderung entnimmt die wertvollsten verfügbaren Waren bis zur
  freien Frachtkapazität der überlebenden, ungeschützten Raidschiffe. Keine
  Überschreitung von Lagerbestand oder Frachtraum und keine Beuteduplikation.
- Kein Besitzwechsel und keine Gebäudezerstörung. Produktion läuft anschließend
  mit 50 %, bis manuell repariert wird. Mehrere Raids stapeln den Malus nicht.
- Reparatur kostet Geld und kurze Zeit, keine zusätzlichen Baumaterialien;
  Preis/Dauer sind vorher sichtbar. Danach entfällt der Malus vollständig.
- Ab erfolgreicher Plünderung sind 24 Stunden lang sämtliche neuen Angriffe und
  Raids gegen diesen Planeten durch Spieler und NPCs blockiert. Schutz bleibt
  bei Besitzerwechsel erhalten, läuft unabhängig von Reparatur und schützt
  keine Schiffe in der Umgebung. Ein gescheiterter Raid erzeugt keinen Schutz.
- NPC-Planeten nutzen dieselben Malus-, Reparatur- und Schutzregeln. Die NPC-KI
  veranlasst ihre kostenpflichtigen Reparaturen selbst, ohne Planeten dauerhaft
  an andere Fraktionen zu verlieren.

## 12. Darstellung und Rückmeldung

- Taktische Darstellung nutzt bestehende Schiffsgestaltung; neue Typen erhalten
  passende eigene Designs. Sämtliche neuen Grafiken folgen dem bisherigen
  Fantasy-Comic-Sci-Fi-Stil, auch Effekte und UI-Symbole.
- Erkennbar verschieden sind Schild-/Schiffstreffer, Rumpf-/Systemschaden,
  beschädigte/zerstörte/gestörte Systeme sowie bewegungsunfähige,
  kapitulierende, zurückziehende und zerstörte Schiffe.
- Auswahl zeigt Rumpf, Schildsektoren und bekannte Systeme mit eindeutigen
  Symbolen, Lebensbalken und Zuständen. Informationen nicht nur durch Farbe.
  Systemangriffe funktionieren direkt am Hardpoint und über eine Systemliste.
- Effekte entsprechen tatsächlichem Zustand: keine Schubflamme bei zerstörtem
  Antrieb, kein Feuer aus zerstörter Batterie; Ionenstörung unterscheidet sich
  sichtbar von Zerstörung. Waffenrollen sind in Wirkung und Darstellung erkennbar.
- Sichtbar sind Stackmitglieder/Reihenfolge, strategische und taktische Haltung,
  Rückzugspolitik, Reparaturautomatik/-ziel/-blockaden, Wiederaufnahmeauftrag,
  Gefangene/Freikauf, Raidmalus/-schutz und Fraktionsversorgung/-fortschritt.
- Beteiligte erhalten einen Schlachtbericht mit Verlusten, Gefangenen,
  Besitzübernahmen und Beute. Zuschauern werden keine privaten Aufträge oder
  zusätzlichen verdeckten Informationen offengelegt.

## 13. Migration bestehender Spielstände

1. Bestehende Spieler starten gegenüber NPC-Fraktionen neutral. Bei bereits
   sektorweit reichender Leitstelle startet die Freundschaftsquest einmalig.
2. Vorhandene Rufwerte, Baupläne und Schiffe bleiben erhalten. Kampfdefinitionen
   und Klassen werden auf bestehende Schiffe übertragen; Umstellung vernichtet
   keine Einheiten und startet keine Kämpfe.
3. Bei verringerter Frachtkapazität bleibt vorhandene überschüssige Ladung
   erhalten. Nur weiteres Beladen ist blockiert, bis die Kapazität wieder passt.
   Dies ist eine Migrationsausnahme, keine Ausnahme beim neuen Schutzmoduleinbau.
4. Alte NPC-Fraktionsquests werden ohne Strafe beendet und gebundene Lieferwaren
   freigegeben. Neue Quests entstehen ausschließlich an Verwaltungsplaneten.
5. Organisatorische Flottengruppen werden nicht stillschweigend zu physischen
   Stacks. Bestehende Routen bleiben ohne neue Stackzuweisung eigenständig.
6. Migration ist wiederholbar ohne doppelte Quests, Warenfreigaben, Boni oder
   zusätzliche Schiffe. Speicherung und erneutes Laden erhalten das Ergebnis.

## 14. Umsetzungspakete und Fortschritt

Planung ist abgeschlossen; die Umsetzung läuft paketweise (Stand siehe Tabelle).
Nach jedem fachlich abgeschlossenen Paket: passende Prüfungen ausführen,
Nachweise/Ergebnis hier ergänzen und zusammen mit dem Paket committen.
Fehlgeschlagene oder nicht ausführbare Prüfungen ausdrücklich melden.

| Paket | Inhalt und prüfbares Ergebnis | Voraussetzung | Stand |
|---|---|---|---|
| P00 | Abgestimmtes PRD erstellen, auf Vollständigkeit prüfen und committen | Q81 | Abgeschlossen mit dem Planungscommit dieses Dokuments |
| U01 | Physische Stacks, Zusammenflug, Mitgliedschaft, Reihenfolge, gemeinsame Reise und Routenintegration | P00 | Umgesetzt: `server/war/stacks.js`, Befehle `stackJoin/stackDetach/stackMove/routeStackNo`, Stackfenster im Schiffsdetail, Stacknummer in der Routenübersicht; Nachweis `tests/prd15-stacks.test.js` |
| U02 | Klassen, Baupläne, Waffen-/Systemschema, alle Bestandsmodelle und neue Grund-/Mehrzweckmodelle; zentrale Wertetabellen und Migrationsentwurf | P00 | Umgesetzt: zentrale Tabellen in `shared/combat.js` (Klassen, Waffen, Systeme, Panzerung, Baupläne, Reparaturvorschau); neue Typen Falke, Keiler, Hornissen-/Wespenstaffel, Habicht, Sperber, Greif, Bastion; schnelle Zivilschiffe beschleunigt; Nachweis `tests/prd15-combat-data.test.js` |
| U03 | Vollständiger Neuentwurf der 18 Fraktionsschiffwerte/Fähigkeiten und Freischaltungstabellen; neue stilkonforme Grafiken für neue Typen | U02 | Umgesetzt: 18 Fraktionsmodelle als Mehrzweck/Krieg mit Fähigkeit und Nachteil, kleine Laderäume der Kriegsschiffe, Rang 4 und Bauplan einen Rang nach Kauffreigabe; neue Typen erhalten generierte Comic-SVGs (Konturen, Zweitonrumpf). **Offen:** gemalte PNG-Illustrationen der acht neuen Typen durch die Grafikpipeline |
| U04 | Serverseitige Schlachtinstanzen, Zeit/Speicherung, Bewegung, zwei Seiten, Beitritt und vollständige Schadenspipeline | U01, U02 | Umgesetzt: `server/war/battle.js` (Instanzen, Aufstellung, Verstärkung vom Kartenrand, Sensorik je Seite, KI, Bewegung mit Antriebs-/Manöveranteilen, Feuerwinkel, Lenkwaffen mit Punktverteidigung, Strahlenaufbau, Brände, Schadenskontrolle), `shared/damage.js` (Schritte 4-8, Fläche, Ionen), `server/war/engage.js` (Angriffsbefehl, Flucht ziviler Ziele); Nachweis `tests/prd15-battle.test.js` |
| U05 | Taktische Oberfläche, Sensorik, Systembefehle, Zuschauerrechte, KI-/Manuellwechsel, Staffeln und Effekte | U04 | Umgesetzt: Schlachtsymbole auf der Karte (Doppelklick), `client/js/ui/battle.js` (Auswahl, Rahmenauswahl, Rechtsklickbefehle, Hardpoint- und Systemlistenangriff, Haltung, Rückzugspolitik, Priorität, Schadenskontrolle, Effekte, Zustände mit Symbolen statt nur Farbe, schmale Ansicht), betrachterabhängige Sicht in `server/war/view.js`, Befehle `battleOrder/battleTactic/attack`; visuell geprüft am Testserver `scripts/dev-prd15.js` |
| U06 | Rückzug, Sprungsperren, Kapitulation, Sieg/Unentschieden, Besitzwechsel, Gefangene, Freikauf, Trümmer und Berichte | U04, U05 | Serverseitig umgesetzt: Rückzug/Sprungsperre in `battle.js`, Ergebnisauflösung, Gefangene, Freikauf (`ransom`), Trümmerfelder (30 min) und Berichte in `server/war/outcome.js`; Nachweis `tests/prd15-battle.test.js`. Oberfläche folgt mit U05 |
| U07 | Vollreparatur, Schadenskontrolle, Munition, Bergungsdienst, Reparaturautomatik und zuverlässige Auftragsfortsetzung | U06 | Umgesetzt: `server/war/repair.js` (Reparaturstellen Werft/Ruinenwelt mit Antriebswerkstatt, Vorschau, einmalige Zahlung ohne Schulden, Staffelersatz und Munition, Bergungsdienst, Automatik je Stack/Schiff mit Fortsetzung der Queue samt Routenposition); Schadenskontrolle im Gefecht in `battle.js`; Bedienung im Schiffsdetail; Nachweis `tests/prd15-repair.test.js` |
| U08 | Strategisches Bewachen/Abfangen, Schutzmodul, Konsortiumsbündnis und Unterstützungsrechte | U01, U06, U07 | Umgesetzt: `server/war/support.js` (Abfangen bis halbe Sektorweite, Bewachen im lokalen Radius mit Rückkehr, nur Kriegsschiffe, kein Abbruch laufender Einsätze, keine Rufe während Reparatur, Bündnisstand je Begegnung), Schutzmodul in `shared/ships.js` (halbe Fracht, 70 % Tempo, Einbau nur an Werften, Rezept und Werftbestand), Bündnis-Checkbox nur für die Leitung; Nachweis `tests/prd15-support.test.js` |
| U09 | Verwaltungsplaneten, Grundversorgung, Sektorpools/-level, neue Quests, Freundschaften, Leitstellenmodul und physische Goldtransporte | U03, U08 | Umgesetzt: `server/war/factions.js` mit Tabellen in `shared/warfare.js` (Verwaltungsplanet und Werft je Fraktion/Sektor, Pooldeckel, Level, Wasser/Nahrung mit Puffer und Abweisung bei vollem Lager, Bestpreisumwandlung, passives Einkommen nur bei Aktivität, Flottenbau bis 10 × Level, Goldtransporte mit Gutschrift bei Ankunft, Beute/Freikauf an Fraktionen), Quests nur an Verwaltungsplaneten mit Ruf/Fraktions-XP ohne Credits und Abgabesperre bei Versorgungslücke, Freundschaftsquest ab Leitstellenstufe 2 mit Bau-/Kaufsperre ab fünf Schiffen, Modul „galaktische Freundschaft“; Anzeige am Verwaltungsplaneten; Nachweis `tests/prd15-factions.test.js` |
| U10 | Aggression, Friedensfristen, NPC-Flottenbau/-kriege, Raids, Beute, Planetenschutz und Reparatur | U08, U09 | Umgesetzt: `server/war/raids.js` (Aggression je Fraktion/Sektor/Spieler mit einmaligem 24-h-Friedenstimer, Pause bei Versorgung, Neutralität vor erster Freundschaft, Grenzabfangen, aggressionsgesteuerte Raids mit Zielgewichtung und Verteidigungsanteil, NPC-Kriege gegen Goldtransporte und Verwaltungsplaneten, Heimkehr/Beuteabgabe/Reparatur der Fraktionsflotten), Planetenraid mit sichtbarer Plünderungsphase, Beute bis Frachtraum, 24-h-Schutz, 50-%-Produktionsmalus bis zur Reparatur (Spieler per Befehl, NPC selbst); Nachweis `tests/prd15-raids.test.js` |
| U11 | Bestandsmigration, integrierte Balance, Neustart-/Mehrspielertests und visuelle Gesamtabnahme | U01–U10 | Offen |

Die Reihenfolge erlaubt parallele fachliche Vorarbeiten an U01/U02; eine
Beauftragung von parallelen Agenten oder Implementierung ist damit nicht
verbunden. Jedes Paket liefert bedienbares beziehungsweise nachweisbar
integriertes Verhalten statt unverbundener Datenfelder.

### Verbindliche Balance- und Konfigurationslieferungen

- Schiffstabelle für sämtliche alten/neuen Modelle: Klasse, Rolle, Preis,
  Baukosten/-zeit, Fracht, Tank/Reise, taktische Bewegung, Rumpf, Zonenpanzerung,
  Schilde, Hardpoints/Systeme, Bewaffnung, Spezialfähigkeit/Nachteil.
- Waffentabelle einschließlich Trefferparametern, Schaden/Durchschlag,
  Strukturanteil, Ionenwerten/-grenzen, Flächenabfall und Munitionskosten.
- Tabellen für Systemleistungsverlust, Schadenskontrolle/Brände,
  Sprungvorbereitung/-sperre, Staffelstärke/-ersatz sowie Reparatur/Bergung.
- Fraktionstabellen für Level-/Rufschwellen, Schiff-/Bauplanfreischaltung,
  Wasser-/Nahrungsbedarf und Puffer, Einkommen, Ausbau, Goldkurs/Transportmenge,
  Aggressionsanstieg/-schwellen, Raidstärken/-intervalle, Plünderungsdauer und
  Planetenreparatur. Kosten für zweite Freundschaft sind ausdrücklich hoch.
- Vergleichsszenarien: schneller Frachter gegen Verfolger; Eskorte gegen Raid;
  Staffeln gegen schwere Waffen/Punktverteidigung; Ionen gegen Schilde/Systeme;
  Flankenangriff gegen Frontspezialist; Fraktionsmodell gegen Standardgegenstück;
  Flotten gleicher Gesamtkosten; verarmter Sektor und Wiederaufbau.
- Ergebnisse dokumentieren und Werte zentral konfigurierbar halten. Konkrete
  Zahlen außerhalb bestätigter Vorgaben sind Implementierungsarbeit innerhalb
  dieser Ziele, keine stillschweigend bereits beschlossenen Interviewantworten.

## 15. Verbindliche Abnahme

### A. Stacks und Aufträge

1. Zusammenführung erfolgt erst am Treffpunkt und nur innerhalb desselben
   Besitzers; kein Schiff erscheint doppelt oder in zwei Stacks.
2. Langsamstes Mitglied begrenzt Reise; fehlender Treibstoff/Sprungbereitschaft
   blockiert nachvollziehbar, ohne Mitglieder zurückzulassen.
3. Stackfenster erlaubt Einzelauswahl, Ablösen und Reihenfolge. Nummern 1–9
   gruppieren nur innerhalb derselben Handelsroute. Aufgaben laufen geordnet,
   Abfahrt erst nach deren Abschluss.
4. Kampf, Rückzug, Reparatur, Neustart und manuelle Auftragsänderung erzeugen
   keine doppelte Lieferung/Zahlung und überspringen keine Routenstation.

### B. Kampf und Informationsrechte

5. Reales Erreichen der Waffenreichweite eröffnet die Schlacht. Verstärkung
   muss anfliegen; keine dritte Seite und kein Wiederbeitritt Zurückgezogener.
6. KI, Spieler und Zuschauerwechsel verändern keine Schäden, Angriffe oder
   Rückzugsvorbereitung. Fremde Einheiten bleiben auch im Konsortium unsteuerbar.
7. Jeder darf an sichtbaren Schlachtsymbolen zuschauen, ohne dadurch verdeckte
   Systeme, private Aufträge oder Aufklärung für eine Seite zu erhalten.
8. Rumpf und Systeme können unabhängig ausfallen: Entwaffnung/Bewegungslosigkeit
   zerstört kein Schiff. Keine Schüsse durch verdeckenden eigenen/gegnerischen
   Rumpf, kein allwissendes KI-Zielen.
9. Schadenspipeline prüft Schildüberschuss, Durchdringung, Panzerung,
   Strukturanteil, Systemüberschuss und bereits zerstörtes Ziel; kein doppelter
   Schaden. Flächenwirkung zählt den gemeinsamen Rumpf nur einmal.
10. Schildsektoren, Feuerwinkel und Orientierung machen Positionierung relevant.
    Generatorausfall deaktiviert nur die zugeordneten Sektoren dauerhaft bis
    Reparatur. Ionenstörung ist begrenzt und von Zerstörung getrennt.
11. Staffelverluste reduzieren Kampfkraft; keine anwählbaren Fluggerätesysteme,
    keine Träger/Hangars und kein kostenloser Wiederaufbau.
12. Rückzug prüft alle Voraussetzungen; normaler Kartenrandübertritt genügt
    nicht. Sprungsperren wirken nur im ausgewiesenen Radius.

### C. Niederlage und Wiederherstellung

13. Mehrzweckschiffe kapitulieren unter, nicht bereits bei genau 30 % Rumpf.
    Kapitulierte Einheiten sind sofort funktionslos/geschützt und werden nur
    bei Niederlage übergeben; Sieg/Unentschieden erhält Eigentum.
14. Bewegungsunfähige Kriegsschiffe werden nur nach Niederlage übernommen.
    Festgefahrene Schlachten enden nach den bestätigten 120-Sekunden-Bedingungen.
15. Gefangene bleiben unbegrenzt freikaufbar; genau 25 % des regulären Kaufpreises
    gehen an den Sieger. Rückgabe am nächstgelegenen eigenen Ruinenplaneten,
    ohne Ladung, mit verbliebenen Schäden; keine doppelte Zahlung/Rückgabe.
16. Kriegsschifftrümmer sind öffentlich abbaubar und verschwinden nach 30 Minuten
    Spielzeit; Neustart dupliziert weder Trümmer noch Rohstoffe.
17. Reparaturautomatik funktioniert für Stacks und Einzelschiffe mit aktivem
    Standard, Abschaltung, vollständiger Reparatur, kostenpflichtigem Staffelersatz,
    Munitionsauffüllung und Bergung. Reine Schild-/Ionen-/Munitionszustände lösen
    allein keine Fahrt aus.
18. Geld-/Treibstoff-/Werkstattblockaden pausieren sichtbar. Eigene Mittel werden
    korrekt belastet; kein Warenverkauf/Schulden. Reparaturfahrt nimmt keine
    Hilferufe an; danach wird der richtige Auftrag fortgesetzt.

### D. Diplomatie und Fraktionswirtschaft

19. Unterstützung beachtet Radius, halbe Sektorweite, Haltung, Bündnis und
    tatsächliche Flugzeit. Zivile/Mehrzweckschiffe lösen kein Abfangen aus.
20. Schutzmodul wirkt je Schiff mit halbierter Fracht, zusätzlichem Modulbedarf,
    70 % Tempo und deaktivierten Waffen. Kein Einbau unterwegs, keine geschützte
    Raidkapazität und kein mittelbarer Schutz ungeschützter Mitglieder.
21. Erste Quest startet einmalig auf Leitstellenstufe 2 beziehungsweise bei
    Migration. Vor Abschluss Neutralität; danach eine Freundschaft/fünf Feinde.
    Nur Bau/Kauf sind ab fünf Schiffen während der offenen Quest gesperrt.
22. Zweite Freundschaft benötigt Modul und Questabschluss. Freunde bleiben
    untereinander feindlich. Konsortiumsverteidigung gegen die eigene befreundete
    NPC-Fraktion verursacht keinen Malus oder Vergeltungsangriff.
23. Jeder Fraktionssektor besitzt Verwaltungsplanet, zugehörige Werft, lokalen
    Pool und Level. Quests sind dort konzentriert, geben keinen Geldlohn und
    lassen sich ohne ausreichende Grundversorgung nicht abgeben.
24. Wasser/Nahrung werden bei vollem Lager nicht abgeladen oder automatisch
    verkauft. Andere zulässige erhaltene Waren werden korrekt zum regulären
    Bestpreis umgewandelt. Pooldeckel und fehlendes Kaufrecht bleiben wirksam.
25. Versorgung pausiert Level-/Aggressionsregeln wie beschrieben; sie erzeugt
    weder persönlichen Ruf noch separate virtuelle Bestände pro Spender.
26. Goldtransporte belasten Start und schreiben erst bei Ankunft gut. Abfangen
    verschiebt vorhandenen Wert zum Sieger ohne Doppelgutschrift. Gegnerische
    Fraktionen können damit wachsen; Bau/Ausbau bleiben kostenpflichtig und
    innerhalb von Pool-/Flottenlimit.
27. Einmaliger Friedenstimer wird durch Leitstellenausbau/-verlust nicht erneuert.
    Grenzabfangen bleibt nach erster Freundschaft unabhängig von Aggression
    möglich; Neutralität davor verhindert solche automatischen Angriffe.

### E. Raids, Migration und Darstellung

28. Raid benötigt Sieg über Verteidiger und Plünderungsphase mit möglichem
    Verteidigerbeitritt. Beute überschreitet weder Bestand noch gültigen Frachtraum.
29. Erfolg setzt Produktion auf 50 % und schützt den Planeten 24 Stunden vor
    allen neuen Angriffen/Raids. Kein Besitzwechsel, kein Stapeln; kostenpflichtige
    manuelle Reparatur hebt Malus auf, nicht Schutz. NPCs nutzen dieselben Regeln.
30. Migration erhält Schiffe, Ruf, Baupläne und überschüssige Ladung; beendet alte
    Fraktionsquests ohne Strafe und gibt gebundene Waren genau einmal frei.
31. Serverneustart erhält Schlacht-, Reise-, Reparatur-, Gefangenen-, Transport-
    und Fristzustände ohne Nachsimulation der ausgeschalteten Zeit.
32. Neue Schiffe/Effekte/UI-Grafiken entsprechen dem bisherigen
    Fantasy-Comic-Sci-Fi-Stil. Bestehende Fraktionsbilder sind erhalten.
    Symbole/Zustände bleiben ohne reine Farbcodierung verständlich.
33. Visuelle Abnahme prüft breite und schmale Ansichten, Auswahl, Systemliste,
    Zuschauer-/Spielerwechsel, Effekte, Stack-/Reparaturbedienung und Fraktions-
    /Raidanzeigen. Automatisierte Mehrspieler-, Neustart- und Wirtschaftstests
    sowie relevante bestehende Regressionstests bestehen.

## 16. Prüfstand und Nachweise

Planungsdokument; noch keine Implementierung oder Implementierungsprüfung.
Am 31.10.2026 wurden Dokumentstruktur, zentrale bestätigte Zahlen und Regeln
sowie Vollständigkeit gegenüber der Vorlage geprüft. Eine zusätzliche lesende
Prüfung bestätigte die interne Konsistenz insbesondere von Kapitulation,
Versorgung, Reparaturfortsetzung, Trägerausschluss und Grafikstil.
Für diesen reinen Dokumentationsschritt sind keine Laufzeittests erforderlich.
Der Planungscommit enthält ausschließlich dieses Dokument. Implementierungs-
und visuelle Nachweise werden paketweise ergänzt, zweckmäßig unter
`docs/qa/prd15/`.

Wesentliche ersetzte Vorgaben: PRD-Nummer 15; 30 statt zehn Minuten Trümmer;
keine Träger/Hangars; Verwaltung/Pool/Level pro Sektor; gegenseitige Feindschaft
aller unterschiedlichen NPC-Fraktionen; Kapitulation führt erst bei Niederlage
zur Übergabe; Freikauf zum eigenen Ruinenplaneten; Fünf-Schiffe-Sperre nur für
Bau/Kauf; Zuschauerzugang für alle bei getrennten Steuerungsrechten; keine
automatische Verwertung von Wasser-/Nahrungsüberschüssen; automatische Reparatur
mit Auftragsfortsetzung und verbindlicher bisheriger Grafikstil.
