// PRD 15 U01: physische Stacks. Ein Stack enthält ausschließlich Schiffe desselben Besitzers und reist gemeinsam.
// Das erste Mitglied ist Leitschiff: Es führt Befehle und Routen aus, die übrigen folgen in Formation.
import { fuelBurn, shipStats } from '../../shared/config.js';
import { setWarn } from '../ships.js';

export const STACK = {
  JOIN_DIST: 120,   // Treffpunkt: so nah muss das zugeschickte Schiff dem Ziel kommen
  SPACING: 34,      // Formationsabstand der Mitglieder
  MAX: 24,          // Höchstzahl Mitglieder je Stack
  CHECK_EVERY: 2,   // Sekunden zwischen Bereitschaftsprüfungen eines blockierten Stacks
};

export const stackOf = (game, ship) => (ship?.stack ? game.stacks.get(ship.stack) || null : null);
export const stackMembers = (game, st) => st.members.map((id) => game.ships.get(id)).filter(Boolean);
export const isFollower = (game, ship) => { const st = stackOf(game, ship); return !!st && st.members[0] !== ship.id; };
export const leaderOf = (game, ship) => { const st = stackOf(game, ship); return st ? game.ships.get(st.members[0]) : ship; };

/** Gemeinsames Reisetempo: langsamstes Mitglied */
export function stackSpeed(game, ship) {
  const st = stackOf(game, ship);
  if (!st) return shipStats(ship).speed;
  return Math.min(...stackMembers(game, st).map((m) => shipStats(m).speed));
}

/** Darf das Schiff überhaupt an einem Stack teilnehmen? Liefert Fehlertext oder null. */
export function stackBlocker(game, ship) {
  if (ship.captive) return `${ship.name} ist in Gefangenschaft.`;
  if (ship.battle) return `${ship.name} kämpft gerade.`;
  if (ship.transit) return `${ship.name} ist im Wurmloch.`;
  if (ship.main) return `${ship.name} ist dein Hauptschiff und bleibt eigenständig.`;
  if (game.shipOffers?.has(ship.id)) return `${ship.name} ist im Konsortium angeboten.`;
  return null;
}

function newStack(game, owner, members, extra = {}) {
  const id = 'st' + ++game.counters.stack;
  const st = { id, owner, members: [...members], created: Math.round(game.time), ...extra };
  game.stacks.set(id, st);
  for (const sid of members) game.ships.get(sid).stack = id;
  return st;
}

/** Auflösen, wenn weniger als zwei Mitglieder übrig sind */
function tidy(game, st) {
  st.members = st.members.filter((id) => game.ships.get(id)?.stack === st.id);
  if (st.members.length >= 2) return st;
  for (const id of st.members) delete game.ships.get(id).stack;
  game.stacks.delete(st.id);
  return null;
}

/**
 * Zusammenführung am Treffpunkt: a (samt seinem Stack, falls a Leitschiff ist) tritt dem Stack von b bei.
 * Gleiche Besitz- und Exklusivitätsregeln für neue und bestehende Stacks.
 */
export function mergeShips(game, a, b, extra = {}) {
  if (a === b) return 'Ein Schiff kann sich nicht selbst beitreten.';
  if (a.owner !== b.owner) return 'Stacks enthalten nur Schiffe desselben Besitzers.';
  for (const s of [a, b]) { const err = stackBlocker(game, s); if (err) return err; }
  const sa = stackOf(game, a), sb = stackOf(game, b);
  if (sa && sa === sb) return null;
  const moving = sa && sa.members[0] === a.id ? stackMembers(game, sa) : [a];
  if (sa && sa.members[0] !== a.id) detachShip(game, a);
  const target = sb || newStack(game, b.owner, [b.id], extra);
  if (target.members.length + moving.length > STACK.MAX) return `Ein Stack fasst höchstens ${STACK.MAX} Schiffe.`;
  if (sa && sa !== target) game.stacks.delete(sa.id);
  for (const m of moving) {
    if (target.members.includes(m.id)) continue;
    target.members.push(m.id);
    m.stack = target.id;
    m.queue = [];
    m.nav = null;
    delete m.rendezvous;
    setWarn(m, 'stack', null);
  }
  const leader = game.ships.get(target.members[0]);
  for (const m of moving) { m.dockedAt = leader.dockedAt; m.state = leader.state; }
  game.shipLog(leader, `Stack gebildet: ${target.members.length} Schiffe`);
  return null;
}

/** Mitglied aus dem Stack lösen; es behält seine Position und wird eigenständig */
export function detachShip(game, ship) {
  const st = stackOf(game, ship);
  if (!st) return;
  const wasLeader = st.members[0] === ship.id;
  st.members = st.members.filter((id) => id !== ship.id);
  delete ship.stack;
  setWarn(ship, 'stack', null);
  const rest = tidy(game, st);
  // Neues Leitschiff übernimmt den laufenden Stackauftrag
  if (wasLeader && rest) {
    const next = game.ships.get(rest.members[0]);
    next.queue = ship.queue.map((c) => ({ ...c }));
    ship.queue = ship.queue.filter((c) => c.t === 'route');
  } else if (wasLeader) {
    const last = game.ships.get(st.members[0]);
    if (last && !last.queue.length) last.queue = ship.queue.filter((c) => c.t === 'route').map((c) => ({ ...c }));
  }
}

