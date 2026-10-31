import {sfx} from '../audio.js';
// PRD 15 U05: taktische Schlachtansicht. Eigenständige 2D-Karte, Auswahl, Befehle, Systemliste und Effekte.
// Informationen werden nie nur über Farbe vermittelt: Zustände tragen zusätzlich Symbole und Text.
import { SHIP_TYPES } from '/shared/config.js';
import { SYSTEMS, STATE_NAMES, COMBAT_TYPES, NAVAL_CLASSES } from '/shared/combat.js';
import { socket, cmd } from '../net.js';
import { state, esc } from '../state.js';
import { getSprite } from '../assets.js';

const STATE_ICON = { intact: '●', damaged: '◐', critical: '◔', destroyed: '✕', jammed: 'ϟ' };
const UNIT_ICON = { surrendered: '⚑ kapituliert', retreating: '↩ Rückzug', destroyed: '✖ zerstört' };
const WEAPON_COLOR = { laser: '#ff7043', heavy: '#ffab00', ion: '#4fc3f7', missile: '#eceff1', torpedo: '#ffee58', beam: '#e040fb', flak: '#b0bec5', pd: '#fff59d', gun: '#ffccbc', bomb: '#8d6e63' };
const SIDE_COLOR = { A: '#ef5350', B: '#42a5f5' };

let el = null, canvas = null, ctx = null, panel = null;
let view = null, prev = null, recvAt = 0, battleId = null;
const sel = new Set();
let focus = null, drag = null, cam = { x: 0, y: 0, k: 1, fit: true };
let panelHeld = false; // während eines Klicks in der Seitenleiste nicht neu aufbauen
const fxList = [];

function ensureDom() {
  if (el) return;
  el = document.createElement('div');
  el.id = 'battleView';
  el.className = 'battle-overlay';
  el.hidden = true;
  el.innerHTML = `<div class="battle-head"><b id="bvTitle">Schlacht</b><span id="bvSides" class="muted"></span><span style="flex:1"></span>
    <span id="bvTime" class="muted"></span><button class="small" id="bvClose" aria-label="Schlachtansicht schließen">✕ Schließen</button></div>
    <div class="battle-body"><canvas id="bvCanvas"></canvas><div id="bvPanel" class="battle-panel"></div></div>`;
  document.body.appendChild(el);
  canvas = el.querySelector('#bvCanvas');
  ctx = canvas.getContext('2d');
  panel = el.querySelector('#bvPanel');
  el.querySelector('#bvClose').onclick = closeBattle;
  canvas.addEventListener('mousedown', onDown);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseup', onUp);
  canvas.addEventListener('contextmenu', onRight);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  panel.addEventListener('pointerdown', () => { panelHeld = true; });
  addEventListener('pointerup', () => { if (panelHeld) setTimeout(() => { panelHeld = false; }, 0); });
  panel.addEventListener('click', onPanel);
  panel.addEventListener('change', onPanelChange);
  addEventListener('keydown', (e) => { if (!el.hidden && e.key === 'Escape') closeBattle(); });
}

export function openBattle(id) {
  ensureDom();
  battleId = id; view = null; prev = null; sel.clear(); focus = null; cam.fit = true; fxList.length = 0;
  el.hidden = false;
  socket.emit('battleView', { id });
  requestAnimationFrame(frame);
}
export function closeBattle() {
  if (!el) return;
  el.hidden = true;
  battleId = null;
  socket.emit('battleView', { id: null });
}
export const battleOpen = () => !!el && !el.hidden;

socket.on('battle', (v) => {
  if (!el || v.id !== battleId) return;
  if (v.ended) { view = { ...(view || {}), ended: true }; renderPanel(); return; }
  prev = view; view = v; recvAt = performance.now();
  for (const f of v.fx) fxList.push({ ...f, at: performance.now() });
  while (fxList.length > 200) fxList.shift();
  for (const id of [...sel]) if (!v.units.some((u) => u.id === id && u.own)) sel.delete(id);
  renderPanel();
});

