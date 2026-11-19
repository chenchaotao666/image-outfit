const {validate}=require('../miniprogram/packages/analysis/utils/analysis');
class ApiError extends Error{constructor(code,message,status=400){super(message);this.code=code;this.status=status;}}
const fail=(message)=>{throw new ApiError('INVALID_MODEL_OUTPUT',message,502);};
function text(value,name,max=900){if(typeof value!=='string'||!value.trim()||value.length>max)fail('模型返回的报告内容不完整，请重试');return value.trim();}
function strings(value,name,min=0,max=12){if(!Array.isArray(value)||value.length<min||value.length>max)fail('模型返回的报告列表不完整，请重试');return value.map(v=>text(v,name,500));}
function object(value){if(!value||Array.isArray(value)||typeof value!=='object')fail('模型返回的报告格式无效，请重试');return value;}
function confidence(value){if(!['low','medium','high','unknown'].includes(value))fail('模型未提供可信度说明，请重试');return value;}
function image(data){
 if(typeof data!=='string'||data.length>6*1024*1024||!/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(data))throw new ApiError('INVALID_IMAGE','请使用JPEG或PNG照片，每张不超过4MB');
 const [header,base64]=data.split(',');const bytes=Buffer.from(base64,'base64');
 if(bytes.length>4*1024*1024||bytes.toString('base64')!==base64)throw new ApiError('INVALID_IMAGE','照片编码无效或超过4MB，请重新选择');
 let width=0,height=0,mime='';
 if(bytes.length>=33&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&bytes.toString('ascii',12,16)==='IHDR'){width=bytes.readUInt32BE(16);height=bytes.readUInt32BE(20);mime='image/png';}
 else if(bytes.length>4&&bytes[0]===255&&bytes[1]===216){mime='image/jpeg';let p=2;while(p+8<bytes.length){if(bytes[p]!==255)break;const marker=bytes[p+1];if(marker===255){p++;continue;}if(marker===218||marker===217)break;const length=bytes.readUInt16BE(p+2);if(length<2||p+2+length>bytes.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){height=bytes.readUInt16BE(p+5);width=bytes.readUInt16BE(p+7);break;}p+=length+2;}}
 if(!width||!height||width>8192||height>8192||width*height>24000000||!header.startsWith('data:'+mime+';'))throw new ApiError('INVALID_IMAGE','无法读取照片或尺寸过大，请使用清晰的JPEG/PNG照片');
 return data;
}
function request(input){
 if(!input||input.consent!==true)throw new ApiError('CONSENT_REQUIRED','请先同意 Face++ 照片检测和 DeepSeek 穿搭分析');
 const profile=input.profile;if(!profile||typeof profile!=='object')throw new ApiError('INVALID_PROFILE','请填写基本资料');
 const error=validate(profile);if(error)throw new ApiError('INVALID_PROFILE',error);
 if(!input.images||!input.images.face)throw new ApiError('IMAGE_REQUIRED','请先选择一张清晰的正脸照片');
 return {profile:{gender:profile.gender,age:Number(profile.age),height:Number(profile.height),weight:Number(profile.weight)},preferences:{},images:{face:image(input.images.face),body:input.images.body?image(input.images.body):null}};
}
function result(raw,hasBody){
 const r=object(raw),q=object(r.quality);
 for(const key of ['usable','faceVisible','bodyVisible'])if(typeof q[key]!=='boolean')fail('模型未返回照片质量检查');
 const quality={usable:q.usable,faceVisible:q.faceVisible,bodyVisible:hasBody&&q.bodyVisible,issues:strings(q.issues,'issues')};
 if(!quality.usable||!quality.faceVisible)throw new ApiError('PHOTO_UNSUITABLE','照片中未发现清晰、可供分析的单人正脸，请换一张自然光下的正脸照片。',422);
 const f=object(r.face),b=object(r.body),s=object(r.style),c=object(r.color),h=object(r.hair);
 const palette=c.palette;if(!Array.isArray(palette)||palette.length<3||palette.length>8)fail('配色建议不完整，请重试');
 const normalized={
  quality,summary:text(r.summary,'summary'),
  face:{label:text(f.label,'face',80),observations:strings(f.observations,'observations',1),confidence:confidence(f.confidence),limitations:strings(f.limitations,'limitations')},
  body:{label:hasBody&&quality.bodyVisible?text(b.label,'body',100):'未评估身形',recommendations:strings(b.recommendations,'body recommendations',1),confidence:hasBody&&quality.bodyVisible?confidence(b.confidence):'unknown'},
  style:{keywords:strings(s.keywords,'keywords',1,6),summary:text(s.summary,'style'),tips:strings(s.tips,'tips',1)},
  color:{label:text(c.label,'color',80),summary:text(c.summary,'color'),confidence:confidence(c.confidence),palette:palette.map(p=>{object(p);if(!/^#[0-9a-fA-F]{6}$/.test(p.hex))fail('配色格式无效，请重试');return{name:text(p.name,'color name',30),hex:p.hex,usage:text(p.usage,'usage',240)};})},
  seasonal:rows(r.seasonal,['season','recommendation'],4,4),wardrobe:rows(r.wardrobe,['category','items','reason'],3,8),occasions:rows(r.occasions,['occasion','recommendation'],3,6),
  hair:{summary:text(h.summary,'hair'),styles:strings(h.styles,'hair styles',1,6),colors:strings(h.colors,'hair colors',1,5),limitations:strings(h.limitations,'hair limitations')},warnings:strings(r.warnings,'warnings')
 };
 if(!quality.bodyVisible){normalized.body.recommendations=['未提供可用全身照，以下搭配建议仅供参考，不包含个人身材分类。'];normalized.warnings.unshift('缺少可用全身照，未评估个人体型。');}
 normalized.warnings.unshift('照片受光线、角度和滤镜影响；本报告为穿搭建议，不提供精确面部测量或医疗判断。');
 return normalized;
}
function rows(value,keys,min,max){if(!Array.isArray(value)||value.length<min||value.length>max)fail('报告分类不完整，请重试');return value.map(row=>{object(row);return Object.fromEntries(keys.map(key=>[key,text(row[key],key,600)]));});}
module.exports={ApiError,request,result,image};
