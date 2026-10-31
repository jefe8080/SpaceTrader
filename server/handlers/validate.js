/** Eingabevalidierung für Client-Befehle. Validatoren werfen CmdError oder liefern den bereinigten Wert. */
export class CmdError extends Error {}

const fail = (msg) => { throw new CmdError(msg); };

export const V = {
  str: (max, min = 0) => (v) => {
    const s = String(v ?? '').trim().replace(/\s+/g, ' ');
    if (s.length < min || s.length > max) fail(`Text muss ${min} bis ${max} Zeichen lang sein.`);
    return s;
  },
  int: (min, max) => (v) => {
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n) || n < min || n > max) fail(`Zahl außerhalb von ${min} bis ${max}.`);
    return n;
  },
  num: (min, max) => (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max) fail(`Zahl außerhalb von ${min} bis ${max}.`);
    return n;
  },
  bool: () => (v) => v === true || v === 'true' || v === 1,
  oneOf: (...vals) => (v) => (vals.includes(v) ? v : fail('Ungültiger Wert.')),
  key: (obj, msg = 'Unbekannter Wert.') => (v) => (typeof v === 'string' && Object.hasOwn(obj, v) ? v : fail(msg)),
  color: () => (v) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : fail('Ungültige Farbe.')),
  arr: (item, max) => (v, ctx) => {
    if (!Array.isArray(v) || v.length > max) fail(`Liste zu lang (max. ${max}).`);
    return v.map((x) => item(x, ctx));
  },
  obj: (shape) => (v, ctx) => {
    if (!v || typeof v !== 'object') fail('Ungültige Daten.');
    return parse(shape, v, ctx);
  },
  opt: (fn, dflt = undefined) => (v, ctx) => (v === undefined || v === null || v === '' ? dflt : fn(v, ctx)),
  /** Eigenes Schiff, liefert das Schiffsobjekt. Im Konsortium angebotene Schiffe sind gesperrt (außer locked = true). */
  ownShip: (locked = false, war = false) => (v, { game, player }) => {
    const s = game.ships.get(v);
    if (!s || s.owner !== player.id) fail('Unbekanntes Schiff.');
    // PRD 15: Gefangene und kämpfende Schiffe nehmen nur ihre eigenen Kriegsbefehle an
    if (!war && s.captive) fail(`${s.name} ist in Gefangenschaft.`);
    if (!war && s.battle) fail(`${s.name} kämpft; Befehle gibt es in der Schlachtansicht.`);
    if (!locked && game.shipOffers?.has(s.id)) fail(`${s.name} ist im Konsortium angeboten und nimmt keine Befehle an.`);
    return s;
  },
  /** Liste eigener Schiffe */
  ownShips: (max = 100, locked = false) => (v, ctx) => {
    if (!Array.isArray(v) || !v.length || v.length > max) fail('Keine Schiffe gewählt.');
    return [...new Set(v)].map((id) => V.ownShip(locked)(id, ctx));
  },
  /** Dem Spieler bekanntes Objekt, liefert das Entity */
  entity: () => (v, { game, player }) => {
    const e = game.world.entities.get(v);
    if (!e || !game.isKnown(player, e)) fail('Unbekanntes Ziel.');
    return e;
  },
  /** Eigene Routenvorlage */
  ownRoute: () => (v, { game, player }) => {
    const r = game.routes.get(v);
    if (!r || r.owner !== player.id) fail('Unbekannte Route.');
    return r;
  },
};

export function parse(shape, msg, ctx) {
  const out = {};
  for (const [k, fn] of Object.entries(shape)) out[k] = fn(msg[k], ctx);
  return out;
}
