import {getSprite} from './assets.js';
import {orbitalArtStage, orbitalArtKey, orbitalArtParts, orbitalArtScale} from '/shared/orbital-art.js';

// Both halves use the same planet-center anchor and scale. Surface development
// changes only the planet drawn between them, never the orbital construction.
export function drawOrbitalRings(ctx, entity, radius, front) {
  const parts = orbitalArtParts(orbitalArtStage(entity));
  if (!front) parts.reverse();
  for (const part of parts) {
    const image = getSprite(orbitalArtKey(part, front));
    if (!image) continue;
    const size = radius * orbitalArtScale(part);
    ctx.drawImage(image, entity.x - size / 2, entity.y - size / 2, size, size);
  }
}
