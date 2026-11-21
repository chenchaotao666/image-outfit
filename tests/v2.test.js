const {test}=require('node:test');const assert=require('node:assert/strict');
const {sample,view}=require('../miniprogram/packages/analysis/utils/report-v2');const {validate}=require('../server/analysis/details');const {createJobs}=require('../server/analysis/jobs');
test('saved reports match concrete frames by measured face without mutating stored advice',()=>{
 const r=sample();r.mode='ai';r.geometry=structuredClone(require('../config/mock/Face检测数据.json').geometry);
 const old=[{tier:'推荐',name:'略带圆角的方形框'},{tier:'可尝试',name:'合适宽度的镜框'},{tier:'谨慎选择',name:'夹脸或碰脸颊的框'}];
 r.analysis.details.glasses=old;
 const card=view(r).copy;
 assert.deepEqual(card.glasses.map(g=>g.displayName),['椭圆框眼镜','方框眼镜','圆框眼镜','半框眼镜','倒梯形框眼镜']);
 assert.deepEqual(card.glasses.map(g=>g.image),['oval.png','square.png','round.png','half-rim.png','trapezoid.png']
  .map(file=>'/packages/analysis/assets/eyewear/'+file));
 assert.deepEqual(card.eyewearRows.map(row=>row.frames.map(g=>g.shape)),[['square','round'],['half-rim','trapezoid']]);
 assert.equal(r.analysis.details.glasses,old);
 r.geometry.classifications.face='暂未识别分类';
 assert.deepEqual(view(r).copy.glasses,[]);
 assert.equal(view(r).copy.generalEyewear,true);
});
test('each face row produces the same five distinct illustrated recommendations in the report and the backend',()=>{
 const rules=require('../config/llm-prompt/形象DNA/眼镜推荐/眼镜推荐-推荐规则.json');
 const eyewear=require('../server/styling/eyewear');
 for(const [face,row] of Object.entries(rules)){
  const r=sample();r.geometry=structuredClone(require('../config/mock/Face检测数据.json').geometry);
  r.geometry.classifications.face=face;
  eyewear.apply(r.analysis,r.geometry);
  const saved=validate(r.analysis.details).glasses;
  assert.deepEqual(saved.map(g=>g.name).sort(),['椭圆框','方框','圆框','半框','倒梯形框'].sort());
  assert.deepEqual(saved.map(g=>g.name),[row['最合适'],...row['一般'],...row['不推荐']]);
  const card=view(r).copy;
  assert.deepEqual(card.glasses.map(g=>g.name),saved.map(g=>g.name));
  assert.ok(card.glasses.every(g=>g.shape&&g.image&&g.reason));
  assert.deepEqual(card.eyewearRows.map(row=>row.frames.length),[2,2]);
 }
 const d=sample().analysis.details;
 assert.throws(()=>validate({...d,glasses:d.glasses.slice(0,3)}),{code:'INVALID_MODEL_OUTPUT'});
 assert.throws(()=>validate({...d,glasses:d.glasses.map(g=>({...g,name:'圆框'}))}),{code:'INVALID_MODEL_OUTPUT'});
});
test('V2 details enforce every feature, bounded scales and complete seasons',()=>{
 const d=sample().analysis.details;assert.equal(validate(d).features.length,6);
 assert.throws(()=>validate({...d,volume:8}),{code:'INVALID_MODEL_OUTPUT'});
 assert.throws(()=>validate({...d,features:d.features.slice(1)}),{code:'INVALID_MODEL_OUTPUT'});
 assert.throws(()=>validate({...d,outfits:d.outfits.slice().reverse()}),{code:'INVALID_MODEL_OUTPUT'});
 assert.throws(()=>validate({...d,outfits:d.outfits.map(o=>({...o,colors:['red','blue']}))}),{code:'INVALID_MODEL_OUTPUT'});
});
test('report has honest missing geometry and exact normalized wardrobe totals for every scenario',()=>{
 for(const occasion of ['日常休闲','商务通勤','社交聚会']){const r=sample();r.preferences.occasion=occasion;const v=view(r);assert.equal(v.wardrobe.reduce((s,x)=>s+x.percent,0),100);assert.equal(v.wardrobe.reduce((s,x)=>s+x.count,0),v.total);assert.equal(v.groups.length,9);assert.equal(v.metricCount,0);assert.equal(v.bmi,'22.9');assert.equal(v.basePercent+v.fashionPercent,100);}
});
test('geometry is shown only from its source and is not replaced by generated copy',()=>{
 const r=sample();r.geometry={status:'available',metrics:[{id:'inner',group:'fiveEyes',value:1.123,unit:'ratio',label:'内眼角间距',source:'geometry'}]};const v=view(r);assert.equal(v.groups.find(x=>x.id==='fiveEyes').rows[0].display,'1.123 倍');assert.equal(v.groups[0].rows.length,0);
});
test('demo examples are explicitly separate from personal measurements',()=>{
 const r=sample(),v=view(r);assert.equal(v.metricCount,0);assert.equal(r.geometry.metrics.length,0);
 assert.equal(v.measurementSummary.example,true);assert.equal(v.groups.length,9);
 assert.ok(v.groups.every(g=>g.rows.length>0&&g.source.includes('示例')&&g.rows.every(row=>row.source==='demo')));
 r.mode='ai';r.geometry={status:'unavailable',reason:'本地服务暂不可用',metrics:[]};
 const actual=view(r);assert.ok(actual.groups.every(g=>g.rows.length===0));assert.ok(actual.groups.every(g=>g.reason==='本地服务暂不可用'));
});
test('partial geometry retains reasons, percent units and per-group expression failures',()=>{
 const r=sample();r.mode='ai';r.geometry={status:'available',version:'mesh-ratios-2',metrics:[{id:'middleShare',group:'thirds',label:'眉线至鼻底占比',value:49,unit:'percent',source:'geometry',formula:'中段 / 总段 × 100'}],groups:{thirds:{status:'partial',reason:'完整三庭缺发际线'},eyes:{status:'unavailable',reason:'检测到眨眼'}}};
 const v=view(r);assert.equal(v.groups[0].rows[0].display,'49%');assert.equal(v.groups[0].status,'partial');assert.equal(v.groups[0].rows[0].formula,'中段 / 总段 × 100');assert.equal(v.groups.find(g=>g.id==='eyes').reason,'检测到眨眼');assert.equal(v.measurementSummary.version,'mesh-ratios-2');
});
const input=()=>({profile:{gender:'男',age:28,height:175,weight:140},images:{face:'local-test-image',body:null},preferences:{occasion:'日常休闲'}});
test('curvature is independent, optional for old reports, and never filled from dynamics',()=>{
 const r=sample(),d=r.analysis.details;d.curvature=4;d.dynamics=0;
 assert.equal(validate(d).curvature,4);assert.equal(view(r).referenceStyles[1].selected,4);
 delete d.curvature;assert.equal(validate(d).curvature,null);assert.equal(view(r).referenceStyles[1].selected,null);
 assert.throws(()=>validate({...d,curvature:5}),{code:'INVALID_MODEL_OUTPUT'});
 assert.equal(view(r).referenceColors.length,3);
 assert.equal(new Set(view(r).groups.map(g=>g.diagram)).size,9);
});
const geometry=async()=>({status:'available',metrics:[]});
test('jobs enforce owner, preserve idempotency and complete schema V2',async()=>{
 let calls=0;const jobs=createJobs(async()=>{calls++;return sample().analysis;},{apiKey:'mock'},geometry);const owner={};const job=jobs.create(input(),owner,'request-123');assert.equal(jobs.create(input(),owner,'request-123').id,job.id);
 assert.throws(()=>jobs.read(job.id,{}),{code:'NOT_FOUND'});await new Promise(r=>setTimeout(r,20));const done=jobs.read(job.id,owner);assert.equal(done.status,'completed');assert.equal(calls,1);assert.equal(done.report.schemaVersion,2);assert.equal(done.report.profile.weight,70);assert.equal(JSON.stringify(done).includes('local-test-image'),false);
});
test('cancel stops publication and failed jobs never return demo results',async()=>{
 const owner={};const jobs=createJobs(async()=>{await new Promise(r=>setTimeout(r,30));return sample().analysis;},{apiKey:'mock'},geometry);const j=jobs.create(input(),owner,'request-cancel');jobs.cancel(j.id,owner);await new Promise(r=>setTimeout(r,50));assert.equal(jobs.read(j.id,owner).status,'cancelled');assert.equal(jobs.read(j.id,owner).report,null);
 const bad=createJobs(async()=>{throw Error('secret-body');},{apiKey:'mock'},geometry);const b=bad.create(input(),owner,'request-fail');await new Promise(r=>setTimeout(r,20));assert.equal(bad.read(b.id,owner).status,'failed');assert.equal(bad.read(b.id,owner).report,null);assert.equal(JSON.stringify(bad.read(b.id,owner)).includes('secret-body'),false);
});
