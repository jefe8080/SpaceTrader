/** Exceptional activity precedes the suspended command queue everywhere. */
export function shipActivity(ship) {
  if (ship.captive) return {key:'captive',symbol:'⛓',text:'In Gefangenschaft'};
  if (ship.battle || ship.state==='battle') return {key:'battle',symbol:'⚔',text:'In einer Schlacht'};
  if (ship.repairRun) return {key:'repair',symbol:'🔧',text:'Reparaturfahrt'};
  if (ship.repairHold) return {key:'repair',symbol:'🔧',text:'Reparatur erforderlich'};
  if (ship.relocationHold) return {key:'hold',symbol:'⏸',text:'Standorttransfer: angehalten'};
  return null;
}
export const isShipIdle = ship => !shipActivity(ship) && !ship.queue?.length && !ship.transit;
