import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Game } from '../server/game.js';
import { startBattle, endBattle, joinBattle } from '../server/war/battle.js';
import '../server/war/outcome.js';
import { storeCombatReport, combatStats } from '../server/war/history.js';
import { pilotProfile } from '../server/pilot-profile.js';
import { combatHistoryPage } from '../shared/combat-history.js';

test('history: search across participants, ships, places and legacy reports; pagination clamps',()=>{
  const reports=Array.from({length:60},(_,i)=>({battle:'b'+i,result:i%2?'win':'loss',enemies:['Gegner'],
    location:{planet:{name:'Erde'}},ships:[{name:'Falke',ownerName:'Pilot',factionName:'Technokraten'}]}));
  assert.equal(combatHistoryPage(reports).reports.length,25);
  assert.equal(combatHistoryPage(reports,'Erde','win').total,30);
  assert.equal(combatHistoryPage(reports,'technokraten','',2).reports.length,10);
  assert.equal(combatHistoryPage(reports,'FALKE','',9).page,2);
  assert.equal(combatHistoryPage(reports,'unbekannt').total,0);
  assert.equal(combatHistoryPage([{lost:['Altname']}],'altname').total,1);
});

test('history: immutable identities, personal outcomes, allies and database roundtrip', () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'combat-history-')), file=path.join(dir,'game.db');
  let game=new Game(file,{seed:3});
  try {
    const p=game.createPlayer('Angreifer'), q=game.createPlayer('Verteidiger'), ally=game.createPlayer('Hilfe');
    const yard=game.world.entities.get('origin_yard');
    const a=game.spawnShip(p,'korvette',yard), d=game.spawnShip(q,'korvette',yard), c=game.spawnShip(ally,'korvette',yard);
    for(const s of [a,d,c]){s.dockedAt=null;s.queue=[];}
    const b=startBattle(game,[a],[d]);joinBattle(game,b,[c],'A');
    const old=d.name;d.name='Umbenannt';b.units[d.id].state='destroyed';
    b.units[c.id].state='retreated';game.time+=10;
    endBattle(game,b,'A');
    const report=p.war.reports[0];
    assert.equal(report.ships.find(s=>s.id===d.id).name,old);
    assert.equal(report.ships.find(s=>s.id===d.id).outcome,'destroyed');
    assert.equal(report.location.x,Math.round(b.x));assert.equal(report.duration,10);
    assert.equal(p.war.combatStats.enemyDestroyed,1);assert.equal(q.war.combatStats.destroyed,1);
    assert.equal(ally.war.combatStats.retreated,1);assert.equal(pilotProfile(game,p).battlesWon,1);
    const id=p.id;game.close();game=new Game(file,{});
    assert.equal(game.players.get(id).war.reports[0].ships.length,3);
    assert.equal(game.players.get(id).war.combatStats.win,1);
  } finally {if(game.store.db.open)game.store.close();fs.rmSync(dir,{recursive:true,force:true});}
});

test('history: 500 limit, legacy exclusion, duplicate protection and independent totals',()=>{
  const p={id:'p',war:{reports:[{battle:'legacy',result:'win'}]}};
  assert.equal(combatStats(p).total,0);
  for(let i=0;i<503;i++)storeCombatReport(p,{version:1,battle:'b'+i,result:['win','loss','draw'][i%3],side:'A',ships:[
    {owner:'p',side:'A',outcome:'captured'}, {owner:'p',side:'A',outcome:'captive'},
    {owner:'enemy',side:'B',outcome:'destroyed'}, {owner:'ally',side:'A',outcome:'destroyed'}
  ],captured:[],prisoners:[],loot:{ore:2}});
  assert.equal(p.war.reports.length,500);assert.equal(p.war.reports[0].battle,'b502');
  assert.equal(p.war.combatStats.total,503);assert.equal(p.war.combatStats.lost,503);
  assert.equal(p.war.combatStats.captive,503);assert.equal(p.war.combatStats.enemyDestroyed,503);
  assert.equal(p.war.combatStats.loot.ore,1006);
  storeCombatReport(p,p.war.reports[0]);assert.equal(p.war.combatStats.total,503);
});
