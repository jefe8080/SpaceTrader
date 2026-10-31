// PRD 15: Einstiegspunkt der Kriegssysteme. Laden, Speichern und Takt aller Teilsysteme.
import { formRouteStacks, syncStacks } from './stacks.js';
import { tickBattles } from './battle.js';
import { tickEngagements } from './engage.js';
import { tickDebris } from './outcome.js';

/** Persistente Kriegszustände: Präfix der Zeilen-ID in der Tabelle war -> Map am Spiel */
const COLLECTIONS = { stack: 'stacks', battle: 'battles' };

export function initWar(game) {
  game.stacks = new Map();
  game.battles = new Map();
  game.battleFx = new Map(); // flüchtige Effekte für die Darstellung, nicht gespeichert
  game.counters.stack ??= 0;
  game.counters.battle ??= 0;
  game.counters.debris ??= 0;
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
export function tickWarBefore(game, dt) {
  formRouteStacks(game);
  tickBattles(game, dt);
  tickEngagements(game, dt);
}

/** Nach der Schiffsbewegung */
export function tickWarAfter(game, dt) {
  syncStacks(game, dt);
  game.warAcc = (game.warAcc || 0) + dt;
  if (game.warAcc >= 1) { game.warAcc = 0; tickDebris(game); }
}
