import { mainShip } from '/shared/planet-access.js';
import { SHIP_TYPES } from '/shared/config.js';
import { state, fleetOrder, esc, fmtK } from '../state.js';
import { cmd } from '../net.js';
import { shipSprite, cargoFill, statusText, shipSymbol, hasWarn } from '../util.js';
import { $, setHtml } from './dom.js';
import { bus } from './bus.js';

const FILTERS = { all: 'Alle', idle: 'Untätig', route: 'Route', warn: '⚠' };
const filterFn = {
  all: () => true,
  idle: (s) => !s.queue?.length,
  route: (s) => s.queue?.[0]?.t === 'route',
  warn: hasWarn,
};

let lastClicked = null;
/** Gruppe eines Schiffes (null, wenn keine oder nicht mehr vorhanden) */
const groupOf = (s) => (s.group && state.groups.some((x) => x.id === s.group) ? s.group : null);

export function renderFleet() {
  const ships = fleetOrder();
  const f = filterFn[state.fleetFilter];
  const counts = Object.fromEntries(Object.keys(FILTERS).map((k) => [k, ships.filter(filterFn[k]).length]));
  setHtml($('fleetFilter'), Object.entries(FILTERS).map(([k, label]) =>
    `<button class="small${state.fleetFilter === k ? ' active' : ''}" data-filter="${k}">${label} ${counts[k]}</button>`).join(''));

  const groups = [{ id: null, name: 'Ohne Gruppe', collapsed: false }, ...state.groups];
  let h = '';
  for (const g of groups) {
    const members = ships.filter((s) => groupOf(s) === g.id);
    if (g.id === null && !members.length && state.groups.length) continue;
    const shown = members.filter(f);
    if (g.id !== null) {
      const sal = members.reduce((a, s) => a + (state.fleetStats.ships[s.id] || 0), 0);
      h += `<div class="group-head" data-group="${g.id}" draggable="false">
        <span class="tog" data-act="toggle">${g.collapsed ? '▸' : '▾'}</span>
        <span class="gname" data-act="rename" title="Doppelklick: umbenennen">${esc(g.name)}</span>
        <span class="muted">${members.length}</span>
        <span class="saldo ${sal < 0 ? 'neg' : ''}">${members.length ? fmtK(sal) : ''}</span>
        <span class="gbtns"><button class="small" data-act="selgroup" title="Gruppe auswählen">◉</button><button class="small" data-act="up" title="nach oben">↑</button><button class="small danger" data-act="delgroup" title="Gruppe auflösen">✕</button></span></div>`;
      if (g.collapsed) continue;
    } else if (state.groups.length) {
      h += `<div class="group-head nogroup" data-group="none"><span class="gname muted">Ohne Gruppe</span></div>`;
    }
    for (const s of shown) h += shipRow(s);
  }
  if (!ships.length) h = '<div class="muted">Keine Schiffe</div>';
  setHtml($('fleetList'), h);
}

function shipRow(s) {
  const def = SHIP_TYPES[s.type];
  const sel = state.selection.has(s.id) || (state.selected?.kind === 'ship' && state.selected.id === s.id);
  const sal = state.fleetStats.ships[s.id] || 0;
  const warn = hasWarn(s) ? `<span class="warn" title="${esc(Object.values(s.warn).join('\n'))}">⚠</span>` : '';
  return `<div class="fleet-item${sel ? ' sel' : ''}" data-ship="${s.id}" draggable="true">
    <span class="sym">${shipSymbol(s)}</span>
    <img src="${shipSprite(s.type, state.me.color)}" alt="">
    <div class="fi-main">
      <div class="name">${(state.homeworld?mainShip({...state.me,relic:state.relic},state.ships)?.id===s.id:s.main) ? '<span class="crown" title="Hauptschiff">♛</span> ' : ''}${state.homeworld && state.manualShip === s.id ? '<span class="badge" title="Aktiv manuell gesteuertes Schiff">● Manuell</span> ' : ''}${s.relicSpeed ? `<span class="badge" title="Reliktantrieb, treibstofffrei">×${s.relicSpeed}</span> ` : ''}${esc(s.name)} ${warn}<span class="muted type">${def.name} · ${def.cls}</span></div>
      <div class="sub">${statusText(s)}</div>
      <div class="bar"><div style="width:${cargoFill(s) * 100}%"></div></div>
    </div>
    <span class="saldo ${sal < 0 ? 'neg' : ''}" title="Saldo letzte Stunde">${fmtK(sal)}</span></div>`;
}

// ---------- Auswahl ----------
const list = $('fleetList');

