// Isolierter PRD-15-Entwicklungsserver mit vorbereiteter Schlacht neben der Heimat des Spielers "QA15".
// Verwendet nie die aktive Standarddatenbank. Aufruf: node scripts/dev-prd15.js
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
process.env.WORLD_PROFILE = 'homeworld';
process.env.PORT ||= '3015';
process.env.DB_FILE ||= fileURLToPath(new URL('../data/prd15/spacetrader.db', import.meta.url));

if (!fs.existsSync(process.env.DB_FILE)) {
  const { Game } = await import('../server/game.js');
  const { startBattle } = await import('../server/war/battle.js');
  const game = new Game(process.env.DB_FILE, { profile: 'homeworld', seed: 1515 });
  const p = game.createPlayer('QA15'), q = game.createPlayer('Gegner15');
  const home = game.world.entities.get(p.homeworld);
  const mk = (pl, type, dx, dy) => { const s = game.spawnShip(pl, type, home); s.dockedAt = null; s.state = 'idle'; s.x = home.x + dx; s.y = home.y + dy; return s; };
  const own = [mk(p, 'kreuzer', 1500, 0), mk(p, 'fregatte', 1500, 80), mk(p, 'abfangstaffel', 1500, -80), mk(p, 'lastesel', 1500, 160)];
  const foe = [mk(q, 'zerstoerer', 2200, 0), mk(q, 'fx_tech', 2200, 100), mk(q, 'bomberstaffel', 2200, -100), mk(q, 'keiler', 2200, 200)];
  startBattle(game, foe, own);
  // Zweiter Stack zum Ausprobieren der Stackbedienung
  mk(p, 'korvette', -1500, 0); mk(p, 'falke', -1500, 60);
  game.close();
  console.log('PRD-15-Testwelt angelegt: Spieler QA15, Schlacht neben der Heimat.');
}
await import('../server/index.js');
