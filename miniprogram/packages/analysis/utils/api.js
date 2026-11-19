// Public endpoint only. Never put provider API keys in the mini-program.
const account=require('../../../shared/account-api');
function photo(path){return new Promise((resolve,reject)=>{wx.compressImage({src:path,quality:80,compressedWidth:1600,success:result=>{wx.getFileSystemManager().readFile({filePath:result.tempFilePath,encoding:'base64',success:file=>resolve('data:image/'+(file.data.startsWith('iVBORw0KGgo')?'png':'jpeg')+';base64,'+file.data),fail:()=>reject(Error('照片读取失败，请重选照片'))});},fail:()=>reject(Error('照片压缩失败，请使用JPEG或PNG照片'))});});}
async function analyze(profile,face,body){
 const images={face:await photo(face),body:body?await photo(body):null};
 return account.call('/analyze','POST',{profile,images,consent:true});
}
const PENDING='yanchuang.analysis.pending';
async function jobRequest(path,method,userId,data){
 try{return await account.call(path,method,data,userId);}catch(error){if(error.status===404)wx.setStorageSync(PENDING,null);throw error;}
}
async function poll(pending,onStage,control){
 while(!control.stopped){
  const job=await jobRequest('/analysis-jobs/'+pending.id,'GET',pending.userId);
  if(control.stopped)return null;onStage(job.stage);
  if(job.status==='completed'){wx.setStorageSync(PENDING,null);return job.report;}
  if(['failed','cancelled'].includes(job.status)){wx.setStorageSync(PENDING,null);throw Error(job.error?.message||'分析已取消');}
  await new Promise(resolve=>setTimeout(resolve,1200));
 }
 return null;
}
async function analyzeV2(profile,face,body,preferences,onStage,control){
 onStage('uploading');
 const session=await account.session();const images={face:await photo(face),body:body?await photo(body):null};
 if(control.stopped)return null;
 const job=await jobRequest('/analysis-jobs','POST',session.userId,{profile,preferences,images,consent:true,requestId:'request-'+Date.now()+'-'+Math.random().toString(36).slice(2)});
 const pending={id:job.id,userId:session.userId,created:Date.now()};wx.setStorageSync(PENDING,pending);return poll(pending,onStage,control);
}
function pending(){const p=wx.getStorageSync(PENDING);return p&&Date.now()-p.created<30*60000?p:null;}
async function cancel(){const p=pending();if(p)await jobRequest('/analysis-jobs/'+p.id,'DELETE',p.userId);wx.setStorageSync(PENDING,null);}
async function faceAge(path){
 return account.call('/face-age','POST',{face:await photo(path),consent:true});
}
module.exports={analyze,analyzeV2,pending,resume:poll,cancel,faceAge};
