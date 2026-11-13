import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSector } from '../server/worldgen.js';
import { BELT_TYPES, GOODS } from '../shared/config.js';

test('PRD24: deterministic ultra fields only in faction sectors, guaranteed in every faction system', () => {
  let factionSystems = 0, ordinaryUltra = 0, freeSectorExtractors = 0;
  const seen = new Set();
  for (const seed of [1, 7, 42, 99, 1234]) {
    for (let q = -3; q <= 3; q++) for (let r = -3; r <= 3; r++) {
      const generated = generateSector(seed, q, r);
      assert.deepEqual(generated, generateSector(seed, q, r));
      const { sector, entities } = generated;
      const ultra = entities.filter(e => e.kind === 'belt' && GOODS[BELT_TYPES[e.type].good].ultra);
      if (!sector.faction) {
        assert.equal(ultra.length, 0, `${seed}/${q},${r}`);
        freeSectorExtractors += entities.filter(e => e.market?.strategy === 'extractor').length;
      }
      for (const sys of sector.systems) {
        const fields = ultra.filter(e => e.system === sys.id);
        if (sys.faction) {
          factionSystems++;
          assert.ok(fields.length >= 1, `${seed}/${sys.id}: field required, station insufficient`);
        } else ordinaryUltra += fields.length;
        for (const e of fields) {
          seen.add(BELT_TYPES[e.type].good);
          assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y));
          for (const other of entities.filter(o => o.system === sys.id && o.id !== e.id && o.kind !== 'wormhole')) {
            assert.ok(Math.hypot(e.x - other.x, e.y - other.y) > e.radius + other.radius, 'field must not overlap other objects');
          }
        }
      }
    }
  }
  assert.ok(factionSystems > 100);
  assert.ok(ordinaryUltra > 0, 'normal systems inside faction sectors retain random ultra fields');
  assert.ok(freeSectorExtractors > 0, 'extractors remain outside faction sectors');
  for (const def of Object.values(BELT_TYPES).filter(d => GOODS[d.good].ultra)) assert.ok(seen.has(def.good));
});
