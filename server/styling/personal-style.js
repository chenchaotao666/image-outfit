const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function load(){
 const root=path.resolve(__dirname,'../../config/llm-prompt');
 const config=JSON.parse(fs.readFileSync(path.join(root,'风格DNA/个人风格/个人风格-推荐规则.json'),'utf8'));
 const refs=JSON.parse(fs.readFileSync(path.join(root,'判断依据-文献与理论.json'),'utf8'));
 const names=['稳重绅士','潮流前卫','儒雅精致','阳光少年','欧美冷峻','随性自然'];
 if(!config.version||!config.rules?.length||config.fallback?.index!==null||config.sourceIds.some(id=>!refs.sources.some(s=>s.id===id)))throw Error('个人风格配置无效');
 for(const r of config.rules)if(!r.id||!Number.isInteger(r.index)||names[r.index]!==r.label||!r.criterion||!r.advice)throw Error('个人风格规则无效');
 return {config,sources:config.sourceIds.map(id=>refs.sources.find(s=>s.id===id)),hash:crypto.createHash('sha256').update(JSON.stringify({config,refs})).digest('hex')};
}
function apply(analysis,geometry={},policy){
 const {config}=policy,d=analysis.details;
 const reason=typeof d.styleReason==='string'?d.styleReason.trim():'';
 const facts=geometry.provider==='Face++'?Object.entries(geometry.classifications||{}).filter(([,v])=>typeof v==='string').map(([field,value])=>({field,value,source:'Face++'})):[];
 const matched=Number.isInteger(d.styleIndex)&&reason&&facts.length?config.rules.find(r=>r.index===d.styleIndex):null;
 const r=matched||config.fallback;
 d.styleIndex=r.index;d.styleReason=matched?reason:r.reason;
 return {version:config.version,hash:policy.hash,ruleId:matched?.id||'personal-style-insufficient',result:r.label,index:r.index,reason:d.styleReason,advice:r.advice,facts,logic:config.logic,limits:config.limits,sources:policy.sources};
}
module.exports={load,apply};
