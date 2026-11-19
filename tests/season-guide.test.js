const {test}=require('node:test'),assert=require('node:assert/strict');
const {view}=require('../miniprogram/packages/analysis/utils/season-guide');
test('four seasonal chapters select ordered images and reuse the color recommendation',()=>{
 const r={profile:{gender:'男'},geometry:{provider:'Face++',raw:{skin:{skin_hue_ha:{skin_hue:2}}}}};
 const g=view(r);assert.equal(g.colorLabel,'清爽配色');assert.deepEqual(g.seasons.map(s=>s.id),['spring','summer','autumn','winter']);
 for(const s of g.seasons){assert.equal(s.first.length,2);assert.equal(s.second.length,2);assert.match(s.colorAdvice,/雾蓝/);assert.ok([...s.first,...s.second].every(x=>x.season===s.id));}
 assert.ok(view({profile:{gender:'女'}}).seasons.every(s=>!s.first.length&&!s.second.length));
});
