import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export const WORLD_PROFILES = Object.freeze({
  legacy: Object.freeze({ version: 3 }),
  homeworld: Object.freeze({ version: 5 }),
});

export function worldProfile(name = 'legacy') {
  if (!Object.hasOwn(WORLD_PROFILES, name)) throw new Error(`Unbekanntes Weltprofil: ${name}`);
  return WORLD_PROFILES[name];
}

/** Read-only preflight, before Store can migrate schemas or change journal mode. */
export function checkWorldFile(file, profile) {
  const expected = worldProfile(profile);
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
    const savedProfile = meta('worldProfile') ?? 'legacy';
    if (version !== expected.version || savedProfile !== profile) {
      throw new Error(`Inkompatible Welt (${savedProfile}/${version}, erwartet ${profile}/${expected.version}). Kein automatischer Reset; getrennten Datenpfad verwenden. Bestand bleibt unverändert.`);
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
  const profile = env.WORLD_PROFILE || 'homeworld';
  worldProfile(profile);
  const activeFile = path.join(root, 'data', 'spacetrader.db');
  const dbFile = env.DB_FILE || (profile === 'homeworld' ? path.join(root, 'data', 'world-v5', 'spacetrader.db') : activeFile);
  if (profile === 'homeworld' && dbFile !== ':memory:' && canonical(dbFile) === canonical(activeFile)) {
    throw new Error('Die neue PRD-5-Welt darf den bisherigen aktiven Datenpfad nicht verwenden.');
  }
  return { profile, dbFile };
}
