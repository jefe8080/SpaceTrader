# PRD 25 – Abnahme

## Automatisierte Prüfungen

- Gesamtsuite: 411 Tests bestanden, keine Fehler. Dazu neue Regressionen für Zielübertragung in bereits enthüllter Nebelzelle sowie gezielte Modulwerkbank- und Schulbelegung.
- Heimat-Integration weist nach: eine gespeicherte leere Route erfüllt H03 nicht; eine zugewiesene Route mit echtem Einkauf und Entladung erfüllt es.
- Einstiegssimulation Seed 42 mit 15 s modellierter Entscheidungszeit erfolgreich bis H06, nun einschließlich echter erster Route: H03 bei 965 s, H06 bei 2.632 s. Kein Ersatz für einen manuellen Spieltest.
- Syntaxprüfung der geänderten JavaScript-Dateien und `git diff --check` bestanden.

## Manueller Browserdurchlauf

Frische getrennte Welt `data/qa-20261113/prd25-manual.db`, Kapitän `PRD25-Abnahme`, ohne eingesetzte Ressourcen oder vorgespulte Zeit:

1. Funkkontakt erscheint direkt beim Einstieg, vor dem ersten Flug; vollständige Hilfe erscheint nicht verpflichtend.
2. Heimat angeflogen und gelandet; Rathaus über Gebäudeliste geöffnet; H00 bewusst abgeholt.
3. Landeplatz repariert; H01-Abschlussbereitschaft angezeigt und Belohnung abgeholt.
4. Wasser-/Nahrungsanlage repariert; Quellen aus dem Auftrag geöffnet. 30 Eis und 20 Getreide gekauft, zurückgeflogen und im Zentrallager entladen.
5. Effektive 30-s-Zyklen bei 10 % Grundbetrieb und Zutatenreichweiten geprüft. Produktionszähler erreichen 20 Wasser/10 Nahrung; H02 abgeholt.
6. Leitstelle und Treibstoffanlage repariert; Eisroutenvorlage mit zwei Halten und vorausgewähltem Schiff gespeichert.
7. Schiff kauft und liefert tatsächlich Eis. H03 wird erst nach der Entladung bereit; Quittierung und letzte Prüfung siehe Abschlussprotokoll unten.

Fortgeschrittene Welt: Kopie des erhaltenen H10-Checkpoints auf Port 3014, getrennt von allen Originalen. Forschung zeigt passende Studien-/Fertigungsaufgaben; einfache Werkbank nur ihre Module. Schule, Solarfeld, Anlagenstillstand und Orbitalwerft über Gebäudeliste erreichbar. Steuer im Rathaus von 20 auf 21 % und zurück geändert. Geschirmte Kammer in der Werkstatt aus- und wieder eingebaut, Exemplar erhalten. Browser meldet keine JavaScript-Fehler. Vollständige Herstellung/Freischaltung aller späten Gebäude wurde nicht erneut manuell durchgespielt; Serverregeln sind durch Fachtests abgedeckt.

## Grenzen und offener Befund

Die Wiederaufnahme der Langzeitsimulation am H10-Checkpoint passiert den früheren Wasserfehler und erreicht H11. Sie scheitert später bei 144.005 s an der allgemeinen 40-Stunden-Grenze während wiederholter Finanzierung. Kein erfolgreicher H13-Nachweis und keine Behauptung eines vollständigen Langzeitdurchlaufs. Der ursprüngliche Wasserstillstand war eine feste Beschaffungsannahme des Planers bei laufendem Zivilverbrauch. Spielpreise und Produktionszeiten wurden nicht geändert. Die spätere Finanzierung ist ein eigener Folgeprüfpunkt.

Der manuelle Test prüft Bedienung und funktionierende Abläufe. Ob die neue Ordnung den Spielspaß für neue menschliche Spieler ausreichend verbessert, muss ein weiterer Nutzertest zeigen.

## Nachweise

- [Erste Routenvorlage](erste-route.png)
- [Orbitalwerft am Ring](orbitalring.png)
- [H03 erst nach wirklicher Lieferung erfüllt](h03-erfuellt.png)
- [Leerer Hauptweltstart nach Reset](frischer-start.png)
- [Gesamtsuite](tests.txt)
- [Einstiegssimulation](onboarding.json)

## Abschlussprotokoll

H03 nach Rückkehr vor Ort abgeholt. Gespeicherter QA-Stand bestätigt Abschluss und Zustellung von 30 Eis durch Route r1 (Schiff s2, Ziel home_p2). Die ursprünglichen QA-/Simulationsstände und Backups wurden erhalten.

Hauptweltpfad vor Reset absolut geprüft; auf Port 3000 lief kein Server. Ausschließlich `data/world-v5/spacetrader.db` über den vorhandenen Resetstarter gelöscht (keine Seitendateien vorhanden). Neu erzeugt und anschließend gestartet: **0 Spieler, 67 Weltobjekte, 0 Schiffe**. Browser zeigt die Anmeldung ohne gespeicherte Kapitäne und ohne JavaScript-Fehler. Hauptserver läuft lokal auf Port 3000; getrennte QA-Server wurden beendet.

Abnahmekorrekturen: Standardlager zeigt nur relevante Bestände/Fracht und lässt vollständige Warenliste zuschalten; Lagerregeln eingeklappt. Spätere Questbedingungen H07–H17 ebenfalls konkret angezeigt. Ausbildung bindet die gewählte Schule (zusätzlicher Regressionstest). Früh noch irrelevante Ring-/Versorgungstimer zurückgestellt. Ausrüstung aus dem Heimat-Marktpanel entfernt und in der Werkstatt belassen. Nach diesen Änderungen: 411/411 Fachtests grün; letzte reine Darstellungsbereinigungen zusätzlich syntaktisch geprüft.