// ---------- Koordinaten ----------
function fit() {
  const r = canvas.getBoundingClientRect();
  canvas.width = r.width * devicePixelRatio; canvas.height = r.height * devicePixelRatio;
  if (cam.fit && view) {
    cam.k = Math.min(r.width / view.map.W, r.height / view.map.H) * 0.96;
    cam.x = view.map.W / 2; cam.y = view.map.H / 2;
  }
}
const toScreen = (x, y) => { const r = canvas.getBoundingClientRect(); return [(x - cam.x) * cam.k + r.width / 2, (y - cam.y) * cam.k + r.height / 2]; };
const toWorld = (sx, sy) => { const r = canvas.getBoundingClientRect(); return [(sx - r.left - r.width / 2) / cam.k + cam.x, (sy - r.top - r.height / 2) / cam.k + cam.y]; };

/** Interpolierte Position zwischen den letzten beiden Ständen */
function pos(u) {
  const p = prev?.units.find((x) => x.id === u.id);
  if (!p) return u;
  const f = Math.min(1, (performance.now() - recvAt) / 200);
  const da = Math.atan2(Math.sin(u.a - p.a), Math.cos(u.a - p.a));
  return { ...u, x: p.x + (u.x - p.x) * f, y: p.y + (u.y - p.y) * f, a: p.a + da * f };
}
const lengthOf = (u) => (SHIP_TYPES[u.type]?.size || 40) * 3;

function unitAt(wx, wy) {
  if (!view) return null;
  let best = null, bd = Infinity;
  for (const u of view.units) {
    const p = pos(u), d = Math.hypot(p.x - wx, p.y - wy);
    if (d < Math.max(lengthOf(u) * 0.6, 14 / cam.k) && d < bd) { bd = d; best = u; }
  }
  return best;
}
/** Hardpoint unter der Maus (Systemangriff direkt am Hardpoint) */
function hardpointAt(u, wx, wy) {
  if (!u?.systems) return null;
  const p = pos(u), L = lengthOf(u);
  for (const s of u.systems) {
    const [hx, hy] = hpPos(p, s, L);
    if (Math.hypot(hx - wx, hy - wy) < Math.max(10 / cam.k, 8)) return s;
  }
  return null;
}
const hpPos = (p, s, L) => [p.x + Math.cos(p.a) * s.x * L / 2 - Math.sin(p.a) * s.y * L / 4, p.y + Math.sin(p.a) * s.x * L / 2 + Math.cos(p.a) * s.y * L / 4];

