# PRD: SpaceTrader Erweiterung „Heimatwelten und Industrie“

Stand: 2026-10-24 · Status: Konzept im Interview abgestimmt, Umsetzung nicht beauftragt

Baut auf [PRD.md](PRD.md), [PRD-2.md](PRD-2.md) und [PRD-3.md](PRD-3.md) auf. Bei Widersprüchen haben die ausdrücklich beschriebenen Änderungen dieses Dokuments Vorrang. Nicht betroffene Spielregeln bleiben bestehen.

## 1. Ziel und Freigabegrenze

Jeder Spieler baut einen persönlichen Ruinenplaneten zu einem industriellen Zentrum auf. Rohstoffwelten, spezialisierte eigene Welten, reale Verarbeitungsketten, Bevölkerung und Transportflotten bilden eine zusammenhängende Wirtschaft. Später kommen weitere Ruinenwelten und ein wachsendes Verwaltungsnetz hinzu.

Anspruch entsteht aus Versorgung, Kapazitätsplanung, Standortwahl, Spezialisierung und Absatz. Längere Abwesenheit darf das aufgebaute Imperium nicht zerstören. Die Wirtschaft läuft weiter, solange der Server läuft.

Dieses PRD dokumentiert das abgestimmte Konzept einschließlich der abschließend ergänzten Routen- und Frachtregeln. Beauftragt sind ausschließlich Erstellung und Commit dieses Dokuments. Die nachfolgenden Umsetzungsschritte sind ein Arbeitsplan für einen späteren Auftrag, keine aktuelle Umsetzungsfreigabe.

## 2. Ausgangslage und betroffene Systeme

- Waren, Rezepte und Planetentypen: `shared/goods.js`; verarbeitende Stationen werden aus Rezepten erzeugt. Gewöhnliche Planeten erzeugen teilweise bereits verarbeitete Güter; Level-Freischaltungen ergänzen weitere solche Waren.
- Planetare Fabriken und Gebäude: `shared/planetside.js`, `server/markets.js`; bisher Fabrikbau auf gewöhnlichen eigenen Planeten, gemeinsame Warenbestände, keine umfassende Energie-, Personal- oder Reservenplanung.
- Besitz und Verbrauch: `shared/property.js`, `server/property.js`; bisher allgemeine Ausbauachsen und Credits aus lokalem Verbrauch. NPC-Märkte nutzen teilweise abstrakte Bestandsdrift; Spielerbesitz nicht.
- Start und Handel: `server/game.js`; bisher gemeinsamer Start an einer Werft, kein automatisch zugewiesener Heimatplanet. Kostenlose Umladung zwischen eigenem Schiff und eigenem Lager existiert bereits.
- Routen und NPC-Logistik: `server/ships.js`, `client/js/ui/routes.js`; feste Stopps, Warenmengen, Preisgrenzen, Wartebedingungen und Mindestkontostand. NPC-Abholung berücksichtigt eigene Planeten bisher nicht als allgemeine Industriequellen.
- Fracht und Hauptschiff: `shared/ships.js`; bisher getrennte Nutzung nach Frachtklasse und jederzeit möglicher Hauptschiffwechsel mit Sperrfrist. Einzelne Schiffsfähigkeiten erlauben Gefahrgut im normalen Laderaum.
- Quests: `server/quests.js`, `shared/progression.js`; ein normaler Questplatz, eigene Besitztümer sind bislang als normale Questziele eingeschränkt.
- Darstellung: planetare Ansicht, Markt- und Questoberflächen; bisherige Vorgaben zur ausschließlich prozeduralen Darstellung werden durch die neue gezeichnete Bildsprache erweitert.

Die Aufzählung beschreibt Anknüpfungspunkte, keine abschließende technische Dateiliste.

## 3. Umfang und Abgrenzung

### 3.1 Enthalten

Persönliche und zusätzliche Ruinenplaneten, Umbau der Verarbeitung, spezialisierte Versorgungswelten, Bevölkerung, Energie, Industrieplanung, Leitstellen und Automatisierung, Hauptquestzweige, Orbitalringe, Modulstudium, Reliktantrieb, Warpservice, reale NPC-Warenlogistik, gezeichnete Szenen und Dialoge sowie die beiden neuen Frachtregeln.

### 3.2 Nicht enthalten

- Überarbeitung der Schiffsdesigns: ausdrücklich ein getrennter Auftrag.
- Tatsächliches Auftreten der vermuteten alten Zivilisation, neue daraus abgeleitete Fraktionen oder spielmechanische Ereignisse.
- Automatischer Weltreset, Veröffentlichung oder Push als Folge dieses PRD.
- Abschließend kalibrierte Kosten, Produktionsraten, Questmengen oder Zeitwerte, soweit nicht ausdrücklich festgelegt.
- Automatischer Offline-Fortschritt während eines abgeschalteten Servers.

## 4. Weltstart und Heimatverteilung

**WELT-01:** Jeder neue Spieler erhält genau einen persönlichen Ruinenplaneten als Startbesitz, ohne vorherigen Planetenkauf oder Gouverneurslizenz-Erwerb. Ruinenplanet ist eine eigene Planetenkategorie.

