import {test} from 'node:test';import assert from 'node:assert/strict';
import {visibleQuestBranches,questWorkplaces} from '../shared/quest-guidance.js';
test('Quest branches retain parallel prerequisites without revealing remote story',()=>{
 const q={completed:{H00:{},H01:{}},active:{H02:true}};const nodes=visibleQuestBranches(q);
 assert.ok(nodes.some(n=>n.id==='H02'));assert.ok(!nodes.some(n=>n.id==='H17'));
 const links=questWorkplaces('H07',{structures:[{id:'school-2',kind:'school'}]});assert.ok(links.some(([,key])=>key==='home:structure:school-2'));
});
