// Konsortium (PRD-3 Kapitel 4): Fenster mit Taste K und aufklappbaren Bereichen
import { CONSORTIUM, CONSORTIUM_LEVELS, MAX_CONSORTIUM_LEVEL, RANK } from '/shared/config.js';
import { state, fmt, esc, myShips } from '../state.js';
import { cmd } from '../net.js';
import { $, registerModal, openModal, closeModal, setHtml } from './dom.js';

const card = $('consCard');
/** Aufgeklappte Bereiche (überleben das Neuzeichnen) */
const open = new Set(['overview', 'members', 'pool', 'board']);
/** Entwürfe der Eingabefelder */
const draft = { name: '', color: null, invite: '', amount: '', board: null, boardAt: null };
/** Zusätzliche Bereiche aus anderen Modulen (Besitz, Kartendaten, Schiffshandel): { key, title, render(c) } */
export const extraSections = [];

const when = (ms) => ms ? new Date(ms).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–';
const section = (key, title, body) => `<details class="cons-sec" data-sec="${key}" ${open.has(key) ? 'open' : ''}><summary>${title}</summary><div class="cons-body">${body}</div></details>`;
const atHub = () => myShips().some((s) => state.entities.get(s.dockedAt)?.type === 'hub');

function renderCons() {
  const c = state.cons;
  let h = `<div class="modal-head"><h2>Konsortium</h2>${c && !c.none ? `<span class="dot" style="background:${c.color}"></span><b>${esc(c.name)}</b><span class="muted">Level ${c.level} · ${RANK[c.rank]}</span>` : ''}<span style="flex:1"></span><button data-c="close">✕</button></div>`;
  if (!c || c.none) h += noMember(c);
  else h += member(c);
  setHtml(card, h);
}

function noMember(c) {
  let h = '';
  const inv = c?.invites || [];
  if (inv.length) {
    h += `<div class="section"><div class="section-title">Einladungen</div>` + inv.map((i) => `<div class="fav-row"><span class="dot" style="background:${i.color}"></span>
      <div class="fav-main"><b>${esc(i.name)}</b> <span class="muted">von ${esc(i.by)}, gültig bis ${when(i.until)}</span></div>
      <div class="btnrow"><button class="small primary" data-c="accept" data-id="${i.id}">Annehmen</button><button class="small" data-c="decline" data-id="${i.id}">Ablehnen</button></div></div>`).join('') + `</div>`;
  }
  const lvlOk = (state.level || 1) >= CONSORTIUM.FOUND_LEVEL;
  const hub = atHub();
  const cost = CONSORTIUM_LEVELS[1].cost;
  const why = !lvlOk ? `ab Pilotenlevel ${CONSORTIUM.FOUND_LEVEL}` : !hub ? 'nur am Handels-Hub (eigenes Schiff angedockt)' : state.credits < cost ? 'nicht genug Credits' : '';
  h += `<div class="section"><div class="section-title">Konsortium gründen</div>
    <div class="muted">Gemeinsamer Geldpool, gemeinsamer Besitz, Karten- und Schiffshandel unter Mitgliedern. Gründung ${fmt(cost)} Cr aus deinem Privatgeld.</div>
    <div class="form-row"><label>Name (${CONSORTIUM.NAME[0]} bis ${CONSORTIUM.NAME[1]} Zeichen)<input id="consName" maxlength="${CONSORTIUM.NAME[1]}" value="${esc(draft.name)}" placeholder="z.B. Nordkontor"></label>
      <label>Farbe<input id="consColor" type="color" value="${draft.color || state.me.color}"></label></div>
    <button class="primary small" data-c="found" ${why ? 'disabled' : ''} title="${esc(why)}">Gründen</button>${why ? ` <span class="muted small-note">${esc(why)}</span>` : ''}</div>`;
  return h;
}

