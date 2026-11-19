const data=require('./color-guide-data');
function view(report){
 const hue=report.geometry?.provider==='Face++'?report.geometry.raw?.skin?.skin_hue_ha?.skin_hue:null;
 const rule=data.rules.rules.find(r=>Number.isInteger(hue)&&r.hue===hue)||data.rules.fallback;
 const gender=report.profile?.gender,occasion=report.preferences?.occasion;
 const sections=data.plans.chapters.map(section=>({...section,images:data.library.images.filter(x=>x.enabled&&x.tags.includes(section.imageTag)&&(x.gender==='通用'||x.gender===gender)).sort((a,b)=>Number(b.occasion===occasion)-Number(a.occasion===occasion)||a.id.localeCompare(b.id)).slice(0,2)}));
 return {reportCopy:data.copy.report,pageCopy:data.pageCopy,label:rule.label,summary:rule.summary,reason:rule.reason,ruleId:rule.id,version:data.rules.version,scope:data.rules.scope,sourceScope:data.rules.sourceScope,sources:data.sources,palettes:data.plans.palettes[rule.palette].map((colors,i)=>({id:rule.palette+'-'+i,title:data.pageCopy.planPrefix+' '+(i+1),colors})),basics:data.plans.basics,sections};
}
module.exports={view};