/** Mitglieder entfernen (Zerstörung, Besitzwechsel, Gefangenschaft) */
export function removeFromStacks(game, ship) { if (ship.stack) detachShip(game, ship); }

/** Reihenfolge ändern: dir = -1 nach vorne, +1 nach hinten */
export function reorderStack(game, st, shipId, dir) {
  const i = st.members.indexOf(shipId), j = i + dir;
  if (i < 0 || j < 0 || j >= st.members.length) return 'Verschieben nicht möglich.';
  const oldLeader = game.ships.get(st.members[0]);
  [st.members[i], st.members[j]] = [st.members[j], st.members[i]];
  const newLeader = game.ships.get(st.members[0]);
  if (newLeader !== oldLeader) {
    // Der gemeinsame Auftrag wandert mit der Leitposition
    newLeader.queue = oldLeader.queue;
    newLeader.nav = oldLeader.nav;
    oldLeader.queue = [];
    oldLeader.nav = null;
  }
  return null;
}

/** Treibstoff- und Sprungbereitschaft aller Mitglieder für eine geplante Strecke. Liefert Grund oder null. */
export function stackReadiness(game, st, plan) {
  for (const m of stackMembers(game, st)) {
    if (m.captive) return `${m.name} ist gefangen`;
    if (m.repairHold) return `${m.name} muss repariert werden`;
    const tank = game.shipTank(m);
    const need = tank > 0 && !m.relicSpeed ? fuelBurn(tank) * shipStats(m).burn * (plan?.time || 0) : 0;
    if (need > (m.fuel || 0) + 1e-6) return `${m.name} hat zu wenig Treibstoff (${(m.fuel || 0).toFixed(1)} von ${need.toFixed(1)} nötig)`;
    if (plan?.legs?.some((l) => l.wh) && m.dmg?.sys?.jump === 0) return `${m.name}: Sprungantrieb zerstört`;
  }
  return null;
}

/**
 * Prüft vor Beginn einer neuen Strecke des Leitschiffs. true = darf losfliegen.
 * Kein automatisches Zurücklassen: der gemeinsame Auftrag wartet mit sichtbarem Grund.
 */
export function stackMayDepart(game, leader, plan) {
  const st = stackOf(game, leader);
  if (!st || st.members[0] !== leader.id) return true;
  const reason = stackReadiness(game, st, plan);
  setWarn(leader, 'stack', reason ? `Stack blockiert: ${reason}` : null);
  st.block = reason || null;
  return !reason;
}

/** Nach allen Schiffsbewegungen: Mitglieder folgen ihrem Leitschiff, verbrauchen eigenen Treibstoff */
export function syncStacks(game, dt) {
  for (const st of [...game.stacks.values()]) {
    if (!tidy(game, st)) continue;
    const [leader, ...rest] = stackMembers(game, st);
    if (!leader) continue;
    const moved = st.lx === undefined ? 0 : Math.hypot(leader.x - st.lx, leader.y - st.ly);
    const speed = stackSpeed(game, leader);
    // Wurmlochaustritt springt: dort fällt kein Flugverbrauch an
    const flight = dt > 0 && moved > 0 && moved <= speed * dt * 1.5 + 1 ? moved / Math.max(1, speed) : 0;
    st.lx = leader.x; st.ly = leader.y;
    rest.forEach((m, i) => {
      if (m.battle) return;
      const ring = Math.floor(i / 6) + 1, a = leader.angle + Math.PI + ((i % 6) - 2.5) * 0.45;
      m.x = leader.x + Math.cos(a) * STACK.SPACING * ring;
      m.y = leader.y + Math.sin(a) * STACK.SPACING * ring;
      m.angle = leader.angle; m.vx = leader.vx; m.vy = leader.vy;
      m.dockedAt = leader.dockedAt;
      m.state = leader.transit ? 'transit' : leader.state;
      m.transit = null;
      const tank = game.shipTank(m);
      if (flight && tank > 0 && !m.relicSpeed) m.fuel = Math.max(0, m.fuel - fuelBurn(tank) * shipStats(m).burn * flight);
      if (flight) game.recordShip(m, 'dist', moved);
    });
  }
}

/** Zusammenflug zum Zielschiff; beim Treffen entsteht bzw. wächst der Stack. */
export function runJoin(ship, c, dt, game, flyTo) {
  const target = game.ships.get(c.ship);
  if (!target || target.owner !== ship.owner) { game.shipLog(ship, 'Zusammenführung abgebrochen: Ziel nicht mehr verfügbar'); return true; }
  const lead = leaderOf(game, target);
  if (Math.hypot(lead.x - ship.x, lead.y - ship.y) > STACK.JOIN_DIST) {
    ship.state = 'flying';
    ship.dockedAt = null;
    flyTo(ship, lead.x, lead.y, dt, game);
    if (Math.hypot(lead.x - ship.x, lead.y - ship.y) > STACK.JOIN_DIST) return false;
  }
  const err = mergeShips(game, ship, target);
  if (err) { game.shipLog(ship, `Zusammenführung abgebrochen: ${err}`); return true; }
  return true;
}