// ---------- Eingaben ----------
function onDown(e) {
  if (e.button === 1) { drag = { pan: true, sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y }; return; }
  if (e.button !== 0) return;
  const [wx, wy] = toWorld(e.clientX, e.clientY);
  drag = { box: true, x0: wx, y0: wy, x1: wx, y1: wy, add: e.shiftKey };
}
function onMove(e) {
  if (!drag) return;
  if (drag.pan) { cam.fit = false; cam.x = drag.cx - (e.clientX - drag.sx) / cam.k; cam.y = drag.cy - (e.clientY - drag.sy) / cam.k; return; }
  [drag.x1, drag.y1] = toWorld(e.clientX, e.clientY);
}
function onUp(e) {
  if (!drag) return;
  const d = drag; drag = null;
  if (!d.box || !view) return;
  const small = Math.hypot(d.x1 - d.x0, d.y1 - d.y0) * cam.k < 6;
  if (small) {
    // Klick auf Gegner fokussiert das Ziel und behält die eigene Auswahl
    const u = unitAt(d.x1, d.y1);
    if (u?.own) { if (!d.add) sel.clear(); if (sel.has(u.id) && d.add) sel.delete(u.id); else sel.add(u.id); }
    else if (u) focus = u.id;
    else if (!d.add) { sel.clear(); focus = null; }
  } else {
    if (!d.add) sel.clear();
    const [xa, xb] = [Math.min(d.x0, d.x1), Math.max(d.x0, d.x1)], [ya, yb] = [Math.min(d.y0, d.y1), Math.max(d.y0, d.y1)];
    for (const u of view.units) { const p = pos(u); if (u.own && p.x >= xa && p.x <= xb && p.y >= ya && p.y <= yb) sel.add(u.id); }
  }
  renderPanel();
}
function onRight(e) {
  e.preventDefault();
  if (!view || !sel.size) return;
  const [wx, wy] = toWorld(e.clientX, e.clientY);
  const u = unitAt(wx, wy);
  if (u && u.side !== view.side) {
    const hp = hardpointAt(u, wx, wy);
    order({ t: 'attack', target: u.id, sys: hp?.id || undefined });
    focus = u.id;
  } else if (u && u.side === view.side && !sel.has(u.id)) order({ t: 'escort', target: u.id });
  else order({ t: 'move', x: Math.max(0, Math.min(view.map.W, wx)), y: Math.max(0, Math.min(view.map.H, wy)) });
}
function onWheel(e) {
  e.preventDefault();
  const [wx, wy] = toWorld(e.clientX, e.clientY);
  cam.fit = false;
  cam.k = Math.max(0.03, Math.min(2, cam.k * Math.exp(-e.deltaY * 0.0015)));
  const [nx, ny] = toWorld(e.clientX, e.clientY);
  cam.x += wx - nx; cam.y += wy - ny;
}
const order = (o) => cmd('battleOrder', { battle: battleId, ships: [...sel], order: o });

function onPanel(ev) {
  panelHeld = false;
  const b = ev.target.closest('[data-bv]');
  if (!b) return;
  const d = b.dataset;
  switch (d.bv) {
    case 'sel': sel.clear(); sel.add(d.id); break;
    case 'all': for (const u of view.units) if (u.own && ['fight', 'retreating'].includes(u.state)) sel.add(u.id); break;
    case 'focus': focus = d.id; break;
    case 'order': order(JSON.parse(d.o)); break;
    case 'sys': order({ t: 'attack', target: d.target, sys: d.sys }); break;
    case 'hull': order({ t: 'attack', target: d.target }); break;
    case 'dc': for (const id of sel) cmd('battleTactic', { ship: id, dcPrio: d.sys }); break;
    case 'fit': cam.fit = true; break;
  }
  renderPanel();
}
function onPanelChange(ev) {
  const t = ev.target;
  if (t.dataset.bvStance) for (const id of sel) cmd('battleTactic', { ship: id, stance: t.value });
  if (t.dataset.bvHull) for (const id of sel) cmd('battleTactic', { ship: id, hull: Number(t.value) });
  if (t.dataset.bvWeapons) for (const id of sel) cmd('battleTactic', { ship: id, weaponsOut: t.checked });
  if (t.dataset.bvLosses) for (const id of sel) cmd('battleTactic', { ship: id, losses: Number(t.value) });
}

// ---------- Seitenleiste ----------
const pct = (f) => Math.round(f * 100) + ' %';
const bar = (f, cls = '') => `<span class="bv-bar ${cls}" role="img" aria-label="${pct(f)}"><i style="width:${Math.max(0, Math.min(100, f * 100))}%"></i></span>`;

