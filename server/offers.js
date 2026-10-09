import { WORLD, CONSORTIUM, SHIP_TYPES, SHIP_CLASSES, PILOT_LICENSES, RANK_NAMES, FACTIONS, factionRank } from '../shared/config.js';
import { hexAt, hexKey } from '../shared/hex.js';
import { consortiumOf, clog } from './consortium.js';
import { SECTOR_CELLS } from './quests.js';

/**
 * Karten- und Schiffshandel innerhalb eines Konsortiums (PRD-3 4.5 und 4.6).
 * Käufer zahlen aus dem Privatgeld, Verkäufer erhalten 90 %, der Pool ist nicht beteiligt.
 */

/** Sektor einer Nebelzelle */
export function cellSector(k) {
  const [cx, cy] = k.split(',').map(Number);
  const h = hexAt((cx + 0.5) * WORLD.FOG_CELL, (cy + 0.5) * WORLD.FOG_CELL);
  return hexKey(h.q, h.r);
}
export const cellsInSector = (p, sector) => [...p.revealed].filter((k) => cellSector(k) === sector);

// ---------- Kartendaten ----------
export function offerMap(game, p, sector, price) {
  const c = consortiumOf(game, p);
  if (!c) return 'Kartendaten handelst du nur innerhalb eines Konsortiums.';
  if (!game.world.sectors.has(sector) || !p.known.sector.has(sector)) return 'Unbekannter Sektor.';
  const n = cellsInSector(p, sector).length;
  if (!n) return 'Du hast in diesem Sektor nichts aufgedeckt.';
  for (const o of game.mapOffers.values()) if (o.seller === p.id && o.sector === sector) { o.price = price; o.cells = n; game.emit('consortium', c); return undefined; }
  const id = 'm' + ++game.counters.offer;
  game.mapOffers.set(id, { id, seller: p.id, consortium: c.id, sector, price, cells: n, created: Date.now() });
  game.emit('consortium', c);
  return undefined;
}

export function deleteMapOffer(game, p, id) {
  const o = game.mapOffers.get(id);
  if (!o || o.seller !== p.id) return 'Kein eigenes Angebot.';
  game.mapOffers.delete(id);
  const c = game.consortia.get(o.consortium);
  if (c) game.emit('consortium', c);
  return undefined;
}

/**
 * Kauf: Stand des Verkäufers zum Kaufzeitpunkt (Zellen, Sonnensysteme, Zonen, Wurmloch-Verbindungen mit beiden Enden
 * bekannt). Keine XP, kein Almanach, kein Fortschritt in Erkundungsquests.
 */
export function buyMap(game, p, id) {
  const o = game.mapOffers.get(id);
  const c = consortiumOf(game, p);
  if (!o || !c || o.consortium !== c.id) return 'Dieses Angebot gibt es nicht (mehr).';
  if (o.seller === p.id) return 'Eigene Kartendaten kannst du nicht kaufen.';
  const seller = game.players.get(o.seller);
  if (!seller) return 'Verkäufer unbekannt.';
  if (p.credits < o.price) return 'Nicht genug Credits.';
  p.credits -= o.price;
  seller.credits += o.price * CONSORTIUM.SALE_SHARE;
  const n = importMap(game, p, seller, o.sector);
  const name = game.world.sectors.get(o.sector)?.name || o.sector;
  clog(game, c, p.id, 'mapSale', o.price, `Sektor ${name} von ${seller.name}`);
  game.emit('notice', p, `Kartendaten Sektor ${name}: ${n.toLocaleString('de-DE')} neue Zellen.`);
  game.emit('notice', seller, `${p.name} hat deine Kartendaten von Sektor ${name} gekauft (+${Math.round(o.price * CONSORTIUM.SALE_SHARE).toLocaleString('de-DE')} Cr).`);
  game.emit('consortium', c);
  return undefined;
}

/** Kartenübernahme: eigener Pfad ohne Almanach, Sektor-XP und Quests (getrennt von revealAround). Liefert die Zahl neuer Zellen. */
export function importMap(game, p, from, sector) {
  const newCells = [];
  for (const k of cellsInSector(from, sector)) {
    if (p.revealed.has(k)) continue;
    p.revealed.add(k);
    newCells.push(k);
    game.newDiscoveries.push([p.id, 'cell', k]);
  }
  const entities = newCells.flatMap((k) => game.world.entitiesInCell(k).map((id) => game.world.entities.get(id)));
  if (newCells.length) game.emit('reveal', p, { cells: newCells, entities });
  game.discover(p, 'sector', sector);
  for (const id of from.known.system) if (game.world.systems.get(id)?.sector === sector) game.discover(p, 'system', id);
  for (const id of from.known.zone) if (game.findZone(id)?.sector === sector) game.discover(p, 'zone', id);
  for (const id of from.known.wh) {
    const w = game.world.wormholes.get(id);
    if (!w?.sectors?.includes(sector)) continue;
    const a = game.world.entities.get(w.a), b = game.world.entities.get(w.b);
    if (a && b && game.isKnown(p, a) && game.isKnown(p, b)) game.discover(p, 'wh', id);
  }
  return newCells.length;
}

