# PRD 21 – Orbitalring-Prüfung

Galerie: index.html. Ergebnisse: results.json. Vollständige Testsuite: 390/390 bestanden, tests.log. Die Browserprüfungen sind isoliert und verwenden den tatsächlichen Kartenrenderer mit kontrollierten öffentlichen Baudaten, keine Datenbank und keine aktive Mehrspielerpartie.

Reproduktion: scripts/verify-orbital-art.mjs (PLAYWRIGHT_MODULE auf vorhandenes Playwright setzen; Edge). Bisherige Kartenprüfung: scripts/verify-space-art.mjs; SPACE_ART_QA_DIR ermöglicht einen eigenen Ausgabeordner, hier space-regression/.

Geprüft: fünf fertige Orbitalzustände mit sechs unabhängig wechselnden Bodenstufen, fünf Zoomstufen, kleine Bildschirmansicht, größere Zeichenbegrenzung und Auswahl von Planet/Ring/Kran. Freie Ringzwischenräume und die fehlende Großringhälfte erzeugen keine Treffer. Alle zehn Layer sind transparent, deckungsgleich und im Planetenzentrum leer; Rückseite/Planet/Vorderseite werden in richtiger Reihenfolge gezeichnet. Erste strenge Alphaprüfung fand nur nahezu unsichtbare Maskenreste im Zentrum, Verpackung korrigiert und Browserprüfung erneut bestanden.

Grafik-Gegenprüfung: 113 Bilder, 111 Alpha-Sprites, alle Objektarten, sechs Sonnenfarben, beide schwarzen Löcher, Fundstellen, Zonen und sieben Zoomstufen erfolgreich. Ergebnisse und Aufnahmen unter space-regression/.
