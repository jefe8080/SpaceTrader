import { factorySlots } from './planetside.js';

export function planetDevelopment(entity) {
  const market = entity.market, home = market?.homeworld;
  if (entity.kind !== 'planet') return { stage: 0, buildings: 0, smallRing: false, largeRing: false };
  if (entity.type === 'ruins') {
    const buildings = (home?.structures || []).filter(b => b.status === 'ready').length
      + Object.values(home?.facilities || {}).filter(b => b.status === 'ready').length;
    const level = home?.facilities?.control?.status === 'ready' ? home.controlLevel || 0 : 0;
    const stage = level >= 3 && buildings >= 24 ? 3 : level >= 2 && buildings >= 12 ? 2 : level >= 1 && buildings >= 4 ? 1 : 0;
    return { stage, buildings, smallRing: !!home?.orbital?.small, largeRing: !!home?.orbital?.large };
  }
  if (!Object.values(factorySlots(entity.type)).some(n => n > 0)) return { stage: 0, buildings: 0, smallRing: false, largeRing: false };
  const buildings = Object.values(market?.goods || {}).filter(s => !s.fac && ['produce', 'consume'].includes(s.role)).length
    + (market?.bld?.factories || market?.bld?.fac || []).length + (market?.economy?.infrastructure || []).length;
  return { stage: buildings >= 12 ? 2 : buildings >= 4 ? 1 : 0, buildings, smallRing: false, largeRing: false };
}
