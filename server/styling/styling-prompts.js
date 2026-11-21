const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../config/llm-prompt');
function load(){
 const config=JSON.parse(fs.readFileSync(path.join(root,'LLM提示词-加载索引.json'),'utf8'));
 const registry=JSON.parse(fs.readFileSync(path.join(root,'LLM提示词-变量定义.json'),'utf8'));
 const variables=registry.variables;
 for(const [name,v] of Object.entries(variables)){
  if(!/^[\p{L}][\p{L}\p{N}_.-]*$/u.test(name)||typeof v.path!=='string'||v.path.split('.').some(x=>['__proto__','prototype','constructor'].includes(x))||!['profile','geometry','hasBodyPhoto','provider'].includes(v.path.split('.')[0])||(v.transform&&v.transform!=='jinToKg'))throw Error('变量定义无效 '+name);
 }
 const configFiles=new Map(),fileValues={};
 function collect(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   const file=path.join(dir,entry.name);
   if(entry.isDirectory())collect(file);
   else if(entry.name.endsWith('.json')){
    if(configFiles.has(entry.name))throw Error('配置文件名重复 '+entry.name);
    configFiles.set(entry.name,file);
   }
  }
 }
 collect(root);
 function resolveFile(token){
  const match=/^([^/\\]+\.json)(?:\.(.+))?$/.exec(token);
  if(!match)return false;
  if(!configFiles.has(match[1]))throw Error('配置文件不存在 '+match[1]);
  let value=JSON.parse(fs.readFileSync(configFiles.get(match[1]),'utf8'));
  for(const key of match[2]?.split('.')||[]){
   if(['__proto__','prototype','constructor'].includes(key)||value===null||typeof value!=='object'||!Object.hasOwn(value,key))throw Error('配置字段不存在 '+token);
   value=value[key];
  }
  fileValues[token]=value;
  return true;
 }
 const files={};
 function read(name){
  if(typeof name!=='string')throw Error('提示词文件名无效');
  const file=path.resolve(root,name);
  if(!file.startsWith(root+path.sep)||path.extname(file)!=='.txt')throw Error('提示词路径无效 '+name);
  const text=fs.readFileSync(file,'utf8');if(!text.trim())throw Error('提示词为空 '+name);
  files[name]=text;
  const rendered=text;
  for(const token of rendered.matchAll(/\{\{([^{}]+)\}\}/g))if(!Object.hasOwn(variables,token[1])&&!resolveFile(token[1]))throw Error('未知提示词占位符 '+token[1]+' in '+name);
  return rendered;
 }
 if(!config.version||!Array.isArray(config.details)||!config.details.length)throw Error('提示词索引无效');
 const p=config.parameters;
 if(!p||![p.temperature,p.repairTemperature].every(x=>typeof x==='number'&&x>=0&&x<=2)||![p.maxTokens,p.v2MaxTokens].every(x=>Number.isInteger(x)&&x>0))throw Error('LLM生成参数无效');
 for(const key of ['task','cropTemplate','judgmentInstruction','knowledgeInstruction'])if(typeof config[key]!=='string'||!config[key].trim())throw Error('缺少LLM配置 '+key);
 const output=read(config.output),core=config.details.map(read).join('');
 const result={config,system:read(config.system)+output,details:core,repair:read(config.repair),repairUser:read(config.repairUser)};
 result.hash=crypto.createHash('sha256').update(JSON.stringify({config,files,registry,fileValues})).digest('hex');
 result.render=input=>{
  // Only explicit report facts are exposed, never raw images, credentials or arbitrary request fields.
  const profile=input.profile||{},geometry=input.geometry||{};
  const pick=(object,keys)=>Object.fromEntries(keys.filter(key=>object?.[key]!==undefined).map(key=>[key,object[key]]));
  const skinRaw=geometry.provider==='Face++'?geometry.raw?.skin:null;
  const skinColor=skinRaw?pick(skinRaw,['skin_color','skintone_ita','skin_hue_ha']):null;
  const bodyReference=require('../../miniprogram/packages/analysis/utils/report-reference').bodyMeasurements({profile}).filter(row=>row.source==='身高比例参考');
  const context={profile:{age:profile.age,height:profile.height,weight:profile.weight,gender:profile.gender},geometry:{ratios:geometry.ratios,skinColor,skinAge:skinRaw?.skin_age,bodyReference,classifications:geometry.classifications,metrics:geometry.metrics,skin:geometry.skin,groups:geometry.groups,body:geometry.body?pick(geometry.body,['status','reason','metrics','heightCm','calibration']):null},hasBodyPhoto:!!input.images?.body,provider:geometry.provider||null};
  const values={...fileValues};
  for(const [name,v] of Object.entries(variables)){
   if(v.fields&&(!Array.isArray(v.fields)||!v.fields.length||v.fields.some(key=>typeof key!=='string'||!/^\w+$/.test(key)||['__proto__','prototype','constructor'].includes(key))))throw Error('变量字段筛选无效 '+name);
   let value=v.provider&&geometry.provider!==v.provider?null:v.path.split('.').reduce((o,key)=>o&&Object.hasOwn(o,key)?o[key]:undefined,context);
   if(v.transform==='jinToKg')value=typeof value==='number'&&Number.isFinite(value)?value/2:null;
   if(v.fields&&value!=null)value=Array.isArray(value)?value.map(item=>pick(item,v.fields)):pick(value,v.fields);
   values[name]=value??null;
  }
  const render=text=>text.replace(/\{\{([^{}]+)\}\}/g,(_,key)=>JSON.stringify(values[key]));
  return {system:render(result.system),details:render(result.details),repair:render(result.repair),repairUser:render(result.repairUser)};
 };
 result.crop=crop=>config.cropTemplate.replaceAll('{{name}}',crop.name).replaceAll('{{id}}',crop.id);
 return result;
}
module.exports={...load(),load};
