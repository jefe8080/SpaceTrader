import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {planetDevelopment} from '../shared/planet-development.js';

// Exercise the actual space-view entry point together with its exterior painter.
const renderer = readFileSync(new URL('../client/js/render.js', import.meta.url), 'utf8');
const drawPlanet = renderer.slice(renderer.indexOf('function drawPlanet(e)'), renderer.indexOf('function drawStation('));
const exterior = readFileSync(new URL('../client/js/planetExterior.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/, '').replace('export function drawPlanetExterior', 'function drawPlanetExterior');

function render({small = false, large = false, developed = false, sprite = true} = {}) {
  const calls = [];
  const ctx = new Proxy({}, {get: (_, method) => (...args) => calls.push({method, args})});
  const entity = {id: 'home', kind: 'planet', type: 'ruins', x: 20, y: 30, radius: 50,
    market: {homeworld: {controlLevel: 1, facilities: {control: {status: 'ready'}},
      structures: Array.from({length: developed ? 3 : 0}, () => ({status: 'ready'})), orbital: {small, large}}}};
  runInNewContext(`${exterior}\n${drawPlanet}\ndrawPlanet(entity);`, {
    ctx, entity, planetDevelopment, PLANET_TYPES: {ruins: {sprite: 'ruins'}},
    px: n => n, getSprite: () => sprite ? {} : null,
  });
  return calls;
}

test('Weltraumansicht zeichnet fertige Ringe vor und hinter dem Planeten, unabhängig von der Bebauung', () => {
  assert.equal(render().filter(c => c.method === 'stroke').length, 0);
  for (const rings of [{small: true}, {large: true}, {small: true, large: true}]) {
    const calls = render(rings), base = calls.findIndex(c => c.method === 'drawImage');
    assert.ok(calls.slice(0, base).some(c => c.method === 'stroke'));
    assert.ok(calls.slice(base + 1).some(c => c.method === 'stroke'));
  }
});

test('Weltraumansicht zeichnet erreichte Bebauung über dem Planetenbild und unterstützt den Ersatzkreis', () => {
  assert.equal(render().filter(c => c.method === 'fillRect').length, 0);
  const calls = render({developed: true});
  assert.ok(calls.findIndex(c => c.method === 'fillRect') > calls.findIndex(c => c.method === 'drawImage'));
  const fallback = render({small: true, sprite: false});
  assert.ok(fallback.some(c => c.method === 'fill'));
  assert.ok(fallback.some(c => c.method === 'stroke'));
});
