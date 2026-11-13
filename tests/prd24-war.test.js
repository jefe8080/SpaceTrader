import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../server/game.js';
import { hexCenter } from '../shared/hex.js';
import { AGGRESSION as A } from '../shared/warfare.js';
import { ensureFactionSectors, spawnFactionShip } from '../server/war/factions.js';
import { diplo, factionOwner } from '../server/war/diplomacy.js';
import { tickRaids } from '../server/war/raids.js';
import { runAttack } from '../server/war/engage.js';

function fixture(t) {
  const game = new Game(':memory:', { seed: 1 });
  t.after(() => game.store.close());
  for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) game.world.ensureSector(q, r);
  ensureFactionSectors(game);
  const fs = [...game.fsecs.values()][0];
  assert.ok(fs);
  // Only this faction sector participates in the scenario.
  game.fsecs = new Map([[fs.key, fs]]);
  const admin = game.world.entities.get(fs.admin);
  const center = hexCenter(...fs.sector.split(',').map(Number));
  Object.assign(admin, center);
  Object.assign(game.world.entities.get(fs.yard), center);
  for (let i = 0; i < 6; i++) spawnFactionShip(game, fs, 'korvette', admin);
  const p = game.createPlayer('Grenztest');
  const w = diplo(p);
  w.friends = [fs.faction === 'miners' ? 'tech' : 'miners'];
  const target = game.spawnShip(p, 'fregatte', game.world.entities.get('origin_yard'));
  Object.assign(target, center, { dockedAt: null, queue: [], sector: fs.sector });
  return { game, fs, admin, p, w, target, center };
}
const pulse = (game, n) => { for (let i = 0; i < n; i++) tickRaids(game); };

test('PRD24: border defense checks physical sector even inside protection radius', t => {
  const { game, fs, admin, target } = fixture(t);
  const [q, r] = fs.sector.split(',').map(Number);
  const next = hexCenter(q + 1, r), here = hexCenter(q, r);
  const edge = { x: (next.x + here.x) / 2, y: (next.y + here.y) / 2 };
  // Put the protection point and idle fleet on the boundary.
  Object.assign(admin, edge);
  Object.assign(game.world.entities.get(fs.yard), edge);
  for (const s of game.ships.values()) if (s.fsec === fs.key) Object.assign(s, edge);
  Object.assign(target, { x: edge.x + 10, y: edge.y });
  pulse(game, 5);
  assert.ok(![...game.ships.values()].some(s => s.fsec === fs.key && s.queue[0]?.t === 'attack'));
  target.x = edge.x - 10;
  pulse(game, 5);
  const attacker = [...game.ships.values()].find(s => s.fsec === fs.key && s.queue[0]?.target === target.id);
  assert.ok(attacker);
  Object.assign(target, next);
  let followed = false;
  assert.equal(runAttack(attacker, attacker.queue[0], 1, game, () => { followed = true; }), false);
  assert.ok(followed, 'existing attack pursues across boundary');
  for (const s of game.ships.values()) if (s.fsec === fs.key) s.queue = [];
  pulse(game, 5);
  assert.ok(![...game.ships.values()].some(s => s.fsec === fs.key && s.queue[0]?.target === target.id));
});

test('PRD24: offensive raids ignore player ships and planets outside their sector', t => {
  const { game, fs, w, target, p, center } = fixture(t);
  target.type = 'seekuh';
  const [q, r] = fs.sector.split(',').map(Number);
  Object.assign(target, hexCenter(q + 1, r));
  // Explicit owned planet fixture, independent of starting-world entity names.
  const remote = { id: 'remote-player-planet', kind: 'planet', ...hexCenter(q + 1, r), market: { homeworld: { owner: p.id } } };
  game.world.entities.set(remote.id, remote);
  w.aggr[fs.key] = A.RAID_AT;
  pulse(game, 60);
  assert.equal(w.aggr[fs.key], A.RAID_AT);
  assert.ok(![...game.ships.values()].some(s => s.fsec === fs.key && ['attack', 'raid'].includes(s.queue[0]?.t)));
  Object.assign(remote, center);
  pulse(game, 60);
  assert.ok([...game.ships.values()].some(s => s.fsec === fs.key && s.queue[0]?.planet === remote.id));
  assert.equal(w.aggr[fs.key], A.RAID_AT - A.RAID_COST);
});

test('PRD24: NPC gold transports can still be attacked across sector boundaries', t => {
  const { game, fs, admin } = fixture(t);
  const [q, r] = fs.sector.split(',').map(Number);
  const here = hexCenter(q, r), next = hexCenter(q + 1, r);
  const edge = { x: (here.x + next.x) / 2, y: here.y };
  Object.assign(admin, edge);
  for (const s of game.ships.values()) if (s.fsec === fs.key) Object.assign(s, edge);
  const transport = { id: 'enemy-gold', owner: factionOwner(fs.faction === 'miners' ? 'tech' : 'miners'), x: edge.x + 10, y: edge.y, queue: [{ t: 'goldRun' }] };
  game.ships.set(transport.id, transport);
  pulse(game, 60);
  assert.ok([...game.ships.values()].some(s => s.fsec === fs.key && s.queue[0]?.target === transport.id));
});
