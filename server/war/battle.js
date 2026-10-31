// PRD 15 U04: serverseitige Schlachtinstanzen. Eigenständige taktische 2D-Karte, genau zwei Seiten, Beitritt nur durch Anflug.
// Der Server entscheidet über Bewegung, Treffer, Schaden und Rückzug; Zuschauer und Spielerwechsel ändern nichts.
import { SHIP_TYPES } from '../../shared/config.js';
import { COMBAT, WEAPONS, blueprint, ensureDamage, navalClass, maxHull } from '../../shared/combat.js';
import { applyHit, applyArea, hitChance, systemEffect, kindFactor, systemExposed, wrap, shieldActive } from '../../shared/damage.js';
import { stackOf, stackMembers, detachShip } from './stacks.js';
import { ownerName } from './diplomacy.js';

const { W, H } = COMBAT.MAP;
const SENSOR_BASE = { craft: 900, S: 1300, M: 1600, L: 1900, XL: 2300 };
const LENGTH = (type) => (SHIP_TYPES[type]?.size || 40) * 3; // taktische Schiffslänge
const PD_RANGE_CONVOY = 1.4;

export const isActive = (u) => u.state === 'fight' || u.state === 'retreating';
export const isFighting = (u) => isActive(u) && !u.protected;
const other = (side) => (side === 'A' ? 'B' : 'A');
const fxOf = (game, b) => { let l = game.battleFx.get(b.id); if (!l) game.battleFx.set(b.id, (l = [])); return l; };
const fx = (game, b, e) => { const l = fxOf(game, b); l.push({ t: Math.round(b.t * 10) / 10, ...e }); if (l.length > 120) l.splice(0, l.length - 120); };
const rnd = () => Math.random();

/** Standardhaltung je Klasse (PRD 6.2) */
export function defaultTactic(type) {
  const cls = navalClass(type);
  if (cls === 'war') return { stance: 'defensive', retreat: { hull: COMBAT.RETREAT.war, weaponsOut: true, losses: 0, systems: false } };
  if (cls === 'multi') return { stance: 'defensive', retreat: { hull: COMBAT.RETREAT.multi, weaponsOut: false, losses: 0, systems: false } };
  return { stance: 'flee', retreat: { hull: 1, weaponsOut: false, losses: 0, systems: false } };
}

/** Alle Schiffe eines Stacks kämpfen gemeinsam */
function expand(game, ships) {
  const out = new Set();
  for (const s of ships) {
    const st = stackOf(game, s);
    for (const m of st ? stackMembers(game, st) : [s]) if (!m.captive && !m.battle) out.add(m);
  }
  return [...out];
}

function sensorRange(u, ship, now) {
  const bp = blueprint(ship.type);
  return SENSOR_BASE[bp.tier] * kindFactor(u, ship, 'sensor', now) * (bp.ability === 'sensor' ? 1.6 : 1);
}

function makeUnit(game, b, ship, side, x, y, a) {
  const d = ensureDamage(ship);
  const bp = blueprint(ship.type);
  const tac = { ...defaultTactic(ship.type), ...(ship.tactic || {}) };
  if (bp.squad) d.craft = Math.max(0, d.craft);
  return {
    ship: ship.id, side, owner: ship.owner, type: ship.type, x, y, a, v: 0,
    state: 'fight', ai: true, order: null, prio: null, stance: tac.stance, retreat: { ...tac.retreat },
    shields: bp.shields.map((s) => s.max), shieldDelay: bp.shields.map(() => 0),
    cd: bp.weapons.map(() => rnd() * 1.5), ion: {}, jam: {}, fires: [], prep: 0, beam: {},
    protected: !!ship.modules?.includes('protect'), joinedAt: b.t, startX: x, startY: y,
    craftHp: bp.squad ? Array.from({ length: d.craft }, () => bp.squad.hull * Math.min(1, d.hull / Math.max(1, maxHull(ship.type)))) : null,
    lossesAtStart: 0,
  };
}

/** Kartenrand der Anflugrichtung (PRD 4.1): Richtung vom Schlachtort zum Herkunftsort */
function edgePoint(b, fromX, fromY, spread = 0) {
  const a = Math.atan2(fromY - b.y, fromX - b.x);
  const cx = W / 2, cy = H / 2;
  const k = Math.min(Math.abs((W / 2 - 150) / (Math.cos(a) || 1e-9)), Math.abs((H / 2 - 150) / (Math.sin(a) || 1e-9)));
  const px = cx + Math.cos(a) * k, py = cy + Math.sin(a) * k;
  // Mehrere Einheiten entlang des Randes auffächern
  return { x: Math.max(80, Math.min(W - 80, px - Math.sin(a) * spread)), y: Math.max(80, Math.min(H - 80, py + Math.cos(a) * spread)), a: a + Math.PI };
}

/** Aufstellung zu Schlachtbeginn: beide Seiten nahe der Begegnung entlang der Anflugachse */
function openingPoint(b, fromX, fromY, spread) {
  const a = Math.atan2(fromY - b.y, fromX - b.x) || 0;
  const r = 1100;
  return { x: W / 2 + Math.cos(a) * r - Math.sin(a) * spread, y: H / 2 + Math.sin(a) * r + Math.cos(a) * spread, a: a + Math.PI };
}

