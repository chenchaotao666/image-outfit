const fs=require('node:fs'),path=require('node:path');
const p=require('../server/styling/styling-prompts');
const dir=path.resolve(__dirname,'../docs/LLM提示词预览');fs.mkdirSync(dir,{recursive:true});
const empty=p.render({});
const example=p.render({profile:{age:34,height:175,weight:140},preferences:{style:'简洁耐看',occasion:'商务通勤'},geometry:{provider:'Face++',classifications:{face:'圆脸'}},images:{}});
for(const [name,text] of [['Face++模式',empty.providerSystem+'\n'+empty.providerDetails],['普通照片模式',empty.system+'\n'+empty.details],['圆脸眼镜推荐-虚构示例',example.providerSystem+'\n'+example.providerDetails]]){
 fs.writeFileSync(path.join(dir,name+'.txt'),`版本：${p.config.version}\n内容指纹：${p.hash}\n以下仅为系统提示词；前两份使用空资料（null），圆脸示例为虚构资料，非真人检测；不包含照片。真实请求还会附加图片及规则消息。\n\n${text}`,'utf8');
}
console.log('提示词预览已写入 docs/LLM提示词预览');
