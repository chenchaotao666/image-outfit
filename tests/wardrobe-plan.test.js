const {test}=require('node:test'),assert=require('node:assert/strict');
const {view}=require('../miniprogram/packages/analysis/utils/wardrobe-plan');
test('wardrobe ratios match independently and counts reconcile to 100 percent',()=>{
 for(const occasion of ['日常休闲','商务通勤','社交聚会',undefined])for(const style of ['简洁耐看','个性鲜明','精致优雅',undefined]){
  const p=view({preferences:{occasion,style}});assert.equal(p.basePercent+p.fashionPercent,100);assert.equal(p.basicStylePercent+p.designStylePercent,100);assert.equal(p.wardrobe.reduce((n,x)=>n+x.percent,0),100);assert.equal(p.wardrobe.reduce((n,x)=>n+x.count,0),p.total);
 }
 const p=view({analysis:{details:{styleIndex:5}}});assert.equal(p.basePercent,65);assert.equal(p.basicStylePercent,70);assert.equal(p.wardrobePlan.decisions[1].id,'style-simple');
 const b=view({analysis:{details:{styleIndex:1}}});assert.equal(b.basePercent,55);assert.equal(b.wardrobePlan.decisions[2].id,'quantity-everyday');
});
