// Artwork follows completed orbital construction, never surface development.
export const ORBITAL_STAGES = Object.freeze(['broken', 'small', 'partial', 'large', 'double']);

export function orbitalArtStage(entity) {
  if (entity.kind !== 'planet' || entity.type !== 'ruins') return null;
  const orbital = entity.market?.homeworld?.orbital;
  if (orbital?.large || orbital?.largeStage >= 2) return orbital.doubleYard ? 'double' : 'large';
  if (orbital?.largeStage >= 1) return 'partial';
  return orbital?.small ? 'small' : 'broken';
}

// Normalized sprites have a 896px footprint inside a centered 1024px canvas.
// The inner ring keeps the same world radius when the outer ring is added.
export const orbitalArtScale = stage => ['partial', 'large', 'double'].includes(stage) ? 6.4 : 3.6 * 1024 / 896;
export const orbitalArtKey = (stage, front) => stage ? `space_orbital_${stage}_${front ? 'front' : 'back'}` : null;

export const orbitalArtParts = stage => !stage ? [] : ['broken', 'small'].includes(stage) ? [stage] : ['small', stage];

export function orbitalHitTest(entity, dx, dy, radius, tolerance = 0) {
  const stage = orbitalArtStage(entity);
  if (!stage) return false;
  const distance = Math.hypot(dx, dy / .58);
  const band = Math.max(radius * .2, tolerance);
  if (Math.abs(distance - radius * 1.8) <= band) return true;
  return ['partial', 'large', 'double'].includes(stage)
    && (stage !== 'partial' || dy <= radius * 1.2) // Include the hanging cranes at both unfinished ends.
    && Math.abs(distance - radius * 2.8) <= band;
}
