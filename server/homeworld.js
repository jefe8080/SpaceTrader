import { GOODS, RECIPES, PILOT_LICENSES,propertyBasePrice } from '../shared/config.js';
import { HOMEWORLD, HOME_QUESTS, availableHomeStock } from '../shared/homeworld.js';
import { hexAt, hexKey } from '../shared/hex.js';
import { rng, hashN } from './worldgen.js';
import { newProperty } from './property.js';
import { grantRelic } from './relic.js';
import {stat} from './markets.js';
import { tickHomeOperations, homeAccess, homeConstructionError } from './homeworld-operations.js';
import {advancedQuestReady,completeAdvancedQuest} from './homequests.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const done = (player, id) => !!player.homeQuest?.completed[id];
const plantDone = (home, id) => home.facilities[id]?.status === 'ready';
const emitHome = (game, entity) => { entity.market.rev = (entity.market.rev || 0) + 1; game.emit('entity', entity); };

export function ringCoordinates(ring) {
  const out = [];
  for (let q = -ring; q <= ring; q++) for (let r = -ring; r <= ring; r++) {
    if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) === ring) out.push({ q, r });
  }
  return out;
}

function clearPosition(world, system, center, r, minRadius, maxRadius, extra = []) {
  const neighbors = world.sectorEntities(system.sector);
  for (let i = 0; i < 200; i++) {
    const angle = r() * Math.PI * 2, radius = minRadius + r() * (maxRadius - minRadius);
    const point = { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
    if (distance(point, system) < 650) continue;
    if (neighbors.some((other) => distance(point, other) < (other.radius || 100) + 400)) continue;
    if (extra.some((other) => distance(point, other) < 650)) continue;
    const hex = hexAt(point.x, point.y);
    if (hexKey(hex.q, hex.r) !== system.sector) continue;
    return point;
  }
  return null;
}

function selectSite(game, player) {
  const random = rng(hashN(game.world.seed, Number(player.id.slice(1)), 501));
  const homes = [...game.world.entities.values()].filter((e) => e.type==='ruins'&&!e.ruinsSite||e.colony?.owner);
  const used = new Set(homes.flatMap(e=>[e.system,e.market?.homeworld?.warp?.target.system].filter(Boolean)));
  for (let outer = 2; outer < 1000; outer++) {
    const coordinates = outer === 2 ? [...ringCoordinates(1), ...ringCoordinates(2)] : ringCoordinates(outer);
    // Fisher–Yates keeps the preferred two rings random and reproducible.
    for (let i = coordinates.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [coordinates[i], coordinates[j]] = [coordinates[j], coordinates[i]]; }
    for (const { q, r } of coordinates) {
      game.world.ensureSector(q, r);
      const sector = game.world.sectors.get(hexKey(q, r));
      for (const system of sector.systems) {
        if (used.has(system.id) || system.faction || system.start) continue;
        const point = clearPosition(game.world, system, system, random, 1000, 3000);
        if (!point || homes.some((other) => distance(point, other) < HOMEWORLD.placement.minDistance||other.market?.homeworld?.warp&&distance(point,other.market.homeworld.warp.target)<HOMEWORLD.placement.minDistance)) continue;
        const resources = [];
        let suitable = true;
        for (const good of HOMEWORLD.placement.resources) {
          const existing = game.world.sectorEntities(system.sector).find((e) => e.system === system.id && e.market?.goods[good]?.role === 'produce' && distance(e, point) <= HOMEWORLD.placement.maxResourceDistance);
          if (existing) { resources.push({ good, existing }); continue; }
          const source = clearPosition(game.world, system, point, random, 1600, 5300, resources.filter((e) => e.point).map((e) => e.point));
          if (!source) { suitable = false; break; }
          resources.push({ good, point: source });
        }
        if (suitable) return { system, point, resources };
      }
    }
  }
  throw new Error('Kein geeigneter Heimatstandort gefunden.');
}

export function createHomeworld(game, player) {
  if (player.homeworld) return game.world.entities.get(player.homeworld);
  const site = selectSite(game, player), id = `home_${player.id}`;
  const facilities = Object.fromEntries(['dock', 'control', 'workshop', ...HOMEWORLD.start.basicPlants].map((key) => [key, { status: 'ruined', progress: 0 }]));
  const home = {
    owner: player.id, population: HOMEWORLD.start.population, workers: structuredClone(HOMEWORLD.start.workers), housing: HOMEWORLD.start.housing,
    power: HOMEWORLD.start.power, storage: HOMEWORLD.start.storage, hazardStorage: 0, plots: HOMEWORLD.start.plots,
    facilities, produced: {}, suppliedSeconds: 0, controlLevel: 0, projects: [],
    bootstrap: structuredClone(HOMEWORLD.start.repairs), grants: [{ id: `${id}:repairs`, source: 'start_exception', recipient: player.id, goods: structuredClone(HOMEWORLD.start.repairs) }],
  };
  const goods = Object.fromEntries(Object.keys(GOODS).map((good) => [good, { role: 'trade', rate: 0, stock: 0, cap: GOODS[good].cls === 'hazard' ? 0 : HOMEWORLD.start.storage, mod: 1 }]));
  const entity = { id, name: `${player.name}s Heimat`, kind: 'planet', type: 'ruins', radius: 100, size: 1, noBuy: true,
    ...site.point, sector: site.system.sector, system: site.system.id,
    market: { strategy: 'homeworld', goods, owner: player.id, mode: 'private', eff: 1, homeworld: home } };
  home.fixedSiteBase=propertyBasePrice(entity);
  player.homeworld = id;
  player.homeQuest = { completed: {}, landed: false, journal: [{ id: 'H00', at: game.time,
    speaker: 'Mira', text: 'Wir sehen dein Signal. Der alte Landeplatz hält noch – wenn du uns herunterfindest.' }] };
  game.world.addEntity(entity);
  const prop = newProperty(id, player.id, game.time); prop.mode = 'private'; prop.personal = true;
  game.ownership.set(id, prop);
  entity.ownerName = player.name; entity.ownerColor = player.color;
  const resourceTypes = { ice: 'ice', grain: 'agrar', gas: 'gasgiant', helium3: 'gasgiant', crude: 'ocean', ore: 'mining' };
  const rates = { ice: 1.2, grain: 1.2, gas: 1.4, helium3: 0.6, crude: 1, ore: 1 };
  for (const resource of site.resources) {
    if (resource.existing) continue;
    const good = resource.good;
    game.world.addEntity({ id: `${id}_source_${good}`, name: `${GOODS[good].name} – ${site.system.name}`, kind: 'planet',
      type: resourceTypes[good], radius: 80, size: 1, ...resource.point, sector: entity.sector, system: entity.system,
      market: { strategy: 'homeResource', eff: 0.25, provenance:[{id:`${id}_source_${good}:natural`,source:'natural_reserve',good,amount:150}], goods: { [good]: { role: 'produce', rate: rates[good], cap: 600, stock: 150, mod: 1 },
        food: { role: 'consume', rate: 0.02, cap: 100, stock: 0, mod: 1 } } } });
  }
  player.credits = HOMEWORLD.start.credits;
  const ship = game.spawnShip(player, HOMEWORLD.start.ship, entity);
  home.grants.push({id:`${entity.id}:start-ship`,source:'start_exception',recipient:player.id,ship:ship.id,fuel:ship.fuel});
  ship.dockedAt = null; ship.state = 'idle';
  player.manualShip = ship.id;
  game.revealAround(player, entity.x, entity.y, HOMEWORLD.placement.maxResourceDistance + 1000);
  game.discover(player, 'sector', entity.sector); game.discover(player, 'system', entity.system); game.discover(player, 'visit', entity.sector);
  game.world.sectors.get(entity.sector).firstVisit ||= player.id;
  return entity;
}

export function ownHome(game, player, entity) {
  return entity?.type === 'ruins' && entity.market?.homeworld?.owner === player.id;
}

export function homePresent(game, player, entity) {
  return game.shipsOf(player.id).some((ship) => ship.dockedAt === entity.id);
}

function availableGoods(game, player, entity, good) {
  const home = entity.market.homeworld;
  return (home.bootstrap[good] || 0) + availableHomeStock(entity.market, good)
    + game.shipsOf(player.id).filter((ship) => ship.dockedAt === entity.id).reduce((sum, ship) => sum + (ship.cargo[good] || 0), 0);
}

function takeGoods(game, player, entity, costs) {
  for (const [good, amount] of Object.entries(costs)) {
    let remaining = amount;
    const home = entity.market.homeworld;
    const fromBootstrap = Math.min(remaining, home.bootstrap[good] || 0);
    home.bootstrap[good] = (home.bootstrap[good] || 0) - fromBootstrap; remaining -= fromBootstrap;
    const slot = entity.market.goods[good];
    const fromStock = Math.min(remaining, availableHomeStock(entity.market, good));
    if (slot) slot.stock -= fromStock; remaining -= fromStock;
    for (const ship of game.shipsOf(player.id)) {
      if (ship.dockedAt !== entity.id || !remaining) continue;
      const n = Math.min(remaining, ship.cargo[good] || 0);
      ship.cargo[good] -= n; remaining -= n;
      if (!ship.cargo[good]) delete ship.cargo[good];
    }
  }
}

export function repairHome(game, player, entity, facility) {
  const accessError=homeAccess(game,player,entity);if(accessError)return accessError;
  const home = entity.market.homeworld, building = home.facilities[facility];
  if (!building) return 'Unbekannte Grundanlage.';
  if (building.status !== 'ruined') return 'Diese Anlage ist bereits repariert oder im Bau.';
  const required = facility === 'dock' ? 'H00' : ['waterworks', 'foodplant'].includes(facility) ? 'H01' : ['control', 'fueldepot'].includes(facility) ? 'H02' : 'H03';
  if (!done(player, required)) return `Zuerst ${required} abschließen.`;
  if (facility === 'workshop') return 'Die erste Antriebswerkstatt wird durch H04 freigeschaltet.';
  const teamError=homeConstructionError(home);if(teamError)return teamError;
  const cost = facility === 'dock' ? { credits: 0, goods: { ingots: 4 }, seconds: 15 }
    : facility === 'control' ? { credits: 500, goods: { ingots: 4 }, seconds: 30 } : HOMEWORLD.industry.repair;
  if (player.credits < cost.credits) return 'Nicht genug Credits.';
  for (const [good, n] of Object.entries(cost.goods)) if (availableGoods(game, player, entity, good) < n) return `Es fehlen ${n - availableGoods(game, player, entity, good)} ${GOODS[good].name}.`;
  takeGoods(game, player, entity, cost.goods); player.credits -= cost.credits;
  building.status = 'building'; building.readyAt = game.time + cost.seconds;
  building.bound = { credits: cost.credits, goods: structuredClone(cost.goods) };
  emitHome(game, entity);
}

export function homeQuestReady(game, player, entity, id) {
  const home = entity.market.homeworld;
  if (!HOME_QUESTS[id] || done(player, id) || !HOME_QUESTS[id].requires.every((q) => done(player, q))) return false;
  switch (id) {
    case 'H00': return player.homeQuest.landed;
    case 'H01': return plantDone(home, 'dock');
    case 'H02': return plantDone(home, 'waterworks') && plantDone(home, 'foodplant') && (home.produced.water || 0) >= 20 && (home.produced.food || 0) >= 10;
    case 'H03': return home.controlLevel >= 1 && plantDone(home, 'fueldepot') && [...game.routes.values()].some((route) => route.owner === player.id && route.stops.length && route.stops.every((stop) => game.world.entities.get(stop.targetId)?.system === entity.system));
    case 'H04': return player.homeQuest.salvage?.phase === 'workshop' && plantDone(home, 'workshop');
    case 'H05': return home.suppliedSeconds >= 600;
    case 'H06': return plantDone(home, 'refinery') && plantDone(home, 'smelter') && (home.produced.ingots || 0) >= 40;
    default: return advancedQuestReady(game,player,entity,id);
  }
}

export function completeHomeQuest(game, player, entity, id) {
  if (!ownHome(game, player, entity) || player.homeworld !== entity.id) return 'Kein eigener Hauptqueststandort.';
  if (!homePresent(game, player, entity)) return 'Ein eigenes Schiff muss hier angedockt sein.';
  const accessError=homeAccess(game,player,entity);if(accessError)return accessError;
  if(Number(id.slice(1))>=7)return completeAdvancedQuest(game,player,entity,id);
  if (!homeQuestReady(game, player, entity, id)) return 'Voraussetzungen noch nicht erfüllt oder Belohnung bereits abgeholt.';
  if (id === 'H05' && game.shipsOf(player.id).length >= PILOT_LICENSES[player.pilot || 1].maxShips) return 'Schiffslimit erreicht. Für den zweiten Frachter wird ein freier Lizenzplatz benötigt.';
  const salvagePosition = id === 'H02' ? clearPosition(game.world, game.world.systems.get(entity.system), entity,
    rng(hashN(game.world.seed, Number(player.id.slice(1)), 504)), 1600, 4500) : null;
  if (id === 'H02' && !salvagePosition) return 'Aktuell kein freier Bergungsstandort. Bitte erneut versuchen.';
  const quest = HOME_QUESTS[id], home = entity.market.homeworld;
  player.homeQuest.completed[id] = { at: game.time };
  player.homeQuest.journal.push({ id, at: game.time, text: `${quest.title}: abgeschlossen.` });
  player.credits += quest.credits; game.addXp(player, quest.xp);
  if (id === 'H01') {
    for (const [good, n] of Object.entries(home.bootstrap)) entity.market.goods[good].stock += n;
    home.bootstrap = {};
    for (const [good, n] of Object.entries(HOMEWORLD.start.supplies)) entity.market.goods[good].stock += n;
    home.grants.push({ id: `${entity.id}:supplies`, source: 'start_exception', recipient: player.id, goods: structuredClone(HOMEWORLD.start.supplies) });
  }
  if (id === 'H02') {
    const wreck = { id: `${entity.id}_relic_wreck`, kind: 'station', type: 'wreck', name: 'Wrack ohne Kennung', radius: 65,
      ...salvagePosition, sector: entity.sector, system: entity.system, noBuy: true, salvageOwner: player.id };
    game.world.addEntity(wreck);
    player.homeQuest.salvage = { id: `${player.id}:relic:H04`, wreck: wreck.id, phase: 'available' };
    game.revealAround(player, wreck.x, wreck.y, 1000);
  }
  if (id === 'H04') { grantRelic(game, player, entity); player.homeQuest.salvage.phase = 'complete'; }
  if (id === 'H05') {
    const ship = game.spawnShip(player, 'spatz', entity);
    home.grants.push({ id: `${entity.id}:second-ship`, source: 'quest_H05', recipient: player.id, ship: ship.id, fuel:ship.fuel });
  }
  if (id === 'H06') {
    home.hazardStorage = HOMEWORLD.start.hazardStorage;
    home.moduleBlueprints = ['cabin', 'shielded'];
    player.moduleBlueprints=[...new Set([...(player.moduleBlueprints||[]),...home.moduleBlueprints])];
    for (const [good, slot] of Object.entries(entity.market.goods)) if (GOODS[good].cls === 'hazard') slot.cap = home.hazardStorage;
  }
  emitHome(game, entity);
}

export function tickHomeworld(game, entity, dt) {
  tickHomeOperations(game, entity, dt);
}

export function tickHomeResource(entity, dt, now=0) {
  const market = entity.market, food = market.goods.food;
  const supplied = food.stock >= food.rate * dt;
  market.eff = supplied ? 1 : HOMEWORLD.industry.unsuppliedExtraction;
  const consumed=Math.min(food.stock,food.rate*dt);food.stock-=consumed;stat(market,now,'c','food',consumed);
  for (const [good,slot] of Object.entries(market.goods)) if (slot.role === 'produce') {const amount=Math.max(0,Math.min(slot.cap-slot.stock,slot.rate*market.eff*dt));slot.stock+=amount;stat(market,now,'p',good,amount);}
}
