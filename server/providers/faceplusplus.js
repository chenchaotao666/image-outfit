const {ApiError,image:validateImage}=require('../contract');
const BASE='https://api-cn.faceplusplus.com/facepp/v1/';
const labels={pointed_face:'瓜子脸',oval_face:'椭圆脸',round_face:'圆脸',square_face:'方脸',long_face:'长脸',diamond_face:'菱形脸',heart_face:'心形脸',big_eyes:'大眼',small_eyes:'小眼',normal_eyes:'标准眼型',bushy_eyebrows:'粗眉',thin_eyebrows:'细眉',normal_eyebrows:'标准眉',normal_nose:'标准鼻',big_nose:'宽鼻',small_nose:'小鼻',normal_lip:'标准唇',thick_lip:'厚唇',thin_lip:'薄唇',sharp_jaw:'尖下巴',round_jaw:'圆下巴',square_jaw:'方下巴'};
const label=(value)=>labels[value]||'暂未识别分类';
const get=(o,path)=>path.split('.').reduce((v,k)=>v?.[k],o);
const groups=['thirds','fiveEyes','outline','triangle','brows','eyes','nose','lips','chin'];
const specs={
 outline:[['额部宽度','face.tempus_length'],['颧骨宽度','face.zygoma_length'],['脸部长度','face.face_length'],['下颌角宽度','face.mandible_length'],['下颌角度','face.E','degree']],
 triangle:[['眼鼻三角角度','golden_triangle','degree']],
 brows:[['眉毛宽度','eyebrow.brow_width'],['眉毛高度','eyebrow.brow_height'],['眉毛挑度','eyebrow.brow_uptrend_angle','degree'],['眉毛弯度','eyebrow.brow_camber_angle','degree'],['眉毛粗细','eyebrow.brow_thick']],
 eyes:[['眼睛宽度','eyes.eye_width'],['眼睛高度','eyes.eye_height'],['内眦角度','eyes.angulus_oculi_medialis','degree']],
 nose:[['鼻翼宽度','nose.nose_width']],
 lips:[['嘴巴高度','mouth.mouth_height'],['嘴巴宽度','mouth.mouth_width'],['嘴唇厚度','mouth.lip_thickness'],['嘴角角度','mouth.angulus_oris','degree']],
 chin:[['下巴宽度','jaw.jaw_width'],['下巴长度','jaw.jaw_length'],['下巴角度','jaw.jaw_angle','degree']]
};
const skinSpecs=[['eyeBags','眼袋','eye_pouch'],['darkCircles','黑眼圈','dark_circle'],['foreheadLines','抬头纹','forehead_wrinkle'],['crowFeet','鱼尾纹','crows_feet'],['glabellaLines','眉间纹','glabella_wrinkle'],['nasolabialFolds','法令纹','nasolabial_fold'],['foreheadPores','额头毛孔','pores_forehead'],['leftCheekPores','左脸颊毛孔','pores_left_cheek'],['rightCheekPores','右脸颊毛孔','pores_right_cheek'],['chinPores','下巴毛孔','pores_jaw'],['blackheads','黑头','blackhead'],['acne','痘痘外观','acne'],['spots','色斑外观','skin_spot']];
function skinResult(r){
 const items=skinSpecs.map(([id,name,key])=>{
  const v=r[key],boxes=Array.isArray(v?.rectangle)?v.rectangle:null;
  const allowed=['dark_circle','blackhead'].includes(key)?[0,1,2,3]:[0,1];
  const known=boxes!==null||allowed.includes(v?.value),present=known&&(boxes?boxes.length>0:v.value!==0);
  return {id,name,source:'Face++',field:key,rawValue:v?.value??null,confidence:Number.isFinite(v?.confidence)?v.confidence:null,count:boxes?.length??null,status:!known?'uncertain':present?'present':'not_observed',severity:!known?'unknown':present?'detected':'none',regionIds:[],evidence:!known?'Face++ 未返回此项有效结果。':`Face++ 高阶版：${present?'检出':'未检出明显'}${name}${boxes?'，候选区域 '+boxes.length+' 处':''}。`,advice:'在均匀光线下复核，日常温和清洁并注意防晒。'};
 });
 return {version:'skin-concerns-1',provider:'Face++',items,skinTypeCode:r.skin_type?.skin_type??null,extra:{eyeFineLines:r.eye_finelines,closedComedones:r.closed_comedones?.rectangle?.length??null}};
}
function adapt(features,skin){
 const r=features.result,s=skin.result;
 if(!r||!s||!r.face||!r.three_parts||!r.eyes||!r.nose||!r.mouth||!r.jaw||!r.eyebrow||!r.five_eyes||!Object.keys(s).length)throw new ApiError('FACE_INVALID_RESPONSE','Face++ 检测结果不完整，请重试',502);
 const geometry={provider:'Face++',version:'faceplusplus-1',status:'available',metrics:[],groups:{},classifications:{},skin:skinResult(s),requests:{features:features.request_id,skin:skin.request_id}};
 const metric=(group,name,path,unit='provider_length')=>{const value=get(r,path);if(!Number.isFinite(value))return;geometry.metrics.push({id:group+'.'+path,group,label:name,value,unit,source:'geometry',provider:'Face++',status:'available',formula:'Face++ 原始字段 result.'+path+'；直接展示接口值，未使用本地算法重算。'});};
 for(const [g,list]of Object.entries(specs))for(const row of list)metric(g,...row);
 for(const [part,prefix,name]of [['one_part','faceup','上庭'],['two_part','facemid','中庭'],['three_part','facedown','下庭']]){
  metric('thirds',name+'长度',`three_parts.${part}.${prefix}_length`);metric('thirds',name+'占比',`three_parts.${part}.${prefix}_ratio`,'fraction');
  const code=r.three_parts[part]?.[prefix+'_result'];geometry.classifications[part]=code===prefix+'_long'?name+'偏长':code===prefix+'_short'?name+'偏短':code===prefix+'_normal'?name+'标准':'暂未识别分类';
 }
 for(const [name,path,unit]of [['右外眼角留白距离','one_eye.righteye_empty_length'],['右外眼角留白占比','one_eye.righteye_empty_ratio','ratio'],['内眼角间距','three_eye.eyein_length'],['内眼角间距占比','three_eye.eyein_ratio','ratio'],['左外眼角留白距离','five_eye.lefteye_empty_length'],['左外眼角留白占比','five_eye.lefteye_empty_ratio','ratio']])metric('fiveEyes',name,'five_eyes.'+path,unit);
 geometry.classifications.face=label(r.face.face_type);
 for(const [id,path]of [['brows','eyebrow.eyebrow_type'],['eyes','eyes.eyes_type'],['nose','nose.nose_type'],['lips','mouth.mouth_type'],['chin','jaw.jaw_type']])geometry.classifications[id]=label(get(r,path));
 geometry.classifications.thirds=['one_part','two_part','three_part'].map(k=>geometry.classifications[k]);
 geometry.classifications.fiveEyes=[['one_eye.righteye_empty_result','righteye_empty','右眼外侧'],['three_eye.eyein_result','eyein','内眼角间距'],['five_eye.lefteye_empty_result','lefteye_empty','左眼外侧']].map(([path,prefix,name])=>{const c=get(r.five_eyes,path);return c===prefix+'_short'?name+'偏窄':c===prefix+'_long'?name+'偏宽':c===prefix+'_normal'?name+'适中':'暂未识别分类';});
 geometry.ratios={fiveEyes:r.five_eyes.eyes_ratio,outline:r.face.ABD_ratio};
 for(const id of groups)geometry.groups[id]={status:geometry.metrics.some(m=>m.group===id)?'available':'unavailable',reason:'由 Face++ 面部特征分析 API 返回。长度保留接口原值；尚未核实单位口径，不冒充尺量毫米值。'};
 // Preserve provider outputs for audit without exposing credentials or face tokens.
 geometry.raw={features:r,skin:s};
 return geometry;
}
function applyDetection(analysis,g){
 if(g?.provider!=='Face++')return analysis;
 analysis.quality={...(analysis.quality||{}),usable:true,faceVisible:true,issues:analysis.quality?.issues||[],bodyVisible:analysis.quality?.bodyVisible===true};
 analysis.face={label:g.classifications.face,observations:['Face++ 面部特征分析返回的脸型分类。'],confidence:'unknown',limitations:['照片角度、光照和表情可能影响检测。']};
 const d=analysis.details||(analysis.details={});
 const old=Array.isArray(d.features)?d.features:[];
 d.features=['brows','eyes','nose','lips','chin','skin'].map(id=>({id,label:id==='skin'?'皮肤检测结果':g.classifications[id],observation:id==='skin'?'Face++ 高阶版皮肤分析。':'Face++ 面部特征分析分类。',advice:old.find(f=>f.id===id)?.advice||'结合检测结果选择适合自己的日常造型。',metricIds:g.metrics.filter(m=>m.group===id).map(m=>m.id)}));
 d.skinConcerns=g.skin;d.skinReport=null;d.skinObservations=null;
 return analysis;
}
function evidence(features,skin,prepared){
 const {width:w,height:h}=prepared;const groups={};
 const path=(label,points)=>({label,points:points.map(p=>[p.x/w,p.y/h]),metricIds:[]});
 const valid=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y)&&p.x>=0&&p.x<=w&&p.y>=0&&p.y<=h;
 const names={brows:['left_eyebrow','right_eyebrow'],eyes:['left_eye','right_eye'],nose:['nose'],lips:['mouth'],chin:['face'],outline:['face'],thirds:['face','left_eyebrow','right_eyebrow','nose'],fiveEyes:['left_eye','right_eye','face'],triangle:['left_eye','right_eye','nose']};
 for(const [id,keys]of Object.entries(names))groups[id]=keys.flatMap(key=>Object.entries(features.denselandmark?.[key]||{}).filter(([,p],i)=>valid(p)&&i%4===0).map(([name,p])=>path('Face++ 关键点 '+name,[p])));
 for(const [id,name,key]of skinSpecs){const boxes=skin.result[key]?.rectangle;groups['skinConcern:'+id]=Array.isArray(boxes)?boxes.filter(b=>[b.left,b.top,b.width,b.height].every(Number.isFinite)&&b.width>0&&b.height>0&&b.left>=0&&b.top>=0&&b.left+b.width<=w&&b.top+b.height<=h).map(b=>path('Face++ '+name+'候选区域',[{x:b.left,y:b.top},{x:b.left+b.width,y:b.top},{x:b.left+b.width,y:b.top+b.height},{x:b.left,y:b.top+b.height},{x:b.left,y:b.top}])):[];}
 return {version:'photo-evidence-1',provider:'Face++',photo:prepared.preview,width:w,height:h,groups,note:'标记为 Face++ 返回的关键点或候选区域，不是本地重算的测量端点。未返回位置的项目仅展示原照片，不补画定位。'};
}
async function detect(face,signal,config,fetchImpl=fetch,prepare=require('./provider-image').prepare){
 signal.throwIfAborted();
 const mock=require('./face-mock').load(config);if(mock)return mock.geometry;
 if(!config.faceApiKey||!config.faceApiSecret)throw new ApiError('FACE_NOT_CONFIGURED','请配置 Face++ API Key 和 API Secret',503);
 validateImage(face);
 const prepared=await prepare(face,signal);face=prepared.face;
 const [header,data]=face.split(','),mime=header.slice(5,header.indexOf(';'));
 async function call(endpoint){
  signal.throwIfAborted();const body=new FormData();body.set('api_key',config.faceApiKey);body.set('api_secret',config.faceApiSecret);body.set('image_file',new Blob([Buffer.from(data,'base64')],{type:mime}),'face.'+(mime==='image/png'?'png':'jpg'));if(endpoint==='facialfeatures')body.set('return_imagereset','0');
  let response;try{response=await fetchImpl(BASE+endpoint,{method:'POST',body,signal:AbortSignal.any([signal,AbortSignal.timeout(60000)]),redirect:'error'});}catch(e){if(signal.aborted)throw new ApiError('CANCELLED','检测已取消',499);throw new ApiError('FACE_UNAVAILABLE','暂时无法连接 Face++，请稍后重试',502);}
  let result;try{result=await response.json();}catch{throw new ApiError('FACE_INVALID_RESPONSE','Face++ 返回格式异常',502);}
  if(!response.ok||result.error_message){const code=String(result.error_message||'').split(':')[0];const msg={CONCURRENCY_LIMIT_EXCEEDED:'Face++ 并发额度已满，请稍后重试',AUTHENTICATION_ERROR:'Face++ 密钥无效，请检查服务配置',AUTHORIZATION_ERROR:'Face++ 接口未授权，请检查所购服务',INSUFFICIENT_BALANCE:'Face++ 余额不足',INVALID_IMAGE_FACE:'Face++ 未获得可用人脸，请使用清晰单人正脸照',INVALID_IMAGE_SIZE:'Face++ 不支持此图片尺寸，请重新上传',IMAGE_ERROR_UNSUPPORTED_FORMAT:'Face++ 无法读取图片格式'}[code]||'Face++ 检测失败，请检查接口权限、额度或照片后重试';throw new ApiError('FACE_DETECTION_FAILED',msg,response.status===429?429:502);}
  return result;
 }
 // Sequential calls avoid consuming a free key's concurrency twice at once. No paid automatic retries.
 const features=await call('facialfeatures');const skin=await call('skinanalyze_advanced');
 const g=adapt(features,skin);g.photoEvidence=evidence(features,skin,prepared);return g;
}
module.exports={detect,adapt,applyDetection,skinResult,evidence};
