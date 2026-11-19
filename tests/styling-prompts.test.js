const test=require('node:test'),assert=require('node:assert/strict');
const prompts=require('../server/styling/styling-prompts'),{payload}=require('../server/providers/deepseek');
const input={profile:{weight:140},images:{face:'test'},reportVersion:2};
test('shared prompt retains profile, ratios, skin color and separately labelled body references',()=>{
 const geometry=structuredClone(require('../config/mock/Face检测数据.json').geometry);
 geometry.raw.secret='must-not-leak';
 const text=prompts.render({profile:{age:34,height:175,weight:140},geometry}).providerDetails;
 assert.ok(text.includes('用户填写的年龄：34'));
 assert.ok(text.includes('身高（cm）：175'));assert.ok(text.includes('体重（kg）：70'));
 for(const [prefix,value] of [['脸部已有比例：',geometry.ratios],['接口估计的皮肤年龄：',geometry.raw.skin.skin_age]])assert.ok(text.includes(prefix+JSON.stringify(value)));
 assert.ok(text.includes('"skin_hue_ha"'));assert.ok(text.includes('身高比例参考：['));
 assert.ok(!text.includes('must-not-leak'));
});
test('both model modes use configured prompt files and resolved scoring rules',()=>{
 for(const provider of [false,true]){
  const body=payload({...input,geometry:provider?{provider:'Face++'}:{}},'test');
  const rendered=prompts.render({...input,geometry:provider?{provider:'Face++'}:{}});
  assert.equal(body.messages[0].content,(provider?rendered.providerSystem:rendered.system)+'\n'+(provider?rendered.providerDetails:rendered.details));
  assert.ok(!body.messages[0].content.includes('{{stylingScore}}'));
  assert.equal(body.max_tokens,prompts.config.parameters.v2MaxTokens);
 }
 assert.ok(!prompts.providerDetails.includes('必须返回skinConcerns'));
 assert.ok(prompts.details.includes('必须返回skinConcerns'));
});
test('dynamic variables preserve units, missing values and matched evidence without recursive expansion',()=>{
 const r=prompts.render({...input,profile:{age:34,height:175,weight:140},preferences:{style:'{{user.age}}'},geometry:{provider:'Face++',classifications:{face:'圆脸'},raw:{secret:'never-expose'}},apiKey:'never-expose'});
 assert.ok(r.providerDetails.includes('体重（kg）：70'));
 assert.ok(r.providerDetails.includes('身高（cm）：175'));
 assert.ok(r.providerDetails.includes('"glasses-round"'));
 assert.ok(r.providerDetails.includes('"glasses-long"')); // raw candidates, not preselected results
 assert.ok(r.providerDetails.includes('"abdo-frames"'));
 assert.ok(!r.providerDetails.includes('"{{user.age}}"'));
 assert.ok(!r.providerDetails.includes('never-expose'));
 const missing=prompts.render({}).details;
 assert.ok(missing.includes('体重（kg）：null'));
 assert.ok(missing.includes('候选参考规则：'+JSON.stringify(require('../config/styling/形象DNA/眼镜推荐/眼镜推荐-推荐规则.json').rules)));
 assert.ok(missing.includes('脸部分类：null'));
});
test('configured output mode selects fixed rule replacement versus model-guided wording',()=>{
 const knowledge=require('../server/styling/styling-knowledge'),k=knowledge.load();
 const analysis={details:{glasses:[{name:'模型的试戴建议'}]}};
 k.modules.glasses.outputMode='llm_guided';
 const audit=knowledge.apply(analysis,k,{face:'圆脸'});
 assert.equal(analysis.details.glasses[0].name,'模型的试戴建议');
 assert.equal(audit.skipped[0].reason,'llm_guided');
 k.modules.glasses.outputMode='fixed_rule';knowledge.apply(analysis,k,{face:'圆脸'});
 assert.equal(analysis.details.glasses[0].name,'矩形框');
});
test('repair instructions and conditional business guidance come from configuration',()=>{
 const body=payload({...input,reportRepair:true,repairText:'broken'},'test');
 assert.ok(body.messages[0].content.endsWith(prompts.repair));
 assert.equal(body.messages.at(-1).content,prompts.repairUser);
 assert.equal(body.temperature,prompts.config.parameters.repairTemperature);
 const judgment=require('../server/styling/style-judgment');assert.equal(judgment.guidance(judgment.load()).instruction,prompts.config.judgmentInstruction);
 assert.match(prompts.hash,/^[a-f0-9]{64}$/);
});
test('every module resolves its variables and shares the actual program decisions',()=>{
 const preferences={style:'个性鲜明',occasion:'商务通勤',maintenance:'轻松打理'};
 const geometry={provider:'Face++',classifications:{face:'长脸'},raw:{skin:{skin_hue_ha:{skin_hue:2}}},body:{status:'not_provided',metrics:[]},skinRegions:[{id:'forehead',usable:true,detailUsable:false,image:'private-image'}]};
 const rendered=prompts.render({...input,preferences,geometry});
 for(const text of Object.values(rendered))assert.ok(!/\{\{[^{}]+\}\}/.test(text),'unresolved module variable');
 const decision=prefix=>JSON.parse(rendered.providerDetails.split('\n').find(line=>line.startsWith(prefix)).slice(prefix.length));
 assert.ok(!rendered.providerDetails.includes('程序已匹配的结果：'));
 assert.ok(!rendered.providerDetails.includes('程序已匹配的结论：'));
 assert.deepEqual(decision('配色选择规则：'),require('../config/styling/色彩DNA/色彩类型分析/色彩类型分析-推荐规则.json'));
 assert.deepEqual(decision('衣橱规划规则：'),require('../config/styling/衣橱规划/衣橱分析/衣橱规划-推荐规则.json'));
 assert.ok(rendered.details.includes('"glasses-long"'));
 assert.ok(rendered.details.includes('禁用规则中的set、advice和示例不可作为已生效依据'));
 assert.ok(!rendered.details.includes('private-image'));
 for(const title of ['眉型推荐','身材搭配建议','面部量感','面部曲直感','造型动静建议','个人风格推荐','色彩搭配推荐','四季搭配','发型推荐','TPO场合穿搭','衣橱规划建议'])assert.ok(rendered.providerDetails.includes('【'+title+'】'),title);
});
test('missing data and unclassified policies stay explicit across all module templates',()=>{
 const result=prompts.render({});
 assert.ok(result.details.includes('人体估算数据：null'));
 assert.ok(result.details.includes('"classificationStatus":"styling_reference"'));
 assert.ok(result.details.includes('"classificationEnabled":false'));
 assert.ok(result.details.includes('候选规则与依据：'+JSON.stringify(require('../config/styling/形象DNA/眉型推荐/眉型推荐-推荐规则.json').rules)));
 assert.ok(!result.providerDetails.includes('必须返回skinConcerns'));
});

