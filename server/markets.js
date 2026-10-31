import { GOODS, PLANET_TYPES, STATION_TYPES, STATION_FOOD, SHIP_TYPES, SHIPYARD, STORAGE, STATS, TRADER, ULTRA, MODULES,
  ECON, LEVEL_FX, PLANET_EXTRAS, EXTRA_STEPS, slotPrice, targetOf, driftDelta,
  effectiveLevel, buildingRateMul, buildingCapMul, recipeOf } from '../shared/config.js';
import {tickRealMarket} from './real-economy.js';
import {RAW_FOR_REFINED,refinedAmountFor} from '../shared/goods.js';

/**
 * Märkte nach Rollen- und Strategie-Modell.
 * - Jede Ware eines Marktes hat eine Rolle: produce (verkauft), consume (kauft), trade (Händler: kauft und verkauft, nur Puffer).
 * - Jede Ware hat einen festen Standort-Modifier `mod` (wird bei der Sektorgenerierung gesetzt).
 * - Das Verhalten pro Tick steckt in der echten Wirtschaft (real-economy.js); Hubs halten zusätzlich ihr Gleichgewicht.
 */

const capOf = (rate, { secs, min }, slow = 1) => Math.max(Math.round(min * slow), Math.round(rate * secs));
const slot = (role, rate, cap, stock) => ({ role, rate, cap: Math.max(1, Math.round(cap)), stock, mod: 1 });
const between = (r, a, b) => a + Math.floor(r() * (b - a + 1));

/** Waren, die ein Händler führen kann: alles außer ultraselten */
const TRADABLE = Object.keys(GOODS).filter((g) => !GOODS[g].ultra);

/** Händler-Waren ergänzen (nur Waren, die der Markt noch nicht führt) */
function addTraders(goods, r, [min, max], slow = 1) {
  const n = between(r, min, max);
  const pool = TRADABLE.filter((g) => !goods[g]);
  for (let i = 0; i < n && pool.length; i++) {
    const g = pool.splice(Math.floor(r() * pool.length), 1)[0];
    // teure Waren in kleineren Mengen
    const cap = (TRADER.CAP[0] + r() * (TRADER.CAP[1] - TRADER.CAP[0])) * Math.min(1, 60 / GOODS[g].base + 0.15) * slow;
    goods[g] = slot('trade', 0, Math.max(20, cap), Math.max(20, cap) * (0.2 + 0.3 * r()));
  }
}

/** Ziel-Füllstand zufällig aus der Spanne der Rolle */
export const randomTarget = (role, r, span = ECON.TARGET) => Math.round((span[role][0] + r() * (span[role][1] - span[role][0])) * 100) / 100;

/**
 * Erzeugt den Markt einer Station oder eines Planeten. `r` ist ein Zufallsgenerator (0..1).
 * scale: Größenfaktor (Planeten), opts.slow: Langsam-Modifier (Raten und Lager, Startsystem), opts.traders: Händler-Waren ergänzen
 * Jeder Lagerplatz bekommt einen Ziel-Füllstand (Produzenten 60-70 %, Verbraucher 30-40 %, Händler 45-55 %).
 */
export function createMarket(kind, type, r, scale = 1, opts = {}) {
  const m = buildMarket(kind, type, r, scale, opts);
  for (const s of Object.values(m.goods)) s.target ??= randomTarget(s.role, r);
  return m;
}