function member(c) {
  const master = c.rank === 'master';
  const next = CONSORTIUM_LEVELS[c.level + 1];
  const L = CONSORTIUM_LEVELS[c.level];
  let h = section('overview', 'Übersicht', `<div class="kv">
    <span>Name</span><span><span class="dot" style="background:${c.color}"></span> <b>${esc(c.name)}</b></span>
    <span>Level</span><span>${c.level} · max. ${L.maxProps} Besitztümer · Ausbau bis Stufe ${L.maxLevel}</span>
    <span>Pool</span><span><b>${fmt(c.pool)} Cr</b></span>
    <span>Besitz</span><span>${c.props} / ${c.maxProps}</span>
    <span>Militärisches Bündnis</span><span><label><input type="checkbox" data-c-military ${c.military ? 'checked' : ''} ${master ? '' : 'disabled'}> automatische Unterstützung der Mitglieder</label> <span class="muted">(gilt für neue Begegnungen; Angriffe untereinander bleiben verboten)</span></span></div>
    ${c.level < MAX_CONSORTIUM_LEVEL ? `<div class="small-note">Nächstes Level ${next.level}: ${next.maxProps} Besitztümer, Ausbau bis ${next.maxLevel}, Kosten ${fmt(next.cost)} Cr aus dem Pool.
      ${master ? `<button class="small primary" data-c="levelUp" ${c.pool < next.cost ? 'disabled' : ''}>Aufsteigen</button>` : ''}</div>` : '<div class="muted small-note">Höchstes Level erreicht.</div>'}`);

  h += section('members', `Mitglieder (${c.members.length})`, `<table class="market"><tr><th>Name</th><th>Rang</th><th>Pilotenlevel</th><th></th></tr>
    ${c.members.map((m) => `<tr><td>${m.online ? '<span class="online-badge">●</span> ' : ''}${esc(m.name)}${m.id === state.me.id ? ' <span class="muted">(du)</span>' : ''}</td><td>${RANK[m.rank]}</td><td>${m.level}</td>
      <td style="white-space:nowrap">${master && m.id !== state.me.id ? `${m.rank === 'trader' ? `<button class="small" data-c="promote" data-id="${m.id}">Befördern</button>` : `<button class="small" data-c="demote" data-id="${m.id}">Herabstufen</button>`}
        <button class="small danger" data-c="kick" data-id="${m.id}">Rauswerfen</button>` : ''}</td></tr>`).join('')}</table>
    ${master ? `<div class="btnrow" style="margin-top:6px"><input id="consInvite" maxlength="20" placeholder="Spielername" value="${esc(draft.invite)}"><button class="small" data-c="invite">Einladen</button></div>
      ${c.invited.length ? `<div class="muted small-note">Offene Einladungen: ${c.invited.map((i) => `${esc(i.name)} (bis ${when(i.until)})`).join(', ')}</div>` : ''}` : ''}
    <div class="btnrow" style="margin-top:8px"><button class="small danger" data-c="leave">Austreten</button>
      <span class="muted small-note">${c.members.length === 1 ? 'Als letztes Mitglied löst du das Konsortium auf: Besitz wird herrenlos, der Pool verfällt.' : 'Dein Privatgeld bleibt bei dir, aus dem Pool wird nichts ausgezahlt.'}</span></div>`);

  const amt = Math.max(0, Math.floor(Number(String(draft.amount).replace(/\./g, '')) || 0));
  h += section('pool', 'Pool', `<div class="btnrow"><input id="consAmount" type="number" min="1" step="1000" value="${esc(draft.amount)}" placeholder="Betrag" style="width:140px">
      <button class="small" data-c="deposit" ${amt > 0 && amt <= state.credits ? '' : 'disabled'}>Einzahlen</button>
      ${master ? `<button class="small" data-c="withdraw" ${amt > 0 && amt <= c.pool ? '' : 'disabled'}>Auszahlen</button>` : ''}</div>
    <div class="muted small-note">Einzahlen: Pool erhält ${Math.round(CONSORTIUM.DEPOSIT_SHARE * 100)} %${amt ? ` (${fmt(amt * CONSORTIUM.DEPOSIT_SHARE)} Cr)` : ''}.
      ${master ? `Auszahlen: du erhältst ${Math.round(CONSORTIUM.WITHDRAW_SHARE * 100)} %${amt ? ` (${fmt(amt * CONSORTIUM.WITHDRAW_SHARE)} Cr)` : ''}. ` : ''}Die Gebühren verschwinden aus dem Spiel.
      Gebührenfrei: Erlöse der Konsortiumsplaneten, Lagerhandel der Mitglieder, Käufe und Ausbau aus dem Pool.</div>`);

  for (const x of extraSections) h += section(x.key, x.title(c), x.render(c));

  const b = c.board;
  const text = draft.board ?? b.text;
  const stale = draft.board !== null && draft.boardAt !== b.at;
  h += section('board', 'Schwarzes Brett', `<textarea id="consBoard" maxlength="${CONSORTIUM.BOARD_MAX}" rows="7" class="cons-board">${esc(text)}</textarea>
    <div class="btnrow"><button class="small primary" data-c="board" ${draft.board === null ? 'disabled' : ''}>Speichern</button>
      ${draft.board !== null ? '<button class="small" data-c="boardReset">Verwerfen</button>' : ''}
      <span class="muted small-note">${b.at ? `zuletzt bearbeitet von ${esc(b.by)} um ${when(b.at)}` : 'noch leer'} · ${text.length} / ${CONSORTIUM.BOARD_MAX}</span></div>
    ${stale ? `<div class="warn small-note">⚠ Der Text wurde inzwischen von ${esc(b.by)} geändert. Beim Speichern gewinnt dein Stand.</div>` : ''}`);

  if (master) {
    h += section('log', 'Log', c.log?.length ? `<table class="market"><tr><th>Zeit</th><th>Spieler</th><th>Aktion</th><th>Betrag</th><th>Objekt</th></tr>
      ${c.log.map((e) => `<tr><td class="muted">${when(e.t)}</td><td>${esc(e.player)}</td><td>${esc(e.label)}</td><td>${e.amount ? fmt(e.amount) : ''}</td><td>${esc(e.object || '')}</td></tr>`).join('')}</table>` : '<div class="muted">leer</div>');
  }
  return h;
}

