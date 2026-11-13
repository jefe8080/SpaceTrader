# Erweiterter Spieltest – 13. November 2026

Geprüfter Ausgangsstand: `b8aa3e4` auf `master`, nach PRD 25. Dieser Bericht ergänzt den älteren Bericht `Spieltest-2026-11-13.md`; dessen bereits erledigte Forderungen werden nicht als neue Fehler verkauft. Auftrag ist eine Untersuchung mit Vorschlägen, keine Umsetzung neuer Spielregeln. Deshalb kein neues Umsetzungs-PRD und keine Balanceänderung.

## Gesamturteil

Space Trader hat einen tragfähigen Kern: eigene Waren tatsächlich herstellen, reale Transporte organisieren und eine Ruinenwelt sichtbar wiederbeleben. Die Verzahnung von Bevölkerung, Qualifikationen, Energie, Modulen, Schiffen und Expansion bietet viel Substanz. Die größte Chance liegt derzeit darin, diese Substanz besser entscheidbar zu machen: Welches Problem löse ich gerade, was kostet es insgesamt, und wie verbessert es meine Möglichkeiten?

Meine Reihenfolge wäre: **verlässliche Zustandsanzeige → transparente Finanzierung und Produktionsplanung → mehr wirtschaftlich sinnvolle Spielweisen → abwechslungsreichere langfristige Ziele → zusätzliche Systeme**. Mehr Waren oder weitere Gebäudestufen allein würden die bestehenden Reibungen eher vergrößern.

Die Illustration ist eine Stärke. Die spielerische Lesbarkeit hält damit noch nicht überall Schritt. Im Kampf sind die vorhandenen Systeme umfangreicher, als die strategische Oberfläche vermuten lässt. Im späteren Aufbau kann eine tiefe Produktionskette zu wiederholter Beschaffung und Finanzierung werden. Das ist teilweise direkt beobachtet, teilweise eine aus Simulationen abgeleitete Designgefahr; diese Unterscheidung ist unten ausdrücklich markiert.

## Methode und Grenzen

- **M = manuell im Browser geprüft:** frischer Start, Funkkontakt, Zielnavigation, erster Flug, Landung, Rathausabschluss, Reparatur, Produktionspanel und Versorgungslink. Zusätzlich echte erspielte H06-/H10-Snapshots in Kopien geöffnet; Lager, Questfortschritt und Planetenlage angesehen. Aktive Schlacht in separater künstlicher Prüfwelt geöffnet, eigenes Schiff ausgewählt, Halten und Rückkehr zur KI erfolgreich verifiziert.
- **S = neu ausgeführte Simulation:** vier Einstiege mit Seeds 42, 7, 77 und 2026, jeweils 30 Sekunden modellierte Entscheidungszeit je Planeraktion; zusätzlicher durchgehender Fortschrittslauf mit Seed 131126; acht Kampfpaarungen mit je zehn Zufallsseeds und gleichen Standardhaltungen. Kampftakte direkt über `tickBattle`, daher ausdrücklich keine Simulation von strategischem Anflug, Abfangsuche oder Wirtschaftskosten eines Feldzugs.
- **T = bestehende Tests neu ausgeführt:** 411 Tests, 411 bestanden, kein Fehler und kein übersprungener Test. Enthalten unter anderem Handel, Verarbeitung, Logistik, Module, Tourismus, Bevölkerung, Kolonien, Warp, Kampf, Raids, Fraktionen, Geschichte und Persistenz. Ein bestandener Regeltest ist keine Spaßbewertung.
- **C = ergänzende Codeprüfung:** insbesondere Flottenzustände, Rezepte, Routen, Bevölkerung, Konsortium, Kriegswirtschaft, Schiffsvergleich und späte Hauptquests.
- **H = Designhypothese:** plausibler Vorschlag, dessen Spaßwirkung noch mit Menschen und längeren Partien geprüft werden muss.

Alle neuen Welten sind In-Memory-Welten oder separate Dateien unter `data/playtest-20261113/` beziehungsweise `data/prd5/seed131126/`. Der Hauptspielstand wurde nicht geöffnet oder verändert. Browserbesuche der erspielten Stände nutzen Kopien. Die Browser-Schlacht enthält künstlich bereitgestellte Schiffe und ist kein Nachweis ihrer normalen Erreichbarkeit.