function addUnits(game, b, ships, side, fromX, fromY, opening = false) {
  ships.forEach((s, i) => {
    const spread = (i - (ships.length - 1) / 2) * 140;
    const fx0 = fromX ?? s.x, fy0 = fromY ?? s.y;
    const near = Math.hypot(fx0 - b.x, fy0 - b.y) < 1;
    const p = opening ? openingPoint(b, near ? b.x + (side === 'A' ? -1 : 1) : fx0, near ? b.y : fy0, spread) : edgePoint(b, fx0, fy0, spread);
    if (!opening && near) Object.assign(p, edgePoint(b, b.x + (side === 'A' ? -1 : 1), b.y, spread));
    b.units[s.id] = makeUnit(game, b, s, side, p.x, p.y, p.a);
    b.sides[side].owners = [...new Set([...b.sides[side].owners, s.owner])];
    s.battle = b.id;
    s.state = 'battle';
    s.nav = null;
    fx(game, b, { k: 'join', ship: s.id, side });
  });
}

/**
 * Neue Schlacht: Angreifer erreicht das Ziel auf Waffenreichweite. Beteiligte pausieren ihre Reise.
 * opts: { kind: 'battle'|'raid', planet, attackerSideMeta }
 */
export function startBattle(game, attackers, defenders, opts = {}) {
  const atk = expand(game, attackers), def = expand(game, defenders);
  if (!atk.length || (!def.length && !opts.planet)) return null;
  const anchor = def[0] || opts.planet;
  const id = 'b' + ++game.counters.battle;
  const b = {
    id, x: anchor.x, y: anchor.y, sector: game.world.sectorAt?.(anchor.x, anchor.y)?.key || null,
    started: Math.round(game.time), t: 0, kind: opts.kind || 'battle', planet: opts.planet?.id || null,
    sides: { A: { owners: [] }, B: { owners: [] } }, units: {}, projectiles: [], known: { A: {}, B: {} },
    lastHarm: 0, retreated: [], log: [], pseq: 0, ended: null, raid: opts.raid || null,
  };
  game.battles.set(id, b);
  const ax = atk[0].x, ay = atk[0].y;
  addUnits(game, b, def, 'B', b.x + (b.x - ax || 1), b.y + (b.y - ay), true);
  addUnits(game, b, atk, 'A', ax, ay, true);
  // Zivilschiffe ohne kampffähigen Geleitschutz kapitulieren beim Schlachtbeginn
  for (const u of Object.values(b.units)) civilRule(game, b, u, true);
  logBattle(game, b, `Schlacht begonnen: ${b.sides.A.owners.map((o) => ownerName(game, o)).join(', ')} gegen ${b.sides.B.owners.map((o) => ownerName(game, o)).join(', ') || 'Verteidigung'}`);
  game.emit('battleStart', b);
  return b;
}

/** Ist ein Besitzer mit einer Seite kompatibel? Keine eigenständige dritte Partei. */
export function joinSideFor(game, b, owner, targetSide) {
  const side = other(targetSide);
  if (b.sides[targetSide].owners.includes(owner)) return null;
  return side;
}

/** Verstärkung tritt am Kartenrand ihrer Anflugrichtung bei. Zurückgezogene dürfen nicht erneut beitreten. */
export function joinBattle(game, b, ships, side) {
  const list = expand(game, ships).filter((s) => !b.retreated.includes(s.id));
  if (!list.length) return 0;
  addUnits(game, b, list, side);
  for (const s of list) civilRule(game, b, b.units[s.id], true);
  logBattle(game, b, `Verstärkung für Seite ${side}: ${list.map((s) => s.name).join(', ')}`);
  return list.length;
}

export function logBattle(game, b, msg) {
  b.log.push({ t: Math.round(b.t), msg });
  if (b.log.length > 60) b.log.shift();
}

// ---------- Hilfen ----------
const shipOf = (game, u) => game.ships.get(u.ship);
const unitsOf = (b) => Object.values(b.units);
function weaponsOperational(game, b, u) {
  const ship = shipOf(game, u), bp = blueprint(ship.type);
  if (!bp.weapons.length) return false;
  if (u.protected) return false;
  if (bp.squad) return (ship.dmg.craft || 0) > 0;
  return bp.weapons.some((w, i) => w.w !== 'pd' && systemEffect(u, ship, w.sys, b.t) > 0 && (w.ammo == null || (ship.dmg.ammo[i] ?? 0) > 0));
}
/** Weiterkämpfend: aktiv, ungeschützt und entweder beweglich oder bewaffnet */
export function stillFighting(game, b, u) {
  if (!isFighting(u)) return false;
  const ship = shipOf(game, u), bp = blueprint(ship.type);
  if (bp.squad) return (ship.dmg.craft || 0) > 0;
  const hasThrust = bp.systems.some((s) => s.kind === 'thrust');
  const moving = kindFactor(u, ship, 'engine', b.t) > 0 || (hasThrust && kindFactor(u, ship, 'thrust', b.t) > 0);
  return moving || weaponsOperational(game, b, u);
}
/** Kampffähiger Geleitschutz derselben Seite */
function hasEscort(game, b, u) {
  return unitsOf(b).some((o) => o !== u && o.side === u.side && isFighting(o) && navalClass(o.type) !== 'civil' && weaponsOperational(game, b, o));
}
const hullFrac = (game, u) => { const s = shipOf(game, u); return s.dmg.hull / Math.max(1, maxHull(s.type)); };

