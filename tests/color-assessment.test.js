const {test}=require('node:test'),assert=require('node:assert/strict');
const {sample,view}=require('../miniprogram/packages/analysis/utils/report-v2'),color=require('../server/styling/color-assessment');
test('valid hue codes show an explicit heuristic reference; invalid codes remain unselected',()=>{
 for(const code of [0,1,2,3,null,undefined,'2',-1]){
  const r=sample();r.geometry={provider:'Face++',raw:{skin:{skin_hue_ha:{skin_hue:code}}}};
  r.colorAudit=color.apply(r.analysis,color.load(),r.geometry);
  const card=require('../miniprogram/packages/analysis/utils/report-reference').view(r,[],[]).referenceColors[2];
  const valid=Number.isInteger(code)&&code>=0&&code<=2;
  assert.equal(card.selected,valid?code:null);
  assert.equal(card.label,valid?['暖肤色倾向','中性肤色倾向','冷肤色倾向'][code]:'暂未确定');
  assert.equal(r.colorAudit.skinTone.temperatureSuggestion,valid?card.label:null);
  assert.equal(r.analysis.details.temperature,'unknown');
  assert.match(card.detailAdvice,/产品的配色参考规则/);
 }
});
test('saved advanced response renders its returned hue without rerunning detection',()=>{
 const r=sample();r.geometry=require('../config/mock/Face检测数据.json').geometry;
 const card=require('../miniprogram/packages/analysis/utils/report-reference').view(r,[],[]).referenceColors[2];
 assert.equal(card.selected,2);assert.equal(card.label,'冷肤色倾向');assert.match(card.detailText,/偏红/);
});
test('color evidence is separate per dimension and missing evidence never defaults to middle',()=>{
 const r=sample();r.analysis.color.summary='照片偏黄，冷暖未知';
 let cards=view(r).referenceColors;assert.doesNotMatch(cards[0].text,/照片偏黄/);assert.match(cards[0].text,/雾蓝/);assert.match(cards[1].text,/柔和/);assert.doesNotMatch(cards[0].text,/未记录|复核/);assert.match(cards[0].detailText,/未记录/);
 r.colorAudit=color.apply(r.analysis,color.load());assert.equal(r.analysis.details.lightness,null);assert.equal(r.analysis.details.chroma,null);assert.equal(r.analysis.details.temperature,'unknown');
 assert.equal(view(r).referenceColors[0].selected,null);
});
test('documented photo observations retain their scope and do not certify personal color',()=>{
 const r=sample();r.analysis.details.scaleEvidence={lightness:'肤色明度适中，头发较深。',chroma:'面部颜色偏柔和，光线可能影响观感。',temperature:'肤色偏黄'};
 const audit=color.apply(r.analysis,color.load());assert.equal(r.analysis.details.lightness,2);assert.equal(r.analysis.details.chroma,null);assert.equal(r.analysis.details.temperature,'unknown');assert.equal(audit.dimensions[0].status,'model_photo_observation');
});
