const {ApiError}=require('../contract');
const FEATURES=['brows','eyes','nose','lips','chin','skin'];
const STYLES=['稳重绅士','潮流前卫','儒雅精致','阳光少年','欧美冷峻','随性自然'];
const assessment=require('../../miniprogram/packages/analysis/utils/report-assessment');
const PROMPT=require('../styling/styling-prompts').details;
function validate(raw,context){
 const fail=()=>{throw new ApiError('INVALID_MODEL_OUTPUT','分项报告尚未生成完整，请重试',502);};
 const str=v=>{if(typeof v!=='string'||!v.trim()||v.length>500)fail();return v.trim();};
 const list=(v,n,fn)=>{if(!Array.isArray(v)||v.length!==n)fail();return v.map(fn);};
 if(!raw||typeof raw!=='object')fail();const o={};
 for(const key of ['volume','dynamics','lightness','chroma']){if(raw[key]!==null&&(!Number.isInteger(raw[key])||raw[key]<0||raw[key]>4))fail();o[key]=raw[key];}
 if(raw.curvature!=null&&(!Number.isInteger(raw.curvature)||raw.curvature<0||raw.curvature>4))fail();o.curvature=raw.curvature==null?null:raw.curvature;
 if(raw.styleIndex!==null&&(!Number.isInteger(raw.styleIndex)||raw.styleIndex<0||raw.styleIndex>5))fail();o.styleIndex=raw.styleIndex;o.styleReason=str(raw.styleReason);
 if(!['warm','cool','neutral','unknown'].includes(raw.temperature))fail();o.temperature=raw.temperature;
 o.features=list(raw.features,6,(f,i)=>{if(!f||f.id!==FEATURES[i])fail();const ids=f.metricIds==null?[]:f.metricIds;if(!Array.isArray(ids)||ids.some(id=>typeof id!=='string')||ids.length>10)fail();const metrics=context?.geometry?.metrics||[];return {id:f.id,label:str(f.label),observation:str(f.observation),advice:str(f.advice),metricIds:context?[...new Set(ids)].filter(id=>metrics.some(m=>m.id===id&&m.group===f.id&&m.source==='geometry'&&m.status==='available'&&Number.isFinite(m.value))):[]};});
 o.scaleEvidence={};if(raw.scaleEvidence!=null){if(typeof raw.scaleEvidence!=='object'||Array.isArray(raw.scaleEvidence))fail();for(const key of ['volume','curvature','dynamics','lightness','chroma','temperature'])o.scaleEvidence[key]=str(raw.scaleEvidence[key]);}
 o.glasses=list(raw.glasses,3,g=>({name:str(g.name),reason:str(g.reason),tier:str(g.tier)}));o.browAdvice=str(raw.browAdvice);
 if(raw.browRecommendation!=null){const b=raw.browRecommendation;o.browRecommendation={name:str(b.name),reason:str(b.reason),steps:list(b.steps,3,str)};}
 o.outfits=list(raw.outfits,4,(x,i)=>{if(x.season!==['春','夏','秋','冬'][i])fail();if(!Array.isArray(x.colors)||x.colors.length<2||x.colors.length>3||x.colors.some(c=>!/^#[0-9a-f]{6}$/i.test(c)))fail();return Object.fromEntries([...['season','title','top','bottom','layer','shoes','accessory','reason'].map(k=>[k,str(x[k])]),['colors',x.colors]]);});
 o.hairOptions=list(raw.hairOptions,3,x=>Object.fromEntries(['name','reason','maintenance'].map(k=>[k,str(x[k])])));
 try{o.stylingScore=assessment.validate(raw.stylingScore);o.skinObservations=assessment.validateSkin(raw.skinObservations);}catch(e){fail();}
 try{o.skinReport=assessment.validateSkinReport(raw.skinReport);o.skinConcerns=assessment.validateSkinConcerns(raw.skinConcerns,context);}catch(e){fail();}
 if(context?.quality&&o.stylingScore){const q=context.quality;o.stylingScore.items=o.stylingScore.items.map(item=>{const allowed=assessment.scoreAllowed(item.id,q);return allowed?item:{...item,level:null,evidence:item.id==='detail'?'缺少可用正脸照片，未评价发型与细节。':'缺少可用全身照片，未评价此项实际穿搭。'};});}
 return o;
}
module.exports={PROMPT,validate,STYLES};
