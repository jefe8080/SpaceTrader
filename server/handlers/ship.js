import { GOODS, FLAGSHIP } from '../../shared/config.js';
import { V, CmdError } from './validate.js';
import { tradeAction } from './route.js';
import { pointCovered, manualActionError, coveredPath, controlAdmissionCapacity } from '../coverage.js';
import { isFollower, detachShip } from '../war/stacks.js';

const MAX_QUEUE = 30;
const isDirect=(player,ship,cmd,append)=>player.manualShip===ship.id&&!append&&!['route','harvest'].includes(cmd.t)&&(cmd.t!=='dock'||(cmd.actions?.length||0)<=1);

export function batchOrderError(game,ships,cmd,append,routeOverride){
  for(const ship of ships){const error=orderError(game,ship,cmd,append,routeOverride);if(error)return error;}
  if(game.profile!=='homeworld'||!ships.length)return null;
  const player=game.players.get(ships[0].owner),active=new Set(game.shipsOf(player.id).filter(s=>s.queue.some(c=>!c.manualDirect)).map(s=>s.id));
  const previous=active.size;
  for(const ship of ships){if(!isDirect(player,ship,cmd,append))active.add(ship.id);else if(!append)active.delete(ship.id);}
  return active.size>previous&&active.size>controlAdmissionCapacity(game,player)?'Die gleichzeitige Auftragskapazität deiner Leitstellen ist ausgeschöpft; Versorgung kann neue Aufträge begrenzen.':null;
}

/** Ein Queue-Befehl vom Client -> bereinigter Befehl */
const queueCmd = (v, ctx) => {
  const t = V.oneOf('move', 'goto', 'dock', 'mine', 'wait', 'route', 'harvest')(v?.t);
  switch (t) {
    case 'move':
    case 'harvest': return { t, x: V.num(-1e9, 1e9)(v.x), y: V.num(-1e9, 1e9)(v.y) };
    case 'goto': return { t, target: V.entity()(v.target, ctx).id };
    case 'mine': {
      const e = V.entity()(v.target, ctx);
      if (e.kind !== 'belt') throw new CmdError('Abbau nur in Asteroidenfeldern möglich.');
      return { t, target: e.id };
    }
    case 'dock': {
      const e = V.entity()(v.target, ctx);
      const actions = V.arr(tradeAction, 8)(v.actions ?? []).filter((a) => a.op !== 'mine' && a.op !== 'waitUntil');
      for (const a of actions) {
        if (a.op === 'refuel') { if (!e.market?.goods.shipfuel) throw new CmdError(`Bei ${e.name} gibt es keinen Schiffstreibstoff.`); continue; }
        if (!e.market?.goods[a.good]) throw new CmdError(`${GOODS[a.good].name} wird bei ${e.name} nicht gehandelt.`);
      }
      return { t, target: e.id, actions };
    }
    case 'wait': return { t, secs: V.int(1, 86400)(v.secs) };
    case 'route': return { t, route: V.ownRoute()(v.route, ctx).id, rounds: V.opt(V.int(0, 1000), 0)(v.rounds) };
  }
};

