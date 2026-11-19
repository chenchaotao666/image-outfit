const config=require('../../shared/guides/wardrobe-plan-data'),planning=require('../../shared/guides/wardrobe-plan');
function view(report){
 const plan=planning.view(report),gender=report.profile?.gender;
 return {...config.itemRules,cover:config.itemLibrary.cover.src,summary:plan.wardrobePlan.quantityText,
 groups:config.itemRules.groups.map(g=>({...g,quantity:plan.wardrobe.find(x=>x.name===g.category)?.count,
 items:config.itemLibrary.images.filter(x=>x.enabled&&x.group===g.id&&(x.gender==='通用'||x.gender===gender)).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id))}))};
}
module.exports={view};
