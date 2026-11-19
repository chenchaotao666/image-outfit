// Recover transport/presentation wrappers only. Never invent missing fields,
// close truncated JSON, evaluate code, or alter strings/measurement values.
function parseReport(text){
 if(typeof text!=='string'||text.length>200000)throw new SyntaxError('Invalid report text');
 let s=text.replace(/^\uFEFF/,'').trim();
 const fence=s.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i);
 if(fence)s=fence[1].trim();
 let parsed;
 try{parsed=JSON.parse(s);}catch{
  if(s.startsWith('['))throw new SyntaxError('Expected report object, not array');
  let start=-1,depth=0,quoted=false,escaped=false;const candidates=[];
  for(let i=0;i<s.length;i++){
   const ch=s[i];
   if(start<0){if(ch==='{'){start=i;depth=1;}continue;}
   if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;continue;}
   if(ch==='"')quoted=true;
   else if(ch==='{')depth++;
   else if(ch==='}'&&--depth===0){candidates.push(s.slice(start,i+1));start=-1;}
  }
  if(start>=0||candidates.length!==1)throw new SyntaxError('Incomplete or ambiguous report');
  parsed=JSON.parse(candidates[0]);
 }
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new SyntaxError('Expected report object');
 // Only a sole, known envelope is unwrapped. Normal schema validation follows.
 const keys=Object.keys(parsed);
 if(keys.length===1&&['report','data'].includes(keys[0])){
  const inner=parsed[keys[0]];
  if(inner&&typeof inner==='object'&&!Array.isArray(inner))parsed=inner;
 }
 return parsed;
}
module.exports={parseReport};
