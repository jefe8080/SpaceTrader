import { CONSORTIUM, CONSORTIUM_LEVELS, MAX_CONSORTIUM_LEVEL, RANK, LOG_ACTIONS, consortiumOwner, pilotLevel } from '../shared/config.js';

/**
 * Konsortien (PRD-3 Kapitel 4). Ein Konsortium hat einen Geldpool (Feld `credits`, damit es überall dort als
 * Konto dienen kann, wo bisher ein Spieler zahlt oder kassiert), Mitglieder mit Rang, Einladungen, ein Schwarzes Brett
 * und ein Log. Es besitzt Planeten und Stationen (ownership.player = 'c:<id>'), aber keine Schiffe.
 */

export const consortiumOf = (game, p) => (p?.consortium ? game.consortia.get(p.consortium) || null : null);
export const rankOf = (c, pid) => c?.members[pid]?.rank || null;
export const isMaster = (c, pid) => rankOf(c, pid) === 'master';
export const memberIds = (c) => Object.keys(c.members);
export const levelOf = (c) => CONSORTIUM_LEVELS[c.level];
/** Anzahl Besitztümer des Konsortiums */
export const propCount = (game, c) => { const o = consortiumOwner(c.id); let n = 0; for (const p of game.ownership.values()) if (p.player === o) n++; return n; };

/** Logeintrag: Zeitpunkt (Echtzeit), Spieler, Aktion, Betrag, Objekt. Höchstens 1.000 Einträge, höchstens 30 Tage. */
export function clog(game, c, playerId, action, amount = 0, object = '') {
  const list = game.consortiumLog.get(c.id) || [];
  game.consortiumLog.set(c.id, list);
  c.logSeq = (c.logSeq || 0) + 1;
  list.push({ seq: c.logSeq, t: Date.now(), player: playerId ? game.players.get(playerId)?.name || '?' : '', action, amount: Math.round(amount), object });
  trimLog(list);
}
export function trimLog(list, now = Date.now()) {
  while (list.length > CONSORTIUM.LOG_MAX || (list.length && now - list[0].t > CONSORTIUM.LOG_MS)) list.shift();
}

/** Konsortium hat sich geändert: Mitglieder (und Eingeladene) bekommen den neuen Stand */
const changed = (game, c) => game.emit('consortium', c);
const note = (game, c, msg, except = null) => { for (const id of memberIds(c)) if (id !== except) game.emit('notice', game.players.get(id), msg); };

export function validName(game, name, except = null) {
  if (name.length < CONSORTIUM.NAME[0] || name.length > CONSORTIUM.NAME[1]) return `Der Name muss ${CONSORTIUM.NAME[0]} bis ${CONSORTIUM.NAME[1]} Zeichen lang sein.`;
  for (const c of game.consortia.values()) if (c !== except && c.name.toLowerCase() === name.toLowerCase()) return 'Diesen Namen trägt schon ein anderes Konsortium.';
  return null;
}

// ---------- Gründung und Mitgliedschaft ----------
export function found(game, p, { name, color }) {
  if (p.consortium) return 'Du bist schon Mitglied eines Konsortiums.';
  if (pilotLevel(p.xp) < CONSORTIUM.FOUND_LEVEL) return `Gründen kannst du ab Pilotenlevel ${CONSORTIUM.FOUND_LEVEL}.`;
  const atHub = game.shipsOf(p.id).some((s) => game.world.entities.get(s.dockedAt)?.type === 'hub');
  if (!atHub) return 'Gründung nur am Handels-Hub (ein eigenes Schiff muss dort angedockt sein).';
  const err = validName(game, name);
  if (err) return err;
  const cost = CONSORTIUM_LEVELS[1].cost;
  if (p.credits < cost) return `Die Gründung kostet ${cost.toLocaleString('de-DE')} Cr.`;
  p.credits -= cost;
  const id = 'k' + ++game.counters.consortium;
  const c = { id, name, color, level: 1, credits: 0, members: { [p.id]: { rank: 'master', since: Date.now() } }, invites: {},
    board: { text: '', by: '', at: 0 }, created: Date.now(), logSeq: 0 };
  game.consortia.set(id, c);
  p.consortium = id;
  game.emit('player', p);
  clog(game, c, p.id, 'found', cost, name);
  game.emit('notice', p, `Konsortium ${name} gegründet. Du bist Handelsmeister.`);
  changed(game, c);
  return undefined;
}

/** Offene Einladungen eines Spielers (abgelaufene werden entfernt) */
export function invitesFor(game, pid, now = Date.now()) {
  const out = [];
  for (const c of game.consortia.values()) {
    const inv = c.invites[pid];
    if (!inv) continue;
    if (inv.until <= now) { delete c.invites[pid]; continue; }
    out.push({ c, ...inv });
  }
  return out;
}

