const test=require('node:test'),assert=require('node:assert/strict'),guide=require('../miniprogram/shared/guides/style-guide');
test('six report styles select their own copy and looks without a default style',()=>{
 for(let i=0;i<6;i++){const g=guide.view({profile:{gender:'男'},analysis:{details:{styleIndex:i,styleReason:'本次证据'}}});assert.equal(g.index,i);assert.equal(g.looks.length,6);assert.equal(g.basis,'本次证据');assert.ok(g.looks.every(l=>l.image));}
 assert.equal(guide.view({analysis:{details:{styleIndex:null}}}).unknown,true);
 assert.equal(guide.view({analysis:{details:{styleIndex:99}}}).unknown,true);
 const g=guide.view({profile:{gender:'女'},personalStyleAudit:{index:0,reason:'保存依据'},analysis:{details:{styleIndex:2}}});assert.equal(g.index,0);assert.equal(g.basis,'保存依据');assert.equal(g.cover,null);assert.ok(g.looks.every(l=>l.image===null));
});
