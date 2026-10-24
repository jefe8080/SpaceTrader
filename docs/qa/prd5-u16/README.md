# U16: gezeichnete Oberfläche und Bilddialoge

Echte Browserprüfung auf Port 3015, isolierte Einrichtung mit `node sim/orbital-qa.js data/prd5/qa-u16.db`. Die 500 Einwohner, sechs Solarfelder und Questfreigaben sind visuelle QA-Voraussetzungen, keine normale Fortschritts- oder Versorgungsbilanz.

- `dock-focus.png`: gezeichneter Dock-/Leitstellenstand, durchgehender malerischer Ruinenboden und unverändert bedienbare Lagerverwaltung. Die alte sichtbare Modellhülle wurde durch transparente gezeichnete Assets ersetzt. Fokus fährt näher an das gewählte Gebäude.
- `tarek.png`: eigenständige Figur, Illustration und separat gerenderte lesbare Texte. Weiter/Überspringen geprüft.
- `nela-mobile.png`: eigenständige Nela-Szene bei 390×844, aus dem geöffneten Heimatjournal erneut aufgerufen. Beide Prioritätsoptionen, Weiter und Überspringen bleiben erreichbar. Auswahl „Versorgung zuerst“ per tatsächlichem Serverbefehl geprüft.
- Journal bleibt bei laufenden Bestandsaktualisierungen geöffnet. Gelesene Szenen werden gespeichert, Wiederholung gewährt weder Waren noch Geld. Die Simulation läuft während der Szene weiter.

`browser-audit.json`: 195 gerenderte Fälle, 13 Welten einschließlich Ruinen × fünf festgelegte Formate × Übersicht/maximal außen, Schwenkgrenze und unterbrochene Fokusfahrt. Alle Fälle ohne fehlenden Randtreffer, mit getrenntem Umfeld und unveränderter Gebäudezahl. Browserfehler: keine. Die Prüfung nutzt echte neue Rasterassets, produktiven Renderer und 44 Randstrahlen je Fall. UI-Automation meldete beim langen synchronen Audit teilweise einen Eingabezeitablauf; die sichtbaren vollständig abgeschlossenen Ergebnisse wurden danach ausgelesen und auf die tatsächliche Größe geprüft.

283 Tests erfolgreich, vier neue Prüfungen für Szenenfreigabe/Einmaligkeit, widerrufbare kostenlose Betriebsprioritäten, Entwicklungsstände und unveränderte gemeinsame Geometrie-/Materialvorlagen. Bildherkunft, Varianten und vollständige Prompts in `docs/art/prd5/u16-prompts.md`.

Ergänzung U15: `../prd5-u15/warp-complete.png` dokumentiert denselben Standort nach tatsächlichen 300 Serversekunden im Zielsystem Morvin mit 24-h-Sperre. Die Flotte blieb am alten Standort beziehungsweise der zweiten Kolonie.
