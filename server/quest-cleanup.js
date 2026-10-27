import { STUDY_FINDS } from '../shared/advanced-homequests.js';
import { removeWorldEntity } from './ruin-sites.js';

export function cleanupPersonalSites(game, player) {
  const q = player.homeQuest;
  if (!q) return;
  const done = e => e.salvageOwner === player.id ? !!q.completed?.H04
    : e.archiveOwner === player.id && (STUDY_FINDS[e.archiveKey] ? !!q.finds?.[e.archiveKey] : !!q.completed?.[e.archiveKey]);
  for (const e of [...game.world.entities.values()]) {
    if (!done(e)) continue;
    q.removedSites ||= [];
    if (!q.removedSites.includes(e.id)) q.removedSites.push(e.id);
    removeWorldEntity(game.world,e);
    for (const route of game.routes.values()) {
      const stops = route.stops.filter(stop => stop.targetId !== e.id);
      if (stops.length === route.stops.length) continue;
      route.stops = stops;
      for (const ship of game.ships.values()) for (const command of ship.queue || []) {
        if (command.route === route.id) { command.idx=0; command.phase='travel'; ship.nav=null; }
      }
    }
    for (const ship of game.ships.values()) {
      const removedCommand = ship.queue?.some(c => c.target === e.id || c.targetId === e.id);
      if (removedCommand) { ship.queue=ship.queue.filter(c => c.target !== e.id && c.targetId !== e.id); ship.nav=null; ship.vx=0; ship.vy=0; ship.state=ship.dockedAt?'docked':'idle'; }
      if (ship.dockedAt === e.id) { ship.dockedAt=null; ship.state='idle'; ship.nav=null; }
      if (ship.manualDock === e.id) delete ship.manualDock;
    }
    delete player.favorites?.[e.id];
    game.emit('entityRemoved',e);
  }
}
