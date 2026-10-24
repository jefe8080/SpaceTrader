# PRD 5: Heimatwelten, reale Wirtschaft und gezeichnete Planeten

Stand: 2026-10-24 · Status: Umsetzung läuft; U1–U6 abgeschlossen, U7–U17 offen

## 1. Geltung, Ziel und Freigabe

Dieses Dokument konsolidiert [PRD 4](PRD-4.md) einschließlich sämtlicher anschließender Interviewentscheidungen Q34–Q66. Es ersetzt PRD 4 als maßgebliche Umsetzungsvorgabe für diese Erweiterung. [PRD 1](PRD.md), [PRD 2](PRD-2.md) und [PRD 3](PRD-3.md) gelten weiter, soweit dieses Dokument ihre Regeln nicht ausdrücklich ändert.

Ziel ist ein persönliches, später aus mehreren Standorten bestehendes Industrieimperium: natürliche Rohstoffe beschaffen, auf eigenen Ruinenwelten verarbeiten, Bevölkerung versorgen und tatsächliche Nachfrage bedienen. Anspruch entsteht aus Entscheidungen und abgestimmten Warenflüssen, nicht aus langen Pflichtwartezeiten oder dem Verlust eines Imperiums während der Abwesenheit.

Der ursprüngliche Dokumentationsauftrag umfasste Prüfung, Konzeptklärung, Erstellung und Commit dieses PRD. Der Nutzer hat anschließend die Umsetzung beauftragt. Diese läuft schrittweise mit getrennten Testwelten. Nach ausdrücklicher Folgeentscheidung wird eine vollständig neue Welt erzeugt; Rücksichtnahme, Migration und Übernahme des alten Spielstands sind nicht erforderlich. Ein Push bleibt gesondert zustimmungspflichtig.

Die Spielregeln sind verbindlich. Mit **Ausgangswert** bezeichnete Zahlen sind ausdrücklich zur Ausarbeitung delegierte, nachvollziehbare Startwerte. Sie dürfen anhand von Simulation und Spieltests angepasst werden, solange dadurch keine bestätigte Grundregel geändert wird. Änderungen werden im Fortschrittsprotokoll mit Begründung festgehalten.

## 2. Bestätigte Änderungen gegenüber PRD 4

| Thema | Maßgebliche Entscheidung |
|---|---|
| Alte Spielstände | Vollständig neue Welt; keine Migration, Kompensation oder Pflicht zur Altstandsicherung (Folgeentscheidung 2026-10-24). |
| Ruinenbesitz | Alle Ruinenwelten bleiben persönlich gebunden, nicht verkäuflich und nicht an Konsortien übertragbar. |
| Manuelle Präsenz | Außerhalb eigener Abdeckung erhält genau ein aktiv manuell gesteuertes Schiff neue direkte Befehle; es muss nicht der Reliktträger sein. |
| Handels-XP | Persönlicher manueller Handel ist unabhängig vom Reliktantrieb XP-berechtigt; automatischer Handel bleibt ausgeschlossen. |
| Vollständige Warenherkunft | Auch Module und Fraktionsschiffe benötigen reale Bestände oder materialgebundene Fertigung. |
| Wurmlöcher | Automatischer Transit zwischen bekannten, abgedeckten Enden ist erlaubt; geometrische Abdeckung des übersprungenen Raums ist nicht nötig. |
| Abdeckungsverlust | Bereits begonnener Flugabschnitt wird sicher beendet; weitere ungedeckte automatische Abschnitte pausieren. |
| Einstieg | Fünf reparierbare Grundanlagen, kleine kostenlose Grundenergie und einmaliger zweiter Frachter. |
| Bevölkerung | Arbeiter werden dauerhafte Einwohner, keine regelmäßig verbrauchte Handelsware. |
| Fortschritt | Konkrete Infrastruktur und Bevölkerung bestimmen Leistung; Questgeberlevel verbessert diese nicht unsichtbar. |
| Bauzeiten | Frühe Reparaturen 15–60 s, gewöhnliche Bauten 1–3 min, große Bauabschnitte höchstens 10 min. |
| Warpservice | 5 min Vorbereitung, 24 h Serverlaufzeit Sperrfrist; Grundgebühr + 20 % fester Planeten-/Ausbauwert + Frachtzuschlag. |
| Reliktentwicklung | Später ×5 und ×6 Tempo, dauerhaft am einzigartigen Antrieb. |
| Seltene Rohstoffe | Sechs neue veredelte Waren; Hubs und Fraktionszahlungen akzeptieren nur veredelte Formen. Rohformen sind zwischen Spielern handelbar. |
| Planetenhintergrund | Bildschirmfüllende Fortsetzung von Gelände, Meer oder Wolken; keine abgeschnittene Inselplatte vor leerem Hintergrund. Spielbare Fläche wird dadurch nicht erweitert. |

## 3. Umfang und unveränderte Grenzen

Enthalten sind Startverteilung, Ruinenwelten, reale Warenwirtschaft, Spezialisierungen, Bevölkerung und Energie, Leitstellen, Produktion und Logistik, separate Hauptquestzweige, Orbitalringe, physische Module, Sonderrohstoffveredelung, Reliktantrieb, Relokation sowie gezeichnete Oberflächen und Bilddialoge.

Nicht enthalten sind eine Überarbeitung der Schiffsdesigns, das Erzeugen künstlicher neuer Planeten, tatsächliches Auftreten einer alten Zivilisation, neue Relikt-Spezialfähigkeiten jenseits der bestätigten Geschwindigkeitsstufen sowie Fortschritt während eines abgeschalteten Servers. Schiffsdesigns bleiben ein getrennter Auftrag.

Fraktionen, Konsortien, besondere Schiffsfähigkeiten, normale Quests, Minispiele, Erkundung und bestehende Schiffslizenzen bleiben grundsätzlich erhalten. Ausnahmen und nötige Umstellungen sind nachfolgend ausdrücklich beschrieben.

## 4. Weltstart und sichere Erstversorgung

### 4.1 Standortverteilung

- Eine Startheimatwelt pro Spieler, eigener Typ `ruins`, kostenlos und unabhängig von Gouverneurslizenzen.
- Zufällige geeignete Sonnensysteme im ersten und zweiten Hex-Sektorring um den Ursprung; niemals im Ursprungssektor.
- Höchstens eine Startheimatwelt pro Sonnensystem. Ausgangswert: mindestens 27.000 Welteinheiten Abstand zu anderen Heimatwelten; Objekte und Flugzugänge dürfen sich nicht überschneiden.
- Geeignete unbesetzte Plätze werden zuerst verwendet. Sind sie ausgeschöpft, wird die Suche ringweise erweitert. Grenzen und Verteilung sind im Test mit mehreren zeitversetzt beitretenden Spielern zu prüfen.
- Das Startsystem enthält erreichbare Quellen für Eis, Getreide, Rohgas, Helium-3, Rohöl und Erz sowie Zugang zu frühem Handel. Ausgangswert: höchstens 6.000 Einheiten Entfernung zwischen Heimat und jeweils einer Grundquelle. Ressourcenangebote sind pro Spieler nicht exklusiv, ihre Grundförderung muss aber den Einstieg tragen.
- Der Spieler startet nahe seiner Heimatwelt. Die Notsignalquest ist sofort verfügbar. Der Ursprung bleibt ein gemeinsamer öffentlicher Handels- und Werftstandort.
- Das bisherige künstlich langsame gemeinsame Startsystem darf den neuen persönlichen Einstieg nicht unbeabsichtigt drosseln.

### 4.2 Startwerte und einmalige Hilfen

| Bestandteil | Ausgangswert und Zweck |
|---|---|
| Spieler | 5.000 Cr, Pilotenlizenz 1, ein normaler Spatz mit vollem Tank; noch kein Reliktbonus |
| Bewohner | 100 Einwohner; 60 verfügbare Erwerbstätige, davon 48 einfache Kräfte und 12 Fachkräfte |
| Unterkunft | 200 Einwohner Kapazität |
| Grundenergie | 12 Leistungseinheiten, keine Betriebsmittel; bleibt dauerhaft begrenzt |
| Zentrallager | 2.000 normale Wareneinheiten; 100 getrennte Gefahrguteinheiten nach Sicherheitsfreigabe |
| Versorgungsvorrat | 80 Wasser, 40 Nahrung und 40 Schiffstreibstoff; einmalig, nicht erneut abholbar |
| Reparaturbestand | 80 Barren, 40 Platten, 12 Elektronik, 4 Maschinen; einmalig und in der Warenbilanz als Startausnahme ausgewiesen |
| Grundanlagen | Je eine reparierbare Wasser-, Nahrungs-, Schiffstreibstoff-, Brennstoff- und Barrenanlage |
| Zweiter Frachter | Ein Spatz mit vollem Tank nach Quest H05, einmalig und regulär auf die Schiffslizenz angerechnet |
| Grundenergie/Lebenserhalt | Kleine unabhängige Notversorgung verhindert unwiederbringlichen Stillstand, erzeugt keine exportierbaren Güter |

Reparaturen dürfen den Reparaturbestand verwenden; spätere Industrie muss aus tatsächlicher Produktion entstehen. Beim Beitritt neuer Spieler werden Starthilfen genau einmal erfasst. Wiederanmeldung, Questabbruch und Serverneustart erneuern sie nicht.

Die normale Regel für leere Tanks bleibt für reguläre Schiffe zunächst bestehen: stark verlangsamter Flug statt Verlust des Schiffs. Öffentliche Notdienste dürfen nur grundlegende Mobilität sichern und keine wiederholbar verkäufliche Fracht verschenken.

## 5. Warenherkunft, Märkte und Geld

### 5.1 Rollen und Bestände

1. Normale Welten und reine Förderstationen gewinnen Rohstoffe. Sie dürfen zugleich passende Waren verbrauchen.
2. Sämtliche Rezeptverarbeitung findet auf persönlichen Ruinenwelten statt. Werften dürfen aus gelieferten Bauteilen Schiffe bauen. Öffentliche Werften sind keine zusätzlichen allgemeinen Waren- oder Modulfabriken.
3. Bestehende verarbeitende Raumstationen und Fabrikbau auf gewöhnlichen Planeten entfallen in der neuen Weltgenerierung. Rohstoff-Sonderförderer, Hotels, Händler, Werften und Außenposten bleiben passende Produzenten, Abnehmer oder Dienstleister.
4. Alle Anfangsbestände, Handelsdrifts, Questbelohnungen und Sektornachgenerierungen werden inventarisiert. Neu entdeckte Sektoren dürfen keine zufälligen Fertigwaren- oder Modulbestände aus dem Nichts erzeugen.
5. Ausnahmen sind ausschließlich ausdrücklich begrenzte Einstiegshilfen und registrierte Quest-/Bergungsfunde. Diese Ausnahmen benötigen Herkunft, Empfänger beziehungsweise Fund-ID und eine einmalige Entnahme.
6. Spieler dürfen Rohstoffe, Zwischenprodukte, Endprodukte und normale Module handeln. Eine vollständige Eigenproduktion ist nicht vorgeschrieben.
7. Bestehende Preisformeln und Standortunterschiede bleiben Ausgangspunkt, Preise gelten aber auf tatsächliche Bestände und begrenzte Budgets.

### 5.2 Rohstoffförderung

Die vorhandenen Raten natürlicher Rohstoffproduktion sind die Ausgangsbasis. Unversorgte NPC-Produzenten behalten 25 % der normalen Grundförderung. Gute Versorgung ermöglicht die vollen 100 %. Ausbau und spezialisierte eigene Förderung können darüber hinausgehen. Fehlende Maschinen oder Nahrung zerstören keine Welt und löschen keine Vorkommen.

Verbrauch und Rohstoffförderung sind reale Vorgänge. Ein abstraktes Zurücksetzen von Beständen in Gegenrichtung darf weder Waren erzeugen noch bereits eingelagerte Waren spurlos entfernen. Volle Lager begrenzen weitere Produktion.

