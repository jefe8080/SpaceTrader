export const LOCAL_SALES_WINDOW = 3 * 3600;

/** Actual paid transactions only; timestamps give an exact rolling window. */
export function recordLocalSale(market, now, good, amount, credits) {
  if (!(amount > 0 && credits > 0)) return;
  market.localSales = (market.localSales || []).filter(s => s.time > now - LOCAL_SALES_WINDOW);
  market.localSales.push({time:now, good, amount, credits});
}

export function localSalesSummary(market, now) {
  const quantities = {}, revenue = {};
  let total = 0;
  for (const s of market.localSales || []) {
    if (s.time <= now - LOCAL_SALES_WINDOW || s.time > now) continue;
    quantities[s.good] = (quantities[s.good] || 0) + s.amount;
    revenue[s.good] = (revenue[s.good] || 0) + s.credits;
    total += s.credits;
  }
  return {quantities, revenue, total, from:now-LOCAL_SALES_WINDOW, until:now};
}
