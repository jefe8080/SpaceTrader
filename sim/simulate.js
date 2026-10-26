// Headless-Simulation mit Handelsbots zur Kalibrierung der Geldbalance (PRD 5.5).
// Aufruf: node sim/simulate.js [--hours 6] [--bots 3] [--seed 42] [--quiet]
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';
import { GOODS, SHIP_TYPES, PILOT_LICENSES, WORLD, canBuyFrom, canSellTo, buyPrice, sellPrice, shipStats, holdOf, freeFor, pilotLevel } from '../shared/config.js';
import { sumWindow } from '../server/stats.js';
import { isGiver, boardOf } from '../server/quests.js';

const arg = (name, dflt) => {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? Number(process.argv[i + 1]) : dflt;
};
const HOURS = arg('hours', 6);
const BOTS = arg('bots', 3);
const SEED = arg('seed', 42);
const QUIET = process.argv.includes('--quiet');
const DT = 1;

/** Zielwerte (Annahmen aus PRD 5.5): Gewinn pro Stunde nach Flottengröße */
const TARGETS = [
  { phase: 'Start (1 Spatz)', ships: [1, 1], perHour: [1000, 3000] },
  { phase: 'Früh (3-5 Schiffe)', ships: [3, 5], perHour: [20000, 50000] },
  { phase: 'Mitte (10-20 Schiffe)', ships: [10, 20], perHour: [200000, 500000] },
];

