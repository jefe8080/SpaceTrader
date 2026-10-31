// PRD 15 U07: Vollreparatur, Munition, Staffelersatz, Bergungsdienst, Reparaturautomatik und Auftragsfortsetzung.
import { SHIP_TYPES, WORLD } from '../../shared/config.js';
import { blueprint, ensureDamage, needsRepair, repairQuote, maxHull, REPAIR } from '../../shared/combat.js';
import { factionHostileTo } from './diplomacy.js';
import { stackOf, stackMembers, leaderOf } from './stacks.js';
import { drivesDestroyed } from './battle.js';
import { outcomeHooks } from './outcome.js';
import { setWarn } from '../ships.js';

const YARD_TYPES = new Set(['shipyard', 'bigyard', 'factionyard']);

/** Stelle mit vollständiger Reparaturleistung, die der Besitzer nutzen darf? */
export function repairSiteError(game, owner, e) {
  if (!e) return 'Kein Ziel.';
  const h = e.market?.homeworld;
  if (e.type === 'ruins') {
    if (h?.owner !== owner) return 'Fremder Ruinenplanet.';
    if (h.facilities?.workshop?.status !== 'ready') return 'Die Antriebswerkstatt ist nicht repariert.';
    if (h.facilities?.dock?.status !== 'ready') return 'Der Landeplatz ist nicht repariert.';
    return null;
  }
  if (e.kind === 'station' && YARD_TYPES.has(e.type)) {
    const prop = game.ownership.get(e.id);
    if (prop && prop.player !== owner && !game.canUseStorage(prop, owner) && prop.mode === 'private') return 'Private Werft.';
    if (e.type === 'factionyard' && factionHostileTo(game, e.faction, owner)) return 'Feindliche Fraktionswerft.';
    return null;
  }
  return 'Hier gibt es keine Reparatur.';
}

/** Nächste erreichbare Reparaturstelle nach tatsächlicher Flugzeit; bekannte feindliche Schutzbereiche möglichst meiden */
export function nearestRepairSite(game, ship) {
  const p = game.players.get(ship.owner);
  let best = null, bt = Infinity;
  for (const e of game.world.entities.values()) {
    if (repairSiteError(game, ship.owner, e)) continue;
    if (p && !game.isKnown(p, e)) continue;
    const plan = game.planLegs(ship, e.x, e.y);
    let t = plan.time;
    if (!Number.isFinite(t)) continue;
    if (hostileGuarded(game, ship.owner, e)) t *= 3;
    if (t < bt) { bt = t; best = e; }
  }
  return best;
}
function hostileGuarded(game, owner, e) {
  return e.faction && factionHostileTo(game, e.faction, owner);
}

/** Gesamtvorschau für Schiffe (Kosten, Dauer); Munition und Staffelersatz eingeschlossen */
export function quoteFor(ships) {
  let cost = 0, secs = 0, ammo = 0;
  for (const s of ships) {
    ensureDamage(s);
    const q = repairQuote(s, SHIP_TYPES[s.type].price);
    cost += q.cost; ammo += q.ammo; secs = Math.max(secs, q.secs);
  }
  return { cost: cost + ammo, repair: cost, ammo, secs };
}

function restore(ship) {
  const bp = blueprint(ship.type);
  const d = ensureDamage(ship);
  d.hull = maxHull(ship.type);
  for (const s of bp.systems) d.sys[s.id] = s.hp;
  if (bp.squad) d.craft = bp.squad.n;
  bp.weapons.forEach((w, i) => { if (w.ammo != null) d.ammo[i] = w.ammo; });
  delete ship.repairHold;
}

/** Manuelle Vollreparatur angedockt mit Kosten-/Dauervorschau; Zahlung genau einmal */
export function startRepair(game, player, ship, confirmCost) {
  if (ship.battle || ship.captive) return 'Nicht während Schlacht oder Gefangenschaft.';
  const e = game.world.entities.get(ship.dockedAt);
  const err = repairSiteError(game, ship.owner, e);
  if (err) return err;
  const q = quoteFor([ship]);
  if (q.cost <= 0) return 'Keine Reparatur nötig.';
  if (confirmCost !== undefined && confirmCost !== q.cost) return `Die Reparatur kostet ${q.cost} Cr.`;
  if (player.credits < q.cost) return `Reparatur kostet ${q.cost} Cr; nicht genug Geld.`;
  player.credits -= q.cost;
  ship.queue = [{ t: 'repairWait', at: e.id, until: game.time + q.secs, paid: q.cost, qid: ++ship.qid }];
  game.shipLog(ship, `Reparatur bei ${e.name}: ${q.cost} Cr, ${q.secs} s`);
  return null;
}

