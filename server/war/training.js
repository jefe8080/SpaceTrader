import {Game} from '../game.js';
import {startBattle,tickBattle} from './battle.js';
import {battleView} from './view.js';
import {runCommand} from '../handlers/index.js';
/** Separate in-memory game: normal players, ships and accounts are never referenced. */
export function createTraining(){
 const game=new Game(':memory:',{seed:26}),player=game.createPlayer('Übungskapitän'),enemy=game.createPlayer('Übungsgegner'),yard=game.world.entities.get('origin_yard');
 const mk=(p,type,dx)=>{const s=game.spawnShip(p,type,yard);Object.assign(s,{dockedAt:null,queue:[],x:yard.x+dx,y:yard.y+2000});return s;};
 const battle=startBattle(game,[mk(player,'zerstoerer',0)],[mk(enemy,'fregatte',400),mk(enemy,'fregatte',400),mk(enemy,'fregatte',400)]);
 return {game,player,battle};
}
export function trainingCommand(t,msg){if(!['battleOrder','battleTactic'].includes(msg?.cmd))return 'Nur taktische Übungsbefehle.';return runCommand(t.game,t.player,msg);}
export function trainingView(t,dt=0){if(dt)tickBattle(t.game,t.battle,dt);const v=battleView(t.game,t.battle,t.player,t.fxSince??-1);if(v.fx.length)t.fxSince=v.fx.at(-1).t;return {...v,training:true,ended:!!t.battle.ended};}
export function closeTraining(t){t?.game.store.close();}
