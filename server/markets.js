import { GOODS, PLANET_TYPES, STATION_TYPES, STATION_FOOD, SHIP_TYPES, SHIPYARD, STORAGE, STATS, TRADER, ULTRA,
  slotPrice, selfUse } from '../shared/config.js';

/**
 * Märkte nach Rollen- und Strategie-Modell.
 * - Jede Ware eines Marktes hat eine Rolle: produce (verkauft), consume (kauft), trade (Händler: kauft und verkauft, nur Puffer).
 * - Jede Ware hat einen festen Standort-Modifier `mod` (wird bei der Sektorgenerierung gesetzt).
 * - Das Verhalten pro Tick steckt in einer Strategie, nicht in Verzweigungen nach kind/type.
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
    goods[g] = slot('trade', 0, Math.max(20, cap), Math.max(20, cap) * (0.3 + 0.4 * r()));
  }
}

/**
 * Erzeugt den Markt einer Station oder eines Planeten. `r` ist ein Zufallsgenerator (0..1).
 * scale: Größenfaktor (Planeten), opts.slow: Langsam-Modifier (Raten und Lager, Startsystem), opts.traders: Händler-Waren ergänzen
 */
export function createMarket(kind, type, r, scale = 1, { slow = 1, traders = true } = {}) {
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
    for (const g of def.buys) goods[g] = slot('consume', 0, STORAGE.SHIPYARD, 20 * r());
    return { strategy: 'shipyard', goods, eff: 1, forSale: [], building: null, nextBuild: Math.floor(r() * SHIPYARD.BUILD_ORDER.length) };
  } else if (type === 'hub') {
    // Hub: verkauft Schiffstreibstoff, kauft alle ultraseltenen Waren, handelt eine breite Auswahl
    produce('shipfuel', 1.2, STORAGE.HUB_FUEL);
    for (const g of ULTRA) consume(g, 0.02 * (300 / GOODS[g].base), STORAGE.ULTRA_HUB);
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

// ---------- Strategien ----------
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
      const { in: inp, out, time } = STATION_TYPES[m.recipe].recipe;
      const food = m.goods.food;
      let mult = 1;
      if (!inp.food) {
        if (food.stock > 0) consumeSlot(m, now, 'food', food, STATION_FOOD * (m.speed || 1) * dt);
        else mult = 0.5; // ohne Verpflegung halbe Geschwindigkeit
      }
      const ready = () => Object.entries(inp).every(([g, n]) => m.goods[g].stock >= n)
        && Object.entries(out).every(([g, n]) => m.goods[g].stock + n <= m.goods[g].cap);
      const canRun = ready();
      m.eff = canRun ? mult : 0;
      if (!canRun) return;
      m.progress += (dt * mult * (m.speed || 1) * (m.boost || 1)) / time;
      while (m.progress >= 1) {
        m.progress -= 1;
        for (const [g, n] of Object.entries(inp)) { m.goods[g].stock -= n; stat(m, now, 'c', g, n); }
        for (const [g, n] of Object.entries(out)) {
          const k = n * (m.yieldBoost || 1);
          m.goods[g].stock = Math.min(m.goods[g].cap, m.goods[g].stock + k);
          stat(m, now, 'p', g, k);
        }
        stat(m, now, 'n', null, 1);
        if (!ready()) { m.progress = 0; break; }
      }
    },
    /** Fehlender Rezept-Rohstoff mit dem geringsten Füllstand, sonst fehlende Verpflegung, sonst null */
    missingInput(m) {
      let best = null, bestRatio = Infinity;
      for (const [g, n] of Object.entries(STATION_TYPES[m.recipe].recipe.in)) {
        const s = m.goods[g];
        if (s.stock >= n) continue; // reicht noch für einen Zyklus
        const ratio = s.stock / s.cap;
        if (ratio < bestRatio) { bestRatio = ratio; best = g; }
      }
      if (!best && m.goods.food && m.goods.food.stock < 1) return 'food';
      return best;
    },
  },

  consumer: {
    tick(e, m, dt, now) {
      const cons = Object.entries(m.goods).filter(([, s]) => s.role === 'consume');
      for (const [g, s] of cons) consumeSlot(m, now, g, s, s.rate * dt);
      m.eff = cons.every(([, s]) => s.stock > 0) ? 1 : 0.5;
    },
  },

  extractor: {
    tick(e, m, dt, now) {
      const food = m.goods.food;
      const mult = food.stock > 0 ? 1 : 0.5;
      if (food.stock > 0) consumeSlot(m, now, 'food', food, STATION_FOOD * dt);
      for (const [g, s] of Object.entries(m.goods)) if (s.role === 'produce') produceSlot(m, now, g, s, s.rate * mult * dt);
      m.eff = mult;
    },
    missingInput: (m) => (m.goods.food.stock < 1 ? 'food' : null),
  },

  hub: {
    tick(e, m, dt, now) {
      for (const [g, s] of Object.entries(m.goods)) {
        if (s.role === 'produce') produceSlot(m, now, g, s, s.rate * dt);
        else if (s.role === 'consume') consumeSlot(m, now, g, s, s.rate * dt);
      }
    },
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
  // Eigenverbrauch über 80 % Füllstand, für alle Rollen (nicht bei Spielerbesitz)
  if (!m.owner) {
    for (const [g, s] of Object.entries(m.goods)) {
      const k = selfUse(s.stock, s.cap, dt);
      if (k > 0) consumeSlot(m, now, g, s, k);
    }
  }
  // Preisverlauf: letzter Mittelpreis je 5-Minuten-Block (für Sparklines)
  const cur = bucketFor(m, now);
  for (const [g, s] of Object.entries(m.goods)) cur.pr[g] = Math.round(slotPrice(g, s) * 10) / 10;
}

export function missingInput(m) {
  return STRATEGIES[m.strategy].missingInput?.(m) ?? null;
}
