const {test}=require('node:test');
const assert=require('node:assert/strict');
const {sample,view}=require('../miniprogram/packages/analysis/utils/report-v2');
test('curvature shows its own evidence, independent of volume, and handles old reports',()=>{
 const r=sample();r.mode='real';r.analysis.details.curvature=4;
 r.analysis.details.scaleEvidence={volume:'量感依据',curvature:'轮廓过渡较柔和；侧脸信息不足。'};
 let card=view(r).referenceStyles[1];assert.equal(card.selected,4);assert.match(card.explanation,/轮廓过渡较柔和/);assert.doesNotMatch(card.explanation,/量感依据/);assert.match(card.suggestion,/圆领/);
 delete r.analysis.details.scaleEvidence;card=view(r).referenceStyles[1];assert.match(card.explanation,/未记录具体判断原因/);
 r.analysis.details.curvature=null;card=view(r).referenceStyles[1];assert.match(card.explanation,/没有足够依据/);assert.equal(card.selected,null);
});
test('volume interpretation preserves report evidence and explains clothes without changing classification',()=>{
 const r=sample();r.mode='real';r.analysis.details.volume=1;r.analysis.details.scaleEvidence={volume:'轮廓清晰，拍摄角度可能影响观感。'};
 const card=view(r).referenceStyles[0];
 assert.equal(card.selected,1);assert.match(card.explanation,/轮廓清晰/);assert.match(card.suggestion,/肩线和衣长/);assert.match(card.suggestion,/试穿参考/);
});
test('missing evidence and missing classification do not fabricate personal observations',()=>{
 const r=sample();r.mode='real';r.analysis.details.scaleEvidence={};
 assert.match(view(r).referenceStyles[0].explanation,/未记录具体判断原因/);
 r.analysis.details.volume=null;const card=view(r).referenceStyles[0];
 assert.match(card.explanation,/没有足够依据/);assert.doesNotMatch(card.suggestion,/中廓形/);
});