function renderPanel() {
  if (!panel || !view?.units) { if (panel) panel.innerHTML = view?.ended ? '<div class="warnbox">Die Schlacht ist beendet. Den Bericht findest du in den Schiffsmeldungen.</div>' : '<div class="muted">Lade Schlacht …</div>'; return; }
  el.querySelector('#bvTitle').textContent = view.kind === 'raid' ? 'Planetenraid' : 'Schlacht';
  el.querySelector('#bvSides').textContent = ` · ${view.sides.A.join(', ') || '?'} ⚔ ${view.sides.B.join(', ') || '?'}`;
  el.querySelector('#bvTime').textContent = `${Math.floor(view.t / 60)}:${String(Math.floor(view.t % 60)).padStart(2, '0')}`;
  let h = view.ended ? '<div class="warnbox">Die Schlacht ist beendet.</div>' : '';
  if (!view.side) h += `<div class="infobox">👁 Zuschauer: sichtbare Kampfhandlungen ohne verdeckte Systeme, Befehle oder Rückzugsregeln. Keine Steuerung.</div>`;
  if (view.raid) h += `<div class="infobox">Raid: ${view.raid.phase === 'loot' ? `Plünderung läuft (${view.raid.left ?? '?'} s)` : 'Verteidiger besiegen'}</div>`;
  const own = view.units.filter((u) => u.own);
  if (own.length) {
    h += `<div class="section-title">Eigene Einheiten <button class="small ghost" data-bv="all">alle wählen</button> <button class="small ghost" data-bv="fit">⤢ Ansicht</button></div>`;
    h += own.map((u) => `<div class="bv-row${sel.has(u.id) ? ' on' : ''}"><button class="small ghost" data-bv="sel" data-id="${u.id}">${esc(u.name)}</button>
      ${bar(u.hull)} <span class="muted">${u.ai ? 'KI' : 'manuell'}${UNIT_ICON[u.state] ? ' · ' + UNIT_ICON[u.state] : ''}${u.immobile ? ' · ⚓ bewegungsunfähig' : u.driveJammed ? ' · ϟ Antrieb gestört' : ''}${u.fire ? ' · 🔥' : ''}</span></div>`).join('');
  }
  const chosen = own.filter((u) => sel.has(u.id));
  if (chosen.length) {
    const u = chosen[0];
    const o = (x) => esc(JSON.stringify(x));
    h += `<div class="section"><div class="section-title">${chosen.length > 1 ? chosen.length + ' Einheiten' : esc(u.name)} · ${esc(NAVAL_CLASSES[COMBAT_TYPES[u.type]?.cls]?.name || '')}</div>
      <div class="btnrow">
        <button class="small" data-bv="order" data-o="${o({ t: 'ai' })}" ${u.ai ? 'disabled' : ''}>🤖 KI</button>
        <button class="small" data-bv="order" data-o="${o({ t: 'hold' })}">⏸ Halten</button>
        <button class="small" data-bv="order" data-o="${o({ t: 'ceasefire' })}">✋ Feuer einstellen</button>
        <button class="small danger" data-bv="order" data-o="${o({ t: 'retreat' })}">↩ Rückzug</button>
      </div><div class="btnrow"><span class="muted">Priorität:</span>
        ${['weapons', 'engines', 'shields'].map((p) => `<button class="small${u.prio === p ? ' on' : ''}" data-bv="order" data-o="${o({ t: 'priority', p: u.prio === p ? null : p })}">${{ weapons: 'Waffen', engines: 'Antrieb', shields: 'Schilde' }[p]}</button>`).join('')}
      </div>
      ${focus && view.units.find((x) => x.id === focus && x.side !== view.side) ? `<div class="btnrow"><button class="small" data-bv="order" data-o="${o({ t: 'distance', target: focus, d: 900 })}">↔ Abstand halten</button></div>` : ''}
      <label class="muted">Haltung <select data-bv-stance="1">${['offensive', 'defensive', 'escort'].map((s) => `<option value="${s}" ${u.stance === s ? 'selected' : ''}>${{ offensive: 'offensiv', defensive: 'defensiv', escort: 'Eskortschutz' }[s]}</option>`).join('')}</select></label>
      <label class="muted">Rückzug unter <select data-bv-hull="1">${[0, 0.1, 0.25, 0.4, 0.5].map((v) => `<option value="${v}" ${Math.abs((u.retreat?.hull ?? 0) - v) < 0.01 ? 'selected' : ''}>${v ? pct(v) : 'nie'}</option>`).join('')}</select> Rumpf</label>
      <label class="muted"><input type="checkbox" data-bv-weapons="1" ${u.retreat?.weaponsOut ? 'checked' : ''}> bei Waffenausfall</label>
      <label class="muted">bei Verlusten ≥ <select data-bv-losses="1">${[0, 0.25, 0.5, 0.75].map((v) => `<option value="${v}" ${Math.abs((u.retreat?.losses ?? 0) - v) < 0.01 ? 'selected' : ''}>${v ? pct(v) : 'aus'}</option>`).join('')}</select></label>
      ${u.prep !== null && u.prep !== undefined ? `<div>Sprungvorbereitung ${bar(u.prep)} ${pct(u.prep)}${u.retreatBlock ? ' · ⛔ ' + esc(u.retreatBlock) : ''}</div>` : ''}
      <div class="kv"><span>Rumpf</span><span>${bar(u.hull)} ${pct(u.hull)}</span>
      ${u.shields.length ? `<span>Schilde</span><span>${u.shields.map((s) => `${{ omni: 'rundum', bow: 'Bug', stern: 'Heck', port: 'Backbord', starboard: 'Steuerbord' }[s.k]} ${pct(s.f)}`).join(' · ')}</span>` : ''}
      ${u.craft !== null ? `<span>Fluggeräte</span><span>${u.craft}</span>` : ''}
      ${u.ammo?.length ? `<span>Munition</span><span>${u.ammo.join(' / ')}</span>` : ''}</div>
      ${(u.systems || []).length ? `<div class="sys-list">${u.systems.map((s) => `<button class="small sys-chip sys-${s.state}" data-bv="dc" data-sys="${s.id}" title="Schadenskontrolle priorisieren">${STATE_ICON[s.state]} ${SYSTEMS[s.kind].icon} ${esc(SYSTEMS[s.kind].name)} ${s.hp}/${s.max} · ${STATE_NAMES[s.state]}${u.dcPrio === s.id ? ' 🔧' : ''}</button>`).join('')}</div>` : ''}
    </div>`;
  }
  // Fokussierter Gegner: bekannte Systeme als Liste für Systemangriffe
  const f = view.units.find((x) => x.id === focus);
  if (f && f.side !== view.side) {
    h += `<div class="section"><div class="section-title">Ziel: ${esc(f.name)} (${esc(SHIP_TYPES[f.type]?.name || f.type)}, ${esc(f.owner)})</div>
      <div class="kv"><span>Rumpf</span><span>${bar(f.hull)} ${pct(f.hull)}</span><span>Schilde</span><span>${f.shields.map((s) => pct(s.f)).join(' · ') || '–'}</span>
      <span>Status</span><span>${f.live ? 'erfasst' : 'letzte bekannte Position'}${UNIT_ICON[f.state] ? ' · ' + UNIT_ICON[f.state] : ''}${f.immobile ? ' · ⚓' : ''}</span></div>
      ${view.side && chosen.length ? `<button class="small" data-bv="hull" data-target="${f.id}">⌖ Ganzes Schiff angreifen</button>` : ''}
      ${(f.systems || []).length ? `<div class="sys-list">${f.systems.map((s) => `<button class="small sys-chip sys-${s.state}" ${view.side && chosen.length && s.state !== 'destroyed' ? '' : 'disabled'} data-bv="sys" data-target="${f.id}" data-sys="${s.id}">${STATE_ICON[s.state]} ${SYSTEMS[s.kind].icon} ${esc(SYSTEMS[s.kind].name)} · ${STATE_NAMES[s.state]}</button>`).join('')}</div>` : view.side ? '<div class="muted">Keine Systeme identifiziert: näher heran (Sensorreichweite).</div>' : ''}
    </div>`;
  }
  if (view.log?.length) h += `<div class="section"><div class="section-title">Verlauf</div>${view.log.slice().reverse().map((l) => `<div class="muted">${l.t} s · ${esc(l.msg)}</div>`).join('')}</div>`;
  if (panel._h !== h && !panelHeld && !panel.contains(document.activeElement?.tagName === 'SELECT' ? document.activeElement : null)) { panel.innerHTML = h; panel._h = h; }
}

