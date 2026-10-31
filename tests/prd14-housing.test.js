import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Game} from '../server/game.js';
import {runCommand} from '../server/handlers/index.js';
import {homeStructureSpec} from '../shared/homeworld.js';
import {tickHomeworld} from '../server/homeworld.js';
import {tickSpecialization} from '../server/specializations.js';
import {newProperty} from '../server/property.js';
test('PRD14: both housing paths charge once, finish 200/400/800 capacity and persist pending upgrades',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prd14-housing-')),file=path.join(dir,'world.db');let game=new Game(file,{profile:'homeworld',seed:42});
 try{
  let p=game.createPlayer('Wohnen'),e=game.world.entities.get(p.homeworld),h=e.market.homeworld,ship=game.shipsOf(p.id)[0];ship.dockedAt=e.id;p.credits=1e7;
  h.facilities.dock.status='ready';h.structures=[{id:'house',kind:'housing',status:'ready',plot:0}];h.workers.basic=48;
  for(const g of ['ingots','plates','electronics'])e.market.goods[g].stock=100;
  const command=()=>runCommand(game,p,{cmd:'housingUpgrade',target:e.id,id:'house'});
  assert.equal(homeStructureSpec(h.structures[0]).housing,200);assert.equal(command(),undefined);const paid=p.credits;
  assert.match(command(),/bereits/);assert.equal(p.credits,paid);assert.equal(homeStructureSpec(h.structures[0]).housing,200);
  const pid=p.id,eid=e.id;game.close();game=new Game(file,{profile:'homeworld'});p=game.players.get(pid);e=game.world.entities.get(eid);h=e.market.homeworld;
  assert.equal(p.credits,paid);game.time=120;tickHomeworld(game,e,120);assert.equal(h.structures[0].level,2);assert.equal(h.housing,600);
  assert.equal(command(),undefined);game.time=360;tickHomeworld(game,e,240);assert.equal(h.structures[0].level,3);assert.equal(h.housing,1000);assert.equal(homeStructureSpec(h.structures[0]).power,4);assert.match(command(),/stufe 3/i);
  const normal=[...game.world.entities.values()].find(x=>x.kind==='planet'&&x.type!=='ruins');game.ownership.set(normal.id,newProperty(normal.id,p.id,0));game.shipsOf(p.id)[0].dockedAt=normal.id;
  game.revealAround(p,normal.x,normal.y,1000);
  const nh=normal.market.economy;nh.infrastructure=[{id:'normal-house',kind:'housing'}];nh.workers={basic:100,skilled:0,specialist:0};nh.population=200;nh.projects=[];
  for(const g of ['ingots','plates','electronics'])normal.market.goods[g]={role:'trade',stock:100,cap:200,rate:0};
  const cmd=()=>runCommand(game,p,{cmd:'housingUpgrade',target:normal.id,id:'normal-house'});
  assert.equal(cmd(),undefined);assert.match(cmd(),/bereits/);game.time+=120;tickSpecialization(game,normal,1);assert.equal(nh.infrastructure[0].level,2);
  const before=nh.housing;assert.equal(cmd(),undefined);game.time+=240;tickSpecialization(game,normal,1);assert.equal(nh.housing,before+400);assert.equal(nh.infrastructure[0].level,3);
  assert.match(cmd(),/stufe 3/i);game.ownership.delete(normal.id);assert.match(cmd(),/Besitzer/);
 }finally{if(game.store.db.open)game.store.close();fs.rmSync(dir,{recursive:true,force:true});}
});
