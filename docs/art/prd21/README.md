# Orbitalringe – freigegebene Fassung 2

orbitalringe-v2.png wurde am 01.11.2026 freigegeben und umgesetzt. Fassung 1 bleibt ausdrücklich als verworfene Referenz erhalten. Konzeptprompts stehen in prompts.json, Produktionsprompts und Quellen in production/. Alle Bilder wurden mit eingebautem ImageGen erzeugt.

Fünf Zustände: gebrochen, kleiner Ring, erster Großringabschnitt, großer Ring, Doppelwerft. Produktionsdateien: client/assets/art/space/orbital_*.png. Zehn PNG-Ebenen mit echtem Alpha, 1024×1024 und gemeinsamem Zentrum (512,512). scripts/pack-orbital-art.js verpackt sie reproduzierbar mit Sharp über SHARP_MODULE. Bei den drei großen Quellen wird nur die äußere zusammenhängende Alpha-Insel extrahiert; der identische kleine Innenring wird separat weiterverwendet. Keine Bodenwelt ist eingebrannt.

Auswahl: shared/orbital-art.js. Rendering: client/js/orbitalRings.js. Kein geometrischer Ersatzrenderer. Die Umsetzung ist unabhängig von Bodenausbau und laufenden Bauaufträgen und ändert keine Spielmechanik.

[Spielansichten und Prüfungen](../../qa/orbital-art/index.html) · [PRD 21](../../PRD-21.md). Push nach Abschluss wurde vom Nutzer freigegeben.
