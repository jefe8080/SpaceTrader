import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

/**
 * Persistenz über SQLite.
 * - Migrationen über PRAGMA user_version.
 * - Dirty-Tracking: Jede Zeile wird nur geschrieben, wenn sich ihr JSON seit dem letzten Schreiben geändert hat.
 * - Insert-only-Tabellen (Entdeckungen) schreiben nur neue Schlüssel.
 */
export const MIGRATIONS = [
  // 1: Grundschema
  (db) => db.exec(`
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE players (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE ships (id TEXT PRIMARY KEY, owner TEXT NOT NULL, data TEXT NOT NULL);
    CREATE TABLE sectors (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE entities (id TEXT PRIMARY KEY, sector TEXT NOT NULL, data TEXT NOT NULL);
    CREATE TABLE markets (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE routes (id TEXT PRIMARY KEY, owner TEXT NOT NULL, data TEXT NOT NULL);
    CREATE TABLE favorites (player TEXT NOT NULL, entity TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (player, entity));
    CREATE TABLE discoveries (player TEXT NOT NULL, kind TEXT NOT NULL, key TEXT NOT NULL, PRIMARY KEY (player, kind, key));
    CREATE TABLE ownership (entity TEXT PRIMARY KEY, player TEXT NOT NULL, data TEXT NOT NULL);
    CREATE TABLE market_stats (entity TEXT NOT NULL, bucket INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (entity, bucket));
    CREATE TABLE ship_stats (ship TEXT NOT NULL, bucket INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (ship, bucket));
    CREATE INDEX ships_owner ON ships(owner);
    CREATE INDEX discoveries_player ON discoveries(player);
  `),
];

/** Tabellen mit (id, data) und optionalen Zusatzspalten */
const TABLES = {
  players: { key: ['id'], cols: [] },
  ships: { key: ['id'], cols: ['owner'] },
  sectors: { key: ['id'], cols: [] },
  entities: { key: ['id'], cols: ['sector'] },
  markets: { key: ['id'], cols: [] },
  routes: { key: ['id'], cols: ['owner'] },
  favorites: { key: ['player', 'entity'], cols: [] },
  ownership: { key: ['entity'], cols: ['player'] },
  market_stats: { key: ['entity', 'bucket'], cols: [] },
  ship_stats: { key: ['ship', 'bucket'], cols: [] },
};

export class Store {
  /** file = Pfad oder ':memory:' */
  constructor(file) {
    if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new Database(file);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.migrate();
    this.cache = new Map(); // table -> Map(rowKey -> json)
    this.stmts = {};
    for (const [t, def] of Object.entries(TABLES)) {
      const all = [...def.key, ...def.cols, 'data'];
      this.stmts[t] = {
        upsert: this.db.prepare(`INSERT OR REPLACE INTO ${t} (${all.join(',')}) VALUES (${all.map(() => '?').join(',')})`),
        del: this.db.prepare(`DELETE FROM ${t} WHERE ${def.key.map((k) => k + ' = ?').join(' AND ')}`),
      };
      this.cache.set(t, new Map());
    }
    this.discStmt = this.db.prepare('INSERT OR IGNORE INTO discoveries (player, kind, key) VALUES (?, ?, ?)');
    this.metaStmt = this.db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');
  }

  migrate() {
    const v = this.db.pragma('user_version', { simple: true });
    for (let i = v; i < MIGRATIONS.length; i++) {
      this.db.transaction(() => {
        MIGRATIONS[i](this.db);
        this.db.pragma(`user_version = ${i + 1}`);
      })();
      if (v > 0) console.log(`Datenbank migriert auf Version ${i + 1}`);
    }
  }

  get version() { return this.db.pragma('user_version', { simple: true }); }

  getMeta(key) {
    const r = this.db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
    return r ? JSON.parse(r.value) : undefined;
  }
  setMeta(key, value) { this.metaStmt.run(key, JSON.stringify(value)); }

  /** Lädt alle Zeilen einer Tabelle und füllt den Dirty-Cache. */
  loadAll(table) {
    const def = TABLES[table];
    const rows = this.db.prepare(`SELECT * FROM ${table}`).all();
    const c = this.cache.get(table);
    return rows.map((r) => {
      c.set(def.key.map((k) => r[k]).join('\u0001'), r.data);
      return { ...r, data: JSON.parse(r.data) };
    });
  }

  loadDiscoveries() {
    return this.db.prepare('SELECT player, kind, key FROM discoveries').all();
  }

  /**
   * Gleicht eine Tabelle mit dem Speicherstand ab.
   * rows: Iterable von { key: [..], cols: [..], data: Objekt }. Fehlende Zeilen werden gelöscht, wenn prune = true.
   * Gibt die Zahl geschriebener Zeilen zurück.
   */
  sync(table, rows, prune = true) {
    const c = this.cache.get(table);
    const st = this.stmts[table];
    const seen = new Set();
    let n = 0;
    for (const r of rows) {
      const k = r.key.join('\u0001');
      seen.add(k);
      const json = JSON.stringify(r.data);
      if (c.get(k) === json) continue;
      st.upsert.run(...r.key, ...(r.cols || []), json);
      c.set(k, json);
      n++;
    }
    if (prune) {
      for (const k of [...c.keys()]) {
        if (seen.has(k)) continue;
        st.del.run(...k.split('\u0001').map((p, i) => (TABLES[table].key[i] === 'bucket' ? Number(p) : p)));
        c.delete(k);
        n++;
      }
    }
    return n;
  }

  addDiscoveries(list) {
    for (const [player, kind, key] of list) this.discStmt.run(player, kind, key);
  }

  /** Ringpuffer kürzen: alles vor minBucket löschen */
  trimStats(table, minBucket) {
    this.db.prepare(`DELETE FROM ${table} WHERE bucket < ?`).run(minBucket);
    const c = this.cache.get(table);
    for (const k of [...c.keys()]) if (Number(k.split('\u0001')[1]) < minBucket) c.delete(k);
  }

  transaction(fn) { return this.db.transaction(fn)(); }

  close() { this.db.close(); }
}