Nicht durchgeführt: menschliche Mehrspielerpartie, vollständiges manuelles Durchspielen bis H17, Hörtest, gemessener Performance-Stresstest, mobile Touchabnahme, längere Offline-Rückkehrpartie. Entsprechend keine belastbaren Aussagen zu Endgame-Spielspaß, Audioqualität, Maximalflotte oder PvP-Metaspiel. Subjektive Punktnoten würden hier eine Genauigkeit vortäuschen, die die Untersuchung nicht liefert.

## Ergebnisse der neuen Läufe

### Einstieg und Spieltempo

| Seed | H05: zweites Schiff | H06: Grundindustrie | Einordnung |
|---|---:|---:|---|
| 42 | 1.958 s / 32:38 min | 3.235 s / 53:55 min | 47 Planeraktionen bis H06; 9.175 Cr am Abschluss |
| 7 | 1.987 s / 33:07 min | 3.307 s / 55:07 min | Einstieg erfolgreich |
| 77 | 1.939 s / 32:19 min | 3.317 s / 55:17 min | Einstieg erfolgreich |
| 2026 | 1.906 s / 31:46 min | 3.233 s / 53:53 min | Einstieg erfolgreich |

Die enge Spanne dieser vier Seeds ist positiv. Sie belegt weder weltweite Seedrobustheit noch, dass Anfänger diese Zeiten erreichen: Der Planer kennt Quellen, Befehle und Reihenfolge. Die 30 Sekunden sind eine Annahme für Bedienung und Lesen, keine gemessene menschliche Entscheidungszeit. H04 wird vor H03 abgeschlossen; die Questnummerierung ist also keine lineare Spielreihenfolge.

Im Browser funktionierten H00, bewusste Belohnungsabholung und die Reparatur des Landeplatzes. Das Rathaus zeigt konkrete Voraussetzungen; Produktionsanlagen zeigen Stillstandsgrund, Zutaten und tatsächliche Rate. Das sind bestätigte Verbesserungen gegenüber dem alten Bericht.

### Wirtschaft und Fortschritt

Der neue durchgehende Fortschrittsversuch ist separat in `qa/playtest-2026-11-13/progression131126.json` dokumentiert. Ergebnis: **nicht erfolgreich, Exitcode 1**. H08 wird nach 27.125 s (7:32 h), H10 nach 42.005 s (11:40 h), H11 nach 55.338 s (15:22 h) mit 256 Einwohnern erreicht. Nach 144.004 s bricht der Planer am 40-Stunden-Limit ab; H12 und H13 sind nicht abgeschlossen. Bis dahin: 143 Finanzierungsquests, 91.160 Cr ausgewiesene Kuriererlöse und 34 Exporte. H05 und H08 liegen in den geprüften Zielkorridoren; H13 ist nicht abgenommen. H11 überwindet die frühere Wasser-Planerblockade. Das beweist nicht automatisch eine ausgewogene Versorgung über das gesamte Spiel.

Auffällig ist die Finanzierung: Auf zunächst gute Feingoldexporte folgen im gleichen Lauf negative Ergebnisse. Export 23: −316 Cr, Export 24: −4.516 Cr, Export 25: −8.853 Cr. Danach greift der Planer stärker auf Kurieraufträge zurück; bei 105.951 s sind bereits 71 abgeschlossene Finanzierungsquests und 44.430 Cr ausgewiesene Kuriererlöse protokolliert.

**Interpretation:** Marktaufnahme und Preiswirkung sind relevant; ein einmal funktionierendes Produkt ist kein dauerhaft garantierter Geldautomat. Das ist grundsätzlich interessant. Der aktuelle Planer reagiert jedoch nicht mit einer vorausschauenden Nettoentscheidung. Seine Exportzahl ist die Veränderung des gesamten Kontos zwischen Produktionsbeginn und Rückkehr, einschließlich weiterer währenddessen ausgelöster Vorgänge; sie ist kein isoliertes Waren-Deckungsbeitragskonto. Aus den Verlusten folgt deshalb keine pauschale Forderung nach höheren Verkaufspreisen. Zunächst braucht es bessere Kosten-/Absatzdiagnose und eine Gegenprobe mit adaptiver Produktion sowie mehreren Schiffen.