### 5.3 Bürger, Steuern und NPC-Kassen

Es gibt keine vollständig geschlossene Geldsimulation. Begrenzte zivile Einkommen und NPC-Nachfragebudgets dürfen neues Geld erzeugen; die Waren bleiben bestandsgebunden.

Ausgangswerte pro Serverstunde:

- Ziviles Bruttoeinkommen: `4 Cr × Einwohner × Versorgungsfaktor × Beschäftigungsfaktor`.
- Versorgungsfaktor 0,25 bis 1,25; Beschäftigungsfaktor 0,5 bis 1,0. Notversorgung erzeugt damit nur ein kleines Basiseinkommen.
- Steuer voreingestellt 20 %, einstellbar 0–40 %. Der Steueranteil geht an den Eigentümer, der Rest in das zivile Konsumbudget. Ein Betrag darf nicht zugleich vollständig als Steuer und Kaufbudget ausgezahlt werden.
- Konsumbudget speichert höchstens vier Stunden Einkommen. Einkauf ist zusätzlich durch Bedarf, vorhandene Ware und Preise begrenzt. Nicht gekaufte Nachfrage erzeugt keine automatische Auszahlung an den Besitzer.
- NPC-Märkte: erneuerbares Nachfragebudget entsprechend geplanter Warenverwendung, höchstens zwei Stunden nicht ausgegebener Nachfragewert. Keine Aufstockung proportional zu vom Spieler angebotenen Mengen.
- NPC-Händler: Einkaufskasse und verkaufbare Zielnachfrage sind erforderlich. Geplante Verkaufserlöse dürfen keine bereits zahlungsunfähige Bestellung finanzieren.

Gewerbliche Eigentümertransfers zwischen eigenen Lagern und Schiffen bleiben kostenlos. Lokaler Betriebsbedarf verbraucht Material, zahlt aber keine fiktiven Verkaufserlöse. Ziviler Absatz und externe Verkäufe haben nachvollziehbare Gegenkassen.

### 5.4 NPC-Transport

NPCs fliegen öffentliche Angebote an persönlichen Welten an. Preis, verkäufliche Menge und Reserven werden respektiert. Fremde Händler benötigen nicht die Leitstellenabdeckung des Verkäufers. Bestehende kleine NPC-Ladungen von höchstens 40 Einheiten bleiben zunächst der Ausgangswert.

Waren werden beim tatsächlichen Laden übertragen. Händler haben reale Kapazität und Flugzeit. Nicht ablieferbare Ladung wird zurückgebracht, eingelagert oder an einem anderen zulässigen Ziel angeboten; sie verschwindet nicht mit dem Löschen eines Transportobjekts. Ein öffentliches Angebot ist keine garantierte Abnahme.

## 6. Bevölkerung, Energie und Baufläche

### 6.1 Bevölkerung und Besucherverkehr

- Einwohner bleiben dauerhaft erhalten; Unterversorgung senkt Leistung, Einnahmen und Wachstum, führt aber nicht zu Tod oder Zerstörung durch Abwesenheit.
- 60 % der Einwohner stehen als Erwerbstätige zur Verfügung. Ein Arbeiter kann nicht mehreren Anlagen gleichzeitig zugeordnet sein.
- Grundbedarf je Einwohner und Stunde: 0,2 Wasser und 0,1 Nahrung. Entwicklungsabhängiger Komfortbedarf je Einwohner und Stunde: bis 0,02 Kleidung, 0,01 Medizin und 0,01 Konsumgüter. Tatsächliche Versorgung ist mengenbegrenzt.
- Wachstum bei ausreichender Versorgung und Wohnraum: 2 % der Bevölkerung pro Serverstunde, höchstens 100 zusätzliche Einwohner pro Stunde und Standort. Wachstum ist kein notwendiger Wartetimer: Anwerbung und reale Zuwanderung ermöglichen schnelleren Aufbau.
- Arbeiterpassagiere sind angeworbene Personen aus einem Herkunftsbestand. Ankunft und verfügbare Wohnungen wandeln sie in Einwohner um. Abreise reduziert den Herkunftsbestand; Umladen vervielfältigt niemanden.
- Ausbildungsbeginn reserviert konkrete Einwohner. Ausgangswert: zehn einfache Kräfte werden in 120 s zu Fachkräften; zehn Fachkräfte in 180 s zu Spezialisten. Abschluss setzt Versorgung und eine geeignete Schule voraus, keine erneute Erzeugung von Einwohnern.
- Touristen bleiben Besucher, belegen passende Transportplätze und halten sich zunächst 20 min Serverlaufzeit auf. Danach benötigen sie Abreise, Rücktransport oder einen vorhandenen NPC-Passagierdienst. Fehlender Transport erzeugt keine neuen Touristeneinheiten und keine unbegrenzten wiederholten Aufenthaltserlöse.

### 6.2 Gebäude und Betrieb

Kosten sind je Gebäude beziehungsweise Ausbaustufe. B = Barren, P = Platten, E = Elektronik, M = Maschinen; weitere Waren ausgeschrieben. Frühe Reparaturen verwenden das einmalige Reparaturmaterial.

| Gebäude/Ausbau | Credits und Material | Bauzeit | Betrieb und Wirkung |
|---|---|---|---|
| Provisorisches Dock/Lager | Questfreigabe, 4 B | 15 s | 2.000 Normal-/später 100 Gefahrguteinheiten; 2 Energie, 2 einfache Kräfte |
| Jede der fünf Grundanlagen reparieren | 250 Cr, 4 B | 30 s | 10 % Rezeptgeschwindigkeit, je 1 Energie und 4 einfache Kräfte |
| Wohnblock | 2.000 Cr, 8 B | 60 s | +200 Wohnplätze; 1 Energie |
| Solarfeld | 3.000 Cr, 10 B, 4 Glas | 60 s | +20 Energie, 2 einfache Kräfte, keine Betriebsmittel |
| Gasgenerator | 8.000 Cr, 12 P, 4 E | 90 s | +80 Energie; 20 Rohgas/h, 4 einfache Kräfte, 2 Fachkräfte |
| Reaktor | 100.000 Cr, 12 Legierungen, 2 Reaktorkerne, 6 M | 180 s | +500 Energie; 2 angereichertes Uran/h, 10 Kühlmittel/h; 6 Fachkräfte, 2 Spezialisten |
| Lagersilo | 3.000 Cr, 10 B | 60 s | +2.000 normale Kapazität; 1 Energie, 1 einfache Kraft |
| Sicherheitslager | 5.000 Cr, 10 P, 4 E | 60 s | +500 Gefahrgutkapazität; 2 Energie, 2 Fachkräfte |
| Raumhafenmodul | 10.000 Cr, 20 P, 6 E | 90 s | +2 gleichzeitige Abfertigungen und +500 Einheiten/min Umschlag; 4 Energie, 4 einfache Kräfte |
| Schule | 10.000 Cr, 12 P, 6 E | 90 s | Fachkräfteausbildung; 4 Energie, 2 Fachkräfte |
| Akademieausbau | 30.000 Cr, 10 Mikrochips, 4 Medizin, 4 E | 120 s | Spezialistenausbildung; zusätzlich 4 Energie, 2 Fachkräfte |
| Einfache Modulwerkbank | 3.000 Cr, 12 B, 4 Glas, 4 Kunststoff | 60 s | Grundmodulfertigung; 2 Energie, 2 einfache Kräfte; nach H06 |
| Forschungswerkstatt | 20.000 Cr, 12 P, 10 E | 120 s | Modulstudium/-fertigung; 6 Energie, 4 Fachkräfte |
| Forschungszentrum | 100.000 Cr, 10 Computer, 4 Roboter, 4 Sensoren | 180 s | Hochtechnologie; zusätzlich 10 Energie, 4 Spezialisten |
| Antriebswerkstatt | Erste per H04; weitere 15.000 Cr, 12 P, 8 E | 60 s | Ein-/Ausbau und Lager des Relikts; 2 Energie, 2 Fachkräfte während Arbeit |
| Fläche erschließen | 5.000 Cr, 10 B je Schritt | 60 s | +4 Bauplätze, Kostenfaktor 1,4 je Folgeschritt |

Ruinenwelten beginnen mit acht nutzbaren regulären Bauplätzen und vorhandenen Grundruinen. Der Ausgangsausbau erschließt bis zu 48 reguläre Plätze; eine ausreichende erweiterbare Ruinenlandschaft wird dafür entworfen. Normale vorhandene Weltlayouts bleiben zunächst bei ihren bisherigen Plätzen. Der dekorative Hintergrund erschließt niemals Bauplätze. Gebäude dürfen nicht auf nicht interaktives Hintergrundgelände gesetzt werden.

Grundruinen und zentrale Infrastruktur dürfen eigene gekennzeichnete Anker besitzen, damit der Einstieg nicht an bereits belegten acht freien Bauplätzen scheitert. Flächen-, Personal- und Energiegrenzen sind in der Bauvorschau sichtbar.

### 6.3 Kurze Bauzeiten und Unterversorgung

- Material und Credits werden beim Start gebunden; Bauplätze und Bauteams sind sichtbar belegt. Es gibt keine nachträglich unbegrenzt abgebuchten Kosten oder automatisch entstehenden Schulden.
- Unabhängige Projekte dürfen parallel laufen. Pro Anlage wird höchstens eine Erweiterung gleichzeitig ausgeführt.
- Große Projekte bestehen aus Abschnitten mit eigenständigem Ergebnis. Kein einzelner Bauabschnitt dauert mehr als zehn Minuten. Keine zusätzlichen langen Forschungstimer.
- Lebenserhalt und grundlegender Leitstellenbetrieb besitzen eine begrenzte unabhängige Notversorgung. Sie hält Bevölkerung, Fortschritt und erschlossene Reichweite stabil, erzeugt aber keine exportierbaren Güter.
- Andere Anlagen werden nach Priorität gedrosselt oder pausiert. Beschädigung oder dauerhafter Verlust durch eine Woche Abwesenheit ist ausgeschlossen.

## 7. Industrie und Produktionsregeln

Alle 40 bestehenden Warenrezepte aus `shared/goods.js` bleiben mit ihren Zutaten, Mengen und Zykluszeiten erhalten, ergänzt um die sechs Veredelungsrezepte in Kapitel 8. Die nachstehende Tabelle ordnet jedes bestehende Rezept einer Ausbaustufe zu; es gibt keine zusätzliche Rezepterzeugung außerhalb von Ruinenwelten.

| Industriegruppe | Bestehende Rezept-IDs |
|---|---|
| Bio | `waterworks`, `foodplant`, `weavery`, `fertilizerplant`, `pharma`, `cannery`, `tailor` |
| Chemie | `refinery`, `oilworks`, `chemworks`, `chemplant`, `coolantworks`, `fueldepot`, `glassworks`, `siliconworks` |
| Schwerindustrie | `smelter`, `rollingmill`, `alloyworks`, `refinery2`, `toolworks`, `gearworks`, `hullworks`, `machineworks`, `engineworks`, `reactorworks` |
| Hightech | `chipfab`, `cableworks`, `electronicsworks`, `opticsworks`, `batteryplant`, `cellworks`, `sensorworks`, `robotics`, `computerworks`, `aiforge`, `medtechworks`, `consumerworks`, `shippartsworks`, `habitatworks`, `jeweler` |

**Bau-/Freischaltgruppen I–V sind ausdrücklich nicht die vorhandenen Warenstufen.** Die aus Zutaten abgeleiteten Warenstufen bleiben Preis-/Katalogwerte; durch ihre Begrenzung auf 5 würden sie als Bautechnologiebaum Kreisläufe erzeugen. Folgende vollständige Zuordnung bestimmt Neubaukosten, Betriebsanforderungen und Freischaltung. Gebäudezutaten stammen aus früher freigeschalteten Gruppen; jede Rezeptzutat stammt aus derselben oder einer früheren Gruppe. Innerhalb einer Gruppe folgt die Produktion der tatsächlichen Rezeptabhängigkeit.

