import { NPC_OWNER, NPC_COLOR } from '/shared/config.js';

// Zentraler Client-Zustand
export const state = {
  me: null,             // { id, name, color }
  credits: 0,
  time: 0,              // Spielzeit des Servers (s)
  flagshipAt: null,     // Spielzeit der letzten Änderung am Hauptschiff
  xp: 0, level: 1,
  quest: null,          // aktive Quest
  questLock: 0,         // Spielzeit, ab der nach einem Abbruch wieder Quests möglich sind
  rep: {},              // Fraktionsruf
  stopLoss: 0,
  groups: [],           // [{ id, name, collapsed }]
  favorites: {},        // entityId -> { note }
  routes: new Map(),    // id -> Routenvorlage
  fleetStats: { ships: {}, routes: {} },
  shipStats: new Map(), // shipId -> { all, d24, h1 }
  players: [],
  cells: new Set(),     // aufgedeckte Nebel-Zellen
  sectors: new Map(),   // "q,r" -> Sektor-Kurzinfo
  systems: new Map(),   // bekannte Sonnensysteme
  zones: new Map(),     // bekannte Sondergebiete
  wh: new Map(),        // bekannte Wurmlochverbindungen { id, a, b }
  recipes: new Set(),   // entdeckte Rezepte / Planeten- / Feldtypen (Almanach)
  shipTypes: new Set(), // gesehene oder gekaufte Schiffstypen
  moduleTypes: new Set(),
  shipPrices: (() => { try { return JSON.parse(localStorage.getItem('st_ship_prices') || '{}'); } catch { return {}; } })(),
  pilot: 1,
  governor: 0,
  faction: null,        // eigene Fraktion { name, color } ab Gouverneurslizenz
  props: new Map(),     // eigener Besitz: Entity-ID -> Eintrag
  events: [],           // Sondernachfrage in bekannten Sektoren
  cons: null,           // Konsortium: Sicht des Servers ({ none, invites } ohne Mitgliedschaft)
  markerMode: (() => { try { return localStorage.getItem('st_marker') || 'color'; } catch { return 'color'; } })(),
  entities: new Map(),  // id -> Entity inkl. Markt
  ships: new Map(),     // id -> Schiff (+ rx/ry/ra für Interpolation)
  selected: null,       // { kind: 'ship' | 'entity', id } – primäre Auswahl
  selection: new Set(), // Mehrfachauswahl eigener Schiffe
  hover: null,
  logs: [],
  camera: { x: 0, y: 0, zoom: 0.32 },
  follow: null,         // Schiff-ID, der die Kamera folgt
  pickMode: null,       // Callback, wenn ein Ziel auf der Karte gewählt werden soll
  stats: new Map(),     // Entity-ID -> Statistik (3h)
  fleetFilter: 'all',
};

export const playerColor = (id) => id === NPC_OWNER ? NPC_COLOR : state.players.find((p) => p.id === id)?.color || '#cccccc';
export const playerName = (id) => id === NPC_OWNER ? 'NPC' : state.players.find((p) => p.id === id)?.name || '?';
export const myShips = () => [...state.ships.values()].filter((s) => s.owner === state.me?.id);
/** Eigene Schiffe in Flottenreihenfolge */
export const fleetOrder = () => myShips().sort((a, b) => (a.ord || 0) - (b.ord || 0) || a.id.localeCompare(b.id, undefined, { numeric: true }));
/** Ausgewählte eigene Schiffe (Mehrfachauswahl, sonst primäre Auswahl) */
export const selectedShips = () => {
  const ids = state.selection.size ? [...state.selection] : state.selected?.kind === 'ship' ? [state.selected.id] : [];
  return ids.map((id) => state.ships.get(id)).filter((s) => s && s.owner === state.me?.id);
};
export const fmt = (n) => Math.floor(n).toLocaleString('de-DE');
export const fmtK = (n) => {
  const a = Math.abs(n), sign = n < 0 ? '−' : n > 0 ? '+' : '';
  if (a >= 1e6) return sign + (a / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' M';
  if (a >= 1e4) return sign + Math.round(a / 1e3).toLocaleString('de-DE') + ' k';
  return sign + Math.round(a).toLocaleString('de-DE');
};
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
