const store=require('../../../../shared/report-store');
const {demoReport}=require('../../utils/analysis');
Page({
 data:{active:0,report:null,missing:false,tabs:['形象DNA','风格DNA','色彩DNA','季节搭配','衣橱规划','TPO综合形象','发型'],colors:['#ede0c7','#d5c7b2','#b7b18b','#879985','#b88668','#665f4c','#a09989','#e9cfb7'],facial:[{name:'中庭长度',value:'63.19'},{name:'中庭占比',value:'0.35'},{name:'中庭结论',value:'中庭偏长'},{name:'下庭长度',value:'54.44'},{name:'下庭占比',value:'0.31'},{name:'下庭结论',value:'下庭偏短'}],bones:[{name:'右颧外侧角度',value:'37.94°'},{name:'内眼角距离',value:'16.8'},{name:'左颧外侧角度',value:'37.94°'}],wardrobe:[{name:'上装',text:'纯色T恤、牛津纺衬衫、细针织衫',count:'4–6件'},{name:'下装',text:'直筒牛仔裤、卡其裤、简洁西裤',count:'3–4件'},{name:'外套',text:'轻结构西装、短夹克、风衣',count:'2–3件'},{name:'鞋履',text:'简洁运动鞋、乐福鞋、德比鞋',count:'2–3双'}]},
 onLoad(query){let report=query.id?store.get(query.id):null;if(query.id?.startsWith('ai-')&&(!report||report.accountReport)){wx.redirectTo({url:'/packages/analysis/pages/report-v2/index?id='+encodeURIComponent(query.id)});return;}if(query.id&&!report)return this.setData({missing:true});if(!report)report=demoReport({gender:'男',age:28,height:175,weight:140});if(report.schemaVersion===2){wx.redirectTo({url:'/packages/analysis/pages/report-v2/index?id='+report.id});return;}this.setData({report,sections:report.mode==='ai'?sections(report.analysis):[]});},
 tab(e){this.setData({active:Number(e.currentTarget.dataset.index)});wx.pageScrollTo({scrollTop:0,duration:0});},
 consult(){wx.showModal({title:'报告说明',content:this.data.report.mode==='ai'?'本报告由 DeepSeek 根据你提供的照片与资料生成，仅供穿搭参考；可信度是模型自评，不是测量精度。暂未接入人工咨询。':'当前为示例报告，面部数据、风格、色彩和搭配结论均为演示内容，不代表对你的真实检测。暂未接入人工咨询服务。',showCancel:false});},
 start(){wx.navigateTo({url:'/packages/analysis/pages/detect/index'});},
 package(){wx.navigateTo({url:'/packages/analysis/pages/package/index'});}
});

function sections(a){
 const confidence=v=>({low:'较低',medium:'中等',high:'较高',unknown:'未评估'}[v]);
 const lines=(title,items)=>({title,lines:items});
 return [
 {title:'形象 DNA',summary:a.summary,blocks:[lines(a.face.label,['模型自评可信度：'+confidence(a.face.confidence),...a.face.observations,...a.face.limitations]),lines(a.body.label,a.body.recommendations)]},
 {title:a.style.keywords.join(' · '),summary:a.style.summary,blocks:[lines('穿搭建议',a.style.tips)]},
 {title:a.color.label,summary:a.color.summary,palette:a.color.palette,blocks:[lines('照片色彩参考',['模型自评可信度：'+confidence(a.color.confidence),'光线和滤镜会影响判断，建议结合自然光下的实际试色。'])]},
 {title:'四季搭配',blocks:a.seasonal.map(x=>lines(x.season,[x.recommendation]))},
 {title:'衣橱规划',blocks:a.wardrobe.map(x=>lines(x.category,[x.items,x.reason]))},
 {title:'场合穿搭',blocks:a.occasions.map(x=>lines(x.occasion,[x.recommendation]))},
 {title:'发型建议',summary:a.hair.summary,blocks:[lines('发型',a.hair.styles),lines('发色',a.hair.colors),lines('参考说明',a.hair.limitations)]}
 ];
}
