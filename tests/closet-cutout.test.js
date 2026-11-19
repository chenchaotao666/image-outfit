const {test}=require('node:test');
const assert=require('node:assert/strict');
const {cutout}=require('../server/wardrobe/cutout');
test('cutout rejects invalid images and oversized payloads before starting worker',async()=>{
  for(const image of [null,'file:///secret','data:image/svg+xml;base64,AAAA','data:image/png;base64,***'])
    await assert.rejects(cutout({image}),error=>error.code==='INVALID_IMAGE');
  await assert.rejects(cutout({image:'data:image/png;base64,'+'A'.repeat(11*1024*1024)}),error=>error.code==='TOO_LARGE');
});
