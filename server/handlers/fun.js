import { MG, EXTRAS, MINIGAMES, COMPLIMENTS, planetFeatures, gamesOf, stakeOf, pilotLevel } from '../../shared/config.js';
import { V, CmdError } from './validate.js';
import { acceptQuest } from '../quests.js';

/**
 * Unterhaltung der planetaren Ansicht (PRD-3 Kapitel 6.5 und 6.6): Minispiele mit Stundenlimit, Schmugglerhöhle,
 * Bettler, Hund. Ergebnisse gehen per Ereignis 'mg' an den Client, der sie nur animiert (Glücksspiele) bzw. selbst
 * ermittelt und meldet (Geschicklichkeitsspiele; manipulierbar, bewusst akzeptiert, G1).
 */

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Planet, an dem ein eigenes Schiff angedockt ist; liefert { e, feat } */
const landed = () => (v, ctx) => {
  const e = V.entity()(v, ctx);
  if (e.kind !== 'planet' || !e.market) throw new CmdError('Nur auf Planeten.');
  if (!ctx.game.shipsOf(ctx.player.id).some((s) => s.dockedAt === e.id)) throw new CmdError('Kein Schiff angedockt.');
  return { e, feat: planetFeatures(e.id) };
};
export const dogActive = (game, p) => (p.dogUntil || 0) > game.time;
const winChance = (game, p) => (dogActive(game, p) ? MG.WIN_DOG : MG.WIN);

/** Stundenlimit über alle Planeten: Fenster beginnt mit dem ersten Spiel */
function useSlot(game, p) {
  if (!p.mg || game.time - p.mg.start >= MG.WINDOW) p.mg = { start: game.time, n: 0 };
  if (p.mg.n >= MG.LIMIT) {
    const wait = Math.ceil((p.mg.start + MG.WINDOW - game.time) / 60);
    return `Der Croupier macht Pause. Noch ${wait} min.`;
  }
  p.mg.n++;
  return null;
}

/** Ablauf eines Glücksspiels passend zum Ergebnis erzeugen (der Client animiert ihn nur) */
function luckOutcome(game, win, choice) {
  switch (game) {
    case 'dice': {
      // Spieler gegen Bank, 2 Würfel; Gleichstand verliert
      for (;;) {
        const you = [rnd(1, 6), rnd(1, 6)], bank = [rnd(1, 6), rnd(1, 6)];
        const d = you[0] + you[1] - bank[0] - bank[1];
        if ((win && d > 0) || (!win && d <= 0)) return { you, bank };
      }
    }
    case 'highlow': {
      const first = Math.max(2, Math.min(14, Number(choice?.first) || 8));
      const up = choice?.guess === 'higher';
      const ok = [];
      const bad = [];
      for (let c = 2; c <= 14; c++) ((up ? c > first : c < first) ? ok : bad).push(c);
      const list = win && ok.length ? ok : bad.length ? bad : ok;
      return { first, next: pick(list), win: list === ok };
    }
    case 'slots': {
      const sym = ['🚀', '🪐', '⭐', '💎', '☄️', '👾'];
      if (win) { const s = pick(sym); return { reels: [s, s, s] }; }
      for (;;) { const r = [pick(sym), pick(sym), pick(sym)]; if (!(r[0] === r[1] && r[1] === r[2])) return { reels: r }; }
    }
    case 'roulette': {
      // Farbe wählen: rot oder schwarz; 0 (grün) verliert immer
      const color = choice?.color === 'black' ? 'black' : 'red';
      const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
      const nums = [];
      for (let n = 0; n <= 36; n++) {
        const c = n === 0 ? 'green' : RED.has(n) ? 'red' : 'black';
        if ((c === color) === win) nums.push(n);
      }
      return { color, number: pick(nums) };
    }
    case 'horses': {
      const horse = Math.max(0, Math.min(4, Number(choice?.horse) || 0));
      const winner = win ? horse : pick([0, 1, 2, 3, 4].filter((h) => h !== horse));
      return { horse, winner, seed: rnd(1, 1e9) };
    }
  }
  return {};
}

/** Prüft Gebäude, Spiel und Einsatz; liefert den Einsatz in Credits */
function checkGame(game, p, e, feat, building, name, stake) {
  if (!feat.fun.includes(building)) throw new CmdError('Dieses Gebäude gibt es hier nicht.');
  if (!gamesOf(feat, building).includes(name)) throw new CmdError('Dieses Spiel gibt es hier nicht.');
  const cr = stakeOf(stake, pilotLevel(p.xp));
  if (p.credits < cr) throw new CmdError('Nicht genug Credits für diesen Einsatz.');
  return cr;
}