// ---------- Routenstacks (PRD 15 Kapitel 2.3) ----------
/** Gruppen gleicher Stacknummer innerhalb derselben Route */
export function routeGroups(game) {
  const out = new Map();
  for (const route of game.routes.values()) {
    const nums = route.stackNo || {};
    for (const [sid, n] of Object.entries(nums)) {
      const s = game.ships.get(sid);
      if (!s || s.owner !== route.owner || s.captive || s.battle) continue;
      if (s.queue[0]?.t !== 'route' || s.queue[0].route !== route.id) continue;
      const key = `${route.id}:${n}`;
      if (!out.has(key)) out.set(key, { route, n, ships: [] });
      out.get(key).ships.push(s);
    }
  }
  for (const g of out.values()) g.ships.sort((a, b) => (a.ord || 0) - (b.ord || 0));
  return out;
}

/** Routenstacks bilden: Mitglieder fliegen zum Leitschiff, das solange wartet. Fremde Nummern lösen sich. */
export function formRouteStacks(game) {
  const groups = routeGroups(game);
  const wanted = new Map();
  for (const [key, g] of groups) {
    if (g.ships.length < 2) continue;
    const existing = g.ships.map((s) => stackOf(game, s)).find((st) => st?.routeKey === key);
    const leader = existing ? game.ships.get(existing.members[0]) : g.ships[0];
    for (const s of g.ships) {
      wanted.set(s.id, key);
      if (s === leader || (existing && s.stack === existing.id)) { delete s.rendezvous; continue; }
      if (s.stack) detachShip(game, s);
      s.rendezvous = leader.id;
    }
    const pending = g.ships.some((s) => s.rendezvous);
    setWarn(leader, 'stack', pending ? `Zusammenflug Routenstack ${g.n}: warte auf Mitglieder` : null);
  }
  // Mitglieder ohne passende Nummer verlassen Routenstacks
  for (const st of [...game.stacks.values()]) {
    if (!st.routeKey) continue;
    for (const id of [...st.members]) if (wanted.get(id) !== st.routeKey) { const s = game.ships.get(id); if (s) detachShip(game, s); }
  }
  for (const s of game.ships.values()) if (s.rendezvous && !wanted.has(s.id)) delete s.rendezvous;
}

/** Zusammenflug eines Routenmitglieds (statt eigener Routenfahrt) */
export function runRendezvous(ship, dt, game, flyTo) {
  const lead = game.ships.get(ship.rendezvous);
  if (!lead) { delete ship.rendezvous; return; }
  const leader = leaderOf(game, lead);
  setWarn(ship, 'stack', `Zusammenflug zu ${leader.name}`);
  if (Math.hypot(leader.x - ship.x, leader.y - ship.y) > STACK.JOIN_DIST) {
    ship.state = 'flying';
    ship.dockedAt = null;
    flyTo(ship, leader.x, leader.y, dt, game);
    if (Math.hypot(leader.x - ship.x, leader.y - ship.y) > STACK.JOIN_DIST) return;
  }
  const route = game.routes.get(ship.queue[0]?.route);
  const key = route ? `${route.id}:${route.stackNo?.[ship.id]}` : null;
  const queue = ship.queue;
  const err = mergeShips(game, ship, leader, { routeKey: key });
  if (!err) {
    ship.queue = queue; // Mitglieder behalten ihre Routenposition für ein späteres Ablösen
    const st = stackOf(game, ship);
    if (st && !st.routeKey) st.routeKey = key;
  }
  delete ship.rendezvous;
}

/** Wartet das Leitschiff eines Routenstacks noch auf Mitglieder? */
export function routeStackPending(game, leader) {
  for (const s of game.ships.values()) if (s.rendezvous && leaderOf(game, game.ships.get(s.rendezvous) || s) === leader) return true;
  return false;
}

/** Laufender Routenstand des Leitschiffs auf Mitglieder spiegeln (kein Überspringen beim Ablösen) */
export function mirrorRouteProgress(game, st) {
  const [leader, ...rest] = stackMembers(game, st);
  const lc = leader?.queue[0];
  if (lc?.t !== 'route') return;
  for (const m of rest) {
    const mc = m.queue.find((c) => c.t === 'route' && c.route === lc.route);
    if (!mc) continue;
    const ms = lc.mst?.[m.id];
    Object.assign(mc, { idx: lc.idx, done: lc.done, phase: lc.phase === 'act' ? (ms?.finished ? 'wait' : 'act') : lc.phase, actionIdx: ms?.actionIdx ?? 0, waitUntil: lc.waitUntil });
  }
}

/** Sichtbarer Stackzustand für den Besitzer */
export function stacksView(game, player) {
  return [...game.stacks.values()].filter((st) => st.owner === player.id).map((st) => ({
    id: st.id, members: st.members, routeKey: st.routeKey || null, block: st.block || null,
    auto: st.autoRepair !== false,
  }));
}
