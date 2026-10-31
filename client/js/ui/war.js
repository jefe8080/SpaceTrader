// PRD 15: Bedienung von Stacks, Kampfstatus, Reparatur, Gefangenen und Fraktionen im Schiffs- und Objektdetail.
import { state, esc, selectedShips, fmt } from '../state.js';
import { cmd } from '../net.js';
import { shipSymbol } from '../util.js';
import { $ } from './dom.js';
import { COMBAT_TYPES, NAVAL_CLASSES, COMBAT_ABILITIES, blueprint, maxHull, SYSTEMS, systemState, STATE_NAMES, WEAPONS } from '/shared/combat.js';

/** Aktionen der Kriegsbedienung (data-war) */
export const warActions = {};

const stackById = (id) => (state.me?.stacks || []).find((st) => st.id === id);

/** Stackfenster: Mitglieder, Reihenfolge, Einzelauswahl und Ablösen */
export function stackSection(s) {
  const st = stackById(s.stack);
  if (!st) return s.rendezvous ? `<div class="section"><div class="section-title">Stack</div><div class="muted">Zusammenflug zum Routenstack …</div></div>` : '';
  const rows = st.members.map((id, i) => {
    const m = state.ships.get(id);
    if (!m) return '';
    const sel = id === s.id ? ' style="font-weight:bold"' : '';
    return `<div class="stack-row"${sel}>
      <span class="muted">${i + 1}.</span> <button class="small ghost" data-war="select" data-ship="${id}" title="Mitglied auswählen">${shipSymbol(m)} ${esc(m.name)}</button>
      ${i === 0 ? '<span class="badge" title="Leitschiff: führt den gemeinsamen Auftrag aus">Leitschiff</span>' : ''}
      <span style="flex:1"></span>
      <button class="small ghost" data-war="up" data-stack="${st.id}" data-ship="${id}" ${i ? '' : 'disabled'} aria-label="nach vorne">▲</button>
      <button class="small ghost" data-war="down" data-stack="${st.id}" data-ship="${id}" ${i < st.members.length - 1 ? '' : 'disabled'} aria-label="nach hinten">▼</button>
      ${st.routeKey ? '' : `<button class="small ghost" data-war="detach" data-ship="${id}" title="Aus dem Stack lösen">⇱ Ablösen</button>`}
    </div>`;
  }).join('');
  return `<div class="section"><div class="section-title">${st.routeKey ? 'Routenstack' : 'Stack'} · ${st.members.length} Schiffe</div>
    ${st.block ? `<div class="warnbox">⛔ ${esc(st.block)}</div>` : ''}
    <div class="muted">Reihenfolge bestimmt die Abarbeitung an Haltestellen. Gemeinsames Tempo: langsamstes Mitglied.</div>
    ${rows}</div>`;
}

$('details').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-war]');
  if (!b) return;
  ev.stopPropagation();
  const d = b.dataset;
  switch (d.war) {
    case 'select': import('./index.js').then((ui) => ui.select({ kind: 'ship', id: d.ship })); break;
    case 'up': cmd('stackMove', { stack: d.stack, ship: d.ship, dir: -1 }); break;
    case 'down': cmd('stackMove', { stack: d.stack, ship: d.ship, dir: 1 }); break;
    case 'detach': cmd('stackDetach', { ship: d.ship }); break;
    default: warActions[d.war]?.(d);
  }
});

/** Kampfprofil eines Schiffs: Klasse, Rolle, Rumpf, Systeme und bleibende Schäden */
export function combatSection(s) {
  const c = COMBAT_TYPES[s.type];
  if (!c) return '';
  const bp = blueprint(s.type), d = s.dmg || {};
  const hull = d.hull ?? maxHull(s.type), max = maxHull(s.type);
  const ab = c.ability ? COMBAT_ABILITIES[c.ability] : null;
  const weapons = Object.entries(bp.weapons.reduce((m, w) => ((m[w.w] = (m[w.w] || 0) + 1), m), {})).map(([w, n]) => `${WEAPONS[w].name}${n > 1 ? ' ×' + n : ''}`).join(', ');
  const sys = bp.systems.map((x) => {
    const hp = d.sys?.[x.id] ?? x.hp, st = systemState(hp, x.hp);
    return `<span class="sys-chip sys-${st}" title="${esc(SYSTEMS[x.kind].effect)}">${SYSTEMS[x.kind].icon} ${esc(SYSTEMS[x.kind].name)}: ${STATE_NAMES[st]}</span>`;
  }).join(' ');
  return `<div class="section"><div class="section-title">Kampfprofil</div><div class="kv">
    <span>Klasse</span><span>${NAVAL_CLASSES[c.cls].name} · ${esc(c.role)}</span>
    <span>Rumpf</span><span>${Math.round(hull)} / ${max}${bp.squad ? ` · ${d.craft ?? bp.squad.n}/${bp.squad.n} Fluggeräte` : ''}</span>
    ${weapons ? `<span>Bewaffnung</span><span>${weapons}</span>` : ''}
    ${ab ? `<span>Fähigkeit</span><span class="ability">★ ${esc(ab.name)}: ${esc(ab.desc)} <span class="muted">(Nachteil: ${esc(ab.drawback)})</span></span>` : ''}
    </div>${sys ? `<div class="sys-list">${sys}</div>` : ''}</div>`;
}

