const test=require('node:test'),assert=require('node:assert/strict');
const replay=require('../server/providers/face-mock'),{detect}=require('../server/providers/faceplusplus');
const config={apiKey:'test',faceMock:{enabled:true,dataFile:'mock/Face检测数据.json'}};
const noCall=()=>{throw Error('Mock must not call a provider or image preparation');};
test('mock replays saved geometry without credentials, network or image processing',async()=>{
 const signal=new AbortController().signal;
 const g=await detect('not-sent',signal,config,noCall,noCall);
 const saved=require('../config/mock/Face检测数据.json').geometry;
 assert.deepEqual(g.classifications,saved.classifications);assert.deepEqual(g.metrics,saved.metrics);
 assert.deepEqual(g.raw,saved.raw);assert.equal(g.skin.items.length,13);assert.equal(g.mock.enabled,true);
 assert.equal(g.photoEvidence,undefined);assert.equal(g.requests,undefined);
 g.classifications.face='changed';assert.notEqual(replay.load(config).geometry.classifications.face,'changed');
 await assert.rejects(detect('not-sent',signal,{faceMock:{enabled:false}},noCall,noCall),{code:'FACE_NOT_CONFIGURED'});
 await assert.rejects(detect('not-sent',signal,{faceMock:{enabled:true,dataFile:'missing.json'}},noCall,noCall),{code:'FACE_MOCK_INVALID'});
 await assert.rejects(detect('not-sent',signal,{faceMock:{enabled:true,dataFile:'../package.json'}},noCall,noCall),{code:'FACE_MOCK_INVALID'});
});
test('mock skips age and body endpoints without inventing unavailable results',async()=>{
 await assert.rejects(require('../server/providers/face-age').detectAge('not-sent',config,noCall,noCall),{code:'FACE_MOCK_AGE_UNAVAILABLE'});
 const result=await require('../server/providers/body-measurements').detectBody('not-sent',175,new AbortController().signal,config,noCall,noCall);
 assert.equal(result.mock,true);assert.equal(result.status,'unavailable');assert.deepEqual(result.metrics,[]);
 const abort=new AbortController();abort.abort();await assert.rejects(detect('not-sent',abort.signal,config,noCall,noCall));
});
test('job uses replay detection but still runs the LLM and records mock provenance',async()=>{
 let called=0;
 const jobs=require('../server/analysis/jobs').createJobs(async input=>{
  called++;assert.equal(input.geometry.mock.enabled,true);assert.deepEqual(input.preferences,{});
  const analysis=require('../miniprogram/packages/analysis/utils/report-v2').sample().analysis;
  analysis.details.styleIndex=2;analysis.details.styleReason='瓜子脸轮廓与粗眉、大眼共同作为本次造型推荐依据。';
  analysis.details.dynamics=1;analysis.details.scaleEvidence={dynamics:'根据本次五官的视觉重点推荐少量设计细节。'};
  return analysis;
 },config);
 const owner={},job=jobs.create({profile:{gender:'男',age:34,height:175,weight:140},preferences:{style:'简洁耐看',occasion:'日常休闲'},images:{face:'not-sent'}},owner,'mock-test-1234');
 let current;
 for(let i=0;i<30;i++){current=jobs.read(job.id,owner);if(current.status!=='running')break;await new Promise(resolve=>setTimeout(resolve,5));}
 assert.equal(current.status,'completed',JSON.stringify(current.error));assert.equal(called,1);
 assert.equal(current.report.geometry.mock.enabled,true);assert.ok(current.report.analysis.warnings.some(w=>w.includes('Face Mock')));
 assert.equal(current.report.photoEvidence,undefined);
 assert.deepEqual(current.report.preferences,{});
 assert.equal(current.report.analysis.details.styleIndex,2);
 assert.equal(current.report.personalStyleAudit.result,'儒雅精致');
 assert.equal(current.report.analysis.details.dynamics,1);
});
