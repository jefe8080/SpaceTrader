# Questhaus – erstes 3D-Gebäude

Stilisierter Low-Poly-Entwurf für `kind: 'questhouse'` in der Planetenansicht.
Das Questhaus steht bereits als erstes Gebäude in `client/js/planetside.js`.

## Dateien

- `questhouse.glb`: Spielmodell mit eingebetteten PBR-Materialien, ohne Kamera, Licht oder Vorschau-Boden.
- `questhouse.blend`: editierbares Modell und beleuchtete Vorschau-Szene. Modell in Collection `Questhouse_Model`, Bühne in `Preview_Stage`.
- `preview.png` / `preview-back.png`: Vorder- und Rückansicht.
- `asset.json`: Abmessungen, Orientierung und Geometriedaten.
- `generate.py`: reproduzierbare Erstellung mit Blender-Python. Verweigert das Überschreiben bestehender Modell-Dateien; für eine Variante OUT auf einen neuen Ordner setzen.

## Technische Daten

3.616 Dreiecke, ein statisches Mesh, neun Materialgruppen. GLB ca. 267 KB.
Grundfläche 10 × 7,4 m, Höhe 4,805 m. Ursprung mittig auf Bodenhöhe.
Blender: Z nach oben, Front -Y. GLB: Y nach oben, Front +Z.
Keine externen Texturen erforderlich. Farben und Oberflächen sind direkt als glTF-PBR-Materialien gespeichert.
Alle Geometrie und Materialien wurden für dieses Projekt erstellt; keine Fremdassets.

## Stand

Entwurf zur Stilbewertung. Noch nicht in den bestehenden 2D-Canvas-Renderer eingebaut.
