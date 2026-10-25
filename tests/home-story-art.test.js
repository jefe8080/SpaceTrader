import {acknowledgeStories} from './home-story-helper.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {HOME_STORY,storyAvailable,storyDialogReady} from '../shared/home-story.js';
import {buildingDevelopment,developBuilding,paintPlanet} from '../client/js/planetArt.js';
import {Game} from '../server/game.js';
import {runCommand} from '../server/handlers/index.js';

test('Erstkontakt wartet auf den Schiffsklick nach der Erklärung; gelesene Spielstände bleiben freigeschaltet',()=>{
  const quest={completed:{}};
  assert.equal(storyDialogReady(quest,false,true),false);
  assert.equal(storyDialogReady(quest,false,false),false);
  assert.equal(storyDialogReady(quest,true,true),false);
  assert.equal(storyDialogReady(quest,true,false),true);
  assert.equal(storyDialogReady({...quest,scenesSeen:{H00:true}},false,false),true);
  assert.equal(storyDialogReady({completed:{H00:{at:0}}},false,false),true);
  assert.equal(storyDialogReady({...quest,scenesSeen:{H00:true}},false,true),false);
});

test('Bilddialoge sind freischaltbar und nachlesbar, ohne Spielzustand oder Kosten zu gewähren',()=>{
  const game=new Game(':memory:',{profile:'homeworld',seed:42}),p=game.createPlayer('Geschichte');
  try{
    const read=scene=>runCommand(game,p,{cmd:'homeDialogRead',scene});
    const credits=p.credits,ships=game.shipsOf(p.id).length;
    assert.equal(read('H00'),undefined);assert.ok(read('H17'));
    for(const [id,scene] of Object.entries(HOME_STORY)){
      for(const prerequisite of scene.requires)p.homeQuest.completed[prerequisite]={at:0};
      acknowledgeStories(game,p);
      if(id==='H04_MODULE')p.homeQuest.salvage={phase:'workshop'};
      if(id==='H04_MODULE')p.homeQuest.eventDialog=id;
      assert.ok(storyAvailable(p.homeQuest,id));assert.equal(read(id),undefined);assert.equal(read(id),undefined);
      assert.ok(p.homeQuest.scenesSeen[id]);
    }
    assert.equal(p.credits,credits);assert.equal(game.shipsOf(p.id).length,ships);
  }finally{game.close();}
});

test('Siedlungswahl verändert nur widerrufbare Betriebsprioritäten und keine Preise',()=>{
  const game=new Game(':memory:',{profile:'homeworld',seed:42}),p=game.createPlayer('Priorität'),e=game.world.entities.get(p.homeworld),h=e.market.homeworld;
  try{
    p.homeQuest.completed.H07={at:0};acknowledgeStories(game,p);game.shipsOf(p.id)[0].dockedAt=e.id;
    h.structures=[{id:'home',kind:'housing',priority:50}];
    const before=p.credits;
    for(const priority of ['housing','supply']){
      assert.equal(runCommand(game,p,{cmd:'homeStoryPriority',priority}),undefined);
      assert.equal(h.facilities.waterworks.priority,priority==='supply'?95:80);
      assert.equal(h.structures[0].priority,priority==='housing'?95:50);
    }
    assert.equal(p.credits,before);
  }finally{game.close();}
});

test('Ruinen, Baustellen und Orbitalstufen erhalten unterscheidbare Silhouetten am selben Anker',()=>{
  const item={homeFacility:'dock'},home={facilities:{dock:{status:'ruined'}}},entity={market:{homeworld:home}};
  const build=()=>{const object=new THREE.Group();object.add(new THREE.Mesh(new THREE.BoxGeometry(3,3,3),new THREE.MeshStandardMaterial()));return object;};
  const ruined=build();assert.equal(buildingDevelopment(home,item),'ruined');const disposeR=developBuilding(ruined,item,entity);
  assert.equal(ruined.children[0].visible,false);assert.equal(ruined.children.length,6);
  home.facilities.dock.status='building';const construction=build(),disposeC=developBuilding(construction,item,entity);assert.equal(construction.children.length,10);
  home.orbital={small:true};const ring=build(),disposeS=developBuilding(ring,{homeOrbital:true},entity);
  assert.equal(buildingDevelopment(home,{homeOrbital:true}),'orbital-small');
  home.orbital.large=true;assert.equal(buildingDevelopment(home,{homeOrbital:true}),'orbital-large');
  assert.deepEqual(ruined.position.toArray(),[0,0,0]);disposeR();disposeC();disposeS();
});

test('Tuschematerialien verändern weder gemeinsam genutzte Vorlagen noch Auswahlgeometrie',()=>{
  const source=new THREE.MeshStandardMaterial({color:0x667755}),geometry=new THREE.BoxGeometry(4,5,6),object=new THREE.Mesh(geometry,source);
  const originalColor=source.color.getHex(),dispose=paintPlanet(object,{outlines:true});
  assert.ok(object.material.isMeshToonMaterial);assert.notEqual(object.material,source);
  assert.equal(source.color.getHex(),originalColor);assert.equal(object.geometry,geometry);assert.equal(object.children.length,1);
  dispose();source.dispose();geometry.dispose();
});