test('all prompt files are loaded and color inputs stay relevant to the task',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const root=path.resolve(__dirname,'../config/styling'),config=prompts.config;
 const registered=[config.system,config.output,config.providerSystem,...config.details,...config.photoEvidence,config.providerDetails,config.repair,config.repairUser];
 const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.relative(root,path.join(dir,e.name)).replaceAll('\\','/')]);
 assert.deepEqual(walk(root).filter(f=>f.endsWith('-LLM提示词.txt')).sort(),[...registered].sort());
 const color=fs.readFileSync(path.join(root,'色彩DNA/面部色彩属性/面部色彩属性-LLM提示词.txt'),'utf8');
 for(const v of ['skin.data','skin.color','面部色彩属性-判断规则.json','面部冷暖-色调映射规则.json'])assert.ok(color.includes('{{'+v+'}}'));
 for(const v of ['user.age','user.heightCm','user.weightKg'])assert.ok(!color.includes('{{'+v+'}}'));
 const order=config.details.join('\n');
 assert.ok(order.indexOf('曲直感-LLM')<order.indexOf('个人风格-LLM'));
 assert.ok(order.indexOf('面部色彩属性-LLM')<order.indexOf('配色推荐-LLM'));
 assert.ok(prompts.providerSystem.includes('geometry.mock.enabled=true'));
});

test('season prompt resolves business names and excludes page-only content',()=>{
 const text=prompts.render(input).providerDetails;
 const section=text.split('【四季搭配】')[1].split('【')[0];
 const refs=JSON.parse(section.split('\n').find(s=>s.startsWith('四季通用参考：')).slice('四季通用参考：'.length));
 assert.equal(refs.length,4);
 assert.deepEqual(refs,require('../config/styling/季节搭配/四季搭配/四季搭配-季节参考.json').seasons);
 for(const value of ['本目录文件','图片库','页面文案','config/styling','{{四季搭配.'])assert.ok(!section.includes(value),value);
 assert.ok(section.includes('输出策略："llm_guided"'));
});

