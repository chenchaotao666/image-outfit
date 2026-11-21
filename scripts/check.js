require('node:child_process').execFileSync(process.execPath,[require('node:path').resolve(__dirname,'build-tpo-copy.cjs'),'--check'],{stdio:'inherit'});
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../miniprogram');
require('node:child_process').execFileSync(process.execPath,[path.resolve(__dirname,'build-eyewear.cjs'),'--check'],{stdio:'inherit'});
require('node:child_process').execFileSync(process.execPath,[path.resolve(__dirname,'build-face-description.cjs'),'--check'],{stdio:'inherit'});
require('node:child_process').execFileSync(process.execPath,[path.resolve(__dirname,'build-color-guide.cjs'),'--check'],{stdio:'inherit'});
require('node:child_process').execFileSync(process.execPath,[path.resolve(__dirname,'build-season-guide.cjs'),'--check'],{stdio:'inherit'});
require('node:child_process').execFileSync(process.execPath,[path.resolve(__dirname,'build-wardrobe-plan.cjs'),'--check'],{stdio:'inherit'});
require('node:child_process').execFileSync(process.execPath,[path.resolve(__dirname,'build-styling-score.cjs'),'--check'],{stdio:'inherit'});
require('node:child_process').execFileSync(process.execPath,[path.resolve(__dirname,'build-style-guide.cjs'),'--check'],{stdio:'inherit'});
const app=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8'));
let count=0;
function expand(file){let s=fs.readFileSync(file,'utf8');return s.replace(/<include\s+src="([^"]+)"\s*\/>/g,(_,p)=>expand(path.resolve(path.dirname(file),p)));}
const pages=app.pages.concat((app.subPackages||[]).flatMap(pack=>pack.pages.map(p=>pack.root+'/'+p)));
function verifyModules(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())verifyModules(file);else if(file.endsWith('.js')){const source=fs.readFileSync(file,'utf8');new vm.Script(source,{filename:file});for(const match of source.matchAll(/require\(\s*['"](\.[^'"]+)['"]\s*\)/g)){const target=path.resolve(path.dirname(file),match[1]+'.js');if(!fs.existsSync(target))throw Error('Missing dependency '+file+' -> '+target);}}}}
verifyModules(path.join(root,'packages'));verifyModules(path.join(root,'shared'));
for(const page of pages){for(const ext of ['js','json','wxml','wxss']){const file=path.join(root,page+'.'+ext);if(!fs.existsSync(file))throw Error('Missing '+file);const content=ext==='wxml'?expand(file):fs.readFileSync(file,'utf8');if(ext==='json')JSON.parse(content);if(ext==='js')new vm.Script(content,{filename:file});if(ext==='wxml'){for(const match of content.matchAll(/\bsrc="(\/(?:assets|packages)\/[^"{]+)"/g)){if(!fs.existsSync(path.join(root,match[1])))throw Error('Missing asset '+match[1]);}let js=fs.readFileSync(path.join(root,page+'.js'),'utf8');if(page.startsWith('packages/bangda/'))js+=fs.readFileSync(path.join(root,'packages/bangda/pages/bangda/reference-actions.js'),'utf8');if(page.startsWith('packages/wardrobe/'))js+=['wardrobe-actions','outfit-actions','settings-actions','upload-actions'].map(n=>fs.readFileSync(path.join(root,'packages/wardrobe/pages/manager',n+'.js'),'utf8')).join('\n');for(const match of content.matchAll(/(?:bind|catch)(?:tap|input|change|touchmove)="(\w+)"/g)){if(!new RegExp('\\b'+match[1]+'\\s*\\(').test(js))throw Error('Missing handler '+page+' '+match[1]);}if(/{{[^}]*\.indexOf\(/.test(content))throw Error('Unsupported WXML method expression '+page);}}count++;}
for(const tab of app.tabBar.list)for(const key of ['iconPath','selectedIconPath'])if(!fs.existsSync(path.join(root,tab[key])))throw Error('Missing tab icon');
console.log(`Checked ${count} pages, handlers, JSON, JavaScript syntax and static assets.`);
require('../server/styling/styling-knowledge').load();
console.log('Styling knowledge configuration validated.');

require('../server/styling/styling-prompts').load();
console.log('LLM prompt configuration validated.');
