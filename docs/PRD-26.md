# PRD 26 – Entscheidbare Wirtschaft, verlässliche Flotten und gezeichnete Spielwelt

## Ziel und Freigabe

Grundlage: [46 Spieltestvorschläge](Spieltest-2026-11-13-erweitert.md) und bestätigte Grilling-Runden Q1–Q54. Der Nutzer hat die Umsetzung ausdrücklich freigegeben. `grilling` wurde als vereinbartes Planungsverfahren verwendet. Q54 wird ohne zusätzliche Nutzerabstimmung umgesetzt: repräsentative Ansichten selbst gegen die letzten Grafikupdates prüfen. Kein Push, kein Reset und keine Änderung fremder Spielstände.

Wirtschaft/Wiederaufbau bleiben Kern. Routine wird automatisierbar; Ziele, Investitionen und Risiken entscheidet der Spieler. Risiken sind erlaubt, müssen verständlich und überwindbar sein. Ziviler Fortschritt bleibt tragfähig. Neue Systeme werden als begrenzte Prototypen geprüft, nicht automatisch als umfassende zusätzliche Pflichtsysteme eingeführt.

## Verbindliche Anforderungen und Zuordnung

| Vorschläge | Bestätigte Ausgestaltung |
|---|---|
| N01, N10, N21, N43 | Ausführbare Beschaffung trotz zerstörter Leitstelle; mengen-/kapazitätsrichtige Lageraktionen; Kampf/Gefangenschaft/Reparatur vor Queue-Leere; kompakte Kopfzeile mit zugänglichen Details. |
| N07, N09, N11, N12 | Mengenbezogene Vorschau mit bekannten Kosten, Zielaufnahme und Aktualität, keine garantierten Gewinne; Eigentumstransfer sprachlich trennen; Geschäftsbuch mit Zeitraum/Schiff/Standort; beobachtete Marktverläufe. Unbekannte Kosten bleiben unbekannt. |
| N08, N27 | Adaptive Finanzierungsprobe mit sauberen Kosten; mehrere Seeds/Parallelbetrieb; Gleichbudget-Gefechte mit Seitenwechseln, Haltungen und Eskorten. Keine Preis-/Zeit-/Reliktänderung ohne Befund. |
| N13, N19, N26, N33, N39 | Begrenzte Prototypen: finanzierte echte Liefernachfrage; wenige alternative Betriebsweisen; entscheidungsrelevante Erkundung; ziviles Abkommen auf bestehenden Regeln; kooperatives Liefer-/Infrastrukturprojekt. Keine neue Pflichtwährung. |
| N14–N18, N20 | Zielplan rückwärts aus Rezepten, tatsächliche Bestände/Voraussetzungen, priorisierte Engpässe, Baufolgen, Forschungsnutzen und wiederverwendbare Betriebsvorlagen. **Bestehendes Reservierungssystem erweitern, kein zweites System** (ausdrückliche Nutzerkorrektur Q19). Vorhandene Daten erhalten, Schutz manuell bewusst übersteuerbar. |
| N02–N06 | Ausführbare parallele Questschritte, freiwillige bestätigte Zweitschiffhilfe, spoilerarmer Abhängigkeitsbaum, vorhandene freiwillige Warteaktivitäten und sparsame nachlesbare Fortschrittsreaktionen. |
| N22–N25 | Routenvorprüfung: harte Fehler verhindern, Risiken bewusst zulassen; Zweckwahl Route/Leitstelle; reale Lieferleistung und Unterdeckung; Relikt zunächst vergleichen. Keine stillen Auftrags-/Budget-/Reservierungsumbuchungen. |
| N28–N32, N34 | Erklärte Rollen/Konter, lesbare taktische Karte, wiederholbare verlustfreie Übung ohne farmbare Belohnung, wissensbasierte Konfliktwarnungen, Kriegskosten mit getrennten Geld-/Ersatzwerten. Frachterkapitulation vorerst unverändert. |
| N35–N40 | Bevölkerungsgrenzen, Tourismusplanung mit Unsicherheit, bekannte Koloniestandorte vergleichen und flexible Planungsprofile; Konsortiumsgebühren vorab einschließlich 72-%-Rückfluss; kooperativer Prototyp; freie kombinierbare Fernziele ohne Klassenbindung. |
| N29, N41–N46 | Aktueller gezeichneter Comic-/Sci-Fi-/Fantasy-Stil auch in der Taktik, kongruente Gebäude/Schatten und sichtbare Zustände; lesbare Panels und Tastaturzugang; reduzierte Bewegung; größere Stadt/Schlacht als Performancevergleich; menschlichen Hörtest nicht als automatisch bestanden ausgeben. |

