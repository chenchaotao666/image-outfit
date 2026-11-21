const crypto=require('node:crypto');const {detect,applyDetection}=require('../providers/faceplusplus');const {ApiError}=require('../contract');
function createJobs(model,config,vision=(face,signal)=>detect(face,signal,config),bodyVision=require('../providers/body-measurements').detectBody,saveReport){
 const jobs=new Map();let count=0,start=Date.now(),active=0;
 function cleanup(){for(const [id,j]of jobs)if(Date.now()-j.created>30*60000){j.controller.abort();jobs.delete(id);}}
 const cleanupTimer=setInterval(cleanup,60000);cleanupTimer.unref();
 function get(id,owner){cleanup();const job=jobs.get(id);if(!job||job.owner!==owner)throw new ApiError('NOT_FOUND','分析任务不存在或已过期，请重新开始',404);return job;}
 function publicJob(j){return {id:j.id,status:j.status,stage:j.stage,created:j.created,report:j.report||null,error:j.error||null};}
 function create(input,owner,key){
  cleanup();if(typeof key!=='string'||!/^[-a-zA-Z0-9]{8,100}$/.test(key))throw new ApiError('INVALID_KEY','请求标识无效');
  const prior=[...jobs.values()].find(j=>j.owner===owner&&j.key===key);if(prior)return publicJob(prior);
  if(!config.apiKey)throw new ApiError('NOT_CONFIGURED','分析服务尚未就绪',503);
  if(Date.now()-start>3600000){start=Date.now();count=0;}
  if(active>=2||count>=30||jobs.size>=100)throw new ApiError('BUSY','分析任务较多，请稍后再试',429);
  const job={id:crypto.randomUUID(),owner,key,created:Date.now(),status:'running',stage:'geometry',controller:new AbortController()};jobs.set(job.id,job);active++;count++;
  (async()=>{try{
   input.preferences={}; // Legacy defaults are not user facts or detection results.
   const knowledge=require('../styling/styling-knowledge');input.stylingKnowledge=knowledge.load();
   const judgment=require('../styling/style-judgment');input.styleJudgment=judgment.load();
   const personalStyle=require('../styling/personal-style'),personalPolicy=personalStyle.load();
   const colorAssessment=require('../styling/color-assessment'),colorPolicy=colorAssessment.load();
   input.geometry=await vision(input.images.face,job.controller.signal);if(job.controller.signal.aborted)return;
   const photoEvidence=input.geometry.photoEvidence;delete input.geometry.photoEvidence;
   job.stage='body';input.geometry.body=await bodyVision(input.images.body,Number(input.profile.height),job.controller.signal,config);if(job.controller.signal.aborted)return;
   let bodyPreview=null;
   if(input.images.body){try{bodyPreview=(await require('../providers/provider-image').prepare(input.images.body,job.controller.signal,{maxSize:1280})).preview;}catch(e){if(job.controller.signal.aborted)return;}}
   input.skinCrops=input.geometry.skinCrops||[];delete input.geometry.skinCrops;
   input.skinAnalysisVersion='skin-concerns-1';
   job.stage='styling';input.reportVersion=2;
   input.stylingContext=knowledge.context(input);
   const analysis=applyDetection(await model(input,config,job.controller.signal),input.geometry);if(job.controller.signal.aborted)return;
   if(input.geometry.mock?.enabled)analysis.warnings.unshift('Face Mock模式：脸部与皮肤数据来自已保存报告，不是本次照片的新检测；穿搭建议仍由LLM生成。');
   const recommendationAudit=knowledge.apply(analysis,input.stylingKnowledge,input.stylingContext);
   require('../styling/eyewear').apply(analysis,input.geometry);
   const judgmentAudit=judgment.apply(analysis,input.geometry,input.styleJudgment,input.preferences);
   const personalStyleAudit=personalStyle.apply(analysis,input.geometry,personalPolicy);
   const colorAudit=colorAssessment.apply(analysis,colorPolicy,input.geometry);
   job.stage='validating';
   job.report={id:'ai-'+job.id,schemaVersion:2,mode:'ai',createdAt:new Date().toISOString(),date:new Date().toLocaleDateString('zh-CN'),provider:input.geometry.provider==='Face++'?'Face++ + DeepSeek':'DeepSeek',model:config.model,profile:{...input.profile,weight:input.profile.weight/2},preferences:input.preferences,face:analysis.face.label,style:analysis.style.keywords.join(' · '),summary:analysis.summary,analysis,geometry:input.geometry,versions:{rules:'styling-1',geometry:input.geometry.version||'unknown',prompt:require('../styling/styling-prompts').config.version,promptHash:require('../styling/styling-prompts').hash}};
   if(photoEvidence)job.report.photoEvidence=photoEvidence;
   if(bodyPreview)job.report.photoEvidence={...(job.report.photoEvidence||{}),body:{photo:bodyPreview}};
   job.report.photoInputs={face:!!input.images.face,body:!!input.images.body};
   job.report.recommendationAudit=recommendationAudit;job.report.versions.knowledge=input.stylingKnowledge.version;
   job.report.judgmentAudit=judgmentAudit;job.report.versions.judgment=input.styleJudgment.rules.version;
   job.report.personalStyleAudit=personalStyleAudit;job.report.versions.personalStyle=personalPolicy.config.version;
   job.report.colorAudit=colorAudit;job.report.versions.color=colorPolicy.config.version;
   if(saveReport){
    job.report.accountReport=true;
    try{saveReport(owner,job.report);}catch(error){job.report=null;throw error;}
   }
   job.status='completed';job.stage='completed';
  }catch(e){if(!job.controller.signal.aborted){job.status='failed';job.error={code:e.code||'ANALYSIS_FAILED',message:e instanceof ApiError?e.message:'报告生成失败，请重试'};}}
  finally{active--;input.images=null;input.skinCrops=null;}})();
  return publicJob(job);
 }
 return {create,read:(id,owner)=>publicJob(get(id,owner)),cancel:(id,owner)=>{const j=get(id,owner);if(j.status==='running'){j.status='cancelled';j.controller.abort();}return publicJob(j);}};
}
module.exports={createJobs};