function buildMarket(kind, type, r, scale = 1, { slow = 1, traders = true } = {}) {
  const goods = {};
  const produce = (g, rate, cap) => { goods[g] = slot('produce', rate, cap, Math.round(cap) * (0.4 + 0.4 * r())); };
  const consume = (g, rate, cap) => { goods[g] = slot('consume', rate, cap, Math.round(cap) * (0.1 + 0.35 * r())); };

  if (kind === 'planet') {
    const def = PLANET_TYPES[type];
    for (const [g, rate] of Object.entries(def.produce)) produce(g, rate * scale * slow, capOf(rate * scale, STORAGE.PLANET_PRODUCE) * slow);
    for (const [g, rate] of Object.entries(def.consume)) consume(g, rate * scale * slow, capOf(rate * scale, STORAGE.PLANET_CONSUME) * slow);
    if (traders) addTraders(goods, r, TRADER.PLANET, slow);
    return { strategy: 'planet', goods, eff: 1 };
  }
  const def = STATION_TYPES[type];
  let m;
  if (def.recipe) {
    const { in: inp, out, time } = def.recipe;
    for (const [g, n] of Object.entries(inp)) consume(g, (n / time) * slow, n * STORAGE.STATION_INPUT_PER_UNIT * slow);
    for (const [g, n] of Object.entries(out)) produce(g, (n / time) * slow, n * STORAGE.STATION_OUTPUT_PER_UNIT * slow);
    if (!goods.food) consume('food', STATION_FOOD * slow, STORAGE.STATION_FOOD * slow);
    m = { strategy: 'factory', recipe: type, goods, eff: 1, progress: 0, supply: null, speed: slow };
  } else if (def.consume) {
    for (const [g, rate] of Object.entries(def.consume)) consume(g, rate * slow, capOf(rate * slow, STORAGE.CONSUMER_STATION, slow));
    m = { strategy: 'consumer', goods, eff: 1 };
  } else if (def.extract) {
    const g = def.extract[Math.floor(r() * def.extract.length)];
    produce(g, def.rate, STORAGE.EXTRACT);
    consume('food', STATION_FOOD, STORAGE.STATION_FOOD);
    m = { strategy: 'extractor', goods, eff: 1, supply: null };
  } else if (def.buys) {
    // Werft: Lager groß genug für den teuersten Bau, große Werften bieten 1-2 Module an
    const order = SHIPYARD.ORDER[type];
    const need = {};
    for (const t of order) for (const [g, n] of Object.entries(SHIP_TYPES[t].build)) need[g] = Math.max(need[g] || 0, n);
    for (const g of new Set([...def.buys, ...Object.keys(need)])) {
      // Werftlager knapp über dem größten Bauauftrag, damit Anlieferungen den Preis spürbar senken
      const cap = Math.max(GOODS[g].base < 100 ? 300 : 60, Math.round((need[g] || 0) * 1.2));
      goods[g] = slot('consume', 0, cap, cap * (0.15 + 0.25 * r()));
    }
    const mods = [];
    if (type === 'bigyard') {
      const pool = Object.keys(MODULES);
      for (let i = 0, n = 1 + Math.floor(r() * 2); i < n; i++) mods.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    }
    return { strategy: 'shipyard', yard: type, goods, eff: 1, forSale: [], building: null, nextBuild: Math.floor(r() * order.length), modules: mods };
  } else if (def.outpost) {
    consume('food', 0.3, STORAGE.CONSUMER_STATION.min * 2);
    addTraders(goods, r, [3, 6]);
    return { strategy: 'consumer', goods, eff: 1, modules: [] };
  } else if (def.factionyard) {
    return { strategy: 'factionyard', goods, eff: 1, forSale: [] };
  } else if (type === 'hub') {
    // Hub: verkauft Schiffstreibstoff, kauft alle ultraseltenen Waren, handelt eine breite Auswahl
    produce('shipfuel', 1.2, STORAGE.HUB_FUEL);
    for (const g of ULTRA) consume(g, 0.02 * (300 / GOODS[g].base), refinedAmountFor(RAW_FOR_REFINED[g],STORAGE.ULTRA_HUB));
    addTraders(goods, r, [14, 18]);
    for (const s of Object.values(goods)) if (s.role === 'trade') { s.cap = Math.round(s.cap * 3); s.stock *= 3; }
    return { strategy: 'hub', goods, eff: 1 };
  }
  if (traders) addTraders(goods, r, TRADER.STATION, slow);
  return m;
}

// ---------- Statistik ----------
function bucketFor(m, now) {
  const b = Math.floor(now / STATS.BUCKET_SECS);
  m.stats ||= [];
  let cur = m.stats[m.stats.length - 1];
  if (!cur || cur.b !== b) {
    cur = { b, p: {}, c: {}, i: {}, o: {}, n: 0, pr: {} };
    m.stats.push(cur);
    const oldest = b - STATS.BUCKETS + 1;
    while (m.stats.length && m.stats[0].b < oldest) m.stats.shift();
  }
  return cur;
}

/**
 * Statistik buchen. kind: p = produziert, c = verbraucht, i = angeliefert (Schiffe), o = abgeholt (Schiffe), n = Zyklen
 */
export function stat(m, now, kind, good, n) {
  if (!n) return;
  if (m.homeworld && kind !== 'n') (m.homeworld.knownGoods ??= {})[good] = true;
  const cur = bucketFor(m, now);
  if (kind === 'n') cur.n += n;
  else cur[kind][good] = (cur[kind][good] || 0) + n;
}

