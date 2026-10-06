import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSector, layoutSector } from '../server/worldgen.js';
import { World } from '../server/world.js';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import { hexAt, hexCenter, hexNeighbors } from '../shared/hex.js';
import { planPath, segmentTime, inZone } from '../shared/nav.js';
import { WORLD } from '../shared/config.js';

test('Sektorgenerierung ist deterministisch je Seed und Hex-Koordinate', () => {
  const a = generateSector(1234, 2, -1), b = generateSector(1234, 2, -1);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  const c = generateSector(1235, 2, -1);
  assert.notEqual(JSON.stringify(a.sector.systems), JSON.stringify(c.sector.systems));
  // Layout-Vorschau für Nachbarsektoren entspricht der späteren Generierung
  assert.deepEqual(layoutSector(1234, 2, -1).systems.map((s) => s.id), a.sector.systems.map((s) => s.id));
});

test('Sektorinhalt hält die Regeln ein', () => {
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      const { sector, entities } = generateSector(99, q, r);
      const sys = sector.systems;
      assert.ok(sys.length >= WORLD.SYSTEMS[0] && sys.length <= WORLD.SYSTEMS[1], `Systemzahl ${sys.length}`);
      for (let i = 0; i < sys.length; i++) {
        for (let j = i + 1; j < sys.length; j++) assert.ok(Math.hypot(sys[i].x - sys[j].x, sys[i].y - sys[j].y) >= WORLD.SYSTEM_MIN_DIST);
      }
      const ofType = (t) => entities.filter((e) => e.type === t);
      assert.equal(ofType('hub').length, 1, 'genau ein Hub');
      assert.equal(ofType('bigyard').length, 1, 'genau eine große Werft');
      const yards = ofType('shipyard').filter((e) => !e.noBuy).length;
      assert.ok(yards >= 3 && yards <= 5, `Werften ${yards}`);
      const hub = ofType('hub')[0];
      assert.ok(Math.hypot(hub.x - sector.bh.x, hub.y - sector.bh.y) <= WORLD.HUB_DIST + 3, 'Hub nahe Schwarzem Loch');
      assert.ok(sector.zones.length <= 3 && sector.wormholes.length <= 2);
      for (const s of sys.filter((x) => !x.start)) {
        const inSys = entities.filter((e) => e.system === s.id && e.kind !== 'wormhole');
        const n = (k) => inSys.filter((e) => e.kind === k).length;
        assert.ok(n('planet') <= 6 && n('station') >= 1 && n('belt') <= 2, `System ${s.name}`);
        assert.ok(s.tags.length >= 1 && s.tags.length <= 2);
      }
    }
  }
});

test('Startsystem: handgebaut, langsam, nicht kaufbar, mit Hub, Werft und Treibstoff', () => {
  const { sector, entities } = generateSector(5, 0, 0);
  const start = sector.systems.find((s) => s.start);
  assert.ok(start);
  const inStart = entities.filter((e) => e.system === start.id);
  assert.ok(inStart.some((e) => e.type === 'hub'));
  assert.ok(inStart.some((e) => e.type === 'shipyard'));
  assert.ok(inStart.some((e) => e.type === 'refinery'));
  for (const g of ['ore', 'ice', 'crystals', 'rareearth']) assert.ok(inStart.some((e) => e.kind === 'belt' && e.type === g) || inStart.some((e) => e.market?.goods[g]?.role === 'produce'), g);
  assert.ok(inStart.every((e) => e.noBuy));
  const smelter = entities.find((e) => e.id === 'origin_smelter');
  assert.equal(smelter.market.speed, WORLD.START_SLOW);
});

test('Hex-Raster: Rundung und Nachbarn', () => {
  for (const [q, r] of [[0, 0], [3, -2], [-5, 4]]) {
    const c = hexCenter(q, r);
    assert.deepEqual(hexAt(c.x + 1000, c.y - 2000), { q, r });
    for (const n of hexNeighbors(q, r)) {
      const m = hexCenter(n.q, n.r);
      assert.ok(Math.abs(Math.hypot(m.x - c.x, m.y - c.y) - WORLD.HEX_SPACING) < 1e-6);
    }
  }
});