46 Rezepte wurden zusätzlich mit kontrollierten Einkaufs-/Verkaufskursen bei 20, 50 und 80 Prozent Füllstand berechnet. Bei 50 Prozent ist kein rechnerischer Rezeptdeckungsbeitrag negativ. Das ist nur ein Plausibilitätscheck: gleiche Standortbedingungen für alle Waren, keine Rohstoffaufschläge besonderer Extraktoren, keine Gebäudeinvestition, Personal-, Energie-, Transport- oder Kettenkosten und keine garantierte Absatzmenge. Es ist ausdrücklich kein allgemeiner Rentabilitätsnachweis.

### Kampfvergleich

Je zehn Läufe, Seeds 1–10, tatsächliche Standardtaktik beider Seiten, frische Welt je Lauf. Sieger bedeutet Schlachtausgang einschließlich Rückzug/Kapitulation, nicht zwingend Vernichtung. Kleine Stichprobe, ein Aufstellungsmodell, keine manuelle Optimierung. Dauer in taktischer Zeit; die reguläre Spielschleife skaliert diese mit 0,5.

| Paarung A gegen B | Katalogpreis A / B | Siege A:B | Aussage |
|---|---:|---:|---|
| 1 Korvette gegen 1 Korvette | 220.000 / 220.000 | 4:6 | Kein offensichtlicher vollständiger Seitensieg in dieser Stichprobe |
| 3 Fregatten gegen 1 Zerstörer | 2.400.000 / 2.400.000 | 0:10 | Deutlicher Prüfpunkt für gleich teure Flotten; Zerstörer im Mittel noch ca. 75 % Rumpf |
| 4 Abfang- und 2 Bomberstaffeln gegen 1 Kreuzer | 880.000 / 7.000.000 | 0:10 | Kein fairer Kostenvergleich; Niederlage allein kein Beleg für schwache Staffeln |
| 1 Ionenkreuzer gegen 1 Kreuzer | 14.000.000 / 7.000.000 | 10:0 | Teurer Spezialist gewinnt; allein kein Beleg für Übermacht |
| 1 Ionenkreuzer gegen 2 Kreuzer | 14.000.000 / 14.000.000 | 0:10 | Ergebnis kippt bei gleichem Budget; Spezialrolle genauer untersuchen |
| 20 Bomberstaffeln gegen 1 Zerstörer | 4.000.000 / 2.400.000 | 10:0 | Größere, hier auch teurere Bomberverbände sind wirksam; kein Gleichbudgetnachweis; Anti-Staffel-Eskorten als nächste Gegenprobe |
| 2 Korvetten gegen Frachter + Korvette | 440.000 / 260.000 | 10:0 | Eskortschutz ist kein pauschaler Schutz gegen Übermacht |
| Korvette gegen unbegleiteten Frachter | 220.000 / 40.000 | 10:0 | Sofortige Kapitulation, beide Seiten mit vollem Rumpf; kein Feuerkampf |

Der wichtigste manuelle Kampfbefund ist kein Zahlenproblem: **Ein aktiv kämpfender Greif erscheint in der Flottenliste und im gewöhnlichen Schiffsstatus als „Wartet im All“; der Filter zählt ihn als untätig. Erst im aufgeklappten Kampfbereich steht „In einer Schlacht“.** In `client/js/ui/fleet.js` prüft der Untätigfilter nur die Befehlsqueue, und `statusText` in `client/js/util.js` behandelt eine leere Queue ohne Kampfpriorität als Warten. Das kann ein echter Spieler unmittelbar falsch interpretieren.

Die taktische Ansicht lädt und zeigt Einheiten, Schildseiten, Systeme, Munition, KI und Verlauf. Halten wechselt sichtbar auf manuelle Führung; KI lässt sich wieder einschalten. Die Ansicht nutzt auf dem geprüften hohen Fenster viel leeren Raum oberhalb und unterhalb der eigentlichen Karte. Kleine, teilweise überlappende Schiffe sind schwieriger zu lesen als ihre umfangreichen Systemdaten.

## Konkrete Verbesserungsvorschläge

Prioritäten: **P1** zuerst bearbeiten, weil Klarheit oder Spielfluss stark betroffen sind; **P2** nächstes zusammenhängendes Arbeitspaket; **P3** optionaler Ausbau. Es wurden keine P0-Blocker nachgewiesen. Aufwand ist eine grobe relative Einschätzung, keine Terminplanung. Jeder Vorschlag braucht vor Umsetzung eine abgestimmte Anforderung; dies ist keine automatische Featurefreigabe.

