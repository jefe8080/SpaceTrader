// Einstiegspunkt der Oberfläche: verbindet die Module und bietet Funktionen für main.js
import { state } from '../state.js';
import { bus } from './bus.js';
import { renderTop } from './hud.js';
import { renderFleet } from './fleet.js';
import { renderDetails, requestStats } from './details.js';
import { refreshModals } from './dom.js';
import './routes.js';
import './favorites.js';

export { renderLogin, loginError, enterGame, leaveGame, addLog, updateTooltip, renderTop } from './hud.js';
export { toast, hint, closeTopModal, toggleModal, typing } from './dom.js';
export { requestStats } from './details.js';
export { dialogMarkets } from './subs.js';
export { openRoutesOverview, openRouteEditor } from './routes.js';
export { openFavorites } from './favorites.js';
export { orderShips } from './orders.js';

export function renderAll() {
  renderTop();
  renderFleet();
  renderDetails();
}

/**
 * Auswahl setzen. Ohne keepSelection wird die Mehrfachauswahl zurückgesetzt.
 */
export function select(sel, { keepSelection = false } = {}) {
  const changed = JSON.stringify(sel) !== JSON.stringify(state.selected);
  state.selected = sel;
  if (!keepSelection) state.selection.clear();
  if (changed) requestStats();
  renderAll();
}
bus.select = select;
bus.renderAll = renderAll;

let pending = false;
/** Gebündeltes Neuzeichnen nach Netzwerkereignissen */
export function scheduleRender(modals = false) {
  if (modals) pendingModals = true;
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    renderAll();
    if (pendingModals) { pendingModals = false; refreshModals(); }
  });
}
let pendingModals = false;

document.getElementById('btnRoutes').onclick = () => toggleModalImpl('routesOverview');
document.getElementById('btnFavs').onclick = () => toggleModalImpl('favorites');
import { toggleModal as toggleModalImpl } from './dom.js';
