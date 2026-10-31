// PRD 15 Kapitel 5.5: verbindlicher Schadensablauf als reine Funktionen (Server und Tests).
import { WEAPONS, COMBAT, armorFactor, systemState, STATE_EFFECT, blueprint } from './combat.js';

const TAU = Math.PI * 2;
/** Winkel auf -PI..PI normieren */
export const wrap = (a) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;

/** Rumpfzone bzw. Schildsektor aus der Einschlagsrichtung im Schiffsrahmen (0 = Bug, +PI/2 = Steuerbord) */
export function zoneOf(rel) {
  const r = wrap(rel);
  if (Math.abs(r) <= Math.PI / 4) return 'bow';
  if (Math.abs(r) >= (3 * Math.PI) / 4) return 'stern';
  return r > 0 ? 'starboard' : 'port';
}
const ZONE_IDX = { bow: 0, stern: 1, port: 2, starboard: 3 };

/** Wirkungsfaktor eines Systems (Zustand, Störung) */
export function systemEffect(unit, ship, sysId, now) {
  if (!sysId) return 1;
  const bp = blueprint(ship.type);
  const def = bp.systems.find((s) => s.id === sysId);
  if (!def) return 1;
  if ((unit?.jam?.[sysId] || 0) > now) return 0;
  return STATE_EFFECT[systemState(ship.dmg.sys[sysId] ?? def.hp, def.hp)];
}

/** Summierter Anteil einer Systemart (z. B. Antriebe mit share), 1 wenn der Bauplan keine solche Anlage kennt */
export function kindFactor(unit, ship, kind, now, missing = 1) {
  const list = blueprint(ship.type).systems.filter((s) => s.kind === kind);
  if (!list.length) return missing;
  const total = list.reduce((a, s) => a + (s.share || 1), 0);
  return list.reduce((a, s) => a + (s.share || 1) * systemEffect(unit, ship, s.id, now), 0) / total;
}

/** Ist ein Schildsektor aktiv? Generator zerstört oder gestört -> zugeordnete Sektoren brechen sofort zusammen */
export function shieldActive(unit, ship, idx, now) {
  const sh = blueprint(ship.type).shields[idx];
  if (!sh) return false;
  if (sh.gen && systemEffect(unit, ship, sh.gen, now) === 0) return false;
  return (unit.shields[idx] || 0) > 0;
}

/** Sektorindex für eine relative Einschlagsrichtung */
export function shieldIndex(ship, rel) {
  const sh = blueprint(ship.type).shields;
  if (!sh.length) return -1;
  if (sh[0].k === 'omni') return 0;
  return sh.findIndex((s) => s.k === zoneOf(rel));
}

/** Systemlage zur Angriffsrichtung: freiliegend, wenn die Außenseite des Systems dem Angreifer zugewandt ist */
export function systemExposed(ship, sysId, rel, guided = false) {
  const s = blueprint(ship.type).systems.find((x) => x.id === sysId);
  if (!s) return false;
  return Math.abs(wrap(rel - s.face)) <= (guided ? (3 * Math.PI) / 4 : Math.PI / 2);
}

/** Größenfaktor für die Treffwahrscheinlichkeit */
const SIZE = { craft: 0.4, S: 0.7, M: 1, L: 1.4, XL: 1.8 };

/**
 * Schritt 2: Trefferwahrscheinlichkeit aus Genauigkeit/Zielverfolgung, Zielgröße, Bewegung und Störung.
 * fc = Wirkungsfaktor Feuerleitung/Sensor des Schützen, jam = Störung der Batterie.
 */
export function hitChance(weapon, target, { targetSpeed = 0, fc = 1 } = {}) {
  const w = WEAPONS[weapon];
  const tier = blueprint(target.type).tier;
  const size = SIZE[tier] || 1;
  const track = Math.min(1, w.tracking * size);
  const move = Math.min(1, targetSpeed / 250) * (1 - Math.min(1, w.tracking));
  let p = 0.95 * (0.35 + 0.65 * track) * (1 - 0.4 * move) * (0.6 + 0.4 * fc);
  if (tier === 'craft') p *= w.vsCraft ?? 1;
  return Math.max(0.03, Math.min(0.97, p));
}

