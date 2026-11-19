const {test}=require('node:test');const assert=require('node:assert/strict');
const {sample,view}=require('../miniprogram/packages/analysis/utils/report-v2');
test('feature cards show concise observations and only backed dimensions, retaining evidence',()=>{
 const r=sample();r.mode='ai';r.analysis.details.features.find(f=>f.id==='eyes').label='眼型偏细长、眼距略宽';
 r.geometry={status:'available',groups:{eyes:{status:'available',scale:{status:'estimated'},measurementDefinition:{method:'features-photo-1'}}},metrics:[{id:'eyeWidthMeanMm',group:'eyes',value:23.45,unit:'mm',source:'geometry',status:'available',estimated:true,method:'iris-prior-1',definition:'features-photo-1',formula:'test'}]};
 let g=view(r).groups.find(g=>g.id==='eyes');assert.deepEqual(g.conclusions,['眼型偏细长']);assert.equal(g.blocks[0].rows[0].display,'23.45 mm');assert.equal(g.blocks[0].rows[1].display,'—');assert.equal(g.observation,'');assert.ok(g.evidenceObservation.includes('眼距略宽'));
 r.geometry.groups.eyes.scale.status='unavailable';g=view(r).groups.find(g=>g.id==='eyes');assert.equal(g.blocks[0].rows[0].display,'—');
});
