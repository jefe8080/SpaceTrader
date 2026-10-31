import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recordLocalSale,localSalesSummary} from '../shared/local-sales.js';
test('Local sales use paid credits, an exact three-hour window and survive serialization',()=>{
  const m={};
  recordLocalSale(m,0,'food',2,10);
  recordLocalSale(m,1,'food',.5,2.5);
  recordLocalSale(m,2,'water',3,9);
  recordLocalSale(m,3,'food',100,0);
  const loaded=JSON.parse(JSON.stringify(m));
  assert.deepEqual(localSalesSummary(loaded,10800),{quantities:{food:.5,water:3},revenue:{food:2.5,water:9},total:11.5,from:0,until:10800});
  assert.equal(localSalesSummary(loaded,10803).total,0);
  assert.equal(localSalesSummary({},100).total,0);
});
