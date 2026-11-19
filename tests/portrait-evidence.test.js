const {test}=require('node:test');
const assert=require('node:assert/strict');
const {sample,view}=require('../miniprogram/packages/analysis/utils/report-v2');
const {validate}=require('../server/analysis/details');
const {analyze}=require('../server/providers/deepseek');
const fixture=require('./ai-fixture.cjs');

test('failed measurements cannot reappear from stale cached rows and style axes have no fabricated scores',()=>{
 const r=sample();r.mode='ai';const metric={id:'inner',group:'fiveEyes',source:'geometry',status:'available',value:1.6};
 r.geometry={status:'unavailable',metrics:[metric]};assert.equal(view(r).metricCount,0);
 r.geometry={status:'available',metrics:[metric],groups:{fiveEyes:{status:'unavailable'}}};assert.equal(view(r).metricCount,0);
 r.geometry={status:'available',metrics:[{...metric,status:'unavailable'}]};assert.equal(view(r).metricCount,0);
 const radar=view(r).radar;assert.equal(radar.filter(x=>x.selected).length,1);assert.ok(radar.every(x=>!('value' in x)));
});

test('combined styling keeps curved lines independent from garment size',()=>{
 const r=sample();Object.assign(r.analysis.details,{volume:1,curvature:4,dynamics:0});
 const v=view(r),rows=v.styleCombination.rows;
 assert.equal(rows[0].value,'中大廓形');assert.equal(rows[1].value,'曲线感');
 assert.doesNotMatch(rows[1].advice,/小廓形|修身|短小/);
 assert.match(v.styleCombination.note,/不决定衣服大小/);
 r.analysis.details.volume=null;assert.equal(view(r).styleCombination.rows[0].value,'待补充');
 assert.equal(v.overview.length,3);
});

test('ratio summaries preserve supplied values and require every component',()=>{
 const r=sample();r.mode='ai';r.geometry={status:'available',metrics:['outerR','eyeR','inner','eyeL','outerL'].map((id,i)=>({id,group:'fiveEyes',value:[.707,1.006,1.6,.972,.731][i],source:'geometry',unit:'ratio'}))};
 assert.equal(view(r).groups.find(x=>x.id==='fiveEyes').ratioSummary,'五眼比例　0.71 : 1.01 : 1.60 : 0.97 : 0.73');
 r.geometry.metrics.pop();assert.equal(view(r).groups.find(x=>x.id==='fiveEyes').ratioSummary,'');
});

test('only available same-group measurement references survive validation',()=>{
 const r=sample(),d=r.analysis.details;
 d.features[0].metricIds=['browWidthR','browWidthR','noseWidth','invented','hidden'];
 const geometry={status:'available',metrics:[{id:'browWidthR',group:'brows',source:'geometry',status:'available',value:.28,label:'眉宽',unit:'ratio'},{id:'noseWidth',group:'nose',source:'geometry',status:'available',value:.3},{id:'hidden',group:'brows',source:'geometry',status:'unavailable',value:.2}]};
 r.analysis.details=validate(d,{geometry});
 assert.deepEqual(r.analysis.details.features[0].metricIds,['browWidthR']);
 r.mode='ai';r.geometry=geometry;
 assert.match(view(r).groups.find(x=>x.id==='brows').observation,/0.28/);
 assert.deepEqual(validate(d).features[0].metricIds,[]);
});

test('missing body clears body scores but preserves an observed detail score of zero',()=>{
 const d=sample().analysis.details;
 d.stylingScore={version:'styling-v1',items:['fit','color','style','occasion','detail'].map(id=>({id,level:0,evidence:'可见依据',advice:'整理细节'}))};
 const validated=validate(d,{quality:{usable:true,faceVisible:true,bodyVisible:false}});
 assert.deepEqual(validated.stylingScore.items.map(x=>x.level),[null,null,null,null,0]);
 assert.ok(validate(d,{quality:{usable:false,faceVisible:false,bodyVisible:false}}).stylingScore.items.every(x=>x.level===null));
});

test('legacy evidence stays empty and uncertainty remains visible',()=>{
 const r=sample(),d=r.analysis.details;
 delete d.scaleEvidence;assert.deepEqual(validate(d).scaleEvidence,{});
 d.scaleEvidence=Object.fromEntries(['volume','curvature','dynamics','lightness','chroma','temperature'].map(k=>[k,'照片依据及限制']));
 assert.deepEqual(validate(d).scaleEvidence,d.scaleEvidence);
 assert.throws(()=>validate({...d,scaleEvidence:{}}),{code:'INVALID_MODEL_OUTPUT'});
 r.face=r.analysis.face.label='偏长脸（视觉估计，低可信度）';
 const shown=view(r);assert.match(JSON.stringify(shown),/偏长脸（视觉估计，低可信度）/);
 assert.match(shown.groups.find(x=>x.id==='outline').conclusions[0],/低可信度/);
});

test('malformed output retries once and unavailable geometry caps confidence',async()=>{
 const input={profile:{weight:140},preferences:{},images:{face:'test'},geometry:{status:'unavailable'}};
 const config={apiKey:'test',baseUrl:'https://example.invalid',model:'mock',timeout:1000};
 const signal=new AbortController().signal;let calls=0;
 const mock=async(url,opts)=>{calls++;if(calls===2)assert.match(JSON.parse(opts.body).messages[0].content,/JSON/);return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:calls===1?'invalid':JSON.stringify({...fixture,face:{...fixture.face,confidence:'high'}})}}]})};};
 assert.equal((await analyze(input,config,signal,mock)).face.confidence,'low');assert.equal(calls,2);
 calls=0;await assert.rejects(analyze(input,config,signal,async()=>{calls++;return {ok:true,json:async()=>({choices:[]})};}),{code:'INCOMPLETE_MODEL_OUTPUT'});assert.equal(calls,2);
 calls=0;await assert.rejects(analyze(input,config,signal,async()=>{calls++;return {ok:false,status:401};}),{code:'MODEL_AUTH'});assert.equal(calls,1);
});