### Einstieg, Quests und Motivation

| ID | Priorität / Evidenz | Befund und Vorschlag | Woran Erfolg erkennbar wäre |
|---|---|---|---|
| N01 | P1 · M/C · klein | „Versorgung organisieren“ im Wasserwerk führt vor Reparatur der Leitstelle nur zu deren Ruine. Kontextabhängig manuelle Eisquelle, Anflug und Lagerschritt anbieten; Automatisierung mit Voraussetzung daneben. | Ein neuer Spieler gelangt von „Eis fehlt“ ohne Umweg zu einer jetzt ausführbaren Beschaffung. |
| N02 | P2 · M/S · mittel | H07 bündelt Schule, Betrieb, Ausbildung und zwei Eigenproduktionen. Eine wählbare Aufgabenliste mit direkten Fachorten und Materialbedarf anbieten. | Spieler können den nächsten sinnvollen Schritt benennen und auslösen. |
| N03 | P2 · S/H · mittel | Das zweite Schiff kommt im Planer nach etwa einer halben Stunde. Bei Erhalt eine konkrete freiwillige Arbeitsteilung anbieten: Versorgung übernimmt Schiff B, Schiff A erkundet/handelt. | Neue Spieler setzen beide Schiffe sinnvoll ein, ohne Routenregeln nachzulesen. |
| N04 | P2 · M/H · klein | Questnummern springen wegen paralleler Zweige. Ein kleiner Abhängigkeitsbaum mit aktiven Zweigen erklärt Fortschritt besser als Nummern allein. | H04 vor H03 wirkt nachvollziehbar; erfüllte parallele Ziele werden gefunden. |
| N05 | P2 · S/H · mittel | Produktionswartezeit mit optionaler Erkundung, kurzer Lieferung oder Informationsgewinn füllen. Belohnung für Entscheidungen statt bloßer zusätzlicher Klickarbeit. | Spieler haben während längerer Zyklen mindestens zwei freiwillige sinnvolle Tätigkeiten. |
| N06 | P3 · M/H · mittel | Die starke Eröffnung mit Mira später durch Reaktionen auf Versorgung, Ausbildung, neue Schiffe und Kolonie fortführen. Keine weitere Modalflut. | Fortschritt verändert kurze Dialoge und sichtbar das Leben der Siedlung. |

### Handel und wirtschaftliche Entscheidungen

| ID | Priorität / Evidenz | Befund und Vorschlag | Woran Erfolg erkennbar wäre |
|---|---|---|---|
| N07 | P1 · S/C · groß | Vor Exporten den erwarteten Nettoerlös für die konkrete Menge zeigen: Einkauf/Herstellung, Zielaufnahme, Reisekosten und Aktualität der Kurse. Verfügbare Liquidität des Käufers berücksichtigen. | Der Spieler erkennt vor Abflug, ob 20 Einheiten absetzbar sind und welche Unsicherheit bleibt. |
| N08 | P1 · S · mittel | Den Fortschrittsplaner gegen Verlustserien absichern: Alternativen vergleichen, verschlechterte Exporte abbrechen, Kosten getrennt protokollieren. Anschließend mehrere Seeds und Parallelbetrieb vergleichen. | Ein fehlgeschlagener Planerpfad lässt sich von einer echten Progressionssackgasse unterscheiden. |
| N09 | P2 · M/C · mittel | Eigenes Lager in der Schiffsansicht bezeichnet Waren als „Händler“ und „kostenlos“. Eigentumstransfer stärker als Lagerbestand/Entnahme darstellen. Keine Profitbehauptung aus kostenlosem Laden ableiten. | Spieler unterscheiden Warenwert, Eigentumstransfer und Verkaufserlös. |
| N10 | P2 · M · klein | Auch bei Nullbestand stehen Ladeaktionen bereit. Nicht ausführbare Mengen mit erkennbarem Grund deaktivieren bzw. tatsächlich verfügbare Maximalmenge anzeigen. | Leere Angebote führen nicht erst nach Klick zu Ergebnislosigkeit. |
| N11 | P2 · C/H · groß | Ein einfaches Geschäftsbuch trennt externen Umsatz, externe Beschaffung, Eigenlagertransfer, zivile Erlöse, Questgeld und Investitionen. Der Stunden-Saldo allein reicht zur Produktionsentscheidung nicht aus. | Dieselbe Lieferung wird nicht als kostenloser Gewinn und der Zulieferer nicht isoliert als Verlustgeschäft missverstanden. |
| N12 | P2 · S/H · mittel | Marktübersichten um Absatzreichweite und Verlauf für ein Produkt erweitern; vorhandene Filter/Charts weiterverwenden. Hinweise auf sinkende Aufnahme statt garantierter Gewinnempfehlung. | Spieler wechseln Produkte/Abnehmer aus nachvollziehbarem Anlass. |
| N13 | P3 · H · groß | Freiwillige Lieferverträge mit transparenten Mengen, Preisen und Laufzeiten schaffen planbaren Absatz neben freiem Handel. Nur echte Nachfrage bedienen, keine unbegrenzte Subvention. | Mindestens zwei Wirtschaftsmodelle bleiben attraktiv: verlässlicher Vertrag oder flexibler Handel. |

