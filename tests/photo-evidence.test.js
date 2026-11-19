const {test}=require('node:test');const assert=require('node:assert/strict');
test('photo evidence is stored separately, reopens and is deleted with report',()=>{
 const memory={};global.wx={getStorageSync:k=>memory[k],setStorageSync:(k,v)=>memory[k]=v,removeStorageSync:k=>delete memory[k]};
 const store=require('../miniprogram/shared/report-store');
 store.save({id:'photo-test',photoEvidence:{photo:'compressed-image',version:'photo-evidence-1'}});
 assert.equal(store.reports()[0].photoEvidence,undefined);assert.equal(store.get('photo-test').photoEvidence.photo,'compressed-image');
 store.save({id:'photo-test',summary:'updated'});assert.equal(store.get('photo-test').photoEvidence.photo,'compressed-image');
 store.remove('photo-test');assert.equal(store.get('photo-test'),undefined);assert.ok(!Object.values(memory).some(v=>v?.photo));
});
test('annotation images are withheld from model text and returned with completed report',async()=>{
 const {createJobs}=require('../server/analysis/jobs');const {sample}=require('../miniprogram/packages/analysis/utils/report-v2');
 const owner={};const jobs=createJobs(async input=>{assert.equal(input.geometry.photoEvidence,undefined);assert.equal(input.geometry.skinCrops,undefined);assert.equal(input.skinCrops[0].id,'nose');return sample().analysis;},{apiKey:'test'},async()=>({status:'available',metrics:[],skinCrops:[{id:'nose',image:'crop'}],photoEvidence:{photo:'preview',version:'photo-evidence-1'}}));
 const input={images:{face:'photo'},profile:{weight:140},preferences:{}};
 const j=jobs.create(input,owner,'test-evidence-123');await new Promise(r=>setTimeout(r,20));
 const done=jobs.read(j.id,owner);assert.equal(done.status,'completed');assert.equal(done.report.photoEvidence.photo,'preview');
 assert.equal(done.report.geometry.skinCrops,undefined);assert.equal(input.skinCrops,null);
});
