# PRD 20 – Integrationsprüfung

Browsergalerie: index.html. Automatisierte Prüfung: scripts/verify-space-art.mjs (PLAYWRIGHT_MODULE auf eine vorhandene Playwright-Installation setzen; verwendet Edge, startet ausschließlich einen statischen lokalen Prüfserver). Fixture: tests/browser/space-art.html. Kein Datenbankzugriff und keine Veränderungen einer laufenden Partie.

Ergebnis: 103 Bilder, 101 Alpha-Sprites; alle sechs Ruinenwelt-Stufen und Vorschaubilder, 56 Stationen, zehn Ressourcenfelder, drei Quest-Fundstellen, Wurmloch, sechs Sonnenfarben, beide schwarzen Löcher, fünf Zonen und beide Hintergrunddateien. Sieben Zoomstufen mit passenden Darstellungsmodi, Auswahl und 800-Pixel-Ansicht geprüft. Fertige physische Orbitalringe bleiben unabhängig vom Boden-Ausbau. Keine Browserfehler und keine fehlenden Dateien. Ergebnisse in results.json.

Vollständige Testsuite: 386/386 bestanden, tests.log. Historische Tests für das alte Entwicklungssystem wurden durch Stufen- und Rendererprüfungen des neuen Systems ersetzt. Screenshots visuell geprüft; während der Prüfung erkannte Bildbeschnitte korrigiert und erneut geprüft.
