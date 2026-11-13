import {test} from 'node:test';
import assert from 'node:assert/strict';
import {shipActivity,isShipIdle} from '../shared/ship-activity.js';
import {warehouseTransfer} from '../shared/warehouse-transfer.js';
test('Combat and exceptional activity cannot be idle even with an empty suspended queue',()=>{
  for(const extra of [{battle:'b1'},{state:'battle'},{captive:{owner:'x'}},{repairRun:{}},{repairHold:true},{relocationHold:{}}])assert.equal(isShipIdle({queue:[],...extra}),false);
  assert.equal(shipActivity({battle:'b',captive:{}}).key,'captive');
  assert.equal(shipActivity({battle:'b',repairRun:{}}).key,'battle');
  assert.equal(isShipIdle({queue:[],dockedAt:'home'}),true);
  assert.equal(isShipIdle({queue:[],transit:{}}),false);
});
test('Warehouse maximum respects protected and bound stock, shared storage and actual holds',()=>{
 const m={goods:{ore:{stock:40,cap:200},ice:{stock:15,cap:200}},homeworld:{storage:60,hazardStorage:0,reserves:{ore:5},reservations:{'production:o':{goods:{ore:10}}}}};
 const s={type:'spatz',cargo:{},modules:[],queue:[]};
 assert.equal(warehouseTransfer(m,s,'ore','buy').amount,25);
 s.cargo.ice=30;assert.equal(warehouseTransfer(m,s,'ore','buy').amount,0);
 assert.match(warehouseTransfer(m,s,'ore','buy').reason,/Frachtraum/);
 assert.equal(warehouseTransfer(m,s,'ice','sell').amount,5);
 m.homeworld.reserves.ore=40;s.cargo={};assert.equal(warehouseTransfer(m,s,'ore','buy').amount,0);
 assert.match(warehouseTransfer(m,s,'ore','buy').reason,/unreservierter/);
});
