const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const source='config/styling/TPO场合形象/场合穿搭/场合形象-界面文案.json';
const data=JSON.parse(fs.readFileSync(path.join(root,source),'utf8'));
if(!data.intro||!data.ending||!Array.isArray(data.categories)||data.categories.length!==4||data.categories.some(x=>typeof x!=='string'||!x))throw Error('TPO 界面文案不完整');
const output='// Generated from '+source+'\nmodule.exports='+JSON.stringify(data,null,2)+';\n';
const target=path.join(root,'miniprogram/packages/analysis/utils/tpo-copy-data.js');
if(process.argv.includes('--check')){if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==output)throw Error('请运行 npm run build:tpo-copy');}else fs.writeFileSync(target,output);
console.log('TPO copy configuration validated.');
