# PRD 19: Rohstoffplaneten der Heimatwelt auf echte Wirtschaft umstellen

## Ziel und Freigabestand

Neben der Heimatwelt erzeugt das Spiel für jeden neuen Spieler eigene
Rohstoffplaneten (`strategy: 'homeResource'`). Sie haben einen eigenen
Markt- und Tick-Pfad ohne Bevölkerung, Cash und `realEconomy`-Flag und fallen
deshalb in Server und Client noch in Legacy-Zweige für alte Planeten.

Diese Planeten werden zu gewöhnlichen `realEconomy`-Planeten. Neue
Rohstoffplaneten entstehen auf demselben Weg wie in der Weltgenerierung,
bestehende werden beim nächsten Serverstart migriert. Danach werden
`homeResource` und die nur noch dafür vorhandenen Legacy-Zweige für Planeten
entfernt. Die Heimatwelt selbst (`strategy: 'homeworld'`, Typ `ruins`) und
Ruinen-Kolonien bleiben unverändert.

Am 01.11.2026 mit dem Skill `grill-me` in Q1 bis Q6 abgestimmt und vom Nutzer
bestätigt.

## Ausgangslage (geprüft am 01.11.2026)

- Erzeugung in `createHomeworld` (`server/homeworld.js`): Für jede Ware aus
  `HOMEWORLD.placement.resources` (ice, grain, gas, helium3, crude, ore) wird ein
  Planet gespawnt, falls im Heimatsystem kein Produzent im Umkreis
  `maxResourceDistance` (6000) liegt. ID `home_<spieler>_source_<ware>`, Name
  `<Ware> – <System>`, feste Werte: Bestand 150, Lager 600, eigene Raten,
  0,02 Nahrung/s Verbrauch.
- Tick: `tickHomeResource` in `server/game.js`. Er bekommt `econAcc` statt
  `econDt` (kein Raid-Malus) und überspringt `dispatchRealSupply`.
- Weil die Planeten weder `ruins` noch `realEconomy` sind, greifen für sie noch
  `applyLevel` (`server/markets.js`), der Legacy-Teil von `applyProperty`
  (`server/property.js`), der Levelaufschlag in `shared/property.js` und
  Client-Weichen über `e.market.realEconomy`.
- Gas und Helium-3 erzeugen getrennt je einen Gasriesen, obwohl `gasgiant`
  beide Waren produziert.
- Prod-Spielstand (Kopie `C:\Users\Jens\Desktop\spacetrader.db`, nur lesend
  geprüft): 21 `homeResource`-Planeten (agrar 4, gasgiant 6, ice 5, mining 3,
  ocean 3), davon 3 in Spielerbesitz. 11 Routen haben einen Halt an einem
  dieser Planeten. Es gibt keine weiteren Planeten, die weder `ruins` noch
  `realEconomy` sind.
- An der ID `home_..._source_...` hängt im Code nichts außer der Erzeugung.
- Die Onboarding-Sims (`sim/homeworld-onboarding.js`,
  `sim/homeworld-progression.js`) suchen Quellen generisch über produzierte
  Waren. Die Storytexte nennen die Rohstoffplaneten nicht namentlich.

## Entscheidungen

### E1: Zielbild (Q1, Q2)

- Die Heimatwelt bleibt mit Bausystem, Questkette, Warp und Kolonien unverändert.
- Rohstoffplaneten werden vollwertige `realEconomy`-Planeten: Bevölkerung,
  ziviler Verbrauch, Cash-Konto, NPC-Versorgung und -Einkauf, kaufbar und
  spezialisierbar wie jeder andere Planet.
- Die Rohstoffe stehen damit auch NPCs zur Verfügung. Es gibt bewusst keinen
  Schutz und keinen Sonderfall für den Spieler (siehe E4).

### E2: Neuerzeugung bei neuen Spielern (Q4)

- Die Planetenerzeugung aus `populateSystem` (`server/worldgen.js`) wird in eine
  exportierte Hilfsfunktion ausgelagert (Typ, Radius, `size`, Markt über
  `createMarket('planet', type, r, scale)`). Weltgenerierung, `createHomeworld`
  und die Migration nutzen sie gemeinsam.
- Danach `preparePublicEntity` und `applyLocationMods` wie in
  `World.ensureSector`.
- Zuordnung Ware → Typ: ice → ice, grain → agrar, gas/helium3 → gasgiant,
  crude → ocean, ore → mining.
- Die Produzenten-Prüfung berücksichtigt alle Waren der im selben Durchlauf
  schon geplanten Planeten. Ein Gasriese deckt so Gas und Helium-3 ab.
- Die Sonderwerte (Bestand 150, Lager 600, feste Raten) entfallen. Bestand,
  Raten und Lager ergeben sich aus Typ und Größe.
