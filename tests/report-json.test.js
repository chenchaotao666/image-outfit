const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseReport}=require('../server/analysis/report-json');
const {analyze}=require('../server/providers/deepseek');
const fixture=require('./ai-fixture.cjs');
test('recover a single complete report from markdown, prose and sole known envelopes without changing strings',()=>{
 const r={quality:{usable:true},summary:'文字中的 { } 和 "引号" 与 \\ 路径'};
 const s=JSON.stringify(r);
 for(const t of [s,'\uFEFF'+s,'```json\n'+s+'\n```','分析结果如下：\n'+s+'\n报告结束',JSON.stringify({report:r}),JSON.stringify({data:r})])assert.deepEqual(parseReport(t),r);
 for(const t of ['{"a":1',s+'\n'+s,'[', '['+s,'[]','null','{"a":undefined}','{"a":1,}','{"a":"line\nbreak"}'])assert.throws(()=>parseReport(t));
 assert.deepEqual(parseReport('{"report":{"quality":{}},"other":1}'),{report:{quality:{}},other:1});
});
test('format repair receives failed content, still validates schema, and is bounded to two attempts',async()=>{
 const input={profile:{weight:140},images:{face:'data:image/jpeg;base64,test'},geometry:{status:'unavailable'}};
 const config={apiKey:'mock',baseUrl:'https://example.invalid',model:'test',timeout:1000};
 const signal=new AbortController().signal;let calls=0;
 const broken='{"summary":"unfinished';
 const mock=async(url,opts)=>{
  const p=JSON.parse(opts.body);calls++;
  if(calls===2){assert.equal(p.messages[2].role,'assistant');assert.equal(p.messages[2].content,broken);assert.equal(p.temperature,0);}
  return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:calls===1?broken:JSON.stringify(fixture)}}]})};
 };
 assert.equal((await analyze(input,config,signal,mock)).summary,fixture.summary);assert.equal(calls,2);
 calls=0;
 await assert.rejects(analyze(input,config,signal,async()=>{calls++;return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:'```json\n{"quality":{}}\n```'}}]})};}),{code:'INVALID_MODEL_OUTPUT'});
 assert.equal(calls,2);
 calls=0;
 await assert.rejects(analyze(input,config,signal,async()=>{calls++;return {ok:true,json:async()=>({choices:[{finish_reason:'length',message:{content:JSON.stringify(fixture)}}]})};}),{code:'INCOMPLETE_MODEL_OUTPUT'});
 assert.equal(calls,2);
});
