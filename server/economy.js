import { PLANET_TYPES, STATION_TYPES, STATION_FOOD, SHIP_TYPES, SHIPYARD, STORAGE, STATS } from '../shared/config.js';

/** Erzeugt den Markt einer Station oder eines Planeten. `r` ist ein Zufallsgenerator (0..1). */
export function createMarket(kind, type, r, scale = 1) {
  const goods = {};
  const produce = (g, rate, cap) => { goods[g] = { role: 'produce', rate, cap, stock: cap * (0.4 + 0.4 * r()) }; };
  const consume = (g, rate, cap) => { goods[g] = { role: 'consume', rate, cap, stock: cap * (0.1 + 0.35 * r()) }; };
  const capOf = (rate, { secs, min }) => Math.max(min, Math.round(rate * secs));
  const market = { goods, eff: 1, stats: [] };

  if (kind === 'planet') {
    const def = PLANET_TYPES[type];
    for (const [g, rate] of Object.entries(def.produce)) produce(g, rate * scale, capOf(rate * scale, STORAGE.PLANET_PRODUCE));
    for (const [g, rate] of Object.entries(def.consume)) consume(g, rate * scale, capOf(rate * scale, STORAGE.PLANET_CONSUME));
  } else if (kind === 'station') {
    const def = STATION_TYPES[type];
    if (def.recipe) {
      const { in: inp, out, time } = def.recipe;
      for (const [g, n] of Object.entries(inp)) consume(g, n / time, n * STORAGE.STATION_INPUT_PER_UNIT);
      for (const [g, n] of Object.entries(out)) produce(g, n / time, n * STORAGE.STATION_OUTPUT_PER_UNIT);
      consume('food', STATION_FOOD, STORAGE.STATION_FOOD);
      market.progress = 0;
      market.supply = null;
    } else if (def.consume) {
      for (const [g, rate] of Object.entries(def.consume)) consume(g, rate, capOf(rate, STORAGE.CONSUMER_STATION));
    } else if (type === 'shipyard') {
      for (const g of def.buys) goods[g] = { role: 'consume', rate: 0, cap: STORAGE.SHIPYARD, stock: 20 * r() };
      market.forSale = [];
      market.building = null;
      market.nextBuild = Math.floor(r() * SHIPYARD.BUILD_ORDER.length);
    }
  }
  return market;
}

/**
 * Statistik buchen. kind: p = produziert, c = verbraucht, i = angeliefert (Schiffe), o = abgeholt (Schiffe), n = Zyklen
 */
export function stat(m, now, kind, good, n) {
  if (!n) return;
  const b = Math.floor(now / STATS.BUCKET_SECS);
  m.stats ||= [];
  let cur = m.stats[m.stats.length - 1];
  if (!cur || cur.b !== b) {
    cur = { b, p: {}, c: {}, i: {}, o: {}, n: 0 };
    m.stats.push(cur);
    const oldest = b - STATS.BUCKETS + 1;
    while (m.stats.length && m.stats[0].b < oldest) m.stats.shift();
  }
  if (kind === 'n') cur.n += n;
  else cur[kind][good] = (cur[kind][good] || 0) + n;
}

function produceSlot(m, now, g, s, amount) {
  const before = s.stock;
  s.stock = Math.min(s.cap, s.stock + amount);
  stat(m, now, 'p', g, s.stock - before);
}
function consumeSlot(m, now, g, s, amount) {
  const before = s.stock;
  s.stock = Math.max(0, s.stock - amount);
  stat(m, now, 'c', g, before - s.stock);
}

export function tickEntity(e, dt, now) {
  const m = e.market;
  if (!m) return;
  if (e.kind === 'planet') {
    const slots = Object.entries(m.goods);
    const cons = slots.filter(([, s]) => s.role === 'consume');
    // Versorgte Planeten produzieren mehr
    const sat = cons.length ? cons.filter(([, s]) => s.stock >= 1).length / cons.length : 1;
    m.eff = 0.6 + 0.4 * sat;
    for (const [g, s] of slots) {
      if (s.role === 'produce') produceSlot(m, now, g, s, s.rate * m.eff * dt);
      else consumeSlot(m, now, g, s, s.rate * dt);
    }
    return;
  }
  const def = STATION_TYPES[e.type];
  if (def.recipe) {
    const food = m.goods.food;
    let mult = 1;
    if (food.stock > 0) consumeSlot(m, now, 'food', food, STATION_FOOD * dt);
    else mult = 0.5; // ohne Verpflegung halbe Geschwindigkeit
    const { in: inp, out, time } = def.recipe;
    const canRun = Object.entries(inp).every(([g, n]) => m.goods[g].stock >= n)
      && Object.entries(out).every(([g, n]) => m.goods[g].stock + n <= m.goods[g].cap);
    m.eff = canRun ? mult : 0;
    if (canRun) {
      m.progress += (dt * mult) / time;
      if (m.progress >= 1) {
        m.progress -= 1;
        for (const [g, n] of Object.entries(inp)) { m.goods[g].stock -= n; stat(m, now, 'c', g, n); }
        for (const [g, n] of Object.entries(out)) { m.goods[g].stock += n; stat(m, now, 'p', g, n); }
        stat(m, now, 'n', null, 1);
      }
    }
  } else if (def.consume) {
    for (const [g, s] of Object.entries(m.goods)) consumeSlot(m, now, g, s, s.rate * dt);
    m.eff = Object.values(m.goods).every((s) => s.stock > 0) ? 1 : 0.5;
  } else if (e.type === 'shipyard') {
    tickShipyard(m, dt, now);
  }
}

function tickShipyard(m, dt, now) {
  if (m.building) {
    m.building.remaining -= dt;
    if (m.building.remaining <= 0) {
      m.forSale.push({ type: m.building.type, price: SHIP_TYPES[m.building.type].price });
      m.building = null;
      m.nextBuild = (m.nextBuild + 1) % SHIPYARD.BUILD_ORDER.length;
      stat(m, now, 'n', null, 1);
    }
    return;
  }
  if (m.forSale.length >= SHIPYARD.MAX_FOR_SALE) return;
  const type = SHIPYARD.BUILD_ORDER[m.nextBuild];
  const req = SHIP_TYPES[type].build;
  if (Object.entries(req).every(([g, n]) => (m.goods[g]?.stock || 0) >= n)) {
    for (const [g, n] of Object.entries(req)) { m.goods[g].stock -= n; stat(m, now, 'c', g, n); }
    m.building = { type, remaining: SHIPYARD.BUILD_TIME };
  }
}

/** Liefert den fehlenden Rezept-Rohstoff mit dem geringsten Füllstand, oder null. */
export function missingInput(e) {
  const def = STATION_TYPES[e.type];
  if (!def?.recipe) return null;
  let best = null, bestRatio = Infinity;
  for (const [g, n] of Object.entries(def.recipe.in)) {
    const s = e.market.goods[g];
    if (s.stock >= n) continue; // reicht noch für einen Zyklus
    const ratio = s.stock / s.cap;
    if (ratio < bestRatio) { bestRatio = ratio; best = g; }
  }
  return best;
}
