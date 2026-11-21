const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'config/llm-prompt/季节搭配/四季搭配');
const read=name=>JSON.parse(fs.readFileSync(path.join(folder,name+'.json'),'utf8'));
const data={rules:{...read('四季搭配-页面文案与展示规则'),seasons:read('四季搭配-季节参考').seasons},library:read('四季搭配-图片库')};
const refs=JSON.parse(fs.readFileSync(path.join(root,'config/llm-prompt/判断依据-文献与理论.json'),'utf8'));
if(data.rules.seasons.map(s=>s.id).join(',')!=='spring,summer,autumn,winter')throw Error('四季顺序无效');
for(const id of data.rules.sourceIds)if(!refs.sources.some(s=>s.id===id))throw Error('未知来源 '+id);
const ids=new Set();
for(const x of [data.library.cover,...data.library.images]){
 if(!x.source||!x.rights||!x.src.startsWith('/packages/analysis/assets/seasons/')||x.src.includes('..')||!fs.existsSync(path.join(root,'miniprogram',x.src)))throw Error('素材记录无效 '+x.src);
 if(x.id){if(ids.has(x.id)||!data.rules.seasons.some(s=>s.id===x.season)||!x.colors.every(c=>/^#[0-9a-f]{6}$/i.test(c)))throw Error('图片配置无效 '+x.id);ids.add(x.id);}
}
const output='// Generated from config/llm-prompt/季节搭配; do not edit.\nmodule.exports='+JSON.stringify(data,null,2)+';\n';
const target=path.join(root,'miniprogram/packages/analysis/utils/season-guide-data.js');
if(process.argv.includes('--check')){if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==output)throw Error('请运行 npm run build:season-guide 同步四季搭配配置');}else fs.writeFileSync(target,output);
console.log('Season guide configuration validated.');
