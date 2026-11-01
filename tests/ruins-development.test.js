import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {ruinsDevelopment, RUINS_STAGES} from '../shared/ruins-development.js';
import {serializeEntity} from '../server/net.js';

const world = n => ({id:'home',kind:'planet',type:'ruins',market:{goods:{},homeworld:{controlLevel:0,
  facilities:{},structures:Array.from({length:n},()=>({kind:'housing',status:'ready'}))}}});

test('six ruins stages use completed construction at every boundary without control gates',()=>{
  assert.equal(RUINS_STAGES.length,6);
  for(const [n,stage] of [[0,0],[3,0],[4,1],[7,1],[8,2],[15,2],[16,3],[23,3],[24,4],[35,4],[36,5],[100,5]]) {
    const e=world(n);assert.equal(ruinsDevelopment(e).stage,stage,`buildings ${n}`);
    assert.deepEqual(ruinsDevelopment(serializeEntity(e)),ruinsDevelopment(e));
  }
});

test('building, repair and upgrade completion change the artwork; disabled power and staffing do not',()=>{
  const e=world(3),home=e.market.homeworld;
  home.structures.push({kind:'housing',status:'building',level:3});
  home.facilities.control={status:'ruined'};home.controlLevel=99;
  assert.equal(ruinsDevelopment(e).points,3);
  home.structures[3].status='ready';assert.equal(ruinsDevelopment(e).stage,1);
  home.structures[3].upgrading={level:3};assert.equal(ruinsDevelopment(e).points,6);
  home.structures[3].level=1;assert.equal(ruinsDevelopment(e).points,4);
  home.facilities.control.status='ready';assert.equal(ruinsDevelopment(e).points,5);
  home.structures.push({kind:'school',status:'ready',upgrades:['academy']});assert.equal(ruinsDevelopment(e).points,7);
  home.structures[0].level=2;assert.equal(ruinsDevelopment(e).stage,2);
  home.structures.forEach(b=>b.enabled=false);home.energy={generation:0};home.workforce={};
  assert.equal(ruinsDevelopment(e).stage,2);
  home.structures.pop();assert.equal(ruinsDevelopment(e).stage,1);
  home.orbital={small:true,large:true};assert.equal(ruinsDevelopment(e).points,6);
});

test('legacy exterior modules are removed and unrelated worlds do not acquire ruins development',()=>{
  for(const path of ['shared/planet-development.js','client/js/planetExterior.js'])assert.equal(existsSync(new URL('../'+path,import.meta.url)),false);
  assert.equal(ruinsDevelopment({...world(40),type:'agrar'}).stage,0);
});
