// A versioned styling rubric: subjective observations, never biometric attractiveness.
const SCORE=require('./styling-score-data');
const DIMENSIONS=SCORE.dimensions.map(d=>[d.id,d.name,d.weight]);
const MAX_LEVEL=SCORE.levels[SCORE.levels.length-1].value;
function scoreAllowed(id,q){return q.usable&&q.faceVisible&&(!SCORE.dimensions.find(d=>d.id===id).requiresBody||q.bodyVisible);}
const SKIN=[['shine','表面光泽'],['texture','可见纹理'],['tone','肤色均匀观感'],['lines','可见细纹']];
const SKIN_REGIONS=[['forehead','额头'],['underEyes','眼下'],['eyeCorners','眼尾'],['cheeks','双颊'],['nose','鼻部'],['mouth','鼻唇周围']];
const SKIN_CONCERNS=[['eyeBags','眼袋',['leftEye','rightEye']],['darkCircles','黑眼圈',['leftEye','rightEye']],['foreheadLines','抬头纹',['forehead']],['crowFeet','鱼尾纹',['leftEye','rightEye']],['glabellaLines','眉间纹',['forehead']],['nasolabialFolds','法令纹',['mouthChin','leftCheek','rightCheek']],['foreheadPores','额头毛孔',['forehead']],['leftCheekPores','画面左颊毛孔',['leftCheek']],['rightCheekPores','画面右颊毛孔',['rightCheek']],['chinPores','下巴毛孔',['mouthChin']],['blackheads','黑头',['nose']],['acne','痘痘外观',['forehead','leftCheek','rightCheek','nose','mouthChin']],['spots','色斑外观',['forehead','leftCheek','rightCheek','nose','mouthChin']]];
function validateSkinConcerns(raw,context){
 if(raw==null){if(context?.requireSkinConcerns)throw Error('Missing skin concerns');return null;}
 if(raw.version!=='skin-concerns-1'||!Array.isArray(raw.items)||raw.items.length!==SKIN_CONCERNS.length)throw Error('Invalid skin concerns');
 return {version:raw.version,items:SKIN_CONCERNS.map(([id,name,regions],i)=>{
  const x=raw.items[i],provider=raw.provider==='Face++'&&(!context||context.geometry?.provider==='Face++'),fine=/Pores$/.test(id)||id==='blackheads';
  if(!validItem(x)||x.id!==id||!['present','not_observed','uncertain'].includes(x.status)||!['slight','moderate','marked','none','unknown',...(provider?['detected']:[])].includes(x.severity)||x.evidence.length>300||x.advice.length>200||!Array.isArray(x.regionIds)||x.regionIds.length>5||x.regionIds.some(r=>!regions.includes(r)&&!(r==='wholeFace'&&!fine)))throw Error('Invalid skin concern item');
  if(x.status==='present'&&!['slight','moderate','marked',...(provider?['detected']:[])].includes(x.severity)||x.status==='not_observed'&&x.severity!=='none'||x.status==='uncertain'&&x.severity!=='unknown')throw Error('Conflicting skin status');
  let item={id,name,status:x.status,severity:x.severity,evidence:x.evidence.trim(),advice:x.advice.trim(),regionIds:[...new Set(x.regionIds)]};
  if(context&&!provider){
   const q=context.quality,available=context.geometry?.skinRegions||[];
   const supported=q?.usable&&q?.faceVisible&&item.regionIds.length&&item.regionIds.every(r=>r==='wholeFace'&&!fine||available.some(a=>a.id===r&&(fine?a.detailUsable:a.usable)));
   if(!supported)item={...item,status:'uncertain',severity:'unknown',evidence:'本次照片或对应局部图未通过可用性检查，无法可靠判断。',advice:fine?'补充该部位均匀光线、无滤镜的清晰近照。':'补充自然表情、均匀光线下的清晰正脸照。'};
  }
  return item;
 })};
}
function validateSkinReport(raw){
 if(raw==null)return null;
 if(typeof raw.summary!=='string'||!raw.summary.trim()||raw.summary.length>120||!Array.isArray(raw.regions)||raw.regions.length!==6)throw Error('Invalid regional skin report');
 return {summary:raw.summary.trim(),regions:SKIN_REGIONS.map(([id,name],i)=>{const x=raw.regions[i];if(!validItem(x)||x.id!==id||!['visible','uncertain'].includes(x.status)||typeof x.conclusion!=='string'||!x.conclusion.trim()||x.conclusion.length>24||x.evidence.length>200||x.advice.length>200)throw Error('Invalid skin region');return {id,name,status:x.status,conclusion:x.conclusion.trim(),evidence:x.evidence.trim(),advice:x.advice.trim()};})};
}
function validItem(x){return x&&typeof x.evidence==='string'&&x.evidence.trim()&&typeof x.advice==='string'&&x.advice.trim();}
function validate(raw){
 if(raw==null)return null;
 if(!raw||raw.version!==SCORE.version||!Array.isArray(raw.items)||raw.items.length!==DIMENSIONS.length)throw Error('Invalid styling rubric');
 return {version:SCORE.version,items:DIMENSIONS.map(([id],i)=>{const x=raw.items[i];if(!validItem(x)||x.id!==id||(x.level!==null&&(!Number.isInteger(x.level)||x.level<0||x.level>MAX_LEVEL))||x.evidence.length>500||x.advice.length>500)throw Error('Invalid styling item');return {id,level:x.level,evidence:x.evidence.trim(),advice:x.advice.trim()};})};
}
function validateSkin(raw){
 if(raw==null)return null;
 if(!Array.isArray(raw)||raw.length!==4)throw Error('Invalid skin observations');
 return SKIN.map(([id],i)=>{const x=raw[i];if(!validItem(x)||x.id!==id||!['visible','uncertain'].includes(x.status)||x.evidence.length>500||x.advice.length>500)throw Error('Invalid skin item');return {id,status:x.status,evidence:x.evidence.trim(),advice:x.advice.trim()};});
}
function demo(){return {version:SCORE.version,items:DIMENSIONS.map(([id],i)=>({id,level:[3,3,3,2,3][i],evidence:['示例：肩线与衣长协调，下装比例仍可调整。','示例：中性色呼应，整体对比适中。','示例：服装与鞋履以简洁休闲为主。','示例：适合日常休闲，正式场合仍需调整。','示例：发型简洁，配饰数量适中。'][i],advice:['优先试穿肩线合适的外套，比较不同裤长。','保持主色统一，用一处配饰增加层次。','让鞋履与上装的正式程度一致。','按场合调整外套与鞋履。','保持领口平整，减少相互争抢的配饰。'][i]}))};}
function view(report){
 const example=report.mode==='demo',d=report.analysis.details,q={...report.analysis.quality};
 if(report.photoInputs?.body===false||report.geometry?.body?.status==='not_provided')q.bodyVisible=false;
 let raw=null;try{raw=validate(example?demo():d.stylingScore);}catch(e){}
 const rows=DIMENSIONS.map(([id,name,weight],i)=>{const x=raw&&raw.items[i];const allowed=example||scoreAllowed(id,q);const level=allowed&&x?x.level:null;return {id,name,weight,level,score:level===null?null:Math.round(level/MAX_LEVEL*weight),evidence:!allowed?'需要清晰、可用的'+(id==='detail'?'正脸照片。':'全身穿搭照片。'):x?x.evidence:'此报告尚未生成该项评价，请重新分析。',advice:x?x.advice:'补充清晰照片并选择使用场合后重新分析。'};});
 const complete=rows.every(x=>x.score!==null),total=complete?rows.reduce((s,x)=>s+x.score,0):null;
 const priority=rows.filter(x=>x.level!==null).sort((a,b)=>a.level-b.level).slice(0,2);
 const score={config:SCORE,rows,total,complete,example,count:rows.filter(x=>x.score!==null).length,label:total===null?SCORE.copy.missingLabel:SCORE.bands.find(b=>total>=b.min&&total<=b.max).label,source:example?SCORE.copy.demoSource:SCORE.copy.source+' · '+SCORE.version,priority};
 let skinItems=[];try{skinItems=validateSkin(d.skinObservations)||[];}catch(e){}
 if(example)skinItems=SKIN.map(([id],i)=>({id,status:i<3?'visible':'uncertain',evidence:['演示：额头与鼻部有局部反光，需排除灯光影响。','演示：双颊整体纹理可见，细小毛孔不作判断。','演示：两侧明暗有差异，建议均匀光线下复核。','演示：当前清晰度不足以判断细纹。'][i],advice:'使用均匀自然光复核可见外观。'}));
 const observations=SKIN.map(([id,name])=>{const x=skinItems.find(x=>x.id===id);return {id,name,status:(example||(q.usable&&q.faceVisible))&&x?x.status:'uncertain',evidence:x?x.evidence:'当前报告没有该项清晰观察记录。',advice:x?x.advice:'补充均匀光线、无滤镜的清晰正脸照。'};});
 const answer=report.skinSelfReport||{},a=answer.tzone,b=answer.cheeks;
 const options=['oily','balanced','dry'];const answered=options.includes(a)&&options.includes(b);
 const type=!answered?'待补充肤质自述':a!==b&&(a==='oily'||b==='oily')?'混合倾向':a==='dry'||b==='dry'?'偏干倾向':a==='oily'&&b==='oily'?'偏油倾向':'较均衡';
 const skin={type:example&&!answered?'外观示例':type,answered,observations,visible:observations.filter(x=>x.status==='visible').length,source:answered?'根据本人日常肤感自述'+(example?' · 下方外观为演示':''):example?'演示外观记录 · 非本人检测':'照片外观与日常肤感分别记录',summary:answered?'T 区与双颊的肤感已记录。这是自述分类，不是照片检测或医学诊断；状态会随季节、环境和护理变化。':'照片中的反光可能受灯光影响，不能直接据此判断油性或混合性皮肤。补充两个区域的日常肤感后，可显示自述倾向。'};
 let regional=null;try{regional=validateSkinReport(d.skinReport);}catch(e){}
 const usable=example||(q.usable&&q.faceVisible);
 const feature=d.features?.find(f=>f.id==='skin');
 skin.headline=example?'皮肤观察示例':usable?(feature?.label||'本次皮肤观察'):'照片待补充';
 skin.photoSummary=example?'以下展示皮肤观察报告的结构，不是本人检测结果。':usable?(regional?.summary||feature?.observation||'本次尚无具体皮肤观察。'):'当前照片不足以支持清晰观察，请补充均匀光线下的正脸照片。';
 skin.regional=!!regional&&usable&&!example;
 skin.cards=skin.regional?regional.regions:observations.map(x=>({...x,conclusion:x.status==='visible'?'有观察记录':'待复核'}));
 skin.priorities=skin.cards.filter(x=>x.status==='visible').slice(0,3).map(x=>({id:x.id,name:x.name,advice:x.advice}));
 let concerns=null;try{concerns=validateSkinConcerns(d.skinConcerns);}catch(e){}
 skin.specific=!!concerns&&!example;
 if(skin.specific){
  const levels={detected:'检出',slight:'轻微',moderate:'较明显',marked:'明显',none:'未见明显',unknown:'无法判断'};
  skin.cards=concerns.items.map(x=>({...x,status:usable?x.status:'uncertain',conclusion:usable?levels[x.severity]:'无法判断',evidence:usable?x.evidence:'当前照片不足以支持可靠判断。'}));
  const positive=skin.cards.filter(x=>x.status==='present'),negative=skin.cards.filter(x=>x.status==='not_observed'),unknown=skin.cards.filter(x=>x.status==='uncertain');
  skin.headline=positive.length?'本次重点关注':'本次皮肤观察结果';
  skin.photoSummary=positive.length?positive.map(x=>x.name+'：'+x.conclusion).join('；')+'。':negative.length?'已检查的项目未见明显表现。':'当前照片细节不足，以下项目需要复核。';
  skin.notObserved=negative.map(x=>x.name).join('、');skin.uncertain=unknown.map(x=>x.name).join('、');
  skin.priorities=positive.slice().sort((a,b)=>['marked','moderate','slight'].indexOf(a.severity)-['marked','moderate','slight'].indexOf(b.severity)).slice(0,3).map(x=>({id:x.id,name:x.name,advice:x.advice}));
 }
 if(report.geometry?.provider==='Face++'){skin.source='Face++ 皮肤分析高阶版';skin.cards=skin.cards.map(c=>({...c,name:report.geometry.skin.items.find(x=>x.id===c.id)?.name||c.name}));}
 const m=report.manualMeasurements||{},positive=x=>typeof x==='number'&&Number.isFinite(x)&&x>0&&x<=300;
 const bodyRatios={waistHip:positive(m.waist)&&positive(m.hip)?(m.waist/m.hip).toFixed(2):'待尺量',legHeight:positive(m.leg)&&positive(report.profile.height)?Math.round(m.leg/report.profile.height*100)+'%':'待尺量'};
 return {stylingScore:score,skinAssessment:skin,bodyRatios};
}
module.exports={DIMENSIONS,SKIN,SKIN_CONCERNS,validate,validateSkin,validateSkinReport,validateSkinConcerns,view};

module.exports.SCORE=SCORE;
module.exports.scoreAllowed=scoreAllowed;
