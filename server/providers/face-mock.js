const fs=require('node:fs'),path=require('node:path');
const {ApiError}=require('../contract');
const root=path.resolve(__dirname,'../../config');
function settings(){
 const value=JSON.parse(fs.readFileSync(path.join(root,'检测服务.json'),'utf8')).faceMock;
 if(!value||typeof value.enabled!=='boolean'||typeof value.dataFile!=='string')throw Error('Face Mock配置无效');
 return value;
}
function load(config){
 if(!config.faceMock?.enabled)return null;
 const file=path.resolve(root,config.faceMock.dataFile);
 if(!file.startsWith(root+path.sep)||path.extname(file)!=='.json')throw new ApiError('FACE_MOCK_INVALID','Face Mock数据路径无效',503);
 let data;
 try{data=JSON.parse(fs.readFileSync(file,'utf8'));}catch{throw new ApiError('FACE_MOCK_INVALID','无法读取Face Mock数据，请检查配置文件',503);}
 const g=data.geometry;
 if(data.version!=='face-mock-1'||!data.source?.reportId||g?.provider!=='Face++'||g.status!=='available'||!g.classifications?.face||!Array.isArray(g.metrics)||!g.groups||!Array.isArray(g.skin?.items)||g.skin.items.length!==13||!g.raw?.features||!g.raw?.skin)throw new ApiError('FACE_MOCK_INVALID','Face Mock检测数据不完整，不会自动调用真实接口',503);
 if(data.faceAge!==null&&(!Number.isInteger(data.faceAge)||data.faceAge<0||data.faceAge>120))throw new ApiError('FACE_MOCK_INVALID','Face Mock年龄数据无效',503);
 // Never attach old photograph markers to a newly uploaded photograph.
 delete g.photoEvidence;delete g.skinCrops;delete g.body;
 g.mock={enabled:true,sourceReportId:data.source.reportId,sourceCreatedAt:data.source.createdAt,note:'回放已保存检测结果，不是对本次上传照片的新检测。'};
 return data;
}
module.exports={settings,load};
