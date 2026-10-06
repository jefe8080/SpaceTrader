import { GOODS, SHIP_TYPES, STATION_TYPES, PLANET_TYPES, BELT_TYPES, SHIPYARD, SUPPLY, NPC_OWNER, recipeText } from '/shared/config.js';
import { state, myShips, fmt, esc, playerColor } from './state.js';
import { socket, cmd } from './net.js';
import { typeName, entitySprite, shipSprite, goodTag, playerPrice, dist, cargoUsed, statusText } from './util.js';
import { openRouteEditor } from './routeEditor.js';

const $ = (id) => document.getElementById(id);
const setHtml = (el, html) => { if (el._html !== html) { el.innerHTML = html; el._html = html; } };

// ---------------- Login ----------------
export function renderLogin() {
  const list = state.players;
  $('loginPlayersWrap').hidden = !list.length;
  setHtml($('loginPlayers'), list.map((p) => `<button class="player-chip" data-name="${esc(p.name)}">
    <span class="dot" style="background:${p.color}"></span>${esc(p.name)}${p.online ? ' <span class="online-badge">● online</span>' : ''}</button>`).join(''));
}

function login(name) {
  $('loginError').textContent = '';
  if (!socket.connected) socket.connect();
  socket.emit('login', { name });
}

$('loginForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  login($('loginName').value);
});
$('loginPlayers').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-name]');
  if (b) login(b.dataset.name);
});
export const loginError = (msg) => { $('loginError').textContent = msg; };

export function enterGame() {
  $('login').hidden = true;
  $('hud').hidden = false;
  try {
    if (!localStorage.getItem('st_help_seen')) { $('help').hidden = false; localStorage.setItem('st_help_seen', '1'); }
  } catch { /* Speicher nicht verfügbar */ }
  renderAll();
}

export function leaveGame(msg) {
  $('hud').hidden = true;
  $('login').hidden = false;
  loginError(msg || '');
}

$('btnHelp').onclick = () => { $('help').hidden = false; };
$('btnHelpClose').onclick = () => { $('help').hidden = true; };
$('btnHome').onclick = () => { state.follow = null; state.camera.x = 0; state.camera.y = 0; };

// ---------------- HUD ----------------
export function renderAll() {
  renderTop();
  renderFleet();
  renderDetails();
}
export const onState = renderAll;
export const onMarkets = renderDetails;

function renderTop() {
  $('credits').textContent = fmt(state.credits) + ' Cr';
  $('shipCount').textContent = myShips().length;
  setHtml($('onlinePlayers'), state.players.filter((p) => p.online)
    .map((p) => `<span class="player-chip"><span class="dot" style="background:${p.color}"></span>${esc(p.name)}</span>`).join(''));
}
export const renderOnline = renderTop;

function renderFleet() {
  const ships = myShips().sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  setHtml($('fleetList'), ships.map((s) => {
    const def = SHIP_TYPES[s.type];
    const used = cargoUsed(s);
    const sel = state.selected?.kind === 'ship' && state.selected.id === s.id;
    return `<div class="fleet-item${sel ? ' sel' : ''}" data-ship="${s.id}">
      <img src="${shipSprite(s.type, state.me.color)}" alt="">
      <div style="flex:1;min-width:0">
        <div class="name">${esc(s.name)} <span class="muted" style="font-weight:400;font-size:11px">${def.name}</span></div>
        <div class="sub">${statusText(s)}</div>
        <div class="bar"><div style="width:${(used / def.cargo) * 100}%"></div></div>
      </div></div>`;
  }).join(''));
}

$('fleetList').addEventListener('click', (ev) => {
  const it = ev.target.closest('[data-ship]');
  if (!it) return;
  select({ kind: 'ship', id: it.dataset.ship });
  state.follow = it.dataset.ship;
});

export function select(sel) {
  state.selected = sel;
  if (sel?.kind === 'entity') requestStats();
  renderAll();
}

/** Statistik der gewählten Station beim Server anfragen */
export function requestStats() {
  const sel = state.selected;
  if (sel?.kind === 'entity' && state.entities.get(sel.id)?.market) socket.emit('stats', { entityId: sel.id });
}

const ownerName = (s) => s.owner === NPC_OWNER ? 'Station' : state.players.find((p) => p.id === s.owner)?.name || '?';
const entName = (id) => esc(state.entities.get(id)?.name || 'unbekannter Ort');

