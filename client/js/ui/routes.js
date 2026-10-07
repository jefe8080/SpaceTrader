import { GOODS, SHIP_TYPES, BELT_TYPES, canBuyFrom, canSellTo } from '/shared/config.js';
import { state, esc, fmtK, fleetOrder, selectedShips } from '../state.js';
import { socket, cmd } from '../net.js';
import { typeName, playerPrice, dist, shipSymbol, hasWarn, actionText, canMine } from '../util.js';
import { $, hint, registerModal, openModal, closeModal, isOpen, toast, setHtml } from './dom.js';
import { sparkline, stockBar } from './charts.js';
import { bus } from './bus.js';
import { extraSubs } from './subs.js';

const OP_NAMES = { buy: 'Kaufen', sell: 'Verkaufen', mine: 'Abbauen', waitUntil: 'Warten bis', refuel: 'Tanken' };
const COND_NAMES = { 'stock>=': 'Bestand ≥', 'stock<=': 'Bestand ≤', 'price>=': 'Preis ≥', 'price<=': 'Preis ≤' };
const goodsWhere = (e, pred) => Object.entries(e?.market?.goods || {}).filter(([, s]) => pred(s)).map(([g]) => g);
const buyable = (e) => goodsWhere(e, canBuyFrom);
const sellable = (e) => goodsWhere(e, canSellTo);
const allGoods = (e) => Object.keys(e?.market?.goods || {});
const allowedOps = (e) => {
  const ops = [];
  if (buyable(e).length) ops.push('buy');
  if (sellable(e).length) ops.push('sell');
  if (e?.kind === 'belt') ops.push('mine');
  if (allGoods(e).length) ops.push('waitUntil');
  if (e?.market?.goods.shipfuel && canBuyFrom(e.market.goods.shipfuel)) ops.push('refuel');
  return ops;
};
const goodsForOp = (e, op) => (op === 'buy' ? buyable(e) : op === 'sell' ? sellable(e) : allGoods(e));

/** Schiffe, die eine Route in der Queue haben */
export const shipsOnRoute = (rid) => fleetOrder().filter((s) => s.queue?.some((c) => c.t === 'route' && c.route === rid));

// =====================================================================
// Routeneditor (Vorlage)
// =====================================================================
let ed = null; // { id, name, minBalance, stops, assign:Set }
const card = $('routeCard');

export function openRouteEditor(routeId = null, { stops = null, assign = [] } = {}) {
  const r = routeId ? state.routes.get(routeId) : null;
  ed = {
    id: r?.id || null,
    name: r?.name || `Route ${state.routes.size + 1}`,
    minBalance: r?.minBalance || 0,
    stops: structuredClone(stops || r?.stops || []),
    assign: new Set(assign),
  };
  openModal('routeEditor');
}

function refShip() {
  const ids = ed.assign.size ? [...ed.assign] : ed.id ? shipsOnRoute(ed.id).map((s) => s.id) : [];
  return state.ships.get(ids[0]) || selectedShips()[0] || fleetOrder()[0];
}

function defaultActions(e) {
  const ship = refShip();
  if (e.kind === 'belt') return ship && canMine(ship, BELT_TYPES[e.type].good) ? [{ op: 'mine' }] : [];
  // Waren verkaufen, die woanders auf der Route gekauft oder abgebaut werden
  const gathered = new Set();
  for (const st of ed.stops) {
    const se = state.entities.get(st.targetId);
    for (const a of st.actions) {
      if (a.op === 'buy') gathered.add(a.good);
      if (a.op === 'mine' && se?.kind === 'belt') gathered.add(BELT_TYPES[se.type].good);
    }
  }
  return sellable(e).filter((g) => gathered.has(g)).map((g) => ({ op: 'sell', good: g, amount: 0 }));
}

function addStop(id) {
  const e = state.entities.get(id);
  if (!e || ed.stops.length >= 16) return;
  ed.stops.push({ targetId: id, actions: defaultActions(e) });
  renderEditor();
}