/**
 * Schritte 4 bis 8 für einen Treffer. Verändert unit (Schilde, Störung, Brände) und ship.dmg (Rumpf, Systeme, Fluggeräte).
 * hit = { weapon, dmg, rel (Einschlagsrichtung im Zielrahmen), sys (Zielsystem oder null), mult (Fähigkeiten), now, rnd }
 * Rückgabe: { shield, hull, system, sysDestroyed: [], killed, craftLost, jammed: [] }
 */
export function applyHit(unit, ship, hit) {
  const w = WEAPONS[hit.weapon];
  const bp = blueprint(ship.type);
  const d = ship.dmg;
  const out = { shield: 0, hull: 0, system: 0, sysDestroyed: [], killed: false, craftLost: 0, jammed: [] };
  if (unit.state === 'surrendered' || unit.state === 'destroyed' || unit.protected) return out;
  const now = hit.now ?? 0;
  let amount = hit.dmg * (hit.mult || 1);
  // 4./5. Schildsektor aus tatsächlichem Anflug; abgeschirmter und umgehender Anteil getrennt
  const si = shieldIndex(ship, hit.rel);
  let through = amount;
  let shielded = 0;
  if (si >= 0 && shieldActive(unit, ship, si, now)) {
    const bypass = w.bypass || 0;
    shielded = amount * (1 - bypass);
    const mul = w.shieldMul || 1;
    const absorbed = Math.min(unit.shields[si], shielded * mul);
    unit.shields[si] -= absorbed;
    unit.shieldDelay ||= [];
    unit.shieldDelay[si] = now + (bp.shield?.delay || 6);
    out.shield = absorbed;
    // Schildüberschuss in derselben Schadensart weiterreichen
    const overflow = shielded - absorbed / mul;
    through = overflow + amount * bypass;
    shielded = shielded - overflow;
  }
  // Ionenbelastung nur aus dem nicht abgeschirmten Anteil
  if (w.ionLoad && through > 0 && !bp.squad) {
    const share = through / amount;
    const targets = hit.sys ? [hit.sys] : bp.systems.filter((s) => systemExposed(ship, s.id, hit.rel)).map((s) => s.id).slice(0, 2);
    unit.ion ||= {}; unit.jam ||= {};
    for (const sid of targets) {
      if ((d.sys[sid] ?? 0) <= 0) continue;
      unit.ion[sid] = (unit.ion[sid] || 0) + w.ionLoad * share;
      if (unit.ion[sid] >= 100) {
        unit.ion[sid] = 0;
        const cur = unit.jam[sid] || 0;
        const start = unit.jamStart?.[sid] ?? now;
        unit.jamStart ||= {};
        if (cur <= now) unit.jamStart[sid] = now;
        // Verlängerung bis zur festen Höchstdauer
        unit.jam[sid] = Math.min((cur > now ? start : now) + COMBAT.ION.MAX, Math.max(cur, now) + COMBAT.ION.DURATION);
        out.jammed.push(sid);
      }
    }
  }
  if (through <= 0) return out;
  const hullMul = w.hullMul ?? 1;
  const zone = zoneOf(hit.rel);
  const zoneArmor = (bp.armor || [])[ZONE_IDX[zone]] || 'none';
  // Staffeln: Treffer auf ein einzelnes Fluggerät, keine Systeme
  if (bp.squad) {
    unit.craftHp ||= Array.from({ length: d.craft }, () => bp.squad.hull);
    let dmg = through * hullMul * armorFactor(zoneArmor, w.pen);
    const victims = w.aoe ? Math.min(unit.craftHp.length, 1 + Math.floor((hit.aoeCraft || 0))) : 1;
    for (let k = 0; k < victims && unit.craftHp.length; k++) {
      const i = Math.floor((hit.rnd ?? Math.random()) * unit.craftHp.length) % unit.craftHp.length;
      const take = Math.min(unit.craftHp[i], dmg);
      unit.craftHp[i] -= take;
      out.hull += take;
      if (unit.craftHp[i] <= 0.01) { unit.craftHp.splice(i, 1); out.craftLost++; }
      if (!w.aoe) break;
    }
    d.craft = unit.craftHp.length;
    d.hull = unit.craftHp.reduce((a, b) => a + b, 0);
    if (!d.craft) { out.killed = true; d.hull = 0; }
    return out;
  }
  // 6./7. System- und Rumpfanteil aus demselben verfügbaren Schaden; Summe nie größer
  const sysDef = hit.sys ? bp.systems.find((s) => s.id === hit.sys) : null;
  const sysAlive = sysDef && (d.sys[sysDef.id] ?? sysDef.hp) > 0;
  let hullDmg;
  if (sysAlive) {
    const struct = Math.max(0, Math.min(1, (w.struct ?? 0.3) * (hit.structMul ?? 1)));
    const sysRaw = through * (1 - struct), hullRaw = through * struct;
    const sysDmg = sysRaw * hullMul * armorFactor(sysDef.armor, w.pen);
    hullDmg = hullRaw * hullMul * armorFactor(zoneArmor, w.pen);
    const before = d.sys[sysDef.id] ?? sysDef.hp;
    const after = before - sysDmg;
    d.sys[sysDef.id] = Math.max(0, after);
    out.system = Math.min(before, sysDmg);
    if (after <= 0) {
      out.sysDestroyed.push(sysDef.id);
      // Überschüssiger Systemschaden geht auf den Rumpf über
      hullDmg += -after;
    }
  } else {
    // Direkte Rumpftreffer bzw. bereits zerstörtes Zielsystem: Rumpftreffer an der Position, keine Zufallssysteme
    hullDmg = through * hullMul * armorFactor(zoneArmor, w.pen);
  }
  d.hull = Math.max(0, d.hull - hullDmg);
  out.hull = hullDmg;
  // Begrenzte Brände
  if (w.fire && (hit.rnd ?? Math.random()) < COMBAT.FIRE.CHANCE && d.hull > 0) {
    unit.fires ||= [];
    if (unit.fires.length < 2) unit.fires.push({ until: now + COMBAT.FIRE.SECS });
  }
  if (d.hull <= 0) out.killed = true;
  return out;
}

