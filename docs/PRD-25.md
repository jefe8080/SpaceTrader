# PRD 25 – Verständlicher Wiederaufbau der Ruinenwelt

## Ziel und bestätigter Umfang

Die vorhandene Spieltiefe bleibt erhalten. Informationen und Entscheidungen erhalten nachvollziehbare Orte; Einstieg und erste Automatisierung vermitteln funktionierende Zusammenhänge. Grundlage sind die 34 Vorschläge in [Spieltest und Gebäudeordnung](Spieltest-2026-11-13.md) und die vom Nutzer bestätigten Grilling-Entscheidungen Q1–Q25. Keine offenen Grundentscheidungen; Detailgestaltung innerhalb dieses Umfangs erfolgt bei der Umsetzung.

## Anforderungen

- Rathaus: Geschichten, Ziele, messbare Questbedingungen, bewusste Belohnungsabholung, Steuern, Name. Keine vollständige Werft-/Waren-/Transportverwaltung.
- Gemeinsame Planetenübersicht: Versorgung, Energie, Personal, Lager, Projekte und priorisierte Engpässe; direkte Wege zur zuständigen Anlage. Keine duplizierten Fachformulare.
- Zentrallager/Landeplatz: gemeinsame Bestände, Reserven, Limits, ausgewähltes Schiff, eindeutige Transfers, zivile Preise und Handelsfreigabe; Reisen am Landeplatz.
- Leitstelle: Netz, eigene Welten, fortgeschrittener Warpservice und getrennt verständliche automatische Aufträge. Handelsrouten bleiben erhalten und werden erklärt/verlinkt.
- Werkstatt: reguläre Ausrüstung und Relikt; Forschung: Studium/Baupläne; passende Werkbank: Fertigung. Lager bleibt gemeinsamer Warenort. Ursprüngliche und nachgebaute Werkstätten erhalten sinnvolle funktionale Gleichheit gemäß Berechtigungen.
- Wohnraum: Kapazität/Entwicklung; Schule/Akademie: Qualifizierung und konkrete Aufträge. Keine erfundene individuelle Hausbelegung.
- Ring: vollständiger Schiffbau, Ringausbau und eindeutig zugeordnete Material-/Schiffsabgaben. Keine doppelte Bindung.
- Produktion: konsistente Namen, tatsächliche Leistung/Zyklus, Vorratsreichweite und Stillstandsgrund. Energieanlagen und Raumhafen erklären ihren tatsächlichen Beitrag.
- Bauplatz: zweckbezogener Katalog, Kosten und Auswirkungen, fehlende Voraussetzungen. Flächenerschließung ist ein Projekt. Keine Steuerformulare im Baukatalog.
- Einheitliche Gebäudeansichten: Aufgabe, Zustand/Engpass, primäre Aktion, Fortschritt, Ausbau, Details; gefährliche Aktionen getrennt. Direkte Gebäudeliste mit Zustand und Rückweg, auch bei erlaubter Fernverwaltung.
- Einstieg: überspringbare kurze Handlungsfolge statt obligatorischem Regeltext; Funkkontakt vor Landung; situationsbezogene Hilfe bleibt verfügbar.
- Questbedingungen automatisch auswerten und sichtbar melden; Belohnung bewusst im Rathaus abholen. H03 benötigt erfolgreiche benötigte Lieferung durch tatsächlich zugewiesene Route; angeleitete Vorlage und konkrete Fehler.
- Schiffspanel konzentriert auf Auftrag/Fracht; fortgeschrittene Bereiche einklappbar und Zustand gemerkt. Planung mit geeignetem aktivem/einzigem Schiff; leere Angebote optional ausblendbar.
- Spielspaß: erste eigene Produktion kurz würdigen, reversible Entscheidung „Überschuss verkaufen oder behalten“ anleiten, vorhandene Erkundungs-/Aufbauziele während Wartephasen empfehlen. Zeiten zunächst unverändert; keine neuen Zufalls-/Wirtschaftssysteme.
- Kein Migrationsaufwand: nach erfolgreicher Abnahme Hauptwelt `data/world-v5/spacetrader.db` samt SQLite-Seitendateien bei gestopptem Server löschen und frisch erzeugen. Entwicklungswelten, Backups und QA-Nachweise behalten. Keine Veröffentlichung/kein Push ohne Zustimmung.

## Umsetzung und Fortschritt

- [x] U1 – Blockaden: Wrack-Zielnavigation und Wasserstillstand im Langzeitplaner reproduzieren, Ursachen trennen und gezielt beheben; Nachweise sichern.
- [x] U2 – Ansichtsgrundlage: reine Planetenbilanz, gemeinsame Übersicht, Gebäudenavigation/Zustand/Rückweg; gespeicherte Detailbereiche.
- [x] U3 – Fachorte: Rathaus, Lager/Reisen, Leitstelle, Orbitalring sowie Baukatalog neu zuordnen; keine doppelten Bearbeitungsformulare.
- [x] U4 – Spezialanlagen: Produktion, Energie, Lagerkapazität, Raumhafen, Wohnraum, Ausbildung, Forschung/Fertigung/Ausrüstung samt Berechtigungen und Diagnose.
- [x] U5 – Einstieg und Quests: Funkkontakt, kurze Einführung, Fortschrittsbedingungen, Abschlussmeldung und geführte echte H03-Lieferung.
- [x] U6 – Lesbarkeit und Motivation: Schiff/Handelsplanung, Filter, Beschriftungen, Produktionsmeilenstein, reversible Überschussentscheidung und vorhandene freiwillige Ziele.
- [ ] U7 – Abnahme: automatisierte fachliche Prüfungen, manueller Einstieg durch erste automatische Lieferung, fortgeschrittene Welt prüfen, Hauptwelt kontrolliert zurücksetzen und frisch starten.

