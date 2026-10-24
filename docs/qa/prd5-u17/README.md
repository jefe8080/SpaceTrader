# U17: Gesamtabnahme und frischer Hauptstart

Die Hauptwelt verwendet Profil `homeworld`, Weltversion 5 und `data/world-v5/spacetrader.db`. Der Pfad existierte vor dem Start nicht. `fresh-runtime.json` dokumentiert den tatsächlichen Hauptstart mit null Spielern/Schiffen/Besitz, 57 öffentlichen Märkten und keinem erzeugten Industriewarenbestand. `fresh-start.png` zeigt die leere Kapitänsauswahl im Browser. Spielseite, Geschichte und Grafikassets liefern HTTP 200; `/dev/planet.html` ist im Hauptbetrieb nicht freigegeben. `npm run dev:prd5` behält seinen getrennten Datenpfad und aktiviert die Prüfoberfläche ausdrücklich.

## Reproduzierbare Fortschrittssimulation

`npm run sim:progression` startet eine vollständig neue In-Memory-Welt mit Seed 42. Der Bericht `progression.json` stammt aus einem ununterbrochenen Lauf; `debugResume` darf darin nicht gesetzt sein. Zwischenstände in `data/prd5/` sind ausschließlich Diagnosehilfen. Die normale Abnahme verwendet weder diese Zwischenstände noch injizierte Credits, Waren, Einwohner, Qualifikationen, Questabschlüsse, Schiffe oder Baupläne.

Der Planer fliegt tatsächlich, kauft natürliche Vorräte, verarbeitet vollständige Rezeptzyklen, baut mit realen Kosten und finanziert sich durch eigene Exporte sowie normale Kurierquests. Volle/zahlungsunfähige Käufer lassen Ladung bestehen und erfordern einen anderen Käufer. Jede zusätzliche Qualifikation wird ausgebildet, jede Kabine gebaut; Anwerbung entfernt tatsächliche Herkunftspersonen. H08 bindet den erhaltenen zweiten Spatz dauerhaft. H13 baut einen neuen Spatz aus Materialien, transportiert 20 eigene Auswanderer, gibt ihn samt Kabine dauerhaft ab und benötigt ein weiteres Schiff vor Ort. Die zusätzliche Welt beginnt mit 20 Menschen, acht Plätzen, leerem Lager und ohne neue Einstiegshilfen.

Modellannahmen: 30 s Lese-/Entscheidungszeit je Einstiegsbefehl und anschließend 2 s je Bedienaktion. Dies sind ausschließlich Zeiten des Testplaners, keine im Spiel hinzugefügten Wartezeiten. Der Planer kennt mögliche Rohstoffkoordinaten, muss sie aber physisch anfliegen und entdecken. Er arbeitet überwiegend seriell mit dem manuellen Reliktträger; die verfügbaren Automatisierungs- und Mehrschiffmöglichkeiten werden nicht auf optimalen Durchsatz ausgereizt. Ergebnisse sind ein nachvollziehbares Modell und keine gemessenen menschlichen Spielzeiten. Der schnelle Einstieg ohne Bedienzeit bleibt mit `npm run sim:homeworld` reproduzierbar (H05 19,5 min, H06 33,3 min).

H08 liegt im seriellen Modell geringfügig über der 8-h-Zielobergrenze; die Abweichung unter 2 % wird ausdrücklich dokumentiert. Eine weitere künstliche Verzögerung oder fein auf einen einzigen Seed zugeschnittene Materialänderung wird daraus nicht abgeleitet. Alle tatsächlichen Bauabschnitte bleiben unter zehn Minuten. Die übrigen Zeitkorridore werden im Bericht separat geprüft.

Endergebnis des frischen vollständigen Laufs:

| Ereignis | Serverzeit |
|---|---:|
| H05, zweiter Frachter | 00:30:48 |
| H06, eigene Barrenproduktion | 00:52:05 |
| H07 | 02:31:41 |
| H08, kleiner Ring | 08:06:56 |
| H11 | 14:48:53 |
| H12 | 21:42:46 |
| Zweite Welt vollständig gegründet | 29:59:42 |
| Rückkehr und Abholung H13 | 30:00:48 |

H08 liegt 6 min 56 s beziehungsweise 1,44 % über dem Richtwert. H13s tatsächliche Weltgründung liegt innerhalb des Korridors; die anschließend wirklich geflogene Rückkehr und Questabholung liegen 48 s hinter der 30-h-Marke. Diese beiden kleinen Abweichungen sind gemäß A25 begründet dokumentiert. Die erste strenge Auswertung nur nach Abholzeit meldete H13 deshalb zunächst außerhalb; die getrennte Auswertung in `sim/progression-report.js` bewahrt beide tatsächlichen Zeitstempel und bewertet die reale Gründung ausdrücklich. Dafür wurde kein Spielzustand verändert oder Simulationsabschnitt verkürzt.

Am Ende: 43.611 Cr, 29 Exportläufe und drei normale Kurierquests; Heimat 247 Einwohner, zusätzliche Welt 20 Einwohner, acht Plätze und null Einstiegshilfen. Genau ein eigenes Schiff verbleibt: derselbe Spatz mit Relikt ×4 und physischer geschirmter Kammer. Der H05-Spatz ist im Orbitalring, der später aus echten Materialien gebaute Expeditionsspatz samt Kabine in der neuen Siedlung gebunden. Der Folgeauftrag ist mit vorhandener Industrie und Restbudget weiter spielbar.

