import { RECIPES, PLANET_TYPES, PROP_UPGRADES, FIXED, SHIP_TYPES, buyPrice, sellPrice,
  priceWindow, fixedPrice, fixedConsumptionPerHour, fixedRref } from '../shared/config.js';
import { stat } from './markets.js';
import { addToBuckets } from './stats.js';

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
  const p = game.players.get(prop.player);
  m.owner = prop.player;
  m.mode = prop.mode;
  m.customs = prop.customs || 0;
  e.ownerName = p?.faction?.name || p?.name || '?';
  e.ownerColor = p?.faction?.color || p?.color || null;
  const u = prop.upg || {};
  for (const s of Object.values(m.goods)) {
    s.baseCap ??= s.cap;
    s.cap = Math.round(s.baseCap * (1 + PROP_UPGRADES.storage.per * (u.storage || 0)));
  }
  m.boost = 1 + PROP_UPGRADES.speed.per * (u.speed || 0);
  m.yieldBoost = 1 + PROP_UPGRADES.yield.per * (u.yield || 0);
  // Zusatzproduktion
  if (e.kind === 'planet') {
    for (const g of prop.extras) {
      if (!m.goods[g]) m.goods[g] = { role: 'produce', rate: 0.3 * (e.size || 1), cap: 600, baseCap: 600, stock: 0, mod: 1 };
      else if (m.goods[g].role !== 'produce') Object.assign(m.goods[g], { role: 'produce', rate: 0.3 * (e.size || 1) });
    }
  } else if (m.strategy === 'factory') {
    m.extraRecipes = [...prop.extras];
    for (const id of prop.extras) {
      const r = RECIPES[id];
      for (const [g, n] of Object.entries(r.in)) if (!m.goods[g]) m.goods[g] = { role: 'consume', rate: n / r.time, cap: n * 400, baseCap: n * 400, stock: 0, mod: 1 };
      for (const [g, n] of Object.entries(r.out)) if (!m.goods[g]) m.goods[g] = { role: 'produce', rate: n / r.time, cap: n * 300, baseCap: n * 300, stock: 0, mod: 1 };
    }
  }
  m.rev = (m.rev || 0) + 1; // Struktur geändert -> Clients bekommen den ganzen Markt neu
}

/** Buchung in der Besitzstatistik (inc = Einnahmen, exp = Ausgaben) */
export function propBook(game, prop, field, n) {
  if (!n) return;
  prop.tot[field] = (prop.tot[field] || 0) + n;
  addToBuckets(prop.stats, game.time, field, n);
}

/** Fixpreis-Verbrauch eigener Planeten: Verbrauch aus dem Lager, der Planet zahlt an den Besitzer */
export function tickOwnedPlanet(game, e, prop, dt) {
  const m = e.market;
  const owner = game.players.get(prop.player);
  if (!owner) return;
  const def = PLANET_TYPES[e.type];
  for (const [g, s] of Object.entries(m.goods)) {
    if (s.role !== 'consume') continue;
    const baseRate = (def.consume[g] || s.rate) * (e.size || 1);
    const sv = prop.fixed[g] ?? FIXED.DEFAULT;
    const { pmin, pmax } = priceWindow(g, s.mod || 1);
    const perSec = fixedConsumptionPerHour(fixedRref(baseRate, pmin, pmax), sv, pmin, pmax) / 3600;
    const n = Math.min(s.stock, perSec * dt);
    if (n <= 0) continue;
    s.stock -= n;
    const money = n * fixedPrice(pmin, pmax, sv);
    owner.credits += money;
    propBook(game, prop, 'inc', money);
    stat(m, game.time, 'c', g, n);
  }
}

/** Darf ein Fremder hier handeln? */
export function strangerBlocked(prop) {
  return prop?.mode === 'private' ? 'Privater Handel: nur für den Besitzer.' : null;
}

/**
 * Lieferung eines NPC-Versorgers an einen Spielerbesitz: Der Besitzer zahlt den Marktpreis.
 * Bei leerem Konto oder aktivem Stop-Loss nimmt der Markt nichts an. Liefert die angenommene Menge.
 */
export function payForDelivery(game, e, prop, good, n) {
  const owner = game.players.get(prop.player);
  const slot = e.market.goods[good];
  if (!owner || !slot) return 0;
  const floor = owner.stopLoss || 0;
  let k = 0, cost = 0;
  while (k < n) {
    const pr = sellPrice(good, slot);
    if (owner.credits - pr < floor || owner.credits < pr) break;
    owner.credits -= pr; cost += pr; slot.stock += 1; k++;
  }
  propBook(game, prop, 'exp', cost);
  return k;
}

/** NPC-Versorger holt Ware aus Spielerbesitz: Besitzer bekommt den Erlös */
export function sellToSupplier(game, e, prop, good, n) {
  const owner = game.players.get(prop.player);
  const slot = e.market.goods[good];
  let money = 0;
  for (let i = 0; i < n; i++) { money += buyPrice(good, slot); slot.stock -= 1; }
  if (owner) owner.credits += money;
  propBook(game, prop, 'inc', money);
}

/** Werftklassen eigener Werften: normale Werft S (+M mit Zusatzproduktion), große Werft bis L (+XL) */
export function yardClasses(e, prop) {
  const x = prop.upg?.extra || 0;
  if (e.type === 'bigyard') return x > 0 ? ['S', 'M', 'L', 'XL'] : ['S', 'M', 'L'];
  return x > 0 ? ['S', 'M'] : ['S'];
}
export const buildableTypes = (e, prop) => Object.entries(SHIP_TYPES).filter(([, d]) => !d.npc && d.cls !== 'F' && yardClasses(e, prop).includes(d.cls)).map(([t]) => t);

