const data=require('./style-guide-data');
function view(report){
 const valid=i=>Number.isInteger(i)&&i>=0&&i<=5;
 const audit=report.personalStyleAudit,index=valid(audit?.index)?audit.index:report.analysis?.details?.styleIndex;
 const style=valid(index)?data.rules.styles.find(s=>s.index===index):null;
 const image=a=>a&&a.enabled&&(a.gender==='通用'||a.gender===report.profile?.gender)?{...a,boxStyle:a.region?'height:'+a.height+'rpx;':'',imageStyle:a.region?'top:-'+a.top+'rpx;':''}:null;
 if(!style)return {copy:data.copy,unknown:true};
 return {...style,copy:data.copy,basis:(valid(audit?.index)?audit.reason:null)||report.analysis?.details?.styleReason||data.copy.missingBasis,cover:image(data.library.cover),looks:style.looks.map((l,i)=>({...l,number:i+1,image:image(data.library.images.find(a=>a.id===l.imageId))}))};
}
module.exports={view,copy:data.copy};
