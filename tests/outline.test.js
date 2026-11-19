const {test}=require('node:test'),assert=require('node:assert/strict');
const {sample,view}=require('../miniprogram/packages/analysis/utils/report-v2');
test('outline display distinguishes contour proxies, visual label, scale failures and legacy definitions',()=>{
 const r=sample();r.mode='ai';r.analysis.face.label='椭圆倾向';
 const metrics=[['templeWidthMm',117.16,'mm'],['cheekWidthMm',118.03,'mm'],['faceLengthMm',184.1,'mm'],['jawWidthMm',89.4,'mm'],['jawAngleMean',163.6,'degree'],['templeWidth',.993,'ratio'],['jawWidth',.757,'ratio']].map(([id,value,unit])=>({id,value,unit,group:'outline',source:'geometry',estimated:true,method:'iris-prior-1'}));
 r.geometry={status:'available',metrics,groups:{outline:{status:'available',measurementDefinition:{method:'outline-photo-3'},scale:{status:'estimated'}}}};
 let g=view(r).groups[2];
 assert.equal(g.blocks[0].rows[0].label,'眉上缘水平轮廓宽');
 assert.equal(g.blocks[0].rows[0].display,'117.16 mm');
 assert.match(g.source,/AI 视觉判断/);assert.doesNotMatch(g.source,/关键点计算/);
 assert.match(g.ratioNote,/眉上缘轮廓/);assert.match(g.observation,/未使用经验证/);
 r.geometry.groups.outline.scale.status='unavailable';g=view(r).groups[2];
 assert.equal(g.blocks[0].rows[0].display,'—');assert.equal(g.ratioSummary,'0.99 : 1 : 0.76');
 r.geometry.groups.outline.measurementDefinition={method:'old'};g=view(r).groups[2];
 assert.equal(g.blocks[0].rows[0].label,'上部轮廓宽（旧口径）');
 assert.equal(g.blocks[0].rows[4].label,'轮廓折线角（旧口径）');
 assert.doesNotMatch(g.ratioNote,/眉上缘/);
});
