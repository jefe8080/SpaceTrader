// PRD 15: Bedienung von Stacks, Kampfstatus, Reparatur, Gefangenen und Fraktionen im Schiffs- und Objektdetail.
import { state, esc } from '../state.js';
import { cmd } from '../net.js';
import { shipSymbol } from '../util.js';
import { $ } from './dom.js';

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

/** Weitere Aktionen späterer Pakete registrieren sich hier */
export const warActions = {};