function surrender(game, b, u, why) {
  if (!isActive(u)) return;
  u.state = 'surrendered';
  u.order = null;
  // Bereits fliegende Geschosse richten keinen Schaden mehr an (Prüfung beim Einschlag)
  fx(game, b, { k: 'surrender', ship: u.ship });
  logBattle(game, b, `${shipOf(game, u).name} kapituliert (${why})`);
}

/** Zivile Regeln: ohne Geleitschutz Kapitulation, mit Geleitschutz regulärer Rückzugsversuch */
function civilRule(game, b, u, start = false) {
  if (!u || !isActive(u) || u.protected || navalClass(u.type) !== 'civil') return;
  if (!hasEscort(game, b, u)) surrender(game, b, u, start ? 'kein Geleitschutz' : 'letzter Beschützer ausgefallen');
  else if (u.state === 'fight') beginRetreat(game, b, u, 'Flucht unter Geleitschutz');
}

export function beginRetreat(game, b, u, why) {
  if (u.state !== 'fight') return;
  u.state = 'retreating';
  u.retreatWhy = why;
  logBattle(game, b, `${shipOf(game, u).name} versucht den Rückzug (${why})`);
}

/** Rückzugs- und Kapitulationspolitik je Klasse (PRD 6.2) */
function policies(game, b, u) {
  if (!isActive(u) || u.protected) return;
  const cls = navalClass(u.type);
  const f = hullFrac(game, u);
  if (cls === 'civil') return civilRule(game, b, u);
  if (cls === 'multi' && f < COMBAT.SURRENDER_MULTI) return surrender(game, b, u, 'Rumpf unter 30 %');
  // Manuell gesteuerte Schiffe: die gespeicherte Rückzugspolitik greift erst wieder unter KI
  if (u.state !== 'fight' || !u.ai) return;
  const r = u.retreat;
  if (f < r.hull) return beginRetreat(game, b, u, 'Rumpfschwelle');
  if (r.weaponsOut && !weaponsOperational(game, b, u)) return beginRetreat(game, b, u, 'vollständiger Waffenausfall');
  if (r.systems) {
    const ship = shipOf(game, u);
    if (kindFactor(u, ship, 'engine', b.t) === 0 || kindFactor(u, ship, 'shield', b.t, 1) === 0) return beginRetreat(game, b, u, 'wesentlicher Systemausfall');
  }
  if (r.losses > 0) {
    const mine = unitsOf(b).filter((o) => o.side === u.side && o.owner === u.owner);
    const lost = mine.filter((o) => o.state === 'destroyed').length;
    if (mine.length && lost / mine.length >= r.losses) return beginRetreat(game, b, u, 'Flottenverluste');
  }
}

// ---------- Erhaltung je Takt: Schilde, Störung, Brände, Schadenskontrolle ----------
function maintain(game, b, u, dt) {
  const ship = shipOf(game, u);
  const bp = blueprint(ship.type);
  const now = b.t;
  bp.shields.forEach((sh, i) => {
    if (sh.gen && systemEffect(u, ship, sh.gen, now) === 0) { u.shields[i] = Math.min(u.shields[i], 0); return; }
    if (now < (u.shieldDelay[i] || 0)) return;
    const genF = sh.gen ? systemEffect(u, ship, sh.gen, now) : 1;
    const regen = (bp.shield?.regen || 0) * genF * (bp.ability === 'sensor' ? 1.5 : 1) * (u.prio === 'shields' ? 1.5 : u.prio ? 0.9 : 1);
    u.shields[i] = Math.min(sh.max, u.shields[i] + regen * dt);
  });
  for (const k of Object.keys(u.ion)) { u.ion[k] = Math.max(0, u.ion[k] - COMBAT.ION.DECAY * dt); if (!u.ion[k]) delete u.ion[k]; }
  for (const k of Object.keys(u.jam)) if (u.jam[k] <= now) { delete u.jam[k]; if (u.jamStart) delete u.jamStart[k]; }
  // Brände: begrenzter Rumpfschaden; Schadenskontrolle löscht und repariert beschädigte, nicht zerstörte Systeme begrenzt
  u.fires = u.fires.filter((f) => f.until > now);
  if (u.fires.length && !bp.squad) {
    ship.dmg.hull = Math.max(0, ship.dmg.hull - COMBAT.FIRE.DPS * u.fires.length * dt);
    b.lastHarm = now;
    if (ship.dmg.hull <= 0) return destroy(game, b, u, 'Brand');
  }
  if (!bp.squad) {
    u.dc = (u.dc || 0) + dt;
    if (u.fires.length && u.dc >= COMBAT.DAMAGE_CONTROL.SECS_PER_FIRE) { u.fires.shift(); u.dc = 0; }
    else {
      const prio = u.dcPrio && (ship.dmg.sys[u.dcPrio] ?? 0) > 0 ? bp.systems.find((s) => s.id === u.dcPrio) : null;
      const cand = prio || bp.systems.find((s) => { const hp = ship.dmg.sys[s.id]; return hp > 0 && hp < s.hp * 0.5; });
      if (cand) ship.dmg.sys[cand.id] = Math.min(cand.hp * 0.5, ship.dmg.sys[cand.id] + COMBAT.DAMAGE_CONTROL.RATE * dt);
    }
  }
}

function destroy(game, b, u, why) {
  if (u.state === 'destroyed') return;
  u.state = 'destroyed';
  u.v = 0;
  const ship = shipOf(game, u);
  ship.dmg.hull = 0;
  fx(game, b, { k: 'destroyed', ship: u.ship, x: Math.round(u.x), y: Math.round(u.y) });
  logBattle(game, b, `${ship.name} zerstört${why ? ' (' + why + ')' : ''}`);
}

