// PRD 15: Einstiegspunkt der Kriegssysteme. Laden, Speichern und Takt aller Teilsysteme.
import { formRouteStacks, syncStacks } from './stacks.js';

/** Persistente Kriegszustände: Präfix der Zeilen-ID in der Tabelle war -> Map am Spiel */
const COLLECTIONS = { stack: 'stacks' };

export function initWar(game) {
  game.stacks = new Map();
  game.counters.stack ??= 0;
}

export function loadWar(game) {
  for (const r of game.store.loadAll('war')) {
    const i = r.id.indexOf(':');
    const kind = r.id.slice(0, i), id = r.id.slice(i + 1);
    const coll = COLLECTIONS[kind];
    if (coll) game[coll].set(id, r.data);
  }
}

export function saveWar(game) {
  const rows = [];
  for (const [kind, coll] of Object.entries(COLLECTIONS)) for (const [id, data] of game[coll]) rows.push({ key: [kind + ':' + id], data });
  return game.store.sync('war', rows);
}

/** Vor der Schiffsbewegung */
export function tickWarBefore(game) {
  formRouteStacks(game);
}

/** Nach der Schiffsbewegung */
export function tickWarAfter(game, dt) {
  syncStacks(game, dt);
}
