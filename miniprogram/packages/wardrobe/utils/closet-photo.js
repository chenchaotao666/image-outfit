const store = require('./closet-store');
function save(path) {
  if (wx.saveWardrobePhoto) return wx.saveWardrobePhoto(path);
  return new Promise((resolve,reject)=>{
    const fs=wx.getFileSystemManager();
    if(wx.env && wx.env.USER_DATA_PATH && fs.copyFile){
      const dest=wx.env.USER_DATA_PATH+'/closet-'+store.uid()+'.'+((path.match(/\.(png|jpe?g|webp)$/i)||[])[1]||'png');
      fs.copyFile({srcPath:path,destPath:dest,success:()=>resolve(dest),fail:reject});
    }else if(typeof fetch==='function')fetch(path).then(r=>r.blob()).then(blob=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);}).catch(reject);
    else reject(Error('无法保存照片'));
  });
}
async function transform(path,options,page) {
  const info=await new Promise((resolve,reject)=>wx.getImageInfo({src:path,success:resolve,fail:reject}));
  const size=1000,fit=Math.min(size/info.width,size/info.height),width=info.width*fit,height=info.height*fit;
  const ctx=wx.createCanvasContext('upload-export',page);
  ctx.clearRect(0,0,size,size);ctx.save();ctx.translate(size/2+options.x*10,size/2+options.y*10);ctx.rotate(options.rotation*Math.PI/180);ctx.scale(options.scale*options.flipX,options.scale*options.flipY);ctx.drawImage(info.path||path,-width/2,-height/2,width,height);ctx.restore();
  await new Promise(resolve=>ctx.draw(false,resolve));
  const result=await new Promise((resolve,reject)=>wx.canvasToTempFilePath({canvasId:'upload-export',x:0,y:0,width:size,height:size,destWidth:size,destHeight:size,fileType:'png',success:resolve,fail:reject},page));
  return save(result.tempFilePath);
}
module.exports={save,transform};
