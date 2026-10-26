import {planRoutePurchase,reserveRoutePurchase,releaseRouteDelivery} from './route-capacity.js';
import { SHIP_TYPES, BELT_TYPES, WORLD, GOODS, FUEL, ZONE_TYPES, slotPrice, fuelBurn, shipStats, freeFor, hasAbility } from '../shared/config.js';
import { stat } from './markets.js';
import { sellToSupplier as sellToSupplierImpl } from './property.js';
import { zoneEffects, inZone } from '../shared/nav.js';
import { availableHomeStock } from '../shared/homeworld.js';
import { segmentCovered, pointCovered } from './coverage.js';
import {loadRealSupply} from './real-economy.js';
import {runLogistics} from './logistics.js';

const inZoneAt = (z, p) => inZone(z, p.x, p.y);

export const cargoUsed = (ship) => Object.values(ship.cargo).reduce((a, b) => a + b, 0)+Object.values(ship.moduleCargo||{}).reduce((sum,n)=>sum+n*30,0);

/** Abbaurate eines Schiffes für eine Ware (Standard: Bergbaulaser, Spezial: Module). NPC-Versorger bauen alles ab. */
export function miningRate(ship, good) {
  const d = SHIP_TYPES[ship.type];
  if (d.npc) return d.mining;
  return shipStats(ship).mining[GOODS[good].mine || 'std'] || 0;
}

const FAIL_WARN = 3; // so viele Fehlschläge derselben Aktion in Folge -> Warnung

function approachPoint(ship, e) {
  let dx = ship.x - e.x, dy = ship.y - e.y;
  let d = Math.hypot(dx, dy);
  if (d < 1) { dx = 1; dy = 0; d = 1; }
  const off = e.kind === 'belt' ? e.radius * 0.45 : e.kind === 'wormhole' ? 0 : e.radius + WORLD.DOCK_OFFSET;
  return { x: e.x + (dx / d) * off, y: e.y + (dy / d) * off };
}

function flyTo(ship, tx, ty, dt, game) {
  const player=game.players.get(ship.owner);
  if(game.profile==='homeworld'&&player&&!ship.queue[0]?.manualDirect){
    const begun=ship.coverageLeg&&Math.hypot(ship.coverageLeg.x-tx,ship.coverageLeg.y-ty)<1e-5;
    if(!begun&&!segmentCovered(game,player,ship,{x:tx,y:ty})){
      setWarn(ship,'coverage','Fortsetzung pausiert: eigene Leitstellenabdeckung fehlt.');ship.state='waiting';
      if(!ship.coverageLeg)ship.nav=null;
      return false;
    }
    setWarn(ship,'coverage',null);
    if(dt>0&&!begun)ship.coverageLeg={x:tx,y:ty};
  }
  if(game.profile==='homeworld'&&dt>0)ship.flightLeg={x:tx,y:ty};
  const fx = zoneEffects(game.world.zonesNear(ship.x, ship.y), ship.x, ship.y, { void: hasAbility(ship, 'void') });
  ship.zone = fx.zones ? fx.zones.map((z) => z.type) : null;
  let speed = game.shipSpeed(ship) * fx.speed;
  const tank = game.shipTank(ship);
  if (!ship.relicSpeed && tank > 0 && ship.fuel <= 0) speed *= FUEL.EMPTY_SPEED; // leerer Tank: 30 % Geschwindigkeit, Befehl läuft weiter
  const dx = tx - ship.x, dy = ty - ship.y;
  const d = Math.hypot(dx, dy);
  const step = speed * dt;
  ship.dockedAt = null;
  // Verbrauch nur im Flug, Ionensturm verdoppelt
  if (tank > 0 && dt > 0) {
    const flown = Math.min(1, step > 0 ? d / step : 0) * dt;
    ship.fuel = Math.max(0, ship.fuel - fuelBurn(tank) * shipStats(ship).burn * fx.fuel * flown);
    setWarn(ship, 'fuel', ship.fuel <= 0 ? 'Tank leer: nur 30 % Geschwindigkeit' : null);
  }
  if (d <= step) {
    delete ship.coverageLeg;
    delete ship.flightLeg;
    ship.x = tx; ship.y = ty;
    game.recordShip(ship, 'dist', d);
    return true;
  }
  ship.vx = (dx / d) * speed;
  ship.vy = (dy / d) * speed;
  ship.x += (dx / d) * step;
  ship.y += (dy / d) * step;
  ship.angle = Math.atan2(dy, dx);
  game.recordShip(ship, 'dist', step);
  return false;
}

