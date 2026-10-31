// PRD 15: Bedienung von Stacks, Kampfstatus, Reparatur, Gefangenen und Fraktionen im Schiffs- und Objektdetail.
import { state, esc, selectedShips, fmt } from '../state.js';
import { cmd } from '../net.js';
import { shipSymbol } from '../util.js';
import { $, hint } from './dom.js';
import { COMBAT_TYPES, NAVAL_CLASSES, COMBAT_ABILITIES, blueprint, maxHull, SYSTEMS, systemState, STATE_NAMES, WEAPONS } from '/shared/combat.js';

/** Aktionen der Kriegsbedienung (data-war) */
export const warActions = {};

const stackById = (id) => (state.stacks || []).find((st) => st.id === id);

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

/** Fremdes Schiff: Kampfprofil und Zugang zur laufenden Schlacht */
export function foreignWarSection(s) {
  const c = COMBAT_TYPES[s.type];
  let h = c ? `<div class="muted">${NAVAL_CLASSES[c.cls].name} · ${esc(c.role)}</div>` : '';
  if (s.battle) h += `<div class="btnrow"><button class="small" data-war="view" data-battle="${s.battle}">⚔ Schlacht ansehen</button></div>`;
  return h;
}

/** Eigenes Schiff: Schlacht, Gefangenschaft mit Freikauf, Reparaturbedarf */
export function ownWarSection(s) {
  let h = '';
  if (!s.battle && !s.captive) h += `<div class="btnrow"><button class="small danger" data-war="attack" data-ship="${s.id}">Angriff</button></div>`;
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
  if (COMBAT_TYPES[s.type]?.cls === 'war' || (s.stack && stackById(s.stack)?.members[0] === s.id)) {
    const m = s.posture?.mode || 'intercept';
    h += `<div class="section"><div class="section-title">Strategische Haltung</div><div class="btnrow">
      ${[['intercept', '⇢ Abfangen', 'Hilft eigenen und verbündeten Einheiten bis zu einer halben Sektorweite'], ['guard', '⛨ Bewachen', 'Sichert die aktuelle Position im Radius eines Viertel-Systemdurchmessers'], ['passive', '⏸ Passiv', 'Keine automatische Unterstützung']]
        .map(([k, t, d]) => `<button class="small${m === k ? ' on' : ''}" data-war="posture" data-ship="${s.id}" data-mode="${k}" title="${d}">${t}</button>`).join('')}</div>
      <div class="muted">Nur Kriegsschiffe und Stacks mit Kriegsschiffen lösen Unterstützung aus.</div></div>`;
  }
  if (COMBAT_TYPES[s.type]?.weapons?.length || s.stack) h += `<label class="muted"><input type="checkbox" data-war-auto="${s.id}" ${s.autoRepair !== false ? 'checked' : ''}> Reparaturautomatik${s.stack ? ' (ganzer Stack)' : ''}</label>`;
  return h;
}

warActions.attack = (d) => {
  const ships = [d.ship];
  state.pickMode?.(null);
  hint('Angriff: fremdes Schiff oder angreifbaren Planeten anklicken (Esc bricht ab)');
  state.attackPick = (hit) => {
    if (!hit) { state.attackPick = null; hint(null); return; }
    const target = hit.kind === 'ship' ? state.ships.get(hit.id) : hit.kind === 'entity' ? state.entities.get(hit.id) : null;
    if (!target || target.owner === state.me?.id || target.captive || (hit.kind !== 'ship' && (target.kind !== 'planet' || !target.market))) {
      hint('Kein Angriffsziel. Fremdes Schiff oder angreifbaren Planeten wählen (Esc bricht ab)');
      return;
    }
    if (hit.kind === 'ship') cmd('attack', { ships, target: target.id });
    else cmd('raid', { ships, planet: target.id });
    state.attackPick = null;
    hint(null);
  };
};
warActions.ransom = (d) => { if (confirm(`Schiff für ${fmt(Number(d.price))} Cr freikaufen?`)) cmd('ransom', { ship: d.ship, price: Number(d.price) }); };
warActions.repair = (d) => { if (confirm(`Reparatur für ${fmt(Number(d.cost))} Cr starten?`)) cmd('repair', { ship: d.ship, cost: Number(d.cost) }); };
warActions.posture = (d) => cmd('posture', { ship: d.ship, mode: d.mode });
warActions.supply = (d) => cmd('factionSupply', { ship: d.ship, good: d.good, amount: 1e6, donate: d.donate === '1' });
warActions.gift = (d) => cmd('friendGift', { ship: d.ship });
warActions.galactic = () => { if (confirm('Leitstellenmodul „galaktische Freundschaft“ für 75.000.000 Cr bauen?')) cmd('galacticFriendship'); };
warActions.raid = (d) => { if (confirm('Planetenraid starten? Erst Verteidiger besiegen, dann Plünderung.')) cmd('raid', { ships: selectedShips().map((x) => x.id), planet: d.planet }); };
warActions.planetRepair = (d) => { if (confirm(`Raidschaden für ${fmt(Number(d.cost))} Cr reparieren?`)) cmd('planetRepair', { target: d.planet }); };
warActions.view = (d) => import('./battle.js').then((m) => m.openBattle(d.battle));


