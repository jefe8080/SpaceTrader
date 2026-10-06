import { GOODS, PLANET_TYPES, STATION_TYPES, BELT_TYPES, SHIP_TYPES, buyPrice, sellPrice, canBuyFrom } from '/shared/config.js';
import { planPath } from '/shared/nav.js';
import { state, esc } from './state.js';
import { spriteUrl } from './assets.js';

export function typeName(e) {
  if (e.kind === 'planet') return PLANET_TYPES[e.type].name;
  if (e.kind === 'station') return STATION_TYPES[e.type].name;
  if (e.kind === 'wormhole') return 'Wurmloch';
  return 'Asteroidenfeld · ' + GOODS[BELT_TYPES[e.type].good].name;
}

export function entitySprite(e) {
  if (e.kind === 'planet') return spriteUrl(PLANET_TYPES[e.type].sprite);
  if (e.kind === 'station') return spriteUrl(STATION_TYPES[e.type].sprite, STATION_TYPES[e.type].accent);
  if (e.kind === 'wormhole') return '/assets/wormhole.svg';
  return spriteUrl(BELT_TYPES[e.type].sprite);
}

export const systemName = (e) => state.systems.get(e?.system)?.name || (e?.type === 'hub' ? 'Schwarzes Loch' : '–');
export const sectorName = (e) => state.sectors.get(e?.sector)?.name || '–';

export const shipSprite = (type, color) => spriteUrl(SHIP_TYPES[type].sprite, color);

export const goodTag = (g) => `<span class="good"><span class="dot" style="background:${GOODS[g].color}"></span>${GOODS[g].name}</span>`;

/** Aktueller Preis aus Sicht des Spielers: Kaufpreis bei verkaufenden Märkten, sonst Verkaufserlös */
export function playerPrice(e, g, dir = null) {
  const s = e.market?.goods[g];
  if (!s) return null;
  const d = dir || (canBuyFrom(s) ? 'buy' : 'sell');
  return d === 'buy' ? buyPrice(g, s) : sellPrice(g, s);
}

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const cargoUsed = (s) => Object.values(s.cargo || {}).reduce((a, b) => a + b, 0);
export const shipSpeed = (s) => SHIP_TYPES[s.type].speed;

/** Geschätzte Flugzeit in Sekunden: bekannte Wurmlöcher und Sondergebiete eingerechnet */
export function flightSecs(ship, e) {
  if (!ship || !e) return null;
  return planPath(ship, e, [...state.wh.values()], shipSpeed(ship), [...state.zones.values()]).time;
}
export const fmtDuration = (secs) => {
  if (secs === null || secs === undefined) return '–';
  if (secs < 60) return `${Math.round(secs)} s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, '0')} min`;
  return `${Math.floor(secs / 3600)} h ${Math.round((secs % 3600) / 60)} min`;
};

const nm = (id) => esc(state.entities.get(id)?.name || '?');
export const hasWarn = (s) => Object.keys(s.warn || {}).length > 0;

/** Zustandssymbol: ↻ Route, ➤ in Bewegung, ⚓ angedockt untätig, ⏸ untätig, ⛏ Abbau */
export function shipSymbol(s) {
  const c = s.queue?.[0];
  if (s.state === 'mining') return '⛏';
  if (c?.t === 'route') return '↻';
  if (s.state === 'flying') return '➤';
  if (!c) return s.dockedAt ? '⚓' : '⏸';
  return s.dockedAt ? '⚓' : '➤';
}

export function actionText(a) {
  if (a.op === 'mine') return 'Abbauen';
  if (a.op === 'refuel') return 'Tanken';
  if (a.op === 'waitUntil') {
    const what = a.cond.startsWith('stock') ? 'Bestand' : 'Preis';
    return `Warten bis ${what} ${GOODS[a.good].name} ${a.cond.slice(-2) === '>=' ? '≥' : '≤'} ${a.value}`;
  }
  return `${a.op === 'buy' ? 'Kaufen' : 'Verkaufen'} ${GOODS[a.good].name}${a.amount ? ' ' + a.amount : ''}${a.limit ? (a.op === 'buy' ? ' ≤ ' : ' ≥ ') + a.limit + ' Cr' : ''}`;
}

/** Beschreibung eines Queue-Befehls */
export function queueText(c) {
  switch (c.t) {
    case 'move': return `Fliege zu ${Math.round(c.x)}, ${Math.round(c.y)}`;
    case 'goto': return `Fliege zu ${nm(c.target)}`;
    case 'dock': return `Andocken ${nm(c.target)}${c.actions?.length ? ': ' + c.actions.map(actionText).join(', ') : ''}`;
    case 'mine': return `Abbauen bis voll: ${nm(c.target)}`;
    case 'wait': return `Warte ${c.secs} s`;
    case 'route': {
      const r = state.routes.get(c.route);
      return `Route ${esc(r?.name || '?')}${c.rounds ? ` (${(c.done || 0)}/${c.rounds} Runden)` : ' (endlos)'}`;
    }
    case 'supply': return 'Versorgungsflug';
    default: return c.t;
  }
}

export function statusText(s) {
  const c = s.queue?.[0];
  if (!c) return s.dockedAt ? `Angedockt: ${nm(s.dockedAt)}` : 'Wartet im All';
  if (c.t === 'route') {
    const r = state.routes.get(c.route);
    const st = r?.stops[c.idx || 0];
    const phase = c.phase === 'travel' || !c.phase ? (r?.paused ? 'pausiert' : 'Anflug') : s.state === 'mining' ? 'Abbau' : s.state === 'waiting' ? 'wartet' : 'Handel';
    return `${esc(r?.name || 'Route')} · ${(c.idx || 0) + 1}/${r?.stops.length || '?'} ${phase}: ${st ? nm(st.targetId) : '?'}`;
  }
  if (c.t === 'mine' && s.state === 'mining') return `Baut ab: ${nm(c.target)}`;
  return queueText(c);
}