// ---------- Navigation über Wurmlöcher ----------
/**
 * Folgt dem geplanten Weg bis vor den letzten Leg (Zwischenziele, Wurmlochdurchflüge).
 * true, sobald nur noch der direkte Anflug aufs Ziel fehlt.
 */
function followNav(ship, key, tx, ty, dt, game) {
  if (ship.transit) { runTransit(ship, game); return false; }
  if (!ship.nav || ship.nav.key !== key) ship.nav = { key, legs: game.planLegs(ship, tx, ty).legs, i: 0 };
  const nav = ship.nav;
  while (nav.i < nav.legs.length - 1) {
    const leg = nav.legs[nav.i];
    ship.state = 'flying';
    if (!flyTo(ship, leg.x, leg.y, dt, game)) return false;
    if (leg.wh) { if(startTransit(ship,leg.wh.id,leg.wh.side,game))nav.i++;return false; }
    nav.i++;
  }
  return true;
}

/** Durchflug: Eingang auf Seite `side`, Austritt am anderen Ende nach WORMHOLE_TRANSIT Sekunden */
function startTransit(ship, whId, side, game) {
  const w = game.world.wormholes.get(whId);
  if (!w) return false;
  const player=game.players.get(ship.owner);
  if(game.profile==='homeworld'&&player&&!ship.queue[0]?.manualDirect&&![w.a,w.b].every(id=>pointCovered(game,player,game.world.entities.get(id)))){
    setWarn(ship,'coverage','Wurmlochtransit pausiert: beide Enden brauchen eigene Abdeckung.');ship.state='waiting';return false;
  }
  setWarn(ship,'coverage',null);
  ship.transit = { wh: whId, exit: side === 'a' ? w.b : w.a, until: game.time + WORLD.WORMHOLE_TRANSIT };
  ship.state = 'transit';
  ship.dockedAt = null;
  return true;
}

function runTransit(ship, game) {
  ship.state = 'transit';
  if (game.time < ship.transit.until) return;
  const exit = game.world.entities.get(ship.transit.exit);
  const wh = ship.transit.wh;
  ship.transit = null;
  if (!exit) return;
  const a = Math.random() * Math.PI * 2;
  ship.x = exit.x + Math.cos(a) * 260;
  ship.y = exit.y + Math.sin(a) * 260;
  ship.state = 'flying';
  game.onWormholeTransit(ship, wh, exit);
}

/** Fliegt zum Objekt (ggf. über Wurmlöcher). true, sobald angedockt. Zählt die Ankunft als Flug. */
function flyToEntity(ship, e, dt, game) {
  if (ship.dockedAt === e.id) return true;
  if (!followNav(ship, 'e:' + e.id, e.x, e.y, dt, game)) return false;
  const p = approachPoint(ship, e);
  ship.state = 'flying';
  if (flyTo(ship, p.x, p.y, dt, game)) {
    ship.dockedAt = e.id;
    ship.nav = null;
    game.recordShip(ship, 'f', 1);
    game.onDock(ship, e);
    return true;
  }
  return false;
}

/** Baut ab, liefert true, wenn nichts mehr abgebaut werden kann (voll / Menge erreicht / kein passendes Gerät). */
function mineStep(ship, e, dt, limit = Infinity) {
  if (e.kind !== 'belt') return true;
  return extract(ship, BELT_TYPES[e.type].good, (e.richness || 1), dt, limit);
}

function extract(ship, g, richness, dt, limit = Infinity) {
  const rate = miningRate(ship, g);
  if (!rate) return true;
  const free = Math.min(freeFor(ship, g), limit - (ship.cargo[g] || 0));
  if (free <= 0) return true;
  ship.state = 'mining';
  ship.mineAcc = (ship.mineAcc || 0) + rate * richness * dt;
  const n = Math.min(free, Math.floor(ship.mineAcc));
  if (n > 0) {
    ship.mineAcc -= n;
    ship.cargo[g] = (ship.cargo[g] || 0) + n;
    if (!SHIP_TYPES[ship.type].npc) { ship.mined ||= {}; ship.mined[g] = (ship.mined[g] || 0) + n; }
  }
  return Math.min(freeFor(ship, g), limit - (ship.cargo[g] || 0)) <= 0;
}

// ---------- Fehlerzähler und Warnungen ----------
export function setWarn(ship, key, msg) {
  ship.warn ||= {};
  if (msg) ship.warn[key] = msg;
  else delete ship.warn[key];
}

function actionKey(a, targetId) { return `${targetId}:${a.op}:${a.good || ''}`; }

