import { GOODS, canBuyFrom, canSellTo } from '/shared/config.js';
import { state, esc, selectedShips } from '../state.js';
import { cmd } from '../net.js';
import { typeName, playerPrice, flightSecs, fmtDuration, entitySprite } from '../util.js';
import { $, registerModal, openModal, closeModal, isOpen, toast, setHtml } from './dom.js';
import { orderShips, orderBuy } from './orders.js';
import { openRouteEditor, addStopToRoute } from './routes.js';
import { extraSubs } from './subs.js';
import { bus } from './bus.js';

const card = $('favCard');
card.innerHTML = '<div id="favList"></div><div id="favBuy" class="inline-form" hidden></div>';
const view = { sort: 'name', good: '', sector: '' };

/** Sektor- und Systemname eines Objekts (ab Phase 2 aus der Welt) */
export const sectorOf = (e) => e.sectorName || '–';
export const systemOf = (e) => e.systemName || '–';

function priceLine(e) {
  const parts = [];
  for (const [g, s] of Object.entries(e.market?.goods || {})) {
    if (view.good && g !== view.good) continue;
    if (canBuyFrom(s)) parts.push(`<span class="price-buy" title="${GOODS[g].name}: Einkauf">${GOODS[g].name} K ${playerPrice(e, g, 'buy').toFixed(1)}</span>`);
    if (canSellTo(s)) parts.push(`<span class="price-sell" title="${GOODS[g].name}: Verkauf">${GOODS[g].name} V ${playerPrice(e, g, 'sell').toFixed(1)}</span>`);
  }
  return parts.slice(0, view.good ? 2 : 6).join(' · ') || '<span class="muted">kein Markt</span>';
}

