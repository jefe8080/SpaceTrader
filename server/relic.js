import { HOMEWORLD } from '../shared/homeworld.js';

export function grantRelic(game, player, home) {
  if (player.relic) return;
  player.relic = { id: `${player.id}:relic`, speed: 4, location: { kind: 'world', id: home.id }, operation: null };
  home.market.homeworld.grants.push({ id: `${player.id}:relic:H04`, source: 'quest_salvage', recipient: player.id, relic: player.relic.id });
}

export function relicSalvage(game, player, ship, wreck) {
  const salvage = player.homeQuest?.salvage;
  if (!salvage || salvage.wreck !== wreck.id || wreck.salvageOwner !== player.id) return 'Hier liegt kein freigegebener persönlicher Fund.';
  if (salvage.phase !== 'available') return 'Dieser Fund wurde bereits geborgen.';
  if (player.manualShip !== ship.id || ship.dockedAt !== wreck.id || ship.manualDock !== wreck.id) return 'Das aktive manuelle Schiff muss das Wrack persönlich anfliegen.';
  salvage.phase = 'sealed'; salvage.ship = ship.id;
  player.homeQuest.journal.push({ id: 'H04', at: game.time, speaker: 'Iven', text: 'Die Zeichen passen zu keiner unserer Datenbanken. Aber die Anordnung … jemand hat hier für Menschen gebaut.' });
}

export function relicDeliver(game, player, ship, home) {
  const salvage = player.homeQuest?.salvage;
  if (home.id !== player.homeworld || home.market?.homeworld?.owner !== player.id) return 'Den versiegelten Fund nimmt nur deine Heimatwerkstatt an.';
  if (salvage?.phase !== 'sealed' || salvage.ship !== ship.id || ship.dockedAt !== home.id) return 'Der registrierte Fund muss mit seinem Bergungsschiff zur Heimat gebracht werden.';
  salvage.phase = 'workshop';
  Object.assign(home.market.homeworld.facilities.workshop, { status: 'building', readyAt: game.time + 60 });
  game.emit('entity', home);
}

export function relicWork(game, player, ship, home, kind) {
  const relic = player.relic;
  if (!relic) return 'Der Antrieb wird erst durch H04 freigeschaltet.';
  if (relic.operation) return 'Am einzigartigen Antrieb wird bereits gearbeitet.';
  if (home.market?.homeworld?.owner !== player.id || home.market.homeworld.facilities.workshop.status !== 'ready') return 'Dafür brauchst du eine betriebsbereite Werkstatt auf einer eigenen Ruinenwelt.';
  if (ship.dockedAt !== home.id) return 'Das betreffende Schiff muss an dieser Werkstatt angedockt sein.';
  if (ship.queue.length || ship.transit) return 'Vor der Werkstattarbeit alle Schiffsaufträge beenden.';
  if (kind === 'install' && !(relic.location.kind === 'world' && relic.location.id === home.id)) return 'Der eingelagerte Antrieb befindet sich nicht an dieser Werkstatt.';
  if (kind === 'remove' && !(relic.location.kind === 'ship' && relic.location.id === ship.id)) return 'Dieser Antrieb ist nicht in diesem Schiff eingebaut.';
  relic.operation = { kind, ship: ship.id, world: home.id, until: game.time + HOMEWORLD.relic.workshopSeconds };
}

export function tickRelics(game) {
  for (const player of game.players.values()) {
    const relic = player.relic;
    if (!relic?.operation || game.time < relic.operation.until) continue;
    const operation = relic.operation, ship = game.ships.get(operation.ship);
    const home = game.world.entities.get(operation.world);
    // Invalid external state never destroys the unique item or changes its location.
    if (!ship || ship.owner !== player.id || ship.dockedAt !== home?.id) { relic.operation = null; continue; }
    relic.location = operation.kind === 'install' ? { kind: 'ship', id: ship.id } : { kind: 'world', id: home.id };
    relic.operation = null;
    for (const candidate of game.shipsOf(player.id)) {
      if (relic.location.kind === 'ship' && relic.location.id === candidate.id) candidate.relicSpeed = relic.speed;
      else delete candidate.relicSpeed;
    }
    game.shipLog(ship, operation.kind === 'install' ? `Einzigartiger Reliktantrieb eingebaut: Tempo ×${relic.speed}, kein Treibstoffbedarf.` : 'Reliktantrieb ausgebaut und an dieser Werkstatt eingelagert.');
  }
}
