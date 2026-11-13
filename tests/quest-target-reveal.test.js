import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../server/game.js';
import {revealQuestTarget} from '../server/quest-activation.js';

test('new quest target is transmitted even inside an already revealed cell',()=>{
  const game=new Game(':memory:',{seed:42});
  try{
    const player=game.createPlayer('Zieltest');
    const home=game.world.entities.get(player.homeworld);
    game.revealAround(player,home.x,home.y,0);
    const target={id:'new-quest-target',kind:'station',type:'wreck',x:home.x,y:home.y,sector:home.sector,system:home.system};
    game.world.addEntity(target);
    const sent=[];
    game.on('reveal',(recipient,payload)=>{if(recipient.id===player.id)sent.push(...payload.entities||[]);});
    revealQuestTarget(game,player,target);
    assert.ok(sent.some(e=>e.id===target.id));
    assert.equal(game.isKnown(player,target),true);
  }finally{game.close();}
});