## Arbeitsschritte und Fortschritt

- [x] U1 – Verlässliche Zustände, frühe Beschaffung, Lageraktionen und Kopfzeile (N01/N09/N10/N21/N43). Implementiert; Browsergesamtabnahme in U10.
- [x] U2 – Wirtschaftsdiagnose, Geschäftsbuch, Mengen-/Absatzvorschau und Marktverlauf (N07/N11/N12). Bekannte Marktverläufe über bestehende Marktansicht; Browsergesamtabnahme folgt.
- [x] U3 – Produktions-/Bau-/Forschungsplanung, Engpassordnung, Erweiterung vorhandener Reservierung und Vorlagen (N14–N18/N20). Alternative Betriebsweisen separat U9.
- [x] U4 – Questführung, Zweitschiffhilfe, Fortschrittsbaum, Tätigkeiten und Reaktionen (N02–N06). Browsergesamtabnahme folgt.
- [ ] U5 – Routenprüfung, Zweckwahl, Lieferleistung und Reliktgegenprobe (N22–N25). Routenprüfung/Diagnose implementiert; Reliktgegenprobe in U10 noch offen.
- [x] U6 – Bevölkerung, Tourismus, Kolonievergleich, Gebühren und frei kombinierbare Planungsrichtungen (N35–N38/N40). Keine neuen starren Kolonieklassen.
- [x] U7 – Kampfgegenproben, Rollen, Risikohinweise, Kriegskosten und Übung (N27/N28/N30–N32/N34). Browserprüfung folgt.
- [x] U8 – Gezeichnete Taktik, Stadtzustände, Lesbarkeit, Tastatur und Bewegungsoption (N29/N41/N42/N44/N46/Q52–Q54). Erste Browserprüfung bestanden; größere Vergleichsszenarien in U10.
- [x] U9 – Begrenzte neue Spielanlässe als prüfbare isolierte Prototypen (N13/N19/N26/N33/N39). Liveintegration ausdrücklich nicht als abgeschlossen behauptet.
- [ ] U10 – Adaptive Progressions-/Parallelproben, visuelle Abnahme, Performancevergleich und Audio-Prüfprotokoll (N08/N45/Q53).

Jeder sinnvoll abgeschlossene Schritt: passende Prüfungen, Nachweise und Fortschrittsaktualisierung im selben Commit. Fachliche Serveränderungen brauchen echte Verhaltensprüfungen; reine Gestaltung keine HTML-Spiegeltests. Fehlgeschlagene oder nicht ausführbare Prüfungen ausdrücklich ausweisen. Teilweise fertige Schritte bleiben offen und werden konkret beschrieben.

## Abnahmekriterien

1. Flottenzustände und Filter widersprechen laufendem Kampf, Reparatur oder Gefangenschaft nicht. Lageraktionen respektieren reale Verfügbarkeit und Frachtraum. Frühe Zutatenbeschaffung funktioniert ohne fertige Leitstelle.
2. Geldbewegungen und Warenwert sind getrennt. Vorschauen benennen Unsicherheit, Datenalter, Aufnahmegrenzen und unbekannte Kosten; niemals scheinbarer Gewinn allein durch kostenlosen Eigenlagertransfer.
3. Zielplanung, Reservierung und Automatisierung verwenden reale gemeinsame Bestände und vorhandene Berechtigungen. Keine doppelte Material-/Schiffs-/Budgetbindung; bestehende Spielstände bleiben lesbar.
4. Neue Hilfen und Vorlagen sind freiwillig; sie ersetzen keine aktiven Aufträge ohne ausdrückliche Entscheidung. Quests bleiben parallel; spätere Story wird nicht vorweggenommen.
5. Kampfproben berücksichtigen Kosten und Rollen. Übung verändert keinen normalen Spielstand und vergibt keine Belohnung. Zivile Alternativen nutzen vorhandene Diplomatie.
6. Stadt und Taktik folgen vorhandenen gezeichneten Referenzen. Tastatur/Fokus und reduzierte Bewegung funktionieren; grundlegende Informationen bleiben auch ohne Farbe/Animation verständlich.
7. Neue Spielanlässe haben begrenzten Umfang, klare Gegenleistungen und echte Kosten/Nachfrage. Keine pauschalen Balanceänderungen oder zusätzliche Pflichtgrinds.
8. Automatische Tests, Browserprüfung und Simulation sind getrennt dokumentiert. H13/H17 oder Audioqualität werden nur dann als bestanden bezeichnet, wenn tatsächlich geprüft; fehlende menschliche Hörabnahme bleibt offen.

