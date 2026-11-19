const fs=require('node:fs');
const path=require('node:path');
function loadEnv(file=path.resolve(__dirname,'../.env')) {
 if(typeof file==='string'&&!fs.existsSync(file))return;
 for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){const match=line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);if(match&&process.env[match[1]]===undefined)process.env[match[1]]=match[2].replace(/^(['"])(.*)\1$/,'$2');}
}
function config(env=process.env){
 const production=env.NODE_ENV==='production';
 const databaseFile=path.resolve(__dirname,'..',env.SQLITE_PATH||'server/data/image-outfit.sqlite');
 const baseUrl=(env.DEEPSEEK_BASE_URL||'https://api.deepseek.com').replace(/\/$/,'');
 if(new URL(baseUrl).protocol!=='https:')throw Error('DEEPSEEK_BASE_URL must use HTTPS');
 const model=env.DEEPSEEK_MODEL||'deepseek-flash';
 // Do not accidentally send photos to a text-only model.
 if(model!=='deepseek-flash')throw Error('Photo analysis requires DEEPSEEK_MODEL=deepseek-flash');
 if(production&&(!env.WECHAT_APP_ID||!env.WECHAT_APP_SECRET))throw Error('Production requires WECHAT_APP_ID and WECHAT_APP_SECRET');
 return {databaseFile,faceMock:require('./providers/face-mock').settings(),faceApiKey:env.FACEPLUSPLUS_API_KEY||'',faceApiSecret:env.FACEPLUSPLUS_API_SECRET||'',apiKey:env.DEEPSEEK_API_KEY||'',baseUrl,model,production,appId:env.WECHAT_APP_ID||'',appSecret:env.WECHAT_APP_SECRET||'',timeout:Math.min(120000,Math.max(1000,Number(env.MODEL_TIMEOUT_MS)||90000)),host:env.HOST||'127.0.0.1',port:Number(env.PORT)||4173};
}
module.exports={loadEnv,config};