function actionFailed(ship, key, msg, game) {
  ship.fails ||= {};
  const n = (ship.fails[key] || 0) + 1;
  ship.fails[key] = n;
  game.shipLog(ship, `Übersprungen: ${msg}`);
  if (n >= FAIL_WARN) setWarn(ship, 'fail', `${msg} (${n}× in Folge)`);
}

function actionOk(ship, key) {
  if (ship.fails?.[key]) {
    delete ship.fails[key];
    if (!Object.keys(ship.fails).length) setWarn(ship, 'fail', null);
  }
}

/**
 * Führt eine Handelsaktion aus (kaufen/verkaufen). Fehlschläge werden gezählt.
 * opts.auto: automatischer Einkauf (Stop-Loss greift), opts.routeId für die Routenstatistik.
 */
function doTrade(ship, e, a, game, opts = {}) {
  const key = actionKey(a, e.id);
  let amount = a.amount > 0
    ? (opts.route && a.op === 'buy' ? Math.max(0, a.amount - (ship.cargo[a.good] || 0)) : a.amount)
    : Infinity;
  if (amount === 0) { actionOk(ship, key); return; }
  if (a.op === 'buy' && freeFor(ship, a.good) <= 0) return;      // voll: nichts zu tun, kein Fehler
  if (a.op === 'sell' && !(ship.cargo[a.good] > 0)) return;      // nichts geladen: kein Fehler
  let destinationPlan;
  if (a.op==='buy' && opts.route?.onlyWithTargetSpace) {
    destinationPlan=planRoutePurchase(game,ship,opts.route,a.good,amount);
    amount=destinationPlan.reduce((n,r)=>n+r.amount,0);
    if(amount<=0){actionOk(ship,key);game.shipLog(ship,'Einkauf übersprungen: kein freier Platz an den Abladezielen.');return;}
  }
  const res = game.trade(ship, e, a.good, amount, a.op, a.limit || 0, opts);
  if(res.n>0 && destinationPlan)reserveRoutePurchase(ship,destinationPlan,res.n);
  if(res.n>0 && a.op==='sell' && opts.route?.onlyWithTargetSpace)releaseRouteDelivery(ship,e.id,a.good,res.n);
  if (res.n > 0) { actionOk(ship, key); return; }
  if (res.reason === 'stoploss') return; // Stop-Loss ist kein Fehler der Aktion, Warnung setzt trade()
  actionFailed(ship, key, `${a.op === 'buy' ? 'Kauf' : 'Verkauf'} ${GOODS[a.good].name} bei ${e.name}${res.reason ? ': ' + res.reason : ''}`, game);
}

/** Bedingung für "Warten bis" */
function waitCondMet(e, a) {
  const s = e.market?.goods[a.good];
  if (!s) return true;
  const v = a.cond.startsWith('stock') ? s.stock : slotPrice(a.good, s);
  return a.cond.endsWith('>=') ? v >= a.value : v <= a.value;
}

/**
 * Aktionen eines Stopps abarbeiten. Liefert true, wenn alle Aktionen erledigt sind.
 * st = Laufzeitzustand { actionIdx, waitStart }
 */
function runActions(ship, e, actions, st, dt, game, opts) {
  while (st.actionIdx < actions.length) {
    const a = actions[st.actionIdx];
    if (a.op === 'mine') {
      if (!mineStep(ship, e, dt)) return false;
      ship.state = 'docked';
    } else if (a.op === 'waitUntil') {
      st.waitStart ??= game.time;
      if (!waitCondMet(e, a)) {
        if (game.time - st.waitStart < (a.timeout || 600)) { ship.state = 'waiting'; return false; }
        actionFailed(ship, actionKey(a, e.id), `Warten auf ${GOODS[a.good]?.name || '?'} bei ${e.name}: Zeitlimit erreicht`, game);
      } else actionOk(ship, actionKey(a, e.id));
      st.waitStart = null;
      ship.state = 'docked';
    } else if (a.op === 'buy' || a.op === 'sell') {
      doTrade(ship, e, a, game, opts);
    } else if (a.op === 'refuel') {
      const key = actionKey(a, e.id);
      const res = game.refuel(ship, e, opts.route);
      if (res.ok) actionOk(ship, key);
      else if (res.reason !== 'voll') actionFailed(ship, key, `Tanken bei ${e.name}: ${res.reason}`, game);
    }
    st.actionIdx++;
  }
  return true;
}