### Verarbeitung, Forschung und Aufbau

| ID | Priorität / Evidenz | Befund und Vorschlag | Woran Erfolg erkennbar wäre |
|---|---|---|---|
| N14 | P1 · S/C/H · groß | Einen Produktionsplan für ein konkretes Ziel anbieten: Gesamtzutaten, vorhandene Anlagen, fehlende Qualifikationen, Energie, reservierte Mengen und kritischer Pfad. Die neuen Einzelanlagenpanels als Einstieg nutzen. | „20 Roboter bauen“ wird in nachvollziehbare Arbeitsschritte zerlegt. |
| N15 | P1 · M/S/H · mittel | Engpassanzeigen nach Versorgungswirkung ordnen: Grundbedarf vor optionaler Industrie; fehlende Menge und Vorratsreichweite nennen. Die Planetenlage zeigt Stillstände bereits korrekt – das ist die Grundlage. | Spieler erkennen, welcher Stillstand wirklich dringlich ist. |
| N16 | P2 · S/H · mittel | Beim Bau Auswirkungen auf das gesamte Netz vorschauen: zusätzliche Energie/Arbeitskräfte, verdrängte Produktion, verbleibende Wohn- und Lagerkapazität. | Ein Bauprojekt löst nicht überraschend einen anderen kritischen Mangel aus. |
| N17 | P2 · S/C/H · groß | Zielbezogene, aufhebbare Materialreservierungen für größere Vorhaben prüfen. Vorhandene Schutz-/Reservierungslogik zuerst vollständig nutzen und erklären. | Für H12 gesparte Materialien verschwinden nicht unverständlich in anderer Produktion. |
| N18 | P2 · C/H · mittel | Forschung durch Vorschau des konkreten Nutzens verständlich machen: erreichbare Baupläne, Einsatzort und benötigte Exemplar-/Fertigungsplätze. | Spieler entscheiden zwischen Forschungsprojekten anhand ihres Produktionsplans. |
| N19 | P3 · H · groß | Alternative Ketten oder Betriebsweisen nur dort ergänzen, wo eine echte Abwägung entsteht, etwa mehr Energie gegen weniger seltene Zutaten. | Zwei Produktionslösungen passen zu unterschiedlichen Standorten; keine ist überall optimal. |
| N20 | P2 · S/H · mittel | Nach dem Wiederaufbau wiederkehrende Aufgaben bündeln: gespeicherte Beschaffungsziele und kopierbare Betriebsprofile. Keine neu erfundenen Einzelinventare pro Silo. | Ein weiterer Betrieb derselben Kette erfordert weniger Routineeingaben. |

### Routen, Flotten und Expeditionen

