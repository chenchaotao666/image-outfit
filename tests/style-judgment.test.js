const {test}=require('node:test');const assert=require('node:assert/strict');
const judgment=require('../server/styling/style-judgment');const {sample,view}=require('../miniprogram/packages/analysis/utils/report-v2');
test('supported model classifications and evidence reach the configured report cards',()=>{
 const k=judgment.load(),r=sample();r.mode='ai';r.analysis.details.volume=1;r.analysis.details.curvature=4;
 r.geometry={provider:'Face++',classifications:{face:'瓜子脸',brows:'粗眉',eyes:'大眼',chin:'尖下巴'}};
 r.analysis.details.scaleEvidence={volume:'粗眉、大眼的视觉分量较突出，结合瓜子脸轮廓，整体偏中大量感。',curvature:'测试模型返回的曲线倾向依据。'};
 r.judgmentAudit=judgment.apply(r.analysis,r.geometry,k);
 assert.equal(r.analysis.details.volume,1);assert.equal(r.analysis.details.curvature,4);
 for(const d of r.judgmentAudit.dimensions.filter(x=>x.id!=='dynamics')){assert.equal(d.facts.length,4);assert.ok(d.sources.every(s=>s.url.startsWith('https://')));assert.ok(d.logic);assert.equal(d.status,'styling_reference');}
 const cards=require('../miniprogram/packages/analysis/utils/report-reference').view(r,[],[]).referenceStyles;
 assert.equal(cards[0].label,'中大量感');assert.match(cards[0].explanation,/粗眉/);
 assert.equal(cards[1].label,'曲线感');assert.equal(cards[1].heading,'你的面部曲直感为');assert.equal(cards[1].selected,4);
 assert.equal(cards[1].suggestion,k.rules.dimensions[1].levels[4].recommendation);
 assert.equal(cards[0].garmentItems[cards[0].selected],'中大廓形');
 assert.equal(judgment.load().hash,k.hash);
});
test('missing provider observations do not become face facts',()=>{
 const r=sample();const audit=judgment.apply(r.analysis,{provider:'other',classifications:{face:'圆脸'}},judgment.load());
 assert.deepEqual(audit.dimensions[0].facts,[]);assert.equal(audit.dimensions[0].result,null);
});

test('missing evidence and invalid model values stay null instead of becoming a default middle level',()=>{
 const g=require('../config/mock/Face检测数据.json').geometry,k=judgment.load();
 for(const value of [null,undefined,-1,5,'2',2]){
  const a={details:{volume:value,curvature:value,scaleEvidence:{}}};
  judgment.apply(a,g,k);assert.equal(a.details.volume,null);assert.equal(a.details.curvature,null);
 }
 const a={details:{volume:0,curvature:0,scaleEvidence:{volume:'多个五官视觉分量较突出。',curvature:'轮廓转折偏清晰。'}}};
 judgment.apply(a,g,k);assert.equal(a.details.volume,0);assert.equal(a.details.curvature,0);
 const empty={details:{volume:1,curvature:1,scaleEvidence:{volume:'模型描述',curvature:'模型描述'}}};
 judgment.apply(empty,{},k);assert.equal(empty.details.volume,null);assert.equal(empty.details.curvature,null);
});
