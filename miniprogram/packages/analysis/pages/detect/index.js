const api = require('../../utils/api');
const v2 = require('../../utils/report-v2');
const analysis = require('../../utils/analysis');
const store = require('../../../../shared/report-store');
Page({
  data: { stage:'photo', notice:true, agreed:false, photo:'', bodyPhoto:'', profile:{gender:'男',age:'',height:'',weight:''}, error:'', progress:0, scanText:'面部轮廓与五官比例', scanSteps:['面部轮廓与五官比例','个人风格与身形结构','季节色彩与搭配建议','发型与场合穿搭'], busy:false },
  onLoad(){this.setData({preferences:{},occasions:['日常休闲','商务通勤','社交聚会'],styles:['简洁耐看','精致优雅','个性鲜明'],maintenance:['轻松打理','愿意造型']});const p=api.pending();if(p){this.control={stopped:false};this.setData({notice:false,stage:'analyzing',real:true,scanText:'正在恢复分析任务…'});api.resume(p,s=>this.updateStage(s),this.control).then(r=>this.finish(r)).catch(e=>{if(!this.disposed)this.setData({stage:'photo',error:e.message});});}},
  preference(e){this.setData({['preferences.'+e.currentTarget.dataset.field]:e.currentTarget.dataset.value});},
  acknowledge() { this.setData({notice:false,agreed:true}); },
  choose() {
    if (!this.data.agreed) return this.setData({notice:true});
    if (this.data.busy) return;
    this.setData({busy:true,error:''});
    wx.chooseMedia({ count:1,mediaType:['image'],sourceType:['album','camera'],sizeType:['compressed'],camera:'front',
      success:res => { const file=res.tempFiles[0]; if(file.size>10*1024*1024){this.setData({error:'请选择小于10MB的照片'});return;} this.setData({photo:file.tempFilePath,stage:'confirm'}); },
      fail:err => { if(!/cancel/.test(err.errMsg||'')) this.setData({error:'无法读取照片，请检查微信相机/相册权限后重试。'}); },
      complete:() => this.setData({busy:false}) });
  },
  confirmPhoto() { this.setData({stage:'profile',error:''});if(this.agePhoto!==this.data.photo){this.setData({faceAge:null,ageStatus:'idle',ageError:''});this.detectFaceAge();} },
  detectFaceAge(){
    if(this.data.ageStatus==='loading'||this.ageConsentOpen)return;
    const photo=this.data.photo;if(!photo)return;
    const run=async()=>{const token={};this.ageRequest=token;this.agePhoto=photo;this.setData({ageStatus:'loading',faceAge:null,ageError:''});
      try{const result=await api.faceAge(photo);if(!this.disposed&&this.ageRequest===token&&this.data.photo===photo)this.setData({faceAge:result.age,ageStatus:'done'});}
      catch(e){if(!this.disposed&&this.ageRequest===token&&this.data.photo===photo)this.setData({ageStatus:'failed',ageError:e.message});}
    };
    if(this.ageConsent)return run();
    this.ageConsentOpen=true;wx.showModal({title:'面部年龄分析',content:'将这张正脸照发送至 Face++，估计照片中的面部呈现年龄。结果仅供参考，不会替代你填写的实际年龄。',confirmText:'同意检测',success:res=>{this.ageConsentOpen=false;if(res.confirm){this.ageConsent=true;run();}},fail:()=>{this.ageConsentOpen=false;}});
  },
  gender(e) { this.setData({'profile.gender':e.currentTarget.dataset.value}); },
  input(e) { this.setData({['profile.'+e.currentTarget.dataset.field]:e.detail.value,error:''}); },
  submitProfile() { const error=analysis.validate(this.data.profile); if(error)return this.setData({error}); this.setData({stage:'body',error:''}); },
  body() { this.setData({stage:'bodyCapture',cameraPosition:'back',cameraReady:false,captureBusy:false,cameraError:typeof wx.createCameraContext==='function'?'':'当前预览无法使用摄像头，请从相册选择',error:''}); },
  bodyAlbum(){if(this.data.captureBusy)return;wx.chooseMedia({count:1,mediaType:['image'],sourceType:['album'],sizeType:['compressed'],success:res=>{const file=res.tempFiles[0];if(file.size>10*1024*1024)return this.setData({cameraError:'请选择小于10MB的全身照'});this.setData({bodyCandidate:file.tempFilePath,stage:'bodyConfirm',cameraReady:false,error:''});},fail:err=>{if(!/cancel/.test(err.errMsg||''))this.setData({cameraError:'相册读取失败，请重试'});}});},
  bodyCameraReady(){this.setData({cameraReady:true,cameraError:''});},
  bodyCameraError(){this.setData({cameraReady:false,captureBusy:false,cameraError:'摄像头不可用，请检查权限或从相册选择'});},
  switchBodyCamera(){if(this.data.captureBusy||typeof wx.createCameraContext!=='function')return;this.setData({cameraPosition:this.data.cameraPosition==='back'?'front':'back',cameraReady:false,cameraError:''});},
  takeBodyPhoto(){if(this.data.captureBusy)return;if(!this.data.cameraReady||typeof wx.createCameraContext!=='function'){this.setData({cameraError:'摄像头未就绪，请从相册选择或检查相机权限'});return;}this.setData({captureBusy:true});wx.createCameraContext().takePhoto({quality:'high',success:res=>{if(!this.disposed&&this.data.stage==='bodyCapture')this.setData({bodyCandidate:res.tempImagePath,stage:'bodyConfirm',cameraReady:false,error:''});},fail:()=>this.bodyCameraError(),complete:()=>{if(!this.disposed)this.setData({captureBusy:false});}});},
  acceptBodyPhoto(){if(this.data.bodyCandidate)this.setData({bodyPhoto:this.data.bodyCandidate,bodyCandidate:'',stage:'body',error:''});},
  cancelBodyPhoto(){this.setData({stage:'body',bodyCandidate:'',captureBusy:false,cameraReady:false});},
  demo() {
    if(this.data.stage==='analyzing')return;
    const error=analysis.validate(this.data.profile);if(error)return this.setData({error,stage:'profile'});
    this.setData({stage:'analyzing',real:false,progress:0,error:''});
    this.timer=setInterval(()=>{const progress=Math.min(100,this.data.progress+5);this.setData({progress,scanText:this.data.scanSteps[Math.min(3,Math.floor(progress/25))]});if(progress===100){clearInterval(this.timer);this.timer=null;try{const report=store.save(v2.sample(this.data.profile));this.setData({photo:'',bodyPhoto:''});wx.redirectTo({url:'/packages/analysis/pages/report-v2/index?id='+report.id});}catch(err){this.setData({stage:'body',error:'报告保存失败，请检查本地存储后重试。'});}}},220);
  },
  analyze() {
    if(this.data.stage==='analyzing'||this.consentOpen)return;
    const pending=api.pending();if(pending){this.control={stopped:false};this.setData({stage:'analyzing',real:true,scanText:'正在恢复已有任务…',error:''});api.resume(pending,s=>this.updateStage(s),this.control).then(r=>this.finish(r)).catch(e=>{if(!this.disposed)this.setData({stage:'body',error:e.message});});return;}
    this.consentOpen=true;
    wx.showModal({title:'照片分析授权',content:'将正脸照和所选全身照发送至 Face++ 进行面部、皮肤和人体关键点检测；将照片及填写的资料发送至 DeepSeek 生成穿搭建议。服务不将照片写入磁盘，报告与基本资料保存在你的账号中，可在“我的报告”里删除。标注预览图仅保存在本机；Face++ 与 DeepSeek 的数据处理分别以其服务政策为准。是否继续？',confirmText:'同意分析',success:async res=>{
      this.consentOpen=false;if(!res.confirm)return;
      this.setData({stage:'analyzing',real:true,error:'',scanText:'正在分析照片，请稍候…'});
      this.control={stopped:false};
      try {const report=await api.analyzeV2(this.data.profile,this.data.photo,this.data.bodyPhoto,this.data.preferences,s=>this.updateStage(s),this.control);this.finish(report);}
      catch(error){if(!this.disposed)this.setData({stage:'body',error:error.message});}
    }});
  },
  updateStage(stage){if(this.disposed)return;this.setData({analysisStage:stage,scanText:{uploading:'压缩并提交照片',geometry:'Face++ 面部特征与皮肤检测',body:'根据人体关键点与身高估算尺寸',styling:'根据检测结果生成风格与穿搭建议',validating:'校验分项结果并整理报告',completed:'报告已完成'}[stage]||'正在分析…'});},
  finish(report){if(!report||this.disposed)return;store.save(report);this.setData({photo:'',bodyPhoto:''});wx.redirectTo({url:'/packages/analysis/pages/report-v2/index?id='+report.id});},
  async cancelAnalysis(){try{if(this.control)this.control.stopped=true;await api.cancel();if(!this.disposed)this.setData({stage:this.data.photo?'body':'photo',error:'分析已取消'});}catch(e){this.setData({error:e.message});}},
  onUnload() { this.disposed=true;if(this.control)this.control.stopped=true; if(this.timer)clearInterval(this.timer); },
  noop() {},
  back() { if(this.data.stage==='profile')this.setData({stage:'confirm'});else if(this.data.stage==='body')this.setData({stage:'profile'});else wx.navigateBack(); }
});