**WELT-02:** Heimatwelten entstehen zufällig in einem konfigurierbaren Bereich von Sektoren um den Ursprung, ausdrücklich nicht im Ursprungssektor. Geeignete Plätze und Mindestabstände verhindern überlappende oder unmittelbar konkurrierende Starts.

**WELT-03:** Die Lage muss gegenseitige manuelle Hilfe ermöglichen. Unterschiedliche Nachbarschaften sind erwünscht, wirtschaftlich unbrauchbare Starts ausgeschlossen. Grundressourcen, öffentliche Einstiegsmöglichkeiten und die erste lokale Automatisierung müssen erreichbar sein.

**WELT-04:** Der Spieler startet nahe seiner Heimatwelt und erhält eine Notsignal-Hauptquest zum Anflug und zur ersten Landung.

**WELT-05:** Reparierbare Grundanlagen, begrenzte Ruinenbestände und einmalige Starthilfen schließen zirkuläre Freischaltkosten aus. Keine notwendige Einstiegsanlage darf ausschließlich Waren verlangen, die erst mit einer späteren Anlage verfügbar werden.

**WELT-06:** Öffentliche Werften besitzen ein begrenztes Startschiffangebot. Nachfolgender Schiffbau benötigt reale Materialien. Eine begrenzte Notversorgung gewährleistet grundlegende Flugfähigkeit, ohne eine wiederholbare kostenlose Handelsquelle zu schaffen.

## 5. Wirtschaftsrollen und Herkunft der Waren

**WIRT-01:** Verarbeitende Industrie ist ausschließlich auf Ruinenplaneten erlaubt. Bisherige verarbeitende Raumstationen und Verarbeitung auf gewöhnlichen eigenen Planeten entfallen beziehungsweise erhalten im Rahmen einer später festzulegenden Migration andere Rollen.

**WIRT-02:** Normale Planeten gewinnen natürliche Rohstoffe und verbrauchen passende Waren. Eine Welt darf gleichzeitig Produzent und Abnehmer sein. Förderung ersetzt keine Verarbeitung: Eine Bergbauwelt liefert Erz, aber keine daraus produzierten Barren.

**WIRT-03:** Werften bleiben als Ausnahme für Schiffbau aus angelieferten Bauteilen bestehen. Die neuen Regeln dürfen nicht über Level-Freischaltungen oder Zusatzproduktion umgangen werden.

**WIRT-04:** Verarbeitete Waren stammen aus Produktion auf Spieler-Ruinenwelten, abgesehen von ausdrücklich begrenzten Start- und Questhilfen. NPC-Bestandsdrift darf solche Waren nicht erzeugen. Hintergrundhandel muss reale Bestände übertragen; NPC-Werften beziehen tatsächliches Material.

**WIRT-05:** Spieler handeln Rohstoffe, Zwischen- und Endprodukte untereinander. Ein Spieler muss nicht jede Produktionskette selbst errichten.

**WIRT-06:** Lokaler Betriebsbedarf und ziviler Absatz sind getrennte Vorgänge. Bevölkerung und Kaufkraft begrenzen Nachfrage und Einnahmen. Der bisherige eigene Fixpreis-Verbrauch darf keine unbegrenzte garantierte Monetarisierung eigener Produktion ermöglichen.

**WIRT-07:** NPC-Händler dürfen öffentliche Angebote eigener Welten anfliegen. Eigentümer bestimmen Preise und verkäufliche Mengen; Reserven bleiben geschützt. NPC-Abholung benötigt reale Frachtkapazität, Reisezeit und Nachfrage. Sie garantiert keinen Absatz.

**WIRT-08:** Fremde Händler unterliegen nicht der Leitstellenreichweite des Verkäufers. Ihre Herkunft außerhalb eigener Abdeckung verhindert den Handel nicht.

## 6. Planetarer Betrieb und Produktionsplanung

**PLAN-01:** Jede Ruinenwelt hat ein gemeinsames Lager für Bevölkerung, Fabriken, Werften und Bauprojekte. Interne Warenbewegungen benötigen keine einzeln geplanten Transporte. Raumhafen und Lager begrenzen Umschlag und Kapazität.

**PLAN-02:** Produktion benötigt Rezeptzutaten, lokale Energie, geeignetes Personal und erschlossene Baufläche. Engpässe begrenzen die tatsächlich mögliche Leistung.

**PLAN-03:** Energie ist lokale Leistung, keine gewöhnliche lagerbare Ware. Unterschiedliche Erzeuger können Betriebsmittel benötigen. Energiezellen bleiben transportierbare Waren und können für Notstrom genutzt werden.

**PLAN-04:** Bevölkerung benötigt Wasser, Nahrung und entwicklungsabhängige weitere Versorgung. Sie stellt Arbeitsleistung und begrenzte Steuereinnahmen bereit. Qualifikationen umfassen einfache Tätigkeiten, Fachkräfte und Spezialisten; Ausbildung und Anwerbung entwickeln die verfügbaren Fähigkeiten.

**PLAN-05:** Der Spieler setzt Produktionsziele, Prioritäten, Zielbestände sowie geschützte Reserven für Versorgung, Treibstoff, Bauprojekte und andere Zwecke. Ein Bestand darf nicht gleichzeitig mehreren Aufträgen als frei verfügbar zugesagt werden.

