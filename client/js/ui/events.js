// Sondernachfrage (PRD-3 Kapitel 5): Liste in der Topbar, Abschnitt im Detailpanel
import { GOODS } from '/shared/config.js';
import { state, fmt, esc } from '../state.js';
import { goodTag, fmtDuration } from '../util.js';
import { $, setHtml } from './dom.js';
import { bus } from './bus.js';

const btn = $('btnEvents');
const menu = $('eventsMenu');
const restSecs = (ev) => Math.max(0, ev.ends - state.time);
export const eventAtEntity = (id) => (state.events || []).find((ev) => ev.entity === id && ev.left > 0 && restSecs(ev) > 0) || null;

export function renderEventsButton() {
  const n = (state.events || []).length;
  btn.textContent = `⚡ Nachfrage${n ? ` (${n})` : ''}`;
  btn.classList.toggle('active', n > 0);
  if (!menu.hidden) renderMenu();
}

function renderMenu() {
  const list = [...(state.events || [])].sort((a, b) => restSecs(a) - restSecs(b));
  setHtml(menu, `<div class="menu-sep">Sondernachfrage</div>` + (list.length ? list.map((ev) => `<div class="ev-row" data-ev="${ev.entity}">
      <div>${goodTag(ev.good)} <b>${ev.price.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Cr</b></div>
      <div class="muted small-note">${esc(ev.name)} · ${esc(state.sectors.get(ev.sector)?.name || '')} · noch ${fmt(ev.left)} / ${fmt(ev.total)} · ${fmtDuration(restSecs(ev))}</div></div>`).join('')
    : '<div class="muted">Gerade keine. Events entstehen in Sektoren mit deinen Schiffen alle 20 bis 60 min.</div>')
    + `<div class="muted small-note">Nur manuelle Verkäufe zählen, wer zuerst liefert, bekommt den Zuschlag. Keine XP.</div>`);
}

btn.addEventListener('click', () => {
  menu.hidden = !menu.hidden;
  if (menu.hidden) return;
  renderMenu();
  const rc = btn.getBoundingClientRect();
  menu.style.left = Math.max(8, Math.min(rc.left, innerWidth - menu.offsetWidth - 8)) + 'px';
  menu.style.top = rc.bottom + 4 + 'px';
});
menu.addEventListener('click', (ev) => {
  const r = ev.target.closest('[data-ev]');
  if (!r) return;
  const e = state.entities.get(r.dataset.ev);
  const x = (state.events || []).find((v) => v.entity === r.dataset.ev);
  state.follow = null;
  if (e) { state.camera.x = e.x; state.camera.y = e.y; state.camera.zoom = Math.max(state.camera.zoom, 0.12); bus.select({ kind: 'entity', id: e.id }); }
  else if (x?.x !== undefined) { state.camera.x = x.x; state.camera.y = x.y; }
  menu.hidden = true;
});
addEventListener('mousedown', (ev) => { if (!menu.hidden && !menu.contains(ev.target) && ev.target !== btn) menu.hidden = true; });

/** Abschnitt im Detailpanel eines Planeten mit laufender Sondernachfrage */
export function eventSection(e, ship) {
  const ev = eventAtEntity(e.id);
  if (!ev) return '';
  const have = ship?.cargo?.[ev.good] || 0;
  const onRoute = ship?.queue?.[0]?.t === 'route';
  const act = ship && have && !onRoute ? ['1', '10', 'max'].map((a) => `<button class="small primary" data-act="trade" data-dir="sell" data-ship="${ship.id}" data-ent="${e.id}" data-good="${ev.good}" data-amt="${a}">${a === 'max' ? 'Alle' : '−' + a}</button>`).join(' ') : '';
  return `<div class="section event-sec"><div class="section-title">⚡ Sondernachfrage</div><div class="kv">
    <span>Ware</span><span>${goodTag(ev.good)}</span>
    <span>Festpreis</span><span><b>${ev.price.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Cr</b> je Einheit</span>
    <span>Restmenge</span><span>${fmt(ev.left)} / ${fmt(ev.total)}</span>
    <span>Restzeit</span><span>${fmtDuration(restSecs(ev))}</span></div>
    ${act ? `<div class="btnrow" style="margin-top:6px">${act} <span class="muted small-note">${have} ${GOODS[ev.good].name} an Bord</span></div>`
      : `<div class="muted small-note">${onRoute ? 'Routen zählen nicht: erst stoppen.' : 'Ware an Bord eines hier angedockten Schiffs manuell verkaufen. Routen und Lagertransfers zählen nicht.'}</div>`}</div>`;
}