// ---------------- Detailpanel ----------------
function renderDetails() {
  const el = $('details');
  const sel = state.selected;
  let html = '';
  if (sel?.kind === 'ship') {
    const s = state.ships.get(sel.id);
    if (s) html = shipDetails(s);
  } else if (sel?.kind === 'entity') {
    const e = state.entities.get(sel.id);
    if (e) html = entityDetails(e);
  }
  el.hidden = !html;
  setHtml(el, html);
}

function shipDetails(s) {
  const def = SHIP_TYPES[s.type];
  const own = s.owner === state.me.id;
  const color = playerColor(s.owner);
  let h = `<div class="det-head"><img src="${shipSprite(s.type, color)}" alt=""><div>
    <div class="title">${esc(s.name)}</div><div class="type">${def.name}${own ? '' : ' · ' + esc(ownerName(s))}</div></div></div>`;
  if (s.task) return h + npcTaskHtml(s);
  if (!own) return h + `<div class="muted">${def.desc}</div>`;
  const used = cargoUsed(s);
  h += `<div class="muted" style="margin-bottom:6px">${statusText(s)}</div>
    <div class="kv"><span>Laderaum</span><span>${used} / ${def.cargo}</span>
    <span>Geschwindigkeit</span><span>${def.speed}</span>
    <span>Bergbau</span><span>${def.mining ? def.mining + ' / s' : '–'}</span></div>`;

  h += `<div class="section"><div class="btnrow">
    <button data-act="route" data-ship="${s.id}">✎ Route bearbeiten</button>
    <button data-act="stop" data-ship="${s.id}" ${s.orders.type === 'idle' ? 'disabled' : ''}>■ Stopp</button>
    <button data-act="follow" data-ship="${s.id}">◎ Folgen</button>`;
  const docked = s.dockedAt ? state.entities.get(s.dockedAt) : null;
  if (docked?.kind === 'belt' && def.mining && s.orders.type === 'idle') {
    h += `<button data-act="mine" data-ship="${s.id}" data-ent="${docked.id}">⛏ Abbauen</button>`;
  }
  h += `</div></div>`;

  h += `<div class="section"><div class="section-title">Ladung</div>`;
  const cargo = Object.entries(s.cargo || {});
  h += cargo.length
    ? `<div class="cargo-list">${cargo.map(([g, n]) => `<div class="cargo-row">${goodTag(g)}<span class="amt">${n}</span>
        <button class="small danger" data-act="jettison" data-ship="${s.id}" data-good="${g}" title="Abwerfen">✕</button></div>`).join('')}</div>`
    : `<div class="muted">leer</div>`;
  h += `</div>`;

  if (docked?.market) {
    h += `<div class="section"><div class="section-title">Markt: ${esc(docked.name)}</div>${marketTable(docked, s)}</div>`;
  }
  if (s.orders.type === 'route') {
    h += `<div class="section"><div class="section-title">Route</div>${s.orders.stops.map((st, i) => {
      const e = state.entities.get(st.targetId);
      const acts = st.actions.map((a) => a.op === 'mine' ? 'Abbauen' : `${a.op === 'buy' ? 'Kaufen' : 'Verkaufen'} ${GOODS[a.good].name}${a.amount ? ' ' + a.amount : ''}${a.limit ? (a.op === 'buy' ? ' ≤ ' : ' ≥ ') + a.limit + ' Cr' : ''}`).join(', ');
      return `<div style="font-size:12px;${i === s.orders.index ? 'color:#ffb74d' : ''}">${i + 1}. ${esc(e?.name || '?')} <span class="muted">${acts || 'keine Aktion'}</span></div>`;
    }).join('')}</div>`;
  }
  if (s.log?.length) {
    h += `<div class="section"><div class="section-title">Logbuch</div><div class="loglines">${s.log.slice(0, 5).map((l) => `<div>${esc(l.msg)}</div>`).join('')}</div></div>`;
  }
  return h;
}

function npcTaskHtml(s) {
  const t = s.task;
  const status = t.phase === 'toSource' ? (s.state === 'mining' ? 'baut ab' : 'Anflug zur Quelle') : 'Rückflug zur Station';
  return `<div class="muted">${SHIP_TYPES[s.type].desc}</div>
    <div class="kv" style="margin-top:6px"><span>Station</span><span>${entName(t.stationId)}</span>
    <span>Auftrag</span><span>${GOODS[t.good].name} von ${entName(t.sourceId)} holen</span>
    <span>Status</span><span>${status}</span>
    <span>Ladung</span><span>${cargoUsed(s)} / ${SHIP_TYPES[s.type].cargo}</span></div>`;
}

