# Agrar-Korrektur – tatsächliche Spielansicht zur Freigabe

25.10.2026. **Gestalterische Nutzerfreigabe steht aus.** Die neue Komposition wird ausschließlich für Agrar verwendet; die anderen zwölf Typen werden erst nach dieser Freigabe übertragen. Diese Zwischenabnahme korrigiert die gestalterisch abgelehnte erste PRD-8-Version.

## Bildvorlage

- [Übersicht der regulären Spielansicht](overview.png)
- [Ausgewähltes Wasserlager](water.png)
- [Bettler auf der gepflasterten Platzfläche](beggar.png)
- [Hund und bestehende Aktion](dog.png)
- [Dynamische Fabrik im vorbereiteten Hof](factory.png)
- [Alle vier Fabrikhöfe bebaut](four-factories.png)
- [Mobile Ansicht](mobile-dog.png)
- [Namen aller aktiven Orte](names.png)
- [Zusätzliche Waren und maximale getestete Ausstattung](maximum-services.png)

Diese Bilder stammen aus dem laufenden Client, nicht aus einem weiteren unverbindlichen Konzeptbild. Die Szene basiert auf `agrar-city-v2.png`; Produktion und Prompt sind unter [agrar-revision.md](../../../art/prd8/agrar-revision.md) dokumentiert. Wohnhäuser, Landschaft, Straßen und feste Funktionsgebäude sind gemeinsam gezeichnet. Nur Figuren, variable Fabriken und kleine Bauplatzmarkierungen werden auf fest gesetzte Plätze gesetzt. Durch Mengen-/Ausstattungsänderungen inaktive gezeichnete Geschäfte bleiben dekorativ sichtbar und erhalten keine Aktion.

## Prüfungen

- Vollständige Node-Testsuite: **314/314 erfolgreich**, Ausgabe `test-results.txt`.
- `scripts/verify-prd8.mjs` mit separatem `PRD8_QA_DIR`: alle 13 Typen/238 Objekte erreichbar, keine JavaScript-Fehler; gewohnte Panels, Escape, Namen, Touch/Pinch, Tastatur, Verschieben und dynamische Heimatwelt weiterhin geprüft. Ergebnisse `browser-results.json`. Die übrigen Typen verwenden ihren bisherigen Bildaufbau.
- `scripts/verify-agrar-revision.mjs`: gezielte Prüfung der neuen tatsächlichen Agrar-Ansicht. Gemessen: genau **ein** Zeichnen der Landschaft pro Frame, **null** generierte Straßen, **null** separat verteilte Dekorhäuser und keine gespiegelte Dekorfläche.
- In vier echten Browserformaten (1600×1000, 390×844, 844×390, 2560×1080) jeweils zwölf extreme Kamera-/Zoomfälle: sämtliche sichtbaren Ecken bleiben innerhalb des Bildes. Zusätzlicher reiner Kameratest deckt fünf Formate mit und ohne geöffnetem Panel ab.
- Wasserlager, Bettler, Hund und Fabrik über Klick geöffnet; Escape schließt die gewohnten Panels. Mobiler Hund per Touch geöffnet; Verlassen bleibt unterhalb der Kopfzeile erreichbar.
- Vier Fabriken ersetzen die drei Bio- und einen Chemieplatz an denselben Standorten. Andere Funktionsorte verschieben sich nicht.
- Sieben Zusatzproduktionen und drei Levelwaren: alle 29 Objekte der tatsächlichen Feature-Fixture besitzen eigene Trefferflächen; reiner Planungstest deckt zusätzlich alle fünf Unterhaltungsarten gleichzeitig ab (31 Objekte).
- Visuell kontrolliert: ganze Stadt, Wasserlager, Figuren, Fabrikviertel und mobile Darstellung. Eine zunächst auf der Mauerkante sitzende Bettlerfigur wurde vor dem Umsetzungscommit auf das Pflaster zurückgesetzt. Die finale Bildserie ist von Diagnosemeldungen des vorangegangenen Heimatwelt-Testaufbaus frei.

## Grenzen und Reproduktion

Die Aufnahmen nutzen isolierte lokale Markt-Fixtures im regulären Client, getrennt von Serverupdates; keine Änderung bestehender Spielstände. Wirtschaft und Rechte bleiben die bestehenden Serverfunktionen und werden zusätzlich durch deren Tests abgesichert. Die Bilder zeigen keine vollständige Wirtschaftssimulation.

Bei schmalen Bildschirmen erlaubt die untere Zoomgrenze nicht, die gesamte breite Landschaft gleichzeitig zu sehen. Verschieben, Fokus und Touch bleiben möglich. Diese Grenze verhindert sichtbare Bildränder. Die Illustration ist 1536×1024 Pixel groß; hohe Zoomstufen vergrößern ihre gemalte Textur.

Zum Wiederholen einen getrennten Homeworld-Server mit `PORT=3008`, `DB_FILE=:memory:` starten, dann `node scripts/verify-agrar-revision.mjs`. Falls Playwright außerhalb des Projekts installiert ist: `PLAYWRIGHT_MODULE` auf dessen Modulpfad setzen; `PRD8_URL` erlaubt eine andere Testadresse.
