import { state } from '../state.js';

/** Zusätzliche Markt-Abos offener Dialoge (Routenübersicht, Favoriten, Routeneditor ...) */
export const extraSubs = { routes: new Set(), favorites: new Set(), editor: new Set() };

/** Markt-IDs, die offene Dialoge brauchen */
export function dialogMarkets() {
  const ids = new Set();
  const sel = state.selected;
  if (sel?.kind === 'entity') ids.add(sel.id);
  for (const id of state.selection) { const s = state.ships.get(id); if (s?.dockedAt) ids.add(s.dockedAt); }
  if (sel?.kind === 'ship') { const s = state.ships.get(sel.id); if (s?.dockedAt) ids.add(s.dockedAt); }
  for (const set of Object.values(extraSubs)) for (const id of set) ids.add(id);
  return ids;
}