// ---------- Zeichnen ----------
function frame() {
  if (!el || el.hidden) return;
  requestAnimationFrame(frame);
  fit();
  const r = canvas.getBoundingClientRect();
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.fillStyle = '#060b16';
  ctx.fillRect(0, 0, r.width, r.height);
  if (!view?.units) return;
  const now = performance.now();
  // Karte und Rückzugsrand
  const [x0, y0] = toScreen(0, 0), [x1, y1] = toScreen(view.map.W, view.map.H);
  ctx.strokeStyle = '#29425e'; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  const e = view.edge * cam.k;
  ctx.fillStyle = 'rgba(79,195,247,0.05)';
  ctx.fillRect(x0, y0, x1 - x0, e); ctx.fillRect(x0, y1 - e, x1 - x0, e); ctx.fillRect(x0, y0, e, y1 - y0); ctx.fillRect(x1 - e, y0, e, y1 - y0);
  for (const inh of view.inhibitors) {
    const [sx, sy] = toScreen(inh.x, inh.y);
    ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(224,64,251,0.7)'; ctx.beginPath(); ctx.arc(sx, sy, inh.r * cam.k, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#e040fb'; ctx.font = '11px sans-serif'; ctx.fillText('Sprungsperre', sx - 30, sy - inh.r * cam.k - 4);
  }
  for (const u of view.units) drawUnit(u, now);
  for (const p of view.projectiles) drawProjectile(p);
  drawFx(now);
  if (drag?.box) {
    const [a, b] = toScreen(drag.x0, drag.y0), [c, d] = toScreen(drag.x1, drag.y1);
    ctx.strokeStyle = '#81d4fa'; ctx.strokeRect(a, b, c - a, d - b);
  }
}

