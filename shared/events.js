// Sondernachfrage je Sektor (PRD-3 Kapitel 5). Alle Zahlen sind Kalibrierungsannahmen.
import { GOODS } from './goods.js';
import { PRICE, curveMax } from './price.js';

export const DEMAND = {
  TIMER: [1200, 3600],  // Zufallstimer 20 bis 60 min, läuft nur in aktiven Sektoren
  DURATION: 1800,       // Laufzeit 30 min
  PRICE_FACTOR: 2,      // 2 × Ankaufspreis bei leerem Lager
  PER_LEVEL: 100,       // Menge höchstens 100 × L ...
  VALUE_PER_LEVEL: 2000, // ... und höchstens 2.000 × L Cr zum Basispreis
  MIN: 5,
};

/** Festpreis: 2 × Ankaufspreis der Ware bei leerem Lager inkl. Standort-Modifier */
export const demandPrice = (good, mod = 1) => DEMAND.PRICE_FACTOR * GOODS[good].base * mod * curveMax(GOODS[good].tier) * (1 - PRICE.SPREAD);
/** Menge: min(100 × L, ceil(2.000 × L / Basispreis)), mindestens 5. L = niedrigstes Pilotenlevel im Sektor */
export const demandAmount = (good, L) => Math.max(DEMAND.MIN, Math.min(DEMAND.PER_LEVEL * L, Math.ceil((DEMAND.VALUE_PER_LEVEL * L) / GOODS[good].base)));
