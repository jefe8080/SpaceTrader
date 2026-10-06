import { GOODS, PLANET_TYPES, STATION_TYPES, BELT_TYPES, SHIP_TYPES, buyPrice, sellPrice } from '/shared/config.js';
import { state, esc } from './state.js';
import { spriteUrl } from './assets.js';

export function typeName(e) {
  if (e.kind === 'planet') return PLANET_TYPES[e.type].name;
  if (e.kind === 'station') return STATION_TYPES[e.type].name;
  return 'Asteroidenfeld · ' + GOODS[BELT_TYPES[e.type].good].name;
}

export function entitySprite(e) {
  if (e.kind === 'planet') return spriteUrl(PLANET_TYPES[e.type].sprite);
  if (e.kind === 'station') return spriteUrl(STATION_TYPES[e.type].sprite, STATION_TYPES[e.type].accent);
  return spriteUrl(BELT_TYPES[e.type].sprite);
}

export const shipSprite = (type, color) => spriteUrl(SHIP_TYPES[type].sprite, color);

export const goodTag = (g) => `<span class="good"><span class="dot" style="background:${GOODS[g].color}"></span>${GOODS[g].name}</span>`;

/** Aktueller Preis aus Sicht des Spielers (Kauf bei Produzenten, Verkauf bei Abnehmern) */
export function playerPrice(e, g) {
  const s = e.market?.goods[g];
  if (!s) return null;
  return s.role === 'produce' ? buyPrice(g, s.stock, s.cap) : sellPrice(g, s.stock, s.cap);
}

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const cargoUsed = (s) => Object.values(s.cargo || {}).reduce((a, b) => a + b, 0);

export function statusText(s) {
  const o = s.orders || { type: 'idle' };
  const nm = (id) => esc(state.entities.get(id)?.name || '?');
  switch (o.type) {
    case 'route': {
      const st = o.stops[o.index];
      const phase = o.phase === 'travel' ? 'Anflug' : s.state === 'mining' ? 'Abbau' : 'Handel';
      return `Route · Stopp ${o.index + 1}/${o.stops.length} · ${phase}: ${st ? nm(st.targetId) : '?'}`;
    }
    case 'goto': return `Fliegt zu ${nm(o.targetId)}`;
    case 'mine': return s.state === 'mining' ? `Baut ab: ${nm(o.targetId)}` : `Fliegt zum Abbau: ${nm(o.targetId)}`;
    case 'move': return 'Fliegt zu Koordinaten';
    default: return s.dockedAt ? `Angedockt: ${nm(s.dockedAt)}` : 'Wartet im All';
  }
}