/** Befehl an Schiff übergeben: ersetzen oder anhängen */
export function orderError(game, ship, cmd, append, routeOverride) {
  const player = game.players.get(ship.owner);
  if (ship.captive) return `${ship.name} ist in Gefangenschaft und nimmt keine Befehle an.`;
  if (ship.battle) return `${ship.name} kämpft; Befehle gibt es in der Schlachtansicht.`;
  if (game.profile === 'homeworld') {
    if (player?.relic?.operation?.ship === ship.id) return 'Das Schiff ist für die laufende Reliktarbeit gesperrt.';
    if (ship.relicSpeed && (cmd.t === 'route' || cmd.t === 'harvest' || append || (cmd.t === 'dock' && cmd.actions?.length > 1))) return 'Der Reliktträger unterstützt keine Automatisierung oder Befehlsfolgen.';
    const target = cmd.t === 'attack' || cmd.t === 'join' ? game.ships.get(cmd.target) || ship : cmd.target ? game.world.entities.get(cmd.target) : cmd.x !== undefined ? cmd : ship;
    if(target?.market?.homeworld?.warp)return 'Standort während Warpvorbereitung für Anlieferungen gesperrt.';
    const error = manualActionError(game, player, ship, target);
    if (error) return error;
    if (!pointCovered(game, player, ship) || !pointCovered(game, player, target)) {
      if (append || cmd.t === 'route' || cmd.t === 'harvest' || (cmd.t === 'dock' && cmd.actions?.length > 1)) return 'Außerhalb der Abdeckung sind nur einzelne manuelle Direktbefehle erlaubt.';
    }
    const direct=isDirect(player,ship,cmd,append);
    if(!direct){
      if(cmd.t==='goto'&&target?.kind==='wormhole'){
        const wormhole=game.world.wormholes.get(target.wh);
        if(!player.known.wh.has(target.wh)||!wormhole||![wormhole.a,wormhole.b].every(id=>pointCovered(game,player,game.world.entities.get(id))))return 'Automatischer Wurmlochtransit braucht bekannte und beidseitig abgedeckte Enden.';
      }
      let from=ship;
      if(append&&ship.queue.length){
        const tail=ship.queue.at(-1),route=game.routes.get(tail.route);
        from=game.world.entities.get(tail.target||route?.stops.at(-1)?.targetId)||(tail.x!==undefined?tail:ship);
      }
      if(cmd.t==='route'){
        const route=routeOverride||game.routes.get(cmd.route);
        const targets=route?.stops.map(s=>game.world.entities.get(s.targetId))||[];
        if(!targets.length)return 'Die Route hat keine erreichbaren Stopps.';
        for(const to of [...targets,targets[0]]){if(!to||!Number.isFinite(coveredPath(game,player,from,to,game.shipSpeed(ship)).time))return 'Die Route verlässt die durchgängige eigene Leitstellenabdeckung.';from=to;}
      }else if(!Number.isFinite(coveredPath(game,player,from,target,game.shipSpeed(ship)).time))return 'Die Flugstrecke ist nicht durchgängig von eigenen Leitstellen abgedeckt.';
      const active=game.shipsOf(player.id).filter(s=>s.id!==ship.id&&s.queue.some(c=>!c.manualDirect)).length;
      if(active>=controlAdmissionCapacity(game,player)&&!ship.queue.some(c=>!c.manualDirect))return 'Die gleichzeitige Auftragskapazität deiner Leitstellen ist ausgeschöpft; Versorgung kann neue Aufträge begrenzen.';
    }
  }
  if (cmd.t === 'route' && ship.main) return `${ship.name} ist dein Hauptschiff und fährt keine Routen.`;
  if(append&&ship.queue.length>=MAX_QUEUE)return `Queue von ${ship.name} ist voll (max. ${MAX_QUEUE}).`;
}

export function giveOrder(game, ship, cmd, append) {
  const error=orderError(game,ship,cmd,append);if(error)return error;
  // PRD 15: Ein eigener Bewegungsbefehl löst ein gewähltes Mitglied aus seinem Stack
  if (ship.stack && isFollower(game, ship)) detachShip(game, ship);
  // Neuer manueller Auftrag ersetzt eine gespeicherte Fortsetzung
  if (!append) delete ship.resume;
  if(game.profile==='homeworld')cmd={...cmd,manualDirect:isDirect(game.players.get(ship.owner),ship,cmd,append)};
  const c = { ...cmd, qid: ++ship.qid };
  if (!append) {
    delete ship.relocationHold;
    delete ship.flightLeg;
    ship.nav=null;delete ship.coverageLeg;delete ship.coverageTransit;
    ship.queue = [c];
    ship.fails = {};
    ship.warn = {};
  } else {
    if (ship.queue.length >= MAX_QUEUE) return `Queue von ${ship.name} ist voll (max. ${MAX_QUEUE}).`;
    ship.queue.push(c);
  }
}

