// Quests (PRD-2 Kapitel 9): Questtafel im Detailpanel, aktive Quest als eigenes Panel
import { GOODS, QUEST_TYPES, GIVER_LEVELS, MAX_GIVER_LEVEL, QUEST, FACTIONS, giverLevel, shipStats } from '/shared/config.js';
import { state, fmt, esc, myShips } from '../state.js';
import { cmd } from '../net.js';
import { $, setHtml } from './dom.js';
import { bus } from './bus.js';
import { HOME_QUESTS } from '/shared/homeworld.js';

const g = (x) => GOODS[x]?.name || x;

/** Beschreibung einer Quest (Angebot oder aktiv) */
export function questText(q) {
  switch (q.type) {
    case 'procure': return `${q.amount} ${g(q.good)} ${q.source ? `bei ${esc(q.sourceName)} kaufen` : 'beschaffen'} und an ${esc(q.giverName)} liefern`;
    case 'rush': return `Eilbestellung: ${q.amount} ${g(q.good)} für den aktuellen Bau an ${esc(q.giverName)} liefern${q.source ? ` (z.B. von ${esc(q.sourceName)})` : ''}`;
    case 'courier': return `Questfracht bei ${esc(q.pickupName)} abholen und zu ${esc(q.destName)} bringen`;
    case 'tour': return `${q.tourists} Touristen: ${q.stopNames.map(esc).join(', ')} anfliegen und zurück nach ${esc(q.giverName)} (Passagierkabine)`;
    case 'explore': return q.zone ? `Sondergebiet ${esc(q.zoneName)} besuchen` : `${q.pct} % von Sektor ${esc(q.sectorName)} aufdecken`;
    case 'mine': return `${q.amount} ${g(q.good)} selbst abbauen (z.B. ${esc(q.beltName)}) und an ${esc(q.giverName)} liefern`;
    default: return q.type;
  }
}

const rewardText = (q) => `<b>${fmt(q.reward.cr)} Cr</b> · ${q.reward.xp} XP${q.faction ? ` · Ruf ${esc(FACTIONS[q.faction].name)}` : ''}`;
const qTitle = (q) => `${QUEST_TYPES[q.type].icon} ${QUEST_TYPES[q.type].name} <span class="badge" title="Questlevel">Q${q.level}</span>`;

/** Warum kann dieses Schiff die Quest nicht annehmen? '' = möglich */
function acceptBlock(q, ship) {
  if (!ship) return 'Ein eigenes Schiff muss hier angedockt sein';
  if (state.quest) return 'Du hast schon eine aktive Quest';
  const lock = (state.questLock || 0) - state.time;
  if (lock > 0) return `Nach einem Abbruch erst in ${Math.ceil(lock / 60)} min`;
  const st = shipStats(ship);
  if (q.type === 'tour' && st.passenger < q.tourists) return `Braucht Passagierkabinen für ${q.tourists} Touristen`;
  if (q.type === 'mine' && !(st.mining.std > 0)) return 'Braucht ein Schiff mit Abbaugeräten';
  return '';
}

/**
 * Questtafel eines Planeten oder einer Werft. An Planeten werden Quests nur im Questhaus der planetaren Ansicht
 * angenommen (inHouse), im Detailpanel verweist der Knopf dorthin (PRD-3 6.2).
 */
export function questBoardSection(e, dockedShip, inHouse = false) {
  const m = e.market;
  const lvl = giverLevel(m.qxp || 0);
  const next = GIVER_LEVELS[lvl + 1];
  const offers = m.board || [];
  let h = `<div class="section"><div class="section-title">Questtafel · Level ${lvl}${next ? ` <span class="muted" style="text-transform:none;letter-spacing:0">(${fmt(m.qxp || 0)} / ${fmt(next)} XP)</span>` : ''}</div>`;
  if (!offers.length) h += `<div class="muted">Keine Aufträge. Neue erscheinen alle ${QUEST.EVERY[0] / 60} bis ${QUEST.EVERY[1] / 60} min (${QUEST.SLOTS[lvl]} ${QUEST.SLOTS[lvl] > 1 ? 'Plätze' : 'Platz'}).</div>`;
  for (const q of offers) {
    const why = acceptBlock(q, dockedShip);
    h += `<div class="quest-offer"><div class="qo-head">${qTitle(q)}<span style="flex:1"></span>${rewardText(q)}</div>
      <div>${questText(q)}</div>
      <div class="qo-foot"><span class="muted">Aufwand ca. ${Math.max(1, Math.round(q.effort))} min bei Tempo 150</span><span style="flex:1"></span>
      ${e.kind === 'planet' && !inHouse
        ? `<button class="small" data-act="land" data-ent="${e.id}" ${dockedShip ? '' : 'disabled'} title="${dockedShip ? 'Landen und im Questhaus annehmen' : 'Ein eigenes Schiff muss hier angedockt sein'}">Im Questhaus annehmen (landen)</button>`
        : `<button class="small primary" data-act="questAccept" data-ent="${e.id}" data-quest="${q.id}" data-ship="${dockedShip?.id || ''}" ${why ? 'disabled' : ''} title="${esc(why)}">Annehmen</button>`}</div></div>`;
  }
  if (lvl < MAX_GIVER_LEVEL) h += `<div class="muted small-note">${e.market?.realEconomy?'Höhere Level verändern Questschwierigkeit und Angebot. Leistung entsteht durch konkrete Infrastruktur.':e.kind === 'planet' ? 'Höhere Level: mehr Produktion und Lager, neue Waren, schwierigere Quests.' : 'Höhere Level: bessere Schiffe (+5 % je Level), schwierigere Quests.'}</div>`;
  return h + '</div>';
}