function render() {
  const ship = selectedShips()[0];
  let favs = Object.entries(state.favorites).map(([id, f]) => ({ e: state.entities.get(id), f })).filter((x) => x.e);
  const sectors = [...new Set(favs.map(({ e }) => sectorOf(e)))].sort();
  const goods = [...new Set(favs.flatMap(({ e }) => Object.keys(e.market?.goods || {})))].sort((a, b) => GOODS[a].name.localeCompare(GOODS[b].name));
  if (view.good) favs = favs.filter(({ e }) => e.market?.goods[view.good]);
  if (view.sector) favs = favs.filter(({ e }) => sectorOf(e) === view.sector);
  const key = {
    name: (x) => x.e.name,
    dist: (x) => flightSecs(ship, x.e) ?? 0,
    sector: (x) => sectorOf(x.e) + ' ' + systemOf(x.e) + ' ' + x.e.name,
    type: (x) => typeName(x.e),
  }[view.sort];
  favs.sort((a, b) => { const ka = key(a), kb = key(b); return typeof ka === 'number' ? ka - kb : String(ka).localeCompare(String(kb)); });

  extraSubs.favorites = new Set(favs.map(({ e }) => e.id));
  const routes = [...state.routes.values()];
  let h = `<div class="modal-head"><h2>Favoriten</h2><span class="muted">${favs.length}</span><span style="flex:1"></span><button data-f="close">✕</button></div>
    <div class="toolbar">
      <label>Sortieren <select id="favSort">${[['name', 'Name'], ['dist', 'Flugzeit'], ['sector', 'Sektor'], ['type', 'Typ']].map(([k, l]) => `<option value="${k}" ${view.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label>Sektor <select id="favSector"><option value="">alle</option>${sectors.map((s) => `<option ${view.sector === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
      <label>Ware <select id="favGood"><option value="">alle</option>${goods.map((g) => `<option value="${g}" ${view.good === g ? 'selected' : ''}>${GOODS[g].name}</option>`).join('')}</select></label>
      <span class="muted">${ship ? `Flugzeit ab ${esc(ship.name)}${selectedShips().length > 1 ? ` (+${selectedShips().length - 1})` : ''}` : 'Kein Schiff gewählt'}</span>
    </div>`;
  if (!favs.length) h += `<div class="muted">Keine Favoriten. Markiere Orte mit ☆ im Detailpanel.</div>`;
  h += `<div class="fav-list">`;
  for (const { e, f } of favs) {
    h += `<div class="fav-row">
      <img src="${entitySprite(e)}" alt="">
      <div class="fav-main">
        <div><b data-f="show" data-id="${e.id}" class="link">${esc(e.name)}</b> <span class="muted">${typeName(e)} · ${esc(systemOf(e))} · ${esc(sectorOf(e))} · ${esc(e.ownerName || 'NPC')}</span></div>
        <div class="fav-prices">${priceLine(e)}</div>
        <input class="fav-note" data-id="${e.id}" maxlength="120" value="${esc(f.note || '')}" placeholder="Notiz">
      </div>
      <div class="fav-side">
        <div class="muted" title="Flugzeit vom gewählten Schiff">${fmtDuration(flightSecs(ship, e))}</div>
        <div class="btnrow">
          <button class="small" data-f="fly" data-id="${e.id}" title="Anfliegen (Shift: anhängen)">➤</button>
          ${e.market && Object.values(e.market.goods).some(canBuyFrom) ? `<button class="small" data-f="buy" data-id="${e.id}" title="Hinfliegen und kaufen (wird angehängt)">🛒</button>` : ''}
          <button class="small" data-f="route" data-id="${e.id}" title="Neue Route mit diesem Stopp">↻</button>
          ${routes.length ? `<select class="small" data-f="toRoute" data-id="${e.id}" title="Zu bestehender Route hinzufügen"><option value="">＋ Route</option>${routes.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select>` : ''}
          <button class="small danger" data-f="unfav" data-id="${e.id}" title="Entfernen">☆</button>
        </div>
      </div></div>`;
  }
  h += `</div>`;
  setHtml($('favList'), h);
}

card.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-f]');
  if (!b || b.tagName === 'SELECT') return;
  const e = state.entities.get(b.dataset.id);
  const ships = selectedShips();
  switch (b.dataset.f) {
    case 'close': closeModal('favorites'); return;
    case 'show':
      state.camera.x = e.x; state.camera.y = e.y; state.follow = null;
      bus.select({ kind: 'entity', id: e.id });
      return;
    case 'fly':
      if (!ships.length) return toast('Erst Schiffe auswählen.');
      orderShips(ships, e, ev.shiftKey);
      toast(`${ships.length} Schiff(e) ${ev.shiftKey ? 'angehängt' : 'unterwegs'}: ${e.name}`, 'info');
      return;
    case 'buy': return showBuyForm(e);
    case 'route': openRouteEditor(null, { stops: [{ targetId: e.id, actions: [] }], assign: ships.map((s) => s.id) }); return;
    case 'unfav': cmd('favorite', { target: e.id, on: false }); return;
    case 'doBuy': {
      if (!ships.length) return toast('Erst Schiffe auswählen.');
      const good = $('favBuyGood').value;
      const amount = Math.max(0, Math.floor(Number($('favBuyAmt').value) || 0));
      orderBuy(ships, e, good, amount, true);
      toast(`Einkauf ${GOODS[good].name} bei ${e.name} eingereiht`, 'info');
      $('favBuy').hidden = true;
      return;
    }
    case 'cancelBuy': $('favBuy').hidden = true; return;
  }
});

function showBuyForm(e) {
  const goods = Object.entries(e.market.goods).filter(([, s]) => canBuyFrom(s)).map(([g]) => g);
  const f = $('favBuy');
  f.hidden = false;
  f.innerHTML = `<b>Einkaufen bei ${esc(e.name)}</b>
    <select id="favBuyGood">${goods.map((g) => `<option value="${g}" ${g === view.good ? 'selected' : ''}>${GOODS[g].name} (${playerPrice(e, g, 'buy').toFixed(1)} Cr)</option>`).join('')}</select>
    <input id="favBuyAmt" type="number" min="0" placeholder="Menge (leer = max.)">
    <button class="small primary" data-f="doBuy" data-id="${e.id}">In Queue einreihen</button>
    <button class="small" data-f="cancelBuy">Abbrechen</button>`;
}

card.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el.id === 'favSort') view.sort = el.value;
  else if (el.id === 'favGood') view.good = el.value;
  else if (el.id === 'favSector') view.sector = el.value;
  else if (el.classList.contains('fav-note')) { cmd('favoriteNote', { target: el.dataset.id, note: el.value.slice(0, 120) }); return; }
  else if (el.dataset.f === 'toRoute' && el.value) { addStopToRoute(el.value, el.dataset.id); el.value = ''; return; }
  else return;
  render();
});

registerModal('favorites', render, () => { extraSubs.favorites.clear(); });
export const openFavorites = () => openModal('favorites');
export const favoritesOpen = () => isOpen('favorites');
