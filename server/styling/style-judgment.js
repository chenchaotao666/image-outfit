const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../config/llm-prompt');
const fields=['face','brows','eyes','nose','lips','chin'];
function load(){
 const rules=JSON.parse(fs.readFileSync(path.join(root,'风格DNA/面部量感与曲直感/面部量感与曲直感-判断规则.json'),'utf8'));
 const evidence=JSON.parse(fs.readFileSync(path.join(root,'判断依据-文献与理论.json'),'utf8'));
 const dynamics=JSON.parse(fs.readFileSync(path.join(root,'风格DNA/造型动静/造型动静-推荐规则.json'),'utf8'));
 if(!dynamics.version||dynamics.outputMode!=='llm_guided'||dynamics.dimension!=='dynamics'||!dynamics.sourceIds?.length||dynamics.sourceIds.some(id=>!evidence.sources.some(s=>s.id===id))||!evidence.decisionGuidelines.some(g=>g.id===dynamics.guidelineId)||dynamics.fallback?.result!==null||dynamics.levels?.length!==5||dynamics.levels.some((l,i)=>l.value!==i||!l.label||!l.criterion||!l.recommendation))throw Error('造型动静规则无效');
 if(!rules.version||!Array.isArray(rules.dimensions)||rules.dimensions.length!==2)throw Error('风格判断规则缺失');
 const ids=new Set();
 for(const r of rules.dimensions){
  if(!['volume','curvature'].includes(r.id)||ids.has(r.id)||!r.ruleId||r.classificationStatus!=='styling_reference'||r.outputMode!=='llm_guided')throw Error('风格分类规则模式无效');
  if(!Array.isArray(r.levels)||r.levels.length!==5||r.levels.some((l,i)=>l.value!==i||!['label','criterion','garmentLabel','recommendation'].every(key=>typeof l[key]==='string'&&l[key].trim()))||!['heading','garmentTitle','evidenceRequirement','explanationTemplate'].every(key=>typeof r[key]==='string'&&r[key].trim()))throw Error('风格分类档位或文案缺失');
  ids.add(r.id);
  if(!r.sourceIds?.length||r.sourceIds.some(id=>!evidence.sources.some(s=>s.id===id))||!evidence.decisionGuidelines.some(g=>g.id===r.guidelineId))throw Error('判断规则的文献引用无效');
  if(!r.inputFields?.length||r.inputFields.some(f=>!fields.includes(f))||!['logic','reason','recommendation','limits'].every(k=>typeof r[k]==='string'&&r[k].trim()))throw Error('判断规则缺少逻辑或边界');
 }
 return {rules,evidence,dynamics,hash:crypto.createHash('sha256').update(JSON.stringify({rules,evidence,dynamics})).digest('hex')};
}
function guidance(k){return {version:k.rules.version,dimensions:k.rules.dimensions,dynamics:k.dynamics,instruction:require('./styling-prompts').config.judgmentInstruction};}
function apply(analysis,geometry,k,preferences={}){
 const d=analysis.details;if(!d)return null;
 d.scaleEvidence=d.scaleEvidence||{};
 const dimensions=k.rules.dimensions.map(r=>{
  const facts=geometry?.provider==='Face++'?r.inputFields.filter(field=>typeof geometry.classifications?.[field]==='string'&&!/暂未|未知|未识别/.test(geometry.classifications[field])).map(field=>({field,value:geometry.classifications[field],source:'Face++',path:'geometry.classifications.'+field})):[];
  const evidence=typeof d.scaleEvidence[r.id]==='string'?d.scaleEvidence[r.id].trim():'';
  const metrics=(geometry?.metrics||[]).filter(m=>m.status==='available'&&Number.isFinite(m.value));
  const level=Number.isInteger(d[r.id])&&evidence&&(facts.length||metrics.length)?r.levels.find(l=>l.value===d[r.id]):null;
  const result=level?level.value:null;
  const explanation=level?r.explanationTemplate.replace('{dimension}',r.id==='volume'?'面部量感':'面部曲直感').replace('{label}',level.label).replace('{evidence}',()=>evidence):((facts.length?'本次检测记录：'+facts.map(f=>f.value).join('、')+'。':'')+r.reason);
  d[r.id]=result;d.scaleEvidence[r.id]=evidence||explanation;
  return {id:r.id,ruleId:r.ruleId,status:level?'styling_reference':'insufficient_evidence',outputMode:r.outputMode,heading:r.heading,garmentTitle:r.garmentTitle,label:level?.label,garmentLabel:level?.garmentLabel,facts,metricIds:metrics.map(m=>m.id),logic:r.logic,result,explanation,recommendation:level?.recommendation||r.recommendation,limits:r.limits,guideline:k.evidence.decisionGuidelines.find(g=>g.id===r.guidelineId),sources:r.sourceIds.map(id=>k.evidence.sources.find(s=>s.id===id))};
 });
 const policy=k.dynamics,evidence=typeof d.scaleEvidence.dynamics==='string'?d.scaleEvidence.dynamics.trim():'';
 const facts=dimensions[0].facts;
 const matched=facts.length&&evidence&&Number.isInteger(d.dynamics)?policy.levels.find(l=>l.value===d.dynamics):null;
 const result=matched?matched.value:null,explanation=matched?evidence:policy.fallback.explanation;
 d.dynamics=result;d.scaleEvidence.dynamics=explanation;
 dimensions.push({id:'dynamics',ruleId:matched?'dynamics-level-'+result:'dynamics-insufficient',status:matched?'styling_reference':'insufficient_input',heading:policy.heading,garmentTitle:policy.garmentTitle,label:matched?.label,facts,logic:policy.logic,result,explanation,recommendation:matched?.recommendation||policy.fallback.recommendation,limits:policy.limits,guideline:k.evidence.decisionGuidelines.find(g=>g.id===policy.guidelineId),sources:policy.sourceIds.map(id=>k.evidence.sources.find(s=>s.id===id))});
 return {version:k.rules.version,dynamicsVersion:policy.version,hash:k.hash,evidenceVersion:k.evidence.version,dimensions};
}
module.exports={load,guidance,apply};
