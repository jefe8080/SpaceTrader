// Public completed construction selects one of six painted planet views.
// No stored stage, control-level gate, operating-state gate or generated buildings.
export const RUINS_STAGES = Object.freeze([
  {name: 'Ankunft', points: 0}, {name: 'Siedlung', points: 4},
  {name: 'Gemeinde', points: 8}, {name: 'Stadt', points: 16},
  {name: 'Großstadt', points: 24}, {name: 'Wiederaufgebaute Welt', points: 36},
].map(Object.freeze));

export function ruinsDevelopment(entity) {
  const home = entity.kind === 'planet' && entity.type === 'ruins' ? entity.market?.homeworld : null;
  const ready = [...(home?.structures || []), ...Object.values(home?.facilities || {})]
    .filter(building => building?.status === 'ready');
  const points = ready.reduce((sum, building) => {
    const maxLevel = building.kind === 'housing' ? 3 : ['silo', 'safeStorage'].includes(building.kind) ? 5 : 1;
    const level = Number.isFinite(building.level) ? Math.max(1, Math.min(maxLevel, Math.floor(building.level))) : 1;
    return sum + level + new Set(building.upgrades || []).size;
  }, 0);
  const stage = RUINS_STAGES.findLastIndex(entry => points >= entry.points);
  return {stage, points, buildings: ready.length, name: RUINS_STAGES[stage].name};
}
