import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Vector3, PerspectiveCamera } from 'three';
import { CameraFlight } from '../client/js/planetCamera.js';

test('Rapid selection changes continue from current pose and return to overview', () => {
  const camera = new PerspectiveCamera();
  const controls = { target: new Vector3() };
  const flight = new CameraFlight(camera,controls);
  const overview = {position:new Vector3(110,140,160),target:new Vector3()};
  flight.move(overview,true);
  flight.move({position:new Vector3(20,30,40),target:new Vector3(10,3,8)});
  flight.update(0.2);
  const interrupted = camera.position.clone();
  flight.move({position:new Vector3(-30,40,20),target:new Vector3(-10,3,0)});
  assert.ok(camera.position.equals(interrupted));
  flight.update(0.65);
  assert.deepEqual(camera.position.toArray(),[-30,40,20]);
  flight.move(overview);
  flight.update(0.65);
  assert.ok(camera.position.equals(overview.position));
  assert.ok(controls.target.equals(overview.target));
  assert.equal(flight.flight,null);
});

test('Manual camera input cancels automatic flight', () => {
  const camera = new PerspectiveCamera(), controls = {target:new Vector3()};
  const flight = new CameraFlight(camera,controls);
  flight.move({position:new Vector3(10,10,10),target:new Vector3(1,2,3)});
  flight.update(0.1); flight.cancel();
  const position = camera.position.clone();
  flight.update(1);
  assert.ok(camera.position.equals(position));
});

import { OrthographicCamera } from 'three';
import { fitDioramaCamera, buildingViewDirection, OVERVIEW_DIRECTION } from '../client/js/planetCamera.js';

for (const [width,height,area] of [
 [1440,900,{x:316,y:110,width:1108,height:770}],
 [1440,900,{x:316,y:110,width:738,height:770}],
 [1024,768,{x:12,y:110,width:1000,height:430}],
 [390,844,{x:12,y:140,width:366,height:380}],
]) test('Orthographic 2.5D map fits viewport '+width+' / '+area.width,()=>{
 const box=new Box3(new Vector3(-98,-5,-89),new Vector3(98,38,78));
 const camera=new OrthographicCamera(-50*width/height,50*width/height,50,-50,.1,1500);
 const pose=fitDioramaCamera(box,width,height,area);
 camera.position.copy(pose.position);camera.lookAt(pose.target);camera.zoom=pose.zoom;
 camera.setViewOffset(width,height,width/2-(area.x+area.width/2),height/2-(area.y+area.height/2),width,height);
 camera.updateProjectionMatrix();camera.updateMatrixWorld();
 for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
  const p=new Vector3(x,y,z).project(camera),sx=(p.x+1)*width/2,sy=(1-p.y)*height/2;
  assert.ok(sx>=area.x&&sx<=area.x+area.width);
  assert.ok(sy>=area.y&&sy<=area.y+area.height);
 }
});
test('Building focus rotates towards the front at a fixed elevation',()=>{
 const front=new Vector3(0,0,1),focus=buildingViewDirection(0);
 assert.ok(front.dot(OVERVIEW_DIRECTION)>.65);
 assert.ok(front.dot(focus)>.75);
 assert.ok(focus.x < OVERVIEW_DIRECTION.x);
 for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){
  const normal=new Vector3(Math.sin(yaw),0,Math.cos(yaw));
  const direction=buildingViewDirection(yaw);
  assert.ok(normal.dot(direction)>.75);
  assert.ok(Math.abs(direction.y-focus.y)<1e-10);
 }
});
test('Interrupted orthographic flights interpolate zoom and restore exact overview',()=>{
 const camera=new OrthographicCamera(-50,50,50,-50,.1,1500),controls={target:new Vector3()};
 const flight=new CameraFlight(camera,controls);
 const overview={position:new Vector3(78,134,185),target:new Vector3(),zoom:.35};
 flight.move(overview,true);
 flight.move({position:new Vector3(30,150,200),target:new Vector3(0,5,10),zoom:.9});
 flight.update(.2);
 const position=camera.position.clone(),zoom=camera.zoom;
 flight.move({position:new Vector3(-30,150,200),target:new Vector3(-20,10,10),zoom:.8});
 assert.ok(camera.position.equals(position));assert.equal(camera.zoom,zoom);
 flight.update(.65);assert.ok(Math.abs(camera.zoom-.8)<1e-10);
 flight.move(overview);flight.update(.65);
 assert.ok(camera.position.equals(overview.position));
 assert.ok(Math.abs(camera.zoom-overview.zoom)<1e-10);
});