// ---------- Befehlsqueue ----------
/** Ausführung je Befehlstyp. Rückgabe: true = erledigt, false = läuft noch */
const EXEC = {
  logistics(ship,c,dt,game){return runLogistics(ship,c,dt,game,flyToEntity);},
  move(ship, c, dt, game) {
    if (!followNav(ship, `p:${c.x},${c.y}`, c.x, c.y, dt, game)) return false;
    ship.state = 'flying';
    if (!flyTo(ship, c.x, c.y, dt, game)) return false;
    ship.nav = null;
    return true;
  },
  goto(ship, c, dt, game) {
    const e = game.world.entities.get(c.target);
    if (!e) return true;
    if (c.viaWh) {
      if (ship.transit) { runTransit(ship, game); return !ship.transit; }
      return true;
    }
    if (!flyToEntity(ship, e, dt, game)) return false;
    if (e.kind === 'wormhole') {
      // Wurmloch als Ziel: hindurchfliegen
      c.viaWh = startTransit(ship, e.wh, game.world.wormholes.get(e.wh)?.a === e.id ? 'a' : 'b', game);
      return false;
    }
    ship.state = 'docked';
    if (!c.arrived) { c.arrived = true; game.shipLog(ship, `Angekommen bei ${e.name}`); }
    return true;
  },
  dock(ship, c, dt, game) {
    const e = game.world.entities.get(c.target);
    if (!e) return true;
    if (!flyToEntity(ship, e, dt, game)) return false;
    if(game.profile==='homeworld'&&!c.manualDirect&&!pointCovered(game,game.players.get(ship.owner),e)){setWarn(ship,'coverage','Dockaktionen pausiert: eigene Abdeckung fehlt.');ship.state='waiting';return false;}
    ship.state = 'docked';
    c.actionIdx ??= 0;
    return runActions(ship, e, c.actions || [], c, dt, game, { auto: false, manual: !!c.manualDirect });
  },
  mine(ship, c, dt, game) {
    const e = game.world.entities.get(c.target);
    if (!e) return true;
    if (!flyToEntity(ship, e, dt, game)) return false;
    if(game.profile==='homeworld'&&!c.manualDirect&&!pointCovered(game,game.players.get(ship.owner),e)){setWarn(ship,'coverage','Abbau pausiert: eigene Abdeckung fehlt.');ship.state='waiting';return false;}
    if (mineStep(ship, e, dt)) {
      ship.state = 'docked';
      game.shipLog(ship, `Laderaum voll (${e.name})`);
      return true;
    }
    return false;
  },
  /** Nebelgas in einer Plasmawolke sammeln (Gaskollektor) */
  harvest(ship, c, dt, game) {
    if (!followNav(ship, `p:${c.x},${c.y}`, c.x, c.y, dt, game)) return false;
    if (Math.hypot(c.x - ship.x, c.y - ship.y) > 1) {
      ship.state = 'flying';
      if (!flyTo(ship, c.x, c.y, dt, game)) return false;
      ship.nav = null;
    }
    const zone = game.world.zonesNear(ship.x, ship.y).find((z) => ZONE_TYPES[z.type].mining && inZoneAt(z, ship));
    if (!zone) { game.shipLog(ship, 'Hier gibt es nichts zu sammeln.'); return true; }
    if (extract(ship, ZONE_TYPES[zone.type].mining, 1, dt)) {
      ship.state = 'idle';
      game.shipLog(ship, 'Sammeln beendet (voll oder kein Gaskollektor)');
      return true;
    }
    return false;
  },
  wait(ship, c, dt, game) {
    c.until ??= game.time + c.secs;
    ship.state = ship.dockedAt ? 'docked' : 'idle';
    return game.time >= c.until;
  },
  route(ship, c, dt, game) { return runRoute(ship, c, dt, game); },
  supply(ship, c, dt, game) { return runSupply(ship, c, dt, game); },
};

export function updateShip(ship, dt, game) {
  ship.vx = 0;
  ship.vy = 0;
  if(ship.relocationHold&&ship.queue.length){
    const hold=ship.relocationHold;
    if(ship.transit){runTransit(ship,game);if(ship.transit)return;hold.x=ship.x;hold.y=ship.y;}
    if(hold.state==='finishing'&&(Math.hypot(ship.x-hold.x,ship.y-hold.y)<1||flyTo(ship,hold.x,hold.y,dt,game))){hold.state='waiting';ship.nav=null;delete ship.coverageLeg;}
    ship.state=hold.state==='waiting'?'waiting':ship.state;
    setWarn(ship,'relocation','Standorttransfer: begonnener Abschnitt endet sicher; danach Fortsetzung ausdrücklich freigeben.');return;
  }
  const q = ship.queue;
  // Mehrere sofort erledigte Befehle (z.B. Handel am selben Ort) in einem Tick abarbeiten
  for (let guard = 0; guard < 8; guard++) {
    const c = q[0];
    if (!c) {
      ship.state = ship.dockedAt ? 'docked' : 'idle';
      return;
    }
    const done = EXEC[c.t] ? EXEC[c.t](ship, c, dt, game) : true;
    if (!done) return;
    if (q[0] === c) q.shift();
    dt = 0;
  }
}

