import { GOODS, SHIP_TYPES, PILOT_LICENSES, PILOT_LEVELS, canBuyFrom } from '/shared/config.js';
import { state, myShips, fmt, esc, playerColor, playerName, selectedShips } from '../state.js';
import { socket, cmd } from '../net.js';
import { typeName, playerPrice, flightSecs, fmtDuration } from '../util.js';
import { $, setHtml } from './dom.js';

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

let helpStorageKey = 'st_help_seen_2';
export function enterGame({ onboardingKey, onboardingRequired = false } = {}) {
  $('login').hidden = true;
  $('hud').hidden = false;
  helpStorageKey = onboardingKey ? `st_help_seen_3:${onboardingKey}` : 'st_help_seen_2';
  try {
    $('help').hidden = !!localStorage.getItem(onboardingRequired ? helpStorageKey : 'st_help_seen_2');
  } catch { $('help').hidden = false; }
}

export function leaveGame(msg) {
  $('hud').hidden = true;
  $('login').hidden = false;
  loginError(msg || '');
}

$('btnHelp').onclick = () => { $('help').hidden = false; };
$('btnHelpClose').onclick = () => {
  $('help').hidden = true;
  try { localStorage.setItem(helpStorageKey, '1'); localStorage.setItem('st_help_seen_2', '1'); } catch { /* Hilfe bleibt auch ohne Browserspeicher bedienbar. */ }
};


// ---------------- Topbar ----------------
$('btnMarker').onclick = () => {
  state.markerMode = state.markerMode === 'state' ? 'color' : 'state';
  try { localStorage.setItem('st_marker', state.markerMode); } catch { /* egal */ }
  renderTop();
};

export function renderTop() {
  $('btnHome').textContent = state.homeworld ? '⌂ Heimat anzeigen' : '⌂ Start anzeigen';
  $('profileInfo').textContent = `${state.me?.name || ''} · Level ${state.level || 1} · Pilotenlizenz P${state.pilot || 1} · Gouverneur ${state.governor || 0}`;
  $('btnHome').title = state.homeworld ? 'Zur persönlichen Heimatwelt' : 'Zum Startpunkt';
  $('btnMarker').textContent = state.markerMode === 'state' ? '◆ Marker: Zustand' : '◆ Marker: Farbe';
  $('credits').textContent = fmt(state.credits) + ' Cr';
  $('shipCount').textContent = `${myShips().length} / ${PILOT_LICENSES[state.pilot || 1].maxShips}`;
  $('pilotLevel').textContent = 'P' + (state.pilot || 1);
  const L = state.level || 1, cur = PILOT_LEVELS[L], next = PILOT_LEVELS[L + 1];
  $('levelValue').textContent = String(L);
  $('xpFill').style.width = next ? Math.min(100, ((state.xp - cur.xp) / (next.xp - cur.xp)) * 100) + '%' : '100%';
  $('levelStat').title = next ? `Pilotenlevel ${L}: ${state.xp.toLocaleString('de-DE')} / ${next.xp.toLocaleString('de-DE')} XP` : `Pilotenlevel ${L} · ${cur.title || ''}`;
  setHtml($('onlinePlayers'), state.players.filter((p) => p.online)
    .map((p) => `<span class="player-chip"><span class="dot" style="background:${p.color}"></span>${esc(p.name)}</span>`).join(''));
  const sl = state.stopLoss;
  const active = sl > 0 && state.credits < sl;
  $('stopLossBtn').classList.toggle('active', active);
  $('stopLossBtn').classList.toggle('set', sl > 0);
  $('stopLossBtn').textContent = sl > 0 ? `Stop-Loss ${fmt(sl)}${active ? ' ⚠ aktiv' : ''}` : 'Stop-Loss aus';
  $('stopLossBtn').title = active ? 'Kontostand unter Stop-Loss: Routen kaufen nicht mehr automatisch ein.' : 'Automatische Einkäufe aus Routen stoppen, wenn der Kontostand darunter fällt.';
}

$('stopLossBtn').onclick = () => {
  const v = prompt('Stop-Loss in Credits (0 = aus).\nUnterhalb dieses Kontostands kaufen Routen nicht mehr automatisch ein.', String(state.stopLoss || 0));
  if (v === null) return;
  const n = Math.max(0, Math.floor(Number(v.replace(/\./g, '')) || 0));
  cmd('stopLoss', { value: n });
};

// ---------------- Log ----------------
export function addLog(ship, msg) {
  state.logs.unshift({ ship, msg });
  state.logs.length = Math.min(state.logs.length, 8);
  setHtml($('log'), state.logs.map((l) => `<div><b>${esc(l.ship)}:</b> ${esc(l.msg)}</div>`).join(''));
}

// ---------------- Tooltip ----------------
const entName = (id) => esc(state.entities.get(id)?.name || 'unbekannter Ort');

export function updateTooltip(mx, my) {
  const tt = $('tooltip');
  const hov = state.hover;
  let html = '';
  if (hov?.kind === 'entity') {
    const e = state.entities.get(hov.id);
    if (e) {
      html = `<div class="tt-title">${state.favorites[e.id] ? '★ ' : ''}${esc(e.name)}</div><div class="muted">${typeName(e)}</div>`;
      html += `<div class="muted">Besitzer: ${esc(e.ownerName || (e.owner ? playerName(e.owner) : 'NPC'))}</div>`;
      const ship=selectedShips()[0];
      if(ship) html += `<div class="muted">Entfernung ${Math.round(Math.hypot(ship.x-e.x,ship.y-e.y))} · Flugzeit ${fmtDuration(flightSecs(ship,e))}</div>`;
    }
  } else if (hov?.kind === 'ship') {
    const s = state.ships.get(hov.id);
    if (s) {
      const pl = state.players.find((x) => x.id === s.owner);
      html = `<div class="tt-title" style="color:${playerColor(s.owner)}">${s.main ? '♛ ' : ''}${esc(s.name)}</div><div class="muted">${SHIP_TYPES[s.type].name} · ${esc(s.task ? 'Station' : playerName(s.owner))}${pl?.level ? ' · Level ' + pl.level : ''}</div>`;
      if (pl?.title) html += `<div class="tt-title-badge">„${esc(pl.title)}“</div>`;
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
