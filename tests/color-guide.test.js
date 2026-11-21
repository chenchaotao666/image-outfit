const {test}=require('node:test'),assert=require('node:assert/strict');
const {view}=require('../miniprogram/packages/analysis/utils/color-guide');
test('result text and page headings are read verbatim from the Chinese copy configuration',()=>{
 const copy=require('../config/llm-prompt/色彩DNA/色彩类型分析/色彩类型分析-界面文案.json');
 const pageCopy=require('../config/llm-prompt/色彩DNA/色彩搭配/色彩搭配指南-界面文案.json');
 for(const hue of [0,1,2,3]){
  const g=view({geometry:{provider:'Face++',raw:{skin:{skin_hue_ha:{skin_hue:hue}}}}});
  assert.equal(g.summary,copy.results[g.ruleId].summary);
  assert.equal(g.label,copy.results[g.ruleId].label);
  assert.deepEqual(g.reportCopy,copy.report);assert.deepEqual(g.pageCopy,pageCopy);
 }
});
test('color guide selects only valid provider hue and preserves missing-data fallback',()=>{
 for(const [hue,id] of [[0,'hue-warm'],[1,'hue-neutral'],[2,'hue-cool'],[3,'general-color'],[null,'general-color'],['2','general-color']]){
  const r={profile:{gender:'男'},geometry:{provider:'Face++',raw:{skin:{skin_hue_ha:{skin_hue:hue}}}}};
  const g=view(r);assert.equal(g.ruleId,id);assert.equal(g.palettes.length,4);assert.equal(g.sections.length,3);assert.ok(g.sections.every(s=>s.images.length===2));
 }
 assert.equal(view({}).ruleId,'general-color');
});
test('unmatched gender never gets substituted male imagery',()=>{
 const g=view({profile:{gender:'女'}});assert.ok(g.sections.every(s=>s.images.length===0));assert.equal(g.palettes.length,4);
});
