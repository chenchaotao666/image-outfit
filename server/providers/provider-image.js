const {spawn}=require('node:child_process');
const path=require('node:path');
const {ApiError}=require('../contract');
function prepare(face,signal,options={}){return new Promise((resolve,reject)=>{
 const p=spawn('python',[path.resolve(__dirname,'../../models/vision/prepare_provider_image.py')],{windowsHide:true,stdio:['pipe','pipe','pipe']});let output='',done=false;
 const end=(err,value)=>{if(done)return;done=true;clearTimeout(timer);signal.removeEventListener('abort',cancel);err?reject(err):resolve(value);};
 const failure=()=>new ApiError('IMAGE_PREPARE_FAILED','照片转换失败，请检查服务端 Pillow 图像依赖',503);
 const cancel=()=>{p.kill();end(signal.aborted?new ApiError('CANCELLED','检测已取消',499):failure());};
 const timer=setTimeout(cancel,15000);signal.addEventListener('abort',cancel,{once:true});
 p.on('error',()=>end(failure()));p.stdin.on('error',()=>end(failure()));p.stderr.on('data',()=>{});
 p.stdout.on('data',chunk=>{output+=chunk;if(output.length>8*1024*1024)cancel();});
 p.on('close',()=>{try{const r=JSON.parse(output);if(!r.face||!r.preview||!(r.width>0&&r.height>0))throw Error();end(null,r);}catch{end(failure());}});
 if(signal.aborted)return cancel();p.stdin.end(JSON.stringify({face,maxSize:options.maxSize||2560}));
});}
module.exports={prepare};