test('Nachgenerierung: Nachbarsektor erst 30.000 vor dem Sektorrand', () => {
  const w = new World(3);
  w.ensureSector(0, 0);
  const c = hexCenter(0, 0), n = hexCenter(1, 0);
  const dir = { x: (n.x - c.x) / WORLD.HEX_SPACING, y: (n.y - c.y) / WORLD.HEX_SPACING };
  const at = (d) => w.ensureAround(c.x + dir.x * d, c.y + dir.y * d);
  assert.equal(at(WORLD.SECTOR_RADIUS - WORLD.GEN_LOOKAHEAD - 2000).length, 0);
  const created = at(WORLD.SECTOR_RADIUS - WORLD.GEN_LOOKAHEAD + 2000);
  assert.ok(created.some((x) => x.sector.key === '1,0'));
});

test('Navigation: schnellster Weg über bekannte Wurmlöcher', () => {
  const from = { x: 0, y: 0 }, to = { x: 100000, y: 0 };
  const speed = 100;
  assert.equal(planPath(from, to, [], speed).legs.length, 1);
  const wh = { id: 'w1', a: { x: 1000, y: 0 }, b: { x: 99000, y: 0 } };
  const p = planPath(from, to, [wh], speed);
  assert.equal(p.legs.length, 2);
  assert.deepEqual(p.legs[0].wh, { id: 'w1', side: 'a' });
  assert.ok(Math.abs(p.time - (10 + WORLD.WORMHOLE_TRANSIT + 10)) < 1e-6);
  // Rückweg nutzt dasselbe Wurmloch in Gegenrichtung
  const back = planPath(to, from, [wh], speed);
  assert.deepEqual(back.legs[0].wh, { id: 'w1', side: 'b' });
  // Umweg lohnt nicht: Direktflug
  const far = { id: 'w2', a: { x: 0, y: 90000 }, b: { x: 100000, y: 90000 } };
  assert.equal(planPath(from, to, [far], speed).legs.length, 1);
});

test('Sondergebiete: Flugzeit mit Gravitationsstörung und Sonnenwind', () => {
  const grav = { type: 'gravity', x: 5000, y: 0, rx: 2000, ry: 2000, rot: 0 };
  assert.ok(inZone(grav, 5000, 1500) && !inZone(grav, 5000, 2500));
  const base = segmentTime(0, 0, 10000, 0, 100);
  const slow = segmentTime(0, 0, 10000, 0, 100, [grav]);
  assert.ok(Math.abs(slow - (base + 40)) < 3, `Gravitation: ${slow}`); // 4000 Einheiten mit halber Geschwindigkeit
  const wind = { type: 'solarwind', x: 5000, y: 0, rx: 6000, ry: 500, rot: 0 };
  assert.ok(segmentTime(0, 0, 10000, 0, 100, [wind]) < base);
});

test('Spiel: Wurmlochdurchflug macht die Verbindung bekannt', () => {
  const g = new Game(':memory:', { seed: 11 });
  const p = g.createPlayer('Anna');
  const ship = g.shipsOf(p.id)[0];
  const home = g.world.sectors.get('0,0');
  const w = g.world.wormholes.get(home.wormholes[0].id);
  const a = g.world.entities.get(w.a);
  // Ende A bekannt machen und direkt hineinfliegen
  g.revealAround(p, a.x, a.y, 500);
  ship.x = a.x + 300; ship.y = a.y;
  assert.equal(runCommand(g, p, { cmd: 'order', ships: [ship.id], order: { t: 'goto', target: a.id } }), undefined);
  for (let i = 0; i < 200 && ship.queue.length; i++) g.tick(0.1);
  const b = g.world.entities.get(w.b);
  assert.ok(Math.hypot(ship.x - b.x, ship.y - b.y) < 400, 'Schiff am Austritt');
  assert.ok(p.known.wh.has(w.id), 'Verbindung bekannt');
});