## Prüfprotokoll

Ausgangsbefund: 411/411 Tests im Spieltest bestanden. Vier Einstiegssimulationen erfolgreich, 40-h-Planer scheitert vor H12/H13. 80 isolierte Gefechte. Das ist Ausgangsevidenz, keine Abnahme der neuen Umsetzung.

U1: Gemeinsame Aktivitätspriorität für Kampf/Gefangenschaft/Reparatur; Filter schließt diese aus. Eigenlagertransfers zeigen reale Maximalmengen unter Berücksichtigung bestehender Reservierung, Laderaum und gemeinsamer Lagergrenzen. Manuelle Zutatenquelle direkt aus der Anlage, Automatisierung erst bei fertiger Leitstelle. Kompakte Versorgungszeile mit erreichbaren Qualifikationsdetails. 14/14 Fachtests bestanden; Syntax-/Diffprüfung bestanden. Browserabnahme folgt gesammelt.

U2: Geschäftsbuch in vorhandenen persönlichen Profildaten (begrenzte Minutengruppen) für Handel, kostenlose Eigentumstransfers, Bauinvestitionen, Ausrüstung/Treibstoff, Questgeld, Steuern und zivile Verkäufe. Kein Anspruch auf rückwirkend vollständige Kontorekonstruktion. Filter nach Zeitraum/Schiff/Ort. Handelsvorschau führt tatsächliche mengenabhängige Handelslogik auf abgetrennter Kopie aus; bestehende Kostenbasis bleibt maßgeblich, unbekannte Herstell-/Reisekosten bleiben offen. Bekannte Marktstatistik direkt erreichbar. 21/21 Wirtschafts-/Heimat-/Questtests bestanden, einschließlich Vorschaugleichheit und unverändertem Originalzustand. Browserabnahme folgt.

U3: Rekursiver Materialplan mit einmaligem Verbrauch gemeinsamer freier Bestände, bekannten/freigeschalteten Ketten, fehlenden Anlagen, getrennten Baukosten und serieller Zeituntergrenze. Bauvorschau mit Personal-/Energiefolgen; Forschungsnutzen/Fertigung/Einbau getrennt erklärt. Grundversorgungsstillstände vor optionaler Industrie. Bestehende `home.reservations` um `goal:`-Einträge erweitert, vorhandene `production:`-/`logistics:`-Bindungen erhalten. Explizite Freigabe vor Verwendung; keine künstlichen Zusatzlager. Freiwillige lokale Betriebsvorlage ändert nur passende vorhandene Anlagen nach Bestätigung, keine Budgets/Schiffe/Reservierungen. 23/23 Produktions-/Reservierungs-/Logistik-/Modultests bestanden.

U4: Spoilerarmer Fortschrittsbaum (erreicht/aktiv/unmittelbar freigeschaltet), vorhandene messbare Bedingungen um Fachortverweise ergänzt, freie Bauplätze statt nicht existierender Anlagen anwählbar. Freiwillige Zweitschiff-Eisvorlage weist nur ein freies gewöhnliches Zweitschiff vor und öffnet zur bewussten Prüfung den vorhandenen Editor. Vorhandene Tätigkeiten während Wartephasen, nachlesbare Siedlungsreaktionen ohne neue Pflicht/Frist/Modalflut. 14/14 Quest-/Führungstests bestanden; Syntax-/Diffprüfung bestanden.

U5a: Gemeinsame Routenvorprüfung in Client und Server: fehlender geeigneter Frachtraum/Abbaugerät und unmögliche Handelsrichtung blockieren, momentane Bestands-/Zielplatz-/Budgetrisiken im Editor bewusst bestätigbar. Bestehende Server-Abdeckungsprüfung bleibt maßgeblich. Reale Liefermengen mit Zeit werden für Routen/Leitstellenaufträge erfasst, letzte Zustellung und beobachtete Stundenrate angezeigt; Versorgung mit aktuellem Nettoverbrauch verglichen, keine Alarmflut. Bestehende Zweckunterscheidung Route/Leitstelle erhalten. 23/23 Routen-/Logistiktests bestanden. Reliktwerte unverändert; Gegenprobe ausstehend.