Jeder abgeschlossene Schritt erhält passende Prüfungen, dokumentiertes Ergebnis und einen eigenen Commit mit aktualisiertem Fortschritt. Fehlgeschlagene/nicht ausführbare Prüfungen werden ausdrücklich berichtet. Reine Umordnung braucht keine Tests, die bloß HTML spiegeln; Zustands-/Berechtigungs-/Queständerungen benötigen fachliche Regressionstests.

## Abnahmekriterien

1. Ohne externe Anleitung: Eis beschaffen, Schiff entladen, Steuer ändern, Fachkräfte ausbilden, Modul fertigen/einbauen, Schiff bauen und Produktionsstillstand erklären/beheben; Einstieg von frischem Kapitän bis erster automatischer Lieferung manuell getestet.
2. Fortgeschrittene QA-Welt mit Forschung, Stromversorgung und Ring: jede Entscheidung am vorgesehenen Ort, Direktnavigation und erlaubte Fernverwaltung funktionieren, Material/Personen/Budgets werden nicht doppelt gebunden.
3. Fachliche Regressionsprüfungen für Blockaden, H03, echte Bestände, Ausrüstung und Berechtigungen bestanden. Simulationsergebnisse getrennt von manueller Spielzeit ausweisen.
4. Keine neuen Preis-/Zeit-/Zufallssysteme, keine getrennten Silo-Inventare oder fiktiven Hausbewohner. Bestehende Mechaniken verständlich darstellen.
5. Nur bestätigte Hauptwelt zurückgesetzt; frischer Start funktioniert. Bericht und Nachweise im Repository; Arbeitsfortschritt nachvollziehbar committet.

## Prüfprotokoll

U1: Wrackziel lag in bereits enthüllter Zelle und wurde deshalb nicht erneut übertragen; gezielte Reveal-Nachricht ergänzt. Regressionstest plus Heimat-/Relikttests: 13/13 bestanden. Gesamtsuite vor weiteren Serveränderungen: erfolgreich (0 Fehler). Wasserstillstand war eine Annahme des Simulationsplaners: Zivilverbrauch erschöpfte einmalig berechnete Zutaten. Nachbeschaffung bei Zutatenmangel ergänzt, keine Spielraten geändert. Wiederaufnahme am H10-Checkpoint erreicht H11 und passiert die frühere Fehlerstelle; weiterer Lauf läuft noch. Hauptwelt unverändert.

U2: Direkte Gebäudeliste mit Zustand, Planetenlage mit Engpassverweisen und Rückweg implementiert; Aufklappzustände je Gebäude gemerkt. Browserprüfung am vorhandenen QA-Stand: Rathaus, Übersicht, Zurück und Wrackziel funktionieren. Syntax- und Diffprüfung bestanden. Fachorte aus U3 teilweise bereits als notwendige Grundlage umgeordnet; abschließende Fachformulare folgen. Gesamtsuite: 409/409 bestanden.

U3/U4: Fachorte umgeordnet, Schiffsauswahl und eindeutige Lagertransfers ergänzt, Baukatalog nach Zweck/Industriegruppe gegliedert, tatsächliche Produktionsraten/Zyklus und Strom-/Betriebsmittelanzeigen ergänzt. Werkstattbedienung für ursprüngliche und zusätzliche Anlagen vereinheitlicht. Modulstudium/-fertigung auf passende Anlage gefiltert; Server bindet ausdrücklich ausgewählten Arbeitsplatz. Test für gezielte Belegung/keinen stillen Anlagenwechsel ergänzt. Fachtests 26/26 bestanden; erneuter Modul-/Betriebslauf 20/20 bestanden. Browsergesamtabnahme folgt in U7. Fortgesetzter Langzeitlauf: H11 erreicht, Wasserfehler passiert, danach 40-Stunden-Limit bei wiederholter Finanzierung; H13 weiterhin nicht nachgewiesen.

U5: Erstkontakt ohne vorherigen Schiffsklick, freiwillige statt obligatorischer Vollhilfe; nachvollziehbare Bedingungen H00–H06 und serverseitig ermittelte Abschlussbereitschaft. Bewusste Belohnungsabholung bleibt. H03 erfordert reale Routenzustellung, Eisvorlage mit Schiffszuweisung ergänzt; Zutatenquellen direkt aus H02 erreichbar. Fachtest belegt: leere Route genügt nicht, echte Route liefert erfolgreich. 18 Einstiegs-/Storytests bestanden; Simulation mit realer Route bis H06 erfolgreich (2.632 s mit 15 s Entscheidungszeit). Gesamtlauf fand zunächst die obsolete Erwartung zum obligatorischen Schiffsklick; Test entsprechend bestätigter Anforderung aktualisiert und gezielt grün geprüft.

U6: Kampf/Statistik und technische Routenregeln einklappbar, Schiffsvorauswahl verbessert, leere Marktangebote optional ausblendbar, Lagerpfeile durch Richtungstexte ersetzt. Erste Wasser-/Nahrungsproduktion würdigt den Liefererfolg einmalig. Überschussentscheidung bleibt ohne automatische Warenbindung/Verkauf reversibel; vorhandenes Erkundungsziel als Wartephasenhinweis. Syntax-/Diffprüfung bestanden; Gesamtsuite nach U5/U6 erneut vollständig grün. Manuelle Abnahme und Hauptweltreset stehen aus.