| Baugruppe | Rezept-IDs | Freischaltung |
|---|---|---|
| I Grundbetrieb | `waterworks`, `foodplant`, `fueldepot`, `refinery`, `smelter`, `oilworks`, `chemworks`, `glassworks`, `weavery`, `fertilizerplant`, `siliconworks` | Grundversorgung H02; fünf reparierte Anlagen haben ihre frühen Einzelquests |
| II Grundindustrie | `rollingmill`, `cableworks`, `chemplant`, `toolworks`, `refinery2`, `alloyworks`, `chipfab`, `pharma`, `coolantworks`, `tailor`, `cannery`, `opticsworks`, `batteryplant`, `jeweler` | H06; Grundmodule und erste Sicherheitslagerfreigabe gleichzeitig verfügbar |
| III Komponenten | `gearworks`, `electronicsworks`, `hullworks`, `sensorworks`, `reactorworks`, `cellworks` | H07 |
| IV Systeme | `robotics`, `machineworks`, `engineworks`, `shippartsworks`, `consumerworks`, `medtechworks`, `computerworks` | H09 und Forschungswerkstatt |
| V Hochtechnologie | `aiforge`, `habitatworks` | H12 und Forschungszentrum |

| Baugruppe | Credits / Baumaterial für eine neue Anlage | Bauzeit | Energie | Personal: einfach / Fach / Spezial |
|---|---|---|---|---|
| I | 5.000 Cr, 10 B | 60 s | 4 | 6 / 0 / 0 |
| II | 15.000 Cr, 12 B, 4 Hydrauliköl | 90 s | 8 | 6 / 2 / 0 |
| III | 40.000 Cr, 12 P, 8 Kabel | 120 s | 12 | 6 / 4 / 0 |
| IV | 100.000 Cr, 12 Legierungen, 8 E, 6 Zahnräder | 180 s | 20 | 8 / 6 / 2 |
| V | 250.000 Cr, 6 M, 4 Computer, 2 Roboter | 180 s | 32 | 8 / 8 / 4 |

Ein normaler Neubau arbeitet mit voller vorhandener Rezeptgeschwindigkeit. Die fünf reparierten Grundanlagen beginnen bei 10 %; ihr Ausbau zur normalen Anlage kostet je 4.750 Cr und 6 B, dauert 60 s und erhöht Energie-/Personalbedarf auf Baugruppe I. Diese explizite Einstiegsregel gilt auch für Nahrung und Barren trotz ihrer abweichenden Warenstufe. Mehrere Anlagen derselben Art sind möglich.

Vorhandene Waren dürfen bereits vor einer eigenen Baugruppenfreischaltung gehandelt werden, sofern tatsächlich verfügbar. Der Einzelspielereinstieg darf nicht auf fortgeschrittene andere Spieler angewiesen sein. Ab H06 ist die vorhandene 100-Einheiten-Gefahrgutsektion des Startlagers zertifiziert, ohne dafür erst Elektronik oder eine fertige Chemieproduktion zu verlangen. Normale Schiffskammern werden an der einfachen Modulwerkbank hergestellt; dadurch ist der Import von Säure für Seltenmetalle vor der ersten Elektronikproduktion möglich.

Der Spieler setzt Produktionsziele, Prioritäten und geschützte Reserven. Rezeptmengen werden nur bei ausreichenden Zutaten und freiem Outputlager verarbeitet. Teilzyklen dürfen keine Waren erzeugen. Energie und Arbeitskräfte bestimmen Leistung, nicht eine unsichtbare Verbrauchs- oder Ertragsdrift.

Standardreihenfolge: Grundversorgung und betriebsnotwendiger Schiffstreibstoff, bestätigte Bau-/Questreservierungen, Produktionsaufträge, Export. Mindestvorräte werden aus zwei Stunden geplantem Grundbedarf vorgeschlagen. Änderungen und ausdrückliche Freigaben sind möglich.

Die Bilanz zeigt verfügbare und reservierte Menge, erwarteten Zu-/Abfluss, laufende Lieferungen, Vorratsdauer, Engpass und mögliche Behebung. Ein Bestand darf nicht mehrfach zugesagt sein. Rücknahme eines Auftrags gibt seine nicht bereits verbrauchten Reservierungen frei.

## 8. Veredelung seltener Rohstoffe

### 8.1 Waren und Absatz

Die sechs bestehenden Rohstoff-IDs bleiben für Förderung erhalten; ihre Anzeigenamen werden eindeutig. Neue IDs kennzeichnen veredelte Waren. Nur diese sind bei Hubs verkäuflich und als Fraktionszahlung verwendbar. Spieler dürfen Rohformen handeln und auf ihren eigenen Ruinenwelten für andere verarbeiten.

| Rohform / bestehende ID | Veredelte Ware / neue ID | Frachtklasse des Produkts | Fraktion |
|---|---|---|---|
| Rohgold / `gold` | Feingold / `finegold` | Normal | Handelsliga |
| Rohdiamanten / `diamond` | Geschliffene Diamanten / `cutdiamonds` | Normal | Bergbaugilde |
| Uranerz / `uranium` | Angereichertes Uran / `enricheduranium` | Gefahrgut | Schwerindustrie-Syndikat |
| Unstabile Antimaterie / `antimatter` | Stabilisierte Antimaterie / `stableantimatter` | Gefahrgut | Tiefraum-Orden |
| Exotische Rohkristalle / `exocrystals` | Veredelte Exokristalle / `refinedexocrystals` | Normal | Tech-Konsortium |
| Rohes Nebelgas / `nebulagas` | Raffiniertes Nebelgas / `refinednebulagas` | Normal | Nomadenclan |

Rohuran und rohe Antimaterie bleiben ebenfalls Gefahrgut. Keine neue Passagier- oder Gefahrgutklasse wird allein durch Umbenennung stillschweigend geändert. Produktions- und Bauvorhaben dürfen ausdrücklich Rohformen als Zutaten verlangen; der Hub akzeptiert sie trotzdem nicht.

### 8.2 Neue Spielrezepte

Die Angaben sind abstrakte Spielrezepte, keine Darstellung realer Herstellungsverfahren. Ein Veredelungsgebäude verarbeitet ein gewähltes Rezept; Rezeptwechsel wird sichtbar angekündigt und darf keine laufenden Zutaten duplizieren.

| Anlage / Rezept-ID | Zutaten je Zyklus | Ergebnis | Zeit | Energie | Personal: einfach / Fach / Spezial |
|---|---|---|---|---|---|
| Edelmetallwerk / `goldpurifier` | 2 Rohgold, 1 Chemikalien | 1 Feingold | 12 s | 12 | 4 / 4 / 0 |
| Kristallschleiferei / `diamondcutter` | 2 Rohdiamanten, 1 Fräser | 1 geschliffener Diamant | 15 s | 12 | 4 / 4 / 0 |
| Isotopenwerk / `uraniumrefiner` | 2 Uranerz, 1 Chemikalien, 1 Kühlmittel | 1 angereichertes Uran | 18 s | 20 | 4 / 6 / 2 |
| Feldstabilisator / `antimatterstabilizer` | 1 unstabile Antimaterie, 2 Energiezellen, 1 Kühlmittel | 1 stabilisierte Antimaterie | 25 s | 32 | 2 / 6 / 4 |
| Resonanzwerk / `exocrystalrefiner` | 2 exotische Rohkristalle, 1 Optiken | 1 veredelte Exokristalle | 20 s | 20 | 2 / 6 / 2 |
| Gasfraktionierer / `nebulagasrefiner` | 3 rohes Nebelgas, 1 Kühlmittel | 2 raffiniertes Nebelgas | 12 s | 12 | 4 / 4 / 0 |

Gold-, Diamant- und Nebelgasveredelung nutzen Baukosten und Freischaltung der Baugruppe III, Uran-/Exokristallveredelung Gruppe IV, Antimateriestabilisierung Gruppe V. Das erste Veredelungsprojekt H10 erläutert den Zugang, ist aber keine Voraussetzung für den Bau seiner eigenen Nachweisanlage.

Produktbasispreise werden mit der bestehenden Rezeptwertformel aus Zutatenwert, Outputmenge und Arbeitsanteil berechnet. Rohstoffbasispreise bleiben Ausgangswerte für Förderung und Spielerhandel. Die globale Preisliste wird vor Implementierung des Absatzes aus den Rezepten reproduzierbar generiert; kein zusätzlicher willkürlicher Preisaufschlag neben dieser Formel.

Fraktionsmengen werden wertneutral auf das neue Produkt umgerechnet: `max(1, ceil(alte Rohstoffmenge × alter Rohstoffbasispreis / neuer Produktbasispreis))`. Die Produktart ersetzt die alte Rohstoffwährung auch in Anzeigen, Nachfrage und Questanforderungen. Ruf, Credits, Lizenzen und tatsächlicher Materialbau bleiben zusätzlich erforderlich.

## 9. Physische Module und Werften

### 9.1 Herstellung und Umgang mit normalen Modulen

Eingebaute Module bleiben mit ihren vorhandenen Fähigkeiten und Platzwirkungen erhalten. Nach Ausbau entsteht ein wiederverwendbares physisches Modul, keine automatische 50-%-Erstattung. Ein verpacktes Modul benötigt zunächst 30 normale Frachteinheiten; geschirmter Überlauf ist wie bei anderer normaler Fracht zulässig. Verpackte Module erzeugen keine zusätzliche nutzbare Kammer oder Passagierkapazität.

Eigene Lager und Händler haben tatsächliche Stückbestände. Einbau verbraucht ein vorhandenes Exemplar; Ausbau erzeugt genau dieses Exemplar. Transport, Verkauf, Studium und Einbau dürfen nicht gleichzeitig über dasselbe Modul verfügen. Verkauf erfolgt an reale Käufer mit Budget, nicht als unbegrenzte garantierte Erstattung.

| Modul | Material je Exemplar | Fertigungszeit | Grundfreischaltung / Studienquelle |
|---|---|---|---|
| Passagierkabine | 8 P, 4 Kunststoff, 2 Textilien | 60 s | Grundbauplan nach H06; einfache Modulwerkbank; keine Studienvorlage nötig |
| Geschirmte Kammer | 8 P, 4 Glas, 2 Hydrauliköl | 60 s | Grundbauplan nach H06; einfache Modulwerkbank; keine Studienvorlage nötig |
| Säureextraktor | 4 Legierungen, 2 M, 2 Kühlmittel | 90 s | Einmaliges Bergungsprojekt nach H09 |
| Sensorphalanx | 4 Sensoren, 2 Computer, 2 Energiezellen | 90 s | Einmaliges Archiv-/Bergungsprojekt nach H09 |
| Gaskollektor | 6 Legierungen, 2 M, 2 Sensoren | 90 s | Einmaliges Forschungsprojekt nach H10 |
| Tiefbohrer | 8 Legierungen, 4 M, 2 Roboter | 120 s | Einmaliges Forschungsprojekt nach H10 |

Grundmodule werden an der einfachen Modulwerkbank ohne gefahrgutabhängige Baustoffe hergestellt. Die Forschungswerkstatt bindet für fortgeschrittene Fertigung 6 Energie und 4 Fachkräfte; das Forschungszentrum ermöglicht alle weiteren Baupläne. Studien verbrauchen ein tatsächlich vorhandenes Exemplar und dauern höchstens 120 s. Die oben genannten Bergungsprojekte liefern eine einmalige, registrierte Studienvorlage pro Spieler, keine frei wiederholbare Belohnung. Exemplare können alternativ von anderen Spielern gekauft werden. Ein freigeschalteter Bauplan ersetzt keine fehlenden Zutaten; Kollektor und Tiefbohrer können daher erst nach Aufbau ihrer realen Komponentenfertigung gebaut werden.

### 9.2 Schiffe und öffentliche Angebote

