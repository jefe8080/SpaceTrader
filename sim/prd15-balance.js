// PRD 15 U11: Vergleichsszenarien der Kampfbalance mit der echten Schlacht-KI. Aufruf: node sim/prd15-balance.js
// Ergebnis wird nach docs/qa/prd15/balance.md geschrieben. Jede Runde nutzt eine frische In-Memory-Welt.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Game } from '../server/game.js';
import { SHIP_TYPES } from '../shared/config.js';
import { startBattle } from '../server/war/battle.js';
import { maxHull } from '../shared/combat.js';

const SCENARIOS = [
  { name: 'Flotten gleicher Kosten: 3 Sperber gegen 1 Greif', a: ['fregatte', 'fregatte', 'fregatte'], b: ['zerstoerer'] },
  { name: 'Staffeln gegen schwere Waffen: 4 Hornissen + 2 Wespen gegen 1 Bastion', a: ['abfangstaffel', 'abfangstaffel', 'abfangstaffel', 'abfangstaffel', 'bomberstaffel', 'bomberstaffel'], b: ['kreuzer'] },
  { name: 'Ionen gegen Schilde: Netzkreuzer gegen Bastion', a: ['fx_tech'], b: ['kreuzer'] },
  { name: 'Flankenangriff gegen Frontspezialist: 2 Karawanen gegen 2 Sternenläufer', a: ['f_nomads', 'f_nomads'], b: ['f_order', 'f_order'] },
  { name: 'Fraktionsmodell gegen Standard: Sternenläufer gegen Sperber', a: ['f_order'], b: ['fregatte'] },
  { name: 'Eskorte gegen Raid: 2 Habicht gegen Lastesel + Habicht', a: ['korvette', 'korvette'], b: ['lastesel', 'korvette'] },
];
const RUNS = 5;

function fight(sc) {
  const game = new Game(':memory:', { seed: 77 });
  const pa = game.createPlayer('Seite A'), pb = game.createPlayer('Seite B');
  const yard = game.world.entities.get('origin_yard');
  const mk = (p, t, dx) => { const s = game.spawnShip(p, t, yard); s.dockedAt = null; s.queue = []; s.x = yard.x + dx; s.y = yard.y + 2000; return s; };
  const A = sc.a.map((t) => mk(pa, t, 0)), B = sc.b.map((t) => mk(pb, t, 400));
  for (const s of A) s.tactic = { stance: 'offensive', retreat: { hull: 0.25, weaponsOut: true, losses: 0, systems: false } };
  let result = null;
  game.on('battleEnd', (b) => { result = b; });
  const b = startBattle(game, A, B);
  for (let i = 0; i < 9000 && !result; i++) game.tick(0.1);
  const out = { winner: result?.ended?.winner || (result ? 'Unentschieden' : 'offen'), secs: Math.round(result?.ended?.t ?? b.t),
    hullA: A.filter((s) => game.ships.has(s.id)).reduce((x, s) => x + s.dmg.hull, 0) / A.reduce((x, s) => x + maxHull(s.type), 0),
    hullB: B.filter((s) => game.ships.has(s.id)).reduce((x, s) => x + s.dmg.hull, 0) / B.reduce((x, s) => x + maxHull(s.type), 0) };
  game.store.close();
  return out;
}

const lines = ['# PRD 15: Vergleichsszenarien der Kampfbalance', '', `Erzeugt mit \`node sim/prd15-balance.js\` am ${new Date().toISOString().slice(0, 10)} (${RUNS} Läufe je Szenario, echte Schlacht-KI, Seite A offensiv, Seite B Standardhaltung).`, '',
  'Treffer, Ziele und Rückzüge enthalten Zufall; die Tabelle zeigt Tendenzen, keine exakten Gewinnraten.', '',
  '| Szenario | Kosten A / B (Cr) | Siege A | Siege B | Unentschieden | Ø Dauer (s) | Ø Restrumpf A / B |', '|---|---|---|---|---|---|---|'];
for (const sc of SCENARIOS) {
  const res = Array.from({ length: RUNS }, () => fight(sc));
  const cost = (l) => l.reduce((x, t) => x + SHIP_TYPES[t].price, 0).toLocaleString('de-DE');
  const n = (w) => res.filter((r) => r.winner === w).length;
  const avg = (k) => res.reduce((x, r) => x + r[k], 0) / res.length;
  lines.push(`| ${sc.name} | ${cost(sc.a)} / ${cost(sc.b)} | ${n('A')} | ${n('B')} | ${RUNS - n('A') - n('B')} | ${Math.round(avg('secs'))} | ${Math.round(avg('hullA') * 100)} % / ${Math.round(avg('hullB') * 100)} % |`);
  console.log(sc.name, res.map((r) => r.winner).join(' '));
}
lines.push('', 'Verarmter Sektor und Wiederaufbau sowie schneller Frachter gegen Verfolger sind als automatisierte Tests in `tests/prd15-factions.test.js` und `tests/prd15-integration.test.js` abgedeckt.', '');
const out = fileURLToPath(new URL('../docs/qa/prd15/balance.md', import.meta.url));
fs.mkdirSync(new URL('../docs/qa/prd15/', import.meta.url), { recursive: true });
fs.writeFileSync(out, lines.join('\n'));
console.log('geschrieben:', out);
