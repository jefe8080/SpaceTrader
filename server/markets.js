import { GOODS, PLANET_TYPES, STATION_TYPES, RECIPES, STATION_FOOD, SHIP_TYPES, SHIPYARD, STORAGE, STATS, TRADER, ULTRA, MODULES, YARD_MARGIN,
  ECON, SUPPLY, LEVEL_FX, PLANET_EXTRAS, EXTRA_STEPS, slotPrice, targetOf, driftDelta, giverLevel,
  effectiveLevel, buildingRateMul, buildingCapMul, recipeOf } from '../shared/config.js';
import {tickRealMarket} from './real-economy.js';
import {RAW_FOR_REFINED,refinedAmountFor} from '../shared/goods.js';

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
   * Bestellslot (PRD-2 Kapitel 12): Eine Bestellung hat Vorrang vor der Bauliste und darf als viertes Schiff ins Angebot.
   */
  shipyard: {
    /** Fehlendes Material für den nächsten Bau, knappstes zuerst (NPC-Werften schicken je Ware einen Versorger) */
    missingInputs(m) {
      if (m.owner || m.building) return [];
      if (!m.order && m.forSale.length >= SHIPYARD.MAX_FOR_SALE) return [];
      const order = SHIPYARD.ORDER[m.yard || 'shipyard'];
      const req = SHIP_TYPES[m.order ? m.order.type : order[(m.nextBuild || 0) % order.length]].build;
      return Object.keys(req).filter((g) => (m.goods[g]?.stock || 0) < req[g])
        .sort((a, b) => (m.goods[a]?.stock || 0) / req[a] - (m.goods[b]?.stock || 0) / req[b]);
    },
    tick(e, m, dt, now, game) {
      if (m.owner) {
        // Spielerwerft: baut nur auf Befehl, fertige Schiffe kommen in den Werftbestand
        if (m.building) {
          m.building.remaining -= dt;
          if (m.building.remaining <= 0) {
            m.forSale.push({ type: m.building.type, price: SHIP_TYPES[m.building.type].price, own: true, ...yardBonusOf(m.building) });
            m.building = null;
            stat(m, now, 'n', null, 1);
          }
        }
        return;
      }
      if (m.building) {
        m.building.remaining -= dt;
        if (m.building.remaining <= 0) {
          const item = { type: m.building.type, price: m.building.price, ...yardBonusOf(m.building) };
          const o = m.building.order;
          if (o) {
            // Bestellung fertig: Vorkaufsrecht für den Besteller
            Object.assign(item, { ordered: true, reservedFor: o.player, reservedName: o.name, reservedUntil: now + SHIPYARD.RESERVE });
            m.order = null;
            const p = game?.players.get(o.player);
            if (p) game.emit('notice', p, `${e.name}: Deine Bestellung ${SHIP_TYPES[item.type].name} ist fertig (${SHIPYARD.RESERVE / 60} min für dich reserviert).`);
          }
          m.forSale.push(item);
          m.building = null;
          stat(m, now, 'n', null, 1);
        }
        return;
      }
      if (m.order) {
        // Bestellung hat Vorrang: warten, bis das Material da ist
        if (canBuild(m, m.order.type)) startBuild(m, m.order.type, now, m.order);
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
        if (!canBuild(m, type)) continue;
        m.waitSince = null;
        startBuild(m, type, now);
        m.nextBuild = (m.nextBuild + k + 1) % order.length;
        return;
      }
      // Nichts baubar und Geduld vorbei: nächsten Typ anpeilen, damit Versorger dessen Material holen
      if (!patient) {
        m.nextBuild = (m.nextBuild + 1) % order.length;
        m.waitSince = now;
      }
    },
  },
};