**PLAN-06:** Zielkonflikte bleiben sichtbar und vom Spieler änderbar. Beispiel: Eine Fabrik wartet, weil ihre benötigten Platten für den Orbitalring reserviert sind. Reservierungen müssen ausdrücklich freigegeben oder geändert werden können.

**PLAN-07:** Die Versorgungsbilanz zeigt Bestand, Reserven, Zu- und Abflüsse, unterwegs befindliche Lieferungen, erwartete Vorratsdauer und begrenzende Engpässe. Ausbauvorschauen zeigen zusätzlichen Bedarf und Kapazitätsüberschreitungen.

**PLAN-08:** Unterversorgung drosselt Produktion und Arbeitsleistung, senkt Einnahmen und pausiert Wachstum. Sie zerstört weder Bevölkerung noch Anlagen und nimmt keinen erreichten Questfortschritt zurück. Das gilt auch bei längerer Abwesenheit.

**PLAN-09:** Lebenserhalt und grundlegende Leitstellenfunktionen sind geschützt. Bei Energiemangel werden Anlagen entsprechend einstellbarer Prioritäten gedrosselt. Die genaue Grundversorgungsregel ist so auszulegen, dass kein unumkehrbarer Versorgungskreislauf entsteht.

## 7. Leitstelle, Reichweite und Auftragsverwaltung

### 7.1 Gebäude und Abdeckung

**LEIT-01:** Jede Ruinenwelt kann eine eigene, separat ausbaubare Leitstelle besitzen. Gewöhnliche Versorgungswelten erhalten keine eigene reichweitengebende Leitstelle.

| Level | Abdeckung |
|---|---|
| 0 | Keine Schiffsautomatisierung; manuelle Steuerung bleibt möglich |
| 1 | Sonnensystem des Standorts |
| 2 | Sektor des Standorts |
| 3 | Standortsektor und erster benachbarter Sektorring |
| 4 | Standortsektor und zwei benachbarte Sektorringe |
| n ab 2 | Standortsektor und n−2 Sektorringe |

**LEIT-02:** Viele weitere Stufen ermöglichen langfristige Expansion. Reichweitenkosten und Betriebskapazität steigen mit dem Ausbau. Funktionsmodule können zusätzliche Automatisierungsfunktionen unabhängig von der Reichweitenstufe freischalten.

**LEIT-03:** Eigene Abdeckungen verbinden sich. Automatische Aufträge benötigen auf dem gesamten Flugweg Abdeckung. Räumlich getrennte Abdeckungsinseln erlauben keinen automatischen Transit durch ungedeckte Gebiete.

**LEIT-04:** Handelsrouten, automatischer Bergbau, Versorgung, selbstständige Überführungsflüge und Fernverwaltung benötigen passende Abdeckung. Wiederholungen und längere Auftragsketten gelten ebenfalls als Automatisierung.

**LEIT-05:** Manuelles Anfliegen beliebiger Ziele, Handel und Verwaltung vor Ort bleiben außerhalb der Abdeckung möglich. Es gibt keinen temporären Hauptschiffbonus allein durch Auswahl eines anderen Schiffs.

**LEIT-06:** Bereits freigeschaltete Reichweite bleibt bei Unterversorgung erhalten. Unterversorgung kann die Bearbeitung neuer Aufträge begrenzen, darf aber nicht die zur Erholung nötige Abdeckung entziehen.

### 7.2 Automatisierung

**AUTO-01:** Früh werden feste Routen genutzt; später organisiert die Leitstelle Versorgung, Produktion und Absatz auf Basis der Spielervorgaben.

**AUTO-02:** Vorgaben umfassen Zielbestände, Produktionsziele, geschützte Reserven, Prioritäten, Budgets, Mindestkontostand, Preisgrenzen, freigegebene Quellen und Absatzgebiete sowie zugewiesene Schiffe.

**AUTO-03:** Laufende Bestellungen, geladene Fracht und unterwegs befindliche Lieferungen werden berücksichtigt. Mehrere Frachter dürfen nicht wegen derselben unreservierten Bedarfsmeldung überbestellen.

**AUTO-04:** Innerhalb der Vorgaben sind Alternativquellen, Teilladungen und gebündelte Lieferungen möglich. Außerhalb der Grenzen wird pausiert. Begrenzte Notkäufe erfordern eine ausdrückliche Regel des Spielers.

**AUTO-05:** Verständliche Statusmeldungen erklären Ursache, laufende Behebung und möglichen Eingriff. Ein unveränderter Engpass erzeugt keine ständig neuen Warnungen.

## 8. Allgemeine Fracht- und Routenregeln

Diese Regeln gelten unabhängig vom späteren Freischaltstand der Heimatwelt und sind als abgegrenzte Arbeitspakete umsetzbar.

### 8.1 Routenkauf als Zielbestand

**ROUTE-01:** Die Menge einer Kaufaktion auf einer Route bezeichnet künftig den gewünschten Bestand der jeweiligen Ware an Bord nach dem Kauf, nicht die zusätzlich zu kaufende Menge. Die Einheit bleibt die vorhandene Wareneinheit, kein Prozentwert des gesamten Schiffs.

