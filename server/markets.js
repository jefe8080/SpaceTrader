import { GOODS, PLANET_TYPES, STATION_TYPES, RECIPES, STATION_FOOD, SHIP_TYPES, SHIPYARD, STORAGE, STATS, TRADER, ULTRA, MODULES, YARD_MARGIN,
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
    goods[g] = slot('trade', 0, Math.max(20, cap), Math.max(20, cap) * (0.2 + 0.3 * r()));
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
      const boost = (m.boost || 1) * (m.yieldBoost || 1);
      for (const [g, s] of slots) {
        if (s.role === 'produce') produceSlot(m, now, g, s, s.rate * m.eff * boost * dt);
        else if (s.role === 'consume' && !m.owner) consumeSlot(m, now, g, s, s.rate * dt); // Spielerbesitz: Fixpreis-Verbrauch
      }
    },
  },

  factory: {
    tick(e, m, dt, now) {
      // Zusatzproduktion (Besitz-Upgrade): weitere Rezepte laufen parallel
      for (const id of m.extraRecipes || []) {
        m.xprog ||= {};
        m.xprog[id] = runRecipe(m, RECIPES[id], (m.xprog[id] || 0), dt, now);
      }
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
      const cons = Object.entries(m.goods).filter(([, s]) => s.role === 'consume' && s.rate > 0);
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

  /** Fraktionswerft: Fraktionsschiff dauerhaft im Angebot, nimmt die Schiffswährung an */
  factionyard: {
    tick(e, m, dt, now) {
      for (const [g, s] of Object.entries(m.goods)) if (s.role === 'consume') consumeSlot(m, now, g, s, s.rate * dt);
    },
  },

  hub: {
    tick(e, m, dt, now) {
      for (const [g, s] of Object.entries(m.goods)) {
        if (s.role === 'produce') produceSlot(m, now, g, s, s.rate * dt);
        else if (s.role === 'consume') consumeSlot(m, now, g, s, s.rate * dt);
      }
    },
  },

  /**
   * NPC-Werft: baut selbstständig aus angelieferten Materialien, max. 3 Schiffe im Angebot.
   * Verkaufspreis = Materialkosten (Basispreis × Standort-Modifier) plus Marge.
   */
  shipyard: {
    /** Fehlendes Material für den nächsten Bau (NPC-Werften schicken Versorger) */
    missingInput(m) {
      if (m.owner || m.building || m.forSale.length >= SHIPYARD.MAX_FOR_SALE) return null;
      const order = SHIPYARD.ORDER[m.yard || 'shipyard'];
      const req = SHIP_TYPES[order[(m.nextBuild || 0) % order.length]].build;
      let best = null, bestRatio = Infinity;
      for (const [g, n] of Object.entries(req)) {
        const have = m.goods[g]?.stock || 0;
        if (have >= n) continue;
        if (have / n < bestRatio) { bestRatio = have / n; best = g; }
      }
      return best;
    },
    tick(e, m, dt, now) {
      if (m.owner) {
        // Spielerwerft: baut nur auf Befehl, fertige Schiffe kommen in den Werftbestand
        if (m.building) {
          m.building.remaining -= dt;
          if (m.building.remaining <= 0) {
            m.forSale.push({ type: m.building.type, price: SHIP_TYPES[m.building.type].price, own: true });
            m.building = null;
            stat(m, now, 'n', null, 1);
          }
        }
        return;
      }
      if (m.building) {
        m.building.remaining -= dt;
        if (m.building.remaining <= 0) {
          m.forSale.push({ type: m.building.type, price: m.building.price });
          m.building = null;
          stat(m, now, 'n', null, 1);
        }
        return;
      }
      if (m.forSale.length >= SHIPYARD.MAX_FOR_SALE) return;
      const order = SHIPYARD.ORDER[m.yard || 'shipyard'];
      // Reihum: Die Werft wartet bis SKIP_AFTER Sekunden auf Material für den nächsten Typ, danach darf ein
      // anderer baubarer Typ vorgezogen werden. So kommen auch größere Schiffe ins Angebot.
      m.waitSince ??= now;
      const patient = now - m.waitSince < SHIPYARD.SKIP_AFTER;
      for (let k = 0; k < (patient ? 1 : order.length); k++) {
        const type = order[(m.nextBuild + k) % order.length];
        const req = SHIP_TYPES[type].build;
        if (!Object.entries(req).every(([g, n]) => (m.goods[g]?.stock || 0) >= n)) continue;
        m.waitSince = null;
        let cost = 0;
        for (const [g, n] of Object.entries(req)) {
          m.goods[g].stock -= n;
          cost += n * GOODS[g].base * (m.goods[g].mod || 1);
          stat(m, now, 'c', g, n);
        }
        m.building = { type, remaining: SHIPYARD.BUILD_TIME[SHIP_TYPES[type].cls], price: Math.round(cost * (1 + YARD_MARGIN) / 100) * 100 };
        m.nextBuild = (m.nextBuild + k + 1) % order.length;
        return;
      }
    },
  },
};

/** Einfacher Rezeptlauf ohne Verpflegung (für Zusatzrezepte). Liefert neuen Fortschritt. */
function runRecipe(m, r, prog, dt, now) {
  const ready = () => Object.entries(r.in).every(([g, n]) => m.goods[g]?.stock >= n) && Object.entries(r.out).every(([g, n]) => m.goods[g] && m.goods[g].stock + n <= m.goods[g].cap);
  if (!ready()) return 0;
  prog += (dt * (m.boost || 1)) / r.time;
  while (prog >= 1 && ready()) {
    prog -= 1;
    for (const [g, n] of Object.entries(r.in)) { m.goods[g].stock -= n; stat(m, now, 'c', g, n); }
    for (const [g, n] of Object.entries(r.out)) { const k = n * (m.yieldBoost || 1); m.goods[g].stock = Math.min(m.goods[g].cap, m.goods[g].stock + k); stat(m, now, 'p', g, k); }
  }
  return prog;
}

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