U6: Bevölkerung erklärt Wohn-/Versorgungsgrenzen, Erwerbsobergrenze, freie Beschäftigung und Ausbildungsbindung. Reiseplanung zeigt bestehende Kabinen, bekannte Ziele, Besucherplätze und Anflug, Erlöse bei unbekannter Auslastung ausdrücklich offen. Kolonievergleich nutzt ausschließlich bekannte Rohstoffquellen und reale Gründungskosten; Aufgabenprofile und kombinierbare Fernrichtungen sind frei änderbare persönliche Planungsnotizen ohne neue Klasse, Währung oder Regelbonus. Konsortium zeigt vor Einzahlung den kombinierten Rückfluss 1.000→900→720 Cr. 33/33 Bevölkerungs-/Kolonie-/Konsortiumstests bestanden; keine Änderung der Gebühren oder Bevölkerungsregeln.

U7: 128 Gegenproben mit Seitenwechseln, zwei Haltungen und Bombereskorte: Fregatten/Zerstörer kippt mit offensiver Haltung, daher keine pauschale Balanceänderung. Rollen/Munitionskosten neben Sternen erklärt. Bekanntes Feindgebiet vor Direktauftrag/Routenspeicherung mit zivilen Schutzoptionen gewarnt; unveränderte Direktwarnung pro Sitzung quittierbar. Bericht trennt Ersatzwert/Reparatur/Munition/Freikaufschätzung von Geldbewegungen. Verlustfreie wiederholbare Übung in eigener In-Memory-Spielinstanz mit denselben Taktikhandlern; keine Originalobjekte oder Belohnungen. 13/13 Gefechts-/Historien-/Übungstests bestanden. Gesamtsuite zunächst 422/423: Lieferstatistik nahm bei altem Routen-ID-Aufruf fälschlich ein Objekt an; kompatible Auflösung ergänzt, Nachprüfung folgt.

U8: Vorhandenes gezeichnetes Weltraumbild und Schiffsbilder in Taktik eingebunden, Bronze-/Tintenrahmen, lesbare Auswahlbeschriftung, Gefechtszoom und Gegnerliste als tastaturbedienbarer Zielzugang. Wiederholte Kartenklicks wechseln überlappende Einheiten. Canvas-Puffer nur bei Größenänderung neu angelegt, DPR auf 2 begrenzt. Fokus bei Panelupdates/Schließen erhalten; sichtbarer Fokus und Tastaturkamerasteuerung. Gemeinsame Bewegungsoption System/reduziert/voll, Stadtanimationen und Kampfdekoration beachten sie. Kontaktbodenschatten an zusätzlichen Gebäuden; Rauch nur bei tatsächlichem Betrieb statt allein Fertigstellung. Vorhandene Bau-/Ruinenbilder bleiben. Erste isolierte Browserabnahme: Übung starten, Gefechtszoom, Einheit wählen, Halten→manuell, schließen, Wirtschafts-/Materialplan öffnen und berechnen erfolgreich. 14/14 Grafik-/Kamera-/Audiotests bestanden; Routenregression gezielt mit 8/8 Tests behoben. Menschliche Hörabnahme nicht behauptet.

U9: Im Wirtschaftsfenster zugängliches Versuchslabor, jede Ausführung eigene In-Memory-Welt mit ausgewiesenen Beispielressourcen. Liefervertrag bindet echte Marktkasse und zahlt nur gelieferte Waren; kooperativer Auftrag weist Beiträge/Bezahlung zweier Piloten einzeln nach. Fünf Wasserzyklen vergleichen 10 Eis/4 Energie mit 8 Eis/6 Energie bei gleicher Ausbeute/Zeit (Erprobungswerte). Erkundungswahl kartografiert reale Quelle oder birgt endlichen Materialfund. Diplomatie-Regelprototyp tauscht echte Versorgung gegen befristete Passage, nach Frist erlischt das Recht. Vor Liveintegration fehlen insbesondere konkurrierende öffentliche Kapazitätsreservierung und Einbindung der Passage in Grenz-KI; keine vorgetäuschte vollständige Implementierung. 2/2 Prototyptests prüfen alle sieben Varianten, Geld-/Warenkonservation, fehlende Finanzierung und doppelte Abgabe/Stornierung. Keine Hauptweltpreise, Rezepte oder Diplomatie verändert.
