import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SHIP_TYPES} from '../shared/ships.js';
import {blueprint,WEAPONS} from '../shared/combat.js';
import {shipComparison,compareShipTypes,SHIP_CATEGORIES} from '../shared/ship-comparison.js';
test('Every buildable hull has one category, technical tier and bounded fleet ratings',()=>{
 const types=Object.entries(SHIP_TYPES).filter(([,d])=>!d.npc),seen=[];
 for(const category of Object.keys(SHIP_CATEGORIES))for(const [id] of types.filter(([id])=>shipComparison(id).category===category).sort(compareShipTypes)){
  seen.push(id);const c=shipComparison(id);assert.equal(c.tier,blueprint(id).tier);for(const r of Object.values(c.ratings))assert.ok(Number.isInteger(r)&&r>=1&&r<=5);
 }
 assert.equal(new Set(seen).size,types.length);
 assert.equal(shipComparison('lastesel').attack,0);
 assert.ok(shipComparison('leviathan').ratings.cargo>shipComparison('falke').ratings.cargo);
 assert.ok(shipComparison('kreuzer').ratings.defense>shipComparison('falke').ratings.defense);
 assert.equal(shipComparison('bomberstaffel').attack,4*WEAPONS.bomb.dmg*WEAPONS.bomb.rof);
 assert.ok(shipComparison('fx_order').attack>3*WEAPONS.beam.dmg*WEAPONS.beam.rof*WEAPONS.beam.ramp);
});
