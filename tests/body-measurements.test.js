const test=require('node:test'),assert=require('node:assert/strict');
const {estimate,detectBody}=require('../server/providers/body-measurements');
const {bodyMeasurements}=require('../miniprogram/packages/analysis/utils/report-reference');
function fixture(){
 const positions={head:[150,10],neck:[150,120],left_shoulder:[60,130],right_shoulder:[240,130],left_elbow:[40,280],right_elbow:[260,280],left_hand:[30,410],right_hand:[270,410],left_buttocks:[110,420],right_buttocks:[190,420],left_knee:[110,610],right_knee:[190,610],left_foot:[110,780],right_foot:[190,780]};
 return {skeletons:[{body_rectangle:{left:100,top:100,width:300,height:800},landmark:Object.fromEntries(Object.entries(positions).map(([k,[x,y]])=>[k,{x,y,score:.9}]))}]};
}
const dimensions={width:500,height:1000};
test('photo estimates convert rectangle-relative points, preserve hand semantics and scale with height',()=>{
 const r=estimate(fixture(),dimensions,180);assert.equal(r.status,'available');
 assert.equal(r.metrics.find(x=>x.id==='shoulder').value,40.5);
 assert.deepEqual(r.metrics[0].points[0],[.32,.23]);
 assert.equal(r.metrics.find(x=>x.id==='leg').value,81);
 assert.ok(!r.metrics.some(x=>['waist','hip','hand','forearm','arm'].includes(x.id)));
 assert.equal(estimate(fixture(),dimensions,160).metrics[0].value,36);
});
test('reject cropped, multiple, weak landmarks and walking poses rather than fabricate dimensions',()=>{
 const changes=[r=>r.skeletons.push(r.skeletons[0]),r=>r.skeletons[0].body_rectangle.top=0,r=>r.skeletons[0].landmark.head.score=.2,r=>delete r.skeletons[0].landmark.head,r=>r.skeletons[0].landmark.left_foot.y=730];
 for(const change of changes){const r=fixture();change(r);assert.equal(estimate(r,dimensions,180).status,'unavailable');}
});
test('no photo makes no API request; provider errors degrade gracefully and aborts propagate',async()=>{
 let calls=0;const signal=new AbortController().signal;
 const fail=async()=>{calls++;return {ok:false,json:async()=>({error_message:'AUTHORIZATION_ERROR: denied'})};};
 const config={faceApiKey:'test',faceApiSecret:'test'},prepare=async()=>({face:'data:image/jpeg;base64,YQ==',...dimensions});
 assert.equal((await detectBody(null,180,signal,config,fail,prepare)).status,'not_provided');assert.equal(calls,0);
 assert.equal((await detectBody('image',180,signal,config,fail,prepare)).code,'AUTHORIZATION_ERROR');
 const controller=new AbortController();controller.abort();
 await assert.rejects(detectBody('image',180,controller.signal,config,async()=>{throw Error('abort');},prepare),{code:'CANCELLED'});
});
test('reference fallback is explicitly approximate, weight does not invent limb lengths; manual corrections win',()=>{
 const report={profile:{age:30,height:180,weight:75}};
 let rows=bodyMeasurements(report);assert.equal(rows.find(x=>x.id==='shoulder').display,'约 46.4 cm');
 assert.equal(rows.find(x=>x.id==='waist').display,'—');assert.equal(rows.find(x=>x.id==='hip').display,'—');
 report.profile.weight=95;assert.deepEqual(bodyMeasurements(report),rows);
 report.geometry={body:estimate(fixture(),dimensions,180)};
 rows=bodyMeasurements(report);assert.equal(rows.find(x=>x.id==='shoulder').source,'照片估算');assert.equal(rows.find(x=>x.id==='hand').source,'身高比例参考');
 assert.equal(bodyMeasurements(report,{shoulder:42})[0].display,'42.0 cm');
 report.profile.height=170;assert.equal(bodyMeasurements(report)[0].source,'身高比例参考');
 delete report.geometry;report.profile.age=12;assert.equal(bodyMeasurements(report)[0].display,'—');
});
