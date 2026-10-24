# U16 – Bildproduktion und Einbindung

Alle Rasterbilder mit dem eingebauten `image_gen` erzeugt, anschließend in `client/assets/art/homeworld/` kopiert. Keine externe API/CLI. Vorhandene `arrival.png` war bei den sechs ersten Szenen die reine Stilreferenz. Nelas erste Variante wurde verworfen, weil sie Mira zu ähnlich war; `settlement-v2.png` ist die eingebundene eigenständige Figur. Keine Dialogtexte im Bild.

## Gemeinsamer Szenenprompt

Für workshop, orbital, expedition und archive jeweils ein eigener Aufruf mit folgendem Rahmen und dem unten angegebenen Motiv:

“Finished single seamless wide narrative game illustration. Reference image is art direction only: mature hand-painted European science fiction graphic novel, varied ink outlines, ochre stone HUMAN ruins, weathered teal machinery, muted foliage, sparse warm amber lights, atmospheric depth. [MOTIV] 1536x1024 landscape composition. Expressive readable adult human faces, practical clothing, no aliens, no magic, no UI, no captions or text, no logo. Quiet dark lower area for separate interface text. No divided panels. Save to local image file and return path.”

- `workshop.png`: “Tarek, a broad-shouldered adult male industrial engineer with dark skin, close-cropped hair, ochre coveralls and a teal utility apron, opens a rusted maintenance cabinet in an overgrown human ruin workshop. Damaged water pipes, hand tools and a dormant strange machine. An invitation to start rebuilding, no magical effects.”
- `orbital.png`: “Tarek, a broad-shouldered adult male industrial engineer with dark skin, close-cropped hair, ochre coveralls and teal utility apron, stands with workers before monumental broken orbital shipyard ring segments. A small utilitarian freighter is being physically dismantled into permanent infrastructure. Hopeful industrial reconstruction, cranes and welding sparks.”
- `expedition.png`: “Mira, same short tousled dark hair, rust orange scarf, gray workclothes and tablet as reference, briefs a small human expedition team around a glowing physical star chart on an old worktable. Through the opening is a distant abandoned ruin settlement awaiting rebuilding. Boxes of construction supplies and folded habitat modules. Discovery and responsibility.”
- `archive.png`: “Iven, adult male archivist with round glasses, tied-back silver hair, charcoal field coat and teal scarf, opens an immense ancient HUMAN archive. Fragmentary holographic recording of an ordinary human face floats above worn mechanical rings. No readable text, no alien civilization. The unique propulsion artifact glows teal, a restrained hopeful but uncertain revelation.”

## Relikt

`relic.png`, mit Ankunftsszene als Stilreferenz:

“Create a finished seamless wide narrative illustration for Space Trader. Reference image is ONLY the approved mature hand-painted European graphic novel art direction: ink outlines, warm ochre ancient human ruins, weathered teal machines, amber lights, muted foliage. New scene: inside a ruined ancient HUMAN propulsion workshop, Iven, an adult male archivist with round glasses, tied-back silver hair, charcoal field coat and teal scarf, examines an opened mysterious propulsion relic with recognizable human writing-like markings, but NO actual readable text. Artifact is mechanical concentric rings with teal glow, not magic. A young adult woman engineer with dark short curly hair and rust scarf watches from behind. Intimate dramatic light, hopeful mystery, no aliens. Single continuous illustration, not panels, no captions or UI, no logos. 1536x1024 composition, faces readable, bottom quiet and darker for separate interface text. Save generated image to a local file and return the path.”

## Nela

`settlement-v2.png`, eigenständiger Aufruf ohne Figurenreferenz:

