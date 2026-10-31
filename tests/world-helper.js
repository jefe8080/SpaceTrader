// Gemeinsame Hilfen für Tests in der Heimatwelt: Leitstellenabdeckung und Andocken ohne Flug.

/** Leitstelle der Heimatwelt so weit ausbauen, dass die Testobjekte abgedeckt sind. */
export function coverAll(game, player, level = 12) {
  const home = game.world.entities.get(player.homeworld).market.homeworld;
  home.facilities.control.status = 'ready';
  home.controlLevel = level;
  home.controlModules = { ...home.controlModules, capacity: 4 };
  return home;
}

/** Schiff direkt an ein Objekt andocken. */
export function dockAt(ship, entity) {
  ship.x = entity.x + (entity.radius || 0) + 20; ship.y = entity.y;
  ship.vx = ship.vy = 0;
  ship.dockedAt = entity.id; ship.state = 'docked';
  return ship;
}

/** Objekte für den Spieler aufdecken, damit Befehle sie als Ziel annehmen. */
export function reveal(game, player, ...entities) {
  for (const e of entities) game.revealAround(player, e.x, e.y, 500);
}
