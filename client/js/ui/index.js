// Einstiegspunkt der Oberfläche: verbindet die Module und bietet Funktionen für main.js
import { state } from '../state.js';
import { bus } from './bus.js';
import { renderTop } from './hud.js';
import { renderFleet } from './fleet.js';
import { renderDetails, requestStats } from './details.js';
import { refreshModals } from './dom.js';
import { renderQuestBox } from './quests.js';
import { renderEventsButton } from './events.js';
import { renderPlanetUi } from './planetPanel.js';
import { firstGuide } from './objectGuide.js';
import { entityGuideKey } from '/shared/object-guide.js';
import { renderDogBuff } from './minigames.js';
import { renderHomeDialog } from './homeworld.js';
import './pilotProfile.js';
import './routes.js';
import './favorites.js';
import './almanac.js';
import './almanacShips.js';
import './objectGuide.js';
import './property.js';
import './audioMenu.js';
import './consortium.js';
import './consortiumTrade.js';

export { renderLogin, loginError, enterGame, leaveGame, addLog, updateTooltip, renderTop } from './hud.js';
export { toast, hint, closeTopModal, toggleModal, typing } from './dom.js';
export { requestStats } from './details.js';
export { dialogMarkets } from './subs.js';
export { openRoutesOverview, openRouteEditor } from './routes.js';
export { openFavorites } from './favorites.js';
export { openAlmanac, refreshAlmanac } from './almanac.js';
export { orderShips } from './orders.js';
export { enterPlanet, leavePlanet, openBuilding, closeBuilding, renderPlanetUi, planetEscape } from './planetPanel.js';
export { mgOpen, closeGame } from './minigames.js';

export function renderAll() {
  renderTop();
  renderFleet();
  renderDetails();
  renderQuestBox();
  renderEventsButton();
  renderPlanetUi();
  renderDogBuff();
  renderHomeDialog();
}

/**
 * Auswahl setzen. Ohne keepSelection wird die Mehrfachauswahl zurückgesetzt.
 */
export function select(sel, { keepSelection = false, explained = false } = {}) {
  const object = sel && (sel.kind === 'entity' ? state.entities.get(sel.id) : state.ships.get(sel.id));
  if (!explained && firstGuide(entityGuideKey(sel?.kind === 'ship' && object ? {...object,kind:'ship'} : object), () => select(sel, { keepSelection, explained: true }))) return;
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
document.getElementById('btnTrade').onclick = () => toggleModalImpl('favorites');
document.getElementById('btnAlmanac').onclick = () => toggleModalImpl('almanac');
document.getElementById('btnProps').onclick = () => toggleModalImpl('propsModal');
document.getElementById('btnCons').onclick = () => toggleModalImpl('consModal');
import { toggleModal as toggleModalImpl } from './dom.js';

for (const group of document.querySelectorAll('.main-nav > details')) {
  group.addEventListener('toggle', () => {
    if (group.open) for (const other of document.querySelectorAll('.main-nav > details')) if (other !== group) other.open = false;
  });
}

document.querySelector('.main-nav').addEventListener('click',ev=>{
  if(ev.target.closest('button')) for(const group of document.querySelectorAll('.main-nav>details'))group.open=false;
});
