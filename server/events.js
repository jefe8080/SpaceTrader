import { GOODS, DEMAND, NPC_OWNER, demandPrice, demandAmount, pilotLevel, canBuyFrom } from '../shared/config.js';
import { hexAt, hexKey } from '../shared/hex.js';

/**
 * Sondernachfrage (PRD-3 Kapitel 5): je Sektor ein Zufallstimer, der nur läuft, solange Spielerschiffe im Sektor sind.
 * Ein Event fragt an einem NPC-Planeten eine im Sektor produzierte Ware zum Festpreis nach. Lieferungen gehen nicht
 * ins Marktlager. Es zählen nur manuelle Verkäufe über den Handelsbefehl, wer zuerst liefert, bekommt den Zuschlag.
 */

const rnd = (a, b) => a + Math.random() * (b - a);
const newTimer = () => rnd(...DEMAND.TIMER);

/** Sektoren mit Spielerschiffen und die Spieler darin */
export function activeSectors(game) {
  const out = new Map(); // Sektor -> Set(Spieler-ID)
  for (const s of game.ships.values()) {
    if (s.owner === NPC_OWNER) continue;
    const h = hexAt(s.x, s.y);
    const k = hexKey(h.q, h.r);
    if (!out.has(k)) out.set(k, new Set());
    out.get(k).add(s.owner);
  }
  return out;
}

/** Laufendes Event an einem Objekt (oder null) */
export function eventAt(game, entityId) {
  const e = game.world.entities.get(entityId);
  const ev = e && game.sectorEvents.get(e.sector)?.event;
  return ev && ev.entity === entityId ? ev : null;
}

export function tickEvents(game, dt) {
  const active = activeSectors(game);
  let changed = false;
  for (const [sector, players] of active) {
    if (!game.world.sectors.has(sector)) continue;
    let rec = game.sectorEvents.get(sector);
    if (!rec) { rec = { sector, timer: newTimer(), event: null }; game.sectorEvents.set(sector, rec); }
    if (rec.event) continue;
    rec.timer -= dt;
    if (rec.timer > 0) continue;
    rec.timer = newTimer();
    rec.event = startEvent(game, sector, players);
    if (rec.event) changed = true;
  }
  // Laufende Events enden nach 30 min oder wenn die Menge erfüllt ist, auch ohne Spieler im Sektor
  for (const rec of game.sectorEvents.values()) {
    const ev = rec.event;
    if (!ev || (game.time < ev.ends && ev.left > 0)) continue;
    rec.event = null;
    rec.timer = newTimer();
    changed = true;
  }
  if (changed) game.emit('events');
}

/** Event auswürfeln: NPC-Planet, Ware aus der Produktion des Sektors (ohne Passagiere und ultraseltene Waren) */
export function startEvent(game, sector, players) {
  const ents = game.world.sectorEntities(sector).filter((e) => e.sector === sector && e.market);
  const planets = ents.filter((e) => e.kind === 'planet' && !game.ownership.has(e.id));
  const goods = new Set();
  for (const e of ents) for (const [g, s] of Object.entries(e.market.goods)) if (s.role === 'produce' && canBuyFrom(s) && !GOODS[g].ultra && GOODS[g].cls !== 'passenger') goods.add(g);
  if (!planets.length || !goods.size) return null;
  const planet = planets[Math.floor(Math.random() * planets.length)];
  const list = [...goods];
  const good = list[Math.floor(Math.random() * list.length)];
  const L = Math.min(...[...players].map((id) => pilotLevel(game.players.get(id)?.xp)));
  const total = demandAmount(good, Number.isFinite(L) ? L : 1);
  const ev = { entity: planet.id, good, price: Math.round(demandPrice(good, planet.market.goods[good]?.mod || 1) * 10) / 10,
    total, left: total, started: Math.round(game.time), ends: Math.round(game.time + DEMAND.DURATION) };
  if(game.profile==='homeworld'){ev.budget=ev.price*total;ev.spent=0;ev.consumed=0;}
  for (const id of players) {
    const p = game.players.get(id);
    if (p) game.emit('notice', p, `Sondernachfrage: ${planet.name} kauft ${total} ${GOODS[good].name} zu ${ev.price.toLocaleString('de-DE')} Cr (30 min).`);
  }
  return ev;
}

/**
 * Manueller Verkauf an ein Event: liefert die angenommene Menge zum Festpreis (0, wenn kein passendes Event).
 * Kein Rückgang: das Marktlager bleibt unberührt. Keine XP.
 */
export function sellToEvent(game, ship, e, good, amount) {
  const ev = eventAt(game, e.id);
  if (!ev || ev.good !== good || ev.left <= 0 || game.time >= ev.ends) return { n: 0 };
  const have = ship.cargo[good] || 0;
  const n = Math.min(amount, have, ev.left,game.profile==='homeworld'?Math.floor((ev.budget??0)/ev.price):Infinity);
  if (n <= 0) return { n: 0 };
  const p = game.players.get(ship.owner);
  const total = n * ev.price;
  p.credits += total;
  if(game.profile==='homeworld'){ev.budget-=total;ev.spent+=total;ev.consumed+=n;}
  ev.left -= n;
  ship.cargo[good] = have - n;
  if (!ship.cargo[good]) { delete ship.cargo[good]; if (ship.basis) delete ship.basis[good]; }
  game.recordShip(ship, 'inc', total);
  game.shipLog(ship, `Sondernachfrage: ${n} ${GOODS[good].name} für ${Math.round(total)} Cr an ${e.name}`);
  game.emit('events');
  return { n, total };
}

/** Events für einen Spieler: in bekannten Sektoren */
export function eventsView(game, p) {
  const out = [];
  for (const rec of game.sectorEvents.values()) {
    const ev = rec.event;
    if (!ev || !p.known.sector.has(rec.sector)) continue;
    const e = game.world.entities.get(ev.entity);
    out.push({ ...ev, sector: rec.sector, name: e?.name || '?', known: !!e && game.isKnown(p, e), x: e?.x, y: e?.y });
  }
  return out;
}