Öffentliche Werften erhalten begrenzte registrierte Einstiegsschiffe; spätere Schiffe werden aus real gelieferten bestehenden Schiffbaumaterialien gebaut. Öffentliche Modulhändler beziehen Nachschub aus Spielerherstellung oder ausdrücklich registrierten begrenzten Anfangs-/Questfunden, nicht aus eigener allgemeiner Modulfertigung.

Fraktionsschiffe verlieren das unbegrenzte virtuelle Dauerangebot. Jede verkäufliche Einheit hat einen realen Bau-/Bestandszustand. Für alle regulären und Fraktionsschiffe gilt als konkrete Materialvorgabe die bestehende Funktion `buildMaterials(type)` in `shared/ships.js`: Materialwert = Katalogpreis / 1,25; Mengen = mindestens 1, ansonsten gerundeter Wertanteil / Warenbasispreis. Klassenprofile S: 45 % Platten, 20 % Elektronik, 20 % Barren, 15 % Schiffstreibstoff; M: 40 % Platten, 25 % Elektronik, 15 % Kabel, 20 % Rumpfsegmente; L: 30 % Rumpfsegmente, 30 % Schiffsbauteile, 15 % Reaktorkerne, 25 % Triebwerke; XL: 40 % Schiffsbauteile, 25 % Reaktorkerne, 15 % Triebwerke, 20 % KI-Kerne; F: 40 % Schiffsbauteile, 30 % Reaktorkerne, 30 % KI-Kerne. Diese Formel bestimmt für jeden existierenden Typ eine konkrete Liste, ohne ein neues unbestimmtes Basisschiffprofil auszuwählen.

Die veredelte Fraktionszahlung kommt zusätzlich vom Käufer, während die Werft den eigentlichen Materialbau aus ihren Beständen finanziert. Sie wird nicht ein zweites Mal als frei erzeugte Produktionszutat verbucht. Keine Bestellung darf durch bloße Bezahlung fehlendes Material erzeugen. Schiffbauzeiten bleiben S 40 s, M 90 s, L 240 s, XL/F 600 s.

Die wiederaufgebauten Orbitalringe der Ruinenwelt besitzen getrennte kleine und große Schiffbaustufen. Kleine Stufe erlaubt zunächst S/M-Bau, große Stufe nach Ausbau L/XL; individuelle Lizenz- und besondere Fraktionsvoraussetzungen gelten weiter. Vorhandene reguläre Schiffbauzeiten bleiben Ausgangswerte, solange kein neuer Orbitalbauabschnitt die zehn Minuten überschreitet.

| Orbitalanlage | Ort / Baukosten | Betrieb | Baukapazität |
|---|---|---|---|
| Kleiner Ring | Eigener zentraler Orbitalanker, kein regulärer Bodenbauplatz; H08 liefert die gesamten Wiederaufbaumaterialien und das Infrastrukturschiff | 20 Energie, 8 einfache Kräfte, 6 Fachkräfte | Ein realer S/M-Bauauftrag gleichzeitig |
| Großer Ring | Erweiterung desselben Orbitalankers; H15 liefert die gesamten Erweiterungsmaterialien | Zusätzlich 60 Energie, 10 Fachkräfte, 4 Spezialisten | Zusätzlich ein realer L/XL-Bauauftrag gleichzeitig |

Ein Orbitalauftrag reserviert Bauplatz, Materialien und Ausgabeziel. Personal oder Energie nur während tatsächlicher Fertigung binden; bestehende Schiffe im Angebot bleiben reale Bestände. Auf der Oberfläche sind Ringzustand und Auswahl zugänglich, ohne zusätzliche industrielle Bodenplätze zu erzeugen.

## 10. Leitstellen, manuelle Steuerung und Logistik

### 10.1 Abdeckung und Ausbau

| Level | Gebiet | Ausgangskosten | Bauzeit |
|---|---|---|---|
| 0 | Keine Schiffsautomatisierung | Vorhandene unbrauchbare Ruine | — |
| 1 | Eigenes Sonnensystem | 500 Cr, 4 B | 30 s |
| 2 | Gesamter eigener Hexsektor | 8.000 Cr, 10 P, 4 Kabel | 60 s |
| 3 | Eigener Sektor + ein Hexring | 30.000 Cr, 20 P, 10 E, 2 Computer | 120 s |
| 4 | Eigener Sektor + zwei Hexringe | 45.000 Cr, 26 P, 13 E, 3 Computer | 120 s |
| n ≥ 3 | Eigener Sektor + n−2 Hexringe | 30.000 × 1,5^(n−3) Cr; Materialbasis von Level 3 × 1,3^(n−3), Mengen aufrunden | min(180, 120 + 15 × (n−3)) s |

Es gibt keine niedrige feste Obergrenze; genügend weitere Stufen ermöglichen langfristige Expansion. Zahlen müssen auch bei hohen Stufen sicher darstellbar bleiben. Ein einzelner Levelausbau erzeugt keine unvertretbaren Pflichtwartezeiten.

Gebietsdefinition: Sektoren sind vollständige Hexflächen einschließlich des Leerraums zwischen besiedelten Kreisen. Level 1 umfasst eine klar angezeigte Systemzone um den Stern, die sämtliche lokalen Objekte und deren reguläre Transferwege enthält; Ausgangswert Systemobjekt-Ausdehnung plus 1.000 Einheiten Rand. Die Zone ist mit der tatsächlichen Systemgenerierung abzugleichen.

Eigene Leitstellen vereinigen ihre Gebiete. Normale Versorgungswelten und Konsortiumsbesitz erzeugen keine fremd nutzbare Abdeckung. Mitgliedschaft teilt das Netz nicht. Für Fernverwaltung gemeinsamer gewöhnlicher Besitztümer braucht jedes Mitglied eigene Abdeckung und passende Rechte.

Betrieb je Leitstelle: `2 + Level` Energie, zwei einfache Kräfte und ab Level 2 zwei Fachkräfte; ab Level 4 zusätzlich `floor(Level / 4)` Spezialisten. Ausgangskapazität: `4 + 4 × Level` gleichzeitig verwaltete Transportaufträge. Bestehende Schiffslizenzgrenzen bleiben zusätzlich bestehen.

Funktionsmodule: Disposition (10.000 Cr, 8 E, 60 s) aktiviert bedarfsabhängige Versorgung; Produktionsplanung (20.000 Cr, 4 Computer, 90 s) verbindet Rezeptziele und Bedarf; Absatzplanung (20.000 Cr, 4 Computer, 90 s) verteilt Überschüsse. Je Modul 2 Energie und 2 Fachkräfte. Weitere Kapazitätsmodule erhöhen je Modul die gleichzeitigen Aufträge um acht, kosten zunächst 15.000 Cr und 6 E, Kostenfaktor 1,5 je Wiederholung, Bauzeit 90 s.

### 10.2 Befehle, Wurmlöcher und Abdeckungsverlust

- Außerhalb eigener Abdeckung gibt es genau ein aktiv manuell gesteuertes Schiff für neue unmittelbare Flug-, Dock-, Handels- oder Bergbauaktionen. Die Wahl dieses Schiffs verleiht keinen Geschwindigkeitsbonus. Es muss nicht das Reliktschiff sein.
- Keine angehängten Mehrfachbefehle, wiederholten Routen oder vorbereiteten Handelsketten außerhalb der Abdeckung. Laufende einzelne manuelle Flüge dürfen ihr Ziel erreichen. Die Oberfläche zeigt das aktive manuelle Schiff eindeutig.
- Innerhalb der Abdeckung dürfen reguläre Flottenaufträge und erlaubte Queues laufen. Der Reliktträger bleibt auch dort von Automatisierung ausgeschlossen.
- Ein automatischer Flug benötigt durchgängige Abdeckung aller normalen Teilstrecken. Bekannte Wurmlöcher dürfen abgedeckte Ein- und Austritte verbinden; für ihren Transit ist kein geometrischer Zwischenraum abzudecken.
- Vor jedem neuen automatischen Abschnitt wird Abdeckung geprüft. Bei einer Änderung darf ein bereits begonnener Abschnitt sicher bis zum nächsten Ziel fertigfliegen. Danach pausiert das Schiff, falls die Fortsetzung unzulässig ist.
- Lokal eingerichtete Produktion und Reserven bleiben außerhalb der Abdeckung wirksam; neue Fernänderungen benötigen Abdeckung oder manuelle Anwesenheit vor Ort.
- Unterversorgung reduziert die Bearbeitung neuer Aufträge, nicht die bereits freigeschaltete Reichweite. Bereits zugesagte Versorgungsaufträge dürfen sich nicht gegenseitig durch einen Ausfall der Leitstelle blockieren.

### 10.3 Leitstellenaufträge

Versorgung nutzt Zielbestand, zulässige Quellen, Preisgrenze, Budget und Priorität. Produktion nutzt Zielmenge, Rezept, Reserven und verfügbare Kapazität. Absatz nutzt freien Überschuss, Mindestpreis, erlaubte Zielgebiete und zugewiesene Schiffe.

Die Disposition berücksichtigt reservierte Lagerware, bereits gekaufte Waren und laufende Lieferungen. Sie darf Teilmengen und erlaubte Alternativquellen nutzen, aber keine Preis-, Geld- oder Reichweitengrenze überschreiten. Notkäufe brauchen eine vom Spieler gesetzte begrenzte Zusatzfreigabe.

Aufträge zeigen nachvollziehbare Zustände: geplant, reserviert, in Abholung, unterwegs, geliefert, pausiert oder abgebrochen. Abbruch und Fehlversuche dürfen keine Ware duplizieren oder Reservierungen dauerhaft sperren. Eine unveränderte Störung erzeugt keine fortlaufenden neuen Warnungen.

## 11. Allgemeine Routen- und Frachtregeln

### 11.1 Kaufmengen sind Zielbestände der jeweiligen Ware

Eine Routen-Kaufaktion kauft `max(0, Zielbestand − vorhandene Menge dieser Ware an Bord)`. Vorhandene Menge umfasst alle geeigneten Laderäume. Die Menge ist kein Prozentwert und nicht der gesamte Schiffsfüllstand über unterschiedliche Waren.

- 30 Erz an Bord, Ziel 100: höchstens 70 hinzukaufen.
- 100 oder 120 Erz an Bord, Ziel 100: erfolgreiche Nullaktion, kein Kauf, Verkauf oder Fehlerzähler.
- Platz, Marktbestand, Preisgrenze, Budget und Mindestkontostand begrenzen den tatsächlichen Zukauf.
- Nach einem Teilkauf wird entsprechend dem bestehenden Routenverhalten weitergefahren, sofern keine eigene Wartebedingung eingerichtet ist.
- Leer/0 bedeutet wie bisher „so viel wie möglich“. Verkaufsaktionen bleiben zusätzliche Verkaufsmengen. Manuelle Einmalkäufe und einmalige Dockaufträge behalten ihre bisherige Mengenbedeutung.
- Dieselbe Zielregel gilt beim Routenladen aus eigenem beziehungsweise zugänglichem gemeinsamem Lager; der kostenlose Transfer bleibt kostenlos.
- Oberfläche: „Zielbestand an Bord“. Bestehende Routenvorlagen in Testwelten werden ausdrücklich auf die neue Semantik umgestellt; keine gemischte verdeckte Altsemantik.

### 11.2 Geschirmter Raum als Überlauf für normale Ware

Normale Handelsgüter belegen zuerst freien normalen Laderaum und anschließend freie geschirmte Kapazität. Beide Bereiche besitzen reale gemeinsame Belegung. Passagierkabinen öffnen sich dadurch nicht für Handelswaren.