`Einkaufsbedarf = max(0, Zielbestand der Ware − bereits geladene Menge dieser Ware)`

**ROUTE-02:** Bereits geladene Mengen werden über alle zulässigen Laderäume zusammengezählt. Andere Waren verringern den verfügbaren Platz, zählen aber nicht zum Zielbestand der gekauften Ware.

**ROUTE-03:** Preisgrenzen, Budget, Mindestkontostand, Marktbestand und zulässige freie Frachtkapazität begrenzen weiterhin den tatsächlichen Kauf. Ein unerreichbarer Zielbestand verursacht weder Überschreitung noch automatischen Verkauf vorhandener Fracht.

**ROUTE-04:** Leer beziehungsweise die bisherige Einstellung „so viel wie möglich“ behält diese Bedeutung. Verkaufsaktionen bleiben Mengenverkäufe; ihre Semantik wird durch diese Änderung nicht umgestellt. Manuelle Einmalkäufe behalten ebenfalls ihre bisherige Bedeutung.

**ROUTE-05:** Die Regel gilt auch beim Laden aus eigenem oder zugänglichem gemeinsamem Lager über eine Routen-Kaufaktion; kostenloser Eigentümertransfer wird dadurch nicht zu einem bezahlten Kauf.

**ROUTE-06:** Oberfläche und Hilfetexte benennen ausdrücklich „Zielbestand an Bord“. Bestehende gespeicherte Kaufmengen werden bei Aktivierung als Zielbestände interpretiert; die Änderung wird kenntlich gemacht. Es gibt keine parallele Altsemantik innerhalb derselben Route.

| Ausgangslage | Aktion | Erwartung |
|---|---|---|
| 30 Erz geladen | Zielbestand 100 Erz | Höchstens 70 Erz zusätzlich laden |
| 100 oder 120 Erz geladen | Zielbestand 100 Erz | Nichts kaufen; nichts automatisch verkaufen |
| 30 Erz geladen, Platz für weitere 20 | Zielbestand 100 Erz | Höchstens 20 Erz laden |
| 30 Erz geladen, Markt liefert nur 10 | Zielbestand 100 Erz | Höchstens 10 Erz laden |
| 30 Erz geladen | Kauf ohne Mengenbegrenzung | Bis zu den weiterhin geltenden Grenzen laden |

### 8.2 Normale Ware in geschirmten Kammern

**FRACHT-01:** Geschirmte Kammern dürfen neben Gefahrgut auch normale Handelsgüter aufnehmen. Normale Ware belegt zuerst verfügbaren normalen Laderaum und anschließend freie geschirmte Kapazität.

**FRACHT-02:** Beide Bereiche teilen ihre jeweilige Kapazität tatsächlich. Normale Ware in geschirmter Kapazität reduziert den noch verfügbaren Platz für Gefahrgut. Es entsteht keine zusätzliche oder doppelt gezählte Kapazität.

**FRACHT-03:** Gefahrgut benötigt weiterhin geeignete Kapazität, außer eine bestehende besondere Schiffsfähigkeit erlaubt ausdrücklich etwas anderes. Passagierkabinen werden durch diese Änderung nicht für normale Waren oder Gefahrgut geöffnet.

**FRACHT-04:** Laden, Entladen, Handel, Eigentümertransfer, Bergbau, NPC-Fracht und Anzeigen müssen eine konsistente Kapazitätsberechnung nutzen. Für normale Ware ohne normalen Laderaum ist freie geschirmte Kapazität ausreichend.

**FRACHT-05:** Eine konsistente Belegung muss auch nach Teilentladung und Neustart gelten. Normale Ware wird soweit möglich wieder dem freien normalen Bereich zugeordnet; geschirmte Kapazität darf nicht durch veraltete Zuordnung unnötig blockiert bleiben. Unzulässiges Gefahrgut darf dadurch nicht in normalen Frachtraum verschoben werden.

**FRACHT-06:** Der Antrieb aus Kapitel 11 belegt auch nach dieser Änderung keinerlei Frachtraum. Bestehende Modulgrößen und Spezialfähigkeiten werden nicht pauschal verändert. Modulabbau darf keine überbelegte oder unzulässige Fracht zurücklassen.

| Verfügbare Kapazität und Ladung | Vorgang | Erwartung |
|---|---|---|
| Normal 100, geschirmt 30, leer | 120 normale Einheiten laden | 100 normal, 20 geschirmt; 10 geschirmt frei |
| Normal 100, geschirmt 30, davon 20 Gefahrgut | Normale Ware laden | Höchstens 110 normale Einheiten insgesamt |
| Normal 0, geschirmt 30, leer | Normale Ware laden | Bis zu 30 Einheiten möglich |
| Geschirmte Kapazität durch normale Ware belegt | Gefahrgut laden | Nur tatsächlich verbleibende geeignete Kapazität nutzbar |
| Normale Ware in beiden Bereichen, dann Teilentladung | Belegung neu bestimmen | Normalen Bereich bevorzugen; frei werdenden geschirmten Platz korrekt anzeigen |

