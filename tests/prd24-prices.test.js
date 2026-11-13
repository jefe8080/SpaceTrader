import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createMarket } from '../server/markets.js';
import { rng } from '../server/worldgen.js';
import { GOODS, RECIPES, STATION_TYPES, buyPrice, sellPrice, slotPrice, PRICE } from '../shared/config.js';
import { REFINED_FOR_RAW } from '../shared/goods.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('PRD24: six extractor inputs cost 20% more; recipes, bases and sale proceeds are unchanged', () => {
  const seen = new Set();
  for (const type of ['deepmine', 'antimatterlab', 'gasharvester']) {
    for (let seed = 1; seed <= 40; seed++) {
      const market = createMarket('station', type, rng(seed));
      const [raw, refined] = Object.entries(REFINED_FOR_RAW).find(([g]) => market.goods[g]);
      seen.add(raw);
      const input = market.goods[raw];
      const recipe = Object.values(RECIPES).find(r => r.in[raw] && r.out[refined]);
      assert.ok(recipe);
      for (const ratio of [0, 0.3, 0.7, 1]) for (const mod of [0.8, 1, 1.25]) {
        const current = { ...input, stock: input.cap * ratio, mod };
        const before = { ...current }; delete before.buyFactor;
        close(buyPrice(raw, current), buyPrice(raw, before) * 1.2);
        close(sellPrice(raw, current), sellPrice(raw, before));
        close(slotPrice(raw, current), slotPrice(raw, before));
        const outputSlot = { stock: 30, cap: 100, mod };
        const revenue = recipe.out[refined] * sellPrice(refined, outputSlot);
        const otherCosts = Object.entries(recipe.in).filter(([g]) => g !== raw).reduce((total, [g, n]) => total + n * buyPrice(g, outputSlot), 0);
        const oldMargin = revenue - otherCosts - recipe.in[raw] * buyPrice(raw, before);
        const newMargin = revenue - otherCosts - recipe.in[raw] * buyPrice(raw, current);
        assert.ok(newMargin < oldMargin);
        close(oldMargin - newMargin, recipe.in[raw] * buyPrice(raw, before) * 0.2);
        close(buyPrice(refined, outputSlot), slotPrice(refined, outputSlot) * (1 + PRICE.SPREAD));
      }
      assert.equal(market.goods.food.buyFactor, undefined);
    }
  }
  assert.deepEqual([...seen].sort(), Object.keys(REFINED_FOR_RAW).sort());
  // Lock the pre-PRD24 commodity bases, recipes and yields against indirect price inflation.
  const chain = Object.entries(REFINED_FOR_RAW).map(([raw, refined]) => ({ raw, base: GOODS[raw].base, refined, refinedBase: GOODS[refined].base, recipe: Object.values(RECIPES).find(r => r.in[raw] && r.out[refined]) }));
  assert.equal(createHash('sha256').update(JSON.stringify(chain)).digest('hex'), 'e6815bb2b87a7fb00ab1b4ace7e09bc3627964b787315759ee2b5a8ae4bf97f4');
  for (const [type, def] of Object.entries(STATION_TYPES).filter(([, d]) => !d.extract && (d.recipe || d.consume || d.buys || d.outpost || d.factionyard || d === STATION_TYPES.hub))) {
    const market = createMarket('station', type, rng(7));
    assert.ok(Object.values(market.goods).every(s => s.buyFactor === undefined), type);
  }
});

test('PRD24: surcharge reaches client quotes and actual player purchases', async t => {
  const { serializeMarket } = await import('../server/net.js');
  const { Game } = await import('../server/game.js');
  const game = new Game(':memory:', { seed: 7 });
  t.after(() => game.store.close());
  const p = game.createPlayer('Preisprüfung');
  const ship = game.shipsOf(p.id)[0];
  const market = createMarket('station', 'deepmine', () => 0);
  const station = { id: 'price-extractor', kind: 'station', type: 'deepmine', x: ship.x, y: ship.y, market };
  game.world.entities.set(station.id, station);
  ship.dockedAt = station.id;
  const slot = market.goods.gold;
  slot.stock = 100;
  p.credits = 1e6;
  const quote = buyPrice('gold', slot);
  close(buyPrice('gold', serializeMarket(market).goods.gold), quote);
  const before = p.credits;
  const result = game.trade(ship, station, 'gold', 1, 'buy');
  assert.equal(result.n, 1);
  close(before - p.credits, quote);
});
