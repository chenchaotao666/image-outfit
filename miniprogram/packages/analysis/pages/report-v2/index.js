const accountReports=require('../../../../shared/account-reports');
const store=require('../../../../shared/report-store');const model=require('../../utils/report-v2');
function evidenceView(report,id,full=false){
 const e=report.photoEvidence||report.geometry?.photoEvidence;
 if(!e||e.version!=='photo-evidence-1'||!e.photo)return {missing:true,message:report.mode==='demo'?'示例报告没有本人照片。':'此旧报告未保存照片标注，重新分析原照片后可查看。'};
 const finding=id.startsWith('skinConcern:')?report.analysis.details.skinConcerns?.items.find(x=>x.id===id.slice(12)):null;
 // Dense landmark IDs are implementation details, not measurement endpoints.
 const paths=e.provider==='Face++'?(e.groups[id]||[]).filter(p=>p.points.length>1):finding?(finding.regionIds||[]).flatMap(region=>e.groups['skin-'+region]||[]):e.groups[id]||[],points=paths.flatMap(p=>p.points),metrics=report.geometry?.metrics||[];
 let x=0,y=0,w=1,h=1;
 if(points.length&&!full){
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const width=Math.max(.22,Math.max(...xs)-Math.min(...xs)+.12),height=Math.max(.16,Math.max(...ys)-Math.min(...ys)+.10);
  x=Math.max(0,(Math.max(...xs)+Math.min(...xs)-width)/2);y=Math.max(0,(Math.max(...ys)+Math.min(...ys)-height)/2);
  w=Math.min(width,1-x);h=Math.min(height,1-y);
 }
 const colors=['#00ffff','#ffe066','#ff83d1','#75ff9a','#ffad67','#bca0ff'];
 const lines=[],dots=[],legend=[];
 paths.forEach((path,i)=>{
  const color=colors[i%colors.length];
  const pts=path.points.map(p=>[(p[0]-x)/w,(p[1]-y)/h]);
  pts.forEach((p,j)=>{
   dots.push({key:i+'-'+j,text:j===0&&(e.provider!=='Face++'||i<8)?String(i+1):'',labelStyle:'bottom:'+(12+(i%3)*24)+'rpx;',style:'left:'+p[0]*100+'%;top:'+p[1]*100+'%;background:'+color});
   if(j){const a=pts[j-1],dx=(p[0]-a[0])*w*e.width,dy=(p[1]-a[1])*h*e.height;
    lines.push({key:i+'-'+j,style:'left:'+a[0]*100+'%;top:'+a[1]*100+'%;width:'+Math.hypot(dx,dy)/(w*e.width)*100+'%;background:'+color+';transform:rotate('+Math.atan2(dy,dx)*180/Math.PI+'deg)'});
   }
  });
  const values=path.metricIds.map(id=>metrics.find(m=>m.id===id)).filter(Boolean);
  if(e.provider!=='Face++'||i<8)legend.push({key:i,label:(i+1)+'. '+path.label,color,text:values.map(m=>m.label+' '+m.value+(m.unit==='mm'?' mm':m.unit==='degree'?'°':m.unit==='px'?' px':'')).join('；')});
 });
 return {id,full,title:e.provider==='Face++'?'本次检测照片':finding?'本次照片 · 观察区域':paths.length?'本次照片 · 实际取点':'本次正脸参考照片',photo:e.photo,padding:h*e.height/(w*e.width)*100,imageStyle:'max-width:none;width:'+100/w+'%;height:'+100/h+'%;left:'+(-x/w*100)+'%;top:'+(-y/h*100)+'%;',lines,dots,legend,note:e.provider==='Face++'?(paths.length?'框内为本次检出的候选区域。':'本次未返回测量线的位置，照片用于对照查看。'):finding?'框线仅标示送入模型的观察区域，并非黑头、毛孔或皱纹的精确定位。':paths.length?e.note:'本项为 AI 照片观察或用户资料依据，没有对应的几何测量线。'};
}
function simpleEvidence(report,group){
 const guides={thirds:[['上庭','发际线到眉线'],['中庭','眉线到鼻底'],['下庭','鼻底到下巴最低处']],fiveEyes:[['五眼怎么看','从一侧脸边到另一侧，依次比较外侧留白、眼宽、眼间距、眼宽、外侧留白。']],outline:[['脸型怎么看','结合额头、颧部和下颌的宽窄，以及脸长和下巴轮廓判断。']],triangle:[['面部三角','比较双眼与鼻部之间的位置关系。']],brows:[['眉型怎么看','看眉毛的长短、粗细、眉峰高度和眉尾走向。']],eyes:[['眼型怎么看','比较眼睛的宽度、高度和内眼角形状。']],nose:[['鼻型怎么看','观察两侧鼻翼之间的宽度。']],lips:[['唇型怎么看','比较嘴巴的宽度、唇部高度和嘴角形状。']],chin:[['下巴怎么看','结合下巴的宽窄、长短和轮廓角度判断。']]};
 const items=(guides[group.id]||[]).map(([name,text],i)=>{if(group.id==='thirds'){const rows=group.rows.filter(r=>r.label.startsWith(name));const share=rows.find(r=>r.label.includes('占比'));const n=share&&Number.parseFloat(share.display);if(Number.isFinite(n))text+='，约占全脸三庭总长的 '+Math.round(n*100)+'%。';}return {name,text};});
 return {title:group.title+' · 怎么看',diagram:'/assets/report/diagram-'+group.id+'.png',evidence:evidenceView(report,group.id),paragraphs:['检测结果：'+(group.conclusions||[]).join('、'),'根据本次照片由 Face++ 检测。'],items};
}
Page({
 openStyleGuide(){const report=this.data.report;wx.navigateTo({url:'/packages/analysis/pages/style-guide/index'+(report.mode==='demo'?'':'?id='+encodeURIComponent(report.id))});},
 openWardrobeGuide(){const report=this.data.report;wx.navigateTo({url:'/packages/analysis/pages/wardrobe-guide/index'+(report.mode==='demo'?'':'?id='+encodeURIComponent(report.id))});},
 wardrobeBasis(){const p=this.data.vm.wardrobePlan;this.setData({dialog:{title:'衣橱规划 · 规则与依据',paragraphs:[p.evidence,p.unit,'单品占比由建议数量除以总数，再按小数余数从大到小分配剩余百分点，合计保持 100%。'],items:[...p.facts,...p.decisions.map(x=>({name:x.name+' · '+x.id,text:x.reason})),...p.sources.map(x=>({name:x.title,text:x.url}))]}});},
 openSeasonGuide(){const report=this.data.report;wx.navigateTo({url:'/packages/analysis/pages/season-guide/index'+(report.mode==='demo'?'':'?id='+encodeURIComponent(report.id))});},
 openColorGuide(){const report=this.data.report;wx.navigateTo({url:'/packages/analysis/pages/color-guide/index'+(report.mode==='demo'?'':'?id='+encodeURIComponent(report.id))});},
 colorBasis(){const g=this.data.vm.colorGuide;this.setData({dialog:{title:'色彩推荐依据',paragraphs:[g.reason,g.sourceScope,g.scope],items:[{name:'采用规则',text:g.ruleId+' · '+g.version},...g.sources.map(s=>({name:s.title,text:s.url}))]}});},
 colorPhoto(e){const photo=this.data.vm.colorGuide.sections.flatMap(s=>s.images).find(x=>x.src===e.currentTarget.dataset.src);if(photo)this.setData({dialog:{title:photo.alt,image:photo.src,paragraphs:['穿搭组合参考，可根据自己的衣橱替换单品。'],items:[]}});},
 openSkinImage(e){
  const key=e?.currentTarget?.dataset?.key||'original',report=this.data.report,options=this.data.vm.skinAdvanced?.options||[];
  const option=options.find(o=>o.key===key);if(!option)return;
  const photo=report.photoEvidence||report.geometry?.photoEvidence;
  const validPhoto=photo?.photo&&photo.width>0&&photo.height>0;
  const raw=report.geometry?.raw?.skin?.[key]?.rectangle||[];
  const boxes=validPhoto?raw.filter(b=>[b.left,b.top,b.width,b.height].every(Number.isFinite)&&b.left>=0&&b.top>=0&&b.width>0&&b.height>0&&b.left+b.width<=photo.width&&b.top+b.height<=photo.height).map((b,i)=>({id:i,style:'left:'+100*b.left/photo.width+'%;top:'+100*b.top/photo.height+'%;width:'+100*b.width/photo.width+'%;height:'+100*b.height/photo.height+'%;'})):[];
  this.setData({dialog:{title:'皮肤检测 · 图片对照',skinViewer:{key,options,photo:validPhoto?photo.photo:'',padding:validPhoto?100*photo.height/photo.width:100,boxes,count:option.count,compare:50,label:option.label},paragraphs:[],items:[]}});
 },
 skinDragStart(e){
  if(!this.data.dialog?.skinViewer||this.data.dialog.skinViewer.key==='original')return;
  this.skinDragging=true;this.skinDragRect=null;
  wx.createSelectorQuery().selectAll('.skin-compare-photo').boundingClientRect(rects=>{if(this.skinDragging&&rects?.[0]?.width){this.skinDragRect=rects[0];this.skinDragMove(e);}}).exec();
 },
 skinDragMove(e){if(!this.skinDragging||!this.skinDragRect)return;const touch=e.touches?.[0]||e.changedTouches?.[0];if(!Number.isFinite(touch?.clientX))return;const value=Math.max(0,Math.min(100,(touch.clientX-this.skinDragRect.left)/this.skinDragRect.width*100));this.setData({'dialog.skinViewer.compare':value});},
 skinDragEnd(){this.skinDragging=false;this.skinDragRect=null;},
 data:{report:null,vm:null,active:0,dialog:null,expanded:{},bodyDraft:[],manualError:'',tabs:['形象DNA','风格DNA','色彩DNA','季节搭配','衣橱规划','TPO场合形象','发型'],chartWidth:300,chartHeight:300,wardrobeWidth:200,missing:false},
 onLoad(q){this.reportId=q.id;this.loadReport();},
 async loadReport(){
  const id=this.reportId;
  this.setData({loadError:''});
  try{
   const local=id?store.get(id):model.sample();
   const report=id&&id.startsWith('ai-')&&(!local||local.accountReport)?await accountReports.load(id):local;
   if(!report?.analysis?.details)return this.setData({missing:true});
   const w=Math.min(320,wx.getWindowInfo().windowWidth-64);
   this.setData({report,vm:model.view(report),chartWidth:w,chartHeight:w,wardrobeWidth:Math.round(w*.64)},()=>{this.draw();this.positions();});
  }catch(error){this.setData(error.status===404?{missing:true}:{loadError:error.message||'读取报告失败'});}
 },
 toggleSection(e){const kind=e.currentTarget.dataset.kind;this.setData({['expanded.'+kind]:!this.data.expanded[kind]});setTimeout(()=>this.positions(),100);},
 acquire(){this.setData({dialog:{title:'如何补齐报告数据',paragraphs:['已有数据直接展示；补充数据需要对应的照片、实测或模型。以下说明区分已支持与尚未接入的能力。'],items:this.data.vm.acquisition}});},
 editMeasurements(){this.setData({bodyDraft:this.data.vm.bodyFields.map(x=>({...x})),manualError:'',dialog:{title:'填写身体尺量数据',editBody:true,paragraphs:['请填写软尺实际测得的厘米值，可只填已测项目。空白表示未提供，保存后会清除该项旧值。数据会标记为用户尺量，不会作为照片自动测量结果。'],items:[]}});},
 measurementInput(e){const id=e.currentTarget.dataset.field;this.setData({bodyDraft:this.data.bodyDraft.map(x=>x.id===id?{...x,value:e.detail.value}:x),manualError:''});},
 async saveMeasurements(){const values={};for(const field of this.data.bodyDraft){if(!String(field.value).trim())continue;const value=Number(field.value);if(!Number.isFinite(value)||value<=0||value>300)return this.setData({manualError:field.label+'请填写大于 0 且不超过 300 的厘米值。'});values[field.id]=Math.round(value*10)/10;}const report={...this.data.report,manualMeasurements:values};try{await accountReports.update(report,'manualMeasurements');this.setData({report,vm:model.view(report),dialog:null,manualError:''});setTimeout(()=>this.positions(),100);}catch(e){this.setData({manualError:e.message||'保存失败，请重试'});}},
 onReady(){this.draw();},
 tip(e){const key=e.currentTarget.dataset.tip;const color=this.data.vm.referenceColors.find(x=>x.key===key);if(color){this.setData({dialog:{tip:true,title:'色彩参考依据',paragraphs:[color.detailText,color.detailAdvice,'照片参考不等于个人色彩诊断，试穿效果还会受到光线和面料影响。'],items:[]}});return;}const tips={volume:['什么是面部量感？','就是五官和轮廓看起来的大小、轻重。可以用来选择衣服的廓形和面料厚薄。'],curvature:['什么是面部轮廓？','看脸部线条偏直还是偏圆润，用来参考领口、图案和衣服线条。'],dynamics:['什么是造型动静？','简洁纯色比较安静，醒目图案和丰富细节比较活跃。选择你喜欢、也适合场合的风格。'],'volume-clothes':['什么是服装廓形？','就是衣服的外形。宽松、挺括的衣服轮廓较大，轻薄、贴身的衣服轮廓较小。'],'curvature-clothes':['什么是服装线条？','直线剪裁更利落，弧线和柔软面料更柔和。可以从领口、肩线和图案开始比较。'],'dynamics-clothes':['什么是服装动静？','纯色、简单剪裁偏简约；印花、不对称设计和丰富配饰更有个性。'],lightness:['什么是明度？','就是颜色的深浅。浅色明度高，深色明度低。'],chroma:['什么是纯度？','就是颜色的鲜艳程度。亮丽的颜色纯度高，带灰感的颜色更柔和。'],temperature:['什么是色彩冷暖？','偏黄、橙的颜色较暖，偏蓝的颜色较冷。建议在自然光下用衣服试色。']};const t=tips[key]||['搭配小提示','先从合身、舒适、好搭的单品开始。'];this.setData({dialog:{tip:true,title:t[0],paragraphs:[t[1]],items:[]}});},
 scoreDetails(){const policy=this.data.vm.stylingScore.config;const r=this.data.report,body=r.mode!=='demo'&&(r.photoEvidence||r.geometry?.photoEvidence)?.body?.photo;this.setData({dialog:{title:policy.copy.dialogTitle,scorePhoto:body||'',scorePhotoNote:body?'本次全身穿搭照片 · 用于核对服装搭配':r.mode==='demo'?'示例评分不对应本人照片。':r.photoInputs?.body===false||r.geometry?.body?.status==='not_provided'?'未上传全身照，仅可评价可见的局部细节。':'此报告未保存全身穿搭照片，无法展示评分原图。',paragraphs:[policy.scope+' '+policy.explanation,policy.levelExplanation+' '+policy.evidence,this.data.vm.stylingScore.example?policy.copy.exampleNote:policy.copy.missingNote],items:this.data.vm.stylingScore.rows.map(x=>({name:x.name+' · '+(x.score===null?'待补充':x.score+'/'+x.weight),text:x.evidence+' 改善建议：'+x.advice}))}});},
 skinDetails(){this.setData({dialog:{title:'皮肤外观 · 分项依据',evidence:evidenceView(this.data.report,'skin'),paragraphs:[this.data.vm.skinAssessment.source,this.data.vm.skinAssessment.photoSummary,'以下是 AI 对照片可见外观的描述；未明显看到不等于确认没有。'],items:this.data.vm.skinAssessment.cards.map(x=>({name:x.name+' · '+(this.data.vm.skinAssessment.specific?x.conclusion:x.status==='visible'?'可观察':'待复核'),text:x.evidence+' '+x.advice}))}});},
 bodyGuide(){this.setData({dialog:{title:'尺寸说明与校正',paragraphs:['单位为厘米。照片估算来自人体关键点；身高比例参考采用常见成人比例，两者都不是实际尺量。校正时由他人协助，保持自然站立。'],items:[{name:'肩宽',text:'左右肩端之间的直线距离，不是肩围。照片取两侧肩部关键点。'},{name:'上肢全长 / 上臂长 / 前臂长',text:'上肢全长为肩端至中指指尖，包含手；上臂为肩至肘，前臂为肘至腕。'},{name:'躯干长 / 手长',text:'本报告躯干参考长度为肩部中点至髋部中点；手长为腕至中指指尖。'},{name:'腿长 / 小腿长',text:'腿长参考髋至膝再至踝的长度；小腿为膝至踝。照片使用髋、膝、脚部关键点近似估算。'},{name:'肩至手部 / 肘至手部',text:'来自照片中的手部关键点，不能等同于腕点或指尖，所以单独列出。'},{name:'腰围 / 臀围',text:'仅凭身高体重或一张正面照无法可靠确定。可选填实际围度：腰部自然腰线、臀部最丰满处水平绕量。'}]}});},
 editSkin(){const a=this.data.report.skinSelfReport||{};this.setData({skinDraft:[{id:'tzone',label:'额头、鼻部、下巴：日常更接近哪种肤感？',value:a.tzone||''},{id:'cheeks',label:'双颊：日常更接近哪种肤感？',value:a.cheeks||''}],skinOptions:[{id:'oily',label:'经常油亮'},{id:'balanced',label:'较均衡'},{id:'dry',label:'经常干燥'},{id:'unknown',label:'不确定'}],manualError:'',dialog:{title:'补充日常肤感',editSkin:true,paragraphs:['按近期日常体验填写，不按这一张照片的反光选择。仅用于整理本人自述，不能诊断皮肤问题；不确定时可保留待补充。'],items:[]}});},
 skinAnswer(e){const {field,value}=e.currentTarget.dataset;this.setData({skinDraft:this.data.skinDraft.map(x=>x.id===field?{...x,value}:x),manualError:''});},
 async saveSkin(){if(this.data.skinDraft.some(x=>!x.value))return this.setData({manualError:'请回答两个区域的肤感，也可以选择“不确定”。'});const report={...this.data.report,skinSelfReport:Object.fromEntries(this.data.skinDraft.map(x=>[x.id,x.value]))};try{await accountReports.update(report,'skinSelfReport');this.setData({report,vm:model.view(report),dialog:null});setTimeout(()=>{this.draw();this.positions();},100);}catch(e){this.setData({manualError:e.message||'保存失败，请重试'});}},
 inspiration(e){const lists={looks:this.data.vm.looks,occasions:this.data.vm.occasionGallery,hair:this.data.vm.hairstyles};const list=lists[e.currentTarget.dataset.kind];const item=list&&list[Number(e.currentTarget.dataset.index)];if(!item)return;this.setData({dialog:{title:item.title,image:item.image,paragraphs:[item.note,'这是固定风格参考图，用来理解造型思路。你的具体建议见下方个性化清单。'],items:[]}});},
 onPageScroll(e){this.scrollTop=e.scrollTop;if(this.jumpLock)return;const tops=this.chapterTops||[];let n=0;tops.forEach((y,i)=>{if(e.scrollTop+110>=y)n=i;});if(n!==this.data.active)this.setData({active:n});},
 onShow(){setTimeout(()=>this.positions(),300);},
 positions(){wx.createSelectorQuery().selectAll('.chapter').boundingClientRect(rects=>{if(rects)this.chapterTops=rects.map(r=>r.top+(this.scrollTop||0));}).exec();},
 tab(e){const active=Number(e.currentTarget.dataset.index);this.jumpLock=true;this.setData({active});wx.pageScrollTo({selector:'#chapter-'+active,offsetTop:-52,duration:260});setTimeout(()=>{this.jumpLock=false;},450);},
 explain(e){const id=e.currentTarget.dataset.id;if(this.data.report.geometry?.provider==='Face++'&&['detection','skin'].includes(id)){this.setData({dialog:{title:'Face++ 检测依据',paragraphs:['面部特征使用 facialfeatures，皮肤使用 skinanalyze_advanced。','分类与指标直接来自接口；DeepSeek 只生成穿搭建议。','Face++ 未返回定位的项目不补画标记，未提供的指标不由本地算法补算。'],items:this.data.vm.groups.map(g=>({name:g.title,text:g.rows.map(r=>r.label+' '+r.display).join('；')}))}});return;}const group=this.data.vm.groups.find(g=>g.id===id);if(group && this.data.report.geometry?.provider==='Face++'){this.setData({dialog:simpleEvidence(this.data.report,group)});return;}if(group){this.setData({dialog:{title:group.title+' · 数据依据',evidence:evidenceView(this.data.report,id),paragraphs:[group.reason,group.evidenceObservation||group.observation,'来源：'+group.source,this.data.report.geometry?.provider==='Face++'?'分类和数值由 Face++ 返回，长度单位口径待确认，不使用本地虹膜估算。':'比例、角度来自照片投影；标注 mm 的长度由虹膜尺度先验估算，未标定实测。保留两位小数不代表达到 0.01 mm 精度。',group.action?'补拍建议：使用均匀自然光下的单人正脸照，完整露出额头与下巴，平视镜头，自然睁眼闭唇。若提示服务不可用，应检查本地服务，不必反复换照片。':''].filter(Boolean),items:group.rows.map(r=>({name:r.label+' · '+r.display,text:r.formula||'由旧版照片关键点计算。旧版未保存详细公式，可重新检测生成新版记录。'}))}});return;}
 if(id==='detection'){const summary=this.data.vm.measurementSummary;this.setData({dialog:{title:'这份报告检查了什么',evidence:evidenceView(this.data.report,id),paragraphs:[summary.example?'这是固定示例，未读取或检测你的照片。':'几何算法版本：'+summary.version,'几何计算：脸部关键点的投影距离、比例与角度。AI 观察：脸型倾向、眉眼外观、服装风格与配色建议。','新版三庭使用头发与额头交界估计发际线，结合眉线、鼻底和下巴计算三段占比；新增虹膜尺度毫米估算；皮肤毛孔、毛发密度和身体厘米尺寸没有可靠测量。','质量门槛是拍摄筛查规则，不是检测准确率。图中的头像是通用示意，不是你的照片关键点。'],items:[...summary.checks.map(c=>({name:c.passed?'拍摄检查通过':'建议重拍',text:c.label})),...this.data.vm.groups.map(g=>({name:g.title+' · '+g.source,text:g.rows.length?g.rows.map(r=>r.label).join('；'):g.reason}))]}});return;}
 const explanations={style:['风格规则说明','量感与动静是造型建议维度，属于模型照片估计。','六轴仅标记本次推荐风格的位置。报告没有六类风格的独立分值，因此不画评分面积、不推定相邻风格，也不表示概率。',this.data.report.analysis.details.styleReason],color:['配色依据','明度、纯度与冷暖倾向来自本次照片观察，不是专业色彩仪器测量。','强光、阴影、白平衡、滤镜和妆容都会改变结果。请在自然光下用实际衣料试色。'],body:['身体数据说明','BMI由你填写的体重kg除以身高m的平方计算。这里不提供健康诊断。','未标定的单张照片不输出厘米级肩宽、围度和四肢长度。'],wardrobe:['衣橱规划规则','按常用场景规划目标件数，所有品类合计100%。这是建议的目标衣橱，不是识别你现有衣服的数量。','基础色比例由场景和风格偏好决定；可在下一次检测中修改偏好。'],skin:['皮肤外观说明','当前仅描述照片中的可见外观，无法可靠测量毛孔、黑头或判定油性/干性肤质。','没有专用检测依据时保持未评估，不生成健康分数。']};const a=explanations[id]||['报告说明',...this.data.report.analysis.warnings];this.setData({dialog:{title:a[0],evidence:evidenceView(this.data.report,id),paragraphs:a.slice(1),items:[]}});
 },
 outfit(e){const o=this.data.vm.outfits[Number(e.currentTarget.dataset.index)];this.setData({dialog:{title:o.season+' · '+o.title,colors:o.colors,paragraphs:[o.reason,'配图为单品组合示意，不是本人试穿效果。'],items:o.items.map(x=>({name:x.name,text:x.value}))}});},
 detail(e){const kind=e.currentTarget.dataset.kind,i=Number(e.currentTarget.dataset.index||0),a=this.data.report.analysis;let dialog;
  if(kind==='hair'){const h=a.details.hairOptions[i];dialog={title:h.name,paragraphs:[h.reason,'打理方法：'+h.maintenance,...a.hair.limitations],items:a.hair.colors.map(x=>({name:'建议发色',text:x}))};}
  else if(kind==='wardrobe'){dialog={title:'你的目标衣橱 · '+this.data.vm.total+'件',paragraphs:['按'+this.data.vm.pref.occasion+'场景规划。先盘点已有单品，再补齐缺口。'],items:this.data.vm.wardrobe.map(x=>({name:x.name+' · '+x.count+'件',text:x.items+'。'+x.reason}))};}
  else if(kind==='glasses'){dialog={title:'眼镜选择建议',paragraphs:['图中镜框为参考示意；推荐名称与理由来自本次报告，请结合实际框宽现场试戴。'],items:a.details.glasses.map(g=>({name:g.tier+' · '+g.name,text:g.reason}))};}
  else if(kind==='tpo'){const o=a.occasions[i];dialog={title:o.occasion,paragraphs:[o.recommendation,'先确认场合正式程度和温度，再调整外套、鞋履与配饰。'],items:[{name:'风格方向',text:this.data.vm.primaryStyle},{name:'配色策略',text:a.color.summary}]};}
  else dialog={title:'风格着装解析',paragraphs:[a.details.styleReason,...a.style.tips,this.data.vm.styleCombination.note],items:this.data.vm.styleCombination.rows.map(x=>({name:x.label+' · '+x.value,text:x.advice}))};
  this.setData({dialog});
 },
 browReason(){const b=this.data.vm.browRecommendation;this.setData({dialog:{title:'脸型判断与眉型推荐依据',evidence:evidenceView(this.data.report,'outline'),paragraphs:[b.source+'：'+b.faceLabel,this.data.report.geometry?.provider==='Face++'?'脸型直接来自 Face++；眉型整理建议由 DeepSeek 根据该分类生成。':'脸型名称来自本次 AI 对照片及几何数据的综合描述。当前没有用固定比例阈值区分瓜子脸、椭圆脸或长脸；这个名称不是几何公式的计算结果。','下方是报告保存的原始观察，不是事后根据脸型名称补写的理由。',...b.limitations],items:[...b.observations.map(text=>({name:'照片观察',text})),{name:'眉型推荐 · '+b.name,text:b.reason},{name:'配图说明',text:'头像与眉毛为通用示意，不代表已经识别出同款眉形，也不是本人试妆效果。'}]}});},
 skinFinding(e){const item=this.data.vm.skinAssessment.cards.find(x=>x.id===e.currentTarget.dataset.id);if(!item)return;this.setData({dialog:{title:item.name+' · '+item.conclusion,evidence:evidenceView(this.data.report,this.data.vm.skinAssessment.specific?'skinConcern:'+item.id:'skin'),paragraphs:[item.evidence,'本项为照片可见外观判断；未见明显不代表确认没有。'],items:[{name:'建议',text:item.advice}]}});},
 toggleEvidence(){const d=this.data.dialog;if(d?.evidence&&!d.evidence.missing)this.setData({dialog:{...d,evidence:evidenceView(this.data.report,d.evidence.id,!d.evidence.full)}});},
 close(){this.setData({dialog:null});},noop(){},start(){wx.navigateTo({url:'/packages/analysis/pages/detect/index'});},
 consult(){this.setData({dialog:{title:'读懂你的报告',paragraphs:[this.data.report.analysis.summary,'照片几何计算、模型视觉估计、用户填写与规则建议已分别标注。点每一项的“依据”查看说明。','当前为自动报告，未接入真人咨询。'],items:this.data.report.analysis.warnings.map(x=>({name:'参考限制',text:x}))}});},
 draw(){if(!this.data.vm)return;const w=this.data.chartWidth,h=w,cx=w/2,cy=h/2,r=w*.30;
  const c=wx.createCanvasContext('radar');c.setFontSize(10);c.setTextAlign('center');c.setTextBaseline('middle');
  for(let ring=5;ring>=1;ring--){c.beginPath();c.arc(cx,cy,r*ring/5,0,Math.PI*2);c.closePath();c.setFillStyle(ring%2?'#eafafa':'#dcf7f9');c.fill();}
  this.data.vm.radar.forEach((v,i)=>{const a=-Math.PI/2+i*Math.PI/3;c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);c.setStrokeStyle('#a1e0e2');c.stroke();c.setFillStyle('#7b9494');c.fillText(v.name,cx+Math.cos(a)*r*1.35,cy+Math.sin(a)*r*1.35);});
  this.data.vm.radar.forEach((v,i)=>{if(!v.selected)return;const a=-Math.PI/2+i*Math.PI/3,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;c.beginPath();c.moveTo(cx,cy);c.lineTo(x,y);c.setStrokeStyle('#00b8c2');c.setLineWidth(2);c.stroke();c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.setFillStyle('#00b8c2');c.fill();});c.draw();
  const d=wx.createCanvasContext('wardrobe'),dw=this.data.wardrobeWidth,dc=dw/2,dr=dw*.34;let a=-Math.PI/2;this.data.vm.wardrobe.forEach(x=>{const end=a+Math.PI*2*x.percent/100;d.beginPath();d.arc(dc,dc,dr,a,end);d.setLineWidth(dr*.55);d.setStrokeStyle(x.color);d.stroke();a=end;});d.draw();
  if(!this.data.vm.stylingScore.complete)return;const gauge=wx.createCanvasContext('completion'),gc=w/2,gy=w*.40,gr=w*.32,score=this.data.vm.stylingScore;
  for(let i=0;i<10;i++){const a=Math.PI+i*Math.PI/10,b=Math.PI+(i+1)*Math.PI/10-.018;gauge.beginPath();gauge.moveTo(gc,gy);gauge.arc(gc,gy,gr,a,b);gauge.closePath();gauge.setFillStyle(i%2?'#e8fafb':'#d9f6f8');gauge.fill();gauge.beginPath();gauge.arc(gc,gy,gr,a,b);gauge.setLineWidth(2);gauge.setStrokeStyle('#94e7eb');gauge.stroke();}
  for(let i=1;i<4;i++){gauge.beginPath();gauge.arc(gc,gy,gr*i/4,Math.PI,2*Math.PI);gauge.setStrokeStyle('#ffffffaa');gauge.setLineWidth(1);gauge.stroke();}
  if(score.complete){const a=Math.PI+score.total/100*Math.PI;gauge.beginPath();gauge.moveTo(gc,gy);gauge.lineTo(gc+Math.cos(a)*gr*.9,gy+Math.sin(a)*gr*.9);gauge.setLineWidth(3);gauge.setStrokeStyle('#08becb');gauge.stroke();gauge.beginPath();gauge.arc(gc+Math.cos(a)*gr*.9,gy+Math.sin(a)*gr*.9,3,0,Math.PI*2);gauge.setFillStyle('#08becb');gauge.fill();}
  gauge.beginPath();gauge.arc(gc,gy,gr*.26,Math.PI,2*Math.PI);gauge.setFillStyle('#fff');gauge.fill();gauge.draw();
 }
});
