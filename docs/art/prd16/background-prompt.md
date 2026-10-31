# PRD 16: Hintergrund-Erweiterung

Werkzeug: eingebautes ImageGen, Bearbeitung mit Referenz
`client/assets/art/cities/ruins-city-v2.png`.

Prompt:
> Extend the canvas ONLY UPWARD by 160 pixels to 1536x1184, continuing its aqueducts, vegetation and waterworks naturally in the same warm detailed comic fantasy style and same isometric view. Keep the entire original image in the lower 1024 pixels unchanged, no resizing, no moving buildings, no distortions. The new upper strip should complete the waterworks near x422 at the top of original painting and add room above it. No text, grid, markers or UI.

Ergebnis: `client/assets/art/cities/ruins-city-extension.png`.
Das Werkzeug lieferte eine 1536×1024-Variante statt der angeforderten Höhe.
Deshalb ersetzt sie nicht das Original: Der Renderer verwendet ausschließlich
die oberen 128 Pixel als Fortsetzung bei y=-128. Das originale Gemälde bleibt
unverändert bei (0,0) in 1536×1024. Anker bleiben in den ursprünglichen
Koordinaten, Landschaft und Kameragrenzen enthalten den neuen oberen Bereich.
Browserprüfung: Wasserwerk und Andockanlage vollständig sichtbar; Auswahl
und Gebäude verwenden identische Weltkoordinaten.