// ---------- Sensorik: gleiche Informationen für Spieler und KI ----------
function updateKnowledge(game, b) {
  const now = b.t;
  const list = unitsOf(b).filter(isActive);
  for (const side of ['A', 'B']) {
    const eyes = list.filter((u) => u.side === side && u.state !== 'surrendered');
    const known = b.known[side];
    for (const t of unitsOf(b)) {
      if (t.side === side || t.state === 'destroyed' || t.state === 'retreated') continue;
      let best = Infinity, sens = 0, prec = 1;
      for (const e of eyes) {
        const ship = shipOf(game, e);
        const d = Math.hypot(e.x - t.x, e.y - t.y);
        const r = sensorRange(e, ship, now);
        if (d / r < best / Math.max(1, sens)) { best = d; sens = r; prec = blueprint(ship.type).ability === 'precision' ? 1.3 : 1; }
      }
      if (!sens || best > sens * COMBAT.SENSOR_DETECT) { if (known[t.ship]) known[t.ship].live = false; continue; }
      const k = (known[t.ship] ||= { sys: [], st: {} });
      Object.assign(k, { x: Math.round(t.x), y: Math.round(t.y), t: now, live: true });
      if (best <= sens * prec) {
        const ship = shipOf(game, t);
        for (const s of blueprint(ship.type).systems) {
          if (!k.sys.includes(s.id)) k.sys.push(s.id);
          k.st[s.id] = Math.round(ship.dmg.sys[s.id] ?? s.hp);
        }
      }
    }
  }
}
const detected = (b, side, t) => !!b.known[side][t.ship]?.live;

// ---------- Bewegung ----------
function mobility(game, b, u) {
  const ship = shipOf(game, u), bp = blueprint(ship.type);
  const eng = bp.squad ? 1 : kindFactor(u, ship, 'engine', b.t);
  const hasThrust = bp.systems.some((s) => s.kind === 'thrust');
  const thr = bp.squad ? 1 : hasThrust ? kindFactor(u, ship, 'thrust', b.t) : eng;
  const prio = u.prio === 'engines' ? 1.15 : u.prio ? 0.95 : 1;
  return { max: bp.tac.speed * eng * prio, accel: bp.tac.accel * eng, turn: bp.tac.turn * thr, brake: bp.tac.brake * thr, eng, thr };
}

function nearestEdge(u) {
  const c = [{ x: 0, y: u.y, d: u.x }, { x: W, y: u.y, d: W - u.x }, { x: u.x, y: 0, d: u.y }, { x: u.x, y: H, d: H - u.y }];
  return c.sort((a, b) => a.d - b.d)[0];
}
const inEdge = (u) => u.x <= COMBAT.EDGE || u.y <= COMBAT.EDGE || u.x >= W - COMBAT.EDGE || u.y >= H - COMBAT.EDGE;

function primaryRange(bp) {
  const r = bp.weapons.filter((w) => w.w !== 'pd').map((w) => WEAPONS[w.w].range);
  return r.length ? Math.max(...r) : 600;
}
const broadside = (bp) => bp.weapons.filter((w) => w.arc && Math.abs(Math.abs(w.arc) - Math.PI / 2) < 0.1).length > bp.weapons.filter((w) => w.arc === 0 && !w.turret).length;

/** KI-Ziel: dieselben Sensorinformationen wie Spieler, kein allwissendes Zielen */
function aiTarget(game, b, u) {
  const ship = shipOf(game, u), bp = blueprint(ship.type);
  const enemies = unitsOf(b).filter((t) => t.side !== u.side && isActive(t) && !t.protected && detected(b, u.side, t));
  if (!enemies.length) return null;
  const score = (t) => {
    const tb = blueprint(t.type);
    let s = Math.hypot(t.x - u.x, t.y - u.y);
    if (u.type === 'abfangstaffel') s *= tb.squad ? 0.3 : 2;
    if (u.type === 'bomberstaffel') s *= tb.squad ? 3 : 1 / (1 + (tb.hull || 0) / 2000);
    if (navalClass(t.type) === 'civil' && bp.squad === undefined) s *= 1.5;
    return s;
  };
  return enemies.sort((a, c) => score(a) - score(c))[0];
}

/** Freiliegendes, bekanntes System eines Ziels (Bomber und Systemangriffe) */
function exposedSystem(game, b, u, t, kinds = ['heavyb', 'light', 'launcher', 'shield', 'engine', 'ionb']) {
  const k = b.known[u.side][t.ship];
  if (!k) return null;
  const ts = shipOf(game, t);
  const rel = Math.atan2(u.y - t.y, u.x - t.x) - t.a;
  for (const kind of kinds) {
    const s = blueprint(ts.type).systems.find((x) => x.kind === kind && k.sys.includes(x.id) && (ts.dmg.sys[x.id] ?? 0) > 0 && systemExposed(ts, x.id, rel));
    if (s) return s.id;
  }
  return null;
}

