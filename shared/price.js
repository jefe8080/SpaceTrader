// Füllstandskurve: leeres Lager = MAX_FACTOR × Basis, volles Lager = MIN_FACTOR × Basis, Spread je Richtung.
// Kalibrierung (Phase 7): Je höher die Stufe, desto enger die Spanne, sonst wachsen Vermögen mit
// teuren Waren exponentiell. Stufe 0: 1,8 / 0,45, Stufe 5: 1,3 / 0,7.
export const PRICE = { MAX_FACTOR: 1.8, MIN_FACTOR: 0.45, SPREAD: 0.06, TIER_MAX_STEP: 0.1, TIER_MIN_STEP: 0.05 };

export const curveMax = (tier) => PRICE.MAX_FACTOR - PRICE.TIER_MAX_STEP * tier;
export const curveMin = (tier) => PRICE.MIN_FACTOR + PRICE.TIER_MIN_STEP * tier;
