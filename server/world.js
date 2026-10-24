import { WORLD, STATION_TYPES, cellKey, cellOf } from '../shared/config.js';
import { preparePublicEntity } from './real-economy.js';
import { hexAt, hexCenter, hexKey, hexNeighbors } from '../shared/hex.js';
import { generateSector } from './worldgen.js';

/**
 * Die Welt: unendliches Hex-Raster aus Sektoren, die bei Annäherung vollständig erzeugt werden.
 */
export class World {
  constructor(seed,profile='legacy') {
    this.seed = seed;
    this.profile=profile;
    this.sectors = new Map();   // "q,r" -> Sektor
    this.systems = new Map();   // System-ID -> System
    this.entities = new Map();  // ID -> Planet, Station, Asteroidenfeld, Wurmloch
    this.cellIndex = new Map(); // Nebel-Zelle -> Entity-IDs
    this.bySector = new Map();  // "q,r" -> Set(Entity-IDs), auch Wurmloch-Enden aus Nachbarsektoren
    this.wormholes = new Map(); // Wurmloch-ID -> { id, a, b }
  }

  addEntity(e) {
    this.entities.set(e.id, e);
    const k = cellKey(...cellOf(e.x, e.y));
    if (!this.cellIndex.has(k)) this.cellIndex.set(k, []);
    this.cellIndex.get(k).push(e.id);
    if (!this.bySector.has(e.sector)) this.bySector.set(e.sector, new Set());
    this.bySector.get(e.sector).add(e.id);
  }

  addSector(sector) {
    this.sectors.set(sector.key, sector);
    for (const s of sector.systems) this.systems.set(s.id, s);
    for (const w of sector.wormholes) this.wormholes.set(w.id, w);
  }

  entitiesInCell(k) {
    return this.cellIndex.get(k) || [];
  }

  sectorEntities(key) {
    const ids = this.bySector.get(key);
    return ids ? [...ids].map((id) => this.entities.get(id)) : [];
  }

  /** Erzeugt den Sektor, falls noch nicht vorhanden. Liefert die neuen Entities oder null. */
  ensureSector(q, r) {
    const key = hexKey(q, r);
    if (this.sectors.has(key)) return null;
    const { sector, entities } = generateSector(this.seed, q, r);
    this.addSector(sector);
    // Wurmloch-Enden können schon von einem Nachbarsektor angelegt sein
    const fresh = entities.filter((e) => !this.entities.has(e.id)&&(this.profile!=='homeworld'||!STATION_TYPES[e.type]?.recipe));
    if(this.profile==='homeworld')for(const entity of fresh)preparePublicEntity(entity);
    for (const e of fresh) this.addEntity(e);
    return { sector, entities: fresh };
  }

  /**
   * Nachgenerierung: Sektoren, deren Rand das Schiff auf GEN_LOOKAHEAD nahekommt, werden erzeugt.
   * Schwelle für den Mittelpunkt: Abstand Nachbarmitte minus Sektorradius plus Vorlauf.
   */
  ensureAround(x, y) {
    const limit = WORLD.HEX_SPACING - WORLD.SECTOR_RADIUS + WORLD.GEN_LOOKAHEAD;
    const h = hexAt(x, y);
    const created = [];
    for (const c of [h, ...hexNeighbors(h.q, h.r)]) {
      if (this.sectors.has(hexKey(c.q, c.r))) continue;
      const m = hexCenter(c.q, c.r);
      if (Math.hypot(m.x - x, m.y - y) > limit) continue;
      const res = this.ensureSector(c.q, c.r);
      if (res) created.push(res);
    }
    return created;
  }

  /** Sektor, in dessen Hex der Punkt liegt (falls erzeugt) */
  sectorAt(x, y) {
    const h = hexAt(x, y);
    return this.sectors.get(hexKey(h.q, h.r)) || null;
  }

  /** Sondergebiete in der Nähe eines Punktes (eigener Hex und Nachbarn) */
  zonesNear(x, y) {
    const h = hexAt(x, y);
    const out = [];
    for (const c of [h, ...hexNeighbors(h.q, h.r)]) {
      const s = this.sectors.get(hexKey(c.q, c.r));
      if (s?.zones.length) out.push(...s.zones);
    }
    return out;
  }

  /** Systeme im eigenen und den Nachbar-Hexen */
  systemsNear(x, y) {
    const h = hexAt(x, y);
    const out = [];
    for (const c of [h, ...hexNeighbors(h.q, h.r)]) {
      const s = this.sectors.get(hexKey(c.q, c.r));
      if (s) out.push(...s.systems);
    }
    return out;
  }
}