## 9. Spezialisierte Welten und Expansion

**EXP-01:** Gewöhnliche eigene Welten erhalten fachliche Schwerpunkte und konkrete Ausbauentscheidungen statt hauptsächlich allgemeiner Prozent-Upgrades.

| Schwerpunkt | Entwicklungsrichtungen und Nutzen | Gegenleistung |
|---|---|---|
| Bergbau | Größere Erzmengen, tiefere Minen, seltene Lagerstätten | Maschinen, Technik, Energie und Versorgung |
| Agrar | Nahrung, Biomasse, hochwertige Landwirtschaft | Betriebsmittel und Infrastruktur |
| Hive World | Sehr große Bevölkerung, Arbeitskräfte und zivile Nachfrage | Hoher Nahrungs-, Wasser-, Ressourcen- und Infrastrukturbedarf |

**EXP-02:** Innerhalb eines Schwerpunkts sind mehrere Ausbaurichtungen kombinierbar. Ein Schwerpunktwechsel bleibt möglich, verlangt aber einen teuren, zeitaufwendigen Umbau.

**EXP-03:** Ruinenwelten bleiben auf Importe angewiesen. Begrenzte Schrottvorräte und geringe lokale Grundversorgung ersetzen keine leistungsfähigen Versorgungswelten.

**EXP-04:** Der erste zusätzliche Ruinenplanet wird erst im fortgeschrittenen Spiel über eine größere Hauptquest erschlossen: Erkundung, Expedition, Material und funktionierender erster Betrieb.

**EXP-05:** Danach werden weitere Erwerbungen oder Gründungen möglich. Jeder Standort braucht Credits, Material, Aufbauflotte, Personal, Infrastruktur und passenden Verwaltungsfortschritt. Zunächst ist keine zusätzliche pauschale Planetenzahlgrenze vorgesehen; bestehende Besitzlimits müssen damit abgestimmt werden.

## 10. Hauptquests, Orbitalringe und Forschung

**QUEST-01:** Heimatquests haben einen eigenen Fortschrittskanal neben dem unverändert nutzbaren normalen Questplatz. Nach einem kurzen gemeinsamen Einstieg sind mehrere Hauptquestzweige parallel verfolgbar.

**QUEST-02:** Zweige umfassen Versorgung und Bevölkerung, Industrie, Logistik und Verwaltung, Orbitalringe, Forschung sowie Expansion. Meilensteine haben sichtbare fachliche Voraussetzungen.

**QUEST-03:** Aufgaben verlangen Credits, Waren, eigene Produktion, aufsummierte versorgte Betriebszeit, Expeditionen und gezielte Schiffsübergaben. Bereits erreichte Teilfortschritte bleiben bei Unterbrechungen erhalten. Keine verpflichtenden täglichen Logins.

**QUEST-04:** Dauerhaft abgegebene Schiffe verlassen die steuerbare Flotte und werden sichtbarer Teil der planetaren Infrastruktur. Folgen sind vor der Bestätigung ausdrücklich benannt. Nicht jedes Kapitel verlangt eine Schiffsabgabe.

**QUEST-05:** Wiederhergestellte Orbitalringe ermöglichen zunächst Schiffbau kleiner Werften, nach weiterem Ausbau auch großer Werften. Bestehende Klassen-, Lizenz- und besondere Zugangsvoraussetzungen werden nicht stillschweigend aufgehoben.

**QUEST-06:** Ein für Studien übergebenes Modul wird verbraucht und schaltet seinen Bauplan dauerhaft frei. Forschungs- und Fertigungsausbau ermöglichen anschließend Herstellung sowie Kauf und Verkauf. Jedes weitere Exemplar benötigt Material, Zeit und Kapazität. Besondere Fraktionsvoraussetzungen bleiben erhalten.

**QUEST-07:** Die erste kleine Produktions- und Handelsautomatisierung ist innerhalb der ersten Spielsitzung erreichbar. Zusätzliche Ruinenwelten sind ein Ziel über mehrere Sitzungen; genaue Schwellen werden kalibriert.

## 11. Einzigartiger Reliktantrieb und Hauptschiff

**ANTR-01:** Eine frühe Notfallbergungsquest erschließt einen Antrieb unbekannter Herkunft. Hinweise legen eine ältere, fortschrittlichere menschliche Zivilisation nahe. Ob diese noch existiert, bleibt unbestimmt; daraus folgen zunächst keine weiteren Spielmechaniken.

**ANTR-02:** Nach Freischaltung existiert genau ein Exemplar pro Spieler. Es kann nicht veräußert, zerstört, dupliziert, als gewöhnliche Ressource transportiert oder über Konsortien übertragen werden.

**ANTR-03:** Der eingebaute Antrieb bestimmt das Hauptschiff. Er benötigt weder Frachtraum noch normalen Modulplatz, Treibstoff oder laufende Betriebsmittel. Der bisherige vierfache Geschwindigkeitsbonus ist der anfängliche Balance-Ausgangspunkt. Die bisherige Verbrauchsvervielfachung entfällt für diesen Antrieb.

