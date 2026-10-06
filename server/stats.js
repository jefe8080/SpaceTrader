/**
 * Ringpuffer-Statistik für Schiffe und Routen: 5-Minuten-Blöcke über 24 Stunden.
 * Felder: f = Flüge (angedockte Stopps), dist = Strecke, inc = Einnahmen, buy = Einkauf, fuel = Treibstoff, upg = Upgrades
 */
export const SHIP_STATS = { BUCKET_SECS: 300, BUCKETS: 288 };
export const STAT_FIELDS = ['f', 'dist', 'inc', 'buy', 'fuel', 'upg'];

export function bucketOf(time) { return Math.floor(time / SHIP_STATS.BUCKET_SECS); }

/** Bucht einen Wert in den Ringpuffer `list` (Array von { b, ...felder }) */
export function addToBuckets(list, time, field, n) {
  const b = bucketOf(time);
  let cur = list[list.length - 1];
  if (!cur || cur.b !== b) {
    cur = { b };
    list.push(cur);
    const oldest = b - SHIP_STATS.BUCKETS + 1;
    while (list.length && list[0].b < oldest) list.shift();
  }
  cur[field] = (cur[field] || 0) + n;
}

/** Summen über die letzten `secs` Sekunden (inklusive laufendem Block) */
export function sumWindow(list, time, secs) {
  const minB = bucketOf(time) - Math.ceil(secs / SHIP_STATS.BUCKET_SECS) + 1;
  const out = {};
  for (const bk of list || []) {
    if (bk.b < minB) continue;
    for (const [k, v] of Object.entries(bk)) if (k !== 'b') out[k] = (out[k] || 0) + v;
  }
  return out;
}

export const expenses = (s) => (s.buy || 0) + (s.fuel || 0) + (s.upg || 0);
export const balance = (s) => (s.inc || 0) - expenses(s);

/** Kompakte Zusammenfassung für Client: gesamt, 24 h, 1 h */
export function summary(totals, list, time) {
  const r = (o) => Object.fromEntries(STAT_FIELDS.map((k) => [k, Math.round(o[k] || 0)]));
  return { all: r(totals || {}), d24: r(sumWindow(list, time, 86400)), h1: r(sumWindow(list, time, 3600)) };
}