function supplyText(m) {
  const sup = m.supply;
  if (!sup) return 'Rohstoffe vorhanden';
  const g = GOODS[sup.good]?.name || '?';
  if (sup.state === 'active') return `Versorger unterwegs, holt ${g} von ${entName(sup.sourceId)}`;
  if (sup.state === 'cooldown') return `Lieferung ${g} eingetroffen`;
  if (sup.state === 'nosource') return `⚠ Keine Quelle für ${g} im Umkreis von ${fmt(SUPPLY.RANGE)}`;
  return '–';
}

function marketTable(e, ship) {
  const canTrade = ship && ship.dockedAt === e.id && ship.orders.type !== 'route';
  const rows = Object.entries(e.market.goods).map(([g, sl]) => {
    const pct = Math.min(100, (sl.stock / sl.cap) * 100);
    const price = playerPrice(e, g);
    const produce = sl.role === 'produce';
    let act = '';
    if (canTrade) {
      if (produce) {
        act = ['1', '10', 'max'].map((a) => `<button class="small" data-act="trade" data-dir="buy" data-ship="${ship.id}" data-ent="${e.id}" data-good="${g}" data-amt="${a}">${a === 'max' ? 'Max' : '+' + a}</button>`).join(' ');
      } else if (ship.cargo?.[g]) {
        act = ['1', '10', 'max'].map((a) => `<button class="small" data-act="trade" data-dir="sell" data-ship="${ship.id}" data-ent="${e.id}" data-good="${g}" data-amt="${a}">${a === 'max' ? 'Alle' : '−' + a}</button>`).join(' ');
      }
    }
    const barCol = produce ? '#81c784' : '#ffb74d';
    return `<tr><td>${goodTag(g)}</td>
      <td><span class="stockbar"><div style="width:${pct}%;background:${barCol}"></div></span> <span class="muted">${Math.floor(sl.stock)}/${sl.cap}</span></td>
      <td class="${produce ? 'price-buy' : 'price-sell'}" title="${produce ? 'Einkaufspreis für dich' : 'Verkaufserlös für dich'}">${produce ? 'Kauf' : 'Verk.'} ${price.toFixed(1)}</td>
      <td style="white-space:nowrap">${act}</td></tr>`;
  });
  let h = `<table class="market"><tr><th>Ware</th><th>Lager</th><th>Preis</th><th></th></tr>${rows.join('')}</table>`;
  if (ship && ship.dockedAt === e.id && ship.orders.type === 'route') h += `<div class="muted" style="font-size:11px;margin-top:4px">Schiff fährt eine Route, manueller Handel erst nach Stopp.</div>`;
  else if (!ship) h += `<div class="muted" style="font-size:11px;margin-top:4px">Zum Handeln ein eigenes Schiff hier andocken.</div>`;
  return h;
}

function entityDetails(e) {
  let h = `<div class="det-head"><img src="${entitySprite(e)}" alt=""><div>
    <div class="title">${esc(e.name)}</div><div class="type">${typeName(e)}</div></div></div>`;
  const m = e.market;
  if (e.kind === 'planet') {
    h += `<div class="muted">${PLANET_TYPES[e.type].desc}</div>
      <div class="kv" style="margin-top:6px"><span>Versorgung</span><span>${Math.round(m.eff * 100)} % Produktionsleistung</span></div>`;
  } else if (e.kind === 'station') {
    const def = STATION_TYPES[e.type];
    if (def.recipe) {
      h += `<div class="kv"><span>Verarbeitung</span><span>${recipeText(def.recipe)} (${def.recipe.time}s)</span>
        <span>Status</span><span>${m.eff >= 1 ? 'läuft' : m.eff > 0 ? 'langsam (keine Nahrung)' : 'steht still'}</span>
        <span>Versorgung</span><span>${supplyText(m)}</span></div>`;
    } else if (def.consume) {
      h += `<div class="muted">Kauft Touristen, Nahrung und Luxusgüter.</div>`;
    } else if (e.type === 'shipyard') {
      h += `<div class="muted">Kauft Baumaterial und baut daraus Schiffe.</div>`;
    }
  } else if (e.kind === 'belt') {
    h += `<div class="kv"><span>Rohstoff</span><span>${goodTag(beltGood(e))}</span><span>Ergiebigkeit</span><span>${Math.round(e.richness * 100)} %</span></div>
      <div class="muted" style="margin-top:6px">Schiffe mit Bergbauausrüstung können hier abbauen (Rechtsklick).</div>`;
  }

  const ships = myShips();
  const dockedHere = ships.filter((s) => s.dockedAt === e.id);
  if (m) {
    const selShip = state.selected?.kind === 'ship' ? state.ships.get(state.selected.id) : null;
    const tradeShip = dockedHere.find((s) => s === selShip) || dockedHere.find((s) => s.orders.type !== 'route') || dockedHere[0];
    h += `<div class="section"><div class="section-title">Markt${tradeShip ? ' · handelt mit ' + esc(tradeShip.name) : ''}</div>${marketTable(e, tradeShip)}</div>`;
  }
  if (e.type === 'shipyard') h += shipyardSection(e, dockedHere.length > 0);
  if (m) h += statsSection(e);

  if (ships.length) {
    h += `<div class="section"><div class="section-title">Schiff hierher schicken</div><div class="btnrow">
      ${ships.map((s) => `<button class="small" data-act="${e.kind === 'belt' && SHIP_TYPES[s.type].mining ? 'mine' : 'goto'}" data-ship="${s.id}" data-ent="${e.id}" ${s.dockedAt === e.id ? 'disabled' : ''}>${esc(s.name)}</button>`).join('')}
    </div></div>`;
  }
  return h;
}