**ANTR-04:** Das Trägerschiff ist ausschließlich manuell einsetzbar. Routen, automatischer Bergbau und sonstige Leitstellenaufträge sind ausgeschlossen. Als erzählerische Erklärung stört der Antrieb die zuverlässige Funkverbindung zur Leitstelle.

**ANTR-05:** Ein- und Ausbau sind ausschließlich an freigeschalteten Antriebswerkstätten eigener Ruinenplaneten möglich. Kein Fernwechsel und keine bloße Auswahl eines neuen Hauptschiffs.

**ANTR-06:** Beide Schiffe müssen nicht gleichzeitig vor Ort sein. Nach Ausbau liegt der Antrieb ausschließlich an genau diesem Planeten. Ein später eintreffendes Schiff kann ihn dort aufnehmen, aber nur durch tatsächlichen Einbau. Es gibt keinen Lagertransfer zu einem anderen Planeten und kein Verladen als Fracht.

**ANTR-07:** Ein Trägerschiff kann erst nach Ausbau verkauft, recycelt oder dauerhaft für eine Quest abgegeben werden. Bei Umbau, Neustart und sonstigen Zustandswechseln darf der Antrieb weder verschwinden noch mehrfach vorhanden sein.

**ANTR-08:** Hochstufige Quests erschließen später mehr Potenzial des Antriebs. Konkrete Verbesserungen sind noch festzulegen; Unveräußerlichkeit und Einzigartigkeit bleiben bestehen.

## 12. Warpservice zur Relokation

**WARP-01:** Eigene Ruinenplaneten können gegen hohe Kosten an einen erschlossenen, geeigneten Zielplatz verlegt werden. Vorbereitung und eine längere Sperrfrist verhindern beliebige spontane Ortswechsel.

**WARP-02:** Der Preis setzt sich aus Grundgebühr, einem Anteil des festen Planeten- und Ausbauwerts sowie einem Zuschlag für mitgeführte Waren zusammen. Kurzfristige Marktpreisschwankungen dürfen die Wertermittlung nicht beliebig manipulierbar machen.

**WARP-03:** Vor Buchung zeigt eine Vorschau Kosten, mitgeführte Bestände, neue Leitstellenabdeckung und betroffene Welten beziehungsweise Routen.

**WARP-04:** Während des Transfers pausiert der Standort. Angedockte Schiffe müssen vorher starten; Flottenschiffe fliegen selbstständig zum neuen Standort. Der Planet dient nicht als kostenloser Flottentransporter.

**WARP-05:** Der dokumentierte Reliktantriebszustand bleibt eindeutig. Ein auf dem Planeten gelagerter Antrieb bleibt dort gebunden; seine Lage folgt dem verlegten Planeten. Das erlaubt keinen separaten Antriebstransport.

## 13. Bildsprache, Dialoge und Bedienung

**BILD-01:** Quests, Planeten und weitere Grafik sollen gezeichnet wirken: Comic, Fantasy und Weltraumzukunft mit sichtbaren Konturen, malerischen Flächen, lesbarer Technik, charaktervollen Figuren und monumentalen Ruinen.

**BILD-02:** Wiederaufbau und Spezialisierung verändern das sichtbare Erscheinungsbild: Wohnraum, Industrie, Raumhafen, Minen und Orbitalringe zeigen nachvollziehbare Entwicklungsstände.

**BILD-03:** Persönliche Interaktionen und Questmeilensteine werden über ansprechende Bilder, Figuren und Dialoge geführt. Wiederkehrende Ansprechpartner begleiten die Entwicklung.

**BILD-04:** Ton: abenteuerlich, geheimnisvoll und gelegentlich humorvoll; Notlagen und Wiederaufbau werden ernst genommen. Hinweise auf die alte Menschentechnologie bleiben mehrdeutig.

**BILD-05:** Dialoge sind überspringbar und nachlesbar. Wiederholter Handel und Verwaltung nutzen schnell bedienbare illustrierte Ansichten. Automatische Abläufe benötigen keine Dialogbestätigung.

**BILD-06:** Ausgewählte Entscheidungen beeinflussen Ausbauprioritäten, Projektkosten oder Beziehungen. Folgen sind vorher erkennbar; zentrale Funktionen bleiben langfristig erreichbar.

**BILD-07:** Die Überarbeitung der Schiffsdesigns wird separat beauftragt. Dieses PRD enthält dafür keine neue Assetproduktion.

## 14. Persistenz, Umstellung und offene Ausarbeitung

### 14.1 Verbindliche Qualitätsanforderungen

- Eigentum, Lager, Reserven, Bevölkerung, Leitstellen, Hauptquestfortschritt, Produktionsaufträge und Antriebszustand überstehen einen Serverneustart konsistent.
- Tatsächliche Warenbewegungen dürfen keine Bestände duplizieren; Auftragserfüllung und Reservierung müssen zusammenpassen.
- Wiederholte Clientanfragen dürfen insbesondere Antriebseinbau, Questabgabe und Warenauslieferung nicht doppelt verbuchen.
- Regeln zu Kapazität, Reichweite, Zugriff und Antrieb werden serverseitig geprüft.
- Bestehende Spielstände werden nicht allein durch Anlegen dieses PRD geändert. Vor einer späteren Umstellung wird ein überprüfbarer Migrationsplan mit Sicherung und Wiederherstellung festgelegt.

