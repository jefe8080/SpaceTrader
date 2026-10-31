import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHIP_TYPES, factionRank, RANKS } from '../shared/config.js';
import { COMBAT, COMBAT_TYPES, COMBAT_ABILITIES, WEAPONS, SYSTEMS, ARMOR, armorFactor, blueprint, systemCount, navalClass, systemState, ensureDamage, needsRepair, repairQuote, blueprintRank } from '../shared/combat.js';
import { FACTIONS } from '../shared/factions.js';

test('PRD15 U02: jeder Schiffstyp hat Klasse, Kampfdefinition und festen Bauplan', () => {
  for (const t of Object.keys(SHIP_TYPES)) {
    const d = COMBAT_TYPES[t];
    assert.ok(d, `Kampfdefinition fehlt: ${t}`);
    assert.ok(['civil', 'multi', 'war'].includes(d.cls));
    const bp = blueprint(t);
    for (const w of bp.weapons) assert.ok(WEAPONS[w.w], `${t}: Waffe ${w.w}`);
    for (const s of bp.systems) assert.ok(SYSTEMS[s.kind], `${t}: System ${s.kind}`);
    assert.ok(!bp.systems.some((s) => /hangar|carrier/i.test(s.kind)), 'keine Hangars');
  }
  assert.equal(navalClass('spatz'), 'multi');
  assert.equal(navalClass('pelikan'), 'multi');
  for (const t of ['abfangstaffel', 'bomberstaffel', 'korvette', 'fregatte', 'zerstoerer', 'kreuzer']) assert.equal(navalClass(t), 'war');
  for (const t of ['falke', 'keiler']) {
    assert.equal(navalClass(t), 'multi');
    assert.ok(COMBAT_TYPES[t].weapons.length > 0);
  }
  assert.ok(SHIP_TYPES.falke.cargo < SHIP_TYPES.kolibri.cargo, 'Kurier tauscht Fracht gegen Kampfkraft');
  assert.ok(SHIP_TYPES.keiler.cargo < SHIP_TYPES.lastesel.cargo);
});

test('PRD15 U02: Systemzahlen folgen den Richtwerten; Staffeln ohne anwählbare Systeme', () => {
  const range = (t, lo, hi) => { const n = systemCount(t); assert.ok(n >= lo && n <= hi, `${t}: ${n} Systeme`); };
  for (const t of ['abfangstaffel', 'bomberstaffel']) assert.equal(systemCount(t), 0);
  for (const t of ['kolibri', 'maulwurf']) range(t, 2, 3);
  for (const t of ['lastesel', 'korvette', 'pelikan']) range(t, 3, 5);
  for (const t of ['fregatte', 'seekuh', 'titan']) range(t, 5, 8);
  for (const t of ['kreuzer', 'fx_tech', 'fx_order']) range(t, 8, 12);
  // Referenz für zwölf Systeme
  const kinds = blueprint('kreuzer').systems.map((s) => s.kind);
  assert.equal(kinds.filter((k) => k === 'engine').length, 2);
  assert.equal(kinds.filter((k) => k === 'shield').length, 2);
  assert.equal(blueprint('kreuzer').shields.length, 4);
  for (const k of ['thrust', 'sensor', 'bridge', 'jump']) assert.ok(kinds.includes(k));
});

test('PRD15 U02: Panzerung schwächt, ohne vollständige Unwirksamkeit; Systemzustände', () => {
  assert.ok(armorFactor('heavy', WEAPONS.laser.pen) < 0.5, 'schwere Panzerung schwächt leichte Waffen deutlich');
  assert.ok(armorFactor('heavy', WEAPONS.laser.pen) >= 0.25);
  assert.ok(armorFactor('heavy', WEAPONS.heavy.pen) > armorFactor('heavy', WEAPONS.laser.pen));
  assert.equal(systemState(51, 100), 'intact');
  assert.equal(systemState(50, 100), 'damaged');
  assert.equal(systemState(25, 100), 'critical');
  assert.equal(systemState(0, 100), 'destroyed');
  assert.ok(WEAPONS.missile.ammo && WEAPONS.torpedo.ammo && !WEAPONS.laser.ammo, 'nur Lenkwaffen haben Munition');
  assert.ok(!WEAPONS.missile.bypass && WEAPONS.torpedo.bypass > 0, 'nicht alle Lenkwaffen durchdringen Schilde');
  assert.equal(COMBAT.STALEMATE, 120);
  assert.equal(COMBAT.DEBRIS_TTL, 1800);
  assert.equal(COMBAT.RANSOM, 0.25);
});

