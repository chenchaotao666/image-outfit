const config=require('./wardrobe-plan-data');
function view(report){
 const pref={styleIndex:report.personalStyleAudit?.index??report.analysis?.details?.styleIndex};
 const choose=group=>config[group+'Rules'].find(r=>Object.entries(r.when).every(([k,v])=>pref[k]===v))||config[group+'Default'];
 const color=choose('color'),style=choose('style'),quantity=choose('quantity');
 const total=quantity.counts.reduce((a,b)=>a+b,0),raw=quantity.counts.map(n=>n/total*100),percents=raw.map(Math.floor);
 const order=raw.map((n,i)=>({i,f:n-percents[i]})).sort((a,b)=>b.f-a.f||a.i-b.i);
 for(let n=100-percents.reduce((a,b)=>a+b,0),i=0;i<n;i++)percents[order[i].i]++;
 const wardrobe=config.categories.map((c,i)=>({...c,count:quantity.counts[i],percent:percents[i]}));
 return {wardrobe,total,basePercent:color.percent,fashionPercent:100-color.percent,basicStylePercent:style.percent,designStylePercent:100-style.percent,wardrobeSummary:wardrobe.map(x=>x.name+' '+x.percent+'%').join('；'),wardrobePlan:{version:config.version,colorText:color.reason+' '+config.colorAdvice,styleText:style.reason+' '+config.styleAdvice,quantityText:quantity.reason,combinationText:config.combinationAdvice,evidence:config.evidence,unit:config.unit,sources:config.sources,decisions:[{name:'衣橱色彩',id:color.id,reason:color.reason},{name:'衣橱款式',id:style.id,reason:style.reason},{name:'衣橱单品',id:quantity.id,reason:quantity.reason}],facts:Number.isInteger(pref.styleIndex)?[{name:'本次分析风格',text:['稳重绅士','潮流前卫','儒雅精致','阳光少年','欧美冷峻','随性自然'][pref.styleIndex]}]:[]}};
}
module.exports={view};
