const {test}=require('node:test');const assert=require('node:assert/strict');
const http=require('node:http');const fs=require('node:fs');
const {request,result}=require('../server/contract');const {payload,analyze}=require('../server/providers/deepseek');const {createApi}=require('../server/api');
const profile={gender:'男',age:28,height:175,weight:140};
const input={consent:true,profile,images:{face:'data:image/jpeg;base64,'+fs.readFileSync('miniprogram/assets/face.jpg').toString('base64')}};
const fixture=require('./ai-fixture.cjs');
module.exports={fixture,input};
test('consent, profile and real image encoding are required',()=>{
 assert.equal(request(input).profile.weight,140);
 for(const data of [{...input,consent:false},{...input,profile:{...profile,age:0}},{...input,images:{face:'data:image/jpeg;base64,aGVsbG8='}}])assert.throws(()=>request(data));
});
test('normalized report cannot invent body classification without body photo',()=>{
 const report=result(fixture,false);assert.equal(report.body.label,'未评估身形');assert.equal(report.body.confidence,'unknown');assert.equal(report.quality.bodyVisible,false);
 assert.throws(()=>result({...fixture,quality:{...fixture.quality,usable:false}},false),{code:'PHOTO_UNSUITABLE'});
 assert.throws(()=>result({...fixture,color:{...fixture.color,palette:[]}},true),{code:'INVALID_MODEL_OUTPUT'});
});
test('provider payload includes images and correct weight; output errors are not demo fallback',async()=>{
 const data=request(input),options={apiKey:'test-secret',baseUrl:'https://api.deepseek.com',model:'deepseek-flash',timeout:1000};
 const p=payload(data,options.model);assert.equal(p.messages[1].content[1].type,'image_url');assert.equal(JSON.parse(p.messages[1].content[0].text).profile.weightKg,70);
 const signal=new AbortController().signal;
 const mock=content=>async()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content}}]})});
 assert.equal((await analyze(data,options,signal,mock(JSON.stringify(fixture)))).summary,'简洁自然');
 await assert.rejects(analyze(data,options,signal,mock('invalid')), {code:'INVALID_MODEL_OUTPUT'});
 await assert.rejects(analyze(data,options,signal,async()=>({ok:false,status:401})),{code:'MODEL_AUTH'});
 await assert.rejects(analyze(data,options,signal,mock('')), {code:'INCOMPLETE_MODEL_OUTPUT'});
});
test('HTTP requires session and rejects retired detection route without calling LLM',async t=>{
 let calls=0;const api=createApi({apiKey:'secret-test',model:'deepseek-flash',production:false},async data=>{calls++;return result(fixture,Boolean(data.images.body));});
 const server=http.createServer(api);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>server.close());const base='http://127.0.0.1:'+server.address().port;
 const post=(path,data,token)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});
 assert.equal((await post('/api/analyze',input)).status,401);
 const {token}=await (await post('/api/session',{})).json();
 assert.equal((await post('/api/analyze',input,token)).status,410);assert.equal(calls,0);
 assert.equal((await fetch(base+'/api/session',{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'})).status,403);
});