/** Fehlende Zutaten je Strategie, knappste zuerst: Grundlage für Eilaufträge der Questgeber */
const MISSING_INPUTS = {
  /** Fehlender Rezept-Rohstoff mit dem geringsten Füllstand, sonst fehlende Verpflegung */
  factory(m) {
    let best = null, bestRatio = Infinity;
    for (const [g, n] of Object.entries(STATION_TYPES[m.recipe].recipe.in)) {
      const s = m.goods[g];
      if (s.stock >= n) continue; // reicht noch für einen Zyklus
      const ratio = s.stock / s.cap;
      if (ratio < bestRatio) { bestRatio = ratio; best = g; }
    }
    if (!best && m.goods.food && m.goods.food.stock < 1) return ['food'];
    return best ? [best] : [];
  },
  extractor: (m) => (m.goods.food.stock < 1 ? ['food'] : []),
  /** Fehlendes Material für den nächsten Bau einer NPC-Werft */
  shipyard(m) {
    if (m.owner || m.building) return [];
    if (!m.order && m.forSale.length >= SHIPYARD.MAX_FOR_SALE) return [];
    const order = SHIPYARD.ORDER[m.yard || 'shipyard'];
    const req = SHIP_TYPES[m.order ? m.order.type : order[(m.nextBuild || 0) % order.length]].build;
    return Object.keys(req).filter((g) => (m.goods[g]?.stock || 0) < req[g])
      .sort((a, b) => (m.goods[a]?.stock || 0) / req[a] - (m.goods[b]?.stock || 0) / req[b]);
  },
};

/**
 * Planetenlevel anwenden (PRD-2 10.1): Produktion und Verbrauch +10 %, Lager +15 % je Level,
 * Zusatzwaren bei Level 2, 4 und 6. Auch das Lager-Upgrade des Besitzers (m.storageMul) fließt ein.
 */
export function applyLevel(e) {
  if (e.admin || e.market?.strategy === 'factionadmin') return;
  ensureFactoryStorage(e);
  const m = e.market;
  if (e.kind !== 'planet' || !m || e.type === 'ruins' || m.realEconomy) return;
  const L = m.lvl || 0;
  EXTRA_STEPS.forEach(([lv, role], i) => {
    const g = PLANET_EXTRAS[e.type]?.[i];
    if (!g || L < lv) return;
    const s = m.goods[g];
    if (s && (s.role !== 'trade' || s.lvlExtra)) return; // nie eine Ware, die der Planet schon produziert oder verbraucht
    const rate = (LEVEL_FX.EXTRA_RATE_CR / GOODS[g].base) * (e.size || 1);
    const baseCap = capOf(rate, role === 'produce' ? STORAGE.PLANET_PRODUCE : STORAGE.PLANET_CONSUME);
    const target = randomTarget(role, Math.random);
    if (s) Object.assign(s, { role, rate, baseRate: rate, baseCap, target, lvlExtra: true });
    else m.goods[g] = { role, rate, baseRate: rate, cap: baseCap, baseCap, stock: target * baseCap, mod: 1, target, lvlExtra: true };
  });
  // Gebäude-Ausbau (PRD-3 6.3): Rate +20 % und Lager +15 % je Level der Ware, ohne Besitz höchstens Level 6 wirksam
  for (const [g, s] of Object.entries(m.goods)) {
    const b = effectiveLevel(m.bld?.lvl?.[g], !!m.owner);
    if (s.role !== 'trade') { s.baseRate ??= s.rate; s.rate = s.baseRate * (1 + LEVEL_FX.PLANET_RATE * L) * buildingRateMul(b); }
    s.baseCap ??= s.cap;
    s.cap = Math.max(1, Math.round(s.baseCap * (m.storageMul || 1) * (1 + LEVEL_FX.PLANET_STORAGE * L) * buildingCapMul(b)));
  }
  m.rev = (m.rev || 0) + 1;
}

/** Einfacher Rezeptlauf ohne Verpflegung (für Zusatzrezepte und Fabriken auf Bauplätzen). Liefert neuen Fortschritt. */
export function recipeBlockReason(m, r) {
  if (!Object.entries(r.in).every(([g,n]) => m.goods[g]?.stock >= n)) return 'Zutaten fehlen';
  if (!Object.entries(r.out).every(([g,n]) => m.goods[g] && m.goods[g].stock+n <= m.goods[g].cap)) return 'Lager voll';
  return null;
}
export function runRecipe(m, r, prog, dt, now) {
  const ready = () => !recipeBlockReason(m,r);
  if (!ready()) return 0;
  prog += (dt * (m.boost || 1)) / r.time;
  while (prog >= 1 && ready()) {
    prog -= 1;
    for (const [g, n] of Object.entries(r.in)) { m.goods[g].stock -= n; stat(m, now, 'c', g, n); }
    for (const [g, n] of Object.entries(r.out)) { const k = n * (m.yieldBoost || 1); m.goods[g].stock = Math.min(m.goods[g].cap, m.goods[g].stock + k); stat(m, now, 'p', g, k); }
  }
  return prog;
}