const canBuild = (m, type) => Object.entries(SHIP_TYPES[type].build).every(([g, n]) => (m.goods[g]?.stock || 0) >= n);
/** Bau beginnen: Material verbrauchen, Preis = Materialkosten + Marge, Werftbonus nach aktuellem Level */
function startBuild(m, type, now, order = null) {
  let cost = 0;
  for (const [g, n] of Object.entries(SHIP_TYPES[type].build)) {
    m.goods[g].stock -= n;
    cost += n * GOODS[g].base * (m.goods[g].mod || 1);
    stat(m, now, 'c', g, n);
  }
  const lvl = giverLevel(m.qxp);
  m.building = { type, remaining: SHIPYARD.BUILD_TIME[SHIP_TYPES[type].cls], price: Math.round(cost * (1 + YARD_MARGIN) / 100) * 100,
    bonus: lvl * LEVEL_FX.YARD_BONUS, yardLvl: lvl, ...(order ? { order } : {}) };
}

/** Werftbonus eines Baus für das Angebot (nur wenn vorhanden) */
const yardBonusOf = (b) => (b.bonus ? { bonus: b.bonus, yardLvl: b.yardLvl } : {});

/**
 * Planetenlevel anwenden (PRD-2 10.1): Produktion und Verbrauch +10 %, Lager +15 % je Level,
 * Zusatzwaren bei Level 2, 4 und 6. Auch das Lager-Upgrade des Besitzers (m.storageMul) fließt ein.
 */