function steer(game, b, u, dt) {
  if (!isActive(u)) { u.v = Math.max(0, u.v - 40 * dt); return; }
  const ship = shipOf(game, u), bp = blueprint(ship.type);
  const m = mobility(game, b, u);
  let goal = null, face = null;
  const order = u.ai ? null : u.order;
  if (u.state === 'retreating') {
    const e = nearestEdge(u);
    goal = { x: e.x, y: e.y };
  } else if (order?.t === 'move' || order?.t === 'defend') goal = { x: order.x, y: order.y };
  else if (order?.t === 'escort' || order?.t === 'distance' || order?.t === 'attack') {
    const t = b.units[order.target];
    if (t && isActive(t)) {
      if (order.t === 'escort') goal = { x: t.x - Math.cos(t.a) * 150, y: t.y - Math.sin(t.a) * 150 };
      else {
        const want = order.t === 'distance' ? order.d : primaryRange(bp) * 0.7;
        const a = Math.atan2(u.y - t.y, u.x - t.x);
        // Systemangriff: auf die Seite des Systems positionieren, aber nicht unbegrenzt in feindliche Verbände
        let aa = a;
        if (order.t === 'attack' && order.sys) {
          const def = blueprint(t.type).systems.find((s) => s.id === order.sys);
          if (def) aa = t.a + def.face;
        }
        const cand = { x: t.x + Math.cos(aa) * want, y: t.y + Math.sin(aa) * want };
        const crowd = unitsOf(b).filter((o) => o.side !== u.side && o !== t && isFighting(o) && Math.hypot(o.x - cand.x, o.y - cand.y) < 600).length;
        goal = crowd >= 2 && !order.evade ? { x: t.x + Math.cos(a) * want, y: t.y + Math.sin(a) * want } : cand;
        face = Math.atan2(t.y - u.y, t.x - u.x);
      }
    }
  }
  if (!goal && u.state === 'fight' && (u.ai || !order) && order?.t !== 'hold') {
    const t = aiTarget(game, b, u);
    const anchor = u.stance === 'offensive' ? null : { x: u.startX, y: u.startY };
    if (t) {
      const d = Math.hypot(t.x - u.x, t.y - u.y);
      const range = primaryRange(bp);
      const engage = u.stance === 'offensive' || d < range * 1.4 || navalClass(u.type) === 'war';
      if (engage) {
        const a = Math.atan2(u.y - t.y, u.x - t.x) + (broadside(bp) ? 0.9 : 0);
        goal = { x: t.x + Math.cos(a) * range * 0.7, y: t.y + Math.sin(a) * range * 0.7 };
        if (anchor && u.stance === 'defensive' && Math.hypot(goal.x - anchor.x, goal.y - anchor.y) > 1600) {
          const k = 1600 / Math.hypot(goal.x - anchor.x, goal.y - anchor.y);
          goal = { x: anchor.x + (goal.x - anchor.x) * k, y: anchor.y + (goal.y - anchor.y) * k };
        }
        face = broadside(bp) ? Math.atan2(t.y - u.y, t.x - u.x) - Math.PI / 2 : Math.atan2(t.y - u.y, t.x - u.x);
      }
    }
    // Ohne erfasstes Ziel: Kriegsschiffe suchen die zuletzt bekannte Position bzw. die Kartenmitte ab
    if (!goal && navalClass(u.type) === 'war' && u.stance !== 'defensive') {
      const last = Object.entries(b.known[u.side]).filter(([id]) => b.units[id] && isActive(b.units[id])).map(([, k]) => k).sort((a, c) => c.t - a.t)[0];
      goal = last ? { x: last.x, y: last.y } : { x: W / 2, y: H / 2 };
    }
    if (!goal && anchor) goal = anchor;
  }
  // Ohne Antrieb und Manövrieranlage: Restbewegung klingt langsam ab, keine gezielten Befehle
  if (m.eng === 0 && m.thr === 0) {
    u.v *= Math.pow(0.97, dt);
  } else {
    let want = u.a;
    let speed = 0;
    if (goal) {
      const d = Math.hypot(goal.x - u.x, goal.y - u.y);
      if (d > 120) { want = Math.atan2(goal.y - u.y, goal.x - u.x); speed = m.max * (Math.abs(wrap(want - u.a)) < 1 ? 1 : 0.3); }
      else if (face !== null) want = face;
    } else if (face !== null) want = face;
    const da = wrap(want - u.a);
    u.a = wrap(u.a + Math.max(-m.turn * dt, Math.min(m.turn * dt, da)));
    if (speed > u.v) u.v = Math.min(speed, u.v + m.accel * dt);
    else u.v = Math.max(speed, u.v - Math.max(m.brake, 1) * dt);
  }
  u.x = Math.max(0, Math.min(W, u.x + Math.cos(u.a) * u.v * dt));
  u.y = Math.max(0, Math.min(H, u.y + Math.sin(u.a) * u.v * dt));
  // Rückzug: funktionsfähiger Haupt- und Sprungantrieb, Kartenrandbereich, Vorbereitung, keine Sprungsperre
  if (u.state === 'retreating') {
    const jumpF = bp.squad ? 1 : kindFactor(u, ship, 'jump', b.t, 0);
    const block = jumpF === 0 ? 'Sprungantrieb ausgefallen' : m.eng === 0 ? 'Hauptantrieb ausgefallen' : inhibited(game, b, u) ? 'Sprungsperre aktiv' : !inEdge(u) ? null : '';
    u.retreatBlock = block || null;
    if (block === 'Sprungantrieb ausgefallen' && navalClass(u.type) !== 'civil') { u.state = 'fight'; logBattle(game, b, `${ship.name}: Rückzug unmöglich, Sprungantrieb ausgefallen`); return; }
    if (block === '') {
      u.prep += dt * Math.max(0.25, jumpF);
      if (u.prep >= COMBAT.JUMP_PREP[bp.tier]) retreatDone(game, b, u);
    }
  }
}

