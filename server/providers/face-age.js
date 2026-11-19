const {ApiError,image}=require('../contract');
async function detectAge(face,config,fetchImpl=fetch,prepare=require('./provider-image').prepare){
 const mock=require('./face-mock').load(config);
 if(mock){if(mock.faceAge===null)throw new ApiError('FACE_MOCK_AGE_UNAVAILABLE','Mock数据未保存面部年龄，可直接填写实际年龄继续生成报告',422);return {age:mock.faceAge,source:'Face++ Mock',estimated:true,mock:true};}
 image(face);
 if(!config.faceApiKey||!config.faceApiSecret)throw new ApiError('NOT_CONFIGURED','年龄检测暂未配置',503);
 const signal=AbortSignal.timeout(45000),prepared=await prepare(face,signal);
 const form=new FormData();form.set('api_key',config.faceApiKey);form.set('api_secret',config.faceApiSecret);form.set('return_attributes','age');
 form.set('image_file',new Blob([Buffer.from(prepared.face.split(',')[1],'base64')],{type:'image/jpeg'}),'face.jpg');
 const response=await fetchImpl('https://api-cn.faceplusplus.com/facepp/v3/detect',{method:'POST',body:form,signal,redirect:'error'});
 const data=await response.json();
 if(!response.ok||data.error_message)throw new ApiError('AGE_UNAVAILABLE','面部年龄暂未识别，可继续填写或重试',502);
 if(data.faces?.length!==1)throw new ApiError('SINGLE_FACE_REQUIRED','请使用清晰的单人正脸照',422);
 const age=data.faces[0].attributes?.age?.value;
 if(!Number.isInteger(age)||age<0||age>120)throw new ApiError('AGE_UNAVAILABLE','暂未获得面部年龄，可继续填写',422);
 return {age,source:'Face++',estimated:true};
}
module.exports={detectAge};
