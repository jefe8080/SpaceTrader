
/**
 * Plan dynamic buildings on an exported planet ground.
 * All transforms use glTF axes/meters and are relative to the ground root.
 * Import this module from /assets/models/planets/placement.js.
 */
function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
function keyOf(item, ordinal) {
  if (item.key) return item.key;
  return item.good ? item.kind + ':' + item.good
    : item.kind === 'factory' ? 'factory:' + item.recipe + ':' + (item.index ?? ordinal)
    : item.kind === 'plot' ? 'plot:' + item.cat + ':' + ordinal
    : item.kind === 'fun' ? 'fun:' + item.building : item.kind;
}
export function planBuildingPlacements(items, layout, buildingManifest, options = {}) {
  const baseURL = options.modelBaseURL ?? '/assets/models/';
  const previous = options.previous ?? {};
  const slots = layout.slots;
  const seen = new Map();
  const jobs = items.map((item, index) => {
    const occurrenceKey = item.kind + ':' + (item.cat ?? '');
    const ordinal = seen.get(occurrenceKey) ?? 0;
    seen.set(occurrenceKey, ordinal + 1);
    const asset = buildingManifest.assets.find(a =>
      Object.entries(a.selector).every(([key, value]) => item[key] === value));
    if (!asset) throw new Error('No model for building at index ' + index);
    const category = item.cat ?? (item.kind === 'factory'
      ? options.recipeCategory?.(item.recipe) : undefined);
    const role = item.kind === 'questhouse' ? 'questhouse'
      : asset.id === 'racetrack' ? 'large'
      : item.kind === 'beggar' || item.kind === 'dog' ? 'prop'
      : item.kind === 'factory' || item.kind === 'plot' ? 'factory'
      : 'general';
    const key = keyOf(item, ordinal);
    return { item, index, asset, category, role, key };
  });
  if (new Set(jobs.map(j => j.key)).size !== jobs.length)
    throw new Error('Duplicate building identity');
  const used = new Set();
  const chosen = new Map();
  const fits = (job, slot) => slot.role === job.role &&
    (job.role !== 'factory' || !job.category || slot.category === job.category);
  // Preserve existing identities first, so additions do not move existing buildings.
  for (const job of jobs) {
    const slot = slots.find(s => s.id === previous[job.key]);
    if (slot && fits(job, slot) && !used.has(slot.id)) {
      used.add(slot.id); chosen.set(job.key, slot);
    }
  }
  const priority = { questhouse: 0, large: 1, factory: 2, prop: 3, general: 4 };
  const pending = jobs.filter(j => !chosen.has(j.key)).sort((a, b) =>
    priority[a.role] - priority[b.role] ||
    Number(Boolean(b.category)) - Number(Boolean(a.category)) ||
    hash(a.key) - hash(b.key) || a.key.localeCompare(b.key));
  for (const job of pending) {
    const available = slots.filter(s => fits(job, s) && !used.has(s.id));
    if (!available.length) throw new Error('No free ' + job.role +
      (job.category ? ' / ' + job.category : '') + ' slot for ' + job.key);
    const slot = available[hash((options.planetId ?? '') + ':' + job.key) % available.length];
    chosen.set(job.key, slot); used.add(slot.id);
  }
  const assignments = {};
  const placements = jobs.map(job => {
    const slot = chosen.get(job.key);
    assignments[job.key] = slot.id;
    return {
      key: job.key, itemIndex: job.index, asset: job.asset.id,
      url: baseURL.replace(/\/?$/, '/') + job.asset.glb,
      slotId: slot.id, anchorNode: slot.node,
      position: [...slot.position], rotationY: slot.rotation_y,
      footprint: [...slot.footprint], item: job.item
    };
  });
  return { planetType: layout.planet_type, rootNode: layout.terrain_root,
    placements, assignments,
    unusedSlotIds: slots.filter(s => !used.has(s.id)).map(s => s.id) };
}