const beltGood = (e) => BELT_TYPES[e.type].good;

function shipyardSection(e, canBuy) {
  const m = e.market;
  let h = `<div class="section"><div class="section-title">Schiffe zum Verkauf</div>`;
  if (!m.forSale?.length) h += `<div class="muted">Derzeit keine Schiffe verfügbar.</div>`;
  (m.forSale || []).forEach((it, i) => {
    const d = SHIP_TYPES[it.type];
    h += `<div class="forsale"><img src="${shipSprite(it.type, state.me.color)}" alt=""><div class="info"><b>${d.name}</b><br>
      Laderaum ${d.cargo} · Tempo ${d.speed}${d.mining ? ' · Bergbau ' + d.mining : ''}<br><span class="muted">${d.desc}</span></div>
      <div style="text-align:right"><div style="color:#ffb74d;font-weight:600">${fmt(it.price)} Cr</div>
      <button class="small primary" data-act="buyShip" data-ent="${e.id}" data-idx="${i}" ${!canBuy || state.credits < it.price ? 'disabled' : ''}
        title="${canBuy ? '' : 'Ein eigenes Schiff muss hier angedockt sein'}">Kaufen</button></div></div>`;
  });
  if (m.building) {
    h += `<div style="margin-top:6px">🔧 Im Bau: <b>${SHIP_TYPES[m.building.type].name}</b> (noch ${m.building.remaining}s)</div>`;
  } else if ((m.forSale?.length || 0) < SHIPYARD.MAX_FOR_SALE) {
    const next = SHIPYARD.BUILD_ORDER[m.nextBuild];
    const req = Object.entries(SHIP_TYPES[next].build)
      .map(([g, n]) => `${GOODS[g].name} ${Math.floor(m.goods[g]?.stock || 0)}/${n}`).join(', ');
    h += `<div style="margin-top:6px" class="muted">Nächster Bau: <b>${SHIP_TYPES[next].name}</b> · benötigt ${req}</div>`;
  } else {
    h += `<div style="margin-top:6px" class="muted">Dock voll, keine weiteren Bauten.</div>`;
  }
  return h + '</div>';
}

$('details').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const d = b.dataset;
  switch (d.act) {
    case 'route': openRouteEditor(d.ship); break;
    case 'stop': cmd('stop', { ship: d.ship }); break;
    case 'follow': state.follow = d.ship; break;
    case 'mine': cmd('mine', { ship: d.ship, target: d.ent }); break;
    case 'goto': cmd('goto', { ship: d.ship, target: d.ent }); break;
    case 'jettison': if (confirm(`${GOODS[d.good].name} wirklich abwerfen?`)) cmd('jettison', { ship: d.ship, good: d.good }); break;
    case 'trade': cmd('trade', { ship: d.ship, target: d.ent, good: d.good, dir: d.dir, amount: d.amt }); break;
    case 'buyShip': cmd('buyShip', { target: d.ent, index: Number(d.idx) }); break;
  }
});

/** Markt-IDs, die offene Dialoge brauchen (Detailpanel, angedockte Schiffe) */
export function dialogMarkets() {
  const ids = new Set();
  const sel = state.selected;
  if (sel?.kind === 'entity') ids.add(sel.id);
  if (sel?.kind === 'ship') { const s = state.ships.get(sel.id); if (s?.dockedAt) ids.add(s.dockedAt); }
  for (const id of extraSubs) ids.add(id);
  return ids;
}
export const extraSubs = new Set();