export function applyLevel(e) {
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
  // Fabriken auf Bauplätzen (PRD-3 6.4): Zutaten und Produkte bekommen Lagerplätze im Planetenlager.
  // Eigene Plätze haben Rate 0, damit nur die Fabrik sie verbraucht bzw. füllt.
  for (const f of m.bld?.factories || []) {
    const r = recipeOf(f.recipe);
    for (const [g, n] of Object.entries(r.in)) if (!m.goods[g]) m.goods[g] = { role: 'consume', rate: 0, baseRate: 0, cap: n * STORAGE.STATION_INPUT_PER_UNIT, baseCap: n * STORAGE.STATION_INPUT_PER_UNIT, stock: 0, mod: 1, fac: true };
    for (const [g, n] of Object.entries(r.out)) if (!m.goods[g]) m.goods[g] = { role: 'produce', rate: 0, baseRate: 0, cap: n * STORAGE.STATION_OUTPUT_PER_UNIT, baseCap: n * STORAGE.STATION_OUTPUT_PER_UNIT, stock: 0, mod: 1, fac: true };
  }
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
export function runRecipe(m, r, prog, dt, now) {
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

// ---------- NPC-Märkte: Drift zum Ziel-Füllstand ----------
/**
 * Nominale Warenflüsse eines NPC-Marktes in dt Sekunden (+ Produktion, − Verbrauch).
 * Sie bestimmen Statistik und Effizienz und begrenzen die Drift: Ein Produzent füllt sein Lager nicht schneller auf,
 * als er produziert, ein Verbraucher leert es nicht schneller, als er verbraucht. In die Gegenrichtung wirkt die
 * Drift unbegrenzt (abstrakter Hintergrundhandel).
 */
const NOMINAL = {
  planet(m, dt) {
    const cons = Object.values(m.goods).filter((s) => s.role === 'consume');
    const sat = cons.length ? cons.filter((s) => s.stock >= 1).length / cons.length : 1;
    m.eff = 0.6 + 0.4 * sat;
    const out = {};
    for (const [g, s] of Object.entries(m.goods)) {
      if (s.role === 'produce') out[g] = s.rate * m.eff * dt;
      else if (s.role === 'consume') out[g] = -s.rate * dt;
    }
    return out;
  },
  factory(m, dt, now) {
    const { in: inp, out, time } = STATION_TYPES[m.recipe].recipe;
    const food = m.goods.food;
    const mult = inp.food || food.stock > 0 ? 1 : 0.5;
    const canRun = Object.keys(inp).every((g) => m.goods[g].stock >= 1) && Object.keys(out).every((g) => m.goods[g].stock < m.goods[g].cap);
    m.eff = canRun ? mult : 0;
    const flow = {};
    if (!inp.food) flow.food = -STATION_FOOD * (m.speed || 1) * dt;
    if (!canRun) return flow;
    const cycles = (dt * mult * (m.speed || 1)) / time;
    m.progress = (m.progress || 0) + cycles;
    const whole = Math.floor(m.progress);
    m.progress -= whole;
    stat(m, now, 'n', null, whole);
    for (const [g, n] of Object.entries(inp)) flow[g] = (flow[g] || 0) - n * cycles;
    for (const [g, n] of Object.entries(out)) flow[g] = (flow[g] || 0) + n * cycles;
    return flow;
  },
  consumer(m, dt) {
    const out = {};
    let ok = true;
    for (const [g, s] of Object.entries(m.goods)) {
      if (s.role !== 'consume' || !(s.rate > 0)) continue;
      out[g] = -s.rate * dt;
      if (s.stock <= 0) ok = false;
    }
    m.eff = ok ? 1 : 0.5;
    return out;
  },
  extractor(m, dt) {
    const mult = m.goods.food.stock > 0 ? 1 : 0.5;
    m.eff = mult;
    const out = { food: -STATION_FOOD * dt };
    for (const [g, s] of Object.entries(m.goods)) if (s.role === 'produce') out[g] = s.rate * mult * dt;
    return out;
  },
  hub(m, dt) {
    const out = {};
    for (const [g, s] of Object.entries(m.goods)) {
      if (s.role === 'produce') out[g] = s.rate * dt;
      else if (s.role === 'consume') out[g] = -s.rate * dt;
    }
    return out;
  },
  factionyard(m, dt) {
    const out = {};
    for (const [g, s] of Object.entries(m.goods)) if (s.role === 'consume') out[g] = -s.rate * dt;
    return out;
  },
};
/** Strategien mit Drift (Werften bauen aus echtem Material und haben keine Drift) */
export const DRIFTING = new Set(Object.keys(NOMINAL));
export const drifts = (m) => !m.realEconomy && !m.owner && DRIFTING.has(m.strategy);

/** Nachfrage-Schwankung: Ziel-Füllstand eines Planeten springt je Ware alle 2 bis 6 h */
function swing(m, now) {
  const [a, b] = ECON.SWING_EVERY;
  for (const s of Object.values(m.goods)) {
    if (s.swingAt === undefined) { s.swingAt = now + a + Math.random() * (b - a); continue; }
    if (now < s.swingAt) continue;
    s.target = randomTarget(s.role, Math.random, ECON.SWING);
    s.swingAt = now + a + Math.random() * (b - a);
  }
}

function npcTick(e, m, dt, now) {
  if (m.strategy === 'planet') swing(m, now);
  const flow = NOMINAL[m.strategy](m, dt, now);
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
  npcTick(entity,market,dt,now);
}

export function tickMarket(e, dt, now, game) {
  const m = e.market;
  if (!m) return;
  if(m.realEconomy&&game)tickRealMarket(game,e,dt);
  else if (drifts(m)) npcTick(e, m, dt, now);
  else STRATEGIES[m.strategy].tick(e, m, dt, now, game);
  // Preisverlauf: letzter Mittelpreis je 5-Minuten-Block (für Sparklines)
  const cur = bucketFor(m, now);
  for (const [g, s] of Object.entries(m.goods)) cur.pr[g] = Math.round(slotPrice(g, s) * 10) / 10;
}

/**
 * Waren, für die eine Station Versorger losschickt, dringendste zuerst.
 * NPC-Märkte mit Drift: Zutaten deutlich unter dem Ziel-Füllstand. Sonst die Regel der Strategie (fehlt für einen Zyklus).
 */
export function missingInputs(m) {
  if (drifts(m)) {
    if (m.strategy !== 'factory' && m.strategy !== 'extractor') return [];
    const ins = m.strategy === 'factory' ? { ...STATION_TYPES[m.recipe].recipe.in, food: 1 } : { food: 1 };
    return Object.keys(ins).filter((g) => m.goods[g] && m.goods[g].stock / m.goods[g].cap < targetOf(m.goods[g]) - SUPPLY.MARGIN)
      .sort((a, b) => m.goods[a].stock / m.goods[a].cap - m.goods[b].stock / m.goods[b].cap);
  }
  const S = STRATEGIES[m.strategy];
  if (S.missingInputs) return S.missingInputs(m);
  const g = S.missingInput?.(m);
  return g ? [g] : [];
}
export const missingInput = (m) => missingInputs(m)[0] ?? null;