### 14.2 Noch festzulegen, nicht als entschieden behandeln

1. Startverteilungsradius, Mindestabstände, Ressourcenreichweiten und Verfahren bei ausgeschöpften geeigneten Startplätzen.
2. Kosten, Raten, Flächen, Arbeitskräfteverhältnisse, Qualifikationszeiten, Budgets der Zivilwirtschaft und genaue Grundversorgung.
3. Leitstellenkosten und Betriebskapazitäten; genaue Behandlung von Wurmlöchern, Transitstrecken und laufenden Befehlen bei Abdeckungsänderungen.
4. Konkrete Questtexte, Mengen, Belohnungen, XP, Entwicklungsmeilensteine und spätere Antriebsverbesserungen.
5. Vollständiger Spezialisierungskatalog und Umstellung vorhandener allgemeiner Upgrades.
6. Überführung vorhandener Fabrikstationen, planetarer Fabriken, Bestände, Besitzlizenzen und Hauptschiffe; angemessene Erhaltung oder Kompensation vorhandener Investitionen.
7. Zuteilung der Heimatwelten und Einführung des Antriebs für bestehende Spieler.
8. Rechte bei Konsortiumsbesitz und Übertragung von Ruinenplaneten, Werkstätten und dort gebundenem Antrieb. Bis zur Klärung darf keine solche Übertragung Antriebseinzigartigkeit oder persönlichen Fortschritt brechen.
9. Auswirkungen einer Änderung geschirmter Module bei beladener Fracht und genaue Kapazitätszuordnung besonderer Schiffsfähigkeiten. Bestehende legitime Fähigkeiten sind zu erhalten.
10. NPC-Handelsbudgets, Rohstoffförderung und Nachfrageraten nach Abschaffung der Erzeugung verarbeiteter Waren durch Drift; Abschlussprüfung sämtlicher Markt- und Questquellen.
11. Konkrete visuelle Referenzen, Assetumfang, Dialogverzweigungen und Produktionsverfahren für die gezeichnete Darstellung.

Diese Punkte blockieren nicht die Dokumentation. Sie müssen vor dem jeweils betroffenen Umsetzungsschritt konkretisiert und im PRD nachgeführt werden.

## 15. Umsetzungsschritte und Fortschritt

Nur die Dokumentation ist aktuell beauftragt. Für jeden später freigegebenen, sinnvoll abgeschlossenen Schritt: passende Prüfungen ausführen, Fortschritt in diesem PRD aktualisieren und zusammengehörige Änderungen in einem eigenen Commit festhalten. Ein Push erfordert gesonderte Zustimmung.

| Schritt | Ergebnis | Voraussetzung | Status |
|---|---|---|---|
| P0 | Abgestimmtes Konzept und neue Frachtregeln als PRD dokumentieren | Interview | Abgeschlossen; Dokumentationscommit gehört zu P0 |
| P1 | Routenkäufe auf Zielbestände umstellen, Texte und gespeicherte Routen berücksichtigen | Umsetzungsauftrag | Offen |
| P2 | Normale Fracht in geschirmten Kammern, einheitliche Kapazitätslogik | Umsetzungsauftrag; Spezialfälle aus Kapitel 14 klären | Offen |
| P3 | Migrationsplan, Datenmodell und vollständiges Inventar der Warenquellen | Umsetzungsauftrag | Offen |
| P4 | Ruinenplanetentyp, Startverteilung, eigener Hauptquestkanal und sicherer Einstieg | P3 | Offen |
| P5 | Einzigartiger Reliktantrieb, Werkstatt, Lagerzustand und Hauptschiffwechsel | P4 | Offen |
| P6 | Planetarer Betrieb mit Bevölkerung, Energie, Personal, Lagerreserven und Bilanz | P2, P4; Werte festlegen | Offen |
| P7 | Leitstellengebäude, Reichweitenprüfung und frühe Routenautomatisierung | P1, P4, P6; Transitregeln klären | Offen |
| P8 | Verarbeitungsumbau, reale Warenherkunft und NPC-Handel an Spielerwelten | P3, P6, P7; Migration und Einstieg prüfen | Offen |
| P9 | Leitstellenaufträge für Versorgung, Produktion und Absatz | P6–P8 | Offen |
| P10 | Spezialisierte Versorgungswelten und Schwerpunktwechsel | P6, P8 | Offen |
| P11 | Hauptquestzweige, Orbitalringe, Modulstudium und Forschungsfortschritt | P5–P9 | Offen |
| P12 | Zusätzliche Ruinenwelten, verbundene Leitstellen und Warpservice | P7, P9–P11; Besitzrechte klären | Offen |
| P13 | Gezeichnete Darstellung, Bilddialoge und sichtbare Entwicklungsstände | Stil und Assetumfang klären; Einführung schrittweise ab P4 | Offen |
| P14 | Gesamtsimulation, Mehrspielerprüfung, Abwesenheit und Balance | Fachliche Schritte abgeschlossen | Offen |

