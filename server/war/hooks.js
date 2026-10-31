// PRD 15: Erweiterungspunkte zwischen den Kriegsmodulen. Ohne Importe, damit Registrierungen bei Importzyklen sicher sind.
export const hooks = {
  resolve: null,        // Schlachtende auflösen (outcome.js)
  afterBattle: [],      // Nachlauf nach jeder Schlacht (Reparaturautomatik, Raids, Fraktionen)
  factionLoot: null,    // Beute für Fraktionspools (U09)
  factionCredit: null,  // Freikaufzahlungen an Fraktionen (U09)
};