- Normal 100 + geschirmt 30, leer: 120 normale Einheiten belegen 100 normal und 20 geschirmt; zehn geschirmt bleiben frei.
- Bei 20 Gefahrguteinheiten in der Kammer bleiben höchstens 110 normale Einheiten Gesamtkapazität.
- Ohne normalen Laderaum darf vorhandene geschirmte Kapazität normale Ware aufnehmen.
- Teilentladung ordnet verbleibende normale Ware soweit möglich wieder dem normalen Bereich zu. Anzeige, Prüfung und Persistenz müssen dieselbe Belegung berechnen.
- Gefahrgut darf nur in geeignete Bereiche. Die vorhandene Stahlkoloss-Fähigkeit bleibt erhalten; dort konkurriert erlaubtes Gefahrgut tatsächlich mit normaler Fracht um den freigegebenen Raum.
- Vor Modulabbau wird die hypothetische neue Kapazität geprüft. Unzulässiger Ausbau wird mit konkreter Begründung verhindert; legale Umsortierung wird berücksichtigt. Keine Fracht wird gelöscht.
- Laden, Handel, Eigentümertransfer, Bergbau, Module als verpackte Fracht, NPC-Ausnahmen und Anzeigen verwenden dieselbe verbindliche Kapazitätslogik.

## 12. Spezialisierte Welten und Eigentum

Alle Ruinenwelten bleiben persönlich gebunden, unverkäuflich und nicht an Konsortien übertragbar. Gewöhnlicher Besitz folgt weiterhin Gouverneurslizenzen und Konsortiumsrechten. Ruinenwelten zählen nicht gegen deren klassische Objektobergrenzen. Die Heimatwelt benötigt diese Lizenz weder für Besitz noch Aufbau.

Die Gouverneurslizenz behält für gewöhnlichen Besitz zunächst die vorhandenen Preise und Grenzen 1/3/6/10/16/25. Die entfallene Freischaltung „Fabrikstation kaufen“ wird auf Rohstoffbetriebe/Förderstationen bezogen; ab Stufe 3 sind gewöhnliche Planeten erwerbbar. Persönliche Ruinenexpansion benötigt stattdessen ihre eigenen Projekte.

| Planetentyp | Zulässige Schwerpunkte; keine Verarbeitung |
|---|---|
| Agrar | Getreide, Biomasse |
| Ozean | Offshore-Rohöl, marine Biomasse |
| Wüste | Silikat, Schwefel |
| Bergbau | Massenerz, Kristalle, Seltene Erden |
| Eis | Eisförderung |
| Gasriese | Rohgas, Helium-3 |
| Dschungel | Biomasse, Rohöl |
| Vulkan | Schwefel, Seltene Erden, Säure |
| Metropole | Hive World, Ausbildung/Fachkräfte |
| Paradies | Tourismus, hochwertiger ziviler Absatz |
| Kolonie | Besiedlung, Wachstum, Anwerbung |
| Bisherige Industriewelt | Logistik, hoher technischer Bedarf; keine Warenverarbeitung |

Ausgangsausbau für eine gewählte Rohstoffrichtung: Förderbetrieb I (25.000 Cr, 20 P, 4 M, 120 s, Faktor 1,5), Förderbetrieb II (75.000 Cr, 8 M, 4 Roboter, 180 s, Faktor 2,0), Tiefen-/Spezialerschließung III (200.000 Cr, 12 M, 8 Roboter, 2 KI-Kerne, 180 s, Faktor 3,0). Faktoren gelten jeweils gegenüber dem natürlichen Ausgangsprofil, nicht als zusätzlich gestapelte Multiplikatoren. Jede Stufe erhöht Personal-/Energie- und Betriebsmittelbedarf: 10/25/60 Energie, 10/20/40 einfache und 2/4/8 Fachkräfte; 2/5/10 M sowie 1/2/4 Roboter pro Stunde als abstrakter verschleißbedingter Warenbedarf. Rohstoffausstoß und Verschleiß sind vor Freigabe gemeinsam auf wirtschaftlichen Nutzen zu simulieren.

Hive-Ausbau I/II/III: 50.000/150.000/400.000 Cr; 2/6/16 Habitatmodule und 4/10/24 M; jeweils 180 s; Wohnkapazität 2.000/10.000/50.000. Energie 20/80/300; Verwaltungspersonal 10/30/100 einfache Kräfte, 2/6/20 Fachkräfte und 0/2/5 Spezialisten. Die Werte gelten pro erreichtem Ausbauzustand, nicht zusätzlich gestapelt. Bevölkerung selbst entsteht weiterhin nur durch Wachstum oder Zuwanderung. Dichte erhöht Infrastrukturbedarf, erzeugt keine sofortigen Einwohner.

Weitere Schwerpunktbauten kosten je Ausbau I/II/III 50.000/150.000/400.000 Cr, dauern jeweils 180 s und besitzen folgende konkrete Ausgangswerte. Auch hier gelten Wirkung und Betrieb je erreichtem Zustand, nicht als Summe sämtlicher Stufen.

| Schwerpunkt | Material I / II / III | Wirkung I / II / III | Energie I / II / III | Personal einfach; Fach; Spezial je Stufenfolge |
|---|---|---|---|---|
| Ausbildung | 12 P + 6 E / 4 Computer + 4 Roboter / 10 Computer + 10 Roboter + 2 KI-Kerne | Schulkapazität ×2 / ×3 / ×4 bei unveränderter Zeit je Lerngruppe | 8 / 20 / 50 | 2/4/8; 4/8/16; 0/2/4 |
| Tourismus | 8 P + 4 Textilien + 2 E / 20 P + 8 Kleidung + 4 E / 10 Habitatmodule + 10 Luxusgüter + 4 Medizintechnik | 100 / 300 / 1.000 zusätzliche Besucherplätze | 8 / 20 / 60 | 10/25/60; 2/4/8; 0/0/2 |
| Logistik | 20 P + 8 E / 10 M + 8 Computer / 20 M + 10 Roboter + 4 KI-Kerne | 4 / 8 / 16 zusätzliche Abfertigungen und 1.000/2.000/4.000 Einheiten/min Umschlag | 10 / 25 / 60 | 10/20/40; 2/6/12; 0/0/2 |

Kolonieschwerpunkt verwendet die Wohnblock-/Schulgebäude ohne zusätzliche Verarbeitungsrezepte. Ein Besiedlungsbüro kostet 25.000 Cr, 12 P und 4 E, Bauzeit 120 s, Betrieb 4 Energie und 4 Fachkräfte; es verdoppelt die Wachstumsobergrenze auf 200 Einwohner pro Stunde und zeigt reale Anwerbeangebote an. Die prozentuale Wachstumsrate bleibt 2 %, Anwerbung benötigt tatsächlich verfügbare Herkunftsbevölkerung.

Ein Schwerpunktwechsel dauert 180 s, kostet 25 % des festen Spezialisierungs-Ausbauwerts und gibt keine verbrauchten Materialien zurück. Er ändert nicht den natürlichen Planetentyp. Während des Umbaus pausiert der betroffene Spezialbetrieb, nicht die gesamte Welt. Vorhandene Bevölkerung und ihre Versorgung bleiben bestehen.

Questgeberlevel verändern nur Questschwierigkeit und Angebot. Produktion, Lager und Bevölkerung wachsen ausschließlich durch konkrete Infrastruktur und Versorgung; bisherige automatische Fertigwarenfreischaltungen entfallen.

## 13. Hauptquests und Fortschrittsbaum

### 13.1 Regeln

Heimatquests besitzen einen eigenen Fortschrittskanal neben dem normalen Questplatz. Nach dem gemeinsamen Anfang sind mehrere Zweige parallel bearbeitbar. Teilmengen, selbst produzierte Ergebnisse und aufsummierte erfolgreiche Betriebszeit bleiben gespeichert; Unterbrechung setzt sie nicht zurück. Keine täglichen Anwesenheitsfristen.

Materialien dürfen aus dem Heimatlager oder tatsächlich angedockten eigenen Schiffen abgegeben werden. Selbstproduktionsaufgaben zählen nachweisbare eigene abgeschlossene Produktionszyklen, keine eingekauften oder mehrfach umladbaren Waren. Betriebszeit zählt nur bei erfülltem Versorgungskriterium und wird nicht rückwirkend nach einem Serverstillstand erfunden.

Schiffsabgaben sind ausdrücklich als dauerhaft gekennzeichnet. Das Schiff wird aus der steuerbaren Flotte entfernt und als sichtbare Infrastruktur dokumentiert. Ein Schiff mit Reliktantrieb kann nicht abgegeben werden.

### 13.2 Konkreter Questkatalog als Ausgangsfassung

Materialanforderungen sind verbrauchende Lieferungen, sofern „Nachweis“ oder „Betrieb“ nicht ausdrücklich angegeben ist. Gebäude müssen zusätzlich nach ihren Tabellen errichtet werden; die Quest verlangt dieselben Baukosten nicht ein zweites Mal. Credits/XP sind einmalige Belohnungen, keine wiederholbaren Farmingquellen.

| ID / Titel | Voraussetzung und Ziel | Freischaltung / Ergebnis | Belohnung Cr / XP |
|---|---|---|---|
| H00 Ein Licht im Rauschen | Start; Heimat anfliegen und landen | Hauptquestkanal, Bewohnerkontakt | 0 / 10 |
| H01 Der erste sichere Landeplatz | H00; Dock reparieren | Lager, Startbestände, Bauverwaltung | 500 / 10 |
| H02 Wasser unter den Trümmern | H01; Wasser-/Nahrungsanlage reparieren, 20 Wasser und 10 Nahrung selbst produzieren | Versorgung, erste Bilanz | 1.000 / 20 |
| H03 Ein Netz aus Stimmen | H02; Leitstelle 1 und Treibstoffanlage reparieren, eine lokale Route einrichten | Lokale Automatisierung | 1.000 / 20 |
| H04 Bergung ohne Kennung | H02; markiertes nahes Wrack manuell erreichen, Fund zurückbringen | Relikt ×4, erste Antriebswerkstatt | 0 / 25 |
| H05 Ein zweites Paar Hände | H03; 10 min aufsummiert Wasser/Nahrung bereitstellen | Einmaliger zweiter Spatz, erstes Logistikkapitel abgeschlossen | 500 / 15 |
| H06 Feuer und Metall | H03; Brennstoff-/Barrenanlage reparieren, 40 Barren selbst herstellen | Baugruppe II, Grundmodulbaupläne/-werkbank, erste Gefahrgutlagerfreigabe | 3.000 / 35 |
| H07 Mehr als eine Werkstatt | H06; Schule betreiben, zehn zusätzliche Fachkräfte ausbilden, 40 Platten und 20 Kabel selbst herstellen | Baugruppe III | 5.000 / 50 |
| H08 Der gebrochene Ring | H07; 100 P, 40 E, 10 Rumpfsegmente liefern; einen Spatz dauerhaft abgeben | Kleiner Orbitalring, S/M-Werft; 600 s Bauabschnitt | 10.000 / 80 |
| H09 Stimmen aus dem Archiv | H07; Forschungswerkstatt errichten, zehn Sensoren liefern, Archivstelle manuell besuchen | Baugruppe IV; Säure-/Sensor-Bergungsprojekte | 8.000 / 60 |
| H10 Wert unter der Oberfläche | H09; eine Sonderveredelung errichten und zehn ihrer Produkte selbst herstellen | Weitere Veredelung, Kollektor-/Bohrer-Bergungsprojekte | 12.000 / 80 |
| H11 Ein Ort zum Leben | H07; 250 Einwohner, 30 min aufsummiert volle Grundversorgung, Wohnraum nachweisen | Bevölkerungsausbau, Spezialisierungsberatung | 8.000 / 60 |
| H12 Werkzeuge für eine andere Zeit | H09; Forschungszentrum, 20 Roboter und zehn Computer liefern | Baugruppe V, große Projekte | 20.000 / 100 |
| H13 Ein zweiter Anfang | H10, H11, H12; zweiten Ruinenstandort erkunden; 100.000 Cr, 100 P, 20 M, 4 Habitatmodule liefern; 20 eigene Auswanderer mit passender Kabine anliefern und einen Spatz als Expeditionsschiff abgeben | Erste zusätzliche persönliche Ruinenwelt; 300 s Aufbau | 0 / 150 |
| H14 Die Sprache der Schaltkreise | H12, H13; 20 Computer, zehn veredelte Exokristalle liefern; weitere Archivstelle besuchen | Relikt ×5 | 0 / 120 |
| H15 Ein Ring für große Schiffe | H08, H12; 100 Legierungen, 30 Schiffsbauteile, zehn Triebwerke, vier Reaktorkerne liefern | Große L/XL-Werft; zwei Abschnitte à 600 s | 30.000 / 150 |
| H16 Koordinaten einer Heimat | H13; zwei eigene Leitstellen nachweisen, 20 Energiezellen und zehn Computer liefern | Warpservice und reguläre weitere Ruinengründungen | 0 / 100 |
| H17 Was zwischen den Zeilen bleibt | H14, H15; 20 KI-Kerne, zehn stabilisierte Antimaterie liefern; persönliche Expedition | Relikt ×6 | 0 / 200 |