test('PRD15 U02: Schadensstand, Reparaturbedarf und Reparaturvorschau', () => {
  const s = { type: 'fregatte' };
  ensureDamage(s);
  assert.equal(needsRepair(s), false);
  s.dmg.shieldDown = true;
  assert.equal(needsRepair(s), false, 'Schild allein löst keine Reparatur aus');
  const launcherIdx = blueprint('kreuzer').weapons.findIndex((w) => w.ammo);
  assert.equal(launcherIdx, -1);
  s.dmg.hull -= 100;
  s.dmg.sys.jump1 = 0;
  assert.equal(needsRepair(s), true);
  const q = repairQuote(s, SHIP_TYPES.fregatte.price);
  assert.ok(q.cost > 0 && q.secs > 0);
  const sq = { type: 'abfangstaffel' };
  ensureDamage(sq);
  sq.dmg.craft = 4;
  assert.equal(repairQuote(sq, SHIP_TYPES.abfangstaffel.price).craft, 2, 'Staffelersatz kostet');
});

test('PRD15 U03: 18 Fraktionsmodelle neu gestaltet: Mehrzweck oder Krieg, Fähigkeit mit Nachteil, Bauplan einen Rang später', () => {
  const fac = Object.entries(SHIP_TYPES).filter(([, d]) => d.faction);
  assert.equal(fac.length, 18);
  for (const [id, d] of fac) {
    const c = COMBAT_TYPES[id];
    assert.ok(['multi', 'war'].includes(c.cls), `${d.name}`);
    assert.ok(COMBAT_ABILITIES[c.ability]?.drawback, `${d.name}: Fähigkeit mit Nachteil`);
    assert.equal(blueprintRank(d), d.rank + 1);
    if (c.cls === 'war') assert.ok(d.cargo <= 200, `${d.name}: nur kleiner Laderaum`);
  }
  assert.ok(RANKS.length >= 5 && factionRank(RANKS[4]) === 4, 'Rang 4 für den Bauplan des Spezialschiffs');
  // Profile: Gilde langsam/robust, Tech schwacher Rumpf, Nomaden schnell/leicht, Orden starke Front, Liga Punktverteidigung, Syndikat schwer
  assert.ok(COMBAT_TYPES.f_miners.tac.speed < COMBAT_TYPES.kreuzer.tac.speed);
  assert.ok(COMBAT_TYPES.f_tech.hull < COMBAT_TYPES.fregatte.hull);
  assert.ok(COMBAT_TYPES.f_nomads.tac.speed > COMBAT_TYPES.fregatte.tac.speed && ARMOR[COMBAT_TYPES.f_nomads.armor[1]] === 0);
  assert.ok(ARMOR[COMBAT_TYPES.f_order.armor[0]] > ARMOR[COMBAT_TYPES.f_order.armor[2]]);
  assert.ok(blueprint('fx_league').weapons.filter((w) => w.w === 'pd').length >= 3);
  assert.ok(COMBAT_TYPES.f_syndicate.armor.every((a) => a === 'heavy') && !blueprint('f_syndicate').weapons.some((w) => w.w === 'flak'));
  // Moderat mächtiger als Gegenstück: Erzbrecher vs. Kreuzer im Rumpf ähnlich, nicht überlegen in allem
  assert.ok(COMBAT_TYPES.f_miners.hull < COMBAT_TYPES.kreuzer.hull * 1.2);
  assert.ok(Object.keys(FACTIONS).length === 6);
});

test('PRD15 U02: schnelle Zivilschiffe nur von schnellen Abfangjägern einholbar', () => {
  const fastCivil = ['kolibri', 'bussard'].map((t) => SHIP_TYPES[t].speed);
  for (const v of fastCivil) {
    assert.ok(v > SHIP_TYPES.korvette.speed || v > SHIP_TYPES.fregatte.speed);
    assert.ok(v < SHIP_TYPES.abfangstaffel.speed);
  }
  assert.ok(SHIP_TYPES.kolibri.speed > SHIP_TYPES.korvette.speed);
});
