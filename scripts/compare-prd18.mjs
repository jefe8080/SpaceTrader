// PRD 18 E4: deterministischer Lauf eines Spielstands und Vergleich zweier Läufe.
// Lauf:      node scripts/compare-prd18.mjs run <Code-Wurzel> <Spielstand.db> <Ausgabe.json> [Minuten]
// Vergleich: node scripts/compare-prd18.mjs diff <a.json> <b.json>
// Der Spielstand wird vorher kopiert; das Original bleibt unverändert. Ausgaben enthalten nur IDs und Kennzahlen.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const [mode, ...args] = process.argv.slice(2);

function freeze() {
  let seed = 0x5eed1801;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const clock = { now: Date.UTC(2026, 9, 31, 12) };
  const RealDate = Date;
  class FixedDate extends RealDate {
    constructor(...a) { super(...(a.length ? a : [clock.now])); }
    static now() { return clock.now; }
  }
  globalThis.Date = FixedDate;
  const start = clock.now;
  performance.now = () => clock.now - start;
  return clock;
}

async function run(root, source, out, minutes = 30) {
  const clock = freeze();
  const work = path.join(path.dirname(path.resolve(out)), `${path.basename(out, '.json')}.db`);
  for (const ext of ['', '-wal', '-shm']) fs.rmSync(work + ext, { force: true });
  fs.copyFileSync(source, work);
  const { Game } = await import(pathToFileURL(path.join(path.resolve(root), 'server', 'game.js')).href);
  const game = new Game(work, { profile: 'homeworld' });
  const steps = Math.round(minutes * 60 / 0.5);
  for (let i = 0; i < steps; i++) {
    clock.now += 500;
    game.tick(0.5);
  }
  game.close();
  const { default: Database } = await import(pathToFileURL(path.join(path.resolve(root), 'node_modules', 'better-sqlite3', 'lib', 'index.js')).href);
  const db = new Database(work, { readonly: true });
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((r) => r.name);
  const dump = {};
  for (const t of tables) {
    const rows = db.prepare(`SELECT * FROM "${t}"`).all();
    const keyed = rows.map((r) => {
      const { data, value, ...key } = r;
      return [JSON.stringify(key), data ?? value];
    });
    keyed.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    dump[t] = Object.fromEntries(keyed);
  }
  db.close();
  for (const ext of ['', '-wal', '-shm']) fs.rmSync(work + ext, { force: true });
  const json = JSON.stringify(dump);
  fs.writeFileSync(out, json);
  const hash = crypto.createHash('sha256').update(json).digest('hex');
  console.log(`${steps} Schritte, ${tables.length} Tabellen, ${Object.values(dump).reduce((n, t) => n + Object.keys(t).length, 0)} Zeilen, sha256 ${hash}`);
}

function diff(fileA, fileB) {
  const a = JSON.parse(fs.readFileSync(fileA, 'utf8'));
  const b = JSON.parse(fs.readFileSync(fileB, 'utf8'));
  let total = 0;
  for (const t of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    const ta = a[t] || {}, tb = b[t] || {};
    const keys = [...new Set([...Object.keys(ta), ...Object.keys(tb)])];
    const changed = keys.filter((k) => ta[k] !== tb[k]);
    if (!changed.length) continue;
    total += changed.length;
    console.log(`${t}: ${changed.length} abweichende Zeilen, z. B. ${changed.slice(0, 5).join(' ')}`);
    for (const k of changed.slice(0, 3)) {
      const va = ta[k] === undefined ? undefined : JSON.parse(ta[k]);
      const vb = tb[k] === undefined ? undefined : JSON.parse(tb[k]);
      if (va && vb && typeof va === 'object') {
        const fields = [...new Set([...Object.keys(va), ...Object.keys(vb)])].filter((f) => JSON.stringify(va[f]) !== JSON.stringify(vb[f]));
        console.log(`  ${k}: Felder ${fields.join(', ')}`);
      } else console.log(`  ${k}: ${va === undefined ? 'fehlt in A' : vb === undefined ? 'fehlt in B' : 'Wert'}`);
    }
  }
  console.log(total ? `${total} Abweichungen` : 'Keine Abweichung');
  process.exitCode = total ? 1 : 0;
}

if (mode === 'run') await run(args[0], args[1], args[2], Number(args[3] ?? 30));
else if (mode === 'diff') diff(args[0], args[1]);
else {
  console.error('Aufruf: run <Code-Wurzel> <Spielstand.db> <Ausgabe.json> [Minuten] | diff <a.json> <b.json>');
  process.exitCode = 2;
}