function actionRow(a, i, j, e) {
  const ops = allowedOps(e);
  let h = `<div class="action"><select data-f="op" data-i="${i}" data-j="${j}">
    ${ops.map((o) => `<option value="${o}" ${o === a.op ? 'selected' : ''}>${OP_NAMES[o]}</option>`).join('')}</select>`;
  if (a.op === 'mine') {
    h += `<span class="hintp">bis der Laderaum voll ist</span>`;
  } else if (a.op === 'refuel') {
    h += `<span class="hintp">bis der Tank voll ist (${playerPrice(e, 'shipfuel', 'buy')?.toFixed(1)} Cr je Einheit)</span>`;
  } else {
    const goods = goodsForOp(e, a.op);
    h += `<select data-f="good" data-i="${i}" data-j="${j}">${goods.map((g) => `<option value="${g}" ${g === a.good ? 'selected' : ''}>${GOODS[g].name}</option>`).join('')}</select>`;
    if (a.op === 'waitUntil') {
      h += `<select data-f="cond" data-i="${i}" data-j="${j}">${Object.entries(COND_NAMES).map(([k, l]) => `<option value="${k}" ${k === a.cond ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <input type="number" min="0" step="0.1" placeholder="Wert" value="${a.value ?? ''}" data-f="value" data-i="${i}" data-j="${j}">
        <input type="number" min="10" placeholder="Timeout s" title="Zeitlimit in Sekunden" value="${a.timeout || ''}" data-f="timeout" data-i="${i}" data-j="${j}">`;
    } else {
      h += `<input type="number" min="0" placeholder="Menge" title="Menge (leer = so viel wie möglich)" value="${a.amount || ''}" data-f="amount" data-i="${i}" data-j="${j}">
        <input type="number" min="0" step="0.1" placeholder="${a.op === 'buy' ? 'max. Preis' : 'min. Preis'}"
          title="${a.op === 'buy' ? 'Nur kaufen, solange der Preis höchstens so hoch ist' : 'Nur verkaufen, solange der Preis mindestens so hoch ist'}"
          value="${a.limit || ''}" data-f="limit" data-i="${i}" data-j="${j}">`;
    }
    const p = a.good ? playerPrice(e, a.good, a.op === 'sell' ? 'sell' : a.op === 'buy' ? 'buy' : null) : null;
    h += `<span class="hintp">${p !== null ? `aktuell ${p.toFixed(1)} Cr` : ''}</span>`;
  }
  return h + `<button class="small danger" data-a="delAct" data-i="${i}" data-j="${j}">✕</button></div>`;
}

function renderEditor() {
  if (!ed) return;
  const ship = refShip();
  let h = `<h2>${ed.id ? 'Route bearbeiten' : 'Neue Route'}</h2>
    <div class="muted">Eine Route ist eine Vorlage. Alle zugewiesenen Schiffe fliegen sie; Änderungen wirken sofort auf alle.
    Menge leer = so viel wie möglich. Preisgrenzen verhindern Verlustgeschäfte.</div>
    <div class="form-row"><label>Name <input id="reName" maxlength="32" value="${esc(ed.name)}"></label>
    <label title="Automatische Einkäufe dieser Route nur, solange der Kontostand darüber bleibt">Mindestkontostand <input id="reMin" type="number" min="0" placeholder="0 = aus" value="${ed.minBalance || ''}"></label></div>`;

  ed.stops.forEach((st, i) => {
    const e = state.entities.get(st.targetId);
    h += `<div class="stop"><div class="stop-head"><span class="num">${i + 1}</span>
      <span class="nm">${esc(e?.name || '?')} <span class="muted" style="font-weight:400">${e ? typeName(e) : ''}</span></span>
      <button class="small" data-a="up" data-i="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button class="small" data-a="down" data-i="${i}" ${i === ed.stops.length - 1 ? 'disabled' : ''}>↓</button>
      <button class="small danger" data-a="del" data-i="${i}">✕</button></div>`;
    st.actions.forEach((a, j) => { h += actionRow(a, i, j, e); });
    h += `<div class="action">${allowedOps(e).map((o) => `<button class="small" data-a="addAct" data-op="${o}" data-i="${i}">+ ${OP_NAMES[o]}</button>`).join(' ')}</div></div>`;
  });

  const known = [...state.entities.values()].sort((a, b) => (ship ? dist(a, ship) - dist(b, ship) : 0));
  h += `<div class="add-stop"><select id="reAddSel">${known.map((e) => `<option value="${e.id}">${state.favorites[e.id] ? '★ ' : ''}${esc(e.name)} · ${typeName(e)}${ship ? ' · ' + Math.round(dist(e, ship)) : ''}</option>`).join('')}</select>
    <button data-a="add">+ Stopp</button><button data-a="pick">◎ Auf Karte wählen</button></div>`;

  const onRoute = ed.id ? new Set(shipsOnRoute(ed.id).map((s) => s.id)) : new Set();
  h += `<div class="section"><div class="section-title">Schiffe zuweisen</div><div class="chips">
    ${fleetOrder().filter((s) => !s.main).map((s) => {
      const on = onRoute.has(s.id);
      return `<label class="chip${on ? ' on' : ''}"><input type="checkbox" data-assign="${s.id}" ${on || ed.assign.has(s.id) ? 'checked' : ''} ${on ? 'disabled' : ''}> ${shipSymbol(s)} ${esc(s.name)}</label>`;
    }).join('')}</div><div class="muted small-note">Zugewiesene Schiffe ersetzen ihre Queue durch diese Route (endlos). Das Hauptschiff fährt keine Routen.</div></div>
    <div class="route-footer">
      ${ed.id ? '<button class="danger" data-a="delete">Route löschen</button>' : ''}
      <span style="flex:1"></span>
      <button data-a="cancel">Abbrechen</button>
      <button class="primary" data-a="save" ${ed.stops.length ? '' : 'disabled'}>Speichern</button>
    </div>`;
  card.innerHTML = h;
}

card.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-a]');
  if (!b || b.disabled || !ed) return;
  const i = Number(b.dataset.i), j = Number(b.dataset.j);
  switch (b.dataset.a) {
    case 'up': [ed.stops[i - 1], ed.stops[i]] = [ed.stops[i], ed.stops[i - 1]]; break;
    case 'down': [ed.stops[i + 1], ed.stops[i]] = [ed.stops[i], ed.stops[i + 1]]; break;
    case 'del': ed.stops.splice(i, 1); break;
    case 'delAct': ed.stops[i].actions.splice(j, 1); break;
    case 'addAct': {
      const e = state.entities.get(ed.stops[i].targetId);
      const op = b.dataset.op;
      const good = op === 'mine' || op === 'refuel' ? undefined : goodsForOp(e, op)[0];
      ed.stops[i].actions.push(op === 'waitUntil' ? { op, good, cond: 'stock>=', value: 50, timeout: 600 } : op === 'refuel' || op === 'mine' ? { op } : { op, good, amount: 0 });
      break;
    }
    case 'add': addStop($('reAddSel').value); return;
    case 'pick':
      $('routeEditor').hidden = true;
      hint('Ziel auf der Karte anklicken (Esc bricht ab)');
      state.pickMode = (id) => {
        state.pickMode = null;
        hint(null);
        $('routeEditor').hidden = false;
        if (id) addStop(id);
      };
      return;
    case 'delete':
      if (confirm(`Route "${ed.name}" löschen? Zugewiesene Schiffe werden untätig.`)) { cmd('routeDelete', { route: ed.id }); closeModal('routeEditor'); }
      return;
    case 'cancel': closeModal('routeEditor'); return;
    case 'save': {
      cmd('routeSave', { id: ed.id, name: ed.name.trim() || 'Route', stops: ed.stops, minBalance: ed.minBalance || 0, assign: [...ed.assign] });
      closeModal('routeEditor');
      return;
    }
  }
  renderEditor();
});

card.addEventListener('change', (ev) => {
  const el = ev.target;
  if (!ed) return;
  if (el.id === 'reName') { ed.name = el.value; return; }
  if (el.id === 'reMin') { ed.minBalance = Math.max(0, Math.floor(Number(el.value) || 0)); return; }
  if (el.dataset.assign) { if (el.checked) ed.assign.add(el.dataset.assign); else ed.assign.delete(el.dataset.assign); return; }
  if (!el.dataset.f) return;
  const st = ed.stops[Number(el.dataset.i)];
  const a = st.actions[Number(el.dataset.j)];
  const e = state.entities.get(st.targetId);
  const num = (v) => Math.max(0, Number(v) || 0);
  switch (el.dataset.f) {
    case 'op': {
      const op = el.value;
      const good = op === 'mine' || op === 'refuel' ? undefined : goodsForOp(e, op).includes(a.good) ? a.good : goodsForOp(e, op)[0];
      st.actions[Number(el.dataset.j)] = op === 'waitUntil' ? { op, good, cond: 'stock>=', value: 50, timeout: 600 } : op === 'refuel' || op === 'mine' ? { op } : { op, good, amount: 0 };
      break;
    }
    case 'good': a.good = el.value; break;
    case 'cond': a.cond = el.value; break;
    case 'amount': a.amount = Math.floor(num(el.value)); return;
    case 'limit': a.limit = num(el.value); return;
    case 'value': a.value = num(el.value); return;
    case 'timeout': a.timeout = Math.max(10, Math.floor(num(el.value))) || 600; return;
  }
  renderEditor();
});

registerModal('routeEditor', renderEditor, () => {
  ed = null;
  if (state.pickMode) { state.pickMode = null; hint(null); }
}, { live: false });

/** Stopp zu bestehender Route hinzufügen */
export function addStopToRoute(routeId, entityId) {
  const r = state.routes.get(routeId);
  const e = state.entities.get(entityId);
  if (!r || !e) return;
  const stops = structuredClone(r.stops);
  stops.push({ targetId: e.id, actions: [] });
  cmd('routeSave', { id: r.id, name: r.name, stops, minBalance: r.minBalance || 0 });
  toast(`${e.name} zu Route ${r.name} hinzugefügt`, 'info');
}

// =====================================================================
// Routenübersicht (Taste R)
// =====================================================================
const expanded = new Set();
const ovCard = $('routesCard');

function routeGoods(r) {
  // je Stopp die gehandelten Waren mit Grenze
  return r.stops.map((st) => ({
    st,
    goods: st.actions.filter((a) => a.good).map((a) => ({ good: a.good, op: a.op, limit: a.op === 'waitUntil' && a.cond.startsWith('price') ? a.value : a.limit || 0 })),
  }));
}

function priceSeries(entityId, good) {
  const st = state.stats.get(entityId);
  if (!st) return [];
  const byB = new Map(st.data.map((d) => [d.b, d]));
  const vals = [];
  for (let k = st.buckets - 1; k >= 0; k--) vals.push(byB.get(st.now - k)?.pr?.[good] ?? null);
  return vals;
}

function renderOverview() {
  const routes = [...state.routes.values()].sort((a, b) => a.name.localeCompare(b.name));
  let h = `<div class="modal-head"><h2>Routen</h2><span class="muted">${routes.length} Vorlagen</span><span style="flex:1"></span>
    <button class="primary" data-r="new">＋ Neue Route</button><button data-r="close">✕</button></div>`;
  if (!routes.length) h += `<div class="muted">Noch keine Routen. Lege eine an und weise ihr Schiffe zu.</div>`;
  for (const r of routes) {
    const ships = shipsOnRoute(r.id);
    const warned = ships.filter(hasWarn);
    const sum = state.fleetStats.routes[r.id] || { h1: 0, d24: 0 };
    const open = expanded.has(r.id);
    h += `<div class="route-row${r.paused ? ' paused' : ''}">
      <div class="rr-head">
        <button class="small ghost" data-r="toggle" data-id="${r.id}">${open ? '▾' : '▸'}</button>
        <b class="rr-name">${esc(r.name)}</b>
        ${r.paused ? '<span class="badge">pausiert</span>' : ''}
        ${warned.length ? `<span class="badge warn" title="${esc(warned.map((s) => s.name + ': ' + Object.values(s.warn).join(', ')).join('\n'))}">⚠ ${warned.length}</span>` : ''}
        ${r.minBalance ? `<span class="badge" title="Mindestkontostand">≥ ${fmtK(r.minBalance).replace('+', '')}</span>` : ''}
        <span style="flex:1"></span>
        <span class="rr-sal" title="Saldo 1 h">1 h <b class="${sum.h1 < 0 ? 'neg' : 'pos'}">${fmtK(sum.h1)}</b></span>
        <span class="rr-sal" title="Saldo 24 h">24 h <b class="${sum.d24 < 0 ? 'neg' : 'pos'}">${fmtK(sum.d24)}</b></span>
      </div>
      <div class="chips">${ships.map((s) => `<span class="chip">${shipSymbol(s)} ${esc(s.name)}${hasWarn(s) ? ' <span class="warn">⚠</span>' : ''}
        <button class="small ghost" data-r="unassign" data-id="${r.id}" data-ship="${s.id}" title="Von Route nehmen">✕</button></span>`).join('') || '<span class="muted">keine Schiffe</span>'}</div>
      <div class="btnrow">
        <button class="small" data-r="edit" data-id="${r.id}">✎ Bearbeiten</button>
        <button class="small" data-r="assign" data-id="${r.id}" title="Ausgewählte Schiffe zuweisen">＋ Auswahl zuweisen</button>
        <button class="small" data-r="pause" data-id="${r.id}">${r.paused ? '▶ Fortsetzen' : '⏸ Pausieren'}</button>
        <button class="small danger" data-r="delete" data-id="${r.id}">🗑 Löschen</button>
      </div>`;
    if (open) {
      h += `<div class="rr-stops">`;
      routeGoods(r).forEach(({ st, goods }, i) => {
        const e = state.entities.get(st.targetId);
        h += `<div class="rr-stop"><div><span class="num small">${i + 1}</span> <b>${esc(e?.name || '?')}</b> <span class="muted">${st.actions.map(actionText).join(', ') || 'keine Aktion'}</span></div>`;
        for (const g of goods) {
          const sl = e?.market?.goods[g.good];
          if (!sl) continue;
          const vals = priceSeries(e.id, g.good);
          const cur = playerPrice(e, g.good, g.op === 'buy' ? 'buy' : g.op === 'sell' ? 'sell' : null);
          h += `<div class="rr-good">${GOODS[g.good].name}
            ${sparkline(vals, { limit: g.limit, title: `${GOODS[g.good].name} bei ${e.name}, letzte 3 h` })}
            <span class="muted">${cur.toFixed(1)} Cr</span>
            ${stockBar(sl.stock, sl.cap, '#4fc3f7')} <span class="muted">${Math.floor(sl.stock)}/${sl.cap}</span></div>`;
        }
        h += `</div>`;
      });
      h += `</div>`;
    }
    h += `</div>`;
  }
  setHtml(ovCard, h);
}

/** Statistik und Abos für aufgeklappte Routen */
function syncSubs() {
  extraSubs.routes.clear();
  if (!isOpen('routesOverview')) return;
  for (const rid of expanded) {
    const r = state.routes.get(rid);
    for (const st of r?.stops || []) extraSubs.routes.add(st.targetId);
  }
}
function requestRouteStats() {
  for (const id of extraSubs.routes) if (state.entities.get(id)?.market) socket.emit('stats', { entityId: id });
}
setInterval(() => { if (isOpen('routesOverview')) requestRouteStats(); }, 20000);

ovCard.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-r]');
  if (!b) return;
  const id = b.dataset.id;
  const r = state.routes.get(id);
  switch (b.dataset.r) {
    case 'close': closeModal('routesOverview'); return;
    case 'new': openRouteEditor(null, { assign: selectedShips().map((s) => s.id) }); return;
    case 'toggle':
      if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
      syncSubs();
      requestRouteStats();
      break;
    case 'edit': openRouteEditor(id); return;
    case 'assign': {
      const ships = selectedShips();
      if (!ships.length) { toast('Erst Schiffe in der Flottenliste auswählen (Strg/Shift+Klick).'); return; }
      cmd('routeAssign', { route: id, ships: ships.map((s) => s.id), append: false });
      return;
    }
    case 'unassign': cmd('routeUnassign', { route: id, ship: b.dataset.ship }); return;
    case 'pause': cmd('routePause', { route: id, paused: !r.paused }); return;
    case 'delete': if (confirm(`Route "${r.name}" löschen?`)) cmd('routeDelete', { route: id }); return;
  }
  renderOverview();
});

registerModal('routesOverview', () => { syncSubs(); renderOverview(); }, () => syncSubs());

export function openRoutesOverview() { openModal('routesOverview'); requestRouteStats(); }

// =====================================================================
// Routen-Menü am Schiff
// =====================================================================
const menu = $('popMenu');
export function openRouteMenu(shipId, anchor) {
  const s = state.ships.get(shipId);
  if (!s) return;
  const cur = s.queue?.find((c) => c.t === 'route');
  const routes = [...state.routes.values()];
  let h = '';
  if (s.main) {
    menu.innerHTML = '<div class="menu-sep">♛ Das Hauptschiff fährt keine Routen.</div>';
    menu.dataset.ship = shipId;
    const rc = anchor.getBoundingClientRect();
    menu.hidden = false;
    menu.style.left = Math.min(rc.left, innerWidth - menu.offsetWidth - 8) + 'px';
    menu.style.top = Math.min(rc.bottom + 4, innerHeight - menu.offsetHeight - 8) + 'px';
    return;
  }
  if (cur) h += `<button data-m="edit" data-id="${cur.route}">✎ Aktuelle Route bearbeiten</button>`;
  h += `<button data-m="new">＋ Neue Route mit diesem Schiff</button>`;
  if (routes.length) h += `<div class="menu-sep">Zuweisen (Shift: anhängen)</div>` + routes.map((r) => `<button data-m="assign" data-id="${r.id}">↻ ${esc(r.name)}</button>`).join('');
  menu.innerHTML = h;
  menu.dataset.ship = shipId;
  const rc = anchor.getBoundingClientRect();
  menu.hidden = false;
  menu.style.left = Math.min(rc.left, innerWidth - menu.offsetWidth - 8) + 'px';
  menu.style.top = Math.min(rc.bottom + 4, innerHeight - menu.offsetHeight - 8) + 'px';
}
menu.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-m]');
  if (!b) return;
  const ship = menu.dataset.ship;
  menu.hidden = true;
  if (b.dataset.m === 'edit') openRouteEditor(b.dataset.id);
  else if (b.dataset.m === 'new') openRouteEditor(null, { assign: [ship] });
  else if (b.dataset.m === 'assign') cmd('routeAssign', { route: b.dataset.id, ships: [ship], append: ev.shiftKey });
});
addEventListener('mousedown', (ev) => { if (!menu.hidden && !menu.contains(ev.target) && !ev.target.closest('[data-act="routeMenu"]')) menu.hidden = true; });

bus.openRouteEditor = openRouteEditor;
bus.openRouteMenu = openRouteMenu;
