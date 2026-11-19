const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const {adapt,detect,applyDetection}=require('../server/providers/faceplusplus');const {sample,view}=require('../miniprogram/packages/analysis/utils/report-v2');const {analyze,payload}=require('../server/providers/deepseek');
const features={request_id:'feature-test',result:{face:{face_type:'pointed_face',face_length:184.5},three_parts:{one_part:{faceup_length:65.17,faceup_ratio:.35,faceup_result:'faceup_long'},two_part:{facemid_length:66.48,facemid_ratio:.36,facemid_result:'facemid_long'},three_part:{facedown_length:52.85,facedown_ratio:.29,facedown_result:'facedown_short'}},eyes:{eyes_type:'big_eyes',eye_width:24.51,eye_height:8.49},eyebrow:{eyebrow_type:'bushy_eyebrows',brow_width:40.65,brow_height:13.75,brow_uptrend_angle:21.11,brow_camber_angle:2.08,brow_thick:9.6},nose:{nose_type:'normal_nose',nose_width:39.46},mouth:{mouth_type:'normal_lip'},jaw:{jaw_type:'sharp_jaw'},five_eyes:{eyes_ratio:'0.74:1.05:1.57:1:0.69'}}};
const skin={request_id:'skin-test',result:{eye_pouch:{value:0,confidence:.99},dark_circle:{value:2,confidence:.95},pores_forehead:{value:1,confidence:.57},acne:{rectangle:[]},skin_spot:{rectangle:[{left:2,top:3,width:4,height:5}]}}};
const face='data:image/jpeg;base64,'+fs.readFileSync('miniprogram/assets/face.jpg').toString('base64');
const config={faceApiKey:'secret-key',faceApiSecret:'secret-secret',apiKey:'model-key',baseUrl:'https://api.deepseek.com',model:'deepseek-flash',timeout:1000};
test('Face++ adapter preserves provider classifications, lengths and missing values without local rules',()=>{
 const g=adapt(features,skin),r=sample();r.mode='ai';r.geometry=g;r.analysis=applyDetection(r.analysis,g);r.face=r.analysis.face.label;
 const v=view(r);assert.equal(r.face,'瓜子脸');assert.equal(v.groups[0].conclusions[0],'上庭偏长');assert.equal(v.groups[0].blocks[0].rows[0].display,'65.17');assert.equal(v.groups.find(x=>x.id==='brows').rows.length,5);assert.equal(v.skinAssessment.cards.find(x=>x.id==='darkCircles').conclusion,'检出');assert.equal(v.skinAssessment.cards.find(x=>x.id==='spots').status,'present');assert.equal(v.skinAssessment.cards.find(x=>x.id==='chinPores').status,'uncertain');assert.ok(!JSON.stringify(v.groups).includes('iris-prior'));
});
test('two Face++ endpoints run sequentially once, credentials never enter result, and no fallback on failure',async()=>{
 const calls=[],signal=new AbortController().signal,prepare=async()=>({face,preview:face,width:800,height:800});
 const fetcher=async(url,opts)=>{calls.push(url);assert.equal(opts.body.get('api_secret'),'secret-secret');return {ok:true,json:async()=>url.endsWith('facialfeatures')?features:skin};};
 const g=await detect(face,signal,config,fetcher,prepare);assert.equal(calls.length,2);assert.ok(calls[0].endsWith('/facialfeatures'));assert.ok(calls[1].endsWith('/skinanalyze_advanced'));assert.ok(!JSON.stringify(g).includes('secret-secret'));
 let failedCalls=0;await assert.rejects(detect(face,signal,config,async()=>{failedCalls++;return {ok:false,status:403,json:async()=>({error_message:'CONCURRENCY_LIMIT_EXCEEDED'})};},prepare),{code:'FACE_DETECTION_FAILED'});assert.equal(failedCalls,1);
 await assert.rejects(detect(face,signal,{},fetcher,prepare),{code:'FACE_NOT_CONFIGURED'});
 const cancelled=new AbortController();cancelled.abort();await assert.rejects(detect(face,cancelled.signal,config,fetcher,prepare));assert.equal(calls.length,2);
});
test('LLM cannot replace Face++ detections and receives no local crop detection prompt',async()=>{
 const g=adapt(features,skin),raw=JSON.parse(JSON.stringify(require('./ai-fixture.cjs')));raw.details=sample().analysis.details;raw.face.label='错误脸型';raw.quality.usable=false;
 const input={profile:{weight:140},preferences:{},images:{face},geometry:g,reportVersion:2,skinAnalysisVersion:'skin-concerns-1'};
 const p=payload(input,'deepseek-flash');assert.ok(p.messages[0].content.includes('禁止重新判断'));assert.ok(!p.messages[0].content.includes('geometry.skinRegions'));
 const a=await analyze(input,config,new AbortController().signal,async()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(raw)}}]})}));
 assert.equal(a.face.label,'瓜子脸');assert.equal(a.details.features.find(x=>x.id==='eyes').label,'大眼');assert.equal(a.details.skinConcerns.items.find(x=>x.id==='spots').status,'present');
});