/** Fremdes Schiff: ausdrücklicher Angriffsbefehl mit den ausgewählten eigenen Schiffen */
export function foreignWarSection(s) {
  const mine = selectedShips().filter((x) => !x.captive);
  const c = COMBAT_TYPES[s.type];
  let h = c ? `<div class="muted">${NAVAL_CLASSES[c.cls].name} · ${esc(c.role)}</div>` : '';
  if (s.battle) h += `<div class="btnrow"><button class="small" data-war="view" data-battle="${s.battle}">⚔ Schlacht ansehen</button></div>`;
  else if (mine.length) h += `<div class="btnrow"><button class="small danger" data-war="attack" data-target="${s.id}" title="Ausdrücklicher Angriffsbefehl; normale Flugbefehle greifen nie an">⚔ Mit ${mine.length} Schiff${mine.length > 1 ? 'en' : ''} angreifen</button></div>`;
  return h;
}

/** Eigenes Schiff: Schlacht, Gefangenschaft mit Freikauf, Reparaturbedarf */
export function ownWarSection(s) {
  let h = '';
  if (s.battle) h += `<div class="warnbox">⚔ In einer Schlacht. <button class="small" data-war="view" data-battle="${s.battle}">Schlachtansicht öffnen</button></div>`;
  if (s.captive) {
    const q = s.ransom;
    h += `<div class="warnbox">⛓ Gefangen von ${esc(q?.captorName || '?')}. ${q ? `Freikauf: ${fmt(q.price)} Cr (25 % des Kaufpreises), Rückgabe ohne Ladung mit verbliebenen Schäden bei ${esc(q.destName)}.
      <button class="small" data-war="ransom" data-ship="${s.id}" data-price="${q.price}">Freikaufen</button>` : ''}</div>`;
  }
  if (s.repairHold) h += `<div class="warnbox">🔧 Unter 30 % kapituliert: vor erneutem Kampfeinsatz reparieren.</div>`;
  if (s.repairRun) h += `<div class="infobox">🔧 Reparaturfahrt aktiv; danach wird der gespeicherte Auftrag fortgesetzt. Keine Abfangeinsätze währenddessen.</div>`;
  const q = s.repairQuote;
  if (s.needsRepair || (q && q.ammo > 0)) {
    h += `<div class="section"><div class="section-title">Reparatur</div>
      <div class="muted">Vorschau: ${fmt(q?.cost || 0)} Cr (davon Munition ${fmt(q?.ammo || 0)} Cr), ${q?.secs || 0} s. Vollreparatur nur angedockt an zugänglicher Werft oder eigener Ruinenwelt mit Antriebswerkstatt.</div>
      ${s.repairHere ? `<button class="small" data-war="repair" data-ship="${s.id}" data-cost="${q?.cost || 0}">🔧 Jetzt reparieren</button>` : ''}</div>`;
  }
  if (COMBAT_TYPES[s.type]?.weapons?.length || s.stack) h += `<label class="muted"><input type="checkbox" data-war-auto="${s.id}" ${s.autoRepair !== false ? 'checked' : ''}> Reparaturautomatik${s.stack ? ' (ganzer Stack)' : ''}</label>`;
  return h;
}

warActions.attack = (d) => cmd('attack', { ships: selectedShips().map((x) => x.id), target: d.target });
warActions.ransom = (d) => { if (confirm(`Schiff für ${fmt(Number(d.price))} Cr freikaufen?`)) cmd('ransom', { ship: d.ship, price: Number(d.price) }); };
warActions.repair = (d) => { if (confirm(`Reparatur für ${fmt(Number(d.cost))} Cr starten?`)) cmd('repair', { ship: d.ship, cost: Number(d.cost) }); };
warActions.view = (d) => import('./battle.js').then((m) => m.openBattle(d.battle));


$('details').addEventListener('change', (ev) => {
  const id = ev.target.dataset?.warAuto;
  if (id) cmd('autoRepair', { ship: id, on: ev.target.checked });
});
