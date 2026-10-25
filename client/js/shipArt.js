// Austauschbare Illustrationen; IDs entsprechen unverändert dem Schiffskatalog.
export const PAINTED_SHIPS = new Set([
  'spatz', 'maulwurf', 'kolibri', 'lastesel', 'grubenhund', 'bussard', 'pelikan',
  'seekuh', 'mammut', 'wal', 'kondor', 'titan', 'leviathan', 'versorger',
  ...['miners', 'tech', 'nomads', 'order', 'league', 'syndicate']
    .flatMap(faction => ['fl_', 'fx_', 'f_'].map(prefix => prefix + faction)),
].map(id => 'ship_' + id));

export const shipArtUrl = name => PAINTED_SHIPS.has(name) ? `/assets/art/ships/${name}.png` : null;

// Dieselbe Bildschirmgröße für Bild, Auswahlring und Treffertest.
export const shipScreenSize = (size, zoom) => Math.max(size * zoom * 1.28, 24);

// Bei Flug nach links die Oberseite oben halten, ohne die Flugrichtung zu ändern.
export const shipVerticalScale = angle => Math.cos(angle) < 0 ? -1 : 1;
