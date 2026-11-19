// Shared presentation rules. All numeric anatomy comes only from geometry.
const reference=require('./report-reference');
const assessment=require('./report-assessment');
const colorGuide=require('./color-guide');
const wardrobeModel=require('./wardrobe-plan');
// Preserve the model's observations; never infer a face class from display ratios.
function browRecommendationView(report){
 const a=report.analysis||{},face=a.face||{},d=a.details||{},r=d.browRecommendation;
 const observations=(face.observations||[]).filter(x=>typeof x==='string'&&x.trim());
 const advice=(d.browAdvice||'').trim();
 const steps=advice.split(/[。；;\n]+/).map(x=>x.trim()).filter(Boolean);
 // Only an explicit positive recommendation may supply a name in legacy reports.
 const match=advice.match(/^(?:建议|推荐|保持|保留|选择|尝试)(?:自然的)?(自然平直眉形|自然平直眉|平直眉形|平直眉|剑眉|弯眉|自然眉形)/);
 return {faceLabel:(face.label||report.face||'脸型待评估').trim(),observations,
  source:report.mode==='demo'?'示例描述 · 非本人分析':report.geometry?.provider==='Face++'?'Face++ 面部特征分析':'AI 照片观察',
  name:r?r.name:match?match[1]:'自然眉型整理',
  reason:r?r.reason:'此报告未单独记录推荐理由，以下保留原始整理建议。',
  steps:r?r.steps:steps,
  limitations:(face.limitations||[]).filter(x=>typeof x==='string')};
}
const styleNames=['稳重绅士','潮流前卫','儒雅精致','阳光少年','欧美冷峻','随性自然'];
const scales={volume:['大量感','中大量感','中量感','中小量感','小量感'],dynamics:['动态','中偏动','动静居中','中偏静','静态'],lightness:['高明度','中高明度','中明度','中低明度','低明度'],chroma:['高纯度','中高纯度','中纯度','中低纯度','低纯度']};
const metricGroups=[['thirds','三庭比例','三庭','发际线未可靠定位，暂不计算三庭比例。','thirds'],['fiveEyes','五眼比例','五眼','正脸照片质量不足或测量服务未就绪。','eyes'],['outline','脸型轮廓','脸型','轮廓比例尚未获得可靠测量。','face'],['triangle','眼鼻三角','三角','采用双眼中点与鼻底顶点，属于照片投影角。','triangle'],['brows','眉部特征','眉型','眉毛密度和粗细未接入专用分割测量。','brows'],['eyes','眼部特征','眼型','表情、闭眼或姿态可能影响眼部开合。','eyes'],['nose','鼻部特征','鼻型','正面比例不能反映鼻梁高度。','nose'],['lips','唇部特征','唇型','张嘴或明显表情时不计算唇部比例。','lips'],['chin','下巴轮廓','下巴','下巴测量点位尚未完成验证。','chin']];
// Fixed display examples, never passed to the AI or counted as photo measurements.
const demoMetrics={
 thirds:[['upperLengthMm','上庭长度',60,'mm'],['middleLengthMm','中庭长度',63,'mm'],['lowerLengthMm','下庭长度',57,'mm'],['upperThirdShare','上庭占比',60/180,'fraction'],['middleThirdShare','中庭占比',63/180,'fraction'],['lowerThirdShare','下庭占比',57/180,'fraction']],
 fiveEyes:[['outerR','画面左侧留白',.82],['eyeR','画面左眼宽',1.01],['inner','内眼角间距',1.12],['eyeL','画面右眼宽',1],['outerL','画面右侧留白',.85],['outerRMm','左侧留白长度',20.5,'mm'],['innerMm','内眼角间距',28,'mm'],['outerLMm','右侧留白长度',21.25,'mm']],
 outline:[['meshLength','网格面长 / 颧部轮廓宽',1.34],['jawWidth','下颌轮廓宽 / 颧部轮廓宽',.78],['templeWidth','上部轮廓宽 / 颧部轮廓宽',.91],['templeWidthMm','额部宽度',118.3,'mm'],['cheekWidthMm','颧部宽度',130,'mm'],['faceLengthMm','脸部长度',180,'mm'],['jawWidthMm','下颌宽度',101.4,'mm'],['jawAngleMean','下颌轮廓角（双侧均值）',145,'degree']],
 triangle:[['triangle','眼中点—鼻底投影角',58.6,'degree']],
 brows:[['browWidthR','画面左眉轮廓跨度 / 颧宽',.28],['browWidthL','画面右眉轮廓跨度 / 颧宽',.27],['browEyeR','画面左眉眼距离 / 眼宽',.45],['browEyeL','画面右眉眼距离 / 眼宽',.46]],
 eyes:[['eyeOpenR','画面左眼开合比',.29],['eyeOpenL','画面右眼开合比',.28],['eyeBalance','双眼眼裂宽比',1.02]],
 nose:[['noseWidth','鼻翼宽 / 颧部轮廓宽',.26],['noseLength','鼻根至鼻底 / 颧部轮廓宽',.31],['noseEye','鼻翼宽 / 内眼角间距',1.04]],
 lips:[['mouthWidth','唇宽 / 颧部轮廓宽',.35],['lipRatio','唇轮廓高度 / 唇宽',.32],['upperLowerLip','上下唇投影高度比',.75]],
 chin:[['chinLower','下唇至下巴 / 鼻底至下巴',.47],['chinWidth','下巴轮廓宽 / 颧部轮廓宽',.37]]
};
function geometryGroups(report,g,metrics){
 const a=report.analysis,d=a.details,isExample=report.mode==='demo'&&!metrics.length;
 return metricGroups.map(([id,title,short,fallback,diagram])=>{
  const f=d.features.find(x=>x.id===id),state=g.groups&&g.groups[id];
  const measured=metrics.filter(x=>x.group===id&&Number.isFinite(x.value)&&x.source==='geometry');
  const example=isExample?demoMetrics[id].map(([key,label,value,unit='ratio'])=>({id:key,label,value,unit,source:'demo',formula:'固定排版示例，不对应任何人的照片，也不是标准值。'})):[];
  const rows=(isExample?example:measured).map(m=>({...m,display:(m.unit==='fraction'?m.value.toFixed(2):m.value)+({degree:'°',percent:'%',ratio:' 倍',px:' px',mm:' mm（估算）'}[m.unit]||'')}));
  const status=isExample?'demo':state&&state.status||(rows.length?'available':'unavailable');
  const reason=isExample?(id==='thirds'?'固定排版示例：各段长度除以发际线至下巴的三段总长。示例长度单位为毫米，不对应任何人的测量；标准范围为 1/3 ± 0.015，仅是本项目展示规则。':'以下数值为固定示例，展示报告结构，不代表你的检测结果或审美标准。'):state&&state.reason||(!rows.length&&g.reason?g.reason:fallback);
  const source=isExample?'示例数据 · 非本人测量':rows.length?(status==='partial'?'部分指标已计算':id==='thirds'?'发际线分割与关键点估计':'照片关键点计算'):(f?'AI 视觉观察 · 无几何值':'本次未获得几何值');
  const label=isExample?'示例 · '+short+'比例':rows.length?'已计算 '+rows.length+' 项比例':f?f.label:'本次暂缺';
  return {id,title:id==='thirds'?'三庭与纵向比例':title,short,diagram:'/assets/v2/'+diagram+'.png',rows,status,source,label,reason,observation:isExample?'':f?'AI 观察：'+f.label+'。'+f.observation:'',advice:f?f.advice:'',action:!isExample&&!rows.length?'查看原因与补拍方法':''};
 });
}
function view(report){
 const a=report.analysis,d=a.details,g=report.geometry||{metrics:[],status:'unavailable',reason:'旧报告未包含测量数据'};
 const metrics=Array.isArray(g.metrics)&&g.status!=='unavailable'?g.metrics.filter(m=>m&&Number.isFinite(m.value)&&m.source==='geometry'&&(m.status==null||m.status==='available')&&g.groups?.[m.group]?.status!=='unavailable'):[];
 const groups=reference.faceGroups(report,geometryGroups(report,g,metrics));
 const isExample=report.mode==='demo'&&!metrics.length;
 const checkNames={sharpness:'清晰度',exposure:'曝光',face_size:'脸部尺寸',roll:'左右倾斜',frontal:'正脸投影',framing:'轮廓完整性',yaw:'侧转角度',pitch:'俯仰角度',landmark_span:'关键点间距'};
 const measurementSummary={example:isExample,count:groups.reduce((sum,item)=>sum+item.rows.length,0),title:isExample?'项示例指标 · 非本人检测':g.provider==='Face++'?'项 Face++ 检测指标':'项照片比例已计算',description:isExample?'用于展示完整报告，所有示例值均非本人数据。':g.reason||'每一项均区分几何计算与视觉观察。',checks:(g.quality&&g.quality.checks||[]).map(c=>({name:checkNames[c.id]||'照片质量',label:c.message,passed:c.passed})),version:g.version||'旧版报告',groupCount:groups.filter(x=>x.rows.length).length};
 const pref={};
 const wardrobePlan=wardrobeModel.view(report),{wardrobe,total}=wardrobePlan;
 const radar=styleNames.map((name,i)=>({name,selected:i===d.styleIndex}));
 const scaleCards=['volume','dynamics','lightness','chroma'].map(key=>({key,items:scales[key],selected:d[key],label:d[key]===null?'未评估':scales[key][d[key]]}));
 const bmiValue=report.profile.weight/Math.pow(report.profile.height/100,2);
 const bmi=Number.isFinite(bmiValue)&&bmiValue>0?bmiValue.toFixed(1):'—';
 // Chinese adult BMI categories; classify before display rounding.
 const bmiBand=report.profile.age>=18&&report.profile.height>0&&Number.isFinite(bmiValue)&&bmiValue>0?(bmiValue<18.5?0:bmiValue<24?1:bmiValue<28?2:3):-1;
 const asset=name=>'/assets/report/'+name+'.jpg';
 const gallery=(items)=>items.map(([file,title,note])=>({image:asset(file),title,note}));
 const looks=gallery([['look-spring','衬衫 × 浅色长裤','用清爽的浅色下装，衬托有色彩的上装。'],['look-summer','印花 × 纯色','印花已经是重点，其余单品尽量简洁。'],['look-autumn','针织 × 深色长裤','暖色针织与深色裤装形成清晰层次。'],['look-layer','素色 × 纹理','上身保持干净，把纹理留给一件单品。']]);
 const occasions=gallery([['occasion-business','商务通勤','长外套与整洁裤线，建立利落的正式感。'],['occasion-relaxed','城市日常','短外套搭配直筒裤，轻松又有轮廓。'],['occasion-weekend','周末休闲','同色系针织与长裤，简洁、舒展。'],['occasion-social','社交聚会','棕色层次与细腻材质，让简单搭配更有细节。']]);
 const hairstyles=gallery([['hair-side','露额侧分','观察分缝位置与额头露出比例。'],['hair-soft','柔和中分','观察刘海弧度与两侧层次。'],['hair-back','利落后梳','观察发根支撑与侧面收整。'],['hair-texture','自然碎发','观察轻盈刘海与顶部纹理。']]);
 const palette=a.color.palette;
 const colorRecipe=palette.slice(0,3).map((c,i)=>({...c,role:['主色 · 上装或外套','辅助色 · 裤装或内搭','点缀色 · 鞋包配饰'][i],share:[60,30,10][i]}));
 const styleGuides=[{title:'量感，说的是视觉分量',text:'看一件衣服时，先看廓形和面料厚薄。挺括西装更有结构，轻薄衬衫更轻盈；用合身的肩线找到平衡。',image:asset('style-tailoring'),labels:['挺括轮廓','适度结构','面料纹理']},{title:'动静，说的是造型的活跃程度',text:'纯色和整齐线条显得安静；图案、纹理和层次更活跃。先选一处做重点，再让其他单品配合。',image:asset('style-shirts'),labels:['细密纹理','干净纯色','醒目图案']}];
 const styleStories=scaleCards.slice(0,2).map((card,i)=>({...card,...styleGuides[i],heading:i===0?'面部量感与服装廓形':'造型动静与服装细节',meaning:i===0?'量感描述面部线条带来的视觉分量，可作为选择服装廓形和面料的参考。':'动静描述造型给人的视觉节奏，可通过图案、材质和配饰调节。',suggestion:card.selected===null?'先从合身剪裁与小面积细节开始，试穿后再调整。':(i===0?['试试挺括面料与清晰肩线，用有结构的廓形呼应视觉分量。','用适度挺括的外套建立轮廓，内搭保留轻盈感。','从中等厚度面料、合身肩线开始，兼顾结构与舒适。','选择轻结构外套与细腻面料，减少过厚、过大的堆叠。','用轻薄面料和简洁小细节保持轻盈，注意单品比例。']:['可以尝试醒目图案或层次感，让一件单品成为重点。','适当加入纹理与配饰，其他单品保持简洁。','用纯色基础款搭配一件纹理单品，平衡安静与活跃。','优先细密纹理与低对比配色，细节保持克制。','从纯色、整齐线条与简洁配饰开始，突出干净感。'])[card.selected]}));
 return {styleGuideCopy:(require('./style-guide')?.copy||{actionHeading:'已为你规划风格着装示范',actionLabel:'点击查看你的风格解析'}),colorGuide:colorGuide.view(report),browRecommendation:browRecommendationView(report),...assessment.view(report),...reference.view(report,groups,wardrobe),measurementSummary,faceTitle:(report.face||a.face.label).trim(),groups,wardrobe,total,radar,scaleCards,styleStories,bmi,bmiBand,pref,looks,occasionGallery:occasions,hairstyles,colorRecipe,styleGuides,showReference:report.profile.gender==='男',primaryStyle:report.personalStyleAudit?.result||styleNames[d.styleIndex]||'待补充偏好',personalStyleEvidence:report.personalStyleAudit||null,...wardrobePlan,skin:d.features.find(x=>x.id==='skin'),metricCount:metrics.length,temperature:{warm:'偏暖建议',cool:'偏冷建议',neutral:'中性建议',unknown:'暂不判断冷暖'}[d.temperature],outfits:d.outfits.map((o,i)=>({...o,id:i,items:[{name:'上装',value:o.top},{name:'下装',value:o.bottom},{name:'外套',value:o.layer},{name:'鞋履',value:o.shoes},{name:'配饰',value:o.accessory}]}))};
}
function sample(profile){
 const p=profile||{gender:'男',age:28,height:175,weight:140};
 const features=[['brows','自然平眉','眉线相对平缓，眉峰过渡柔和。','保留自然眉峰，修整下缘杂毛，避免眉尾过细。'],['eyes','眼部线条柔和','示例眼部呈自然横向线条。','镜框上缘保持轻盈，减少厚重框线的遮挡。'],['nose','鼻部比例协调','示例仅展示正脸可见的鼻部轮廓。','用简洁的领口与镜框保持视觉平衡。'],['lips','自然唇形','唇线轮廓自然，示例不涉及精确厚度测量。','选择低对比度的领口配色，让面部成为视觉中心。'],['chin','下颌线条柔和','示例下巴向内收窄，轮廓转折较缓。','尝试中等宽度领口，避免过度拉长面部。'],['skin','以自然光复核外观','示例不对本人肤质、毛孔或皮肤健康作判断。','真实分析时光线和妆容会影响观察；肤质需要结合自述。']].map(([id,label,observation,advice])=>({id,label,observation,advice}));
 const outfits=[['春','轻盈的城市日常','米白牛津纺衬衫','灰蓝直筒长裤','鼠尾草绿轻外套','白色休闲鞋','深棕细腰带',['#d6dcca','#f0e8dc','#8d9da9']],['夏','清爽的低对比搭配','浅蓝亚麻短袖','米白轻薄长裤','无需外套','浅灰帆布鞋','银色简洁腕表',['#c6dae1','#efebe0','#a6aaa7']],['秋','温润的层次','奶油色细针织','深灰直筒长裤','烟棕轻结构西装','深棕乐福鞋','细纹围巾',['#b69d83','#eee5d2','#555b5d']],['冬','克制的暖意','浅灰高领针织','炭灰羊毛长裤','深海军蓝大衣','黑色短靴','灰蓝围巾',['#334452','#a5abae','#e2e1db']]].map(([season,title,top,bottom,layer,shoes,accessory,colors])=>({season,title,top,bottom,layer,shoes,accessory,colors,reason:'以柔和色彩与清晰线条衔接，使用材质层次增加细节。这里是预设示例，可用于体验报告结构。'}));
 return {id:'demo-v2-'+Date.now(),schemaVersion:2,mode:'demo',date:new Date().toLocaleDateString('zh-CN'),createdAt:new Date().toISOString(),profile:{...p,age:Number(p.age),height:Number(p.height),weight:Number(p.weight)/2},preferences:{occasion:'日常休闲',style:'简洁耐看',maintenance:'轻松打理'},face:'椭圆倾向',style:'自然 · 精致',geometry:{status:'unavailable',metrics:[],reason:'示例报告不测量照片'},analysis:{summary:'以柔和中性色、适度结构与舒适比例建立日常风格，再用少量配饰增加精致感。本页为 V2 预设示例，不代表你的分析结果。',quality:{bodyVisible:false,issues:[]},face:{label:'椭圆倾向',observations:['轮廓过渡柔和','脸型结论为示例'],confidence:'low',limitations:['请使用自己的照片生成真实报告']},body:{label:'未评估身形',recommendations:['补充完整全身照后，可获得照片可见的身形建议。']},style:{keywords:['自然','精致'],tips:['用直线剪裁平衡柔和轮廓','让领口与面部保留适当空间','将点缀色控制在小面积'],summary:'先建立舒适、整洁的基础，再通过细节强化风格。'},color:{label:'柔和清爽配色',summary:'建议从中明度、适度彩度的颜色开始试穿，在自然光下比较效果。',palette:[{name:'雾蓝',hex:'#9aafb9',usage:'衬衫与内搭'},{name:'暖米白',hex:'#e9e1cf',usage:'大面积基础色'},{name:'鼠尾草',hex:'#a4b29a',usage:'外套点缀'},{name:'烟棕',hex:'#9f8771',usage:'鞋包与配饰'},{name:'炭灰',hex:'#515e62',usage:'裤装与大衣'}]},wardrobe:[],occasions:[{occasion:'商务通勤',recommendation:'浅色衬衫、轻结构西装与深色直筒裤，搭配干净的乐福鞋。通过领口和面料体现正式度。'},{occasion:'周末休闲',recommendation:'选择透气针织或棉质上装，搭配直筒牛仔裤与简洁运动鞋。用轻外套应对温差。'},{occasion:'社交聚会',recommendation:'在低对比配色中加入一件有纹理的外套或配饰，保持轮廓简洁，避免多个视觉重点。'}],hair:{summary:'优先考虑自然分区与适度顶部蓬松，根据实际发质调整。',styles:['自然侧分','短碎纹理','轻盈层次'],colors:['自然黑','柔和深棕'],limitations:['发质、发量与发际线需要实际确认']},warnings:['本页为预设示例，未对照片进行推断。'],details:{features,volume:2,curvature:2,dynamics:2,lightness:2,chroma:3,temperature:'unknown',styleIndex:2,styleReason:'示例以简洁线条和柔和配色为主，推荐儒雅精致与随性自然方向。雷达数值为规则示意，不是测量概率。',glasses:[{name:'细框圆角矩形',tier:'推荐',reason:'在柔和轮廓中加入适度线条，框宽接近面宽。'},{name:'轻盈椭圆框',tier:'可尝试',reason:'保留轻盈感，试戴时关注镜框与眉眼间距。'},{name:'过窄厚重框',tier:'谨慎选择',reason:'可能让中部视觉过于集中，建议现场比较效果。'}],browAdvice:'沿自然生长方向整理，眉峰略作保留，眉尾保持清晰。避免生硬地改变眉毛走向。',outfits,hairOptions:[{name:'自然侧分',reason:'适度露出额头，保持线条干净。',maintenance:'吹干时顺分缝整理，少量定型即可。'},{name:'短碎纹理',reason:'用轻微纹理增加层次，侧面避免过度膨胀。',maintenance:'适合愿意简单造型的人；具体长度请与发型师确认。'},{name:'轻盈层次',reason:'通过两侧和顶部的层次调整整体比例。',maintenance:'发质细软时需更轻的造型产品，避免压塌。'}]}}};
}
module.exports={view,sample,styleNames,scales,browRecommendationView};
