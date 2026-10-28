import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stat} from '../server/markets.js';
import {tickHomeOperations} from '../server/homeworld-operations.js';

test('Ruinenlager merkt angelieferte und produzierte Ressourcen dauerhaft',()=>{
  const market={homeworld:{},goods:{electronics:{stock:0}}};
  stat(market,0,'i','electronics',10);
  stat(market,1,'o','electronics',10);
  stat(market,2,'p','plates',5);
  stat(market,3,'i','robots',0);
  const saved=JSON.parse(JSON.stringify(market));
  assert.deepEqual(saved.homeworld.knownGoods,{electronics:true,plates:true});
  assert.equal(saved.goods.electronics.stock,0);
});

test('Vorhandene Ressourcen alter Spielstände werden auch während Warp gemerkt',()=>{
  const entity={market:{homeworld:{warp:{}},goods:{electronics:{stock:4},robots:{stock:0}}}};
  tickHomeOperations({},entity,1);
  assert.deepEqual(entity.market.homeworld.knownGoods,{electronics:true});
});