list.addEventListener('click', (ev) => {
  const head = ev.target.closest('.group-head');
  if (head) return groupClick(ev, head);
  const it = ev.target.closest('[data-ship]');
  if (!it) return;
  const id = it.dataset.ship;
  if (ev.shiftKey && lastClicked) {
    const ids = [...list.querySelectorAll('[data-ship]')].map((el) => el.dataset.ship);
    const a = ids.indexOf(lastClicked), b = ids.indexOf(id);
    if (a >= 0 && b >= 0) {
      if (!ev.ctrlKey) state.selection.clear();
      for (const x of ids.slice(Math.min(a, b), Math.max(a, b) + 1)) state.selection.add(x);
      if (state.selected?.kind === 'ship' && !state.selection.has(state.selected.id)) state.selection.add(state.selected.id);
      bus.select({ kind: 'ship', id }, { keepSelection: true });
      return;
    }
  }
  if (ev.ctrlKey || ev.metaKey) {
    // Bisherige Einzelauswahl in die Mehrfachauswahl übernehmen
    if (!state.selection.size && state.selected?.kind === 'ship') state.selection.add(state.selected.id);
    if (state.selection.has(id)) state.selection.delete(id); else state.selection.add(id);
    lastClicked = id;
    const prim = state.selection.has(id) ? id : [...state.selection][0];
    bus.select(prim ? { kind: 'ship', id: prim } : null, { keepSelection: true });
    return;
  }
  lastClicked = id;
  bus.select({ kind: 'ship', id });
});

list.addEventListener('dblclick', (ev) => {
  const it = ev.target.closest('[data-ship]');
  if (it) {
    bus.select({ kind: 'ship', id: it.dataset.ship });
    state.follow = it.dataset.ship;
    return;
  }
  const nm = ev.target.closest('.gname');
  const head = ev.target.closest('.group-head');
  if (nm && head?.dataset.group && head.dataset.group !== 'none') {
    const g = state.groups.find((x) => x.id === head.dataset.group);
    const name = prompt('Gruppenname', g?.name || '');
    if (name?.trim()) cmd('groupRename', { group: g.id, name: name.trim() });
  }
});

function groupClick(ev, head) {
  const gid = head.dataset.group;
  if (gid === 'none') return;
  const g = state.groups.find((x) => x.id === gid);
  const act = ev.target.closest('[data-act]')?.dataset.act;
  if (!g) return;
  if (act === 'toggle') {
    cmd('groupToggle', { group: g.id, collapsed: !g.collapsed });
  } else if (act === 'delgroup') {
    if (confirm(`Gruppe "${g.name}" auflösen? Die Schiffe bleiben erhalten.`)) cmd('groupDelete', { group: g.id });
  } else if (act === 'up') {
    cmd('groupMove', { group: g.id, dir: -1 });
  } else if (act === 'selgroup') {
    const ids = fleetOrder().filter((s) => s.group === g.id).map((s) => s.id);
    state.selection = new Set(ids);
    if (ids.length) bus.select({ kind: 'ship', id: ids[0] }, { keepSelection: true });
  }
}

$('fleetFilter').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-filter]');
  if (!b) return;
  state.fleetFilter = b.dataset.filter;
  renderFleet();
});

$('btnNewGroup').addEventListener('click', () => {
  const name = prompt('Name der neuen Gruppe');
  if (!name?.trim()) return;
  const sel = state.selection.size ? [...state.selection] : state.selected?.kind === 'ship' ? [state.selected.id] : [];
  cmd('groupCreate', { name: name.trim(), ships: sel.filter((id) => state.ships.get(id)?.owner === state.me.id) });
});

// ---------- Drag & Drop ----------
let dragIds = null;
list.addEventListener('dragstart', (ev) => {
  const it = ev.target.closest('[data-ship]');
  if (!it) return;
  const id = it.dataset.ship;
  dragIds = state.selection.has(id) ? fleetOrder().filter((s) => state.selection.has(s.id)).map((s) => s.id) : [id];
  ev.dataTransfer.effectAllowed = 'move';
  ev.dataTransfer.setData('text/plain', id);
});
list.addEventListener('dragover', (ev) => {
  if (!dragIds) return;
  const t = ev.target.closest('[data-ship], .group-head');
  if (!t) return;
  ev.preventDefault();
  list.querySelectorAll('.drop-before, .drop-into').forEach((el) => el.classList.remove('drop-before', 'drop-into'));
  t.classList.add(t.dataset.ship ? 'drop-before' : 'drop-into');
});
list.addEventListener('dragleave', (ev) => ev.target.closest?.('[data-ship], .group-head')?.classList.remove('drop-before', 'drop-into'));
list.addEventListener('dragend', () => {
  dragIds = null;
  list.querySelectorAll('.drop-before, .drop-into').forEach((el) => el.classList.remove('drop-before', 'drop-into'));
});
list.addEventListener('drop', (ev) => {
  ev.preventDefault();
  if (!dragIds) return;
  const t = ev.target.closest('[data-ship], .group-head');
  const moving = new Set(dragIds);
  const rest = fleetOrder().filter((s) => !moving.has(s.id));
  let group, idx;
  if (t?.dataset.ship) {
    const target = state.ships.get(t.dataset.ship);
    group = (target && groupOf(target)) || 'none';
    idx = rest.findIndex((s) => s.id === t.dataset.ship);
  } else if (t?.dataset.group) {
    group = t.dataset.group;
    // ans Ende der Gruppe
    const members = rest.filter((s) => (groupOf(s) || 'none') === group);
    idx = members.length ? rest.indexOf(members[members.length - 1]) + 1 : rest.length;
  } else return;
  if (idx < 0) idx = rest.length;
  const order = [...rest.slice(0, idx).map((s) => s.id), ...dragIds, ...rest.slice(idx).map((s) => s.id)];
  cmd('fleetOrder', { ships: order });
  cmd('shipGroup', { ships: dragIds, group: group === 'none' ? null : group });
  dragIds = null;
});
