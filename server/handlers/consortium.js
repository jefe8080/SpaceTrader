import { CONSORTIUM } from '../../shared/config.js';
import { V, CmdError } from './validate.js';
import { found, invite, answerInvite, setRank, kick, leave, deposit, withdraw, levelUp, setBoard } from '../consortium.js';
import { offerMap, deleteMapOffer, buyMap, offerShip, deleteShipOffer, buyShipOffer } from '../offers.js';

/** Mitglied des eigenen Konsortiums (Spieler-ID) */
const member = () => (v, { game, player }) => {
  const c = game.consortia.get(player.consortium);
  if (!c?.members[v]) throw new CmdError('Kein Mitglied deines Konsortiums.');
  return v;
};

export default {
  cFound: {
    args: { name: V.str(CONSORTIUM.NAME[1], 1), color: V.color() },
    run({ game, player }, args) { return found(game, player, args); },
  },
  cInvite: {
    args: { name: V.str(20, 2) },
    run({ game, player }, { name }) { return invite(game, player, name); },
  },
  cAnswer: {
    args: { id: V.str(20, 1), accept: V.bool() },
    run({ game, player }, { id, accept }) { return answerInvite(game, player, id, accept); },
  },
  cPromote: {
    args: { player: member() },
    run({ game, player }, args) { return setRank(game, player, args.player, 'master'); },
  },
  cDemote: {
    args: { player: member() },
    run({ game, player }, args) { return setRank(game, player, args.player, 'trader'); },
  },
  cKick: {
    args: { player: member() },
    run({ game, player }, args) { return kick(game, player, args.player); },
  },
  cLeave: {
    args: {},
    run({ game, player }) { return leave(game, player); },
  },
  cDeposit: {
    args: { amount: V.int(1, 1e12) },
    run({ game, player }, { amount }) { return deposit(game, player, amount); },
  },
  cWithdraw: {
    args: { amount: V.int(1, 1e12) },
    run({ game, player }, { amount }) { return withdraw(game, player, amount); },
  },
  cLevelUp: {
    args: {},
    run({ game, player }) { return levelUp(game, player); },
  },
  // ---------- Kartendaten und Schiffshandel ----------
  cMapOffer: {
    args: { sector: V.str(20, 1), price: V.int(0, 1e10) },
    run({ game, player }, { sector, price }) { return offerMap(game, player, sector, price); },
  },
  cMapDelete: {
    args: { id: V.str(20, 1) },
    run({ game, player }, { id }) { return deleteMapOffer(game, player, id); },
  },
  cMapBuy: {
    args: { id: V.str(20, 1) },
    run({ game, player }, { id }) { return buyMap(game, player, id); },
  },
  cShipOffer: {
    args: { ship: V.ownShip(true), price: V.int(0, 1e10) },
    run({ game, player }, { ship, price }) { return offerShip(game, player, ship, price); },
  },
  cShipDelete: {
    args: { ship: V.str(20, 1) },
    run({ game, player }, { ship }) { return deleteShipOffer(game, player, ship); },
  },
  cShipBuy: {
    args: { ship: V.str(20, 1) },
    run({ game, player }, { ship }) { return buyShipOffer(game, player, ship); },
  },

  /** Schwarzes Brett: Klartext, Zeilenumbrüche bleiben erhalten */
  cBoard: {
    args: { text: (v) => String(v ?? '').replace(/\r/g, '').slice(0, CONSORTIUM.BOARD_MAX) },
    run({ game, player }, { text }) { return setBoard(game, player, text); },
  },
};