export default {
  /** Glücksspiel: Der Server würfelt, Gewinn zahlt Einsatz plus denselben Betrag */
  mgPlay: {
    args: { target: landed(), building: V.str(20, 1), game: V.key(MINIGAMES), stake: V.int(0, MG.STAKES.length - 1), choice: V.opt((v) => (v && typeof v === 'object' ? v : {}), {}) },
    run({ game, player }, { target: { e, feat }, building, game: name, stake, choice }) {
      if (MINIGAMES[name].kind !== 'luck') return 'Das ist ein Geschicklichkeitsspiel.';
      const cr = checkGame(game, player, e, feat, building, name, stake);
      if (name === 'highlow') {
        const f = Number(choice.first);
        if ((choice.guess === 'higher' && f >= 14) || (choice.guess === 'lower' && f <= 2)) return 'Dieser Tipp kann nicht gewinnen.';
      }
      const err = useSlot(game, player);
      if (err) return err;
      let win = Math.random() < winChance(game, player);
      const outcome = luckOutcome(name, win, choice);
      if (outcome.win === false) win = false;
      player.credits -= cr;
      if (win) player.credits += 2 * cr;
      game.emit('mg', player, { game: name, win, stake: cr, outcome, left: MG.LIMIT - player.mg.n });
    },
  },

  /** Geschicklichkeitsspiel starten: Einsatz wird fällig, der Client bekommt Seed und Schwierigkeit */
  mgStart: {
    args: { target: landed(), building: V.str(20, 1), game: V.key(MINIGAMES), stake: V.int(0, MG.STAKES.length - 1) },
    run({ game, player }, { target: { e, feat }, building, game: name, stake }) {
      if (MINIGAMES[name].kind !== 'skill') return 'Das ist ein Glücksspiel.';
      const cr = checkGame(game, player, e, feat, building, name, stake);
      const err = useSlot(game, player);
      if (err) return err;
      player.credits -= cr;
      const id = 'g' + ++game.counters.offer;
      const dog = dogActive(game, player);
      player.mgPending = { id, game: name, stake: cr, at: game.time };
      game.emit('mg', player, { game: name, start: true, id, stake: cr, seed: rnd(1, 2 ** 30), dog, left: MG.LIMIT - player.mg.n });
    },
  },
  mgFinish: {
    args: { id: V.str(20, 1), success: V.bool() },
    run({ game, player }, { id, success }) {
      const g = player.mgPending;
      if (!g || g.id !== id) return 'Kein laufendes Spiel.';
      player.mgPending = null;
      if (game.time - g.at > MG.SKILL_TIMEOUT) return 'Zu spät: Das Spiel ist verfallen.';
      if (success) player.credits += 2 * g.stake;
      game.emit('mg', player, { game: g.game, done: true, win: success, stake: g.stake });
    },
  },

  /** Hund streicheln: persönlicher Buff für 5 min auf allen Planeten, erneutes Streicheln frischt auf */
  dogPet: {
    args: { target: landed() },
    run({ game, player }, { target: { feat } }) {
      if (!feat.dog) return 'Hier ist kein Hund.';
      player.dogUntil = game.time + EXTRAS.DOG_SECS;
      game.emit('mg', player, { game: 'dog', pet: true });
    },
  },

  /** Bettler: 10 Cr Spende, ein Kompliment, jedes angedockte eigene Schiff verliert 5 % seines Treibstoffs */
  beg: {
    args: { target: landed() },
    run({ game, player }, { target: { e, feat } }) {
      if (!feat.beggar) return 'Hier ist kein Bettler.';
      if (player.credits < EXTRAS.BEG_COST) return 'Nicht genug Credits.';
      player.credits -= EXTRAS.BEG_COST;
      for (const s of game.shipsOf(player.id)) if (s.dockedAt === e.id) s.fuel = Math.max(0, (s.fuel || 0) * (1 - EXTRAS.BEG_FUEL));
      game.emit('mg', player, { game: 'beggar', compliment: Math.floor(Math.random() * COMPLIMENTS.length) });
    },
  },

  /** Schmugglerhöhle: Wurmloch-Tipp im aktuellen Sektor (5.000 Cr, keine XP) */
  whTip: {
    args: { target: landed() },
    run({ game, player }, { target: { e, feat } }) {
      if (!feat.smuggler) return 'Hier ist keine Schmugglerhöhle.';
      const holes = game.world.sectorEntities(e.sector).filter((w) => w.kind === 'wormhole' && w.sector === e.sector && !game.isKnown(player, w));
      if (!holes.length) return "Hier gibt's nichts mehr zu holen.";
      if (player.credits < EXTRAS.TIP_COST) return 'Nicht genug Credits.';
      player.credits -= EXTRAS.TIP_COST;
      const w = holes[Math.floor(Math.random() * holes.length)];
      game.noXp = true;
      try { game.revealAround(player, w.x, w.y, 1500); } finally { game.noXp = false; }
      game.emit('notice', player, `Der Schmuggler flüstert: ${w.name}. Auf der Karte markiert.`);
      game.emit('mg', player, { game: 'tip', entity: w.id });
    },
  },
  /** Schmuggelauftrag annehmen (zählt als die eine aktive Quest) */
  smugAccept: {
    args: { target: landed(), ship: V.ownShip() },
    run({ game, player }, { target: { e, feat }, ship }) {
      if (!feat.smuggler) return 'Hier ist keine Schmugglerhöhle.';
      const s = e.market.smug;
      if (!s?.offer) return 'Gerade kein Auftrag.';
      const list = [s.offer];
      const err = acceptQuest(game, player, ship, e, s.offer.id, list);
      if (err) return err;
      s.offer = null;
      s.next = game.time + EXTRAS.SMUG_EVERY[0] + Math.random() * (EXTRAS.SMUG_EVERY[1] - EXTRAS.SMUG_EVERY[0]);
    },
  },
};