Zeitziel: H03/H05 und erste kleine Produktions-/Handelsautomatisierung in 30–60 aktiven Minuten, H08 in 4–8 aktiven Stunden, H13 in 20–30 aktiven Stunden. Nicht jeder Zweig muss zuvor vollständig erledigt werden. H13 darf Material von anderen Spielern nutzen; verlangte Eigenproduktion bleibt ausdrücklich benannt.

Normale Questbelohnungen und das vorhandene Pilotenlevelsystem bleiben Ausgangspunkt. Manuelle Handels-XP hängen an persönlicher manueller Transaktion, nicht am Relikt; bestehendes Stundenlimit bleibt. Automatischer Handel gibt keine solchen XP. Normale Beschaffungsquests dürfen nur sinnvoll beschaffbare Waren verlangen und müssen tatsächliche Lieferungen dem vorgesehenen Bedarf oder Bestand zuführen.

Bei normaler NPC-Beschaffung dürfen öffentlich zugängliche Spielerangebote und eigene reale Produktion als Bezugsquellen dienen. Der NPC bleibt tatsächlicher Questgeber und Empfänger; selbst ausgestellte beziehungsweise rein innerhalb desselben eigenen Bestands zirkulierende Lieferungen erzeugen keine normalen Questbelohnungen. Ein pauschaler Ausschluss sämtlicher Spielerquellen wäre mit der neuen Warenherkunft unvereinbar.

### 13.3 Bilddialoge und Entscheidungen

Wiederkehrende Kontakte: Hafenmeisterin Mira (Logistik), Ingenieur Tarek (Industrie/Orbitalring), Sprecherin Nela (Bevölkerung), Archivarin Iven (Forschung/Relikt). Namen sind austauschbare Inhaltswerte; Rollen und wiederkehrende Beziehungen sind verbindlich.

| Szene | Bild und Dialogkern | Handlung / erkennbare Folge |
|---|---|---|
| H00 | Beschädigte Funkübertragung, beleuchtete Inseln einer bewohnten Ruinenstadt. Mira: „Wir sehen dein Signal. Der alte Landeplatz hält noch – wenn du uns herunterfindest.“ | Kurs zur Heimat; später nachlesbar |
| H02 | Menschen vor stillen Pumpen. Nela: „Wir brauchen zuerst verlässliches Wasser. Dann können wir wieder mehr als nur durchhalten.“ | Versorgungsvorschau öffnen; keine versteckte zusätzliche Warenabgabe |
| H04 | Vertraut wirkende menschliche Schrift an unbekannter Technik. Iven: „Die Zeichen passen zu keiner unserer Datenbanken. Aber die Anordnung … jemand hat hier für Menschen gebaut.“ | Fund bergen; Herkunft bleibt unbewiesen |
| H08 | Arbeiter vor gebrochenen Ringsegmenten. Tarek: „Wir können wieder Schiffe bauen. Der erste Abschnitt braucht mehr als Metall: einen Frachter, der hierbleibt.“ | Dauerhafte Schiffsabgabe ausdrücklich bestätigen |
| H11 | Entstehendes Wohnviertel neben Industrie. Nela: „Mehr Wohnungen oder zuerst bessere Versorgung? Beides geht. Nur nicht mit demselben Material zur gleichen Zeit.“ | Sichtbare Reservierungspriorität wählen; kein dauerhafter Funktionsverlust |
| H13 | Sternkarte und Expeditionsteam. Mira: „Ein zweiter Standort ist keine zweite Abkürzung. Er braucht sein eigenes Netz.“ | Gründungskosten und Abdeckung vorab zeigen |
| H17 | Geöffnete Archivstruktur, fragmentierte menschliche Aufzeichnung. Iven: „Ein Absender. Kein Datum, dem ich trauen würde. Ob dort noch jemand ist, sagt uns das nicht.“ | ×6 freischalten; keine neue Zivilisationsfraktion |

Entscheidungen ändern zunächst Projektprioritäten, kleine nachvollziehbare Kostenvarianten oder Beziehungen. Varianten dürfen höchstens 10 % der ausgewiesenen Projektkosten verändern und keine zentrale Funktion dauerhaft sperren. Dialoge sind überspringbar und im Journal nachlesbar; automatische Lieferungen warten nicht auf Dialogklicks.

## 14. Reliktzustand, weitere Standorte und Relokation

### 14.1 Einzigartiger Antrieb

Vor Abschluss von H04 ist kein nutzbarer Antrieb verfügbar. Die einmalige Erstbergung führt einen eindeutig registrierten, versiegelten Questfund vom Wrack zur Heimatwerkstatt; dieser ist keine verkäufliche Fracht und kann nicht anderweitig abgeladen werden. Erst bei Abschluss in der Heimatwerkstatt wird daraus der nutzbare Antrieb, zunächst dort eingelagert. Diese einmalige Fundphase erlaubt keinen späteren Transport eines ausgebauten Antriebs.

Nach Freischaltung existiert genau ein Exemplar je Spieler. Zustände sind ausschließlich `eingebaut in Schiff X` oder `eingelagert auf persönlicher Ruinenwelt Y`. Das sind atomare Zustandswechsel; doppelte Anfragen erzeugen kein zweites Exemplar.

Der Antrieb belegt keinen Frachtraum oder Modulplatz und verbraucht keinen Treibstoff oder laufende Betriebsmittel. Geschwindigkeit ×4, nach H14 ×5, nach H17 ×6, jeweils auf den regulär berechneten Schiffswert. Seine Störungen verhindern zuverlässige Leitstellenverbindung: keine Routen, automatischen Bergbauaufträge oder sonstigen selbstständigen Leitstellenaufträge für den Träger.

Ein-/Ausbau ausschließlich an freigeschalteter Antriebswerkstatt eigener Ruinenwelten, jeweils 15 s ohne Materialkosten. Nur das betreffende Schiff muss vor Ort sein. Ausgebaut bleibt der Antrieb an genau dieser Welt, bis ein dort befindliches Schiff ihn einbaut. Keine Verladung, kein Lagertransfer, Handel, Verkauf, Recycling oder Duplizieren. Ein Trägerschiff muss vor Abgabe oder Verkauf den Antrieb ausbauen. Ein eingelagerter Antrieb bleibt bei Relokation derselben Welt zugeordnet.

### 14.2 Weitere Ruinenwelten

H13 erschließt die erste zusätzliche Welt. Danach werden unbewohnte Ruinenwelten entdeckt und per Expedition erworben beziehungsweise gegründet; keine Herstellung künstlicher Planeten. Standortvorkommen erzeugen vor der Gründung weder fertige Industrieprodukte noch unbegrenzt plünderbare Einstiegspakete.

Reguläre Folgegründung: Ausgangswert 250.000 Cr × 1,6^k, wobei k=0 für die erste reguläre Gründung nach H13 gilt; zusätzlich 100 P, 20 M, vier Habitatmodule und zehn Computer, Mengenfaktor 1,25^k, aufrunden. Dazu 20 tatsächlich transportierte eigene Auswanderer. Ein Expeditionsspatz wird dauerhaft übergeben; ein anderes verfügbares Schiff ermöglicht die Weiterreise. Ein Reliktträger kann niemals das abgegebene Schiff sein. Aufbau 300 s.

Jede weitere Ruinenwelt erhält aus den tatsächlich verbrauchten Gründungsmaterialien ein Dock mit 2.000 normalen/100 zertifizierbaren Gefahrgut-Lagereinheiten, 100 Wohnplätze, 12 Grundenergie und eine unbrauchbare Leitstelle 0. Ihre 20 Einwohner werden dem realen Herkunftsbestand entnommen; Qualifikation bleibt erhalten. Sie beginnt mit acht freien Bauplätzen, keinen Gratiswaren und keinen fertig arbeitenden Produktionsanlagen. Sie erhält nicht erneut die kostenlosen Schiffe, Modulvorlagen oder den Antrieb der ersten Heimat. Ihre Industrie wird aus dem vorhandenen Imperium aufgebaut; ein zweites vollständiges Einsteiger-Tutorial ist nicht erforderlich.

### 14.3 Warpservice

Ausgangsformel: `250.000 Cr + 0,20 × fester Standortwert + 1,0 × Basiswert mitgeführter Waren und verpackter Module`. Fester Standortwert umfasst registrierte Grundstücksbasis und tatsächlich errichtete Gebäude-/Ausbaukosten, nicht aktuelle Lagerpreise oder selbst gesetzte Verkaufspreise. Gebundene Bevölkerungs-/Verwaltungsfortschritte sind im Standortwert enthalten; der einzigartige Antrieb ist keine bewertbare Handelsfracht.

Ziel muss erschlossen, geeignet, frei und vom Spieler gewählt sein. Vorschau zeigt Preisbestandteile, mitgeführte Bestände, Ziel, neue Abdeckung und betroffene Routen/Welten. Bestätigung reserviert die Kosten und startet fünf Minuten Vorbereitung. In der Vorbereitung dürfen keine Bestandsänderungen die bestätigte Frachtbewertung umgehen: Der Standort pausiert und sperrt Ein-/Auslieferungen sowie Bau- und Ein-/Ausbauten bis zum Transfer. Die Vorschau nennt diese Sperre ausdrücklich.

Vor Beginn müssen angedockte Schiffe starten. Es werden keine Flottenschiffe mitgenommen. Anfliegende Frachter erhalten eine sichere Zielkorrektur beziehungsweise pausieren nach dem begonnenen Abschnitt. Nach erfolgreichem Transfer gilt 24 h Serverlaufzeit Sperrfrist für diesen Standort. Serverneustart behält Vorbereitung und Sperrfrist; abgeschaltete Zeit wird nicht hinzugezählt.

## 15. Gezeichnete Oberfläche und bildschirmfüllendes Umfeld

### 15.1 Stil und Technik

Die interaktive schräge 2,5D-Ansicht mit Three.js, orthografischer Kamera, Gebäudeauswahl und geführten Kamerafahrten bleibt. Erscheinungsbild: Comic/Fantasy/Science-Fiction, gezeichnete Konturen, malerische Materialien und Texturen, lesbare technische Formen, charaktervolle Menschen, monumentale Ruinen und geheimnisvolle alte Menschentechnologie.

Vor Serienproduktion wird eine repräsentative Ruinenlandschaft mit Figur und Questszene als konkrete Stilprobe zur Beurteilung vorgelegt. Bestehende Low-Poly-Modelle sind Arbeitsgrundlage und Übergang, keine ungeprüfte endgültige Stilfreigabe. Die Schiffsdesigns bleiben außerhalb dieses Arbeitspakets.

Wiederaufbau und Spezialisierung ändern sichtbare Gebäudestände, Wohnviertel, Raumhafen, Industrie und Orbitalringe. Illustrationen dürfen die verständliche Auswahl, Statusanzeige und Textlesbarkeit nicht beeinträchtigen. Normale Handels-/Verwaltungsvorgänge bleiben schnell bedienbar.

### 15.2 Verbindliche Hintergrundregel