P8 darf nicht als isolierte Abschaltung öffentlicher Fabriken veröffentlicht werden, solange Einstieg, Materialversorgung und Migration nicht funktionieren. P13 begleitet die Fachschritte; die Position in der Tabelle bedeutet keine nachträgliche Gestaltung sämtlicher Bedienabläufe.

## 16. Abnahmekriterien und passende Prüfungen

| ID | Nachweis |
|---|---|
| A01 | Mehrere neue Spieler erhalten getrennte Heimatwelten außerhalb des Ursprungssektors mit gültigen Abständen, erreichbarer Grundversorgung und manuell möglicher gegenseitiger Hilfe. |
| A02 | Ein frischer Spielstand erreicht ohne fremde Spielerproduktion Grundversorgung, erste Verarbeitung und Leitstellenlevel 1; keine zirkulären Baukosten. |
| A03 | Inventar aller Warenquellen bestätigt: keine Verarbeitung außerhalb von Ruinenwelten, ausgenommen Schiffbau; keine unerlaubte Erzeugung verarbeiteter Güter durch Drift, Upgrades oder Questbelohnungsschleifen. |
| A04 | Produktion verbraucht tatsächliche Zutaten und hält Energie-, Personal-, Flächen- und Lagergrenzen ein; Reserven werden nicht doppelt verbraucht. |
| A05 | Eine Woche simulierter Unterversorgung führt zu Stillstand beziehungsweise Verlangsamung, aber nicht zu zerstörter Bevölkerung, Anlagen, Schiffen oder verlorenem Questfortschritt. |
| A06 | Reichweitenstufen, überlappende Netze und ungedeckte Lücken sind geprüft; automatische Befehle außerhalb der Abdeckung werden serverseitig verhindert, manuelle Flüge bleiben möglich. |
| A07 | Mehrere Frachter bedienen denselben Bedarf ohne Doppelbestellung; Preisgrenzen, Budget, Mindestkontostand und Reserven bleiben wirksam. |
| A08 | Alle Beispiele aus ROUTE-01 bis ROUTE-06 sind geprüft, einschließlich wiederholter Stopps, Neustart, eigenem Lager und unverändertem Mengenverkauf. |
| A09 | Alle Beispiele aus FRACHT-01 bis FRACHT-06 sind geprüft, einschließlich gemischter Fracht, Teilentladung, fehlendem normalen Laderaum, Passagiertrennung und Spezialfähigkeiten. |
| A10 | Normale Quest und mehrere Heimatquestzweige bestehen parallel; Produktions- und Betriebszeitfortschritt bleibt bei Unterbrechung erhalten. |
| A11 | Antrieb kann ausgebaut, am selben Planeten gespeichert und später in ein anderes Schiff eingebaut werden; niemals zwei Exemplare, kein Transport als Fracht, kein Fernwechsel und keine Automatisierung des Trägers. |
| A12 | Antriebszustand bleibt nach Neustart, doppelter Anfrage, Schiffsverkaufsversuch und Relokation korrekt; Flug verbraucht keinen Treibstoff und belegt keinen Fracht- oder Modulplatz. |
| A13 | Spezialisierungen erzeugen unterschiedliche Bedürfnisse und Vorteile; zusätzliche Ruinenwelten erfüllen Aufbau- und Verwaltungsanforderungen ohne pauschale neue Planetenzahlgrenze. |
| A14 | NPC-Händler entnehmen ausschließlich freigegebene Bestände, respektieren Reserven und liefern reale Waren mit Reisezeit ab. |
| A15 | Warpangebot berechnet Werte und Frachtzuschlag nachvollziehbar, zeigt Abdeckungsfolgen und transportiert keine Flottenschiffe. |
| A16 | Modulstudium verbraucht genau ein Modul, erhält den Bauplan und ermöglicht materialgebundene Fertigung ohne Umgehung besonderer Zugangsvoraussetzungen. |
| A17 | Bilddialoge sind überspringbar und nachlesbar; Folgen von Entscheidungen sind sichtbar; Routineverwaltung und automatische Lieferungen benötigen keine wiederholte Dialogbestätigung. |
| A18 | Gezeichnete Darstellung und sichtbare Entwicklungsstände sind visuell geprüft; Schiffsdesignüberarbeitung bleibt außerhalb dieses Auftrags. |
| A19 | Migrationsprobe erhält beziehungsweise kompensiert vereinbarte Altinvestitionen und weist Wiederherstellbarkeit nach; keine unangekündigte Löschung des Spielstands. |

Prüfstrategie für spätere Umsetzung: gezielte Unit- und Integrationstests für Fracht, Handel, Reichweite, Quest- und Antriebszustände; bestehende passende Tests aus `tests/`; anschließend `npm test`, wirtschaftliche Headless-Simulation sowie manuelle Mehrspieler- und visuelle Abnahme. Umfangreiche Simulationen prüfen Einstieg, Wochenabwesenheit, echte Warenherkunft, Absatz und längerfristige Expansion.

Für den reinen Dokumentationsschritt P0 genügen Inhaltsprüfung, Prüfung interner Verweise und `git diff --check`. Eine Spieltestsuite verifiziert keine neue Laufzeitfunktion, solange kein Spielcode geändert wurde.