| ID | Priorität / Evidenz | Befund und Vorschlag | Woran Erfolg erkennbar wäre |
|---|---|---|---|
| N21 | P1 · M/C · klein | Kampf, Gefangenschaft und Reparatur vor Queue-Leere auswerten; aktiven Kampf aus „Untätig“ ausschließen und direkt zur Schlacht verlinken. | Greif mit `battle` erscheint durchgehend als kämpfend; Zähler und Details stimmen überein. |
| N22 | P2 · C/H · mittel | Route vor Aktivierung trocken prüfen: passende Frachtklassen, Modulkosten an Platz, Abdeckung, Budget, erwartete Lade-/Entlademengen und Stoppbedingungen. | Ein gültiger, aber nutzloser Auftrag fällt vor der ersten leeren Runde auf. |
| N23 | P2 · C/H · mittel | Routen und Leitstellenaufträge über ihren Zweck erklären: wiederkehrender Ablauf versus Zielversorgung/Produktionsauftrag. Von der Anlage mit vorausgefülltem Bedarf starten. | Spieler wählen bewusst die passende Automatisierung. |
| N24 | P2 · S/H · mittel | Routengesundheit zeigen: letzte erfolgreiche Zustellung, echte Liefermenge pro Stunde, Blockadegrund und Unterdeckung des Zielbedarfs. | Eine fahrende Route wird nicht mit einer funktionierenden Versorgung verwechselt. |
| N25 | P2 · M/C/H · mittel | Das Reliktschiff kann im H10-Stand 600 Tempo und treibstofffreien Flug erreichen; das gewöhnliche Schiff ist erheblich langsamer. Komfort und Balance dieser Differenz in Parallelpartien prüfen. | Das Relikt bleibt besonders, ohne jede andere manuelle Aufgabe zur lästigen Wartezeit zu machen. |
| N26 | P3 · C/H · groß | Expeditionen durch Befunde mit Konsequenzen aufwerten: Materialprobe, Standortvorzug oder alternative Infrastrukturentscheidung. Kein neuer Pflichtsammelbaum. | Erkundung verändert die nächste Entscheidung statt nur die aufgedeckte Fläche. |

### Krieg, Diplomatie und Risiko

| ID | Priorität / Evidenz | Befund und Vorschlag | Woran Erfolg erkennbar wäre |
|---|---|---|---|
| N27 | P1 · S/H · mittel | Gleich teure Flotten systematisch prüfen: Seiten tauschen, Haltungen variieren, Mischflotten und Anti-Bomber-Eskorte hinzufügen, mehr Seeds. Erst danach Werte ändern. | Die 0:10-Paarungen sind durch Rollen erklärbar oder führen zu gezielten Anpassungen. |
| N28 | P2 · M/C/H · mittel | Schiffssterne um Stärken, schlechte Ziele, Munitionskosten und Beispielkonter ergänzen. Theoretischer Schaden über alle Feuerwinkel ist keine tatsächliche Gefechtsleistung. | Ein Spieler versteht, warum die nominell starke Flotte ein Duell verliert. |
| N29 | P2 · M/H · mittel | Taktikkarte besser an das Fenster anpassen, Zoom/Einheitenbeschriftung und Auswahl überlappender Schiffe verbessern. Die Seitenliste als zuverlässigen Alternativzugang erhalten. | Kleine Staffeln und Schildseiten bleiben im Gefecht lesbar. |
| N30 | P2 · M/C/H · mittel | Ein kurzes freiwilliges Übungsgefecht erklärt KI, Halten, Prioritätsziele, Schildseiten und Rückzug ohne Verlust normal erspielter Schiffe. | Der erste echte Kampf verlangt kein Lernen unter Totalverlustrisiko. |
| N31 | P2 · C/H · mittel | Fraktionsgrenzen, Friedenszeit, Aggressionsgründe und Konsequenzen vor dem riskanten Auftrag sichtbar machen. Bestehende Warnungen prüfen und vereinheitlichen. | Spieler können einen bevorstehenden Konflikt erkennen und eine zivile Alternative wählen. |
| N32 | P2 · C/H · groß | Feldzugkosten zusammenhängend anzeigen: Munition, Reparatur, Ausfall, Freikauf und Ersatz. Krieg muss auch wirtschaftlich entscheidbar sein. | Der Siegbericht kann einen wirtschaftlichen Verlust erklären. |
| N33 | P3 · H · groß | Diplomatische Alternativen prüfen: Versorgungspakt, begrenzte Eskorte, zeitlich begrenztes Durchflugrecht. Klare Gegenleistung und Kündigungsfolgen statt zusätzlicher Rufgrind. | Ein Handelsstil kann Konflikte anders lösen als durch eine größere Flotte. |
| N34 | P3 · S/C/H · groß | Sofortige Kapitulation unbegleiteter Frachter ist regelkonform, aber hart. Vor gefährlichen Routen Verlust-/Kapitulationsrisiko und vorhandene Schutzoptionen deutlich zeigen. Erst danach über Fluchtfenster nachdenken. | Ein Frachterverlust wird als bewusstes Risiko statt unverständlicher Überfall erlebt. |

