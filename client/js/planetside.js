// Surface state stays separate from the space map and its camera.
import { GOODS, RECIPES, ENTERTAINMENT, RECIPE_CATS, planetFeatures, planetRng, factorySlots, recipeCat } from '/shared/config.js';
import { planetAccess } from '/shared/planet-access.js';
import { state, myShips } from './state.js';
import { HOME_BUILDINGS } from '/shared/homeworld.js';
export const scene = { scroll: 0, width: 0, items: [], hover: null, key: '', selected: null };
const LOOK = {
  farm: ['grain', 'biomass', 'food', 'fertilizer', 'textiles', 'preserves'],
  drill: ['crude', 'gas', 'helium3', 'shipfuel', 'fuel', 'chemicals', 'acid'],
  silo: ['water', 'ice', 'coolant'],
  mine: ['ore', 'crystals', 'rareearth', 'silicate', 'sulfur', 'raremetals', 'ingots', 'cutters'],
  tower: ['tourists', 'workers'],
};
const lookOf = g => Object.keys(LOOK).find(k => LOOK[k].includes(g)) || 'hall';
export function buildingKey(it) {
  if (it.key) return it.key;
  return it.good ? it.kind + ':' + it.good
    : it.kind === 'factory' ? 'factory:' + it.recipe + ':' + it.index
    : it.kind === 'plot' ? 'plot:' + it.cat + ':' + it.plotIndex
    : it.kind === 'fun' ? 'fun:' + it.building : it.kind;
}
let canvas, callbacks, viewer, boot;
export function initPlanetside(c, handlers) { canvas = c; callbacks = handlers; }
function status(message, retry = false) {
  const el = document.getElementById('planetStatus');
  el.hidden = !message || !state.landed;
  el.querySelector('span').textContent = message;
  el.querySelector('button').hidden = !retry;
}
async function ensureViewer() {
  if (!boot) boot = import('./planetCityScene.js').then(({ PlanetCityScene }) => {
    viewer = new PlanetCityScene(canvas, {
      select: key => {
        const it = scene.items.find(x => x.key === key);
        if (it) callbacks.select(it); else callbacks.deselect();
      },
      status,
    });
    return viewer;
  }).catch(error => { boot = null; throw error; });
  return boot;
}
export function resetPlanetside(e) {
  scene.key = ''; scene.selected = null;
  Object.assign(scene, buildItems(e));
  viewer?.reset();
}
export function selectBuilding(it, force = false) {
  scene.selected = it?.key ?? null;
  viewer?.select(scene.selected, force);
}
export function hidePlanetside() {
  canvas.hidden = true;
  viewer?.hide();
  status('');
}
export function pickBuilding(x, y) {
  const key = viewer?.pick(x, y);
  return scene.items.find(it => it.key === key) ?? null;
}
export function getPlanetView() { return viewer; }
export function renderPlanetside(now, dt) {
  const e = state.entities.get(state.landed);
  if (!e) return;
  canvas.hidden = false;
  const key = JSON.stringify([e.id, e.type, Object.entries(e.market.goods).map(([g,s]) => [g,s.role,s.fac]), e.market.bld?.fac, e.market.homeworld?.plots, e.market.homeworld?.structures?.map(s=>[s.id,s.kind,s.recipe,s.plot,s.status,s.level,s.upgrading]),Object.entries(e.market.homeworld?.facilities||{}).map(([id,b])=>[id,b.status]),e.market.homeworld?.controlLevel,e.market.homeworld?.orbital&&[e.market.homeworld.orbital.small,e.market.homeworld.orbital.large,!!e.market.homeworld.orbital.project],e.market.economy?.specialization,e.market.economy?.infrastructure?.map(b=>[b.id,b.kind,b.level,b.upgrading]),e.market.economy?.projects?.map(p=>[p.id,p.kind]), !!state.props.get(e.id)?.manage]);
  if (key !== scene.key) {
    const factoriesChanged = JSON.stringify(scene.items.filter(it => it.kind === 'factory').map(it => it.recipe)) !== JSON.stringify(e.market.bld?.fac ?? []);
    Object.assign(scene, buildItems(e), { key });
    if (factoriesChanged && scene.selected?.startsWith('factory:')) callbacks.deselect();
    if (scene.selected && !scene.items.some(it => it.key === scene.selected)) callbacks.deselect();
    callbacks.changed();
    status('Planetenoberfläche wird geladen …');
    const id = e.id, items = scene.items;
    ensureViewer().then(v => {
      if (state.landed !== id || scene.key !== key) return;
      v.show();
      return v.load(e, items, recipeCat, () => state.landed === id && scene.key === key);
    }).then(() => {
      if (state.landed === id && scene.key === key) viewer?.select(scene.selected, true);
    }).catch(error => {
      console.error('Planetenoberfläche:', error);
      if (state.landed === id && scene.key === key) status('Stadtansicht konnte nicht geladen werden.', true);
    });
  }
  if (viewer) { if(viewer.entity?.id===e.id)viewer.entity=e; viewer.show(); viewer.render(dt); }
}
document.getElementById('planetRetry').onclick = () => { scene.key = ''; };
/** Gebäudeliste eines Planeten (abhängig von Markt, Besitz und Fabriken) */
export function buildItems(e) {
  if (e.type === 'ruins') {
    const basic = [
      ['dock', 'consume', 'store', 'Landeplatz und Zentrallager'], ['control', 'produce', 'hall', 'Leitstelle'],
      ['workshop', 'factory', null, 'Antriebswerkstatt'], ['waterworks', 'produce', 'silo', 'Wasserwerk'],
      ['foodplant', 'produce', 'farm', 'Nahrungsanlage'], ['fueldepot', 'produce', 'drill', 'Treibstoffanlage'],
      ['refinery', 'produce', 'drill', 'Raffinerie'], ['smelter', 'produce', 'mine', 'Schmelzwerk'],
    ];
    const items = [{ kind: 'questhouse', key: 'questhouse', label: 'Rathaus' }, ...basic.map(([homeFacility, kind, look, label]) => ({ kind, look, homeFacility, key: `home:${homeFacility}`, label })),{kind:'factory',homeOrbital:true,key:'home:orbital',label:'Orbitalring'}];
    for (let i = 0; i < (e.market.homeworld?.plots || 8); i++) {
      const structure=e.market.homeworld?.structures?.find(s=>s.plot===i);
      items.push(structure ? {kind:structure.status==='ready'?'factory':'plot',cat:'bio',plotIndex:i,homeStructure:structure.id,
        key:`home:structure:${structure.id}`,label:structure.recipe?RECIPES[structure.recipe].name:HOME_BUILDINGS[structure.kind]?.name||structure.kind}
        :{ kind: 'plot', cat: 'bio', plotIndex: i, key: `home:plot_${i}`, label: `Bauplatz ${i + 1}` });
    }
    return { items, width: 240, feat: {} };
  }
  const m = e.market;
  const feat = planetFeatures(e.id);
  const owned = state.props.get(e.id)?.manage;
  const r = planetRng(e.id, 3);
  const items = [{ kind: 'questhouse', label: 'Questhaus', w: 170 }];
  const rest = [];
  for(const b of m.economy?.infrastructure||[])if(b.kind==='housing')rest.push({kind:'infrastructure',worldInfrastructure:b.id,key:'infra:'+b.id,label:'Wohnhaus Stufe '+(b.level||1),w:150});
  for (const [g, s] of Object.entries(m.goods)) {
    if (s.fac || (s.role !== 'produce' && s.role !== 'consume')) continue;
    rest.push({ kind: s.role === 'produce' ? 'produce' : 'consume', good: g, look: s.role === 'produce' ? lookOf(g) : 'store', label: `${s.role === 'produce' ? '' : 'Lager '}${GOODS[g].name}`, w: 150 + Math.floor(r() * 40) });
  }
  for (const k of feat.fun) rest.push({ kind: 'fun', building: k, label: ENTERTAINMENT[k].name, w: 170 });
  for (const k of ['smuggler', 'beggar', 'dog', 'school']) if (feat[k]) rest.push({ kind: k, label: { smuggler: 'Schmugglerhöhle', beggar: 'Bettler', dog: 'Hund', school: 'Schule' }[k], w: { smuggler: 150, beggar: 80, dog: 80, school: 160 }[k] });
  // deterministisch mischen
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  items.push(...rest);
  // Fabriken und freie Bauplätze (nur sichtbar, wenn der Planet dir bzw. deinem Konsortium gehört oder Fabriken stehen)
  const fac = m.bld?.fac || [];
  fac.forEach((recipe, index) => items.push({ kind: 'factory', recipe, index, label: RECIPES[recipe]?.name || recipe, w: 180 }));
  if (owned) {
    const slots = factorySlots(e.type);
    for (const [cat, n] of Object.entries(slots)) {
      const used = fac.filter((x) => recipeCat(x) === cat).length;
      for (let i = used; i < n; i++) items.push({ kind: 'plot', cat, plotIndex: i, label: `Bauplatz ${RECIPE_CATS[cat].name}`, w: 150 });
    }
  }
  let x = 120;
  for (const it of items) { it.key = buildingKey(it); it.x = x; x += it.w + 50; }
  return { items, width: x + 80, feat };
}

const dockedHere = (id) => myShips().filter((s) => s.dockedAt === id);
export const accessTo = id => planetAccess({...state.me,relic:state.relic},state.ships,state.entities.get(id),state.coverage);
export const canLand = id => !state.entities.get(id)?.ruinsSite && (dockedHere(id).length>0 || accessTo(id).manage);
