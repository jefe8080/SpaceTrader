import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

/** Einzige Weltart: Heimatwelten in Weltversion 5. Die Meta-Einträge halten Spielstände kompatibel. */
export const WORLD_GEN = 5;
export const WORLD_KIND = 'homeworld';

/** Read-only preflight, before Store can migrate schemas or change journal mode. */
export function checkWorldFile(file) {
  if (file === ':memory:' || !fs.existsSync(file) || fs.statSync(file).size === 0) return;
  const db = new Database(file, { readonly: true, fileMustExist: true });
  try {
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'meta'").get()) {
      throw new Error('Keine Space-Trader-Welt: vorhandene Datenbank bleibt unverändert.');
    }
    const meta = (key) => {
      const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
      return row ? JSON.parse(row.value) : undefined;
    };
    const version = meta('worldGen');
    const kind = meta('worldProfile') ?? 'ohne Weltart';
    if (version !== WORLD_GEN || kind !== WORLD_KIND) {
      throw new Error(`Inkompatible Welt (${kind}/${version}, erwartet ${WORLD_KIND}/${WORLD_GEN}). Kein automatischer Reset; getrennten Datenpfad verwenden. Bestand bleibt unverändert.`);
    }
  } finally {
    db.close();
  }
}

function canonical(file) {
  const absolute = path.resolve(file);
  if (fs.existsSync(absolute)) return fs.realpathSync(absolute).toLowerCase();
  const parent = path.dirname(absolute);
  return path.join(fs.existsSync(parent) ? fs.realpathSync(parent) : parent, path.basename(absolute)).toLowerCase();
}

export function runtimeOptions(root, env = process.env) {
  const activeFile = path.join(root, 'data', 'spacetrader.db');
  const dbFile = env.DB_FILE || path.join(root, 'data', 'world-v5', 'spacetrader.db');
  if (dbFile !== ':memory:' && canonical(dbFile) === canonical(activeFile)) {
    throw new Error('Die neue PRD-5-Welt darf den bisherigen aktiven Datenpfad nicht verwenden.');
  }
  return { dbFile };
}