function inhibited(game, b, u) {
  return unitsOf(b).some((o) => o.side !== u.side && isActive(o) && blueprint(o.type).inhibitor && systemEffect(o, shipOf(game, o), blueprint(o.type).systems.find((s) => s.kind === 'reactor' || s.kind === 'bridge')?.id, b.t) > 0
    && Math.hypot(o.x - u.x, o.y - u.y) <= blueprint(o.type).inhibitor);
}

function retreatDone(game, b, u) {
  u.state = 'retreated';
  b.retreated.push(u.ship);
  const ship = shipOf(game, u);
  fx(game, b, { k: 'retreated', ship: u.ship });
  logBattle(game, b, `${ship.name} hat sich zurückgezogen`);
  // Sofort sicher außerhalb der Schlacht im Herkunftssystem; zurückgezogene Schiffe bleiben vom Stack getrennt
  detachShip(game, ship);
  const a = Math.atan2(u.y - H / 2, u.x - W / 2);
  ship.x = b.x + Math.cos(a) * COMBAT.RETREAT_OFFSET;
  ship.y = b.y + Math.sin(a) * COMBAT.RETREAT_OFFSET;
  delete ship.battle;
  ship.state = 'idle';
  ship.nav = null;
  if (ship.queue[0]?.t === 'attack' || ship.queue[0]?.t === 'intercept') ship.queue.shift();
  ship.retreatedFrom = b.id;
  game.emit('battleRetreat', b, ship, u);
}

// ---------- Waffen ----------
function arcOk(u, w, rel) {
  const half = (w.turret ? 300 : WEAPONS[w.w].arc) * (Math.PI / 360);
  return Math.abs(wrap(rel - w.arc)) <= half;
}

function fire(game, b, u, dt) {
  if (u.state !== 'fight' && u.state !== 'retreating') return;
  if (u.protected) return;
  if (!u.ai && u.order?.t === 'ceasefire') return;
  const ship = shipOf(game, u), bp = blueprint(ship.type);
  const fc = bp.squad ? 1 : kindFactor(u, ship, 'bridge', b.t) * 0.5 + kindFactor(u, ship, 'sensor', b.t) * 0.5;
  const enemies = unitsOf(b).filter((t) => t.side !== u.side && isActive(t) && !t.protected && detected(b, u.side, t));
  if (!enemies.length) return;
  const forced = !u.ai && u.order?.t === 'attack' ? b.units[u.order.target] : null;
  const shots = bp.squad ? Math.max(0, ship.dmg.craft || 0) : 1;
  bp.weapons.forEach((w, i) => {
    const W0 = WEAPONS[w.w];
    if (w.w === 'pd') { pdVsCraft(game, b, u, ship, w, i, dt, enemies); return; }
    const eff = bp.squad ? 1 : systemEffect(u, ship, w.sys, b.t);
    if (eff <= 0) return;
    const rofMul = eff * (u.prio === 'weapons' ? 1.15 : u.prio ? 0.95 : 1);
    u.cd[i] -= dt * rofMul;
    if (u.cd[i] > 0) return;
    if (w.ammo != null && (ship.dmg.ammo[i] ?? 0) <= 0) return;
    const inReach = (t) => {
      const d = Math.hypot(t.x - u.x, t.y - u.y);
      if (d > W0.range || d < W0.minRange) return false;
      return arcOk(u, w, Math.atan2(t.y - u.y, t.x - u.x) - u.a);
    };
    let target = forced && isActive(forced) && inReach(forced) ? forced : null;
    let sys = target ? u.order.sys || null : null;
    if (!target) {
      const cand = enemies.filter(inReach);
      if (!cand.length) return;
      const ai = aiTarget(game, b, u);
      target = cand.includes(ai) ? ai : cand.sort((a, c) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(c.x - u.x, c.y - u.y))[0];
      if (u.type === 'bomberstaffel' || (bp.ability === 'precision' && W0.speed)) sys = exposedSystem(game, b, u, target);
    }
    const ts = shipOf(game, target);
    // Systemangriff nur bei erfasstem Schiff, bekannter Systemposition und nicht verdecktem Angriffsweg
    if (sys) {
      const k = b.known[u.side][target.ship];
      const rel = Math.atan2(u.y - target.y, u.x - target.x) - target.a;
      if (!k?.sys.includes(sys) || !systemExposed(ts, sys, rel, !!W0.guided) || (ts.dmg.sys[sys] ?? 0) <= 0) sys = null;
    }
    u.cd[i] = 1 / Math.max(0.01, W0.rof);
    if (w.ammo != null) ship.dmg.ammo[i] = (ship.dmg.ammo[i] ?? w.ammo) - 1;
    for (let k = 0; k < shots; k++) shoot(game, b, u, ship, w, i, target, ts, sys, fc * eff);
  });
}

function abilityMult(bp, w, rel) {
  let m = 1;
  if (bp.ability === 'frontbeam' && w.w === 'beam') m *= 1.3;
  if (bp.ability === 'siege' && w.w === 'torpedo') m *= 1.25;
  return m;
}

