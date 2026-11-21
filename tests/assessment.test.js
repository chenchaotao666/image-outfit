const test=require('node:test'),assert=require('node:assert/strict');
const model=require('../miniprogram/packages/analysis/utils/report-assessment'),{sample}=require('../miniprogram/packages/analysis/utils/report-v2'),{validate}=require('../server/analysis/details');
function report(){const r=sample();r.mode='ai';r.analysis.quality={usable:true,faceVisible:true,bodyVisible:true};r.analysis.details.stylingScore={version:'styling-v1',items:model.DIMENSIONS.map(([id])=>({id,level:4,evidence:'照片中可见的具体依据',advice:'可执行建议'}))};return r;}
test('shared score configuration controls calculation, labels and model instructions',()=>{
 const config=require('../config/llm-prompt/形象DNA/造型评分/造型评分-评分规则.json');
 assert.deepEqual(model.DIMENSIONS,config.dimensions.map(d=>[d.id,d.name,d.weight]));
 const prompt=require('../server/styling/styling-prompts').render({}).details;
 assert.ok(prompt.includes(JSON.stringify(config.dimensions)));
 assert.ok(prompt.includes(config.scope));
 for(const level of config.levels)assert.ok(prompt.includes(level.description));
 const fs=require('node:fs'),changed=JSON.parse(JSON.stringify(model.SCORE));
 changed.dimensions[0].weight=40;changed.dimensions[1].weight=15;
 changed.bands[1].label='配置里的结果名称';
 const isolated={exports:{}};
 Function('module','require',fs.readFileSync(require.resolve('../miniprogram/packages/analysis/utils/report-assessment'),'utf8'))(isolated,()=>changed);
 const r=report();r.analysis.details.stylingScore.items[0].level=1;
 const score=isolated.exports.view(r).stylingScore;
 assert.equal(score.total,70);assert.equal(score.label,'配置里的结果名称');
});
test('styling score weights total 100; missing evidence, old reports and absent body cannot produce total',()=>{
 const r=report();assert.equal(model.view(r).stylingScore.total,100);
 r.analysis.details.stylingScore.items[0].level=0;assert.equal(model.view(r).stylingScore.total,70);
 r.analysis.details.stylingScore.items[0].level=null;assert.equal(model.view(r).stylingScore.total,null);
 r.analysis.quality.bodyVisible=false;assert.equal(model.view(r).stylingScore.count,1);
 r.analysis.quality.usable=false;assert.equal(model.view(r).stylingScore.count,0);
 delete r.analysis.details.stylingScore;assert.equal(model.view(r).stylingScore.total,null);
 assert.equal(model.view(sample()).stylingScore.example,true);
});
test('server rejects out-of-range levels and incorrect observation schema',()=>{
 const d=report().analysis.details;assert.equal(validate(d).stylingScore.items.length,5);
 d.stylingScore.items[0].level=4.1;assert.throws(()=>validate(d),{code:'INVALID_MODEL_OUTPUT'});
 d.stylingScore=null;d.skinObservations=model.SKIN.map(([id])=>({id,status:'visible',evidence:'照片细节可见',advice:'自然光复核'}));assert.equal(validate(d).skinObservations.length,4);
 d.skinObservations[0].status='healthy';assert.throws(()=>validate(d),{code:'INVALID_MODEL_OUTPUT'});
});
test('explicit absence of full body input overrides a stale model visibility flag',()=>{
 const r=report();r.photoInputs={body:false};assert.equal(model.view(r).stylingScore.total,null);assert.equal(model.view(r).stylingScore.count,1);
 delete r.photoInputs;r.geometry={body:{status:'not_provided'}};assert.equal(model.view(r).stylingScore.total,null);
});
test('skin self-report remains separate from observations and unknown stays unknown',()=>{
 const r=report();r.skinSelfReport={tzone:'oily',cheeks:'dry'};assert.equal(model.view(r).skinAssessment.type,'混合倾向');assert.equal(model.view(r).skinAssessment.visible,0);
 r.skinSelfReport.cheeks='unknown';assert.equal(model.view(r).skinAssessment.answered,false);
 r.manualMeasurements={waist:80,hip:100,leg:90};assert.equal(model.view(r).bodyRatios.waistHip,'0.80');assert.equal(model.view(r).bodyRatios.legHeight,'51%');
});
