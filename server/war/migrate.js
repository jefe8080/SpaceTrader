// PRD 15 Kapitel 13: wiederholbare Migration bestehender Spielstände. Vernichtet keine Einheiten, startet keine Kämpfe,
// erzeugt keine doppelten Quests, Warenfreigaben, Boni oder Schiffe.
import { ensureDamage } from '../../shared/combat.js';
import { activeSideQuests, removeSideQuest } from '../../shared/side-quests.js';
import { ensureFactionSectors, syncFriendQuest } from './factions.js';
import { diplo } from './diplomacy.js';

export const WAR_MIGRATION = 1;

/** Alte Fraktionsquest außerhalb eines Verwaltungsplaneten? */
function legacyFactionQuest(game, q) {
  if (!q?.faction || q.adminSector) return false;
  const giver = game.world.entities.get(q.giver);
  return !giver?.admin;
}

export function migrateWar(game) {
  // Kampfdefinitionen auf bestehende Schiffe übertragen (bleibende Schadenszustände beginnen intakt)
  for (const s of game.ships.values()) ensureDamage(s);
  ensureFactionSectors(game);
  // Alte Fraktionsquests ohne Strafe beenden und gebundene Waren bzw. Passagiere freigeben
  for (const p of game.players.values()) {
    diplo(p);
    for (const q of activeSideQuests(p)) {
      if (!legacyFactionQuest(game, q)) continue;
      if (q.type === 'tour') for (const ship of game.shipsOf(p.id)) for (const batch of ship.passengers || []) if (batch.quest === q.id) delete batch.quest;
      removeSideQuest(p, q);
      p.war.migratedQuests ||= [];
      if (!p.war.migratedQuests.includes(q.id)) {
        p.war.migratedQuests.push(q.id);
        game.emit('notice', p, `Fraktionsquest „${q.giverName}“ wurde ohne Strafe beendet: Fraktionsaufträge gibt es jetzt am Verwaltungsplaneten.`);
      }
    }
    // Bei bereits sektorweiter Leitstelle startet die Freundschaftsquest einmalig
    syncFriendQuest(game, p);
  }
  // Alte Questangebote an früheren Fraktionsplaneten entfallen
  for (const e of game.world.entities.values()) if (e.faction && !e.admin && e.market?.board) e.market.board.offers = [];
  game.store.setMeta('warMigration', WAR_MIGRATION);
}
