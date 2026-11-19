const {test}=require('node:test');const assert=require('node:assert/strict');
const a=require('../miniprogram/packages/analysis/utils/report-assessment');const {sample}=require('../miniprogram/packages/analysis/utils/report-v2');
function fixture(){return {version:'skin-concerns-1',items:a.SKIN_CONCERNS.map(([id,name,regions],i)=>({id,status:i%3===0?'present':i%3===1?'not_observed':'uncertain',severity:i%3===0?'slight':i%3===1?'none':'unknown',regionIds:[regions[0]],evidence:'测试：对应局部可见外观',advice:'测试：均匀光线下复核'}))};}
test('13 concerns enforce states, matching regions and fine-detail quality without inventing negatives',()=>{
 const raw=fixture();const geometry={skinRegions:[...new Set(a.SKIN_CONCERNS.flatMap(x=>x[2]))].map(id=>({id,usable:true,detailUsable:true}))};
 const context={quality:{usable:true,faceVisible:true},geometry,requireSkinConcerns:true};
 assert.equal(a.validateSkinConcerns(raw,context).items.length,13);
 assert.throws(()=>a.validateSkinConcerns(null,context));
 assert.throws(()=>a.validateSkinConcerns({...raw,items:raw.items.slice(1)}));
 const wrong=fixture();wrong.items[0].regionIds=['nose'];assert.throws(()=>a.validateSkinConcerns(wrong));
 wrong.items[0].regionIds=['leftEye'];wrong.items[0].severity='none';assert.throws(()=>a.validateSkinConcerns(wrong));
 context.geometry.skinRegions.forEach(r=>r.detailUsable=false);
 const result=a.validateSkinConcerns(raw,context);assert.equal(result.items[6].status,'uncertain');assert.equal(result.items[10].status,'uncertain');assert.equal(result.items[0].status,'present');
 context.quality.usable=false;assert.ok(a.validateSkinConcerns(raw,context).items.every(x=>x.status==='uncertain'));
});
test('specific findings drive cards and summary; old reports keep observations',()=>{
 const r=sample();r.mode='ai';r.analysis.quality={usable:true,faceVisible:true};r.analysis.details.skinConcerns=fixture();
 const v=a.view(r).skinAssessment;assert.equal(v.cards.length,13);assert.match(v.photoSummary,/眼袋/);assert.match(v.notObserved,/黑眼圈/);assert.match(v.uncertain,/抬头纹/);
 delete r.analysis.details.skinConcerns;assert.equal(a.view(r).skinAssessment.specific,false);
});
test('provider receives named local images, not base64 embedded in measurement text',()=>{
 const {payload}=require('../server/providers/deepseek');const input={profile:{weight:140},geometry:{skinRegions:[{id:'nose',usable:true}]},images:{face:'whole-photo'},skinCrops:[{id:'nose',name:'鼻部',image:'local-photo'}]};
 const content=payload(input,'test').messages[1].content;
 assert.equal(content.filter(x=>x.type==='image_url').length,2);assert.ok(content.some(x=>x.text?.includes('regionId=nose')));assert.ok(!content[0].text.includes('local-photo'));
});
module.exports={fixture};