// ---------- Aktive Quest ----------
const nm = (id) => state.entities.get(id)?.name || '?';
const best = (good) => Math.max(0, ...myShips().map((s) => s.cargo?.[good] || 0));
const minedTotal = (good) => myShips().reduce((a, s) => a + (s.mined?.[good] || 0), 0);

function progressText(q) {
  switch (q.type) {
    case 'procure':
    case 'rush': return `An Bord (bestes Schiff): ${Math.min(best(q.good), q.amount)} / ${q.amount} ${g(q.good)}`;
    case 'mine': return `Selbst abgebaut: ${Math.min(q.amount, Math.max(0, minedTotal(q.good) - q.minedBase))} / ${q.amount} · an Bord: ${Math.min(best(q.good), q.amount)}`;
    case 'courier': return q.state === 'pickup' ? `Abholen bei ${esc(q.pickupName)}` : `Unterwegs mit ${esc(state.ships.get(q.ship)?.name || '?')} nach ${esc(q.destName)}`;
    case 'tour': return q.state === 'return' ? `Alle Halte besucht: zurück nach ${esc(q.giverName)}` : `Halte: ${q.visited.length} / ${q.stops.length} (mit ${esc(state.ships.get(q.ship)?.name || '?')})`;
    case 'explore': return q.zone ? `Ein Schiff in das Gebiet fliegen` : `Aufgedeckt: ${Math.round((q.progress / q.cells) * q.pct * 10) / 10} / ${q.pct} %`;
    default: return '';
  }
}

/** Nächstes Ziel der aktiven Quest (Entity-ID oder Punkt) */
function questTarget(q) {
  switch (q.type) {
    case 'procure':
    case 'rush': return best(q.good) >= q.amount || !q.source ? q.giver : q.source;
    case 'mine': return minedTotal(q.good) - q.minedBase >= q.amount ? q.giver : q.belt;
    case 'courier': return q.state === 'pickup' ? q.pickup : q.dest;
    case 'tour': return q.state === 'return' ? q.giver : q.stops.find((s) => !q.visited.includes(s));
    case 'explore': return q.zone ? { x: q.zx, y: q.zy } : (state.sectors.get(q.sector)?.bh || null);
    default: return null;
  }
}

export function renderQuestBox() {
  const q = state.quest;
  const box = $('questBox');
  box.hidden = !q && !state.homeworld;
  const nextHome = Object.entries(HOME_QUESTS).find(([id, quest]) => !state.homeQuest?.completed[id] && quest.requires.every(id => state.homeQuest?.completed[id]));
  const homeSummary = state.homeworld && nextHome ? `<div class="qb-head">⌂ Hauptquest · ${nextHome[0]}</div><p>${esc(nextHome[1].title)}: ${esc(nextHome[1].goal)}</p><button class="small" data-q="homeTarget">Heimat zeigen</button><hr>` : '';
  if (!q) { setHtml(box, homeSummary); return; }
  const t = questTarget(q);
  const docked = myShips().filter((s) => s.dockedAt);
  setHtml(box, `${homeSummary}<div class="qb-head">${qTitle(q)}<span style="flex:1"></span><button class="small ghost" data-q="abort" title="Abbrechen: 10 min Sperre${q.faction ? ', kleiner Rufverlust' : ''}">✕</button></div>
    <div class="qb-text">${questText(q)}</div>
    <div class="qb-prog">${progressText(q)}</div>
    <div class="qb-foot">${rewardText(q)}<span style="flex:1"></span>
      ${t ? `<button class="small" data-q="target">◎ ${typeof t === 'string' ? esc(nm(t)) : 'Ziel'}</button>` : ''}
      ${docked.length && ['procure', 'rush', 'mine'].includes(q.type) && docked.some((s) => s.dockedAt === q.giver) ? `<button class="small primary" data-q="deliver" data-ship="${docked.find((s) => s.dockedAt === q.giver).id}">Abliefern</button>` : ''}</div>`);
}

$('questBox').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-q]');
  const q = state.quest;
  if (b?.dataset.q === 'homeTarget') {
    const home = state.entities.get(state.homeworld);
    if (home) { state.follow = null; state.camera.x = home.x; state.camera.y = home.y; bus.select({ kind: 'entity', id: home.id }); }
    return;
  }
  if (!b || !q) return;
  if (b.dataset.q === 'abort') {
    if (confirm(`Quest abbrechen? Danach ${QUEST.ABORT_LOCK / 60} min keine neue Quest${q.faction ? ' und kleiner Rufverlust bei der Fraktion' : ''}.`)) cmd('questAbort');
  } else if (b.dataset.q === 'deliver') cmd('questDeliver', { ship: b.dataset.ship });
  else if (b.dataset.q === 'target') {
    const t = questTarget(q);
    const e = typeof t === 'string' ? state.entities.get(t) : null;
    const p = e || t;
    if (p) { state.follow = null; state.camera.x = p.x; state.camera.y = p.y; }
    if (e) bus.select({ kind: 'entity', id: e.id });
  }
});
