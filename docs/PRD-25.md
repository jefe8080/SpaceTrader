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

- [ ] U1 – Blockaden: Wrack-Zielnavigation und Wasserstillstand im Langzeitplaner reproduzieren, Ursachen trennen und gezielt beheben; Nachweise sichern.
- [ ] U2 – Ansichtsgrundlage: reine Planetenbilanz, gemeinsame Übersicht, Gebäudenavigation/Zustand/Rückweg; gespeicherte Detailbereiche.
- [ ] U3 – Fachorte: Rathaus, Lager/Reisen, Leitstelle, Orbitalring sowie Baukatalog neu zuordnen; keine doppelten Bearbeitungsformulare.
- [ ] U4 – Spezialanlagen: Produktion, Energie, Lagerkapazität, Raumhafen, Wohnraum, Ausbildung, Forschung/Fertigung/Ausrüstung samt Berechtigungen und Diagnose.
- [ ] U5 – Einstieg und Quests: Funkkontakt, kurze Einführung, Fortschrittsbedingungen, Abschlussmeldung und geführte echte H03-Lieferung.
- [ ] U6 – Lesbarkeit und Motivation: Schiff/Handelsplanung, Filter, Beschriftungen, Produktionsmeilenstein, reversible Überschussentscheidung und vorhandene freiwillige Ziele.
- [ ] U7 – Abnahme: automatisierte fachliche Prüfungen, manueller Einstieg durch erste automatische Lieferung, fortgeschrittene Welt prüfen, Hauptwelt kontrolliert zurücksetzen und frisch starten.

Jeder abgeschlossene Schritt erhält passende Prüfungen, dokumentiertes Ergebnis und einen eigenen Commit mit aktualisiertem Fortschritt. Fehlgeschlagene/nicht ausführbare Prüfungen werden ausdrücklich berichtet. Reine Umordnung braucht keine Tests, die bloß HTML spiegeln; Zustands-/Berechtigungs-/Queständerungen benötigen fachliche Regressionstests.

## Abnahmekriterien

1. Ohne externe Anleitung: Eis beschaffen, Schiff entladen, Steuer ändern, Fachkräfte ausbilden, Modul fertigen/einbauen, Schiff bauen und Produktionsstillstand erklären/beheben; Einstieg von frischem Kapitän bis erster automatischer Lieferung manuell getestet.
2. Fortgeschrittene QA-Welt mit Forschung, Stromversorgung und Ring: jede Entscheidung am vorgesehenen Ort, Direktnavigation und erlaubte Fernverwaltung funktionieren, Material/Personen/Budgets werden nicht doppelt gebunden.
3. Fachliche Regressionsprüfungen für Blockaden, H03, echte Bestände, Ausrüstung und Berechtigungen bestanden. Simulationsergebnisse getrennt von manueller Spielzeit ausweisen.
4. Keine neuen Preis-/Zeit-/Zufallssysteme, keine getrennten Silo-Inventare oder fiktiven Hausbewohner. Bestehende Mechaniken verständlich darstellen.
5. Nur bestätigte Hauptwelt zurückgesetzt; frischer Start funktioniert. Bericht und Nachweise im Repository; Arbeitsfortschritt nachvollziehbar committet.

## Prüfprotokoll

Planungsstand: bestätigt. Noch keine Umsetzung oder Rücksetzung erfolgt.
