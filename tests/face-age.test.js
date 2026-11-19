const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {detectAge}=require('../server/providers/face-age');
const face='data:image/jpeg;base64,'+fs.readFileSync('miniprogram/assets/face.jpg').toString('base64');
const config={faceApiKey:'test',faceApiSecret:'secret'},prepare=async()=>({face});
test('facial age requests only age and returns the provider result without sensitive metadata',async()=>{
 const result=await detectAge(face,config,async(url,opts)=>{assert.ok(url.endsWith('/facepp/v3/detect'));assert.equal(opts.body.get('return_attributes'),'age');return {ok:true,json:async()=>({faces:[{attributes:{age:{value:34}}}]})};},prepare);
 assert.deepEqual(result,{age:34,source:'Face++',estimated:true});
});
test('missing age and multiple faces never become a fabricated age',async()=>{
 for(const faces of [[],[{},{}],[{attributes:{skin_age:{value:35}}}],[{attributes:{age:{value:null}}}]])await assert.rejects(detectAge(face,config,async()=>({ok:true,json:async()=>({faces})}),prepare));
});
