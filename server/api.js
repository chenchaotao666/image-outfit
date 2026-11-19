const {userData}=require('./user-data');
const {openDatabase,digest,secret}=require('./database');
const {ApiError,request}=require('./contract');
const {analyze}=require('./providers/deepseek');
function createApi(config,model=analyze,database=openDatabase(config.databaseFile||':memory:')){
 const jobs=require('./analysis/jobs').createJobs(model,config,undefined,undefined,(owner,report)=>database.saveReport(owner,report));
 const ageInProgress=new Set();
 const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 async function body(req){let size=0,parts=[];for await(const chunk of req){size+=chunk.length;if(size>12*1024*1024)throw new ApiError('TOO_LARGE','照片过大',413);parts.push(chunk);}try{return JSON.parse(Buffer.concat(parts).toString());}catch{throw new ApiError('INVALID_JSON','请求格式错误');}}
 return async(req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;if(!pathname.startsWith('/api/'))return false;
 try{
  const host=req.headers.host||'';const origin=req.headers.origin;
  if(origin&&new URL(origin).host!==host)throw new ApiError('FORBIDDEN','不允许跨站请求',403);
  if(pathname==='/api/capabilities'&&req.method==='GET'){send(res,200,{ready:Boolean(config.apiKey&&(config.faceMock?.enabled||(config.faceApiKey&&config.faceApiSecret))),model:config.model,faceMode:config.faceMock?.enabled?'mock':'live'});return true;}
  if(pathname==='/api/session'&&req.method==='POST'){
   const data=await body(req);
   if(!data||typeof data!=='object'||Array.isArray(data))throw new ApiError('INVALID_DATA','登录参数不正确');
   let identity,devKey;
   if(config.production){
    if(typeof data.code!=='string'||data.code.length>256)throw new ApiError('LOGIN_REQUIRED','请重新登录',401);
    const url=new URL('https://api.weixin.qq.com/sns/jscode2session');url.search=new URLSearchParams({appid:config.appId,secret:config.appSecret,js_code:data.code,grant_type:'authorization_code'});
    const response=await fetch(url,{signal:AbortSignal.timeout(10000)});const auth=await response.json();if(!auth.openid)throw new ApiError('LOGIN_FAILED','微信登录失败，请重试',401);
    identity='wechat:'+config.appId+':'+auth.openid;
   }else if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||! /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host))throw new ApiError('LOCAL_ONLY','开发模式仅允许本机访问',403);
   if(!config.production){
    if(data.devKey!==undefined&&!/^[a-f0-9]{64}$/.test(data.devKey))throw new ApiError('INVALID_KEY','开发身份无效');
    devKey=data.devKey||secret();identity='local:'+digest(devKey);
   }
   send(res,200,{...database.login(identity),devKey});return true;
  }
  const token=(req.headers.authorization||'').replace(/^Bearer /,'');
  const session=database.session(token);if(!session)throw new ApiError('LOGIN_REQUIRED','会话已过期，请重试',401);
  const userId=session.userId;
  const accountData=await userData({database,userId,pathname,method:req.method,readBody:()=>body(req)});
  if(accountData!==undefined){send(res,200,accountData);return true;}
  if(pathname==='/api/wardrobe/cutout'&&req.method==='POST'){
   send(res,200,await require('./wardrobe/cutout').cutout(await body(req)));return true;
  }
  if(pathname==='/api/face-age'&&req.method==='POST'){
   const data=await body(req);if(data.consent!==true)throw new ApiError('CONSENT_REQUIRED','请先同意照片分析',400);
   if(ageInProgress.has(userId)||!database.reserveAge(session.tokenHash))throw new ApiError('BUSY','请求较多，请稍后重试',429);
   ageInProgress.add(userId);
   try{send(res,200,await require('./providers/face-age').detectAge(data.face,config));}finally{ageInProgress.delete(userId);}return true;
  }
  if(pathname==='/api/analysis-jobs'&&req.method==='POST'){const data=await body(req);send(res,202,jobs.create(request(data),userId,data.requestId));return true;}
  const jobMatch=pathname.match(/^\/api\/analysis-jobs\/([-a-f0-9]+)$/);
  if(jobMatch&&['GET','DELETE'].includes(req.method)){send(res,200,req.method==='GET'?jobs.read(jobMatch[1],userId):jobs.cancel(jobMatch[1],userId));return true;}
  if(pathname==='/api/analyze'&&req.method==='POST')throw new ApiError('UPGRADE_REQUIRED','Use /api/analysis-jobs',410);
  throw new ApiError('NOT_FOUND','Not found',404);
 }catch(error){if(!res.destroyed)send(res,error instanceof ApiError?error.status:500,{error:{code:error.code||'SERVER_ERROR',message:error instanceof ApiError?error.message:'分析服务暂时不可用，请稍后重试'}});}
 return true;
 };
}
module.exports={createApi};