// ---------- Schiffshandel ----------
export function offerShip(game, p, ship, price) {
  const c = consortiumOf(game, p);
  if (!c) return 'Schiffe handelst du nur innerhalb eines Konsortiums.';
  if (game.shipOffers.has(ship.id)) { game.shipOffers.get(ship.id).price = price; game.emit('consortium', c); return undefined; }
  if (ship.state !== 'docked' || !ship.dockedAt) return 'Das Schiff muss angedockt sein.';
  if (Object.keys(ship.cargo).length) return 'Erst den Laderaum leeren.';
  if (ship.queue.length) return 'Das Schiff darf keine Befehle oder Route haben.';
  if (ship.main) return 'Das Hauptschiff kannst du nicht anbieten.';
  const err = game.canGiveAway(p, ship);
  if (err) return err;
  game.shipOffers.set(ship.id, { ship: ship.id, seller: p.id, consortium: c.id, price, created: Date.now() });
  game.shipLog(ship, `Im Konsortium für ${price.toLocaleString('de-DE')} Cr angeboten (gesperrt)`);
  game.emit('consortium', c);
  return undefined;
}

export function deleteShipOffer(game, p, shipId) {
  const o = game.shipOffers.get(shipId);
  if (!o || o.seller !== p.id) return 'Kein eigenes Angebot.';
  game.shipOffers.delete(shipId);
  const s = game.ships.get(shipId);
  if (s) game.shipLog(s, 'Angebot zurückgezogen');
  const c = game.consortia.get(o.consortium);
  if (c) game.emit('consortium', c);
  return undefined;
}

/** Kauf: Pilotenlizenz (Klasse, Schiffszahl), bei Fraktionsschiffen der Rang; der Käufer muss nicht vor Ort sein */
export function buyShipOffer(game, p, shipId) {
  const o = game.shipOffers.get(shipId);
  const c = consortiumOf(game, p);
  const ship = game.ships.get(shipId);
  if (!o || !c || o.consortium !== c.id || !ship) return 'Dieses Angebot gibt es nicht (mehr).';
  if (o.seller === p.id) return 'Das ist dein eigenes Schiff.';
  const d = SHIP_TYPES[ship.type];
  const lic = PILOT_LICENSES[p.pilot || 1];
  if (!lic.classes.includes(d.cls)) return `Für Klasse ${SHIP_CLASSES[d.cls].name} brauchst du Pilotenlizenz ${SHIP_CLASSES[d.cls].license}.`;
  if (game.shipsOf(p.id).length >= lic.maxShips) return `Pilotenlizenz ${lic.level} erlaubt höchstens ${lic.maxShips} Schiffe.`;
  if (d.faction && factionRank(p.rep?.[d.faction]) < d.rank) return `${d.name} erfordert Rang ${d.rank} (${RANK_NAMES[d.rank]}) bei ${FACTIONS[d.faction].name}.`;
  if (p.credits < o.price) return 'Nicht genug Credits.';
  const seller = game.players.get(o.seller);
  p.credits -= o.price;
  if (seller) seller.credits += o.price * CONSORTIUM.SALE_SHARE;
  game.shipOffers.delete(shipId);
  transferShip(game, ship, p);
  clog(game, c, p.id, 'shipSale', o.price, `${ship.name} (${d.name}) von ${seller?.name || '?'}`);
  game.emit('notice', p, `${ship.name} gehört jetzt dir.`);
  if (seller) game.emit('notice', seller, `${p.name} hat ${ship.name} gekauft (+${Math.round(o.price * CONSORTIUM.SALE_SHARE).toLocaleString('de-DE')} Cr).`);
  game.emit('consortium', c);
  return undefined;
}

/** Besitzerwechsel an Ort und Stelle: Upgrades, Module, Treibstoff und Name bleiben */
export function transferShip(game, ship, to) {
  const own = game.shipsOf(to.id);
  ship.owner = to.id;
  ship.name = game.uniqueShipName(to.id, ship.name, ship.id);
  ship.group = null;
  ship.ord = own.reduce((m, s) => Math.max(m, s.ord || 0), 0) + 1;
  ship.queue = [];
  ship.warn = {};
  ship.fails = {};
  ship.main = false;
  ship.basis = {};
  delete ship.marker;
  ship.revX = undefined; // Sensoren laufen für den neuen Besitzer
  game.discover(to, 'ship', ship.type);
  game.shipLog(ship, `Neuer Besitzer: ${to.name}`);
}

/** Austritt: offene Angebote verschwinden, angebotene Schiffe werden entsperrt */
export function removeOffersOf(game, pid) {
  for (const [id, o] of game.mapOffers) if (o.seller === pid) game.mapOffers.delete(id);
  for (const [id, o] of game.shipOffers) if (o.seller === pid) game.shipOffers.delete(id);
}

/** Angebote für die Konsortiumsansicht */
export function offersView(game, c, pid) {
  const name = (id) => game.players.get(id)?.name || '?';
  const maps = [...game.mapOffers.values()].filter((o) => o.consortium === c.id).map((o) => ({
    id: o.id, seller: o.seller, sellerName: name(o.seller), sector: o.sector, sectorName: game.world.sectors.get(o.sector)?.name || o.sector,
    cells: o.cells, pct: Math.round((o.cells / SECTOR_CELLS) * 1000) / 10, price: o.price, own: o.seller === pid,
  }));
  const ships = [...game.shipOffers.values()].filter((o) => o.consortium === c.id).map((o) => {
    const s = game.ships.get(o.ship);
    if (!s) return null;
    return { ship: s.id, seller: o.seller, sellerName: name(o.seller), name: s.name, type: s.type, upg: s.upg || {}, modules: s.modules || [],
      bonus: s.bonus || 0, at: game.world.entities.get(s.dockedAt)?.name || '?', price: o.price, own: o.seller === pid };
  }).filter(Boolean);
  return { maps, ships };
}