“Single finished 1536x1024 science-fiction graphic novel illustration, mature hand-painted ink art, warm ochre ancient human ruins, weathered teal machinery, muted foliage, amber technical lights. The main character NELA is a middle-aged BLACK human woman with deep brown skin, LONG dark braided hair, rectangular green planner jacket, cream shirt, NO neck scarf, NO short hair. She is clearly distinct from the game's short-haired pale dockmaster. Nela stands waist-up on the right with rolled paper building plans under one arm and indicates a newly constructed residential quarter on the left, between existing monumental ruined arches and repaired teal water tanks. Show actual new multi-story homes, residents and planted courtyards, housing and water infrastructure together, hopeful civil rebuilding. Readable expressive face, no magic, no aliens. Single continuous composition, no text, labels, logos or UI. Quiet darker bottom for separately rendered dialogue.”

## Gebäudeatlas

`buildings.png`: 1536×1024, RGBA, transparente Ränder überprüft. Vier Spalten, drei Zeilen; UV-Zuordnung in `planetArt.js`. Ein einzelnes Atlasasset, kein UI-Mockup. Transparenz unverändert erhalten.

“Production GAME SPRITE ATLAS, exact uniform grid of FOUR columns and THREE rows, 12 equal square cells, 1536x1024 overall. True transparent background. Every cell contains exactly one separate complete centered building with generous transparent padding, NO shadow outside cell, NO text labels, no gridlines. All 12 share exactly the same elevated orthographic isometric view (front right visible) and mature hand-painted European science fiction graphic novel style, crisp varied dark ink contours, painterly ochre stone, weathered teal metal, small warm amber operating lights, muted green ivy. Buildings are compact readable silhouettes, substantial detail at small scale. Row1 col1 repaired waterworks with two teal tanks and pipes; col2 control communications tower with dish and antennas; col3 mechanic propulsion workshop with glowing open bay; col4 residential multi-story ochre habitat block with planted balcony. Row2 col1 industrial processing factory with two chimneys and conveyor; col2 dock warehouse with stacked crates; col3 solar collector field with teal panels; col4 research laboratory with glass dome. Row3 col1 spaceport cargo terminal with landing pad, NO ship; col2 circular orbital shipyard ring above two supports with workshop underneath; col3 destroyed ruined ochre building with fractured walls and ivy; col4 building construction site with scaffolding and crane. Equal-sized uniform cells, each building fits wholly inside its own cell. No landscape, no humans, no floating island base. All architecture is ancient HUMAN technology being rebuilt.”

## Boden

`ground.png`, durchgehend in Weltkoordinaten auch auf der getrennten Kulisse abgetastet:

“Seamlessly TILEABLE top-down ground material texture for a hopeful ancient ruined human science fiction colony, square image 1024x1024. Orthographic straight down, ZERO perspective, no horizon. Hand-painted mature European comic-book material with fine dark ink details, softly brushed warm ochre cracked paving stones and old footpath fragments embedded in muted olive scrub and dry grasses, sparse small teal oxidized technical fragments. Subtle low contrast, small scale detail repeated across entire square, no focal feature, no buildings, no people, no objects sticking upward, no water, no text. Opposite image edges must tile naturally. Dominant muted warm ochre and dusty olive, not bright grass green. Suitable as continuous ground under clickable separate buildings. No floating island, no visible outer border.”

## Geometrie und Lesbarkeit

Die ursprünglichen Gebäudeanker und Wirtschaftsdaten bleiben unabhängig von der Illustration. Spriteflächen tragen weiterhin ihren stabilen Gebäudeschlüssel. Kulissenruinen gehören ausschließlich zum getrennten Umfeld und werden nicht gepickt oder in den Kamerafit aufgenommen. Alle Weltgruppen verwenden dieselbe gezeichnete Gebäudesprache und Pigment-/Tuschematerialien; Land-, Wasser- und Wolkenfortsetzung bleiben typgerecht. Ruinen/baubedingte Gerüste, aktive Anlagen, zusätzlicher Wohnraum, Raumhafen, Forschung und zwei Ringgrößen sind unmittelbar unterscheidbar. Schiffsdesigns wurden nicht ersetzt.
