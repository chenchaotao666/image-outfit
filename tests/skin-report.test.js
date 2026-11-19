const {test}=require('node:test'),assert=require('node:assert/strict');
const assessment=require('../miniprogram/packages/analysis/utils/report-assessment');const {sample}=require('../miniprogram/packages/analysis/utils/report-v2');
test('regional skin findings remain separate from self-reported skin type and reject missing regions',()=>{
 const r=sample();r.mode='ai';r.analysis.quality={usable:true,faceVisible:true};
 const regional={summary:'额头局部反光，眼下有暗影；需排除光线影响。',regions:['forehead','underEyes','eyeCorners','cheeks','nose','mouth'].map((id,i)=>({id,status:i===2?'uncertain':'visible',conclusion:i===2?'待复核':'局部反光',evidence:'具体照片观察',advice:'均匀光线下复核'}))};
 r.analysis.details.skinReport=regional;
 let s=assessment.view(r).skinAssessment;assert.equal(s.cards.length,6);assert.equal(s.cards[2].status,'uncertain');assert.equal(s.answered,false);assert.equal(s.type,'待补充肤质自述');assert.equal(s.photoSummary,regional.summary);
 r.skinSelfReport={tzone:'oily',cheeks:'dry'};s=assessment.view(r).skinAssessment;assert.equal(s.type,'混合倾向');assert.equal(s.cards.length,6);
 assert.throws(()=>assessment.validateSkinReport({...regional,regions:regional.regions.slice(1)}));
 delete r.analysis.details.skinReport;assert.equal(assessment.view(r).skinAssessment.cards.length,4);
 r.analysis.quality.usable=false;r.analysis.details.skinReport=regional;s=assessment.view(r).skinAssessment;assert.equal(s.regional,false);assert.equal(s.priorities.length,0);
});