// ---------------- Log, Toasts, Tooltip, Hinweise ----------------
export function addLog(ship, msg) {
  state.logs.unshift({ ship, msg });
  state.logs.length = Math.min(state.logs.length, 8);
  setHtml($('log'), state.logs.map((l) => `<div><b>${esc(l.ship)}:</b> ${esc(l.msg)}</div>`).join(''));
}

export function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  $('toasts').appendChild(t);
  setTimeout(() => t.remove(), 3600);
}

export function hint(text) {
  $('hint').hidden = !text;
  $('hint').textContent = text || '';
}

export function updateTooltip(mx, my) {
  const tt = $('tooltip');
  const hov = state.hover;
  let html = '';
  if (hov?.kind === 'entity') {
    const e = state.entities.get(hov.id);
    if (e) {
      html = `<div class="tt-title">${esc(e.name)}</div><div class="muted">${typeName(e)}</div>`;
      if (e.market) {
        const sells = [], buys = [];
        for (const [g, s] of Object.entries(e.market.goods)) {
          const p = playerPrice(e, g).toFixed(1);
          (s.role === 'produce' ? sells : buys).push(`${GOODS[g].name} ${p}`);
        }
        if (sells.length) html += `<div><span class="price-buy">Verkauft:</span> ${sells.join(', ')}</div>`;
        if (buys.length) html += `<div><span class="price-sell">Kauft:</span> ${buys.join(', ')}</div>`;
      }
      const sel = state.selected?.kind === 'ship' ? state.ships.get(state.selected.id) : null;
      if (sel && sel.owner === state.me.id) html += `<div class="muted">Entfernung: ${Math.round(dist(sel, e))} · Rechtsklick: hinfliegen</div>`;
    }
  } else if (hov?.kind === 'ship') {
    const s = state.ships.get(hov.id);
    if (s) {
      const owner = state.players.find((p) => p.id === s.owner);
      html = `<div class="tt-title" style="color:${playerColor(s.owner)}">${esc(s.name)}</div><div class="muted">${SHIP_TYPES[s.type].name} · ${esc(s.task ? 'Station' : owner?.name || '?')}</div>`;
      if (s.task) html += `<div>Holt ${GOODS[s.task.good].name} von ${entName(s.task.sourceId)}</div>`;
    }
  }
  tt.hidden = !html;
  if (html) {
    setHtml(tt, html);
    tt.style.left = Math.min(mx + 16, innerWidth - tt.offsetWidth - 8) + 'px';
    tt.style.top = Math.min(my + 16, innerHeight - tt.offsetHeight - 8) + 'px';
  }
}

// ---------------- Statistik ----------------
/** Welche Größe das Diagramm zeigt: das, was dort hauptsächlich verarbeitet wird */
function chartSeries(e) {
  const def = e.kind === 'station' ? STATION_TYPES[e.type] : null;
  if (def?.recipe) {
    const g = Object.keys(def.recipe.out)[0];
    return { label: `Produziert: ${GOODS[g].name}`, unit: GOODS[g].name, get: (d) => d.p[g] || 0 };
  }
  if (e.type === 'shipyard') return { label: 'Gebaute Schiffe', unit: 'Schiffe', get: (d) => d.n || 0 };
  if (def?.consume) {
    const g = Object.keys(def.consume)[0];
    return { label: `Aufgenommen: ${GOODS[g].name}`, unit: GOODS[g].name, get: (d) => d.c[g] || 0 };
  }
  const g = Object.entries(e.market.goods).find(([, s]) => s.role === 'produce')?.[0];
  return { label: `Produziert: ${GOODS[g].name}`, unit: GOODS[g].name, get: (d) => d.p[g] || 0 };
}

const niceMax = (v) => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v);
};
const fmtNum = (v) => (v >= 100 ? fmt(v) : (Math.round(v * 10) / 10).toLocaleString('de-DE'));
const bucketLabel = (k, secs) => {
  const m = secs / 60;
  return k === 0 ? `laufende ${m} min` : `vor ${k * m}–${(k + 1) * m} min`;
};