export function invite(game, p, name) {
  const c = consortiumOf(game, p);
  if (!isMaster(c, p.id)) return 'Einladen dürfen nur Handelsmeister.';
  const q = game.findPlayerByName(name);
  if (!q) return 'Diesen Spieler gibt es nicht.';
  if (q.consortium === c.id) return `${q.name} ist schon Mitglied.`;
  if (q.consortium) return `${q.name} ist schon in einem anderen Konsortium.`;
  c.invites[q.id] = { until: Date.now() + CONSORTIUM.INVITE_MS, by: p.name };
  game.emit('notice', q, `${p.name} lädt dich in das Konsortium ${c.name} ein (Taste K).`);
  game.emit('notice', p, `Einladung an ${q.name} verschickt (24 h gültig).`);
  changed(game, c);
  return undefined;
}

export function answerInvite(game, p, cid, accept) {
  const c = game.consortia.get(cid);
  const inv = c && invitesFor(game, p.id).find((x) => x.c === c);
  if (!inv) return 'Diese Einladung gibt es nicht mehr.';
  delete c.invites[p.id];
  if (!accept) { changed(game, c); return undefined; }
  if (p.consortium) return 'Du bist schon Mitglied eines Konsortiums.';
  c.members[p.id] = { rank: 'trader', since: Date.now() };
  p.consortium = c.id;
  game.emit('player', p);
  // Andere Einladungen verfallen
  for (const o of game.consortia.values()) if (o.invites[p.id]) { delete o.invites[p.id]; changed(game, o); }
  clog(game, c, p.id, 'join');
  note(game, c, `${p.name} ist dem Konsortium ${c.name} beigetreten.`);
  changed(game, c);
  return undefined;
}

/** Befördern, herabstufen, rausschmeißen: nur Handelsmeister, nicht sich selbst */
export function setRank(game, p, targetId, rank) {
  const c = consortiumOf(game, p);
  if (!isMaster(c, p.id)) return 'Nur Handelsmeister dürfen Ränge ändern.';
  if (targetId === p.id) return 'Deinen eigenen Rang kannst du nicht ändern.';
  const m = c.members[targetId];
  if (!m) return 'Kein Mitglied.';
  if (m.rank === rank) return undefined;
  m.rank = rank;
  const q = game.players.get(targetId);
  clog(game, c, p.id, rank === 'master' ? 'promote' : 'demote', 0, q?.name || '?');
  game.emit('notice', q, `${c.name}: Du bist jetzt ${RANK[rank]}.`);
  changed(game, c);
  return undefined;
}

export function kick(game, p, targetId) {
  const c = consortiumOf(game, p);
  if (!isMaster(c, p.id)) return 'Rausschmeißen dürfen nur Handelsmeister.';
  if (targetId === p.id) return 'Zum Verlassen bitte "Austreten" wählen.';
  if (!c.members[targetId]) return 'Kein Mitglied.';
  const q = game.players.get(targetId);
  removeMember(game, c, targetId);
  clog(game, c, p.id, 'kick', 0, q?.name || '?');
  game.emit('notice', q, `Du wurdest aus dem Konsortium ${c.name} entfernt.`);
  changed(game, c);
  game.emit('consortium', null, q); // Ausgetretene bekommen den leeren Stand
  return undefined;
}

/** Austritt: Privatgeld bleibt, keine Auszahlung. Der letzte Handelsmeister muss vorher jemanden befördern. */
export function leave(game, p) {
  const c = consortiumOf(game, p);
  if (!c) return 'Du bist in keinem Konsortium.';
  const others = memberIds(c).filter((id) => id !== p.id);
  if (!others.length) {
    dissolve(game, c);
    game.emit('notice', p, `Konsortium ${c.name} aufgelöst. Die Besitztümer sind wieder herrenlos, der Pool ist verfallen.`);
    game.emit('consortium', null, p);
    return undefined;
  }
  if (isMaster(c, p.id) && !others.some((id) => isMaster(c, id))) return 'Du bist der letzte Handelsmeister. Befördere erst ein anderes Mitglied.';
  removeMember(game, c, p.id);
  clog(game, c, p.id, 'leave');
  note(game, c, `${p.name} hat das Konsortium ${c.name} verlassen.`);
  changed(game, c);
  game.emit('consortium', null, p);
  return undefined;
}

function removeMember(game, c, pid) {
  delete c.members[pid];
  const q = game.players.get(pid);
  if (q) { q.consortium = null; game.emit('player', q); }
  game.removeOffersOf?.(pid);
}

/** Auflösung: Besitz wird herrenlos (wieder NPC-Markt), der Pool verfällt */
export function dissolve(game, c) {
  const owner = consortiumOwner(c.id);
  for (const prop of [...game.ownership.values()]) if (prop.player === owner) game.releaseProperty(prop.entity);
  for (const id of memberIds(c)) removeMember(game, c, id);
  game.consortia.delete(c.id);
  game.consortiumLog.delete(c.id);
}

