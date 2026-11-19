const {test}=require('node:test'),assert=require('node:assert/strict');
const {sample,view}=require('../miniprogram/packages/analysis/utils/report-v2');
test('five-eye panel shows three conclusions, three measurement groups and a consistent ratio summary',()=>{
 const r=sample();r.mode='ai';
 const ratios=['outerR','eyeR','inner','eyeL','outerL'].map((id,i)=>({id,value:[.74,1.04,1.64,1,.76][i],unit:'ratio',group:'fiveEyes',source:'geometry'}));
 const lengths=['outerR','inner','outerL'].map((id,i)=>({id:id+'Mm',value:[16.9,37.39,17.37][i],unit:'mm',estimated:true,method:'iris-prior-1',group:'fiveEyes',source:'geometry'}));
 r.geometry={status:'available',metrics:[...ratios,...lengths],groups:{fiveEyes:{status:'available',reference:'image_right_eye_horizontal',scale:{status:'estimated'}}}};
 let g=view(r).groups[1];assert.deepEqual(g.conclusions,['左侧外眼角偏窄','内眼角间距偏宽','右侧外眼角偏窄']);
 assert.equal(g.blocks.length,3);assert.equal(g.blocks[1].rows[0].display,'37.39 mm');assert.equal(g.blocks[1].rows[1].display,'1.64');
 assert.equal(g.ratioSummary,'五眼比例　0.74 : 1.04 : 1.64 : 1.00 : 0.76');
 r.geometry.groups.fiveEyes.scale.status='unavailable';g=view(r).groups[1];assert.equal(g.blocks[0].rows[0].display,'—');assert.equal(g.blocks[0].rows[1].display,'0.74');
});
