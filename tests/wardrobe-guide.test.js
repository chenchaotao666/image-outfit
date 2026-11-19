const {test}=require('node:test'),assert=require('node:assert/strict'),guide=require('../miniprogram/packages/wardrobe-guide/wardrobe-guide');
test('wardrobe examples use explicit categories and keep gender filtering',()=>{
 const male=guide.view({profile:{gender:'男'}});assert.equal(male.groups.length,6);assert.ok(male.groups.every(g=>g.items.length===4));assert.equal(male.groups[1].category,'上装');
 assert.ok(guide.view({profile:{gender:'女'}}).groups.every(g=>g.items.length===0));
});
