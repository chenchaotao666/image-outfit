const data=require('./season-guide-data'),colors=require('./color-guide');
function view(report){
 const color=colors.view(report),gender=report.profile?.gender;
 return {...data.rules,colorLabel:color.label,palette:color.palettes[0].colors,cover:data.library.cover.gender===gender?data.library.cover.src:null,
 seasons:data.rules.seasons.map(s=>{const images=data.library.images.filter(x=>x.enabled&&x.season===s.id&&(x.gender==='通用'||x.gender===gender)).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));return {...s,first:images.slice(0,2),second:images.slice(2),colorAdvice:'你的配色可以从'+color.palettes[0].colors.map(c=>c.name).join('、')+'开始，再根据气温和场合调整单品。'};})};
}
module.exports={view};
