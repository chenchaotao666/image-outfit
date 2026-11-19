const tpoCopy=require('./tpo-copy-data');
// Reference-led layout. Observations, measurements and missing inputs stay distinct.
const BODY_FIELDS=[['shoulder','肩宽'],['arm','上肢全长'],['upperArm','上臂长'],['forearm','前臂长'],['torso','躯干长'],['hand','手长'],['leg','腿长'],['calf','小腿长'],['waist','腰围'],['hip','臀围']];
const ACQUISITION=[
 {name:'上庭与完整三庭',text:'新版使用头发与面部皮肤分割估计可见发际线，再结合眉线、鼻底和下巴计算完整三庭。请露出额头；刘海遮挡或边界不稳定时保留已有长度，不补造完整占比。'},
 {name:'面部毫米估算',text:'新版用双眼虹膜水平直径与 11.7 mm 尺度先验估算三庭毫米长度，标为估算值；虹膜不可用时不换算。镜片、个体差异与透视会影响结果，真实尺寸仍需标尺或深度标定。'},
 {name:'眉毛密度与粗细',text:'需要无美颜眉部近照、毛发分割与标尺；当前仅有眉部关键点轮廓，不能计数毛发。'},
 {name:'皮肤外观与肤质',text:'需要标准光线的额头、双颊、鼻部近照，结合自述与经过验证的专用模型；肤质判断还需控油/含水等独立依据。当前只提供照片可见外观观察。'},
 {name:'肩宽、四肢长度与围度',text:'可以用软尺实测后在本报告填写。自动估计需要正面及侧面全身照、已知尺度与独立精度验证；姿态关键点不等于衣服尺码或真实围度。'},
 {name:'明度、纯度与冷暖',text:'需要无滤镜、均匀光线、固定曝光和白平衡的照片；灰卡可辅助白平衡，颜色校准还需相机/光源条件。用实体色布靠近面部复核，当前是视觉配色建议。'},
 {name:'曲直感与风格',text:'由清晰照片中的轮廓线条与服装偏好生成造型建议，不是人体测量值。旧报告缺少曲直感字段时保留待补充，重新检测后可生成。'},
 {name:'当前造型评分',text:'新版按版型、配色、风格、场合和细节五项评价实际穿搭。需要可用正脸与全身照，五项齐全才生成总分。旧报告需重新检测；这是尚待专家校准的造型规则，不是颜值或健康分数。'}
];
function faceGroups(report,groups){
 if(report.geometry?.provider==='Face++')return providerGroups(report,groups);
 const features=report.analysis.details.features;
 return groups.map(g=>{
  const find=id=>g.rows.find(r=>r.id===id),feature=features.find(f=>f.id===g.id);

  let conclusions=[];
  if(g.id==='thirds'){
   conclusions=[];
  }else if(g.id==='fiveEyes'){
   for(const [id,label]of [['outerR','左侧外眼角'],['inner','内眼角间距'],['outerL','右侧外眼角']]){const m=find(id);conclusions.push(m?(m.classification||label+(m.value<.9?'偏窄':m.value>1.1?'偏宽':'适中')):label+'待测');}
  }else if(g.id==='outline')conclusions=[report.analysis.face.label.trim()];
  else if(g.id==='triangle'&&find('triangle'))conclusions=[find('triangle').display];
  else if(feature){
   const brief=['eyes','nose','lips','chin'].includes(g.id);
   const label=feature.label.trim();
   conclusions=[brief?(/无法|不能判断|不清晰|未评估|待复核/.test(label)?'暂待判断':label.split(/[、，,。；;]/)[0]):label];
  }
  if(!conclusions.length)conclusions=[g.rows.length?g.rows[0].display:'需要补充清晰照片'];
  const blocks=[];
  let lengthNote='';
  if(g.id==='thirds'){
   conclusions=[];
   const scale=report.geometry?.groups?.thirds?.scale;
   const metricMm=key=>{const m=find(key+'LengthMm');return m&&m.unit==='mm'&&m.value>0&&(m.source==='demo'||m.estimated===true&&m.method==='iris-prior-1'&&scale?.status==='estimated')?m:null;};
   const hasMm=['upper','middle','lower'].some(key=>metricMm(key));
   lengthNote=hasMm?(g.status==='demo'?'示例长度，单位为毫米（mm），非本人检测。':'长度单位为毫米（mm），由照片估算，非尺量实测。'):scale?.reason||'这份报告尚无毫米估算，重新分析原图后可生成。';
   const shares=['upper','middle','lower'].map(key=>find(key+'ThirdShare'));
   const complete=shares.every(x=>x&&x.value>0&&x.value<1)&&Math.abs(shares.reduce((sum,x)=>sum+x.value,0)-1)<.005;
   for(const [i,key,name] of [[0,'upper','上庭'],[1,'middle','中庭'],[2,'lower','下庭']]){
    const share=complete?shares[i]:null;
    const mm=metricMm(key);
    const result=share?(share.classification||name+(share.value<1/3-.015?'偏短':share.value>1/3+.015?'偏长':'标准')):name+'待测';
    conclusions.push(result);
    blocks.push({name,rows:[
     {id:key+'Length',label:name+'长度',display:mm?mm.value.toFixed(2)+' mm':'—',pending:!mm},
     {id:key+'Share',label:name+'占比',display:share?share.value.toFixed(2):'—',pending:!share},
     {id:key+'Result',label:name+'结果',display:result,pending:!share}
    ]});
   }
  }else if(g.id==='fiveEyes'){
   const scale=report.geometry?.groups?.fiveEyes?.scale;
   lengthNote=g.status==='demo'?'示例数据，非本人检测。左右均按照片画面。':'长度单位为毫米（mm），由照片估算；左右均按照片画面。';
   if(g.status!=='demo'&&scale?.status!=='estimated')lengthNote=scale?.reason||'旧报告未包含毫米估算，重新分析原图可生成。左右均按照片画面。';
   for(const [i,key,label]of [[0,'outerR','左侧外眼角留白'],[1,'inner','内眼角间距'],[2,'outerL','右侧外眼角留白']]){
    const ratio=find(key),m=find(key+'Mm'),valid=m&&m.unit==='mm'&&m.value>0&&(m.source==='demo'||m.estimated===true&&m.method==='iris-prior-1'&&scale?.status==='estimated');
    blocks.push({name:'',rows:[{id:key+'Distance',label:key==='inner'?label:label+'距离',display:valid?m.value.toFixed(2)+' mm':'—',pending:!valid},{id:key+'Ratio',label:label+'占比',display:ratio?ratio.value.toFixed(2):'—',pending:!ratio},{id:key+'Result',label:label+'结果',display:conclusions[i],pending:!ratio}]});
   }
  }else if(g.id==='outline'){
   const scale=report.geometry?.groups?.outline?.scale;
   const definition=report.geometry?.groups?.outline?.measurementDefinition;
   const localOutline=['outline-local-2','outline-photo-3'].includes(definition?.method);
   const rows=[['templeWidthMm',localOutline?'眉上缘水平轮廓宽':'上部轮廓宽（旧口径）'],['cheekWidthMm','颧区轮廓宽'],['faceLengthMm','发际线至下巴长度'],['jawWidthMm','下颌轮廓点间宽']].map(([id,label])=>{
    const m=find(id),valid=m&&m.unit==='mm'&&m.value>0&&(m.source==='demo'||m.estimated===true&&m.method==='iris-prior-1'&&scale?.status==='estimated');
    return {id,label,display:valid?m.value.toFixed(2)+' mm':'—',pending:!valid};
   });
   const angle=find('jawAngleMean');
   rows.push({id:'jawAngleMean',label:localOutline?'局部轮廓夹角（均值）':'轮廓折线角（旧口径）',display:angle?angle.value.toFixed(1)+'°':'—',pending:!angle});
   blocks.push({name:'',rows});
   lengthNote='长度由照片估算；脸长为发际线至下巴，下颌角为照片轮廓角。';
   if(localOutline)lengthNote='以下为照片轮廓估算，不是专业额颞点、颧弓点或下颌角点的实测尺寸。';
   if(scale?.status!=='estimated')lengthNote=scale?.reason||'此报告尚无轮廓毫米数据，重新分析原图可生成。';
   if(g.status==='demo')lengthNote='示例尺寸，非本人检测；长度单位为毫米（mm）。';
   else if(report.geometry?.groups?.outline?.photoOnly)lengthNote+=' 表情可能影响结果，详见依据。';
  }else if(g.id==='brows'&&report.geometry?.groups?.brows?.measurementDefinition?.method==='brow-contour-1'){
   const scale=report.geometry.groups.brows.scale;
   const rows=[['Width','眉毛轮廓宽度'],['Height','眉毛轮廓高度'],['Lift','眉尾挑角'],['Arch','眉弯拱高'],['Thickness','眉带最大厚度']].map(([key,label])=>{
    const degree=key==='Lift',suffix=degree?'Deg':'Mm';
    const pair=['R','L'].map(side=>find('brow'+key+side+suffix));
    const valid=pair.every(m=>m&&Number.isFinite(m.value)&&m.definition==='brow-contour-1'&&m.unit===(degree?'degree':'mm')&&(degree||m.estimated===true&&m.method==='iris-prior-1'&&scale?.status==='estimated'));
    const mean=find('brow'+key+'Mean'+suffix),ready=valid&&mean&&mean.definition==='brow-contour-1'&&mean.unit===(degree?'degree':'mm');
    return {id:'brow'+key+'Mean',label,display:ready?mean.value.toFixed(degree?1:2)+(degree?'°':' mm'):'—',pending:!ready};
   });
   blocks.push({name:'双侧平均',rows});
   lengthNote='宽、高、厚度按图示方向计算；挑角为眉尾倾角，弯度用拱高表示。毫米为轮廓估算，左右明细见“依据”。';
  }else if(['eyes','nose','lips','chin'].includes(g.id)){
   const specs={eyes:[['eyeWidthMeanMm','眼睛宽度'],['eyeHeightMeanMm','眼睛高度'],['innerEyeAngleMeanDeg','内眼角轮廓角']],nose:[['noseWidthMm','鼻翼宽度']],lips:[['mouthHeightMm','嘴巴高度'],['mouthWidthMm','嘴巴宽度'],['lipThicknessMm','上下唇厚度合计'],['mouthCornerAngleDeg','嘴角轮廓夹角']],chin:[['chinWidthMm','下巴轮廓宽度'],['chinLengthMm','下巴长度'],['chinAngleDeg','下巴轮廓角']]};
   const state=report.geometry?.groups?.[g.id];
   const rows=specs[g.id].map(([id,label])=>{
    const m=find(id),degree=id.endsWith('Deg');
    const valid=m&&m.definition==='features-photo-1'&&m.unit===(degree?'degree':'mm')&&(degree||m.estimated&&m.method==='iris-prior-1'&&state?.scale?.status==='estimated');
    return {id,label,display:valid?m.value.toFixed(degree?1:2)+(degree?'°':' mm'):'—',pending:!valid};
   });
   blocks.push({name:'',rows});
   lengthNote=state?.measurementDefinition?.method==='features-photo-1'?(g.id==='eyes'?'双眼取平均；长度由照片估算。':'长度由照片估算。')+(state.photoOnly?' 当前表情下的尺寸。':''):'此报告尚无这些尺寸，重新分析后可生成。';
   if(state?.status==='unavailable')lengthNote='本次未获得可靠尺寸，原因见“依据”。';
   if(g.status==='demo')lengthNote='示例报告未提供这几项尺寸，非本人测量。';
  }else if(g.id==='brows'){
   const left=g.rows.filter(r=>/R$/.test(r.id)),right=g.rows.filter(r=>/L$/.test(r.id));
   if(left.length)blocks.push({name:'画面左侧',rows:left});if(right.length)blocks.push({name:'画面右侧',rows:right});
   const rest=g.rows.filter(r=>!left.includes(r)&&!right.includes(r));if(rest.length)blocks.push({name:'双侧关系',rows:rest});
  }else if(g.rows.length)blocks.push({name:'',rows:g.rows});
  blocks.forEach((block,index)=>{block.blockKey=g.id+'-'+index;});
  let ratioSummary='',ratioNote='';
  if(g.id==='fiveEyes'&&['outerR','eyeR','inner','eyeL','outerL'].every(id=>find(id))){ratioSummary='五眼比例　'+['outerR','eyeR','inner','eyeL','outerL'].map(id=>find(id).value.toFixed(2)).join(' : ');ratioNote=report.geometry?.groups?.fiveEyes?.reference==='image_right_eye_horizontal'?'从画面左至右排列，以画面右眼宽度为 1。':'从画面左至右排列，沿用原报告眼宽基准。';}
  if(g.id==='outline'&&find('templeWidth')&&find('jawWidth')){ratioSummary=find('templeWidth').value.toFixed(2)+' : 1 : '+find('jawWidth').value.toFixed(2);ratioNote=(['outline-local-2','outline-photo-3'].includes(report.geometry?.groups?.outline?.measurementDefinition?.method)?'眉上缘轮廓':'上部轮廓')+' : 颧区轮廓 : 下颌轮廓点间宽';}
  const cited=g.rows.filter(row=>row.source==='geometry'&&feature&&Array.isArray(feature.metricIds)&&feature.metricIds.includes(row.id));
  const observation=g.id==='outline'?'脸型名称来自 AI 视觉判断，未使用经验证的固定分类阈值。'+(report.analysis.face.observations||[]).join('；'):g.observation+(cited.length?' 关联测量：'+cited.map(row=>row.label+' '+row.display).join('；')+'。':'');
  const simple=['eyes','nose','lips','chin'].includes(g.id);
  const source=g.status==='demo'?g.source:g.id==='outline'?'脸型：AI 视觉判断 · 下表：照片轮廓估算':g.id==='brows'?'眉型：AI 视觉观察 · 数值：眉部轮廓估算':simple?'结论：AI 照片观察':g.source;
  return {...g,source,observation:simple?'':observation,evidenceObservation:observation,conclusions,blocks,lengthNote,ratioSummary,ratioNote,diagram:'/assets/report/diagram-'+g.id+'.png',compact:!['thirds','fiveEyes','outline'].includes(g.id),showReason:!simple&&((g.status==='partial'&&g.id!=='outline')||!g.rows.length),displaySource:source};
 });
}
function providerGroups(report,groups){
 const g=report.geometry;
 return groups.map(group=>{
  const id=group.id,rows=group.rows.map(r=>({...r,display:r.value.toFixed(r.unit==='degree'?2:2)+(r.unit==='degree'?'°':r.unit==='ratio'?' 倍':'' )}));
  const conclusions=id==='thirds'?g.classifications.thirds:id==='fiveEyes'?g.classifications.fiveEyes:id==='outline'?[g.classifications.face]:id==='triangle'?rows.map(r=>r.display):[g.classifications[id]||'暂未识别分类'];
  const tableRows=[...rows];
  if(id==='fiveEyes'){
   tableRows.splice(0,tableRows.length,{id:'five-ratio',label:'五眼比例',display:g.ratios.fiveEyes||'—'},...rows.slice(0,2),{id:'right-result',label:'右眼外侧结果',display:conclusions[0]},...rows.slice(2,4),{id:'inner-result',label:'内眼角间距结果',display:conclusions[1]},...rows.slice(4),{id:'left-result',label:'左眼外侧结果',display:conclusions[2]});
  }
  if(id==='outline')tableRows.unshift({id:'outline-ratio',label:'额部、颧部、下颌宽度比',display:g.ratios.outline||'—'});
  const blocks=id==='thirds'?['上庭','中庭','下庭'].map((name,i)=>({name,blockKey:id+i,rows:[...rows.filter(r=>r.label.startsWith(name)),{id:'result'+i,label:name+'结果',display:conclusions[i]}]})):[{name:'',blockKey:id,rows:tableRows}];
  return {...group,rows,conclusions,blocks,source:'Face++ 面部特征分析',displaySource:'Face++ 面部特征分析',observation:'',evidenceObservation:'分类和数值直接来自 Face++，未用本地算法或大模型重新判定。',lengthNote:rows.some(r=>r.unit==='provider_length')?'长度为 Face++ 接口原始值，单位口径待确认；不作本地毫米换算。':'',ratioSummary:g.ratios[id]||'',ratioNote:g.ratios[id]?'Face++ 返回的比例；左右沿用接口定义。':'',diagram:'/assets/report/diagram-'+id+'.png',compact:!['thirds','fiveEyes','outline'].includes(id),showReason:!rows.length};
 });
}
function brief(text,max=66){
 const sentence=String(text||'').replace(/（[^）]*）/g,'').replace(/Face\+\+\s*(?:显示|检测(?:结果)?[为是：:]?|判断[为是：:]?)?\s*/gi,'').split(/[。\n]/).find(x=>x.trim())||'';
 if(sentence.length<=max)return sentence.replace(/[，；：]$/,'')+(sentence?'。':'');
 const clauses=sentence.split(/[，；]/);let result='';
 for(const clause of clauses){if((result+clause).length>max)break;result+=(result?'，':'')+clause;}
 return result?result+'。':sentence.slice(0,max)+'…';
}
function reportCopy(report){
 const a=report.analysis,d=a.details,face=a.face.label;
 const faceText=({'瓜子脸':'上部较宽，下巴收窄，整体线条流畅。','椭圆脸':'脸部轮廓圆润，额头到下巴过渡自然。','圆脸':'面部线条圆润，轮廓柔和。','方脸':'下颌轮廓较明显，面部线条利落。','长脸':'面部纵向比例较长。','菱形脸':'颧部较宽，额头和下巴相对收窄。'})[face]||brief(a.face.observations?.[0],45);
 const skin=report.geometry?.skin?.items||d.skinConcerns?.items||[];
 const names={eyeBags:'眼袋',darkCircles:'黑眼圈',foreheadLines:'抬头纹',crowFeet:'鱼尾纹',glabellaLines:'眉间纹',nasolabialFolds:'法令纹',foreheadPores:'额头毛孔明显',leftCheekPores:'左颊毛孔明显',rightCheekPores:'右颊毛孔明显',chinPores:'下巴毛孔明显',blackheads:'黑头',acne:'痘痘',spots:'斑点'};
 const findings=skin.map(x=>{const name=names[x.id]||x.name;return {id:x.id,status:x.status,text:/Pores$/.test(x.id)?name.replace('明显',x.status==='present'?'明显':x.status==='not_observed'?'不明显':'待确认'):(x.status==='present'?'有':x.status==='not_observed'?'未见明显':'待确认：')+name};});
 return {face:faceText,summary:brief(a.summary),glasses:d.glasses.map(x=>({...x,reason:brief(x.reason,45)})),browName:d.browRecommendation?.name||'自然眉',browAdvice:brief(d.browRecommendation?.reason||d.browAdvice,55),skin:findings,skinTitle:'你的皮肤分析结果',style:brief(d.styleReason),color:brief(a.color.summary),season:'春夏以清爽透气为主，秋冬增加层次。按你的色彩建议选择单品，更容易搭配。',occasion:tpoCopy.intro+tpoCopy.categories.join('、')+tpoCopy.ending,tpo:tpoCopy,tpoCategories:tpoCopy.categories.join('、'),hair:brief(a.hair.summary),body:brief(a.body.recommendations?.[0]),paletteLabel:a.color.label};
}
// Enum labels match the Face++ official skin analysis demo.
function skinAdvanced(report){
 const r=report.geometry?.raw?.skin;if(report.geometry?.provider!=='Face++'||!r)return null;
 const row=(label,value,key)=>({label,value:value??'未返回',key:key||'',image:!!key});
 const choice=(v,labels)=>Number.isInteger(v)?labels[v]:undefined;
 const binary=k=>choice(r[k]?.value,['未见明显','有']);
 const options=[{key:'original',label:'原图'},...Object.entries({skin_spot:'色斑',mole:'痣',acne:'痘痘',closed_comedones:'闭口粉刺'}).filter(([k])=>Array.isArray(r[k]?.rectangle)).map(([key,label])=>({key,label,count:r[key].rectangle.length}))];
 const counts=options.filter(o=>o.key!=='original').map(o=>row(o.label,o.count+' 处',o.key));
 return {options,sections:[
 {title:'肤质与肤色',rows:[row('肤质',choice(r.skin_type?.skin_type,['油性皮肤','干性皮肤','中性皮肤','混合性皮肤'])),row('肤色',choice(r.skin_color?.value,['透白','白皙','自然','小麦','古铜'])),row('肤色深浅（ITA）',choice(r.skintone_ita?.skintone,['很浅','浅色','中等','小麦色','棕色','深色','光线不适合判断'])),row('肤色色调',choice(r.skin_hue_ha?.skin_hue,['偏黄','中性','偏红','光线不适合判断']))]},
 {title:'色斑与痘痘',rows:counts},
 {title:'肌龄与纹路',rows:[row('估计肌龄',Number.isFinite(r.skin_age?.value)?r.skin_age.value+' 岁':null),...Object.entries({forehead_wrinkle:'抬头纹',nasolabial_fold:'法令纹',crows_feet:'鱼尾纹',glabella_wrinkle:'眉间纹',eye_finelines:'眼部细纹'}).map(([k,n])=>row(n,binary(k)))]},
 {title:'眼部与毛孔',rows:[row('眼袋',binary('eye_pouch')),row('黑眼圈',choice(r.dark_circle?.value,['未见明显','色素型黑眼圈','血管型黑眼圈','阴影型黑眼圈'])),...Object.entries({pores_forehead:'额头毛孔',pores_left_cheek:'左颊毛孔',pores_right_cheek:'右颊毛孔',pores_jaw:'下巴毛孔'}).map(([k,n])=>row(n,choice(r[k]?.value,['不明显','明显']))),row('黑头',choice(r.blackhead?.value,['未见明显','轻度','中度','重度']))]}
 ]};
}
function view(report,groups,wardrobe){
 const a=report.analysis,d=a.details,pref=report.preferences||{},asset=name=>'/assets/report/'+name;
 const select=(key,items)=>({selected:Number.isInteger(d[key])?d[key]:null,items,label:Number.isInteger(d[key])?items[d[key]]:'待补充分析'});
 const volume=select('volume',['大量感','中大量感','中量感','中小量感','小量感']);
 const curve=select('curvature',['直线感','中偏直','直曲居中','中偏曲','曲线感']);
 const dynamics=select('dynamics',['动态','中偏动','动静居中','中偏静','静态']);
 const referenceStyles=[
  {...volume,key:'volume',heading:'你的面部量感为',garmentTitle:'适合你的服装廓形',garmentItems:['大廓形','中大廓形','中廓形','中小廓形','小廓形'],image:asset('style-tailoring.jpg'),explanation:'量感描述轮廓和五官的视觉分量。'+a.style.summary,suggestion:['挺括、清晰的肩线和适度厚度面料，可以形成有结构的轮廓。','选择有一定结构的外套，内搭适当留白，避免层层堆叠。','从合身肩线、中等厚度面料开始，兼顾轮廓与舒适。','轻结构外套与细腻面料更容易保持轻盈，注意肩线与衣长。','选择轻薄面料与适度的小细节，用合身比例保持清爽。'][volume.selected]||'先从合身剪裁开始，补充清晰正脸照后细化建议。'},
  {...curve,key:'curvature',heading:'你的面部曲直感为',garmentTitle:'适合你的服装线条',garmentItems:curve.items,image:asset('style-shirts.jpg'),explanation:curve.selected===null?'这份报告没有曲直感判断。新版分析会结合面部可见轮廓，单独生成线条建议。':'曲直感用于选择领口、剪裁和纹理，不是人格判断。'+d.styleReason,suggestion:curve.selected===null?'可以先比较直线领口与柔和弧线领口，再决定更喜欢的整体效果。':curve.selected<2?'优先比较利落剪裁、直线领口和清晰几何纹理，保持线条连贯。':curve.selected>2?'尝试柔和领口、适度垂坠和细腻纹理，让服装线条与轮廓呼应。':'在直线剪裁中加入柔和面料，兼顾利落与自然。'},
  {...dynamics,key:'dynamics',heading:'你的造型动静为',garmentTitle:'适合你的服装款式',garmentItems:['复杂个性','偏个性','适中','偏简约','简约经典'],image:asset('style-dynamics.png'),explanation:'造型动静关注图案、对比和细节的活跃程度。'+d.styleReason,suggestion:dynamics.selected===null?'先保持一处视觉重点，补充照片后再细化。':dynamics.selected<2?'用一件有设计感的单品作为重点，其余单品保持呼应，避免多个重点相互争抢。':dynamics.selected>2?'以纯色、低对比纹理和整齐线条为主，用少量配饰完成整体。':'用纯色基础款搭配一件纹理或设计单品，让整体有层次又不过分繁复。'}
 ];
 const referenceColors=[
  {...select('lightness',['高明度','中高明度','中明度','中低明度','低明度']),key:'lightness',heading:'你的面部明度为',image:asset('color-lightness.png'),text:'明度影响服装颜色的深浅选择。'+a.color.summary},
  {...select('chroma',['高纯度','中高纯度','中纯度','中低纯度','低纯度']),key:'chroma',heading:'你的面部纯度为',image:asset('color-chroma.png'),text:'纯度影响色彩的鲜明或柔和程度。'+a.color.summary},
  {key:'temperature',heading:'你的面部冷暖倾向为',items:['偏暖','中性','偏冷'],selected:({warm:0,neutral:1,cool:2})[d.temperature]===undefined?null:({warm:0,neutral:1,cool:2})[d.temperature],label:({warm:'偏暖建议',neutral:'中性建议',cool:'偏冷建议'})[d.temperature]||'待自然光复核',image:asset('color-temperature.png'),text:d.temperature==='unknown'?'本次光线不足以判断冷暖。建议在均匀自然光下，分别用偏暖与偏冷衣料靠近面部比较，避免将灯光偏色当成肤色。':a.color.summary}
 ];
 for(const item of referenceStyles)if(d.scaleEvidence&&d.scaleEvidence[item.key])item.explanation+=' 本次依据：'+d.scaleEvidence[item.key];
 for(const item of referenceColors)if(d.scaleEvidence&&d.scaleEvidence[item.key])item.text+=' 本次依据：'+d.scaleEvidence[item.key];
 const measuredBody=Object.fromEntries(Object.entries(report.manualMeasurements||{}).filter(([key,value])=>BODY_FIELDS.some(([id])=>id===key)&&typeof value==='number'&&Number.isFinite(value)&&value>0&&value<=300));
 const bodyRows=bodyMeasurements(report,measuredBody);
 const bodyPhoto=report.geometry?.body;
 const referenceBody={rows:bodyRows,filled:Object.keys(measuredBody).length,label:a.body.label,photoCount:bodyRows.filter(r=>r.source==='照片估算').length,note:bodyPhoto?.status==='available'?'照片估算与身高比例参考分项标注；均非尺量值。':bodyPhoto?.status==='unavailable'?bodyPhoto.reason:'按身高与常见成人比例估算，体重用于 BMI，非本人实测尺寸。'};
 const measuredGroups=groups.filter(g=>g.status!=='demo'&&g.rows.length).length;
 const completion={count:measuredGroups,total:9,percent:Math.round(measuredGroups/9*100),example:report.mode==='demo',label:report.mode==='demo'?'示例报告':'面部项目覆盖率'};

 const styleCombination={source:'根据本报告的量感、曲直与动静建议组合，试穿后调整。',rows:referenceStyles.map(x=>({key:x.key,label:x.garmentTitle,value:x.selected===null?'待补充':x.garmentItems[x.selected],advice:x.suggestion})),note:'量感用于比较面料与轮廓的视觉分量；曲直用于选择线条，不决定衣服大小；动静用于安排细节数量。肩线、衣长与松量仍以实际身形和舒适度为准。'};
 const overview=[{label:'脸型倾向',value:a.face.label,note:({low:'可信度较低',medium:'可信度中等',high:'可信度较高',unknown:'可信度未知'})[a.face.confidence]+' · 照片视觉估计',chapter:0},{label:'风格方向',value:['稳重绅士','潮流前卫','儒雅精致','阳光少年','欧美冷峻','随性自然'][d.styleIndex],note:'结合照片与偏好，属于穿搭建议',chapter:1},{label:'配色方向',value:a.color.label,note:referenceColors[2].label+' · 以实物试色复核',chapter:2}];
 for(const item of referenceStyles){
  if(item.key==='volume')Object.assign(item,require('./style-interpretation').volumeInterpretation(item.selected,item.label,d.scaleEvidence?.volume,report.mode==='demo'));
  else if(item.key==='curvature')Object.assign(item,require('./style-interpretation').curvatureInterpretation(item.selected,item.label,d.scaleEvidence?.curvature,report.mode==='demo'));
  else item.explanation=item.selected===null?'补充清晰照片后，可进一步细化建议。':'你的'+({curvature:'轮廓线条',dynamics:'造型风格'})[item.key]+'偏向「'+item.label+'」。'+(d.scaleEvidence?.[item.key]||'');
  const decision=report.judgmentAudit?.dimensions?.find(x=>x.id===item.key);
  if(decision){item.explanation=decision.explanation;item.suggestion=decision.recommendation;if(decision.heading)item.heading=decision.heading;if(decision.garmentTitle)item.garmentTitle=decision.garmentTitle;if(Number.isInteger(decision.result)){item.selected=decision.result;item.label=decision.label||item.items[decision.result];if(decision.garmentLabel){item.garmentItems=[...item.garmentItems];item.garmentItems[decision.result]=decision.garmentLabel;}}else if(decision.result===null){item.selected=null;item.label='暂待判断';item.garmentTitle='可以尝试的服装方向';}}
 }
 const colorMeaning={lightness:'明度描述颜色的深浅，需要结合皮肤、头发与眼部的明暗关系。',chroma:'纯度描述颜色偏鲜明还是偏柔和，与肤色深浅不同。',temperature:'照片光线偏黄或偏蓝，不等于本人的色彩冷暖。'};
 const colorAdvice={lightness:'可以在同一光线下比较浅色、中等深浅和深色上装，观察面部细节是否清楚。',chroma:'可以比较同色系的柔和色与鲜明色，先小面积试穿，再按喜好调整。',temperature:'在均匀自然光下，分别用偏暖与偏冷衣料靠近面部比较。'};
 for(const item of referenceColors){
  const decision=report.colorAudit?.dimensions?.find(x=>x.id===item.key);
  item.text=decision?decision.meaning+' '+decision.explanation:colorMeaning[item.key]+' '+(d.scaleEvidence?.[item.key]?'本次记录：'+d.scaleEvidence[item.key]:'这份报告未记录本项具体判断依据，当前标签尚待复核。');
  item.advice=decision?.advice||colorAdvice[item.key];
  if(decision){item.heading=decision.heading;if(decision.result===null||decision.result==='unknown'){item.selected=null;item.label='暂待判断';}}
  item.detailText=item.text;
  item.detailAdvice=item.advice;
  if(item.key==='lightness'){
   item.heading='照片中的面部明度参考';
   const suggestions=['可先试浅灰、米白或浅蓝上装，用少量深色增加层次。','可先试浅蓝、浅灰等较浅的颜色，搭配中等深浅的下装。','选色可以先从雾蓝、中灰等中等深浅的颜色开始，搭配少量浅色或深色增加层次。','可先试藏蓝、深灰等较深的颜色，用浅色内搭提亮。','可先试深灰、藏蓝等深色上装，搭配少量浅色形成对比。'];
   item.text=item.selected===null?'这张照片暂时看不准明度。日常搭配可以先从中灰、雾蓝等颜色开始。':'本次照片参考为「'+item.label+'」。'+suggestions[item.selected];
  }else if(item.key==='chroma'){
   item.heading='照片中的面部纯度参考';
   const suggestions=['配色可以更鲜明一些，尝试宝蓝、正红等颜色，用灰色或米白色单品衬托。让一件亮色上装成为重点，其余搭配保持简洁。','配色可以保留一些鲜明感，尝试蓝色、绿色等彩色上装，搭配灰色或米白色下装。把亮色集中在一处，整体更有重点。','配色可以从柔和、不过分鲜艳的颜色开始，例如雾蓝、灰绿或豆沙色。用灰色、米白色作基础，再搭配一件彩色单品，整体简洁又有层次。','可以先尝试雾蓝、灰绿、灰粉等带一点灰感的颜色，搭配米白或浅灰。减少大面积鲜艳撞色，用相近色搭配出柔和、清爽的效果。','可以先从烟灰、灰蓝、灰绿等柔和色入手，以同色系搭配为主。用面料纹理和颜色深浅增加层次，亮色留给小面积配饰。'];
   item.text=item.selected===null?'这张照片还无法判断面部纯度。日常可以先用灰色、米白色搭配一件柔和彩色上装，简单好搭。':'按本次照片分析，你的面部纯度参考为「'+item.label+'」。'+suggestions[item.selected];
  }else item.text=item.selected===null?'暂时无法确定冷暖，先从中性色搭配开始。':('本次照片参考为「'+item.label+'」，可以作为试穿配色的起点。');
  item.advice='';
  if(item.key==='temperature'){
   const code=report.geometry?.provider==='Face++'?report.geometry.raw?.skin?.skin_hue_ha?.skin_hue:null;
   const available=Number.isInteger(code)&&code>=0&&code<=2;
   item.heading='你的面部冷暖参考';item.items=['暖肤色','中性肤色','冷肤色'];item.selected=available?code:null;item.label=available?item.items[code]+'倾向':'暂未确定';
   const suggestions=['可以尝试奶油白、驼色或暖棕色上装，搭配米色、棕色单品，让整体配色温暖协调。','可以尝试米白、灰色或蓝色上装，冷暖色都可以搭配，以整体协调为主。','可以尝试雾蓝、冷灰或蓝紫色上装，搭配白色、深蓝色单品，让整体配色清爽协调。'];
   item.text=available?'根据本次照片的肤色色调，你的配色参考为「'+item.label+'」。'+suggestions[code]:'本次照片还不能确定你的肤色偏冷还是偏暖。选衣服时，可以先用灰色、米白色作为基础，再搭配喜欢的彩色单品，保持配色简洁、协调。';
   item.detailText=available?'依据：Face++ 高阶版返回肤色色调「'+['偏黄','中性','偏红'][code]+'」，按配色参考规则映射为「'+item.label+'」。规则：偏黄→暖肤色倾向，中性→中性肤色倾向，偏红→冷肤色倾向。':'Face++ 未返回可用的肤色色调，或返回了不适合判断的结果。';
   item.detailAdvice='这是产品的配色参考规则，并非 Face++ 直接返回的个人冷暖分类，尚未经过个人色彩测试验证。光线和皮肤泛红可能影响结果，最终以同一光线下的试穿效果为准。';
  }
 }
 return {skinAdvanced:skinAdvanced(report),copy:reportCopy(report),overview,styleCombination,referenceStyles,referenceColors,referenceBody,completion,acquisition:ACQUISITION,wardrobeSummary:wardrobe.map(w=>w.name+' '+w.percent+'%').join('；'),seasonSummary:'围绕「'+a.color.label+'」安排四季搭配，通过面料厚薄、层次和单品比例适应温度变化。'+a.style.summary,occasionSummary:'TPO 指时间、地点与场合。结合你的常用场景，分别安排'+a.occasions.map(o=>o.occasion).join('、')+'的着装。',hairSummary:a.hair.summary,bodyFields:BODY_FIELDS.map(([id,label])=>({id,label,value:String(measuredBody[id]||'')}))};
}
// Winter-style nominal segment proportions: not personalized anthropometry.
// Source: NASA 20100039626, Table 3; shoulder breadth 2 × 0.129H.
function bodyMeasurements(report,manual={}){
 const height=Number(report.profile?.height),adult=Number(report.profile?.age)>=18;
 const ratios={shoulder:.258,arm:.44,upperArm:.186,forearm:.146,torso:.288,hand:.108,leg:.491,calf:.246};
 const body=report.geometry?.body;
 const photos=body?.status==='available'&&Math.abs(body.heightCm-height)<.01?body.metrics||[]:[];
 const fields=[...BODY_FIELDS];
 for(const [id,label]of [['shoulderHand','肩至手部'],['elbowHand','肘至手部']])if(photos.some(m=>m.id===id))fields.push([id,label]);
 return fields.map(([id,label])=>{
  const photo=photos.find(m=>m.id===id&&m.source==='photo_estimate'&&m.unit==='cm'&&Number.isFinite(m.value)&&m.value>0&&m.value<height);
  const reference=adult&&height>=100&&height<=250&&ratios[id]?Math.round(height*ratios[id]*10)/10:null;
  const value=manual[id]||photo?.value||reference;
  const source=manual[id]?'用户尺量':photo?'照片估算':reference?'身高比例参考':'待补充';
  return {id,label,value:value||'',source,estimated:source==='照片估算'||source==='身高比例参考',display:value?(manual[id]?'':'约 ')+value.toFixed(1)+' cm':'—'};
 });
}
module.exports={faceGroups,view,BODY_FIELDS,skinAdvanced,bodyMeasurements};
