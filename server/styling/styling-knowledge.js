const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const FILE=path.resolve(__dirname,'../../config/llm-prompt/推荐规则-加载索引.json');
const fields=new Set(['face','brows','occasion','style','maintenance','hasBodyPhoto','temperature']);
const text=v=>typeof v==='string'&&v.trim().length>0&&v.length<=500;
const list=(v,n,fn=text)=>Array.isArray(v)&&v.length===n&&v.every(fn);
const targets={
 'style.tips':v=>list(v,3),
 'body.recommendations':v=>list(v,3),
 'details.browRecommendation':v=>v&&text(v.name)&&text(v.reason)&&list(v.steps,3)
};
function validate(k){
 const fail=m=>{throw Error('穿搭知识配置无效：'+m);};
 if(!text(k.version)||!k.sources||!k.modules||!Array.isArray(k.rules))fail('缺少版本、来源、模块或规则');
 for(const [id,s]of Object.entries(k.sources)){if(!text(s.title)||!['editorial','external'].includes(s.kind)||!text(s.reviewStatus)||(s.kind==='external'&&!(typeof s.url==='string'&&s.url.startsWith('https://'))))fail('来源 '+id);}
 for(const [id,m]of Object.entries(k.modules))if(!text(m.name)||!text(m.output)||!text(m.instruction)||(m.outputMode&&!['fixed_rule','llm_guided'].includes(m.outputMode)))fail('模块 '+id);
 const ids=new Set();
 for(const r of k.rules){
  if(!/^[a-z0-9-]+$/.test(r.id)||ids.has(r.id))fail('规则 ID 重复或非法');ids.add(r.id);
  if(!k.modules[r.module]||typeof r.enabled!=='boolean'||!Number.isInteger(r.priority)||!text(r.reason))fail(r.id+' 基本信息');
  if(!Array.isArray(r.sourceIds)||!r.sourceIds.length||r.sourceIds.some(id=>!k.sources[id]))fail(r.id+' 来源不存在');
  if(r.enabled){
   if(!Array.isArray(r.evidence)||!r.evidence.length)fail(r.id+' 启用规则必须有具体理论依据');
   for(const e of r.evidence)if(!r.sourceIds.includes(e.sourceId)||k.sources[e.sourceId]?.kind!=='external'||!['locator','principle','application','limits','verifiedAt','verification'].every(key=>text(e[key])))fail(r.id+' 依据缺少章节、原理、应用、边界或核对记录');
   if(r.sourceIds.some(id=>!r.evidence.some(e=>e.sourceId===id)))fail(r.id+' 来源未对应具体依据');
  }
  if(!Array.isArray(r.advice)||!r.advice.length||!r.advice.every(text))fail(r.id+' 建议为空');
  if(!r.when||!Array.isArray(r.when.all)||!r.when.all.length)fail(r.id+' 缺少适用条件');
  for(const c of r.when.all)if(!fields.has(c.field)||!['eq','in'].includes(c.op)||(c.op==='in'&&(!Array.isArray(c.value)||!c.value.length))||c.value==null)fail(r.id+' 条件不合法');
  if(!r.set||Array.isArray(r.set)||typeof r.set!=='object')fail(r.id+' set 必须是对象');
  for(const [target,value]of Object.entries(r.set))if(!targets[target]||!targets[target](value))fail(r.id+' 输出不合法 '+target);
 }
 return k;
}
function load(file=FILE){
 const data=JSON.parse(fs.readFileSync(file,'utf8'));
 if(data.files){
  const root=path.dirname(file);data.modules={};data.rules=[];
  for(const name of data.files){
   const target=path.resolve(root,name);
   if(!target.startsWith(root+path.sep)||path.extname(target)!=='.json')throw Error('推荐规则路径无效 '+name);
   const part=JSON.parse(fs.readFileSync(target,'utf8'));
   for(const [id,module] of Object.entries(part.modules||{})){
    if(data.modules[id])throw Error('推荐模块重复 '+id);
    data.modules[id]=module;
   }
   data.rules.push(...part.rules);
  }
 }
 const k=validate(data);return {...k,hash:crypto.createHash('sha256').update(JSON.stringify(k)).digest('hex')};
}
function context(input){return {face:input.geometry?.provider==='Face++'?input.geometry.classifications?.face:undefined,brows:input.geometry?.provider==='Face++'?input.geometry.classifications?.brows:undefined,occasion:undefined,style:undefined,maintenance:undefined,hasBodyPhoto:!!input.images?.body,temperature:'unknown'};}
function match(k,c){return k.rules.filter(r=>r.enabled&&r.when.all.every(x=>c[x.field]!==undefined&&c[x.field]!==null&&(x.op==='eq'?c[x.field]===x.value:x.value.includes(c[x.field])))).sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));}
function guidance(k,c){return {version:k.version,modules:k.modules,rules:match(k,c).map(r=>({id:r.id,module:r.module,advice:r.advice,reason:r.reason,evidence:r.evidence,sources:r.sourceIds.map(id=>k.sources[id])})),instruction:require('./styling-prompts').config.knowledgeInstruction};}
function apply(analysis,k,c){
 const rules=match(k,c),chosen=new Map(),skipped=[];
 for(const r of rules)for(const [target,value]of Object.entries(r.set)){
  if(k.modules[r.module].outputMode==='llm_guided'){skipped.push({id:r.id,target,reason:'llm_guided'});continue;}
  if(chosen.has(target)){const prior=chosen.get(target);if(prior.priority===r.priority)throw Error('穿搭规则优先级冲突：'+prior.id+' / '+r.id+' / '+target);skipped.push({id:r.id,target,winner:prior.id});continue;}
  chosen.set(target,r);
 }
 for(const [target,r]of chosen){const [section,key]=target.split('.');if(!analysis[section])throw Error('缺少建议模块 '+section);analysis[section][key]=JSON.parse(JSON.stringify(r.set[target]));if(target==='details.browRecommendation')analysis.details.browAdvice=r.set[target].steps.join('；');}
 return {version:k.version,hash:k.hash,matchedRules:rules.map(r=>({id:r.id,module:r.module,conditions:r.when.all.map(x=>({...x,actual:c[x.field],inputSource:['face','brows'].includes(x.field)?'Face++':x.field==='temperature'?'未校准色温':'用户输入'})),reason:r.reason,advice:r.advice,evidence:r.evidence,sources:r.sourceIds.map(id=>({id,...k.sources[id]}))})),applied:[...chosen].map(([target,r])=>({target,ruleId:r.id,value:r.set[target]})),skipped};
}
module.exports={load,validate,context,match,guidance,apply};