/** Routenvorlage abfahren. c = { route, rounds, done, idx, phase, actionIdx } */
function runRoute(ship, c, dt, game) {
  const route = game.routes.get(c.route);
  if (!route || !route.stops.length) return true;
  c.idx ??= 0; c.phase ??= 'travel'; c.done ??= 0;
  if (c.idx >= route.stops.length) c.idx = 0;
  const stop = route.stops[c.idx];
  const e = game.world.entities.get(stop.targetId);
  const next = () => {
    c.idx++;
    c.phase = 'travel';
    if (c.idx >= route.stops.length) {
      c.idx = 0;
      c.done++;
    }
  };
  if (!e) { next(); return false; }

  if (c.phase === 'travel') {
    if (route.paused) { ship.state = ship.dockedAt ? 'docked' : 'idle'; return false; }
    if (!flyToEntity(ship, e, dt, game)) return false;
    c.phase = 'act';
    c.actionIdx = 0;
    c.waitStart = null;
  }
  if (c.phase === 'act') {
    const player=game.players.get(ship.owner);
    if(game.profile==='homeworld'&&player&&!pointCovered(game,player,e)){
      setWarn(ship,'coverage','Routenaktionen pausiert: eigene Leitstellenabdeckung fehlt.');ship.state='waiting';return false;
    }
    setWarn(ship,'coverage',null);
    ship.state = 'docked';
    if (!runActions(ship, e, stop.actions, c, dt, game, { auto: true, route })) return false;
    c.phase = 'wait';
    c.waitUntil = game.time + 2;
  }
  if (c.phase === 'wait') {
    ship.state = 'docked';
    if (game.time < c.waitUntil) return false;
    next();
    if (c.rounds > 0 && c.done >= c.rounds && c.idx === 0) {
      game.shipLog(ship, `Route ${route.name}: ${c.rounds} Runde(n) abgeschlossen`);
      return true;
    }
  }
  return false;
}

/** NPC-Versorger bzw. -Abholer: Quelle anfliegen, die bemessene Menge laden/abbauen, zum Ziel, entladen. */
function runSupply(ship, o, dt, game) {
  if (game.world.entities.get(o.stationId)?.kind === 'planet' && game.world.entities.get(o.deliveryTargetId)?.type === 'hub') {
    delete o.deliveryTargetId;
    o.phase = 'toStation';
    ship.nav = null;
  }
  const station = game.world.entities.get(o.deliveryTargetId||o.stationId);
  if(!station&&o.real){ship.state='waiting';setWarn(ship,'delivery','Lieferziel fehlt; bezahlte Fracht bleibt an Bord.');return false;}
  if (!station) { game.removeShip(ship); return true; }
  if (o.phase === 'toSource') {
    const src = game.world.entities.get(o.sourceId);
    // Saved NPC planet orders must also stop buying from the synthetic hub.
    // Return home through normal settlement so escrow and paid cargo survive.
    if (src?.type === 'hub' && game.world.entities.get(o.stationId)?.kind === 'planet') {
      o.phase = 'toStation';
      ship.nav = null;
      return false;
    }
    if (!src) { o.phase = 'toStation'; return false; }
    if (!flyToEntity(ship, src, dt, game)) return false;
    if(o.real){if(loadRealSupply(game,ship,src,o)===false)return false;o.phase='toStation';}
    else if (src.kind === 'belt') {
      if (!mineStep(ship, src, dt, o.amount ?? Infinity)) return false;
    } else {
      const slot = src.market?.goods[o.good];
      const n = slot ? Math.min(freeFor(ship, o.good), Math.floor(availableHomeStock(src.market, o.good)), o.amount ?? Infinity) : 0;
      const prop = game.ownership.get(src.id);
      if (n > 0 && prop) {
        sellToSupplierImpl(game, src, prop, o.good, n);
        ship.cargo[o.good] = (ship.cargo[o.good] || 0) + n;
        stat(src.market, game.time, 'o', o.good, n);
      } else if (n > 0) {
        slot.stock -= n;
        ship.cargo[o.good] = (ship.cargo[o.good] || 0) + n;
        stat(src.market, game.time, 'o', o.good, n);
      }
    }
    o.phase = 'toStation';
  }
  if (!flyToEntity(ship, station, dt, game)) return false;
  const result=game.finishSupply(ship, station);
  return result!==false;
}
