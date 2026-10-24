# U4: gerenderte Planetenprüfung

2026-10-24, Entwicklungsserver `npm run dev:prd5`, [Prüfoberfläche](http://localhost:3005/dev/planet.html).

Die Prüfoberfläche lädt echte GLB-Gelände und Gebäude mit dem produktiven `PlanetScene`-Renderer. Sie ist ausschließlich im `homeworld`-Entwicklungsprofil erreichbar.

`browser-audit.json` enthält 180 gerenderte Fälle: zwölf Welttypen, fünf Viewports (390×844, 1024×768, 1440×900, 1920×1080, 2560×1080), jeweils maximal herausgezoomte Übersicht, Schwenkgrenze und unterbrochene Fokusfahrt. Ein Randraster mit 44 Strahlen prüft echte Gelände-/Kulissengeometrie. Alle Fälle haben null fehlende Randtreffer, unveränderte zwei Gebäude und getrennte Kulissenbounds. Keine Browserfehler im Prüflauf.

Zusätzlich prüft `tests/planet-environment.test.js` sämtliche GLBs, Originalanker und beide Schwenkrichtungen bei Übersicht und Fokus über alle fünf Viewports. Diese geometrische Prüfung ergänzt die Browserdarstellung.

Visuell geprüft und als echte Browserscreenshots gespeichert:

- `agrar-mobile.png`: vollständiges Landumfeld im Hochformat.
- `ocean.png`: durchgehendes Meer um vorhandene Inseln.
- `gasgiant.png`: Wolkenschichten unter und hinter Plattformen.

Die vorhandenen Low-Poly-Gebäude bleiben Übergangsassets. Dieser Nachweis erteilt keine Stilfreigabe für die späteren gezeichneten Ruinen und Bilddialoge.
