# Schiffsillustrationen

Die drei `*-approved.png` sind die vom Nutzer freigegebenen Entwurfstafeln. Die `*-atlas.png` sind mit dem eingebauten Imagegen-Tool daraus abgeleitete Freistellungen.

Prompt: Preserve every approved spaceship design, colors, silhouette and right-facing three-quarter view. Remove all labels, headings, emblems outside ships, borders, dividing lines and background. Isolate the 14 civilian ships in original order (seven columns, two rows), and each nine-ship faction group in original order (three columns, three rows), on transparent background. Keep whole ships separate; do not redesign.

`scripts/pack-ship-art.js` verpackt die Motive als einzelne quadratische PNG-Dateien. Voraussetzung ist eine vorhandene Sharp-Installation, optional über `SHARP_MODULE` angegeben. Bei den Fraktionstafeln werden halbtransparente Hintergrundreste aus der Alpha-Maske entfernt. Die Zuordnung steht in `client/assets/art/ships/manifest.json`.

Für spätere Änderungen genügt der Austausch der jeweiligen 512 × 512 RGBA-PNG unter Beibehaltung des Dateinamens. Bug nach links vermeiden: Die Nase zeigt nach rechts. 32 Pixel transparenter Rand, Motiv proportional einpassen. Spielfarben nicht flächig über die Fraktionsillustration legen.
