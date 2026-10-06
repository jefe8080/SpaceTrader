import { V, CmdError } from './validate.js';

const MAX_GROUPS = 30;
const MAX_FAVORITES = 200;

const ownGroup = () => (v, { player }) => {
  const g = player.groups.find((x) => x.id === v);
  if (!g) throw new CmdError('Unbekannte Gruppe.');
  return g;
};

export default {
  /** Reihenfolge der Flottenliste (alle oder Teil der Schiffe, in neuer Reihenfolge) */
  fleetOrder: {
    args: { ships: V.ownShips(200), group: V.opt((v, ctx) => (v === 'none' ? 'none' : ownGroup()(v, ctx).id), null) },
    run(ctx, { ships, group }) {
      ships.forEach((s, i) => {
        s.ord = i + 1;
        if (group) s.group = group === 'none' ? null : group;
      });
    },
  },
  groupCreate: {
    args: { name: V.str(24, 1), ships: V.opt(V.ownShips(200), []) },
    run({ game, player }, { name, ships }) {
      if (player.groups.length >= MAX_GROUPS) return 'Zu viele Gruppen.';
      const g = { id: 'g' + ++game.counters.group, name, collapsed: false };
      player.groups.push(g);
      for (const s of ships) s.group = g.id;
    },
  },
  groupRename: {
    args: { group: ownGroup(), name: V.str(24, 1) },
    run(ctx, { group, name }) { group.name = name; },
  },
  groupToggle: {
    args: { group: ownGroup(), collapsed: V.bool() },
    run(ctx, { group, collapsed }) { group.collapsed = collapsed; },
  },
  groupMove: {
    args: { group: ownGroup(), dir: V.oneOf(-1, 1) },
    run({ player }, { group, dir }) {
      const l = player.groups;
      const i = l.indexOf(group), j = i + dir;
      if (j < 0 || j >= l.length) return;
      [l[i], l[j]] = [l[j], l[i]];
    },
  },
  groupDelete: {
    args: { group: ownGroup() },
    run({ game, player }, { group }) {
      player.groups = player.groups.filter((g) => g !== group);
      for (const s of game.shipsOf(player.id)) if (s.group === group.id) s.group = null;
    },
  },
  shipGroup: {
    args: { ships: V.ownShips(200), group: V.opt((v, ctx) => ownGroup()(v, ctx).id, null) },
    run(ctx, { ships, group }) { for (const s of ships) s.group = group; },
  },
  stopLoss: {
    args: { value: V.int(0, 1e12) },
    run({ player }, { value }) { player.stopLoss = value; },
  },
  favorite: {
    args: { target: V.entity(), on: V.bool() },
    run({ player }, { target, on }) {
      if (!on) { delete player.favorites[target.id]; return; }
      if (Object.keys(player.favorites).length >= MAX_FAVORITES) return `Maximal ${MAX_FAVORITES} Favoriten.`;
      player.favorites[target.id] ||= { note: '' };
    },
  },
  favoriteNote: {
    args: { target: V.entity(), note: V.str(120) },
    run({ player }, { target, note }) {
      if (!player.favorites[target.id]) return 'Kein Favorit.';
      player.favorites[target.id].note = note;
    },
  },
};