- ID bleibt `home_<spieler>_source_<ware>` (deterministisch).
- Name: nächste freie römische Ziffer der Orbit-Namenskette des Systems, etwa
  `Kepra VI`. Bestehende Planeten des Systems werden nicht umbenannt, die Ziffer
  folgt also nicht der Umlaufbahn.
- Der Zufallsgenerator wird deterministisch aus Weltseed und Spieler abgeleitet,
  wie bisher in `selectSite`.

### E3: Migration bestehender Planeten (Q2, Q3)

- Neue idempotente Migration `migrateHomeResources(game)` beim Laden in
  `server/game.js`, neben `migrateWar` und `migrateBuildingRecipes`. Sie läuft
  nach dem Laden von Besitz und Gebäuden.
- Kriterium: `market.strategy === 'homeResource'`. Nach der Migration ist die
  Strategie entfernt, ein zweiter Start ändert nichts.
- Es bleiben gleich: `id`, Name, Position, System, Sektor, Typ, Radius, `size`.
  Routen, Favoriten, Entdeckungen und Schiffsziele bleiben damit gültig.
- Der Markt wird neu aufgebaut wie bei der Neuerzeugung (E2), mit der
  bestehenden `size` als `scale` und einem RNG, der deterministisch aus Weltseed
  und `id` abgeleitet ist.
- Der aktuelle Bestand der Förderware und der Nahrung wird übernommen, gedeckelt
  auf das neue `cap`, mit Provenance-Eintrag `source: 'migration'`.
  Marktstatistik (`stats`) bleibt erhalten.
- Besitz bleibt bestehen. Spielerfortschritt auf diesen Planeten darf verloren
  gehen: Legacy-Felder wie `lvl`, `bld`, `prop.upg` und `prop.extras` werden ohne
  Ersatz verworfen. Danach gilt die normale `realEconomy`-Besitzlogik.
- `WORLD_GEN` bleibt 5 und `worldProfile` bleibt `homeworld`, damit
  `checkWorldFile` den Spielstand weiter akzeptiert.
- Jede Migration wird beim Start in einer Zeile geloggt (Anzahl, IDs).

### E4: Absicherung des Onboardings (Q5)

- Keine Sonderbehandlung (kein NPC-Kaufschutz, kein garantierter Startbestand).
- Harte Abnahme über die Sims auf 5 Seeds (Annahme: Seeds 1 bis 5):
  `sim/homeworld-onboarding.js` (H00 bis H06) und `sim/homeworld-progression.js`
  laufen durch.
- Die Spielzeit bis H06 (`serverSeconds` aus `sim:homeworld`) darf sich
  gegenüber der Baseline vor der Umstellung je Seed um höchstens 25 %
  verschlechtern. Die Baseline wird in S1 gemessen.
- Reißt ein Kriterium, wird gezielt mit dem Nutzer entschieden. Ein möglicher
  Hebel ist ein Mindestbestand beim Spawn über `createMarket`-Parameter, keine
  neue Strategie.

### E5: Umfang des Aufräumens (Q6)

- Entfernt werden `homeResource` (Strategie, `tickHomeResource`, Ausnahmen in
  `preparePublicEntity` und Tests) und `HOMEWORLD.industry.unsuppliedExtraction`.
- Zusätzlich werden die Legacy-Zweige für Planeten entfernt, die nach der
  Migration nicht mehr erreichbar sind:
  - Planetenteil von `applyLevel` (`server/markets.js`)
  - Legacy-Teil von `applyProperty` für Planeten (`server/property.js`)
  - Levelaufschlag für Planeten in `shared/property.js`
  - Client-Weichen über `e.market.realEconomy` für Planeten (unter anderem
    `client/js/ui/property.js`, `planetPanel.js`, `quests.js`)
- Was Stationen, Fraktionsverwaltungen oder Werften noch nutzen, bleibt.
- Das Flag `market.realEconomy` selbst bleibt (siehe Nicht im Umfang).
- Prüfung beim Start nach der Migration: Jeder Planet, der weder `ruins` noch
  `realEconomy` ist, wird mit einer verständlichen Log-Meldung gemeldet (ID,
  Name, Typ, Strategie und Hinweis, dass eine Korrektur nötig ist). Der Start
  bricht nicht ab.

### Annahmen (in der Umsetzung zu bestätigen)

- Die 5 Seeds für E4 sind 1 bis 5.
- Die Baseline für E4 wird mit dem Stand vor S2 gemessen und im PRD notiert.
- Für die Migration wird ein deterministischer Vergleich gegen eine Kopie des
  Prod-Spielstands ausgeführt (Laden, migrieren, Kennzahlen prüfen). Kopien
  liegen nur im Scratchpad, werden nie committet und nach der Abnahme
  gelöscht. Ergebnisse im PRD enthalten nur Kennzahlen, keine Spielernamen.

