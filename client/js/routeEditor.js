import { GOODS, SHIP_TYPES, BELT_TYPES } from '/shared/config.js';
import { state, esc } from './state.js';
import { cmd } from './net.js';
import { typeName, playerPrice, dist } from './util.js';
import { hint } from './ui.js';

const overlay = document.getElementById('routeEditor');
const card = document.getElementById('routeCard');
let ed = null; // { shipId, stops: [{ targetId, actions: [{ op, good, amount }] }] }

const goodsByRole = (e, role) => Object.entries(e?.market?.goods || {}).filter(([, s]) => s.role === role).map(([g]) => g);
const allowedOps = (e) => {
  const ops = [];
  if (goodsByRole(e, 'produce').length) ops.push('buy');
  if (goodsByRole(e, 'consume').length) ops.push('sell');
  if (e?.kind === 'belt') ops.push('mine');
  return ops;
};
const OP_NAMES = { buy: 'Kaufen', sell: 'Verkaufen', mine: 'Abbauen' };

export function openRouteEditor(shipId) {
  const s = state.ships.get(shipId);
  if (!s) return;
  ed = { shipId, stops: s.orders.type === 'route' ? structuredClone(s.orders.stops) : [] };
  overlay.hidden = false;
  render();
}

function close() {
  overlay.hidden = true;
  ed = null;
}

function defaultActions(e) {
  if (e.kind === 'belt') return SHIP_TYPES[state.ships.get(ed.shipId).type].mining ? [{ op: 'mine' }] : [];
  // Waren verkaufen, die woanders auf der Route gekauft oder abgebaut werden
  const gathered = new Set();
  for (const st of ed.stops) {
    const se = state.entities.get(st.targetId);
    for (const a of st.actions) {
      if (a.op === 'buy') gathered.add(a.good);
      if (a.op === 'mine' && se?.kind === 'belt') gathered.add(BELT_TYPES[se.type].good);
    }
  }
  return goodsByRole(e, 'consume').filter((g) => gathered.has(g)).map((g) => ({ op: 'sell', good: g, amount: 0 }));
}

function addStop(id) {
  const e = state.entities.get(id);
  if (!e || ed.stops.length >= 12) return;
  ed.stops.push({ targetId: id, actions: defaultActions(e) });
  render();
}

function render() {
  const ship = state.ships.get(ed.shipId);
  if (!ship) return close();
  const def = SHIP_TYPES[ship.type];
  let h = `<h2>Route für ${esc(ship.name)}</h2>
    <div class="muted">Das Schiff fliegt die Stopps der Reihe nach ab und wiederholt die Runde endlos.
    Menge leer = so viel wie möglich. Mit einer Preisgrenze vermeidest du Verlustgeschäfte. Laderaum: ${def.cargo}.</div>`;

  ed.stops.forEach((st, i) => {
    const e = state.entities.get(st.targetId);
    h += `<div class="stop"><div class="stop-head"><span class="num">${i + 1}</span>
      <span class="nm">${esc(e?.name || '?')} <span class="muted" style="font-weight:400">${e ? typeName(e) : ''}</span></span>
      <button class="small" data-a="up" data-i="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button class="small" data-a="down" data-i="${i}" ${i === ed.stops.length - 1 ? 'disabled' : ''}>↓</button>
      <button class="small danger" data-a="del" data-i="${i}">✕</button></div>`;
    st.actions.forEach((a, j) => {
      const ops = allowedOps(e);
      h += `<div class="action"><select data-f="op" data-i="${i}" data-j="${j}">
        ${ops.map((o) => `<option value="${o}" ${o === a.op ? 'selected' : ''}>${OP_NAMES[o]}</option>`).join('')}</select>`;
      if (a.op !== 'mine') {
        const goods = goodsByRole(e, a.op === 'buy' ? 'produce' : 'consume');
        h += `<select data-f="good" data-i="${i}" data-j="${j}">${goods.map((g) => `<option value="${g}" ${g === a.good ? 'selected' : ''}>${GOODS[g].name}</option>`).join('')}</select>
          <input type="number" min="0" placeholder="Menge" title="Menge (leer = so viel wie möglich)" value="${a.amount || ''}" data-f="amount" data-i="${i}" data-j="${j}">
          <input type="number" min="0" step="0.1" placeholder="${a.op === 'buy' ? 'max. Preis' : 'min. Preis'}"
            title="${a.op === 'buy' ? 'Nur kaufen, solange der Preis höchstens so hoch ist' : 'Nur verkaufen, solange der Preis mindestens so hoch ist'}"
            value="${a.limit || ''}" data-f="limit" data-i="${i}" data-j="${j}">
          <span class="hintp">aktuell ${playerPrice(e, a.good)?.toFixed(1) ?? '?'} Cr</span>`;
      } else {
        h += `<span class="hintp">bis der Laderaum voll ist</span>`;
      }
      h += `<button class="small danger" data-a="delAct" data-i="${i}" data-j="${j}">✕</button></div>`;
    });
    const ops = allowedOps(e);
    h += `<div class="action">${ops.map((o) => `<button class="small" data-a="addAct" data-op="${o}" data-i="${i}">+ ${OP_NAMES[o]}</button>`).join(' ')}</div></div>`;
  });

  const known = [...state.entities.values()].sort((a, b) => dist(a, ship) - dist(b, ship));
  h += `<div class="add-stop"><select id="reAddSel">${known.map((e) => `<option value="${e.id}">${esc(e.name)} · ${typeName(e)} · ${Math.round(dist(e, ship))}</option>`).join('')}</select>
    <button data-a="add">+ Stopp</button><button data-a="pick">◎ Auf Karte wählen</button></div>
    <div class="route-footer">
      <button class="danger" data-a="clear">Route löschen</button>
      <span class="spacer" style="flex:1"></span>
      <button data-a="cancel">Abbrechen</button>
      <button class="primary" data-a="save" ${ed.stops.length ? '' : 'disabled'}>Speichern &amp; starten</button>
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
      const good = op === 'mine' ? undefined : goodsByRole(e, op === 'buy' ? 'produce' : 'consume')[0];
      ed.stops[i].actions.push({ op, good, amount: 0 });
      break;
    }
    case 'add': addStop(document.getElementById('reAddSel').value); return;
    case 'pick':
      overlay.hidden = true;
      hint('Ziel auf der Karte anklicken (Esc bricht ab)');
      state.pickMode = (id) => {
        state.pickMode = null;
        hint(null);
        overlay.hidden = false;
        if (id) addStop(id);
      };
      return;
    case 'clear': cmd('route', { shipId: ed.shipId, stops: [] }); close(); return;
    case 'cancel': close(); return;
    case 'save': cmd('route', { shipId: ed.shipId, stops: ed.stops }); close(); return;
  }
  render();
});

card.addEventListener('change', (ev) => {
  const el = ev.target;
  if (!ed || !el.dataset.f) return;
  const a = ed.stops[Number(el.dataset.i)].actions[Number(el.dataset.j)];
  const e = state.entities.get(ed.stops[Number(el.dataset.i)].targetId);
  if (el.dataset.f === 'op') {
    a.op = el.value;
    a.good = a.op === 'mine' ? undefined : goodsByRole(e, a.op === 'buy' ? 'produce' : 'consume')[0];
  } else if (el.dataset.f === 'good') a.good = el.value;
  else if (el.dataset.f === 'amount') { a.amount = Math.max(0, Math.floor(Number(el.value) || 0)); return; }
  else if (el.dataset.f === 'limit') { a.limit = Math.max(0, Number(el.value) || 0); return; }
  render();
});