test('file placeholders inject original JSON values without aliasing or filtering',()=>{
 const text=prompts.render(input).providerDetails;
 const policy=require('../config/styling/风格DNA/个人风格/个人风格-推荐规则.json');
 assert.ok(text.includes('判断配置：'+JSON.stringify(policy)));
 const score=require('../config/styling/形象DNA/造型评分/造型评分-评分规则.json');
 assert.ok(text.includes(JSON.stringify(score)));
 const mode=require('../config/styling/季节搭配/四季搭配/四季搭配-生成规则.json').modules.seasons.outputMode;
 assert.ok(text.includes('输出策略：'+JSON.stringify(mode)));
 assert.ok(!/\{\{[^{}]+\}\}/.test(text));
});

test('color, seasons and occasions use explicit source files instead of a computed color alias',()=>{
 const fs=require('node:fs');
 const palettes=require('../config/styling/色彩DNA/色彩搭配/色彩搭配指南-配色方案.json').palettes;
 const copies=require('../config/styling/色彩DNA/色彩类型分析/色彩类型分析-界面文案.json').results;
 for(const hue of [0,1,2,null,'2',99]){
  const text=prompts.render({...input,geometry:{provider:'Face++',raw:{skin:{skin_hue_ha:{skin_hue:hue}}}}}).providerDetails;
  for(const title of ['色彩搭配推荐','四季搭配','TPO场合穿搭']){
   const section=text.split('【'+title+'】')[1].split('【')[0];
   const get=prefix=>JSON.parse(section.split('\n').find(s=>s.startsWith(prefix)).slice(prefix.length));
   assert.deepEqual(get('可选配色色板：'),palettes);
   assert.deepEqual(get('配色名称与解读：'),copies);
   assert.equal(get('接口肤色与色调：').skin_hue_ha.skin_hue,hue);
   assert.ok(section.includes('类型不符或未匹配时使用fallback'));
  }
 }
 const registry=require('../config/styling/LLM提示词-变量定义.json');
 assert.ok(!Object.hasOwn(registry.variables,'运行结果.推荐配色'));
 assert.ok(!fs.readFileSync(require.resolve('../server/styling/styling-prompts'),'utf8').includes("require('../../miniprogram/packages/analysis/utils/color-guide')"));
});

test('every configuration placeholder resolves to its exact file value and no runtime aliases remain',()=>{
 const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'../config/styling');
 const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
 const files=walk(root),jsonFiles=new Map(files.filter(f=>f.endsWith('.json')).map(f=>[path.basename(f),JSON.parse(fs.readFileSync(f,'utf8'))]));
 const registry=jsonFiles.get('LLM提示词-变量定义.json').variables;
 assert.ok(Object.values(registry).every(v=>['profile','geometry','hasBodyPhoto','provider'].includes(v.path.split('.')[0])));
 const rendered=Object.values(prompts.render(input)).join('\n');
 let checked=0;
 for(const f of files.filter(f=>f.endsWith('-LLM提示词.txt'))){
  const raw=fs.readFileSync(f,'utf8');
  assert.ok(!/\{\{(?:运行结果|policy|rules|decision)\./.test(raw),f);
  for(const [,token] of raw.matchAll(/\{\{([^{}]+)\}\}/g)){
   if(Object.hasOwn(registry,token))continue;
   const m=/^(.+?\.json)(?:\.(.+))?$/.exec(token);
   assert.ok(m,token);let value=jsonFiles.get(m[1]);assert.notEqual(value,undefined,token);
   for(const key of m[2]?.split('.')||[]){assert.ok(Object.hasOwn(value,key),token);value=value[key];}
   assert.ok(rendered.includes(JSON.stringify(value)),token);checked++;
  }
 }
 assert.ok(checked>30);
 const body=payload({...input,stylingKnowledge:require('../server/styling/styling-knowledge').load(),stylingContext:{face:'圆脸'},styleJudgment:require('../server/styling/style-judgment').load()},'test');
 const userText=body.messages[1].content.filter(c=>c.type==='text').map(c=>c.text).join('\n');
 assert.ok(!userText.includes('stylingKnowledge'));
 assert.ok(!userText.includes('styleJudgment'));
});
