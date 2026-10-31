import {recordInventoryTrade} from './pilot-profile.js';
import { RECIPES, PROP_UPGRADES, buyPrice } from '../shared/config.js';
import { applyLevel, ensureFactoryStorage } from './markets.js';
import { addToBuckets } from './stats.js';
import { isConsortiumOwner } from '../shared/consortium.js';
import { bookRevenue } from './consortium.js';

/**
 * Besitz von Planeten und Stationen. Die Besitzdaten liegen in game.ownership (Entity-ID -> Eintrag)
 * und werden beim Laden und nach jeder Änderung auf den Markt angewendet.
 */
export function newProperty(entityId, playerId, time) {
  return { entity: entityId, player: playerId, mode: 'open', customs: 0, fixed: {}, upg: {}, extras: [], yardSale: false, since: Math.round(time), tot: {}, stats: [] };
}

/** Besitz auf Markt und Entity anwenden: Lager, Tempo, Ertrag, Zusatzproduktion, Anzeige */
export function applyProperty(game, e, prop) {
  const m = e.market;
  ensureFactoryStorage(e);
  m.owner = prop.player;
  m.mode = prop.mode;
  m.customs = prop.customs || 0;
  const label = game.ownerLabel(prop.player);
  e.ownerName = label.name;
  e.ownerColor = label.color;
  if (e.type === 'ruins'||m.realEconomy) { m.rev = (m.rev || 0) + 1; return; }
  const u = prop.upg || {};
  m.storageMul = 1 + PROP_UPGRADES.storage.per * (u.storage || 0);
  m.boost = 1 + PROP_UPGRADES.speed.per * (u.speed || 0);
  m.yieldBoost = 1 + PROP_UPGRADES.yield.per * (u.yield || 0);
  // Zusatzproduktion
  if (e.kind === 'planet') {
    for (const g of prop.extras) {
      if (!m.goods[g]) m.goods[g] = { role: 'produce', rate: 0.3 * (e.size || 1), baseRate: 0.3 * (e.size || 1), cap: 600, baseCap: 600, stock: 0, mod: 1 };
      else if (m.goods[g].role !== 'produce') Object.assign(m.goods[g], { role: 'produce', rate: 0.3 * (e.size || 1), baseRate: 0.3 * (e.size || 1) });
    }
  } else if (m.strategy === 'factory') {
    m.extraRecipes = [...prop.extras];
    for (const id of prop.extras) {
      const r = RECIPES[id];
      for (const [g, n] of Object.entries(r.in)) if (!m.goods[g]) m.goods[g] = { role: 'consume', rate: n / r.time, cap: n * 400, baseCap: n * 400, stock: 0, mod: 1 };
      for (const [g, n] of Object.entries(r.out)) if (!m.goods[g]) m.goods[g] = { role: 'produce', rate: n / r.time, cap: n * 300, baseCap: n * 300, stock: 0, mod: 1 };
    }
  }
  // Lager: Besitz-Upgrade, bei Planeten zusätzlich das Planetenlevel
  if (e.kind === 'planet') applyLevel(e);
  else for (const s of Object.values(m.goods)) { s.baseCap ??= s.cap; s.cap = Math.round(s.baseCap * m.storageMul); }
  m.rev = (m.rev || 0) + 1; // Struktur geändert -> Clients bekommen den ganzen Markt neu
}

/**
 * Besitz aufgeben: Markt wieder als NPC-Markt (Drift, Nachfrage-Schwankung), Besitz-Upgrades wirken nicht mehr.
 * Zusatzwaren bleiben als Lagerplätze erhalten, eigene Schiffe im Werftbestand und ein laufender Bau verfallen.
 */
export function releaseMarket(game, e) {
  const m = e.market;
  for (const k of ['owner', 'mode', 'customs', 'extraRecipes', 'xprog', 'yardSale']) delete m[k];
  m.storageMul = 1; m.boost = 1; m.yieldBoost = 1;
  delete e.ownerName;
  delete e.ownerColor;
  if (m.forSale) { m.forSale = m.forSale.filter((it) => !it.own); m.building = null; }
  if (e.kind === 'planet') applyLevel(e);
  else for (const s of Object.values(m.goods)) { s.baseCap ??= s.cap; s.cap = s.baseCap; s.stock = Math.min(s.stock, s.cap); }
  m.rev = (m.rev || 0) + 1;
}

/** Buchung in der Besitzstatistik (inc = Einnahmen, exp = Ausgaben). Erlöse von Konsortiumsbesitz kommen stündlich ins Log. */
export function propBook(game, prop, field, n) {
  if (!n) return;
  prop.tot[field] = (prop.tot[field] || 0) + n;
  addToBuckets(prop.stats, game.time, field, n);
  if (field === 'inc' && isConsortiumOwner(prop.player)) { const c = game.accountOf(prop.player); if (c) bookRevenue(game, c, prop.entity, n); }
}

/** Darf ein Fremder hier handeln? */
export function strangerBlocked(prop) {
  return prop?.mode === 'private' ? 'Privater Handel: nur für den Besitzer.' : null;
}

/** NPC-Versorger holt Ware aus Spielerbesitz: Besitzer bekommt den Erlös */
export function sellToSupplier(game, e, prop, good, n) {
  const owner = game.accountOf(prop.player);
  const slot = e.market.goods[good];
  let money = 0;
  for (let i = 0; i < n; i++) { money += buyPrice(good, slot); slot.stock -= 1; }
  if (owner) owner.credits += money;
  propBook(game, prop, 'inc', money);
  recordInventoryTrade(game,game.players.get(prop.player),good,'sell',n,money);
}
