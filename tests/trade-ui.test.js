import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultTradeView,filterTradeRows,reconcileTradeRows} from '../client/js/ui/tradeModel.js';
const rows=[
{id:'p1',name:'Alpha',kind:'planet',type:'Planet',system:'S1',sector:'B',hasGood:true,buy:10,sell:8,quantity:20,favorite:true,distance:50,time:5},
{id:'s2',name:'Beta',kind:'station',type:'Station',system:'S1',sector:'A',hasGood:true,buy:5,sell:4,quantity:40,favorite:false,distance:20,time:2},
{id:'p3',name:'Gamma',kind:'planet',type:'Planet',system:'S2',sector:'A',hasGood:false,buy:null,sell:null,quantity:null,favorite:false,distance:null,time:null}];
const v=extra=>({...defaultTradeView(),good:'ore',...extra});
test('Trade: kombinierte Filter und Preisgrenzen folgen der Spielersicht',()=>{
 assert.deepEqual(filterTradeRows(rows,v({direction:'buy',price:'6',quantity:'30',sector:'A',type:'station',search:'bet',system:'S1'})).map(r=>r.id),['s2']);
 assert.deepEqual(filterTradeRows(rows,v({direction:'sell',price:'7'})).map(r=>r.id),['p1']);
 assert.equal(filterTradeRows(rows,v({favorites:true})).length,1);
 assert.equal(filterTradeRows(rows,v({search:'unbekannt'})).length,0);
});
test('Trade: unbekannte Werte bleiben in beiden Richtungen am Ende, Gleichstände stabil',()=>{
 for(const descending of [false,true]) {
  const all=filterTradeRows(rows,v({good:'',sort:'distance',descending}));
  assert.equal(all.at(-1).id,'p3');
 }
 const tied=rows.slice(0,2).map(r=>({...r,buy:10}));
 assert.deepEqual(filterTradeRows(tied.reverse(),v({sort:'buy'})).map(r=>r.id),['p1','s2']);
 assert.equal(filterTradeRows(rows,v({pin:true,sort:'buy'}))[0].id,'p1');
});
test('Trade: alle Sortierschlüssel unterstützen beide Richtungen',()=>{
 for(const sort of ['name','type','system','sector','distance','time','buy','sell','quantity']){
  const asc=filterTradeRows(rows.slice(0,2),v({sort})),desc=filterTradeRows(rows.slice(0,2),v({sort,descending:true}));
  if(asc[0][sort]!==asc[1][sort]) assert.equal(asc[0].id,desc[1].id,sort);
 }
});
test('Trade: Liveupdates ändern weder Positionen noch Treffermenge vor expliziter Aktualisierung',()=>{
 const prev=['p1','s2'];const next=[rows[1],rows[2]];
 assert.deepEqual(reconcileTradeRows(prev,next),{ids:prev,pending:true});
 assert.deepEqual(reconcileTradeRows(prev,next,true),{ids:['s2','p3'],pending:false});
 assert.equal(reconcileTradeRows(prev,[rows[0],rows[1]]).pending,false);
});