Der Planet darf beim Herauszoomen nicht wie ein ausgeschnittenes Modell auf einer im Nichts schwebenden Platte erscheinen. Die Landschaft setzt sich optisch in alle Richtungen bis über jeden sichtbaren Bildschirmrand fort. Dies vergrößert weder Baufläche noch Interaktionsbereich.

| Weltgruppe | Nicht spielbares Umfeld |
|---|---|
| Landwelten einschließlich Ruinen, Stadt, Bergbau, Wüste, Eis, Dschungel, Vulkan und Kolonie | Nahtlose Geländefortsetzung mit passenden Höhen, Materialien und vereinfachter Dekoration; keine sichtbaren abgeschnittenen Sockelwände |
| Ozean-/Paradieswelten | Durchgehendes Meer und passende Küsten; echte Inseln bleiben erlaubt, die Wasserplatte endet aber nie sichtbar vor leerem Hintergrund |
| Gasriese | Bildschirmfüllende, gestaffelte Atmosphäre/Wolkenschichten unter und hinter Plattformen; keine künstlich erzwungene feste Erdoberfläche |

Umfeld wird separat von spielbaren Anlagen, Ankern und Bauplätzen verwaltet. Es verändert weder Kamerafit noch Gebäude-Picking oder Wirtschaftsgeometrie. Statt extrem großer hochdetaillierter Modelle sind ausreichend ausgedehnte, niedrig detaillierte Fortsetzungen und angepasste Rendertechniken zulässig. Nebel oder eine einfarbige Fläche allein ersetzen keine passende Umgebung.

Aktuelle begrenzte Kameraführung bleibt Ausgangspunkt: Übersicht/Fokus, eingeschränktes Verschieben und Zoom. Jede zulässige Kombination muss abgedeckt sein, einschließlich Fokusfahrten und Größenänderung des Fensters. Die Kulisse muss bereits beim ersten sichtbaren Frame stehen; kein kurzzeitig sichtbarer Leerrand beim Laden.

Visuelle Prüfformate: 390×844, 1024×768, 1440×900, 1920×1080 und 2560×1080 sowie jeweils maximaler erlaubter Zoom nach außen, Schwenkgrenzen und unterbrochene Fokusfahrt. Gebäude und Text dürfen keine entscheidenden Details im gezeichneten Hintergrund verlieren.

Bestehende Assetprüfungen, die keine Bildtexturen oder genau drei Meshes verlangen, werden fachlich überprüft. Sie dürfen neue gezeichnete Materialien und separates Umfeld nicht verhindern. Bauanker, stabile Platzierung und eindeutige Spielfläche bleiben dagegen verbindliche Strukturprüfungen.

## 16. Speicherung, gemeinsame Umstellung und Nachvollziehbarkeit

Alle fachlichen Grenzen werden serverseitig validiert. Persistenz umfasst Bevölkerung/Qualifikation, Besucher, Lager samt Modulen, Reservierungen, Produktion, Bauaufträge, Hauptquests, Leitstellen, Transit, Kassen, Antriebszustand und Warpfristen. Wiederholte Anfragen dürfen keine doppelte Abgabe, Belohnung, Lieferung oder Antriebserzeugung bewirken.

Die neue Welt wird zunächst getrennt getestet und nach fachlicher Abnahme als vollständig frische Welt gestartet. Nach ausdrücklicher Nutzerentscheidung vom 2026-10-24 sind Sicherung/Wiederherstellung des alten Spielstands, Migration und Altkompatibilität keine Abnahmevoraussetzungen mehr.

Entwicklungsstarts verwenden einen getrennten Datenpfad beziehungsweise In-Memory-Betrieb für reproduzierbare Tests. Die in U3 angelegte Profilprüfung bleibt als Schutz gegen versehentlich vermischte Entwicklungswelten erhalten; weitere Altkompatibilitätsarbeit entfällt.

Es gibt keine Übernahme von Altbesitz und keine Kompensationspflicht. Temporäre Tests nutzen eigene Datenbanken oder In-Memory-Zustände; die neue Welt enthält ausschließlich ihren eigenen Anfangszustand.

## 17. Arbeitsplan und Fortschritt

PRD 4 bleibt historische Grundlage. Fortschritt wird ab jetzt hier geführt. Jeder sinnvoll abgeschlossene Schritt bekommt passende Prüfungen und einen eigenen Commit zusammen mit seiner Fortschrittsaktualisierung. Nur zugehörige Änderungen aufnehmen; keine automatische Veröffentlichung oder Push.

| Schritt | Ergebnis | Voraussetzungen | Status |
|---|---|---|---|
| D0 | Review, Interview, konkretes PRD 5 | Q34–Q66 | Abgeschlossen (`4d41b19`) |
| U1 | Zielbestandskäufe auf Routen, klare Texte, Null-/Teilkaufregeln | Umsetzungsbeginn | Abgeschlossen |
| U2 | Geschirmter Frachtüberlauf, konsistente Belegung und Modulabbauprüfung | U1 unabhängig möglich | Abgeschlossen (verpackte Module folgen U10) |
| U3 | Neue Weltversion, getrennte Testwelt, Bestands-/Warenquelleninventar, zentrale Werte | Vor großen Systemänderungen | Abgeschlossen |
| U4 | Bildschirmfüllendes Umfeld für vorhandene Planeten und zusätzliche visuelle Abnahme | U3; keine Wirtschaftsabhängigkeit | Abgeschlossen |
| U5 | Neue Ruinenwelt, Startverteilung, Hauptquestkanal und sicherer Anfang H00–H06 | U3, erste Stilprobe | Abgeschlossen; H04 in U6 ergänzt |
| U6 | Reliktzustand, Werkstatt, manuelle Präsenz und Handels-XP | U5 | Abgeschlossen |
| U7 | Bevölkerung, Energie, Bauzeiten, Qualifikation, Lager und Reserven | U2, U5 | Abgeschlossen |
| U8 | Leitstellenabdeckung, Wurmlochregeln, Befehlsprüfung, frühe Automatisierung | U1, U6, U7 | Offen |
| U9 | Vollständige Warenherkunft, echte NPC-Kassen/Transporte, keine öffentliche Verarbeitung | U3, U5, U7, U8 | Offen |
| U10 | Physische Module, Rezepte, Studie und reale Werft-/Fraktionsbestände | U2, U7, U9 | Offen |
| U11 | Sechs Sonderveredelungen und neue Fraktionswährungen | U7, U9, U10 | Offen |
| U12 | Bedarfsgesteuerte Disposition, Produktions- und Absatzaufträge | U8–U11 | Offen |
| U13 | Spezialisierungen, geänderte Questgeber-/Besitzprogression und Besucher | U7, U9 | Offen |
| U14 | Vollständige Hauptquestzweige, Orbitalringe, Forschung und Reliktverbesserungen | U10–U13 | Offen |
| U15 | Weitere Ruinenwelten, gemeinsames eigenes Netz, Warpservice | U8, U12–U14 | Offen |
| U16 | Gezeichnete Assets/Bilddialoge und sichtbare Entwicklungsstände vollständig | Stilprobe ab U5; begleitet alle Fachschritte | Offen |
| U17 | Gesamtsimulation, Mehrspieler- und visuelle Abnahme, Balance, frischer Weltstart | U1–U16 | Offen |

Öffentliche Fabriken dürfen nicht vor einem nachweislich funktionierenden Einstieg und Warenversorgung abgeschaltet werden. Zwischenstände bleiben in Testwelten, bis ihre abhängigen Systeme zusammen funktionieren. Stilprobe und Bilddialogtechnik werden früh eingeführt; U16 ist die Vollständigkeitsprüfung, kein Aufschieben sämtlicher Gestaltung.

## 18. Abnahme und Prüfplan

| ID | Verbindlicher Nachweis |
|---|---|
| A01 | Mehrere gleichzeitig und später beitretende Spieler erhalten getrennte Heimatwelten außerhalb des Ursprungssektors, gültige Abstände und erreichbare Grundressourcen. Erweiterung der Suchringe funktioniert ohne Überschneidung. |
| A02 | Frischer Einzelspielereinstieg erreicht H05 ohne fremde Industrie und ohne zirkuläre Gebäudekosten. Einmalige Hilfen bleiben nach Abbruch/Neustart einmalig. |
| A03 | Warenquelleninventar umfasst Weltgenerierung, neue Sektoren, Drift, Händler, Hubs, Werften, Module, Quests und Förderer. Keine unerlaubten Fertigwaren entstehen. |
| A04 | Tatsächliche Produktion hält Zutaten-, Output-, Energie-, Personal- und Flächengrenzen ein. Ausbauboni stammen nicht aus Questgeberlevel. |
| A05 | Eine Woche simulierte Abwesenheit mit Versorgungsmangel verliert keine Einwohner, Schiffe, Gebäude oder Questfortschritte. Erholung bleibt möglich. |
| A06 | Ziviles Einkommen wird nachvollziehbar in Steuern/Konsum geteilt. NPC-Einkauf belastet Kassen, hält Budgets ein und erhält unverkaufte Ladung. |
| A07 | Anwerbung und Tourismus erhalten reale Personenbestände; Transport, Ausbildung und Umladen duplizieren niemanden. |
| A08 | Jeder Industrie-/Modul-/Baukatalogeintrag hat konkrete Zutaten, Zeiten, Energie und Personal beziehungsweise eine explizite Tabellenformel. Kein neuer Bauabschnitt über zehn Minuten. |
| A09 | Hexabdeckung enthält Leerraum; Systemzone enthält lokale Transferwege. Verbundene eigene Netze und abgedeckte Wurmlochenden funktionieren, ungedeckte normale Abschnitte nicht. |
| A10 | Außerhalb Abdeckung erhält nur das aktive manuelle Schiff neue Direktaufträge; Queues umgehen die Grenze nicht. Handels-XP gelten ohne Antrieb, nicht für automatische Routen. |
| A11 | Abdeckungsverlust beendet begonnene Flugabschnitte sicher und pausiert erst die nächste ungedeckte Fortsetzung. Lokale gespeicherte Produktion bleibt erhalten. |
| A12 | Routenkäufe mit bereits 30/100/120 Einheiten, Ziel 100, Teilkauf, Preis-/Budgetgrenze, eigenem Lager und Wartebedingung entsprechen Kapitel 11. Manuelle Mengen und Verkäufe bleiben unverändert. |
| A13 | Normale/geschirmte Mischfracht, Teilentladung, kein normaler Raum, Module als Fracht, Passagiertrennung, Stahlkoloss und Modulabbau nutzen dieselbe korrekte Kapazitätslogik. |
| A14 | Alle sechs Rohformen sind bei Hubs und Fraktionszahlungen ausgeschlossen. Produkte werden rezeptgebunden erzeugt, roh zwischen Spielern handelbar; Mengen-/Währungsumrechnung ist vollständig. |
| A15 | Module können produziert, verpackt, gelagert, transportiert, eingebaut, ausgebaut und studiert werden, ohne Duplikation oder virtuelle unbegrenzte Angebote. |
| A16 | Fraktions- und reguläre Werften benötigen echte Materialien. Persönliche Orbitalringe halten Klassen-, Lizenz- und Fraktionsvoraussetzungen ein. |
| A17 | Normale Quest und mehrere Hauptzweige laufen parallel; Eigenproduktion und Betriebszeit werden korrekt gezählt. Dauerhafte Schiffsabgaben sind sichtbar und eindeutig. |
| A18 | Relikt hat vor H04 keinen und danach genau einen gültigen Standort. Lagerung und späterer Einbau funktionieren ohne gleichzeitige Anwesenheit beider Schiffe; kein Frachttransport oder Fernwechsel. |
| A19 | Relikt ×4/×5/×6 spart Treibstoff und Platz, bleibt unveräußerlich und verhindert Automatisierung. Neustart/doppelte Anfrage/Verkaufsversuch duplizieren oder vernichten es nicht. |
| A20 | Weitere Ruinenwelt ist persönlich, kostenpflichtig aufgebaut, besitzt eigene Leitstelle und erneuert keine kostenlosen Einstiegshilfen. Konsortien erhalten keine automatische Netzfreigabe. |
| A21 | Warp bestätigt Kosten, sperrt bewertete Bestandsänderungen, zeigt Abdeckungsfolgen, transportiert keine Schiffe und behält Vorbereitung/Sperrfrist über Neustarts. |
| A22 | Land/Meer/Wolken füllen alle festgelegten Bildformate, Zoomgrenzen und Fokusfahrten. Keine sichtbare äußere Schnittkante oder leere Fläche; die Hintergrundfortsetzung verändert weder Bauplätze noch Picking. |
| A23 | Ruinenwelt, Figur und Questszene besitzen beurteilte Comic-/Fantasy-/Science-Fiction-Stilprobe. Entwicklung ist sichtbar, Texte lesbar, Dialoge überspringbar und nachlesbar. |
| A24 | Parallel konkurrierende Frachter respektieren Reserven, laufende Lieferungen, Budgets und Prioritäten; kein Doppelauftrag aus derselben Bedarfslücke. |
| A25 | Normale Einzelspielerprogression erreicht die Zielkorridore 30–60 min / 4–8 h / 20–30 h; wesentliche Abweichungen werden vor Umstellung kalibriert oder begründet dokumentiert. |
| A26 | Mehrspielerprüfung deckt Kooperation, Rohstoff-/Modulhandel, neue Teilnehmer und Konsortiumsrechte ab. Niemand benötigt einen bereits fortgeschrittenen anderen Spieler für den Einstieg. |
| A27 | Vollständig frische Welt startet mit konsistenten PRD-5-Anfangszuständen. Übernahme, Sicherung oder Wiederherstellung des alten Stands sind nach Folgeentscheidung nicht erforderlich. |