/** Repariert angedockt bis zum Ablauf; danach Fortsetzung */
export function runRepairWait(ship, c, dt, game) {
  ship.state = 'repairing';
  if (game.time < c.until) return false;
  const st = stackOf(game, ship);
  for (const m of st && c.stack ? stackMembers(game, st) : [ship]) restore(m);
  game.shipLog(ship, 'Reparatur abgeschlossen');
  if (c.resume) resumeAfterRepair(game, ship, c.resume);
  return true;
}

/** Reparaturfahrt eines Stacks oder Einzelschiffs: Ziel anfliegen, bezahlen, reparieren, fortsetzen */
export function runRepairRun(ship, c, dt, game, flyToEntity) {
  const target = game.world.entities.get(c.target);
  const owner = game.accountOf(ship.owner);
  const st = stackOf(game, ship);
  const crew = st ? stackMembers(game, st) : [ship];
  if (repairSiteError(game, ship.owner, target)) {
    if ((c.retryAt || 0) > game.time) { ship.state = 'waiting'; return false; }
    c.retryAt = game.time + 10;
    const next = nearestRepairSite(game, ship);
    if (!next) { setWarn(ship, 'repair', 'Reparaturfahrt pausiert: keine erreichbare Werkstatt'); ship.state = 'waiting'; return false; }
    c.target = next.id;
    ship.nav = null;
    return false;
  }
  if (c.phase !== 'repair') {
    if (!flyToEntity(ship, target, dt, game)) return false;
    c.phase = 'dock';
  }
  if (!c.paid) {
    const q = quoteFor(crew);
    // Bezahlung aus regulär verfügbaren eigenen Mitteln: keine Schulden, kein Warenverkauf
    if (!owner || owner.credits < q.cost) { setWarn(ship, 'repair', `Reparatur pausiert: ${q.cost} Cr nötig`); ship.state = 'waiting'; return false; }
    owner.credits -= q.cost;
    c.paid = q.cost;
    c.until = game.time + q.secs;
    c.phase = 'repair';
    setWarn(ship, 'repair', null);
    game.shipLog(ship, `Reparatur bei ${target.name}: ${q.cost} Cr (inkl. Munition ${q.ammo} Cr), ${q.secs} s`);
  }
  ship.state = 'repairing';
  if (game.time < c.until) return false;
  for (const m of crew) restore(m);
  delete ship.repairRun;
  game.shipLog(ship, 'Reparatur abgeschlossen, Auftrag wird fortgesetzt');
  resumeAfterRepair(game, ship, c.resume);
  return true;
}

/** Ursprünglichen Auftrag samt Routenposition fortsetzen; Bewacher kehren zum Schutzort zurück */
function resumeAfterRepair(game, ship, resume) {
  if (!resume) return;
  const ok = resume.queue.filter((c) => {
    if (c.t === 'route') return game.routes.has(c.route);
    if (c.target && c.t !== 'attack') return game.world.entities.has(c.target) || game.ships.has(c.target);
    return c.t !== 'attack' && c.t !== 'intercept';
  });
  if (ok.length < resume.queue.length) setWarn(ship, 'resume', 'Ein gespeichertes Ziel ist entfallen; Rest wartet.');
  // repairRun-Befehl selbst wird anschließend aus der Queue entfernt
  ship.queue.splice(1, 0, ...ok.map((c) => ({ ...c, qid: ++ship.qid })));
}

/** Reparaturautomatik: standardmäßig aktiv, je Stack bzw. Einzelschiff abschaltbar */
export const autoRepairOn = (game, ship) => { const st = stackOf(game, ship); return (st ? st.autoRepair : ship.autoRepair) !== false; };

