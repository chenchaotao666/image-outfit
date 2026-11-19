const {test}=require('node:test'),assert=require('node:assert/strict');
const {sample}=require('../miniprogram/packages/analysis/utils/report-v2'),personal=require('../server/styling/personal-style'),judgment=require('../server/styling/style-judgment');
const geometry=require('../config/mock/Face检测数据.json').geometry;
test('all six model styles are preserved with detection evidence, never replaced by preference',()=>{
 const k=personal.load();
 for(let index=0;index<6;index++){
  const r=sample();r.analysis.details.styleIndex=index;r.analysis.details.styleReason='根据粗眉、大眼及瓜子脸轮廓综合推荐。';
  const audit=personal.apply(r.analysis,geometry,k);assert.equal(audit.index,index);assert.equal(r.analysis.details.styleIndex,index);assert.ok(audit.facts.every(f=>f.source==='Face++'));assert.ok(audit.reason.includes('粗眉'));
 }
 const r=sample();const audit=personal.apply(r.analysis,{style:'简洁耐看'},k);assert.equal(audit.index,null);
});
test('dynamics preserves supported model recommendation and ignores legacy preferences',()=>{
 const k=judgment.load();for(let index=0;index<5;index++){
  const r=sample();r.analysis.details.dynamics=index;r.analysis.details.scaleEvidence={dynamics:'依据五官与轮廓特征安排细节。'};
  const audit=judgment.apply(r.analysis,geometry,k,{style:'简洁耐看'});assert.equal(r.analysis.details.dynamics,index);assert.equal(audit.dimensions.find(x=>x.id==='dynamics').result,index);
 }
 const r=sample();judgment.apply(r.analysis,{},k,{style:'简洁耐看'});assert.equal(r.analysis.details.dynamics,null);
});