### Bevölkerung, Kolonien, Zusammenarbeit und Endgame

| ID | Priorität / Evidenz | Befund und Vorschlag | Woran Erfolg erkennbar wäre |
|---|---|---|---|
| N35 | P2 · S/C/H · mittel | Bevölkerungswachstum mit konkreter nächster Grenze erklären: Wohnraum, Versorgung, ausbildungsfähige Personen und freie Arbeitskapazität. | „250 Einwohner“ ist ein planbares Siedlungsziel statt eine isolierte Zahl. |
| N36 | P2 · C/H · mittel | Tourismus als Rundreisegeschäft zeigen: Herkunft, Kabinen, Aufenthaltsdauer, Rückkehr und realistischer Nettoertrag. Vorhandene Reisegeldregeln nicht als neue Mechanik verkaufen. | Eine Touristenroute lässt sich vor Einrichtung wirtschaftlich vergleichen. |
| N37 | P2 · C/H · groß | Neue Kolonie mit Aufgabenprofil gründen: Rohstoffnähe, Industrieentlastung oder Logistikknoten; Kosten und dauerhafte Lieferbeziehungen vorschauen. | Die zweite Welt eröffnet neue Entscheidungen statt identischen Wiederaufbau zu verdoppeln. |
| N38 | P2 · C/H · mittel | Konsortiumseinzahlung/-auszahlung gemeinsam erklären: 90 % gehen in den Pool, 80 % werden ausgezahlt; eine Hin-und-zurück-Bewegung lässt 72 % des ursprünglichen Geldes übrig. | Die kombinierte Wirkung ist vor der Einzahlung klar; Zusammenarbeit fühlt sich nicht versehentlich bestraft an. |
| N39 | P3 · C/H · groß | Kooperative Vorhaben mit klaren Beiträgen und Nutzen priorisieren: gemeinsame Lieferverträge, Infrastrukturprojekt oder Expedition. Reales Mehrspielertesten ist Voraussetzung. | Zwei Menschen profitieren durch Arbeitsteilung, nicht nur durch Geldzusammenlegen. |
| N40 | P2 · C/H · groß | Für H14–H17 und danach mehrere selbst gewählte Fernziele anbieten: Industrienetz, Handelsmacht, Expedition oder militärische Sicherung. Keine neue Pflichtwährung. | Nach Forschungszentrum und zweiter Welt bleiben unterschiedlich spielbare Ziele. |

### Grafik, Bedienung und Atmosphäre

| ID | Priorität / Evidenz | Befund und Vorschlag | Woran Erfolg erkennbar wäre |
|---|---|---|---|
| N41 | P2 · M · mittel | Stadtmotiv, Funktionsgebäude und freie Plätze grafisch stärker verbinden: Schatten, Maßstab, Bodenanschluss und Zustandssprache angleichen. Im geprüften Bild stehen funktionale Gebäude deutlich vor der sehr detailreichen Kulisse. | Ein Bauwerk wirkt als Teil der Stadt und ist trotzdem sofort als Spielobjekt erkennbar. |
| N42 | P2 · M/H · mittel | Wiederaufbauzustand stärker sichtbar machen: wenige klare Ruinen-/Bau-/Betriebsmerkmale, Licht, kleine Transporte und Arbeitseffekte. | Reparatur und laufende Produktion sind auch ohne geöffnetes Panel unterscheidbar. |
| N43 | P1 · M · mittel | Kopfzeile entlasten: wichtigste Werte sichtbar halten, Qualifikationsdetails in gut erreichbare zweite Ebene; horizontales Scrollen verständlicher kennzeichnen. Im geprüften Fenster wird der Spezialistenbereich angeschnitten. | Credits, Versorgung und kritische Meldung bleiben bei schmalerem Fenster verständlich. |
| N44 | P2 · M/H · mittel | Schriftgröße, Kontrast und visuelle Hierarchie der dichten Panels prüfen; lokale Hauptaktion stärker hervorheben. Tooltips als Ergänzung, nicht einzige Erklärung. | Ein fremder Spieler findet den nächsten Schritt ohne Bildschirm für Bildschirm zu lesen. |
| N45 | P2 · C/H · mittel | Audiotest mit Menschen nachholen: Dauerbelastung, getrennte Lautstärken, Kampfwarnung und wichtige Ereignisse. Bestehende prozedurale Musik zuerst beurteilen. | Wichtige Hinweise sind wahrnehmbar und längere Sitzungen bleiben angenehm; keine Qualitätsbehauptung aus Code allein. |
| N46 | P2 · M/C/H · groß | Barrierefreiheit gezielt testen: Gebäudeliste ist ein guter Zugang; nun vollständige Tastaturbedienung von Handel und Kampf, Fokus nach Panelwechsel und nichtfarbliche Warnungen prüfen. | Ein vollständiger Beschaffungsablauf und wesentliche Kampfbefehle gelingen ohne präzisen Kartenklick. |

