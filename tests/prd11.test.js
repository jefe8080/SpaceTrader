import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { OBJECT_GUIDE, entityGuideKey, buildingGuideKey } from '../shared/object-guide.js';
import { STATION_TYPES, PLANET_TYPES, BELT_TYPES } from '../shared/goods.js';

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