function drawUnit(u, now) {
  const p = pos(u);
  const [sx, sy] = toScreen(p.x, p.y);
  const L = Math.max(14, lengthOf(u) * cam.k);
  const dead = u.state === 'destroyed';
  ctx.save();
  ctx.globalAlpha = u.live ? 1 : 0.35;
  // Schubflamme nur bei funktionsfähigem Antrieb und Bewegung
  if (!dead && !u.immobile && !u.driveJammed && u.v > 5 && u.state !== 'surrendered') {
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(p.a);
    ctx.fillStyle = 'rgba(255,171,64,0.8)'; ctx.beginPath(); ctx.moveTo(-L / 2, -L * 0.08); ctx.lineTo(-L / 2 - L * 0.25 * Math.min(1, u.v / 150), 0); ctx.lineTo(-L / 2, L * 0.08); ctx.fill();
    ctx.restore();
  }
  const img = getSprite(SHIP_TYPES[u.type]?.sprite, u.color, 256);
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(p.a);
  if (dead) ctx.filter = 'grayscale(1) brightness(0.5)';
  if (img) ctx.drawImage(img, -L / 2, -L / 2, L, L);
  else { ctx.fillStyle = u.color; ctx.beginPath(); ctx.moveTo(L / 2, 0); ctx.lineTo(-L / 2, -L / 4); ctx.lineTo(-L / 2, L / 4); ctx.fill(); }
  ctx.filter = 'none';
  // Schildsektoren: Bögen je Sektor, Stärke als Deckkraft und Linienstärke
  if (!dead) for (const s of u.shields) {
    if (s.f <= 0.01) continue;
    const c = { omni: [0, Math.PI * 2], bow: [-Math.PI / 4, Math.PI / 4], starboard: [Math.PI / 4, 3 * Math.PI / 4], stern: [3 * Math.PI / 4, 5 * Math.PI / 4], port: [-3 * Math.PI / 4, -Math.PI / 4] }[s.k];
    ctx.strokeStyle = `rgba(100,200,255,${0.2 + 0.6 * s.f})`; ctx.lineWidth = 1 + 2 * s.f;
    ctx.beginPath(); ctx.arc(0, 0, L * 0.62, c[0], c[1]); ctx.stroke();
  }
  // Hardpoints bekannter Systeme mit Zustandssymbol
  if (u.systems && cam.k > 0.12 && !dead) {
    ctx.rotate(-p.a);
    ctx.font = `${Math.max(9, 11)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const s of u.systems) {
      const [hx, hy] = hpPos({ x: 0, y: 0, a: p.a }, s, L / cam.k);
      ctx.fillStyle = { intact: '#c5e1a5', damaged: '#ffd54f', critical: '#ff8a65', destroyed: '#e53935', jammed: '#4fc3f7' }[s.state];
      ctx.fillText(STATE_ICON[s.state], hx * cam.k, hy * cam.k);
    }
  }
  ctx.restore();
  // Seitenmarkierung (Form + Farbe), Auswahl, Lebensbalken und Statussymbole
  ctx.strokeStyle = SIDE_COLOR[u.side]; ctx.lineWidth = 1.5;
  if (u.side === 'A') ctx.strokeRect(sx - L * 0.55, sy - L * 0.55, L * 1.1, L * 1.1);
  else { ctx.beginPath(); ctx.arc(sx, sy, L * 0.6, 0, Math.PI * 2); ctx.stroke(); }
  if (sel.has(u.id)) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, L * 0.75, 0, Math.PI * 2); ctx.stroke(); }
  if (focus === u.id) { ctx.strokeStyle = '#ffeb3b'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(sx, sy, L * 0.8, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  const bw = Math.max(24, L);
  ctx.fillStyle = '#263238'; ctx.fillRect(sx - bw / 2, sy - L * 0.7 - 6, bw, 4);
  ctx.fillStyle = u.hull > 0.5 ? '#66bb6a' : u.hull > 0.25 ? '#ffca28' : '#ef5350'; ctx.fillRect(sx - bw / 2, sy - L * 0.7 - 6, bw * u.hull, 4);
  const tags = [u.state === 'surrendered' ? '⚑' : '', u.state === 'retreating' ? '↩' : '', dead ? '✖' : '', u.immobile && !dead ? '⚓' : '', u.fire ? '🔥' : '', u.protected ? '🛡' : '', u.craft !== null ? `×${u.craft}` : ''].join(' ').trim();
  if (tags) { ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(tags, sx, sy + L * 0.75 + 12); }
  if (u.order?.t === 'move' && u.own && sel.has(u.id)) { const [tx, ty] = toScreen(u.order.x, u.order.y); ctx.strokeStyle = 'rgba(129,199,132,0.6)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]); }
  ctx.restore();
}

function drawProjectile(p) {
  const [sx, sy] = toScreen(p.x, p.y);
  ctx.fillStyle = WEAPON_COLOR[p.w] || '#fff';
  const big = p.w === 'torpedo' || p.w === 'heavy' ? 4 : p.w === 'missile' ? 3 : 2;
  ctx.beginPath(); ctx.arc(sx, sy, big, 0, Math.PI * 2); ctx.fill();
  if (p.w === 'missile' || p.w === 'torpedo') { ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - Math.cos(p.a) * 12, sy - Math.sin(p.a) * 12); ctx.stroke(); }
}

function drawFx(now) {
  for (const f of fxList) {
    const age = (now - f.at) / 1000;
    if (age > 0.8) continue;
    const a = 1 - age / 0.8;
    if (f.k === 'shot') {
      const from = view.units.find((u) => u.id === f.from), to = view.units.find((u) => u.id === f.to);
      if (!from || !to || age > 0.25) continue;
      const [ax, ay] = toScreen(pos(from).x, pos(from).y), [bx, by] = toScreen(pos(to).x, pos(to).y);
      ctx.strokeStyle = WEAPON_COLOR[f.w]; ctx.globalAlpha = a; ctx.lineWidth = f.w === 'beam' ? 3 : 1.2;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(f.hit ? bx : bx + 30, f.hit ? by : by + 20); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (f.k === 'hit') {
      const t = view.units.find((u) => u.id === f.ship);
      if (!t) continue;
      const [x, y] = toScreen(pos(t).x, pos(t).y);
      const L = Math.max(14, lengthOf(t) * cam.k);
      ctx.globalAlpha = a;
      if (f.shield) { ctx.strokeStyle = '#80deea'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, L * 0.65, 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.fillStyle = f.w === 'ion' ? '#4fc3f7' : '#ff7043'; ctx.beginPath(); ctx.arc(x + (Math.random() - 0.5) * L * 0.4, y + (Math.random() - 0.5) * L * 0.3, 3 + 6 * a, 0, Math.PI * 2); ctx.fill(); }
      if (f.destroyed?.length) { ctx.fillStyle = '#e53935'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('✕ System zerstört', x + L * 0.6, y - L * 0.4); }
      if (f.jam?.length) { ctx.fillStyle = '#4fc3f7'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('ϟ gestört', x + L * 0.6, y - L * 0.6); }
      ctx.globalAlpha = 1;
    } else if (f.k === 'destroyed' || f.k === 'intercept') {
      const [x, y] = toScreen(f.x, f.y);
      ctx.strokeStyle = f.k === 'destroyed' ? '#ffab40' : '#fffde7'; ctx.globalAlpha = a; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, (f.k === 'destroyed' ? 40 : 8) * (1 - a + 0.2), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
}

// ---------- Strategiekarte: Schlachtsymbole ----------
socket.on('ships', (d) => { state.battles = d.battles || []; });

/** Zeichnet Schlachtsymbole in der Weltansicht (Hook aus render.js) */
export function drawBattleSymbols(c, { px, now }) {
  for (const b of state.battles || []) {
    const r = px(16);
    const pulse = 1 + 0.15 * Math.sin(now / 250);
    c.save();
    c.strokeStyle = b.mine ? '#ffeb3b' : '#ef5350'; c.lineWidth = px(2);
    c.beginPath(); c.arc(b.x, b.y, r * pulse, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#fff'; c.font = `${px(16)}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('⚔', b.x, b.y);
    c.font = `${px(10)}px sans-serif`;
    c.fillText(`${b.a} : ${b.b}${b.kind === 'raid' ? ' Raid' : ''}`, b.x, b.y + r * 1.6);
    c.restore();
  }
}
export function pickBattle(wx, wy, z) {
  for (const b of state.battles || []) if (Math.hypot(b.x - wx, b.y - wy) < 22 / z) return { kind: 'battle', id: b.id };
  return null;
}

// Separate cards keep simultaneous attacks reachable without pausing the game.
const warnedBattles=new Set();
socket.on('welcome',()=>{warnedBattles.clear();document.getElementById('attackWarnings')?.remove();});
export function showAttackWarning(warning){
 if(warnedBattles.has(warning.id))return;warnedBattles.add(warning.id);
 let host=document.getElementById('attackWarnings');
 if(!host){host=document.createElement('div');host.id='attackWarnings';host.setAttribute('aria-live','assertive');document.body.append(host);}
 const card=document.createElement('section');card.className='attack-warning';card.setAttribute('role','alert');
 card.innerHTML='<h3>Angriff auf eigene Einheiten</h3><p><b>'+esc(warning.attacker)+'</b> · '+esc(warning.location)+'</p><p>'+warning.targets.map(esc).join(', ')+'</p><button data-battle>Zur Schlacht</button> <button data-dismiss aria-label="Angriffswarnung schließen">Schließen</button>';
 card.querySelector('[data-battle]').onclick=()=>{openBattle(warning.id);card.remove();};card.querySelector('[data-dismiss]').onclick=()=>card.remove();host.append(card);sfx('attackWarning');
}
socket.on('attackWarning',showAttackWarning);