/** Startet die Reparaturfahrt, wenn ein Mitglied Rumpf- oder Systemschaden hat (Schild/Ionen/Munition allein nicht) */
export function maybeStartRepairRun(game, ship) {
  const lead = leaderOf(game, ship);
  if (lead.battle || lead.captive || lead.repairRun || lead.queue[0]?.t === 'repairWait' || lead.queue[0]?.t === 'salvage') return false;
  if (!game.players.has(lead.owner)) return false;
  if (!autoRepairOn(game, lead)) return false;
  const st = stackOf(game, lead);
  const crew = st ? stackMembers(game, st) : [lead];
  if (!crew.some((m) => needsRepair(m))) return false;
  if (crew.some((m) => drivesDestroyed(m))) return startSalvage(game, lead);
  const site = nearestRepairSite(game, lead);
  const resume = { queue: lead.queue.filter((c) => c.t !== 'repairRun').map(({ qid, ...c }) => c) };
  lead.repairRun = true;
  lead.queue = [{ t: 'repairRun', target: site?.id || null, resume, qid: ++lead.qid }];
  lead.nav = null;
  if (!site) setWarn(lead, 'repair', 'Reparaturfahrt pausiert: keine erreichbare Werkstatt');
  game.shipLog(lead, `Reparaturautomatik: Fahrt zu ${site?.name || '?'}`);
  return true;
}

/** Bergungsdienst für bewegungsunfähige Überlebende: kostenpflichtig, mit Wartezeit, nur nach der Schlacht */
export function startSalvage(game, ship) {
  const site = nearestRepairSite(game, ship);
  const resume = { queue: ship.queue.filter((c) => !['repairRun', 'salvage'].includes(c.t)).map(({ qid, ...c }) => c) };
  ship.repairRun = true;
  ship.queue = [{ t: 'salvage', target: site?.id || null, resume, qid: ++ship.qid }];
  game.shipLog(ship, 'Bergungsdienst angefordert');
  return true;
}

export function runSalvage(ship, c, dt, game) {
  if (!game.world.entities.get(c.target) && (c.retryAt || 0) > game.time) { ship.state = 'waiting'; return false; }
  c.retryAt = game.time + 10;
  const site = game.world.entities.get(c.target) || nearestRepairSite(game, ship);
  if (!site) { setWarn(ship, 'repair', 'Bergung pausiert: keine erreichbare Werkstatt'); ship.state = 'waiting'; return false; }
  c.target = site.id;
  const owner = game.accountOf(ship.owner);
  if (!c.paid) {
    const cost = REPAIR.SALVAGE_CR + Math.round(Math.hypot(site.x - ship.x, site.y - ship.y) / 100);
    if (!owner || owner.credits < cost) { setWarn(ship, 'repair', `Bergung pausiert: ${cost} Cr nötig`); ship.state = 'waiting'; return false; }
    owner.credits -= cost;
    c.paid = cost;
    c.until = game.time + REPAIR.SALVAGE_WAIT;
    setWarn(ship, 'repair', null);
    game.shipLog(ship, `Bergungsdienst bezahlt: ${cost} Cr, Abholung in ${REPAIR.SALVAGE_WAIT} s`);
  }
  ship.state = 'waiting';
  if (game.time < c.until) return false;
  // Abgeschleppt: angedockt an der Reparaturstelle, dort normale Reparaturfahrt
  const st = stackOf(game, ship);
  for (const m of st ? stackMembers(game, st) : [ship]) {
    m.x = site.x + site.radius + WORLD.DOCK_OFFSET; m.y = site.y;
    m.dockedAt = site.id;
  }
  ship.queue.splice(1, 0, { t: 'repairRun', target: site.id, resume: c.resume, qid: ++ship.qid });
  return true;
}

/** Nach jeder Schlacht und periodisch: Reparaturautomatik prüfen */
export function tickRepairs(game) {
  for (const s of game.ships.values()) {
    if (s.battle || s.captive || s.repairRun) continue;
    if (stackOf(game, s) && leaderOf(game, s) !== s) continue;
    maybeStartRepairRun(game, s);
  }
}

outcomeHooks.afterBattle.push((game, b, winner, byShip) => {
  for (const ship of byShip.values()) if (game.ships.has(ship.id) && !ship.captive) maybeStartRepairRun(game, ship);
});