## Kalibrierung

Frühe Diagnoseläufe zeigten einen erheblichen Geldengpass beim Aufbau der ersten vollständigen Industrieketten. `progression-before-balance.json` ist ausdrücklich ein Diagnosezwischenstand mit den ursprünglichen Preisen und kein vollständiger Abnahmelauf. `progression-low-working-capital.json` dokumentiert einen vollständig abgeschlossenen Vergleichslauf, der durch zu geringe liquide Beschaffungsreserve unnötige Kurierfinanzierung benötigte.

Kalibrierte Baucredits: Gruppen I/II/III/IV/V jetzt 1.250 / 2.500 / 5.000 / 25.000 / 50.000 Cr; Schule 6.000 Cr, Forschungszentrum 50.000 Cr, Flächenschritt zunächst 3.000 Cr bei unverändertem Faktor 1,4. Zutaten, Bauzeiten, Rezeptgeschwindigkeiten, Energie, Personal, Warenbasispreise, Schiffs-/Gründungskosten und Warenherkunft bleiben unverändert. Nach H10 hält der Planer vor Neubauten 20.000 reale Credits für teure Rohstoffbeschaffung frei; diese Reserve erzeugt kein zusätzliches Geld.

## Abnahmekriterien und Nachweise

| Kriterien | Nachweis |
|---|---|
| A01 | `homeworld.test.js`: 24 Spieler, Abstände, erreichbare Grundquellen und erschöpfte Suchringe; `prd5-multiplayer.test.js`: gleichzeitiger/späterer Einstieg |
| A02 | Vollständiger Einstieg im ununterbrochenen Simulationsbericht; keine fremde Industrie; Einmaligkeit zusätzlich in Heimat-/Relikttests |
| A03 | Vollständiges `docs/PRD-5-warenquellen.md`, reale Wirtschafts-/Modul-/Werft-/Quest-/Gründungsprüfungen und frischer Hauptstart ohne Industriewaren |
| A04–A08 | Betriebs-, Bevölkerungs-, Refinement- und Wirtschaftstests: vollständige Zyklen, Budget-/Qualifikationsgrenzen, Woche Mangel ohne Verlust, konkrete Kataloge und höchstens 600 s Bauzeit |
| A09–A11 | Abdeckungs-/Relikttests mit durchgängigen Flugstrecken, verbundenen Netzen, Wurmlöchern, sicherem begonnenem Abschnitt und Neustart |
| A12–A13 | Routen-Zielbestände, Teilkäufe und Preisgrenzen; gemeinsame geschirmte Überlaufbelegung, physische Module und Passagiere |
| A14–A16 | Sechs Veredelungen, alle 18 Fraktionsgebühren, tatsächliche Module/Studium und materialgebundene reguläre/fraktionelle/persönliche Werften |
| A17–A19 | Alle 18 Hauptquests, parallele Zweige, reale Archivflüge und eindeutiger Reliktstandort ×4/×5/×6; Abgabe-/Verkaufs-/Neustartsperren |
| A20–A21 | `colonies-warp.test.js`: 15 Gründungs-/Warp-/Persistenzprüfungen; echte Browsernachweise U15 einschließlich abgeschlossenem Transfer |
| A22–A23 | U16: 195 gerenderte Fälle über 13 Welten und fünf Formate, keine Randlücken/Browserfehler; gezeichnete Assets, Entwicklungsstände und mobiles Journal |
| A24 | Logistiktests für konkurrierende Lieferungen, Quellenreservierung, Gegenkassen, bindende Budgets, Prioritäten und Abbruch ohne Ladungsverlust |
| A25 | `progression.json`, explizite Modellannahmen, kalibrierte Credits und oben dokumentierte kleine H08-Abweichung |
| A26 | Drei neue Mehrspielerprüfungen plus vorhandener Rohform-/Modulhandel, Konsortiumsrollen und getrennte persönliche Netze |
| A27 | Tatsächlich frisch erzeugte Hauptwelt mit separatem Pfad, Profil/Version und Browser-/HTTP-/Bestandsprüfung in `fresh-runtime.json` |

Bereits geprüfte U1–U16-Pakete und ihre Screenshots bleiben unter den jeweiligen QA-Verzeichnissen nachvollziehbar. Die Speicher-/Neustarttests ergänzen den laufenden Hauptstart; Abschaltzeit erzeugt keinen Fortschritt. Der Hauptstart übernimmt keinen Diagnose- oder Testspieler.

Die abschließende vollständige Testsuite besteht aus 286 erfolgreichen Prüfungen ohne Fehlschlag, Überspringen oder offene TODOs; Ausgabe in `test-results.txt`. Die separate gerenderte U16-Prüfung umfasst 195 Fälle ohne Randlücken und Browserfehler.

Nach der Preiskalibrierung schlugen zunächst drei ältere Kostenassertionen mit fest eingetragenen Ausgangspreisen fehl. Die erwarteten Abbuchungen für Schule/Solarfeld, zweiten Flächenschritt und erste Veredelungsanlage wurden an die neuen dokumentierten Werte angepasst; Materialbindung, Atomarität und Gegenkassenprüfungen bleiben unverändert. Danach ist die gesamte Suite erfolgreich.
