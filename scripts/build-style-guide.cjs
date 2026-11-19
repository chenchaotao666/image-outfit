const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'config/styling/风格DNA/风格解析');
const read=name=>JSON.parse(fs.readFileSync(path.join(folder,name+'.json'),'utf8'));
const data={rules:read('风格解析-展示规则'),copy:read('风格解析-界面文案'),library:read('风格解析-图片库')};
const personal=JSON.parse(fs.readFileSync(path.join(root,'config/styling/风格DNA/个人风格/个人风格-推荐规则.json'),'utf8'));
if(data.rules.styles.length!==6)throw Error('须配置六类风格');
const ids=new Set(data.library.images.map(x=>x.id));
if(ids.size!==data.library.images.length)throw Error('重复图片ID');
for(const p of personal.rules){const s=data.rules.styles.find(s=>s.index===p.index);if(!s||s.label!==p.label||s.looks.length!==6||s.looks.some(l=>!ids.has(l.imageId)||!l.title||!l.description))throw Error('风格方案不完整 '+p.label);}
for(const a of [data.library.cover,...data.library.images]){if(!a.src.startsWith('/packages/style-guide/assets/')||a.src.includes('..')||!fs.existsSync(path.join(root,'miniprogram',a.src))||!a.source||!a.rights||(a.region&&(a.width!==620||!Number.isFinite(a.height)||a.height<=0||!Number.isFinite(a.top)||a.top<0)))throw Error('风格图片无效');}
const output='// Generated from config/styling/风格DNA/风格解析.\nmodule.exports='+JSON.stringify(data,null,2)+';\n';
const target=path.join(root,'miniprogram/shared/guides/style-guide-data.js');
if(process.argv.includes('--check')){if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==output)throw Error('请运行build:style-guide');}else fs.writeFileSync(target,output);
console.log('Style guide configuration validated.');
