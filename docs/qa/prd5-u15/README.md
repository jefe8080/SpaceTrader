# U15: Expedition und Standortwarp

Isolierte Welt `data/prd5/qa-u15.db`, Seed 42, Port 3014. Einrichtung: `node sim/colonies-qa.js`. Die fortgeschrittenen Questfreigaben und Expeditionsmaterialien sind ausdrücklich QA-Voraussetzungen, keine Aussage über die normale Fortschrittsdauer. Die eigentliche Gründung verwendet die regulären Befehle, Personenbestände und Schiffsabgabe.

`colony.png`: neu gegründeter vorhandener Ruinenplanet, 20 tatsächlich ausgewanderte Einwohner, 100 Wohnplätze, acht Plätze, leeres Lager und eigene reparierte Leitstelle. Ursprungsbevölkerung sinkt von 100 auf 80. Kein neuer Gratisfrachter oder Reliktfund.

`warp-preview.png`: Zielsystem, Standortanteil, Bestände, Netzgebiete und andere Welt vor Bestätigung. `warp-preparation.png`: tatsächlicher Start mit einmalig gebundenen 852.611 Cr, fünf Minuten Standortpause und gesperrten Beständen. Bestätigung erfolgt über einen bedienbaren Dialog im Spiel.

279 Tests erfolgreich. 15 gezielte Integrationsprüfungen in `tests/colonies-warp.test.js`: reale Gründung/Qualifikation, atomare Ablehnung falscher Personen, Zweitschiff/Reliktschutz, H13/H16, Preisbewertung, Lagerpause, Timer, unveränderte Welt-ID und korrekte Raumindizes, keine Flottenmitnahme, sichere Anflüge, manuelle Wiederfreigabe, Zielreservierung und Neustart von Gründung/Warp. Zusätzlich gemeinsame 60-%-Arbeitsplatzgrenze beim parallelen Bau und bei Auswanderung.