function shoot(game, b, u, ship, w, i, target, ts, sys, fc) {
  const W0 = WEAPONS[w.w], bp = blueprint(ship.type);
  let dmg = W0.dmg;
  if (W0.ramp) {
    const bm = (u.beam[i] ||= { target: null, since: b.t });
    if (bm.target !== target.ship) { bm.target = target.ship; bm.since = b.t; }
    dmg *= 1 + (W0.ramp - 1) * Math.min(1, (b.t - bm.since) / W0.rampSecs);
  }
  const p = hitChance(w.w, ts, { targetSpeed: target.v, fc });
  const hit = rnd() < p;
  if (!W0.speed) {
    fx(game, b, { k: 'shot', w: w.w, from: u.ship, to: target.ship, hit });
    if (hit) impact(game, b, { w: w.w, from: u.ship, side: u.side, target: target.ship, sys, dmg, ox: u.x, oy: u.y, mult: abilityMult(bp, w), struct: bp.ability === 'precision' ? 0.6 : 1 });
    return;
  }
  const a = Math.atan2(target.y - u.y, target.x - u.x) + (hit ? 0 : (rnd() - 0.5) * 0.6);
  b.projectiles.push({ id: ++b.pseq, w: w.w, from: u.ship, side: u.side, target: target.ship, sys, dmg, hit, x: u.x, y: u.y, a, life: (W0.range * 1.6) / W0.speed,
    guided: !!W0.guided, mult: abilityMult(bp, w), struct: bp.ability === 'precision' ? 0.6 : 1 });
}

/** Punktverteidigung gegen Fluggeräte (Lenkwaffenabwehr läuft bei den Geschossen) */
function pdVsCraft(game, b, u, ship, w, i, dt, enemies) {
  const eff = systemEffect(u, ship, w.sys, b.t);
  if (eff <= 0) return;
  u.cd[i] -= dt * eff;
  if (u.cd[i] > 0) return;
  const craft = enemies.find((t) => blueprint(t.type).squad && Math.hypot(t.x - u.x, t.y - u.y) <= WEAPONS.pd.range);
  if (!craft) return;
  u.cd[i] = 1 / WEAPONS.pd.rof;
  const ts = shipOf(game, craft);
  if (rnd() < hitChance('pd', ts, { targetSpeed: craft.v, fc: eff })) impact(game, b, { w: 'pd', from: u.ship, side: u.side, target: craft.ship, sys: null, dmg: WEAPONS.pd.dmg, ox: u.x, oy: u.y });
}

function moveProjectiles(game, b, dt) {
  const keep = [];
  for (const p of b.projectiles) {
    const W0 = WEAPONS[p.w];
    const t = b.units[p.target];
    p.life -= dt;
    if (p.life <= 0) continue;
    if (t && isActive(t) && (p.guided || p.hit)) p.a = Math.atan2(t.y - p.y, t.x - p.x);
    p.x += Math.cos(p.a) * W0.speed * dt;
    p.y += Math.sin(p.a) * W0.speed * dt;
    // Lenkwaffenabwehr: Punktverteidigung der Gegenseite in Reichweite, begrenzte Kapazität je Sekunde
    if (p.guided && interceptBy(game, b, p, dt)) { fx(game, b, { k: 'intercept', x: Math.round(p.x), y: Math.round(p.y) }); continue; }
    if (t && p.hit && Math.hypot(t.x - p.x, t.y - p.y) < 25) {
      // Kapitulierte, zurückgezogene und zerstörte Ziele erleiden keinen weiteren Schaden
      if (isActive(t)) impact(game, b, { ...p, ox: p.x - Math.cos(p.a) * 50, oy: p.y - Math.sin(p.a) * 50 });
      continue;
    }
    if (!p.hit && t && Math.hypot(t.x - p.x, t.y - p.y) < 25 && !WEAPONS[p.w].aoe) { keep.push(p); continue; }
    keep.push(p);
  }
  b.projectiles = keep;
  if (keep.length) b.lastHarm = b.t;
}

function interceptBy(game, b, p, dt) {
  for (const u of unitsOf(b)) {
    if (u.side === p.side || !isActive(u)) continue;
    const ship = shipOf(game, u), bp = blueprint(ship.type);
    const range = WEAPONS.pd.range * (bp.ability === 'convoy' ? PD_RANGE_CONVOY : 1);
    if (Math.hypot(u.x - p.x, u.y - p.y) > range) continue;
    for (const w of bp.weapons) {
      if (w.w !== 'pd') continue;
      const eff = systemEffect(u, ship, w.sys, b.t);
      if (eff > 0 && rnd() < WEAPONS.pd.intercept * eff * dt * (p.w === 'torpedo' ? 0.6 : 1)) return true;
    }
  }
  return false;
}