const game = new Game(':memory:', { seed: SEED });
const home = game.world.sectors.get('0,0');
const bots = [];
for (let i = 0; i < BOTS; i++) {
  const p = game.createPlayer(`Bot ${i + 1}`);
  // Bots kennen ihren Heimatsektor vollständig (entspricht erfahrenen Spielern)
  game.revealAround(p, home.bh.x, home.bh.y, WORLD.SECTOR_RADIUS + 5000);
  // Das Startschiff wird Hauptschiff und erledigt Quests (Quest-Bot), alle weiteren Schiffe handeln
  const qship = game.shipsOf(p.id)[0];
  runCommand(game, p, { cmd: 'flagship', ship: qship.id });
  bots.push({ p, history: [], lastCredits: p.credits, trades: 0, qship: qship.id, quests: 0, questCr: 0, lastXp: 0 });
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const known = (p, e) => game.isKnown(p, e);

/** Beste Handelsgelegenheit für ein Schiff: Gewinn je Sekunde */
function bestTrade(bot, ship) {
  const p = bot.p;
  const st = shipStats(ship);
  const ents = game.world.sectorEntities(home.key).filter((e) => e.market && known(p, e) && !e.market.owner);
  const sources = {}, sinks = {};
  for (const e of ents) {
    for (const [g, s] of Object.entries(e.market.goods)) {
      if (GOODS[g].ultra && !s.role === 'consume') continue;
      if (canBuyFrom(s) && s.stock >= 5) (sources[g] ||= []).push({ e, price: buyPrice(g, s), stock: Math.floor(s.stock) });
      if (canSellTo(s) && s.cap - s.stock >= 5) (sinks[g] ||= []).push({ e, price: sellPrice(g, s), space: Math.floor(s.cap - s.stock) });
    }
  }
  let best = null;
  for (const g of Object.keys(sources)) {
    if (!sinks[g]) continue;
    const hold = holdOf(g);
    const cap = hold === 'cargo' ? st.cargo : st[hold];
    if (!cap) continue;
    const src = sources[g].sort((a, b) => a.price - b.price).slice(0, 4);
    const snk = sinks[g].sort((a, b) => b.price - a.price).slice(0, 4);
    for (const a of src) {
      for (const b of snk) {
        if (a.e === b.e) continue;
        const margin = b.price - a.price;
        if (margin <= 0.5) continue;
        // grobe Mengenschätzung: Preise bewegen sich mit dem Füllstand, daher nur ein Teil der Kapazität
        const n = Math.min(cap, a.stock, b.space, Math.floor(p.credits / a.price));
        if (n < 3) continue;
        const t = dist(ship, a.e) / st.speed + dist(a.e, b.e) / st.speed + 8;
        const score = (margin * n * 0.7) / t;
        if (!best || score > best.score) best = { g, a: a.e, b: b.e, n, score, margin };
      }
    }
  }
  return best;
}

/** Nächste Werft mit einem Schiff, das die Lizenz erlaubt und bezahlbar ist */
function shipOffer(bot) {
  const lic = PILOT_LICENSES[bot.p.pilot || 1];
  let best = null;
  for (const e of game.world.sectorEntities(home.key)) {
    if (e.market?.strategy !== 'shipyard' || e.market.owner || !known(bot.p, e)) continue;
    e.market.forSale.forEach((it, index) => {
      const d = SHIP_TYPES[it.type];
      if (!lic.classes.includes(d.cls) || it.price * 1.3 > bot.p.credits) return;
      const value = d.cargo * d.speed; // größtes leistbares Schiff
      if (!best || value > best.value) best = { e, index, value, type: it.type, price: it.price, sell: null };
    });
  }
  return best;
}

/** Quest-Bot: das Hauptschiff nimmt die lohnendste machbare Quest im Heimatsektor an und arbeitet sie ab */
function questThink(bot) {
  const p = bot.p;
  const s = game.ships.get(bot.qship);
  if (!s) return;
  const order = (o, append = false) => runCommand(game, p, { cmd: 'order', ships: [s.id], order: o, append });
  if (bot.active && !p.quest) {
    if ((p.questsDone || 0) > bot.quests) { bot.quests = p.questsDone; bot.questCr += bot.active.reward.cr; }
    bot.active = null;
  }
  const q = p.quest;
  if (q) {
    bot.active = q;
    if (s.queue.length) return;
    if (++bot.qSteps > 12) { runCommand(game, p, { cmd: 'questAbort' }); bot.qSteps = 0; return; }
    if (q.type === 'procure' || q.type === 'rush') {
      const have = s.cargo[q.good] || 0;
      if (have >= q.amount) order({ t: 'goto', target: q.giver });
      else if (q.source) order({ t: 'dock', target: q.source, actions: [{ op: 'buy', good: q.good, amount: q.amount - have }] });
      else runCommand(game, p, { cmd: 'questAbort' });
    } else if (q.type === 'courier') order({ t: 'goto', target: q.state === 'pickup' ? q.pickup : q.dest });
    else if (q.type === 'mine') {
      const mined = game.shipsOf(p.id).reduce((a, x) => a + (x.mined?.[q.good] || 0), 0) - q.minedBase;
      if (mined >= q.amount && (s.cargo[q.good] || 0) >= q.amount) order({ t: 'goto', target: q.giver });
      else order({ t: 'mine', target: q.belt });
    } else runCommand(game, p, { cmd: 'questAbort' });
    return;
  }
  bot.qSteps = 0;
  if (s.queue.length || (p.questLock || 0) > game.time) return;
  if (bot.want) {
    const e = game.world.entities.get(bot.want.giver);
    if (s.dockedAt === e.id) runCommand(game, p, { cmd: 'questAccept', ship: s.id, target: e.id, quest: bot.want.id });
    bot.want = null;
    return;
  }
  // Angebot wählen: Belohnung je geschätzter Minute inklusive Anflug
  const st = shipStats(s);
  let best = null;
  for (const e of game.world.sectorEntities(home.key)) {
    if (!isGiver(e) || !known(p, e)) continue;
    for (const o of boardOf(e).offers) {
      if (!['procure', 'rush', 'courier', 'mine'].includes(o.type)) continue;
      if ((o.type === 'procure' || o.type === 'rush') && (!o.source || o.amount > freeFor(s, o.good) + (s.cargo[o.good] || 0))) continue;
      if (o.type === 'mine' && (!(st.mining.std > 0) || o.amount > freeFor(s, o.good))) continue;
      const score = o.reward.cr / (o.effort + dist(s, e) / st.speed / 60 + 1);
      if (!best || score > best.score) best = { e, o, score };
    }
  }
  if (!best) return;
  for (const g of Object.keys(s.cargo)) if (!best.o.good || g !== best.o.good) delete s.cargo[g]; // Ladung, die nicht zur Quest gehört, abwerfen
  order({ t: 'goto', target: best.e.id });
  bot.want = { giver: best.e.id, id: best.o.id };
}

function botThink(bot) {
  const p = bot.p;
  if (bot.buying?.ship !== bot.qship) questThink(bot);
  const ships = game.shipsOf(p.id).filter((s) => s.id !== bot.qship);
  // Lizenz: weitere Klassen freischalten, wenn das Geld reicht
  const next = PILOT_LICENSES[(p.pilot || 1) + 1];
  if (next && p.credits > next.cost * 1.5 && pilotLevel(p.xp) >= next.level && !bot.goingHub && ships.length) {
    const s = ships.find((x) => !x.queue.length) || ships[0];
    runCommand(game, p, { cmd: 'order', ships: [s.id], order: { t: 'goto', target: home.hub }, append: false });
    bot.goingHub = s.id;
  }
  if (bot.goingHub) {
    const s = game.ships.get(bot.goingHub);
    if (s?.dockedAt === home.hub) {
      const err = runCommand(game, p, { cmd: 'buyLicense', kind: 'pilot' });
      if (!err && !QUIET) console.log(`  ${p.name}: Pilotenlizenz ${p.pilot} (t=${(game.time / 3600).toFixed(1)} h)`);
      bot.goingHub = null;
    } else if (!s?.queue.length) bot.goingHub = null;
    return;
  }
  // Neues Schiff kaufen
  if (!bot.buying) {
    const offer = shipOffer(bot);
    if (offer) {
      // ohne Handelsschiffe holt das Hauptschiff zwischen zwei Quests das neue Schiff ab
      const qs = game.ships.get(bot.qship);
      const s = ships.find((x) => !x.queue.length) || ships[0] || (!p.quest && !bot.want && !qs.queue.length ? qs : null);
      const s2 = offer.sell ? game.ships.get(offer.sell) : s;
      if (!s2 || s2.queue.length || Object.keys(s2.cargo).length) return; // erst fertig werden lassen
      runCommand(game, p, { cmd: 'order', ships: [s2.id], order: { t: 'goto', target: offer.e.id }, append: false });
      bot.buying = { ship: s2.id, yard: offer.e.id, sell: offer.sell };
    }
  } else {
    const s = game.ships.get(bot.buying.ship);
    if (s?.dockedAt === bot.buying.yard) {
      const yard = game.world.entities.get(bot.buying.yard);
      if (bot.buying.sell) runCommand(game, p, { cmd: 'sellShip', ship: bot.buying.sell });
      const idx = yard.market.forSale.findIndex((it) => PILOT_LICENSES[p.pilot || 1].classes.includes(SHIP_TYPES[it.type].cls) && it.price <= p.credits);
      if (idx >= 0 && !runCommand(game, p, { cmd: 'buyShip', target: yard.id, index: idx }) && !QUIET) {
        console.log(`  ${p.name}: neues Schiff, jetzt ${game.shipsOf(p.id).length} (t=${(game.time / 3600).toFixed(1)} h)`);
      }
      bot.buying = null;
    } else if (!s?.queue.length) bot.buying = null;
  }
  // Untätige Schiffe handeln lassen
  for (const s of ships) {
    if (s.queue.length || s.id === bot.goingHub || s.id === bot.buying?.ship) continue;
    // Ladung loswerden: an den besten Abnehmer
    const cargo = Object.entries(s.cargo);
    if (cargo.length) {
      const [g] = cargo[0];
      const sink = game.world.sectorEntities(home.key).filter((e) => e.market?.goods[g] && canSellTo(e.market.goods[g]) && !e.market.owner)
        .sort((a, b) => sellPrice(g, b.market.goods[g]) / (1 + dist(s, b) / 30000) - sellPrice(g, a.market.goods[g]) / (1 + dist(s, a) / 30000))[0];
      if (sink) runCommand(game, p, { cmd: 'order', ships: [s.id], order: { t: 'dock', target: sink.id, actions: [{ op: 'sell', good: g, amount: 0 }] } });
      else delete s.cargo[g];
      continue;
    }
    const t = bestTrade(bot, s);
    if (!t) continue;
    runCommand(game, p, { cmd: 'order', ships: [s.id], order: { t: 'dock', target: t.a.id, actions: [{ op: 'buy', good: t.g, amount: t.n }] } });
    runCommand(game, p, { cmd: 'order', ships: [s.id], order: { t: 'dock', target: t.b.id, actions: [{ op: 'sell', good: t.g, amount: 0 }] }, append: true });
    bot.trades++;
  }
}

// ---------- Lauf ----------
const t0 = Date.now();
const steps = Math.round((HOURS * 3600) / DT);
console.log(`Simulation: ${HOURS} h Spielzeit, ${BOTS} Bots, Seed ${SEED}`);
for (let i = 1; i <= steps; i++) {
  game.tick(DT);
  if (i % 10 === 0) for (const b of bots) botThink(b);
  if (i % 3600 === 0) {
    const h = i / 3600;
    for (const b of bots) {
      const ships = game.shipsOf(b.p.id);
      // Handelsgewinn der letzten Stunde: Einnahmen minus Einkauf und Treibstoff aller Schiffe
      const profit = ships.reduce((a, s) => { const w = sumWindow(game.shipStats.get(s.id), game.time, 3600); return a + (w.inc || 0) - (w.buy || 0) - (w.fuel || 0); }, 0);
      const fleet = {};
      for (const s of ships) fleet[SHIP_TYPES[s.type].cls] = (fleet[SHIP_TYPES[s.type].cls] || 0) + 1;
      b.history.push({ h, credits: Math.round(b.p.credits), ships: ships.length, gain: Math.round(profit), pilot: b.p.pilot, fleet: Object.entries(fleet).map(([c, n]) => n + c).join('+'),
        xp: Math.round((b.p.xp || 0) - b.lastXp), level: pilotLevel(b.p.xp), quests: b.quests });
      b.lastXp = b.p.xp || 0;
      b.lastCredits = b.p.credits;
    }
    if (!QUIET) console.log(`Stunde ${h}: ` + bots.map((b) => { const x = b.history.at(-1); return `${b.p.name} ${x.credits.toLocaleString('de-DE')} Cr, ${x.ships} Schiffe`; }).join(' | '));
  }
}

// ---------- Wirtschaftszustand ----------
let stations = 0, stalled = 0, full = 0, npc = 0;
for (const e of game.world.entities.values()) {
  if (e.market?.strategy !== 'factory') continue;
  stations++;
  if (e.market.eff > 0) continue;
  const outFull = Object.entries(e.market.goods).some(([, sl]) => sl.role === 'produce' && sl.stock + 2 > sl.cap);
  if (outFull) full++; else stalled++;
}
let haulers = 0;
for (const s of game.ships.values()) if (s.owner === 'npc') { npc++; if (s.queue[0]?.haul) haulers++; }
// Füllstände der NPC-Märkte im Heimatsektor: Anteil leerer (< 5 %) und voller (> 95 %) Lagerplätze
const fill = { low: 0, high: 0, n: 0, dev: 0 };
for (const e of game.world.sectorEntities(home.key)) {
  if (!e.market || e.market.owner || e.market.strategy === 'shipyard') continue;
  for (const sl of Object.values(e.market.goods)) {
    const r = sl.stock / sl.cap;
    fill.n++;
    if (r < 0.05) fill.low++;
    if (r > 0.95) fill.high++;
    fill.dev += Math.abs(r - (sl.target ?? 0.5));
  }
}
const offers = {};
for (const e of game.world.sectorEntities(home.key)) {
  if (e.market?.strategy !== 'shipyard') continue;
  for (const it of e.market.forSale) offers[it.type] = (offers[it.type] || 0) + 1;
  if (e.market.building) offers[e.market.building.type + ' (im Bau)'] = (offers[e.market.building.type + ' (im Bau)'] || 0) + 1;
}
console.log('Werftangebot im Heimatsektor am Ende:', JSON.stringify(offers));

console.log(`\nLaufzeit ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log(`Fabriken: ${stations}, Lager voll (wartet auf Abnehmer): ${full} (${Math.round((full / stations) * 100)} %), ohne Zutaten: ${stalled} (${Math.round((stalled / stations) * 100)} %), NPC-Schiffe unterwegs: ${npc} (davon Abholer ${haulers})`);
console.log(`Lagerplätze im Heimatsektor: ${fill.n}, leer (< 5 %): ${Math.round((fill.low / fill.n) * 100)} %, voll (> 95 %): ${Math.round((fill.high / fill.n) * 100)} %, mittlere Abweichung vom Ziel: ${Math.round((fill.dev / fill.n) * 100)} Prozentpunkte`);
console.log('\nHandelsgewinn pro Stunde (Einnahmen - Einkauf - Treibstoff), Flotte, Lizenz:');
console.log('Stunde | ' + bots.map((b) => b.p.name.padEnd(38)).join(' | '));
for (let k = 0; k < bots[0].history.length; k++) {
  console.log(String(bots[0].history[k].h).padStart(6) + ' | ' + bots.map((b) => {
    const x = b.history[k];
    return `${x.gain.toLocaleString('de-DE').padStart(9)} Cr/h ${x.fleet.padEnd(7)} P${x.pilot} L${x.level} ${String(x.xp).padStart(3)} XP`.padEnd(38);
  }).join(' | '));
}

// Bewertung gegen die Zielwerte: Gewinn in Stunden mit passender Flottengröße (ohne Investitionen)
console.log('\nAbgleich mit Zielwerten (Annahmen aus PRD 5.5, Bruttogewinn aus Handel):');
for (const T of TARGETS) {
  const samples = [];
  for (const b of bots) {
    for (const x of b.history) if (x.ships >= T.ships[0] && x.ships <= T.ships[1]) samples.push(x);
  }
  if (!samples.length) { console.log(`  ${T.phase}: keine Daten in diesem Lauf`); continue; }
  const avg = Math.round(samples.reduce((a, x) => a + x.gain, 0) / samples.length);
  const ok = avg >= T.perHour[0] && avg <= T.perHour[1] ? 'im Ziel' : avg < T.perHour[0] ? 'unter Ziel' : 'über Ziel';
  console.log(`  ${T.phase}: Ø ${avg.toLocaleString('de-DE')} Cr/h aus ${samples.length} Stunden-Proben, Ziel ${T.perHour[0].toLocaleString('de-DE')}-${T.perHour[1].toLocaleString('de-DE')} Cr/h -> ${ok}`);
}
const tradeIncome = bots.map((b) => game.shipsOf(b.p.id).reduce((a, s) => a + (s.tot.inc || 0) - (s.tot.buy || 0) - (s.tot.fuel || 0), 0));
bots.forEach((b, i) => {
  const hours = game.time / 3600;
  console.log(`  ${b.p.name}: Handelsgewinn gesamt ${Math.round(tradeIncome[i]).toLocaleString('de-DE')} Cr = ${Math.round(tradeIncome[i] / hours).toLocaleString('de-DE')} Cr/h im Schnitt, ${b.trades} Handelsaufträge`);
  console.log(`    Quests (Hauptschiff): ${b.quests} erfüllt, ${Math.round(b.questCr).toLocaleString('de-DE')} Cr = ${Math.round(b.questCr / hours).toLocaleString('de-DE')} Cr/h, ${Math.round((b.p.xp || 0) / hours)} XP/h, Pilotenlevel ${pilotLevel(b.p.xp)}`);
});
game.store.close();