card.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-c]');
  if (!b || b.disabled) return;
  const d = b.dataset;
  const amount = Math.floor(Number(String(draft.amount).replace(/\./g, '')) || 0);
  const name = (id) => state.cons?.members?.find((m) => m.id === id)?.name || '?';
  switch (d.c) {
    case 'close': closeModal('consModal'); break;
    case 'found': cmd('cFound', { name: draft.name.trim(), color: draft.color || state.me.color }); break;
    case 'accept': cmd('cAnswer', { id: d.id, accept: true }); break;
    case 'decline': cmd('cAnswer', { id: d.id, accept: false }); break;
    case 'levelUp': if (confirm('Levelaufstieg aus dem Pool bezahlen?')) cmd('cLevelUp'); break;
    case 'promote': cmd('cPromote', { player: d.id }); break;
    case 'demote': cmd('cDemote', { player: d.id }); break;
    case 'kick': if (confirm(`${name(d.id)} aus dem Konsortium entfernen?`)) cmd('cKick', { player: d.id }); break;
    case 'invite': if (draft.invite.trim()) { cmd('cInvite', { name: draft.invite.trim() }); draft.invite = ''; } break;
    case 'leave': if (confirm(state.cons.members.length === 1 ? 'Konsortium auflösen? Besitz wird herrenlos, der Pool verfällt.' : 'Konsortium verlassen? Aus dem Pool wird nichts ausgezahlt.')) cmd('cLeave'); break;
    case 'deposit': if (confirm(`${fmt(amount)} Cr einzahlen? Der Pool erhält ${fmt(amount * CONSORTIUM.DEPOSIT_SHARE)} Cr.`)) { cmd('cDeposit', { amount }); draft.amount = ''; } break;
    case 'withdraw': if (confirm(`${fmt(amount)} Cr aus dem Pool auszahlen? Du erhältst ${fmt(amount * CONSORTIUM.WITHDRAW_SHARE)} Cr.`)) { cmd('cWithdraw', { amount }); draft.amount = ''; } break;
    case 'board': cmd('cBoard', { text: draft.board }); draft.board = null; break;
    case 'boardReset': draft.board = null; break;
    default: for (const x of extraSections) if (x.click?.(d, ev)) break;
  }
  renderCons();
});
card.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.id === 'consName') draft.name = t.value;
  else if (t.id === 'consColor') draft.color = t.value;
  else if (t.id === 'consInvite') draft.invite = t.value;
  else if (t.id === 'consAmount') draft.amount = t.value;
  else if (t.id === 'consBoard') { if (draft.board === null) draft.boardAt = state.cons?.board?.at ?? 0; draft.board = t.value; }
  else for (const x of extraSections) x.input?.(t);
});
card.addEventListener('change', (ev) => {
  if (ev.target.matches?.('[data-c-military]')) { cmd('consortiumMilitary', { on: ev.target.checked }); return; }
  for (const x of extraSections) x.change?.(ev.target);
  if (ev.target.id === 'consAmount') renderCons();
});
card.addEventListener('toggle', (ev) => {
  const k = ev.target.dataset?.sec;
  if (!k) return;
  if (ev.target.open) open.add(k); else open.delete(k);
}, true);

registerModal('consModal', renderCons);
export const openConsortium = () => openModal('consModal');
export const rerenderConsortium = renderCons;
