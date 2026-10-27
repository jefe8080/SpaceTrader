/**
 * Verbindet die UI-Module ohne zirkuläre Importe. Die Funktionen werden in ui/index.js gesetzt.
 */
export const bus = {
  select: () => {},       // (sel, { keepSelection }) Auswahl setzen
  focusShip: () => {},    // Schiff in normaler Weltraumansicht verfolgen
  renderAll: () => {},    // Topbar, Flotte, Details neu zeichnen
  openRouteEditor: () => {}, // (routeId | null, { stops, assign })
};
