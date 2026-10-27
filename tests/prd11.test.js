import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { OBJECT_GUIDE, entityGuideKey, buildingGuideKey } from '../shared/object-guide.js';
import { STATION_TYPES, PLANET_TYPES, BELT_TYPES } from '../shared/goods.js';
import os from 'node:os';
import path from 'node:path';
import { Game } from '../server/game.js';
import { runCommand } from '../server/handlers/index.js';

test('PRD11: registered object types have illustrated guides without location spoilers', () => {
  for (const [kind,prefix,types] of [['station','st:',STATION_TYPES],['planet','pl:',PLANET_TYPES],['belt','bt:',BELT_TYPES]]) {
    for (const type of Object.keys(types)) {
      const key = entityGuideKey({kind,type});
      assert.equal(key,prefix+type);
      assert.ok(OBJECT_GUIDE[key]);
    }
  }
  for (const entry of Object.values(OBJECT_GUIDE)) {
    assert.ok(entry.intro && entry.points.length);
    assert.ok(fs.existsSync('client' + entry.image), entry.image);
    assert.ok(!('coordinates' in entry));
  }
  assert.notEqual(buildingGuideKey({homeOrbital:true},{market:{homeworld:{orbital:{large:true}}}}), buildingGuideKey({homeOrbital:true},{}));
});

test('PRD11: guide acknowledgements are validated, idempotent, saved and player specific', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'prd11-'));
  const file = path.join(dir,'game.db');
  const game = new Game(file,{profile:'homeworld',seed:42});
  const a = game.createPlayer('Guide A'), b = game.createPlayer('Guide B');
  for (let i=0;i<2;i++) assert.equal(runCommand(game,a,{cmd:'guideRead',key:'st:hub'}),undefined);
  assert.deepEqual(a.guideRead,['st:hub']);
  assert.equal(b.guideRead,undefined);
  assert.ok(runCommand(game,a,{cmd:'guideRead',key:'unknown'}));
  game.save();
  const restored = new Game(file,{profile:'homeworld',seed:42});
  assert.deepEqual(restored.players.get(a.id).guideRead,['st:hub']);
  assert.equal(restored.players.get(b.id).guideRead,undefined);
  restored.store?.close?.(); game.store?.close?.();
});
