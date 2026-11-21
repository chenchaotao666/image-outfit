const {ApiError,result}=require('../contract');
const {parseReport}=require('../analysis/report-json');
const prompts=require('../styling/styling-prompts');
function payload(input,model){
 const rendered=prompts.render(input);
 const content=[{type:'text',text:JSON.stringify({task:prompts.config.task,profile:{...input.profile,weightKg:input.profile.weight/2},geometry:input.geometry?.provider==='Face++'?{...input.geometry,raw:undefined}:input.geometry,photoOrder:input.images.body?['正脸照','全身照']:['正脸照'],hasBodyPhoto:!!input.images.body})},{type:'image_url',image_url:{url:input.images.face,detail:'high'}}];
 if(input.images.body)content.push({type:'image_url',image_url:{url:input.images.body,detail:'high'}});
 for(const crop of input.skinCrops||[]){content.push({type:'text',text:prompts.crop(crop)},{type:'image_url',image_url:{url:crop.image,detail:'high'}});}
 const repair=input.reportRepair?rendered.repair:'';
 const messages=[{role:'system',content:rendered.system+(input.reportVersion===2?'\n'+rendered.details:'')+repair},{role:'user',content}];
 if(input.reportRepair&&input.repairText){messages.push({role:'assistant',content:input.repairText},{role:'user',content:rendered.repairUser});}
 return {model,messages,thinking:{type:'disabled'},response_format:{type:'json_object'},temperature:input.reportRepair?prompts.config.parameters.repairTemperature:prompts.config.parameters.temperature,max_tokens:input.reportVersion===2?prompts.config.parameters.v2MaxTokens:prompts.config.parameters.maxTokens,stream:false};
}
async function analyzeOnce(input,config,signal,fetchImpl=fetch){
 if(!config.apiKey)throw new ApiError('NOT_CONFIGURED','尚未配置DeepSeek API Key，请先在服务端.env中填写。',503);
 let response;
 try{response=await fetchImpl(config.baseUrl+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.apiKey},body:JSON.stringify(payload(input,config.model)),signal:AbortSignal.any([signal,AbortSignal.timeout(config.timeout)]),redirect:'error'});}catch(err){if(signal.aborted)throw new ApiError('CANCELLED','分析已取消',499);if(err.name==='TimeoutError')throw new ApiError('MODEL_TIMEOUT','模型响应超时，请稍后重试。',504);throw new ApiError('MODEL_UNAVAILABLE','暂时无法连接DeepSeek，请检查服务网络后重试。',502);}
 if(!response.ok){if(response.status===401||response.status===403)throw new ApiError('MODEL_AUTH','DeepSeek密钥或模型权限不可用，请检查服务端配置。',503);if(response.status===402)throw new ApiError('MODEL_BALANCE','DeepSeek余额不足，请充值后重试。',503);if(response.status===429)throw new ApiError('MODEL_BUSY','DeepSeek请求繁忙，请稍后重试。',429);throw new ApiError('MODEL_UNAVAILABLE','模型服务暂时不可用，请稍后重试。',502);}
 let data;try{data=await response.json();}catch{throw new ApiError('INVALID_MODEL_OUTPUT','模型响应格式异常，请重试。',502);}
 const choice=data.choices?.[0];
 if(choice?.finish_reason==='content_filter'||choice?.message?.refusal)throw new ApiError('MODEL_REFUSAL','模型无法分析这张照片，请换一张合适的照片。',422);
 if(choice?.finish_reason!=='stop'||typeof choice?.message?.content!=='string'||!choice.message.content.trim())throw new ApiError('INCOMPLETE_MODEL_OUTPUT','模型未完整生成报告，请重试。',502);
 let parsed;try{parsed=parseReport(choice.message.content);}catch{
  const error=new ApiError('INVALID_MODEL_OUTPUT','报告生成格式异常，自动修复后仍未成功，请重新开始分析；无需更换照片。',502);
  if(choice.message.content.length<=60000)Object.defineProperty(error,'repairText',{value:choice.message.content});
  throw error;
 }
 try{
 require('./faceplusplus').applyDetection(parsed,input.geometry);
 const normalized=result(parsed,!!input.images.body);
 if(input.geometry?.status==='unavailable'&&['medium','high'].includes(normalized.face.confidence))normalized.face.confidence='low';
 if(input.reportVersion===2)normalized.details=require('../analysis/details').validate(parsed.details,{geometry:input.geometry,quality:normalized.quality,requirePhotoColor:true,requireSkinConcerns:input.skinAnalysisVersion==='skin-concerns-1'});
 return normalized;
 }catch(error){
  if(error.code==='INVALID_MODEL_OUTPUT'&&choice.message.content.length<=60000)Object.defineProperty(error,'repairText',{value:choice.message.content});
  throw error;
 }
}
async function analyze(input,config,signal,fetchImpl=fetch){
 try{return await analyzeOnce(input,config,signal,fetchImpl);}
 catch(error){
  if(signal.aborted||!['INVALID_MODEL_OUTPUT','INCOMPLETE_MODEL_OUTPUT'].includes(error.code))throw error;
  return analyzeOnce({...input,reportRepair:true,repairText:error.repairText},config,signal,fetchImpl);
 }
}
module.exports={payload,analyze};
