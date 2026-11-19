const {test}=require('node:test');
const assert=require('node:assert/strict');
const {sample,view}=require('../miniprogram/packages/analysis/utils/report-v2');
function report(metrics){const r=sample();r.mode='ai';r.geometry={status:'available',metrics:metrics.map(m=>({...m,group:'thirds',source:'geometry'}))};return r;}
test('legacy middle/lower shares are never relabelled as full thirds',()=>{
 const r=report([{id:'middleShare',value:58.3,unit:'percent'},{id:'lowerShare',value:41.7,unit:'percent'}]);
 const g=view(r).groups[0];
 assert.equal(g.conclusions.length,3);assert.equal(g.blocks.length,3);
 for(const b of g.blocks){assert.equal(b.rows.length,3);assert.ok(b.rows.every(r=>r.pending));}
 assert.equal(g.reading,undefined);assert.ok(!JSON.stringify(g.blocks).includes('58.3'));
});
test('full thirds show length share and result using a common denominator',()=>{
 const metrics=[];
 for(const [key,length,share] of [['upper',60,1/3],['middle',63,.35],['lower',57,57/180]]){
  metrics.push({id:key+'LengthMm',value:length,unit:'mm',estimated:true,method:'iris-prior-1'},{id:key+'ThirdShare',value:share,unit:'fraction',expressionAffected:true});
 }
 const r=report(metrics);r.geometry.groups={thirds:{status:'available',scale:{status:'estimated',method:'iris-prior-1'}}};
 const g=view(r).groups[0];
 assert.deepEqual(g.conclusions,['上庭标准','中庭偏长','下庭偏短']);
 assert.deepEqual(g.blocks[0].rows.map(r=>r.label),['上庭长度','上庭占比','上庭结果']);
 assert.deepEqual(g.blocks[0].rows.map(r=>r.display),['60.00 mm','0.33','上庭标准']);
 assert.ok(g.lengthNote.includes('估算'));
 assert.equal(g.blocks[1].rows[1].display,'0.35');assert.equal(g.blocks[2].rows[1].display,'0.32');
 assert.ok(g.blocks.every(b=>b.rows.every(r=>!r.pending)));
});
test('old pixel data and unproven millimetres cannot become millimetre lengths',()=>{
 const r=report([{id:'upperLengthPx',value:300,unit:'px'},{id:'upperLengthMm',value:60,unit:'mm'}]);
 assert.equal(view(r).groups[0].blocks[0].rows[0].display,'—');
 r.geometry.groups={thirds:{scale:{status:'unavailable',reason:'虹膜不清晰'}}};
 r.geometry.metrics[1].estimated=true;r.geometry.metrics[1].method='iris-prior-1';
 assert.equal(view(r).groups[0].blocks[0].rows[0].display,'—');
 assert.equal(view(r).groups[0].lengthNote,'虹膜不清晰');
});
test('partial data retain pixels in evidence without displaying an unnormalizable length',()=>{
 const g=view(report([{id:'middleLengthPx',value:42.35,unit:'px'},{id:'middleThirdShare',value:.6,unit:'fraction'}])).groups[0];
 assert.equal(g.blocks[1].rows[0].display,'—');
 assert.equal(g.rows.find(r=>r.id==='middleLengthPx').value,42.35);
 assert.equal(g.blocks[1].rows[1].display,'—');assert.equal(g.conclusions[1],'中庭待测');
 assert.equal(g.blocks[0].rows.length,3);
});