## Empfohlene Arbeitspakete

1. **Zustände zuverlässig machen:** N21, N01, N10 und N43. Kleine bis mittlere Änderungen mit hoher unmittelbarer Wirkung. Gezielte Browserregressionen für Kampfstatus, Nullbestand und zerstörte Leitstelle.
2. **Wirtschaft verstehen und planen:** N07, N08, N11, N14 und N15. Erst Diagnose und adaptive Gegenproben; danach entscheiden, ob Produktions- oder Preisregeln verändert werden müssen.
3. **Bestehende Tiefe nutzbar machen:** N03, N22–N24, N27–N30 und N35–N38. Parallelspiel, Konterrollen und Expansion verständlich gestalten.
4. **Neue Spielanlässe erproben:** ein kleiner Prototyp aus N13, N26 oder N39. Jeweils mit klarer Frage testen, ob er Entscheidungen und Wiederholbarkeit verbessert; nicht alle Systeme gleichzeitig ergänzen.
5. **Atmosphäre gezielt polieren:** N41/N42 plus menschlicher Audio- und Lesbarkeitstest. Die vorhandene Illustrationsqualität bewahren.

Vor größeren Implementierungen ist laut AGENTS.md Planung mit `grillme` vorgesehen. Dieser Skill ist in der verfügbaren Liste nicht vorhanden; vorhanden ist `grilling`. Für eine folgende Umsetzung muss daher das Planungsvorgehen geklärt und anschließend ein eigenes PRD erstellt werden. Für die hier beauftragte Untersuchung war keine Änderung des Spiels notwendig.

## Nachweise und Reproduktion

- `npm test` → `qa/playtest-2026-11-13/tests.txt`.
- `node sim/homeworld-onboarding.js --seed 42 --decision-seconds 30 --db <neuer Dateipfad>` → `onboarding42.json`.
- `node sim/playtest-20261113.js` → `probes.json`, drei weitere Einstiege, 80 Gefechte und 46 Rezeptprüfungen. Laufzeit abhängig vom Rechner; keine bestehenden Spielstände geöffnet.
- `node sim/playtest-20261113.js --combat-only` → `combat.json`; wiederholt die 80 Gefechte ohne Einstiegsläufe.
- `node sim/homeworld-progression.js --seed 131126 --out docs/qa/playtest-2026-11-13/progression131126.json` → Fortschrittsprotokoll. Erzeugt Checkpoints unter `data/prd5/seed131126/`; für einen unabhängigen Wiederholungslauf einen neuen Seed wählen. Vorhandene gleichnamige Checkpoints werden vom bestehenden Planer nicht überschrieben.
- `node sim/playtest-ui-20261113.js` → In-Memory-Testserver auf Port 3039, Kapitän `Kampftest`, künstlich bereitgestellte Kampfschiffe. Spiel läuft ab Serverstart; zur Wiederholung Server neu starten. Enthält den erforderlichen `/api/status`-Endpunkt.

Die Datenbanken sind lokale Prüfmittel und werden nicht ins Repository aufgenommen. Die Berichtsvorschläge sind bewusst von Spieländerungen getrennt. Offene Nachprüfungen: vollständiger H13-/H17-Pfad mit adaptiver Finanzierung, größere Gleichbudget-Kampfmatrix, echte kooperative Partie, Audio, Tastaturbedienung, Fenstergrößen und Performance.