/** Säulendiagramm: eine Reihe, ein Balken je Zeitblock, Hover-Anzeige über data-tip */
function barChart(vals, series, secs) {
  const W = 336, H = 104, padL = 34, padB = 18, padT = 8;
  const n = vals.length;
  const max = niceMax(Math.max(...vals));
  const ph = H - padB - padT;
  const bw = (W - padL) / n;
  const total = vals.reduce((a, b) => a + b, 0);
  let bars = '', hits = '';
  vals.forEach((v, i) => {
    const k = n - 1 - i;
    const x = padL + i * bw;
    const h = v > 0 ? Math.max(2, (v / max) * ph) : 0;
    if (h) bars += `<rect x="${(x + 1).toFixed(1)}" y="${(H - padB - h).toFixed(1)}" width="${Math.max(1, bw - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="1.5" fill="var(--accent)"${k === 0 ? ' opacity="0.5"' : ''}/>`;
    hits += `<rect x="${x.toFixed(1)}" y="${padT}" width="${bw.toFixed(1)}" height="${ph}" fill="transparent" data-tip="${bucketLabel(k, secs)}: ${fmtNum(v)} ${esc(series.unit)}"/>`;
  });
  const xl = [0, 12, 24].map((i) => `<text x="${(padL + i * bw).toFixed(1)}" y="${H - 4}">−${((n - i) * secs) / 3600} h</text>`).join('')
    + `<text x="${W}" y="${H - 4}" text-anchor="end">jetzt</text>`;
  const def = `${series.label} · Summe ${fmtNum(total)}`;
  return `<div class="chart-readout" data-default="${esc(def)}">${esc(def)}</div>
    <svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(series.label)} je ${secs / 60} Minuten">
      <line x1="${padL}" x2="${W}" y1="${padT}" y2="${padT}" class="grid"/>
      <line x1="${padL}" x2="${W}" y1="${padT + ph / 2}" y2="${padT + ph / 2}" class="grid"/>
      <line x1="${padL}" x2="${W}" y1="${H - padB}" y2="${H - padB}" class="axis"/>
      <text x="${padL - 4}" y="${padT + 4}" text-anchor="end">${fmtNum(max)}</text>
      <text x="${padL - 4}" y="${padT + ph / 2 + 4}" text-anchor="end">${fmtNum(max / 2)}</text>
      <text x="${padL - 4}" y="${H - padB + 4}" text-anchor="end">0</text>
      ${bars}${xl}${hits}
    </svg>`;
}

function statsSection(e) {
  const st = state.stats.get(e.id);
  let h = `<div class="section"><div class="section-title">Statistik · letzte 3 Stunden</div>`;
  if (!st) return h + `<div class="muted">wird geladen …</div></div>`;
  const byB = new Map(st.data.map((d) => [d.b, d]));
  const series = chartSeries(e);
  const vals = [];
  for (let k = st.buckets - 1; k >= 0; k--) {
    const d = byB.get(st.now - k);
    vals.push(d ? series.get(d) : 0);
  }
  h += barChart(vals, series, st.bucketSecs);

  const tot = { p: {}, c: {}, i: {}, o: {} };
  let cycles = 0;
  for (const d of st.data) {
    if (d.b <= st.now - st.buckets) continue;
    cycles += d.n || 0;
    for (const k of Object.keys(tot)) for (const [g, v] of Object.entries(d[k])) tot[k][g] = (tot[k][g] || 0) + v;
  }
  const goods = Object.keys(GOODS).filter((g) => e.market.goods[g] || Object.values(tot).some((t) => t[g]));
  const cell = (v) => (v ? fmtNum(v) : '<span class="muted">–</span>');
  h += `<table class="market stats"><tr><th>Ware</th><th>Produziert</th><th>Verbraucht</th><th title="Von Schiffen geliefert">Angeliefert</th><th title="Von Schiffen abgeholt">Abgeholt</th></tr>
    ${goods.map((g) => `<tr><td>${goodTag(g)}</td><td>${cell(tot.p[g])}</td><td>${cell(tot.c[g])}</td><td>${cell(tot.i[g])}</td><td>${cell(tot.o[g])}</td></tr>`).join('')}</table>`;
  if (e.kind === 'station' && STATION_TYPES[e.type].recipe) h += `<div class="muted" style="font-size:11px;margin-top:4px">${fmt(cycles)} Produktionszyklen in 3 h</div>`;
  return h + '</div>';
}

// Hover-Anzeige für die Diagrammbalken
$('details').addEventListener('mouseover', (ev) => {
  const t = ev.target.closest('[data-tip]');
  const ro = $('details').querySelector('.chart-readout');
  if (ro) ro.textContent = t ? t.dataset.tip : ro.dataset.default;
});
