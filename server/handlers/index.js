import { CmdError, parse } from './validate.js';
import ship from './ship.js';
import trade from './trade.js';
import route from './route.js';
import fleet from './fleet.js';
import shipyard from './shipyard.js';
import property from './property.js';
import quest from './quest.js';
import consortium from './consortium.js';
import planet from './planet.js';
import fun from './fun.js';
import homeworld from './homeworld.js';

/**
 * Befehls-Handler. Jeder Handler: { args: { feld: validator }, run(ctx, args) -> Fehlertext | undefined }
 * ctx = { game, player }
 */
const HANDLERS = { ...ship, ...trade, ...route, ...fleet, ...shipyard, ...property, ...quest, ...consortium, ...planet, ...fun, ...homeworld };

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
