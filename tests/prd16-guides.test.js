import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {OBJECT_GUIDE} from '../shared/object-guide.js';import {RECIPES} from '../shared/goods.js';
test('All first-click explanations have current existing images and concrete complete entries',()=>{
 for(const d of Object.values(OBJECT_GUIDE)){
  assert.ok(d.intro.length>20,d.key);assert.ok(d.points.length>=1,d.key);assert.ok(fs.existsSync('client'+d.image),d.key+': '+d.image);assert.ok(!d.image.includes('/models/'),d.key);
  assert.ok(!/undefined|NaN/.test(d.intro+d.points.join(' ')),d.key);
 }
 for(const [id,r] of Object.entries(RECIPES)){const d=OBJECT_GUIDE['st:'+id];assert.ok(d);assert.ok(d.points.some(p=>p.includes(String(r.time)+' Sekunden')));assert.ok(d.points.some(p=>p.includes('Fertigstellung')));}
});
