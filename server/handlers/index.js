import { CmdError, parse } from './validate.js';
import ship from './ship.js';
import trade from './trade.js';
import route from './route.js';
import fleet from './fleet.js';

/**
 * Befehls-Handler. Jeder Handler: { args: { feld: validator }, run(ctx, args) -> Fehlertext | undefined }
 * ctx = { game, player }
 */
const HANDLERS = { ...ship, ...trade, ...route, ...fleet };

export function runCommand(game, player, msg) {
  const h = Object.hasOwn(HANDLERS, msg.cmd) ? HANDLERS[msg.cmd] : null;
  if (!h) return 'Unbekannter Befehl.';
  const ctx = { game, player };
  try {
    const args = parse(h.args || {}, msg, ctx);
    return h.run(ctx, args) || undefined;
  } catch (e) {
    if (e instanceof CmdError) return e.message;
    throw e;
  }
}

export const commandNames = () => Object.keys(HANDLERS);
