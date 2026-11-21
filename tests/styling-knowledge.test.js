const test=require('node:test'),assert=require('node:assert/strict');
const kb=require('../server/styling/styling-knowledge');
const config=()=>kb.load();
test('every enabled rule has professional source mapping; unsupported drafts cannot be enabled',()=>{
 const k=config();assert.equal(k.rules.filter(r=>r.enabled).length,9);
 for(const r of k.rules.filter(r=>r.enabled)){assert.ok(r.evidence.length);assert.ok(r.sourceIds.every(id=>k.sources[id].kind==='external'));}
 const draft=k.rules.find(r=>r.id==='hair-low-maintenance');assert.equal(draft.enabled,false);draft.enabled=true;assert.throws(()=>kb.validate(k),/理论依据/);
 const c=config();c.rules.find(r=>r.enabled).evidence[0].locator='';assert.throws(()=>kb.validate(c),/依据/);
 const guide=kb.guidance(config(),{style:'简洁耐看'});assert.ok(guide.rules.every(r=>r.evidence.length));
});
test('knowledge rejects unknown sources, unsafe targets and invalid output structures',()=>{
 for(const change of [k=>k.rules[0].sourceIds=['missing'],k=>k.rules[0].set={'face.label':'圆脸'},k=>k.rules[0].when.all[0].op='eval',k=>k.rules.push(k.rules[0]),k=>k.rules[0].set={'details.glasses':[]}]){const k=config();change(k);assert.throws(()=>kb.validate(k));}
});
test('matching uses exact available provider facts and explicit user preference, never missing defaults',()=>{
 const k=config();assert.equal(kb.match(k,{}).length,0);
 const c=kb.context({geometry:{provider:'Face++',classifications:{face:'圆脸'}},preferences:{style:'简洁耐看'},images:{body:null}});
 assert.equal(c.face,'圆脸');
 assert.equal(c.style,undefined);
 const other=kb.context({geometry:{provider:'local',classifications:{face:'圆脸'}},images:{}});assert.equal(other.face,undefined);
});
test('rules replace advice deterministically, leave facts intact, and preserve provenance snapshots',()=>{
 const k=config(),analysis={face:{label:'圆脸'},details:{},style:{},body:{}};
 const audit=kb.apply(analysis,k,{face:'圆脸',style:'简洁耐看',hasBodyPhoto:false});
 assert.equal(analysis.face.label,'圆脸');assert.equal(analysis.style.tips.length,3);
 assert.equal(audit.applied.length,2);assert.equal(audit.hash.length,64);assert.equal(audit.matchedRules.find(r=>r.id==='style-simple').conditions[0].inputSource,'用户输入');
 const duplicate=structuredClone(k.rules.find(r=>r.id==='style-simple'));duplicate.id='duplicate';k.rules.push(duplicate);assert.throws(()=>kb.apply(analysis,k,{style:'简洁耐看'}),/冲突/);
 duplicate.priority=1;assert.equal(kb.apply(analysis,k,{style:'简洁耐看'}).skipped[0].id,'duplicate');
});
test('request does not append hidden preselected guidance outside configured prompts',()=>{
 const input={profile:{weight:140},images:{face:'test'},geometry:{},reportVersion:2};
 const payload=require('../server/providers/deepseek').payload;
 assert.deepEqual(payload({...input,stylingKnowledge:config(),stylingContext:{style:'简洁耐看'}},'test'),payload(input,'test'));
});
