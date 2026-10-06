import { PLANET_TYPES, STATION_TYPES, STATION_FOOD, SHIP_TYPES, SHIPYARD, STORAGE, STATS, unitPrice } from '../shared/config.js';

/**
 * Märkte nach Rollen- und Strategie-Modell.
 * - Jede Ware eines Marktes hat eine Rolle: produce (verkauft), consume (kauft), trade (kauft und verkauft).
 * - Das Verhalten pro Tick steckt in einer Strategie (planet, factory, consumer, shipyard), nicht in Verzweigungen nach kind/type.
 */

const capOf = (rate, { secs, min }, slow = 1) => Math.max(Math.round(min * slow), Math.round(rate * secs));

function slot(role, rate, cap, stock) {
  return { role, rate, cap, stock };
}

/**
 * Erzeugt den Markt einer Station oder eines Planeten. `r` ist ein Zufallsgenerator (0..1).
 * scale: Größenfaktor (Planeten), opts.slow: Langsam-Modifier (Raten und Lager, Startsystem)
 */
export function createMarket(kind, type, r, scale = 1, { slow = 1 } = {}) {
  const goods = {};
  const produce = (g, rate, cap) => { goods[g] = slot('produce', rate, cap, cap * (0.4 + 0.4 * r())); };
  const consume = (g, rate, cap) => { goods[g] = slot('consume', rate, cap, cap * (0.1 + 0.35 * r())); };

  if (kind === 'planet') {
    const def = PLANET_TYPES[type];
    for (const [g, rate] of Object.entries(def.produce)) produce(g, rate * scale, capOf(rate * scale, STORAGE.PLANET_PRODUCE, slow));
    for (const [g, rate] of Object.entries(def.consume)) consume(g, rate * scale, capOf(rate * scale, STORAGE.PLANET_CONSUME, slow));
    return { strategy: 'planet', goods, eff: 1 };
  }
  const def = STATION_TYPES[type];
  if (def.recipe) {
    const { in: inp, out, time } = def.recipe;
    for (const [g, n] of Object.entries(inp)) consume(g, (n / time) * slow, Math.round(n * STORAGE.STATION_INPUT_PER_UNIT * slow));
    for (const [g, n] of Object.entries(out)) produce(g, (n / time) * slow, Math.round(n * STORAGE.STATION_OUTPUT_PER_UNIT * slow));
    consume('food', STATION_FOOD * slow, Math.round(STORAGE.STATION_FOOD * slow));
    return { strategy: 'factory', recipe: type, goods, eff: 1, progress: 0, supply: null, speed: slow };
  }
  if (def.consume) {
    for (const [g, rate] of Object.entries(def.consume)) consume(g, rate * slow, capOf(rate * slow, STORAGE.CONSUMER_STATION, slow));
    return { strategy: 'consumer', goods, eff: 1 };
  }
  if (def.trades) {
    // Hub: Händler mit großem Puffer-Lager
    for (const g of def.trades) goods[g] = slot('trade', 0, STORAGE.HUB, STORAGE.HUB * (0.35 + 0.3 * r()));
    return { strategy: 'hub', goods, eff: 1 };
  }
  for (const g of def.buys) goods[g] = slot('consume', 0, STORAGE.SHIPYARD, 20 * r());
  return { strategy: 'shipyard', goods, eff: 1, forSale: [], building: null, nextBuild: Math.floor(r() * SHIPYARD.BUILD_ORDER.length) };
}

/**
 * Statistik buchen. kind: p = produziert, c = verbraucht, i = angeliefert (Schiffe), o = abgeholt (Schiffe), n = Zyklen
 */
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

export function stat(m, now, kind, good, n) {
  if (!n) return;
  const cur = bucketFor(m, now);
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

export const STRATEGIES = {
  planet: {
    tick(e, m, dt, now) {
      const slots = Object.entries(m.goods);
      const cons = slots.filter(([, s]) => s.role === 'consume');
      // Versorgte Planeten produzieren mehr
      const sat = cons.length ? cons.filter(([, s]) => s.stock >= 1).length / cons.length : 1;
      m.eff = 0.6 + 0.4 * sat;
      for (const [g, s] of slots) {
        if (s.role === 'produce') produceSlot(m, now, g, s, s.rate * m.eff * dt);
        else if (s.role === 'consume') consumeSlot(m, now, g, s, s.rate * dt);
      }
    },
  },

  factory: {
    tick(e, m, dt, now) {
      const food = m.goods.food;
      let mult = 1;
      if (food.stock > 0) consumeSlot(m, now, 'food', food, STATION_FOOD * (m.speed || 1) * dt);
      else mult = 0.5; // ohne Verpflegung halbe Geschwindigkeit
      const { in: inp, out, time } = STATION_TYPES[m.recipe].recipe;
      const canRun = Object.entries(inp).every(([g, n]) => m.goods[g].stock >= n)
        && Object.entries(out).every(([g, n]) => m.goods[g].stock + n <= m.goods[g].cap);
      m.eff = canRun ? mult : 0;
      if (!canRun) return;
      m.progress += (dt * mult * (m.speed || 1)) / time;
      if (m.progress >= 1) {
        m.progress -= 1;
        for (const [g, n] of Object.entries(inp)) { m.goods[g].stock -= n; stat(m, now, 'c', g, n); }
        for (const [g, n] of Object.entries(out)) { m.goods[g].stock += n; stat(m, now, 'p', g, n); }
        stat(m, now, 'n', null, 1);
      }
    },
    /** Liefert den fehlenden Rezept-Rohstoff mit dem geringsten Füllstand, oder null. */
    missingInput(m) {
      let best = null, bestRatio = Infinity;
      for (const [g, n] of Object.entries(STATION_TYPES[m.recipe].recipe.in)) {
        const s = m.goods[g];
        if (s.stock >= n) continue; // reicht noch für einen Zyklus
        const ratio = s.stock / s.cap;
        if (ratio < bestRatio) { bestRatio = ratio; best = g; }
      }
      return best;
    },
  },

  consumer: {
    tick(e, m, dt, now) {
      for (const [g, s] of Object.entries(m.goods)) consumeSlot(m, now, g, s, s.rate * dt);
      m.eff = Object.values(m.goods).every((s) => s.stock > 0) ? 1 : 0.5;
    },
  },

  hub: {
    tick() {},
  },

  shipyard: {
    tick(e, m, dt, now) {
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
    },
  },
};

export function tickMarket(e, dt, now, game) {
  const m = e.market;
  if (!m) return;
  STRATEGIES[m.strategy].tick(e, m, dt, now, game);
  // Preisverlauf: letzter Mittelpreis je 5-Minuten-Block (für Sparklines)
  const cur = bucketFor(m, now);
  cur.pr ||= {};
  for (const [g, s] of Object.entries(m.goods)) cur.pr[g] = Math.round(unitPrice(g, s.stock, s.cap) * 10) / 10;
}

export function missingInput(m) {
  return STRATEGIES[m.strategy].missingInput?.(m) ?? null;
}
