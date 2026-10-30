/* Unit tests for the Chinese adapter: v2 -> core migration and answer matching. Run: node tests/lang-zh.test.js */
const assert=require('assert');global.window={};global.TONES=require('../tones.js');global.matchMedia=()=>({matches:false});
require('../lang-zh.js');const L=window.LANG;let n=0;const t=(m,f)=>{f();n++;console.log('ok',m)};
const card={state:'review',due:1e12,int:5,s:5.2,d:4.1,reps:3,lapses:0};
const v2={v:2,srs:{'爱|ai4':card,'八|ba1':{state:'learn',due:5,step:1}},revlog:[['爱|ai4',3,1000,'new'],['爱|ai4',3,2000,'learn']],ev:{'爱|ai4':[['write',1,1500],['cards',0,1600],['speak',1,1700]]},
 log:{'2026-10-20':{rev:2,new:1}},star:{'八|ba1':true},unlocked:{1:true,2:true},set:{script:'t',pinyin:'hide',newPerDay:15,retention:0.85,theme:'dark',autoplay:false,haptics:true}};
t('srs records carried over unchanged',()=>{const d=L._fromV2(JSON.parse(JSON.stringify(v2)));assert.deepStrictEqual(d.srs,v2.srs)});
t('revlog mapped to core order [t,id,r,..]',()=>{const d=L._fromV2(structuredClone(v2));assert.deepStrictEqual(d.revlog[0].slice(0,3),[1000,'爱|ai4',3]);assert.equal(d.revlog.length,2)});
t('evidence mapped to [t,code,ok]',()=>{const d=L._fromV2(structuredClone(v2));assert.deepStrictEqual(d.ev['爱|ai4'],[[1500,'w',1],[1600,'f',0],[1700,'s',1]])});
t('settings, unlocks, stars, log, goal carried over',()=>{const d=L._fromV2(structuredClone(v2));assert.equal(d.set.script,'t');assert.equal(d.set.py,'off');assert.equal(d.set.retention,0.85);assert.equal(d.set.theme,'dark');assert.equal(d.set.autoplay,false);
 assert.deepStrictEqual(d.zhUnl,{1:true,2:true});assert.deepStrictEqual(d.star,v2.star);assert.deepStrictEqual(d.log,v2.log);assert.equal(d.user.goal,'15');assert.equal(d.user.done,true)});
t('legacy() reads the old key only, never writes',()=>{const store={htt:JSON.stringify(v2)};const get=k=>store[k]??null;const d=L.legacy(get);assert.ok(d.srs['爱|ai4']);assert.deepStrictEqual(Object.keys(store),['htt'])});
t('legacy() tolerates a corrupt or missing old record',()=>{assert.equal(L.legacy(()=>null),null);assert.equal(L.legacy(()=>'{oops'),null)});
t('v1 array unlocks become an object',()=>{const d=L._fromV2({v:1,srs:{},unlocked:[1,2,3]});assert.deepStrictEqual(d.zhUnl,{1:true,2:true,3:true})});
t('importing a v2 export file converts it',()=>{const d=L.importAny({app:'x',data:structuredClone(v2)});assert.deepStrictEqual(d.srs,v2.srs)});
const w={s:'你好',t:'你好',p:'nǐ hǎo',n:'ni3 hao3'};
t('accepts hanzi, toned and toneless pinyin, numbered pinyin',()=>{const a=L._accepts(w).map(L.norm);for(const x of['你好','nǐhǎo','nihao','ni3hao3','ni hao'])assert.ok(a.includes(L.norm(x)),x)});
t('traditional form accepted',()=>{const a=L._accepts({s:'爱',t:'愛',p:'ài',n:'ai4'});assert.ok(a.includes('愛'))});
t('ü typed as v',()=>{const a=L._accepts({s:'绿',t:'綠',p:'lǜ',n:'lu:4'});assert.ok(a.includes('lv'))});
t('practice never changes schedules (bringForward off)',()=>assert.strictEqual(L.bringForward,false));
t('audio follows an explicit asset key, regardless of level or list position',()=>{const w={L:7,num:'8888',a:'hsk1/{voice}/w/0000.mp3'};assert.equal(L.aurl(w,'w','m'),'audio/hsk1/m/w/0000.mp3');assert.equal(L.aurl({...w,L:2,num:'0001'},'w','f'),'audio/hsk1/f/w/0000.mp3')});
t('erhua is attached to the previous spoken syllable',()=>assert.deepStrictEqual(L._spoken({p:'yǒu jìn r',n:'you3 jin4 r5'}),[{p:'yǒu',n:'you3'},{p:'jìnr',n:'jin4'}]));
t('er in daughter remains a separate syllable',()=>assert.deepStrictEqual(L._spoken({p:'nǚ ér',n:'nu:3 er2'}),[{p:'nǚ',n:'nu:3'},{p:'ér',n:'er2'}]));
t('indexed search preserves Chinese, pinyin, Hán Việt and Vietnamese matches',()=>{
 const fs=require('fs');const words=[...Array.from({length:7},(_,i)=>JSON.parse(fs.readFileSync(`data/hsk${i+1}.json`))),JSON.parse(fs.readFileSync('data/hsk-extra.json'))].flat().map(w=>({...w,vi:w.v||(w.m||[]).join('; ')}));
 const strip=s=>String(s).replace(/[ǖǘǚǜüÜ]/g,'v').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ü/g,'v').toLowerCase();
 for(const query of ['中国','中國','bàn tiān','ban tian','zhongguo','lv','lǜ','nu:','trung','nửa ngày','yêu','nữ','xxyyz','ĐƯỜNG']){
  const matches=L.searchMatcher(query),q=L.norm(query),p=L.norm(strip(query));
  const previous=w=>L.norm(w.s).includes(q)||L.norm(w.vi).includes(q)||!!p&&(w.s.includes(query.trim())||w.t.includes(query.trim())||strip(w.p).replace(/\s/g,'').includes(p)||(w.hv||'').includes(query.trim().toLowerCase()));
  assert.deepStrictEqual(words.filter(matches).map(w=>w.id),words.filter(previous).map(w=>w.id),query);
 }
});
console.log(n,'adapter tests passed');