$('details').addEventListener('change', (ev) => {
  const id = ev.target.dataset?.warAuto;
  if (id) cmd('autoRepair', { ship: id, on: ev.target.checked });
});

const REL = { friend: '🤝 befreundet', hostile: '⚔ verfeindet', neutral: '◯ neutral' };
/** Verwaltungsplanet: Fraktionssektor mit Pool, Level, Grundversorgung und Freundschaftsquest */
export function adminSection(e, ship) {
  const fs = (state.war?.factions || []).find((f) => f.admin === e.id);
  if (!fs) return '';
  const w = state.war;
  const pct = (v) => Math.round(v * 100);
  const sup = (g, label) => `<span>${label}</span><span><span class="bv-bar" role="img" aria-label="${fs.supply[g]} von ${fs.buffer}"><i style="width:${Math.min(100, fs.supply[g] / fs.buffer * 100)}%"></i></span> ${fs.supply[g]} / ${fs.buffer}</span>`;
  let h = `<div class="section"><div class="section-title">Verwaltungszentrum ${esc(fs.name)}</div><div class="kv">
    <span>Beziehung</span><span>${REL[fs.relation]}</span>
    <span>Fraktionssektorlevel</span><span>${fs.level} · Fortschritt ${pct(fs.progress)} %${fs.ok ? '' : ' · ⛔ Versorgungslücke (Fortschritt pausiert)'}</span>
    <span>Geldpool</span><span>${fmt(fs.pool)} / ${fmt(fs.cap)} Cr</span>
    ${sup('water', 'Wasser')}${sup('food', 'Nahrung')}
    <span>Kriegsschiffe</span><span>${fs.warships} / ${fs.limit}</span>
    ${fs.relation === 'hostile' ? `<span>Aggression</span><span>${fs.aggr}${fs.peaceLeft ? ` · Friedenszeit noch ${Math.ceil(fs.peaceLeft / 3600)} h` : ''}${fs.ok ? ' · Anstieg pausiert (versorgt)' : ''}</span>` : ''}</div>
    <div class="muted">Alle Fraktionsquests dieses Sektors laufen hier. Quests geben Ruf und Fraktions-XP, keine Credits; Abgabe nur bei ausreichender Versorgung.</div>`;
  if (ship) {
    const donate = fs.relation === 'hostile';
    h += `<div class="btnrow">${['water', 'food'].map((g) => (ship.cargo?.[g] ? `<button class="small" data-war="supply" data-ship="${ship.id}" data-good="${g}" data-donate="${donate ? 1 : 0}">${donate ? '🎁 Abgabe' : '💰 Verkauf'}: ${g === 'water' ? 'Wasser' : 'Nahrung'}</button>` : '')).join('')}</div>`;
    if (donate) h += `<div class="muted">Feindliche Fraktion: gekennzeichnete Abgabe ohne Bezahlung, Ruf oder Diplomatiewirkung; schützt keine eindringenden Kriegsschiffe.</div>`;
    if (w.friendQuest && fs.relation !== 'friend') h += `<button class="small primary" data-war="gift" data-ship="${ship.id}">🎁 Freundschaftsgeschenk übergeben (${Object.entries(w.friendQuest.gift).map(([g, n]) => n + ' ' + (g === 'water' ? 'Wasser' : 'Nahrung')).join(', ')})</button>`;
  }
  if (w.friends.length && !w.galactic) h += `<div class="muted">Zweite Freundschaft: Leitstellenmodul „galaktische Freundschaft“. <button class="small" data-war="galactic">Bauen (75 Mio. Cr)</button></div>`;
  return h + '</div>';
}

/** Planet: Raidmalus, Schutzfrist, Reparatur und Raidbefehl */
export function raidSection(e) {
  if (e.kind !== 'planet' || !e.market) return '';
  const r = e.market.raid;
  const own = e.market.homeworld?.owner === state.me?.id || e.owner === state.me?.id;
  let h = '';
  if (r) {
    const left = Math.max(0, Math.round((r.protectUntil - (state.time || 0)) / 3600));
    h += `<div class="warnbox">🏚 Geplündert${r.malus ? ': Produktion 50 % bis zur Reparatur' : ' (repariert)'} · 🛡 Raidschutz noch ca. ${left} h.
      ${own && r.malus ? (r.repairUntil ? ' Reparatur läuft …' : ` <button class="small" data-war="planetRepair" data-planet="${e.id}" data-cost="25000">Reparieren (25.000 Cr, 2 min)</button>`) : ''}</div>`;
  }
  const mine = selectedShips();
  if (!own && mine.length && (e.faction || e.market.homeworld || e.owner) && !(r && r.protectUntil > (state.time || 0))) h += `<div class="btnrow"><button class="small danger" data-war="raid" data-planet="${e.id}">⚔ Raid mit ${mine.length} Schiff${mine.length > 1 ? 'en' : ''}</button></div>`;
  return h;
}