// ---------- Pool und Level ----------
export function deposit(game, p, amount) {
  const c = consortiumOf(game, p);
  if (!c) return 'Du bist in keinem Konsortium.';
  if (p.credits < amount) return 'Nicht genug Credits.';
  const net = amount * CONSORTIUM.DEPOSIT_SHARE;
  p.credits -= amount;
  c.credits += net;
  clog(game, c, p.id, 'deposit', amount, `Pool +${Math.round(net).toLocaleString('de-DE')}, Gebühr ${Math.round(amount - net).toLocaleString('de-DE')}`);
  changed(game, c);
  return undefined;
}

export function withdraw(game, p, amount) {
  const c = consortiumOf(game, p);
  if (!isMaster(c, p.id)) return 'Auszahlen dürfen nur Handelsmeister.';
  if (c.credits < amount) return 'So viel ist nicht im Pool.';
  const net = amount * CONSORTIUM.WITHDRAW_SHARE;
  c.credits -= amount;
  p.credits += net;
  clog(game, c, p.id, 'withdraw', amount, `erhalten ${Math.round(net).toLocaleString('de-DE')}, Gebühr ${Math.round(amount - net).toLocaleString('de-DE')}`);
  changed(game, c);
  return undefined;
}

export function levelUp(game, p) {
  const c = consortiumOf(game, p);
  if (!isMaster(c, p.id)) return 'Den Levelaufstieg lösen nur Handelsmeister aus.';
  if (c.level >= MAX_CONSORTIUM_LEVEL) return 'Höchstes Level erreicht.';
  const next = CONSORTIUM_LEVELS[c.level + 1];
  if (c.credits < next.cost) return `Der Aufstieg kostet ${next.cost.toLocaleString('de-DE')} Cr aus dem Pool.`;
  c.credits -= next.cost;
  c.level = next.level;
  clog(game, c, p.id, 'level', next.cost, `Level ${next.level}`);
  note(game, c, `${c.name} erreicht Level ${next.level}: ${next.maxProps} Besitztümer, Ausbau bis Stufe ${next.maxLevel}.`);
  changed(game, c);
  return undefined;
}

export function setBoard(game, p, text) {
  const c = consortiumOf(game, p);
  if (!c) return 'Du bist in keinem Konsortium.';
  c.board = { text: text.slice(0, CONSORTIUM.BOARD_MAX), by: p.name, at: Date.now() };
  changed(game, c);
  return undefined;
}

/** Stündliche Sammelbuchung der Erlöse aus Konsortiumsbesitz (je Objekt) */
export function bookRevenue(game, c, entityId, n) {
  c.rev ||= {};
  c.rev[entityId] = (c.rev[entityId] || 0) + n;
}
export function flushRevenue(game) {
  const hour = Math.floor(Date.now() / 3600000);
  for (const c of game.consortia.values()) {
    if (c.revHour === hour) continue;
    for (const [id, n] of Object.entries(c.rev || {})) if (n >= 1) clog(game, c, null, 'revenue', n, game.world.entities.get(id)?.name || id);
    c.rev = {};
    c.revHour = hour;
  }
}

// ---------- Sicht für den Client ----------
export function consortiumView(game, p, online = new Set()) {
  const c = consortiumOf(game, p);
  const invites = invitesFor(game, p.id).map(({ c: o, until, by }) => ({ id: o.id, name: o.name, color: o.color, by, until }));
  if (!c) return { none: true, invites };
  const master = isMaster(c, p.id);
  const L = levelOf(c);
  const members = memberIds(c).map((id) => {
    const q = game.players.get(id);
    return { id, name: q?.name || '?', rank: c.members[id].rank, level: pilotLevel(q?.xp), online: online.has(id) };
  }).sort((a, b) => (a.rank === b.rank ? a.name.localeCompare(b.name) : a.rank === 'master' ? -1 : 1));
  return {
    id: c.id, name: c.name, color: c.color, level: c.level, pool: Math.floor(c.credits), maxProps: L.maxProps, maxLevel: L.maxLevel,
    props: propCount(game, c), rank: c.members[p.id].rank, members, board: c.board,
    propList: [...game.ownership.values()].filter((x) => x.player === consortiumOwner(c.id)).map((x) => {
      const e = game.world.entities.get(x.entity);
      return { entity: x.entity, name: e?.name || '?', kind: e?.kind, type: e?.type, sector: e?.sector, mode: x.mode, customs: x.customs || 0, upg: x.upg, inc: Math.round(x.tot?.inc || 0) };
    }),
    invited: master ? Object.entries(c.invites).filter(([, i]) => i.until > Date.now()).map(([id, i]) => ({ name: game.players.get(id)?.name || '?', until: i.until })) : [],
    log: master ? (game.consortiumLog.get(c.id) || []).slice(-300).reverse().map((e) => ({ ...e, label: LOG_ACTIONS[e.action] || e.action })) : null,
  };
}
