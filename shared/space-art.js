import {PLANET_TYPES, STATION_TYPES, BELT_TYPES} from './goods.js';
import {STUDY_FINDS} from './advanced-homequests.js';
import {ruinsDevelopment} from './ruins-development.js';
import {ORBITAL_STAGES} from './orbital-art.js';

export const SUN_COLORS = Object.freeze(['#fff3c4', '#ffe082', '#ffcc80', '#ff8a65', '#bbdefb', '#ffffff']);
const ids = [
  ...Object.keys(PLANET_TYPES).filter(id => id !== 'ruins').map(id => 'planet_' + id),
  ...Array.from({length: 6}, (_, i) => 'ruins_' + i),
  ...Object.keys(STATION_TYPES).map(id => 'station_' + id),
  ...Object.keys(BELT_TYPES).map(id => 'resource_' + id),
  ...['archive', 'study', 'relic'].map(id => 'quest_' + id),
  ...SUN_COLORS.map((_, i) => 'sun_' + i),
  'blackhole_0', 'blackhole_1', 'wormhole',
  ...['gravity', 'ionstorm', 'nebula', 'solarwind', 'plasma'].map(id => 'zone_' + id),
  'background_teal', 'background_violet',
  ...ORBITAL_STAGES.flatMap(stage => ['back', 'front'].map(side => `orbital_${stage}_${side}`)),
];
export const SPACE_ART = Object.freeze(Object.fromEntries(ids.map(id => ['space_' + id, '/assets/art/space/' + id + '.png'])));
export const spaceArtUrl = key => SPACE_ART[key] || null;

export function spaceArtKey(entity) {
  if (entity.kind === 'planet') return entity.type === 'ruins'
    ? 'space_ruins_' + ruinsDevelopment(entity).stage : 'space_planet_' + entity.type;
  if (entity.kind === 'station') {
    if (entity.archiveKey) return 'space_quest_' + (STUDY_FINDS[entity.archiveKey] ? 'study' : 'archive');
    if (entity.salvageOwner) return 'space_quest_relic';
    return 'space_station_' + entity.type;
  }
  if (entity.kind === 'wormhole') return 'space_wormhole';
  if (entity.kind === 'belt') return 'space_resource_' + entity.type;
  return null;
}

export const sunArtKey = color => 'space_sun_' + Math.max(0, SUN_COLORS.indexOf((color || '').toLowerCase()));
