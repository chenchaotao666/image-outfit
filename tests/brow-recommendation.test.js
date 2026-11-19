const {test}=require('node:test');
const assert=require('node:assert/strict');
const {view}=require('../miniprogram/packages/analysis/utils/brow-recommendation');
test('feature utilities resolve transitive dependencies from their relocated package',()=>{
 for(const name of ['analysis','api','report-reference','report-assessment']) require('../miniprogram/packages/analysis/utils/'+name);
 const model=require('../miniprogram/packages/analysis/utils/report-v2');assert.ok(model.view(model.sample()).browRecommendation.name);
});
test('structured brow recommendation is preserved and incomplete steps rejected',()=>{
 const {sample}=require('../miniprogram/packages/analysis/utils/report-v2');const {validate}=require('../server/analysis/details');
 const d=sample().analysis.details;
 d.browRecommendation={name:'自然平直眉',reason:'保留自然走向',steps:['梳理眉头','清理杂毛','整理眉尾']};
 assert.deepEqual(validate(d).browRecommendation,d.browRecommendation);
 d.browRecommendation.steps=['缺少步骤'];assert.throws(()=>validate(d),{code:'INVALID_MODEL_OUTPUT'});
});
test('brow card preserves original face evidence and does not invent legacy recommendation reasons',()=>{
 const report={face:'旧名称',mode:'ai',analysis:{face:{label:'偏长椭圆脸',observations:['纵向线条明显'],limitations:['俯仰影响']},details:{browAdvice:'保持自然平直眉形，修剪杂毛；眉尾略收。'}}};
 const card=view(report);
 assert.equal(card.faceLabel,'偏长椭圆脸');assert.equal(card.name,'自然平直眉形');
 assert.deepEqual(card.observations,['纵向线条明显']);assert.equal(card.steps.length,2);
 assert.match(card.reason,/未单独记录/);
 report.analysis.details.browAdvice='不推荐剑眉。保留自然眉峰。';assert.equal(view(report).name,'自然眉型整理');
 report.analysis.details.browRecommendation={name:'柔和弯眉',reason:'保留已有眉峰',steps:['梳理眉头','清理杂毛','整理眉尾']};
 assert.equal(view(report).name,'柔和弯眉');assert.equal(view(report).reason,'保留已有眉峰');
});
