const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function load(){
 const root=path.resolve(__dirname,'../../config/llm-prompt'),config=JSON.parse(fs.readFileSync(path.join(root,'色彩DNA/面部色彩属性/面部色彩属性-判断规则.json'),'utf8')),refs=JSON.parse(fs.readFileSync(path.join(root,'判断依据-文献与理论.json'),'utf8'));
 if(config.dimensions?.map(x=>x.id).join(',')!=='lightness,chroma,temperature'||config.sourceIds.some(id=>!refs.sources.some(s=>s.id===id)))throw Error('色彩判断配置无效');
 if(config.chromaStandard?.classificationEnabled!==false||config.chromaStandard.status!=='pending_validation')throw Error('纯度分类尚无经过验证的执行器，不允许直接启用');
 const skinTone=JSON.parse(fs.readFileSync(path.join(root,'色彩DNA/面部色彩属性/面部冷暖-色调映射规则.json'),'utf8'));
 if(skinTone.labels?.length!==3||skinTone.invalidCode!==3)throw Error('肤色色调配置无效');
 return {config,skinTone,sources:config.sourceIds.map(id=>refs.sources.find(s=>s.id===id)),hash:crypto.createHash('sha256').update(JSON.stringify({config,refs,skinTone})).digest('hex')};
}
function apply(analysis,policy,geometry){
 const d=analysis.details;d.scaleEvidence=d.scaleEvidence||{};
 const dimensions=policy.config.dimensions.map(r=>{
  const observation=typeof d.scaleEvidence[r.id]==='string'?d.scaleEvidence[r.id].trim():'';
  const photo=r.id==='temperature'?null:d.photoColor?.[r.id];
  // This is an evidence-presence check, not verification of model accuracy.
  const hasEvidence=r.id==='lightness'?/皮肤|肤色/.test(observation)&&/头发|发色|眼|虹膜/.test(observation):false;
  const legacyLightness=!d.photoColor&&hasEvidence&&Number.isInteger(d[r.id])&&d[r.id]>=0&&d[r.id]<=4;
  const valid=Boolean(photo)||legacyLightness;
  const result=r.id==='temperature'?'unknown':r.id==='lightness'&&valid?(photo?.level??d.lightness):null;
  d[r.id]=result;
  const explanation=photo?'本次正脸照观察：'+photo.skin+' '+photo.otherRegion:legacyLightness?'本次照片观察：'+observation:r.missing;
  d.scaleEvidence[r.id]=explanation;
  return {id:r.id,heading:r.heading,result,photoLevel:photo?.level??null,status:valid?'model_photo_observation':'insufficient_evidence',observation,explanation,meaning:r.meaning,advice:r.advice,logic:r.logic,requiredEvidence:r.requiredEvidence};
 });
 const code=geometry?.provider==='Face++'?geometry.raw?.skin?.skin_hue_ha?.skin_hue:null;
 const available=Number.isInteger(code)&&code>=0&&code<=2;
 const skinTone={...policy.skinTone,rawValue:code??null,result:available?policy.skinTone.labels[code]:null,temperatureSuggestion:available?policy.skinTone.temperatureMapping[code]:null};
 return {version:policy.config.version,hash:policy.hash,sources:policy.sources,sourceSection:policy.config.sourceSection,limits:policy.config.limits,chromaStandard:policy.config.chromaStandard,skinTone,dimensions};
}
module.exports={load,apply};
