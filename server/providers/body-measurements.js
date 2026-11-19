const {prepare}=require('./provider-image');
const {ApiError}=require('../contract');
const ENDPOINT='https://api-cn.faceplusplus.com/humanbodypp/v1/skeleton';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
function unavailable(reason,code='BODY_PHOTO_UNSUITABLE'){return {version:'body-photo-1',provider:'Face++',status:'unavailable',reason,code,metrics:[]};}
function estimate(raw,prepared,height){
 const people=raw.skeletons;
 if(!Array.isArray(people)||people.length!==1)return unavailable(people?.length>1?'全身照中有多人，请使用单人照片。':'未检测到完整人体，请露出头顶和双脚。');
 if(!Number.isFinite(height)||height<=0)return unavailable('请填写正确身高。');
 const b=people[0],rect=b.body_rectangle||b.humanbody_rectangle,w=prepared.width,h=prepared.height;
 if(!rect||![rect.left,rect.top,rect.width,rect.height].every(Number.isFinite)||rect.height<h*.45||rect.top<h*.005||rect.top+rect.height>h*.995||rect.left<w*.005||rect.left+rect.width>w*.995)return unavailable('请拍摄头顶到脚底完整入镜、四周留白的全身照。');
 // Face++ skeleton coordinates are relative to body_rectangle (official demo Pl renderer).
 const p=Object.fromEntries(Object.entries(b.landmark||{}).map(([k,q])=>[k,{...q,x:q.x+rect.left,y:q.y+rect.top}]));
 const valid=k=>p[k]&&Number.isFinite(p[k].x)&&Number.isFinite(p[k].y)&&p[k].x>=rect.left&&p[k].x<=rect.left+rect.width&&p[k].y>=rect.top&&p[k].y<=rect.top+rect.height&&Number(p[k].score??p[k].confidence??0)>=.5;
 const core=['head','neck','left_shoulder','right_shoulder','left_buttocks','right_buttocks','left_knee','right_knee','left_foot','right_foot'];
 if(!core.every(valid))return unavailable('身体关键点不完整，请自然站立并露出肩部、膝盖和双脚。');
 const shoulders=mid(p.left_shoulder,p.right_shoulder),hips=mid(p.left_buttocks,p.right_buttocks),feet=mid(p.left_foot,p.right_foot),bh=rect.height;
 if(Math.abs(p.left_foot.y-p.right_foot.y)>bh*.03)return unavailable('请双脚平稳着地，避免走动或一前一后站立。');
 if(!(p.head.y<shoulders.y&&shoulders.y<hips.y&&hips.y<p.left_knee.y&&hips.y<p.right_knee.y&&p.left_knee.y<p.left_foot.y&&p.right_knee.y<p.right_foot.y)||feet.y<rect.top+bh*.85||p.head.y>rect.top+bh*.23||Math.abs(shoulders.y-p.left_shoulder.y)>bh*.025||Math.abs(shoulders.x-hips.x)>bh*.08||dist(p.left_shoulder,p.right_shoulder)<bh*.12)return unavailable('请正对镜头站直，保持双肩平齐。');
 for(const side of ['left','right']){
  const hip=p[side+'_buttocks'],knee=p[side+'_knee'],foot=p[side+'_foot'];
  if(dist(hip,foot)/(dist(hip,knee)+dist(knee,foot))<.97||Math.abs(foot.x-hip.x)>bh*.12)return unavailable('请双腿自然伸直，避免屈膝、交叉或大幅分腿。');
 }
 const scale=height/bh,metrics=[];
 const add=(id,label,pixels,points,definition)=>{if(!Number.isFinite(pixels)||pixels<=0)return;metrics.push({id,label,value:Math.round(pixels*scale*10)/10,unit:'cm',source:'photo_estimate',definition,points:points.map(q=>[q.x/w,q.y/h])});};
 add('shoulder','肩宽',dist(p.left_shoulder,p.right_shoulder),[p.left_shoulder,p.right_shoulder],'两侧肩部关键点之间的照片投影距离');
 add('torso','躯干长',dist(shoulders,hips),[shoulders,hips],'肩部中点至髋部中点');
 const avg=(fn)=>['left','right'].map(fn).reduce((a,b)=>a+b)/2;
 add('leg','腿长',avg(s=>dist(p[s+'_buttocks'],p[s+'_knee'])+dist(p[s+'_knee'],p[s+'_foot'])),[p.left_buttocks,p.left_knee,p.left_foot],'两侧髋—膝—脚部关键点折线长度的平均值');
 add('calf','小腿长',avg(s=>dist(p[s+'_knee'],p[s+'_foot'])),[p.left_knee,p.left_foot],'两侧膝—脚部关键点距离的平均值');
 if(['left_elbow','right_elbow','left_hand','right_hand'].every(valid)){
  const lengths=s=>[dist(p[s+'_shoulder'],p[s+'_elbow']),dist(p[s+'_elbow'],p[s+'_hand'])];
  const l=lengths('left'),r=lengths('right');
  if(l.every((n,i)=>n>bh*.07&&n<bh*.28&&n/r[i]>.75&&n/r[i]<1.33)){
   add('upperArm','上臂长',(l[0]+r[0])/2,[p.left_shoulder,p.left_elbow],'两侧肩—肘关键点距离的平均值');
   // Provider documents call this point "hand", not a verified wrist or fingertip.
   add('elbowHand','肘至手部', (l[1]+r[1])/2,[p.left_elbow,p.left_hand],'两侧肘—手部关键点距离的平均值');
   add('shoulderHand','肩至手部',(l[0]+l[1]+r[0]+r[1])/2,[p.left_shoulder,p.left_elbow,p.left_hand],'两侧肩—肘—手部关键点折线长度的平均值');
  }
 }
 return {version:'body-photo-1',provider:'Face++',status:'available',reason:'根据全身照片和填写的身高估算，非尺量值。',heightCm:height,cmPerPixel:scale,calibration:'填写身高 / 人体检测框高度；要求直立、头脚完整。',metrics,requestId:raw.request_id};
}
async function detectBody(image,height,signal,config,fetchImpl=fetch,prepareImage=prepare){
 if(signal.aborted)throw new ApiError('CANCELLED','检测已取消',499);
 if(config.faceMock?.enabled)return {version:'body-mock-1',status:image?'unavailable':'not_provided',metrics:[],mock:true,reason:'Face Mock模式跳过人体接口，当前文件未保存人体检测数据。'};
 if(!image)return {version:'body-photo-1',status:'not_provided',metrics:[],reason:'未上传全身照，使用身高比例参考值。'};
 try{
  if(!config.faceApiKey||!config.faceApiSecret)return unavailable('人体检测未配置，暂用身高比例参考值。','BODY_NOT_CONFIGURED');
  const prepared=await prepareImage(image,signal,{maxSize:1280});
  const bytes=Buffer.from(prepared.face.split(',')[1],'base64');if(bytes.length>2*1024*1024)return unavailable('全身照过大，请压缩后重试。');
  const form=new FormData();form.set('api_key',config.faceApiKey);form.set('api_secret',config.faceApiSecret);form.set('image_file',new Blob([bytes],{type:'image/jpeg'}),'body.jpg');
  const response=await fetchImpl(ENDPOINT,{method:'POST',body:form,signal:AbortSignal.any([signal,AbortSignal.timeout(45000)]),redirect:'error'});
  const raw=await response.json();if(!response.ok||raw.error_message){const code=String(raw.error_message||'BODY_API_ERROR').split(':')[0];return unavailable(({AUTHORIZATION_ERROR:'人体检测接口未授权，暂用身高比例参考值。',CONCURRENCY_LIMIT_EXCEEDED:'人体检测繁忙，暂用身高比例参考值。',AUTHENTICATION_ERROR:'人体检测密钥验证失败。'})[code]||'人体检测暂不可用，暂用身高比例参考值。',code);}
  return estimate(raw,prepared,height);
 }catch(e){if(signal.aborted)throw new ApiError('CANCELLED','检测已取消',499);return unavailable('人体检测暂不可用，暂用身高比例参考值。','BODY_UNAVAILABLE');}
}
module.exports={detectBody,estimate,ENDPOINT};