## Nicht im Umfang

- Änderungen an Heimatwelt, Ruinen-Kolonien, Questkette und Storytexten.
- Entfernen des Flags `market.realEconomy`.
- Balancing über die in E4 genannten Hebel hinaus.
- Änderungen am Deployment.

## Umsetzungsschritte und Fortschritt

Jeder Schritt endet mit grüner Testsuite und einem eigenen Commit. Der
Fortschritt wird im selben Commit aktualisiert.

- [x] **S0: PRD.** Planung abgestimmt und dieses Dokument angelegt.
- [x] **S1: Baseline.** `sim:homeworld` und `sim:progression` auf den Seeds aus
  E4 mit dem aktuellen Stand ausführen, `serverSeconds` bis H06 notieren.
  `sim:progression` hat dafür die Optionen `--seed` und `--out` bekommen. Ohne
  Option bleibt alles beim Referenzlauf mit Seed 42; andere Seeds legen
  Zwischenstände unter `data/prd5/seed<N>/` ab.

  Baseline (Stand `60d8b6d`, 01.11.2026):

  | Seed | `sim:homeworld` bis H06 (s) | `sim:progression` |
  |------|-----------------------------|-------------------|
  | 1 | 2091 | läuft noch, wird nachgetragen |
  | 2 | 2048 | Abbruch nach H09 (47844 s): „Keine reale Rohstoffquelle gold“ |
  | 3 | 1986 | Abbruch nach H09 (37291 s): „Keine reale Rohstoffquelle gold“ |
  | 4 | 2126 | Abbruch nach H09 (41235 s): „Keine reale Rohstoffquelle gold“ |
  | 5 | 2047 | Abbruch nach H08 (30044 s): „homeBuild: Nicht genug Credits.“ |

  Befund: Der Progressionsplaner ist auf Seed 42 abgestimmt und läuft schon vor
  der Umstellung auf den Seeds 2 bis 5 nicht durch. Kriterium 7 kann für
  `sim:progression` deshalb nur relativ zur Baseline geprüft werden (mindestens
  dieselbe letzte Quest, keine neue Fehlerursache). Dazu läuft zusätzlich der
  Referenzlauf auf Seed 42 als Baseline. Mit dem Nutzer zu klären.
- [ ] **S2: Gemeinsame Planetenerzeugung.** Hilfsfunktion aus `populateSystem`
  auslagern, Weltgenerierung darauf umstellen. Verhaltensgleich: gleiche Welt
  für gleichen Seed (per Test belegt).
- [ ] **S3: Neuerzeugung.** `createHomeworld` erzeugt Rohstoffplaneten nach E2.
  Tests für Typ, `realEconomy`, Name, Gas/Helium-3-Deckung.
- [ ] **S4: Migration.** `migrateHomeResources` nach E3 mit Tests für
  Idempotenz, Bestandsübernahme, Besitz, Routen. Prüflauf gegen Kopie des
  Prod-Spielstands.
- [ ] **S5: `homeResource` entfernen.** Strategie, Tick, Konstanten und
  Test-Ausnahmen entfernen.
- [ ] **S6: Legacy-Zweige für Planeten entfernen.** Nach E5 in Server, Shared
  und Client, plus Start-Prüfung mit Log-Meldung.
- [ ] **S7: Abnahme.** Sims nach E4, Browser-Test in der lokalen Vorschau
  (Planetenansicht eines migrierten Planeten, Besitzansicht), Ergebnisse
  notieren.

## Abnahmekriterien

1. Im Code gibt es keine Strategie `homeResource` und kein `tickHomeResource` mehr.
2. Neue Rohstoffplaneten sind `realEconomy`-Planeten nach E2, ein Gasriese deckt
   Gas und Helium-3 ab.
3. Ein bestehender Spielstand startet, alle `homeResource`-Planeten sind danach
   `realEconomy`-Planeten mit unveränderter ID und Position. Ein zweiter Start
   ändert nichts mehr.
4. Nach der Migration meldet die Start-Prüfung auf dem Prod-Spielstand keinen
   Planeten, der weder `ruins` noch `realEconomy` ist.
5. Die Legacy-Zweige für Planeten aus E5 sind entfernt.
6. `npm test` ist grün.
7. `sim:homeworld` und `sim:progression` laufen auf allen Seeds aus E4 durch,
   die Zeit bis H06 liegt je Seed höchstens 25 % über der Baseline.
8. Browser-Test ohne Konsolen- oder Serverfehler.
9. Arbeitskopien des Prod-Spielstands sind gelöscht und nicht im Repo.