/**
 * Flächenwirkung: Radius und Entfernungsabfall. Jedes betroffene System höchstens einmal, gemeinsamer Rumpf je Schiff nur einmal.
 * targets = [{ unit, ship, dist, rel, systems: [{ id, dist }] }]
 */
export function applyArea(weapon, dmg, targets, now, mult = 1) {
  const w = WEAPONS[weapon];
  const res = [];
  for (const t of targets) {
    if (t.dist > w.aoe.r) continue;
    const f = 1 - w.aoe.falloff * (t.dist / w.aoe.r);
    const size = blueprint(t.ship.type).tier;
    const vsLarge = (size === 'L' || size === 'XL') && w.vsLarge ? w.vsLarge : 1;
    // Rumpf einmal je Schiff
    const r = applyHit(t.unit, t.ship, { weapon, dmg: dmg * f * vsLarge, rel: t.rel, sys: null, mult, now, aoeCraft: 2 });
    // Benachbarte Hardpoints innerhalb des Radius: je System einmal (nur Systemanteil, kein zweiter Rumpftreffer)
    for (const s of t.systems || []) {
      if (s.dist > w.aoe.r || (t.ship.dmg.sys[s.id] ?? 0) <= 0 || t.unit.state === 'destroyed') continue;
      const def = blueprint(t.ship.type).systems.find((x) => x.id === s.id);
      const sysDmg = dmg * (1 - w.aoe.falloff * (s.dist / w.aoe.r)) * (1 - (w.struct ?? 0.3)) * armorFactor(def.armor, w.pen) * 0.5;
      const before = t.ship.dmg.sys[s.id];
      t.ship.dmg.sys[s.id] = Math.max(0, before - sysDmg);
      if (t.ship.dmg.sys[s.id] <= 0) r.sysDestroyed.push(s.id);
      r.system += Math.min(before, sysDmg);
    }
    res.push({ ship: t.ship.id, ...r });
  }
  return res;
}
