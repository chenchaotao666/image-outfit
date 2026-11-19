const {test}=require('node:test'),assert=require('node:assert/strict');
const {sample,view}=require('../miniprogram/packages/analysis/utils/report-v2');
test('brow panel uses defined geometry, five mean rows, and does not present a unilateral value as the average',()=>{
 const r=sample();r.mode='ai';const metrics=[];
 for(const key of ['Width','Height','Arch','Thickness','Lift'])for(const side of ['R','L','Mean'])metrics.push({id:'brow'+key+side+(key==='Lift'?'Deg':'Mm'),value:side==='Mean'?12.34:12,group:'brows',source:'geometry',definition:'brow-contour-1',method:key==='Lift'?'brow-contour-1':'iris-prior-1',estimated:true,unit:key==='Lift'?'degree':'mm'});
 r.geometry={status:'available',metrics,groups:{brows:{status:'available',scale:{status:'estimated'},measurementDefinition:{method:'brow-contour-1'}}}};
 let g=view(r).groups[4];assert.equal(g.blocks[0].rows.length,5);assert.equal(g.blocks[0].rows[0].display,'12.34 mm');assert.equal(g.blocks[0].rows[2].display,'12.3°');assert.match(g.source,/AI 视觉观察/);
 r.geometry.metrics=metrics.filter(m=>m.id!=='browWidthLMm');assert.equal(view(r).groups[4].blocks[0].rows[0].display,'—');
 r.geometry.groups.brows.scale.status='unavailable';g=view(r).groups[4];assert.equal(g.blocks[0].rows[1].display,'—');assert.equal(g.blocks[0].rows[2].display,'12.3°');
});