/** Einschlag: Schadenspipeline anwenden; Flächenwirkung zählt den Rumpf je Schiff einmal */
function impact(game, b, p) {
  const t = b.units[p.target];
  if (!t || !isActive(t) || t.protected) return;
  const ts = shipOf(game, t);
  const W0 = WEAPONS[p.w];
  const rel = Math.atan2(p.oy - t.y, p.ox - t.x) - t.a;
  // Bereits zerstörtes Zielsystem: Rumpftreffer an dessen Position; Systemlage beim tatsächlichen Anflug prüfen
  let sys = p.sys && (ts.dmg.sys[p.sys] ?? 0) > 0 ? p.sys : null;
  if (sys && !systemExposed(ts, sys, rel, !!W0.guided)) sys = null;
  const mult = (p.mult || 1) * flankMult(game, b, p, rel);
  let res;
  if (W0.aoe) {
    const targets = unitsOf(b).filter((o) => isActive(o) && !o.protected && Math.hypot(o.x - t.x, o.y - t.y) <= W0.aoe.r + LENGTH(o.type) / 2).map((o) => {
      const os = shipOf(game, o);
      const L = LENGTH(o.type);
      const systems = blueprint(o.type).systems.map((s) => {
        const sx = o.x + Math.cos(o.a) * s.x * L / 2 - Math.sin(o.a) * s.y * L / 4, sy = o.y + Math.sin(o.a) * s.x * L / 2 + Math.cos(o.a) * s.y * L / 4;
        return { id: s.id, dist: Math.hypot(sx - t.x, sy - t.y) };
      }).filter((s) => o === t ? s.id === sys || s.dist <= W0.aoe.r : s.dist <= W0.aoe.r);
      return { unit: o, ship: os, dist: o === t ? 0 : Math.max(0, Math.hypot(o.x - t.x, o.y - t.y) - L / 2), rel: Math.atan2(p.oy - o.y, p.ox - o.x) - o.a, systems };
    });
    res = applyArea(p.w, p.dmg, targets, b.t, mult);
    for (const r of res) afterHit(game, b, b.units[r.ship], r, p);
  } else {
    res = applyHit(t, ts, { weapon: p.w, dmg: p.dmg, rel, sys, mult, now: b.t, structMul: p.struct || 1 });
    afterHit(game, b, t, res, p);
  }
}

function flankMult(game, b, p, rel) {
  const from = b.units[p.from];
  if (!from || blueprint(from.type).ability !== 'flank') return 1;
  return Math.abs(wrap(rel)) > Math.PI / 4 ? 1.4 : 1;
}

function afterHit(game, b, t, r, p) {
  if (!t) return;
  if (r.shield + r.hull + r.system > 0) b.lastHarm = b.t;
  fx(game, b, { k: 'hit', ship: t.ship, w: p.w, shield: r.shield > 0 && !r.hull, sys: r.system > 0 ? p.sys : null, destroyed: r.sysDestroyed, jam: r.jammed, craft: r.craftLost });
  for (const sid of r.sysDestroyed) logBattle(game, b, `${shipOf(game, t).name}: System ${sid} zerstört`);
  if (r.killed) destroy(game, b, t);
  // Letzter kampffähiger Beschützer ausgefallen -> verbliebene Zivilschiffe kapitulieren
  if (r.killed || r.sysDestroyed.length) for (const o of unitsOf(b)) if (o.side === t.side) civilRule(game, b, o);
}

// ---------- Takt und Ende ----------
export function tickBattle(game, b, dt) {
  if (b.ended) return;
  b.t += dt;
  const units = unitsOf(b);
  for (const u of units) if (isActive(u)) maintain(game, b, u, dt);
  updateKnowledge(game, b);
  for (const u of units) policies(game, b, u);
  for (const u of units) steer(game, b, u, dt);
  for (const u of units) fire(game, b, u, dt);
  moveProjectiles(game, b, dt);
  checkEnd(game, b);
}

/** Zulaufende Verstärkung (Angriffs- oder Abfangauftrag mit Ziel in dieser Schlacht) */
export function inbound(game, b) {
  for (const s of game.ships.values()) {
    if (s.battle) continue;
    const c = s.queue[0];
    if (c && (c.t === 'attack' || c.t === 'intercept') && (c.battle === b.id || b.units[c.target])) return true;
  }
  return false;
}

export function checkEnd(game, b) {
  const fa = unitsOf(b).filter((u) => u.side === 'A' && stillFighting(game, b, u)).length;
  const fb = unitsOf(b).filter((u) => u.side === 'B' && stillFighting(game, b, u)).length;
  if (!fa && !fb) return endBattle(game, b, null);
  if (!fa) return endBattle(game, b, 'B');
  if (!fb) {
    // Planetenraid: nach dem Sieg über die Verteidiger folgt die sichtbare Plünderungsphase (Paket U10)
    if (b.kind === 'raid' && b.planet && !b.raid?.done) { if (b.raid?.phase !== 'loot') game.emit('raidDefendersBeaten', b); return; }
    return endBattle(game, b, 'A');
  }
  if (b.t - b.lastHarm >= COMBAT.STALEMATE && !b.projectiles.length && !inbound(game, b)) return endBattle(game, b, null, 'stalemate');
}

/** Ergebnisauflösung (Paket U06) registriert sich hier */
export const battleHooks = { resolve: null };

export function endBattle(game, b, winner, why = null) {
  if (b.ended) return;
  b.ended = { winner, why, t: Math.round(b.t) };
  logBattle(game, b, winner ? `Seite ${winner} gewinnt` : why === 'stalemate' ? 'Unentschieden: festgefahrene Schlacht' : 'Unentschieden');
  battleHooks.resolve?.(game, b, winner, why);
  game.battles.delete(b.id);
  game.battleFx.delete(b.id);
  game.emit('battleEnd', b);
}

export function tickBattles(game, dt) {
  for (const b of [...game.battles.values()]) tickBattle(game, b, dt);
}

/** Schlachtsymbol für die Strategiekarte */
export function battleSymbol(game, b) {
  const count = (side) => unitsOf(b).filter((u) => u.side === side && isActive(u)).length;
  return { id: b.id, x: Math.round(b.x), y: Math.round(b.y), kind: b.kind, a: count('A'), b: count('B'),
    sides: { A: b.sides.A.owners.map((o) => ownerName(game, o)), B: b.sides.B.owners.map((o) => ownerName(game, o)) } };
}

export { shieldActive };