Pro Umsetzungsschritt gezielte Unit-/Integrationstests, danach passende bestehende Prüfungen. Für abgeschlossene fachliche Pakete `npm test`; für die Wirtschaft zusätzlich reproduzierbare Simulationen mit Kosten-, Waren-, Geld- und Zeitbilanzen. Visuelle Aufgaben erfordern echte gerenderte/browserbasierte Prüfung, nicht allein Strukturtests.

Für D0: vollständige Inhalts-/Entscheidungsprüfung, gültige Dokumentverweise, Abgleich aller 40 bestehenden Rezepte und sechs Module sowie `git diff --check`. Ohne Laufzeitänderung wird nicht behauptet, dieses PRD habe bereits neue Spielfunktionen getestet.

## 19. Fortschrittsprotokoll

- 2026-10-24: U7 umgesetzt: tatsächliche Qualifikationen, Bau- und Ausbildungsreservierungen, parallele materialgebundene Bauzeiten, 8 bis 48 belegbare Plätze, Infrastruktur und vollständiger Industriekatalog nach Gruppen. Pro Anlage Energie-/Personalzuordnung und priorisierte Pausen; Generatoren verbrauchen echte Betriebsmittel. Ausbildung wandelt vorhandene Einwohner um und pausiert bei fehlendem Schulbetrieb oder Versorgung. Vollständige Rezeptzyklen respektieren gemeinsame normale/Gefahrgutlager und geschützte Reserven; Transfers, Bau und NPC-Abholung berücksichtigen dieselben Bestände. Notversorgung bewahrt Einwohner und Reichweite; begrenztes Wachstum bei Grundversorgung. Bau-, Bilanz-, Reserve- und Schulbedienung ergänzt. Alle 170 Tests erfolgreich, zehn neue Betriebsintegrationstests einschließlich einer Woche Mangel und Neustarts. Seed-42-Flugsimulation erreicht H06 nach 1.997 s mit 101 Einwohnern und 7.826 Cr; finale Balance bleibt U17. Browsernachweise unter docs/qa/prd5-u7/.

- 2026-10-24: U6 umgesetzt: H02 registriert ein persönliches Wrack; H04 verlangt manuellen Anflug, einmalige Bergung, denselben versiegelten Fund auf demselben Schiff und Übergabe an der Heimat. 60-s-Erstwerkstatt, dann genau ein nutzbarer Antrieb am Standort. Ein-/Ausbau atomar mit 15 s Serverzeit, ohne Fernwechsel, Warenverladung oder Erstattung. Abgabe-/Verkaufs-/Automatisierungssperren, Betrieb mit leerem Tank bei ×4 und ohne Treibstoffverbrauch. Eigene Auswahl des aktiven manuellen Schiffs ohne Tempobonus; einzelne Direktbefehle außerhalb Abdeckung, keine vorbereiteten Ketten. Handels-XP über explizite manuelle Transaktionen ohne Relikt; Routen/eigene Lager ausgeschlossen. Anzeige und Werkstattbedienung ergänzt. Vollständige Strecken-/Wurmloch-/Abdeckungsverlustprüfung folgt U8. Alle 160 Tests erfolgreich; sechs gezielte Relikt-/Präsenz-/XP-/Neustarttests. Browser prüft Ein- und Ausbau. Reproduzierbare Flugsimulation `npm run sim:homeworld`: Seed 42 erreicht H04 bei 510 s, H05 bei 1.170 s und H06 bei 1.997 s, zwei Frachter, 100 Einwohner, 7.826 Cr Rest; zweimal identisches Ergebnis. Dies ist ein idealisierter Einstieg vor U7–U15, keine finale A25-Abnahme; Zielkorridore werden in U17 mit vollständiger Wirtschaft geprüft. Nachweise unter `docs/qa/prd5-u6/`.

- 2026-10-24: U5 umgesetzt: persönliche Ruinenwelt außerhalb des Ursprungs, zufällige geeignete Systeme in Ring 1/2 mit Sucherweiterung, mindestens 27.000 Abstand und sechs erreichbare Grundrohstoffe. Acht freie Plätze plus separate Grundanlagenanker, geometrisch auf 48 erweiterbare Plätze vorbereitet. Kostenloser Besitz zählt nicht gegen Gouverneursgrenzen und ist nicht übertragbar. Hauptquestkanal H00–H06 mit eigenen Belohnungen/Journal; H04-Reliktmechanik ist dem anschließenden U6 zugeordnet. Dock-/Anlagenreparaturen binden Credits/Material, laufen parallel und bleiben über Neustarts erhalten. Startausnahmen mit Empfänger und eindeutiger ID; zweiter Frachter H05 einmalig und lizenzgebunden. Materialgebundene Grundproduktion zählt Eigenproduktion, Versorgung sammelt Betriebszeit nach H03. Voller Personal-/Energie-/Reservierungsbetrieb folgt U7. Integrationstest erreicht H05/H06 mit echten Einkäufen/Transfers ohne fremde Industrie, ohne neue Waren im Heimatlager zu injizieren. Verteilung mit 24 Spielern und erschöpften Startringen geprüft. Alle 154 Tests erfolgreich. Browser prüft Ankunft, Landung, H00, Dockreparatur und Journal; Nachweise unter `docs/qa/prd5-u5/`.

- 2026-10-24: Stilprobe vom Nutzer ausdrücklich freigegeben. Referenz und Gestaltungsregeln unter `docs/art/prd5/`; erste gezeichnete Ankunftsszene unter `client/assets/art/homeworld/arrival.png`, mit getrennten lesbaren Texten, Überspringen und erneutem Aufruf im Journal. Eingebauter ImageGen-Modus; Prompts und Herkunft im Art-README. Interaktive Grundgeometrie/Gebäudemodelle sind weiterhin Übergangsassets bis U16, keine vorgezogene Vollständigkeitsabnahme.

- 2026-10-24: Nutzerentscheidung: keine Rücksicht auf die vorhandene alte Welt; vollständige Neugenerierung. Altkompatibilität, Migrations-/Sicherungsanforderungen und Wiederherstellungsabnahme entfallen. Getrennte Entwicklungswelt bleibt für reproduzierbare Tests bestehen.

- 2026-10-24: U4 umgesetzt: separat verwaltete Geländefortsetzung mit geschlossenen Originalkanten, ausgedehntes Meer für Ozean/Paradies und drei Wolkenschichten für Gasriesen. Kulisse beeinflusst weder Gebäude-Picking noch Anker oder Kamerafit. Kameraabstand an große orthografische Ausschnitte angepasst, damit Hochformat keine unterhalb des Bodens beginnenden Randstrahlen erhält. 12 GLB-/Geometrie-Integrationstests über fünf Formate und beide Schwenkgrenzen; gerenderte Browserprüfung mit 180 Fällen (12 Welten × fünf Formate × Übersicht/Schwenk/unterbrochene Fokusfahrt), ohne fehlende Randabdeckung oder Browserfehler. Nachweise unter `docs/qa/prd5-u4/`; Zeichnungsstil bleibt eigener Schritt U5/U16.

- 2026-10-24: U3 umgesetzt: explizite Profile `legacy` (Version 3) und `homeworld` (Version 5), isolierter Entwicklungsstart auf Port 3005 mit `data/prd5/spacetrader.db`. Read-only-Prüfung vor Store/Migrationen weist Versions-/Profilkonflikte ohne Reset ab; aktiver Standardpfad ist im Testprofil gesperrt. SHA-256-/SQLite-Tests prüfen unveränderte Altbestände und Schemas. Start-, Bevölkerungs-, Wirtschafts-, Baugruppen-, Relikt- und Warp-Ausgangswerte in `shared/homeworld.js`; alle 40 Rezepte auf vollständige, kreislauffreie Baugruppenzuordnung geprüft. Warenquelleninventar in `docs/PRD-5-warenquellen.md`. Neue Wirtschaftsregeln folgen U5–U15; öffentliche Fabriken wurden noch nicht abgeschaltet. U1 `34a2c22`, U2 `abd536b` committed.

- 2026-10-24: Zwischenstand nach U1/U2: alle 132 Tests erfolgreich, `git diff --check` erfolgreich. Git-Identität nach Nutzerangabe eingerichtet. U1 mit Commit `34a2c22` abgeschlossen; U2 wird mit diesem Fortschrittsstand separat committed. U3–U17 unverändert offen; aktiver Datenbestand wurde nicht geöffnet oder zurückgesetzt.

- 2026-10-24: U2 umgesetzt: zentrale Belegungsberechnung ordnet normale Ware zuerst normalem und danach geschirmtem Raum zu; Handel, Transfers, Bergbau und Detailanzeigen nutzen dieselben Funktionen. Flotten-Füllstand berücksichtigt beide Frachtbereiche. Hypothetischer Modulausbau prüft die neue Gesamtbelegung einschließlich legaler Umsortierung; blockierter Ausbau verändert weder Ware noch Credits. Passagiere und NPC-Kapazitätsausnahme bleiben getrennt. Physische verpackte Module existieren erst mit U10 und werden dort eingebunden. Gezielte Kapazitäts-/Handler-/Persistenztests sowie vollständiges `npm test` vor Commit.

- 2026-10-24: U1 umgesetzt: Routen-Kaufmengen gelten einheitlich als Zielbestand je Ware, einschließlich vorhandener Vorlagen. Erreichte Ziele löschen alte Aktionsfehler; Teilkäufe, Preis-/Kontogrenzen und separate Warteaktionen bleiben erhalten. Einmalige Dockkäufe und Verkäufe bleiben Zusatzmengen. Oberfläche erklärt die Semantik. Gezielte Integrationstests und vollständiges `npm test` vor Commit.

- 2026-10-24: PRD 4 anhand Code und Interview geprüft. Q34–Q66 abgeschlossen; Neustart statt Migration, konkrete Betriebsregeln und Sonderveredelung aufgenommen. D0 fertiggestellt; U1–U17 noch nicht begonnen.

Es verbleiben keine absichtlich ungeklärten Grundsatzentscheidungen aus PRD 4. Konkrete Illustrationen werden über die vereinbarte Stilprobe beurteilt; numerische Ausgangswerte werden während Umsetzung und Simulation kalibriert. Beides sind definierte Arbeitsschritte, keine stillschweigend angenommenen zusätzlichen Spielregeln.