export default {
  order: {
    args: { ships: V.ownShips(), order: queueCmd, append: V.bool() },
    run({ game }, { ships, order, append }) {
      const error=batchOrderError(game,ships,order,append);if(error)return error;
      for (const s of ships) {
        const err = giveOrder(game, s, order, append);
        if (err) return err;
      }
    },
  },
  queueRemove: {
    args: { ship: V.ownShip(), qid: V.int(0, 1e9) },
    run(ctx, { ship, qid }) {
      ship.queue = ship.queue.filter((c) => c.qid !== qid);
    },
  },
  queueMove: {
    args: { ship: V.ownShip(), qid: V.int(0, 1e9), dir: V.oneOf(-1, 1) },
    run(ctx, { ship, qid, dir }) {
      const q = ship.queue;
      const i = q.findIndex((c) => c.qid === qid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= q.length) return;
      [q[i], q[j]] = [q[j], q[i]];
      // Laufzeitzustand des bisher ersten Befehls verwerfen, damit er neu beginnt
      for (const c of [q[i], q[j]]) { delete c.actionIdx; delete c.until; delete c.arrived; }
    },
  },
  stop: {
    args: { ships: V.ownShips() },
    run(ctx, { ships }) { for (const s of ships) { s.queue = []; s.warn = {}; s.fails = {}; delete s.relocationHold;delete s.coverageLeg;delete s.flightLeg;s.nav=null; } },
  },
  shipSettings: {
    args: { ship: V.ownShip(), marker: V.opt(V.color()), autoRefuel: V.opt(V.num(0, 0.95)) },
    run(ctx, { ship, marker, autoRefuel }) {
      if (marker !== undefined) ship.marker = marker;
      if (autoRefuel !== undefined) ship.autoRefuel = Math.round(autoRefuel * 100) / 100;
    },
  },
  refuel: {
    args: { ship: V.ownShip() },
    run({ game }, { ship }) {
      const e = game.world.entities.get(ship.dockedAt);
      if (!e) return 'Schiff ist nicht angedockt.';
      const res = game.refuel(ship, e);
      if (!res.ok) return `Tanken nicht möglich: ${res.reason}`;
    },
  },
  clearWarn: {
    args: { ship: V.ownShip() },
    run(ctx, { ship }) { ship.warn = {}; ship.fails = {}; },
  },
  rename: {
    args: { ship: V.ownShip(), name: V.str(24, 1) },
    run({ game, player }, { ship, name }) {
      const taken = game.shipsOf(player.id).some((s) => s.id !== ship.id && s.name.toLowerCase() === name.toLowerCase());
      if (taken) return 'Diesen Namen trägt schon ein anderes deiner Schiffe.';
      ship.name = name;
    },
  },
  /** Hauptschiff ernennen (ship) oder abberufen (ship = null), 5 min Sperre nach jeder Änderung */
  flagship: {
    args: { ship: V.opt(V.ownShip(), null) },
    run({ game, player }, { ship }) {
      if (game.profile === 'homeworld') return 'Wähle das aktive manuelle Schiff; den Reliktantrieb wechselst du ausschließlich in einer eigenen Werkstatt.';
      const wait = (player.flagshipAt ?? -Infinity) + FLAGSHIP.COOLDOWN - game.time;
      if (wait > 0) return `Das Hauptschiff kannst du erst in ${Math.ceil(wait / 60)} min wieder wechseln.`;
      const cur = game.shipsOf(player.id).find((s) => s.main);
      if (cur === ship || (!cur && !ship)) return;
      if (cur) { cur.main = false; cur.nav = null; game.shipLog(cur, 'Als Hauptschiff abberufen'); }
      if (ship) {
        ship.main = true;
        ship.nav = null; // Weg mit neuer Geschwindigkeit planen
        ship.queue = ship.queue.filter((c) => c.t !== 'route');
        game.shipLog(ship, 'Zum Hauptschiff ernannt: Tempo ×4, Verbrauch ×4 pro Sekunde, keine Routen');
      }
      player.flagshipAt = game.time;
    },
  },
  jettison: {
    args: { ship: V.ownShip(), good: V.key(GOODS) },
    run({ game }, { ship, good }) {
      if(game.profile==='homeworld'&&GOODS[good].cls==='passenger')return 'Personen können nicht abgeworfen werden. An einem bewohnten Standort aussteigen lassen.';
      if (!ship.cargo[good]) return;
      game.shipLog(ship, `${ship.cargo[good]} ${GOODS[good].name} abgeworfen`);
      delete ship.cargo[good];
    },
  },
};
