import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Game} from '../server/game.js';
import {runCommand} from '../server/handlers/index.js';
import {dispatchRealSupply,ensureCash} from '../server/real-economy.js';
import {NPC_OWNER} from '../shared/config.js';

test('Rathaus-Handelsmodus steuert NPC-Abholung, schützt Reserven und bleibt gespeichert',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'townhall-trade-')),file=path.join(dir,'world.db');
  let game=new Game(file,{seed:42,profile:'homeworld'});
  try{
    const owner=game.createPlayer('Besitzer'),other=game.createPlayer('Besucher');
    const home=game.world.entities.get(owner.homeworld),ship=game.shipsOf(owner.id)[0];
    ship.dockedAt=home.id;ship.x=home.x;ship.y=home.y;
    const visitor=game.shipsOf(other.id)[0];visitor.dockedAt=home.id;visitor.x=home.x;visitor.y=home.y;
    game.revealAround(other,home.x,home.y,1000);
    const target={id:'townhall-buyer',kind:'station',type:'consumer',x:home.x+100,y:home.y,sector:home.sector,
      market:{strategy:'consumer',goods:{ingots:{role:'consume',stock:0,cap:100,rate:.1,mod:1}}}};
    game.world.addEntity(target);ensureCash(target).cash=10000;
    home.market.goods.ingots.stock=30;home.market.homeworld.reserves={ingots:25};
    const dispatched=()=>[...game.ships.values()].filter(s=>s.owner===NPC_OWNER&&s.queue[0]?.stationId===target.id);
    dispatchRealSupply(game,target);assert.equal(dispatched().length,0);
    assert.ok(runCommand(game,other,{cmd:'propMode',target:home.id,mode:'open'}));
    assert.equal(home.market.mode,'private');
    assert.equal(runCommand(game,owner,{cmd:'propMode',target:home.id,mode:'open'}),undefined);
    assert.equal(home.market.mode,'open');
    target.market.supCd={};dispatchRealSupply(game,target);
    assert.equal(dispatched().length,1);assert.equal(dispatched()[0].queue[0].amount,5);
    const id=home.id;game.close();game=new Game(file,{profile:'homeworld'});
    assert.equal(game.world.entities.get(id).market.mode,'open');
    const loadedOwner=game.players.get(owner.id);
    assert.equal(runCommand(game,loadedOwner,{cmd:'propMode',target:id,mode:'private'}),undefined);
    assert.equal(game.world.entities.get(id).market.mode,'private');
  }finally{game.store.close();fs.rmSync(dir,{recursive:true,force:true});}
});
