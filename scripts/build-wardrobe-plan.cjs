const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'config/llm-prompt/衣橱规划/衣橱分析/衣橱规划-推荐规则.json'),'utf8'));
const refs=JSON.parse(fs.readFileSync(path.join(root,'config/llm-prompt/判断依据-文献与理论.json'),'utf8'));
for(const id of config.sourceIds)if(!refs.sources.some(s=>s.id===id))throw Error('未知文献 '+id);
const ids=new Set();for(const group of ['color','style','quantity'])for(const r of [...config[group+'Rules'],config[group+'Default']]){
 if(ids.has(r.id)||!r.reason)throw Error('规则无效 '+r.id);ids.add(r.id);
 if(r.when&&Object.keys(r.when).some(k=>!['styleIndex'].includes(k)))throw Error('未知输入');
 if(group==='quantity'){if(r.counts.length!==config.categories.length||!r.counts.every(n=>Number.isInteger(n)&&n>=0)||!r.counts.some(n=>n>0))throw Error('数量无效');}
 else if(!Number.isInteger(r.percent)||r.percent<0||r.percent>100)throw Error('比例无效');
}
const itemRules=JSON.parse(fs.readFileSync(path.join(root,'config/llm-prompt/衣橱规划/衣橱单品/衣橱单品-展示规则.json'),'utf8'));
const itemLibrary=JSON.parse(fs.readFileSync(path.join(root,'config/llm-prompt/衣橱规划/衣橱单品/衣橱单品-图片库.json'),'utf8'));
for(const g of itemRules.groups)if(!config.categories.some(c=>c.name===g.category))throw Error('未知衣橱分类 '+g.id);
const imageIds=new Set();for(const x of [itemLibrary.cover,...itemLibrary.images]){
 if(!x.source||!x.rights||!x.src.startsWith('/packages/wardrobe-guide/assets/')||x.src.includes('..')||!fs.existsSync(path.join(root,'miniprogram',x.src)))throw Error('单品素材无效 '+x.src);
 if(x.id){if(imageIds.has(x.id)||!itemRules.groups.some(g=>g.id===x.group)||!x.advice||!x.name||!Number.isInteger(x.order))throw Error('单品配置无效 '+x.id);imageIds.add(x.id);}
}
const out='// Generated from config/llm-prompt/衣橱规划.\nmodule.exports='+JSON.stringify({...config,itemRules,itemLibrary,sources:refs.sources.filter(s=>config.sourceIds.includes(s.id))},null,2)+';\n';
const target=path.join(root,'miniprogram/shared/guides/wardrobe-plan-data.js');
if(process.argv.includes('--check')){if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==out)throw Error('请运行 npm run build:wardrobe-plan');}else fs.writeFileSync(target,out);
console.log('Wardrobe rules validated.');
