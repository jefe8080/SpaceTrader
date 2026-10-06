import { NPC_OWNER, NPC_COLOR } from '/shared/config.js';

// Zentraler Client-Zustand
export const state = {
  me: null,             // { id, name, color }
  credits: 0,
  players: [],
  cells: new Set(),     // aufgedeckte Nebel-Zellen
  entities: new Map(),  // id -> Entity inkl. Markt
  ships: new Map(),     // id -> Schiff (+ rx/ry/ra für Interpolation)
  selected: null,       // { kind: 'ship' | 'entity', id }
  hover: null,
  logs: [],
  camera: { x: 0, y: 0, zoom: 0.32 },
  follow: null,         // Schiff-ID, der die Kamera folgt
  pickMode: null,       // Callback, wenn ein Ziel auf der Karte gewählt werden soll
  stats: new Map(),     // Entity-ID -> Statistik (3h)
};

export const playerColor = (id) => id === NPC_OWNER ? NPC_COLOR : state.players.find((p) => p.id === id)?.color || '#cccccc';
export const myShips = () => [...state.ships.values()].filter((s) => s.owner === state.me?.id);
export const fmt = (n) => Math.floor(n).toLocaleString('de-DE');
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
