import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../server/game.js';
import {makeOffer,questOfferError,questProgress,acceptQuest,boardOf} from '../server/quests.js';
import {newProperty} from '../server/property.js';
test('PRD14: side quest types have real targets and reject unavailable conditions',()=>{
 const game=new Game(':memory:',{seed:5});
 try{
  const p=game.createPlayer('Aufträge'),ship=game.shipsOf(p.id)[0],planet=game.world.entities.get('origin_urban'),yard=game.world.entities.get('origin_yard');ship.type='maulwurf';ship.modules=['cabin'];
  for(const type of ['procure','courier','tour','explore','mine','rush']){
    const giver=['mine','rush'].includes(type)?yard:planet;let q;
    for(let i=0;i<100&&!q;i++)q=makeOffer(game,giver,type);
    assert(q,type);assert.equal(q.type,type);assert(q.reward.cr>0);assert.equal(questOfferError(game,p,ship,q),null,type);
    if(q.source){const source=game.world.entities.get(q.source),prop=newProperty(source.id,p.id,0);game.ownership.set(source.id,prop);assert.equal(questOfferError(game,p,ship,q),null);prop.mode='private';prop.player='another';assert.match(questOfferError(game,p,ship,q),/privat/);game.ownership.delete(source.id);}
    if(q.dest){const old=q.dest;q.dest='missing';assert.match(questOfferError(game,p,ship,q),/existiert/);q.dest=old;}
    if(q.belt){const old=q.belt;q.belt=planet.id;assert.match(questOfferError(game,p,ship,q),/Abbauziel/);q.belt=old;const oldType=ship.type;ship.type='kolibri';assert.match(questOfferError(game,p,ship,q),/Abbaugeräte/);ship.type=oldType;}
    if(q.zone){p.zoneVisits=[q.zone];assert.match(questOfferError(game,p,ship,q),/bereits besucht/);p.zoneVisits=[];}
    if(q.sector){const old=q.sector;q.sector='missing';assert.match(questOfferError(game,p,ship,q),/existiert/);q.sector=old;}
  }
 }finally{game.store.close();}
});
test('PRD14: own destination accepts dedicated handover without a goods slot and only pays once',()=>{
 const game=new Game(':memory:',{profile:'homeworld',seed:42});
 try{
  const p=game.createPlayer('Eigenauftrag'),e=game.world.entities.get(p.homeworld),s=game.shipsOf(p.id)[0];s.dockedAt=e.id;e.market.homeworld.facilities.dock.status='ready';
  s.cargo={ore:10};delete e.market.goods.ore;
  const q={id:'own-delivery',type:'procure',good:'ore',amount:10,giver:e.id,giverName:e.name,source:null,reward:{cr:100,xp:0}};boardOf(e).offers=[q];
  assert.equal(acceptQuest(game,p,s,e,q.id),undefined);assert(p.quest);const credits=p.credits;
  assert.equal(questProgress(game,p,s),true);assert.equal(e.market.goods.ore,undefined);assert.equal(s.cargo.ore,undefined);assert.equal(p.credits,credits+100);
  assert.equal(questProgress(game,p,s),false);assert.equal(p.credits,credits+100);
 }finally{game.store.close();}
});
