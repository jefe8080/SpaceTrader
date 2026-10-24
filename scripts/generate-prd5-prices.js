import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GOODS,RECIPES,REFINED_FOR_RAW} from '../shared/goods.js';
import {FACTION_SHIPS} from '../shared/factions.js';

export function priceCatalog(){
  const goods=Object.entries(GOODS).sort(([a,x],[b,y])=>x.tier-y.tier||a.localeCompare(b,'en')).map(([id,g])=>({id,name:g.name,base:g.base,tier:g.tier,cls:g.cls,recipe:Object.entries(RECIPES).find(([,r])=>r.out[id])?.[0]||null}));
  const currencies=Object.entries(FACTION_SHIPS).map(([id,s])=>({ship:id,raw:s.rawCurrency.good,oldAmount:s.rawCurrency.n,oldValue:s.rawCurrency.n*GOODS[s.rawCurrency.good].base,product:s.currency.good,amount:s.currency.n,newValue:s.currency.n*GOODS[s.currency.good].base}));
  return {formula:'round((sum(input amount × base) × 1.3 / sum(output amount) + 2 × tier + seconds × 0.6) × 10) / 10',goods,currencies};
}

export function priceMarkdown(catalog=priceCatalog()){
  return '# PRD 5 – reproduzierbare Basispreise\n\nErzeugt mit `npm run prices:prd5` aus dem Spielkatalog. Kein zusätzlicher Sonderwarenaufschlag. Mengen sind Spieleinheiten, Preise Credits. Standorte und Lagerfüllstand verändern anschließend die Handelspreise nach den bestehenden Formeln.\n\n'
    +'Produktpreis = Zutatenwert × 1,3 / Outputmenge + 2 × Stufe + Sekunden × 0,6; auf eine Nachkommastelle gerundet. Stufe = min(5, 1 + höchste Zutatenstufe).\n\n'
    +'| ID | Ware | Klasse | Stufe | Basispreis | Rezept |\n|---|---|---|---:|---:|---|\n'
    +catalog.goods.map(g=>`| ${g.id} | ${g.name} | ${g.cls} | ${g.tier} | ${g.base.toFixed(1)} | ${g.recipe||'Natürliche/Personenquelle'} |`).join('\n')
    +'\n\n## Fraktionsmengen\n\n`max(1, ceil(alte Menge × Rohstoffbasispreis / Produktbasispreis))`. Aufrundung unterschreitet den bisherigen Warenwert nie; die Differenz bleibt kleiner als ein Produkt. Rohformen sind als Fraktionszahlung und am Hub ausgeschlossen.\n\n'
    +'| Schiff | Rohform vorher | Menge vorher | Wert vorher | Produkt | Neue Menge | Neuer Wert |\n|---|---|---:|---:|---|---:|---:|\n'
    +catalog.currencies.map(c=>`| ${c.ship} | ${c.raw} | ${c.oldAmount} | ${c.oldValue.toFixed(1)} | ${c.product} | ${c.amount} | ${c.newValue.toFixed(1)} |`).join('\n')+'\n';
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),catalog=priceCatalog();
  fs.writeFileSync(path.join(root,'docs/PRD-5-preise.md'),priceMarkdown(catalog));
  fs.writeFileSync(path.join(root,'docs/PRD-5-preise.json'),JSON.stringify(catalog,null,2)+'\n');
  console.log(`${catalog.goods.length} Waren, ${Object.keys(REFINED_FOR_RAW).length} Veredelungen, ${catalog.currencies.length} Fraktionsschiffe.`);
}