// ---------- NPC-Märkte: Drift zum Ziel-Füllstand ----------
/**
 * Hub-Gleichgewicht: nominale Warenflüsse begrenzen die Drift zum Ziel-Füllstand. Ein Produzent füllt sein Lager nicht
 * schneller auf, als er produziert, ein Verbraucher leert es nicht schneller, als er verbraucht.
 */
function hubFlow(m, dt) {
  const out = {};
  for (const [g, s] of Object.entries(m.goods)) {
    if (s.role === 'produce') out[g] = s.rate * dt;
    else if (s.role === 'consume') out[g] = -s.rate * dt;
  }
  return out;
}

function driftTick(m, dt, now) {
  const flow = hubFlow(m, dt);
  for (const [g, s] of Object.entries(m.goods)) {
    const f = flow[g] || 0;
    if (f > 0) stat(m, now, 'p', g, f);
    else if (f < 0 && s.stock > 0) stat(m, now, 'c', g, -f);
    let d = driftDelta(s.stock, targetOf(s) * s.cap, dt);
    if (s.role === 'produce' && d > 0) d = Math.min(d, Math.max(0, f));
    else if (s.role === 'consume' && d < 0) d = Math.max(d, Math.min(0, f));
    s.stock = Math.max(0, Math.min(s.cap, s.stock + d));
  }
}

/** Explicit hub exception: restore historical roles even in saved real markets. */
export function tickHubEquilibrium(entity, dt, now) {
  const market=entity.market,fuel=market.goods.shipfuel;
  if(fuel){
    fuel.role='produce';fuel.rate=1.2;fuel.baseRate=1.2;
    if(!(fuel.target>=ECON.TARGET.produce[0]&&fuel.target<=ECON.TARGET.produce[1]))fuel.target=.65;
  }
  for(const [good,slot] of Object.entries(market.goods)){
    if(slot.role==='consume'&&GOODS[good].ultra){
      slot.rate=.02*(300/GOODS[good].base);slot.baseRate=slot.rate;
    }
  }
  driftTick(market,dt,now);
}

export function tickMarket(e, dt, now, game) {
  const m = e.market;
  if (!m) return;
  if (e.admin || m.strategy === 'factionadmin') return;
  tickRealMarket(game,e,dt);
  // Preisverlauf: letzter Mittelpreis je 5-Minuten-Block (für Sparklines)
  const cur = bucketFor(m, now);
  for (const [g, s] of Object.entries(m.goods)) cur.pr[g] = Math.round(slotPrice(g, s) * 10) / 10;
}

/** Waren, die einem Markt für den nächsten Zyklus fehlen, dringendste zuerst */
export function missingInputs(m) {
  return MISSING_INPUTS[m.strategy]?.(m) || [];
}
export const missingInput = (m) => missingInputs(m)[0] ?? null;

/** Shared factory slots also serve real-economy planets without creating stock. */
export function ensureFactoryStorage(e) {
  const m=e.market;
  if(e.kind!=='planet'||!m||e.type==='ruins')return;
  // Fabriken auf Bauplätzen (PRD-3 6.4): Zutaten und Produkte bekommen Lagerplätze im Planetenlager.
  // Eigene Plätze haben Rate 0, damit nur die Fabrik sie verbraucht bzw. füllt.
  for (const f of m.bld?.factories || []) {
    const r = recipeOf(f.recipe);
    for (const [g, n] of Object.entries(r.in)) if (!m.goods[g]) m.goods[g] = { role: 'consume', rate: 0, baseRate: 0, cap: n * STORAGE.STATION_INPUT_PER_UNIT, baseCap: n * STORAGE.STATION_INPUT_PER_UNIT, stock: 0, mod: 1, fac: true };
    for (const [g, n] of Object.entries(r.out)) if (!m.goods[g]) m.goods[g] = { role: 'produce', rate: 0, baseRate: 0, cap: n * STORAGE.STATION_OUTPUT_PER_UNIT, baseCap: n * STORAGE.STATION_OUTPUT_PER_UNIT, stock: 0, mod: 1, fac: true };
  }
}
