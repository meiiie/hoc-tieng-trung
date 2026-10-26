const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>JSON.parse(fs.readFileSync(__dirname+'/../data/'+p,'utf8'));
const data=read('curricula.json'),source=read('sources/cti-syllabus-2025.json'),joins=read('sources/cti-joins-2026-10-26.json');
const legacy=[1,2,3,4,5,6,7].flatMap(l=>read(`hsk${l}.json`)),extra=read('hsk-extra.json'),all=new Map([...legacy,...extra].map(w=>[w.id,w]));
let count=0;const test=(name,fn)=>{fn();count++;console.log('ok',name)};
test('both editions preserve every legacy identity and complete the official row index',()=>{
 assert.equal(all.size,12387);assert.equal(extra.length,1418);assert.equal(Object.keys(data.editions.hsk2021.members).length,10969);
 assert.deepEqual(new Set(Object.keys(data.editions.hsk2021.members)),new Set(legacy.map(w=>w.id)));
 assert.equal(Object.keys(data.editions.hsk2025.members).length,10960);
 assert.deepEqual(source.rows.map(r=>r.number),Array.from({length:11000},(_,i)=>i+1));
 assert.deepEqual(joins.rows.map(r=>r.row),source.rows.map(r=>r.number));
 for(const row of joins.rows){const src=source.rows[row.row-1];assert.ok(row.cards.length);for(const c of row.cards){assert.equal(all.get(c.id).s,src.word.replace(/\d+$/,''));assert.equal(all.get(c.id).n,c.cardReading);assert.ok(data.editions.hsk2025.references[c.id].includes(row.row))}}
});
test('different readings have separate cards, same readings reuse progress',()=>{
 const ids=joins.rows.filter(r=>source.rows[r.row-1].word.replace(/\d+$/,'')==='得').flatMap(r=>r.cards.map(c=>c.id));
 assert.ok(new Set(ids).size>=3);assert.ok(ids.some(id=>all.get(id).n==='de5'));assert.ok(ids.some(id=>all.get(id).n==='dei3'));
 assert.equal(joins.rows[0].cards[0].id,legacy.find(w=>w.s==='爱').id);
 assert.equal(joins.rows[366].cards[0].id,legacy.find(w=>w.s==='教').id);
 assert.equal(legacy.find(w=>w.s==='教').n,'jiao1');
 const husband=legacy.find(w=>w.s==='老公');assert.equal(husband.id,'老公|lao3gong1');assert.equal(husband.n,'lao3 gong1');assert.ok(husband.v.includes('chồng'));
 assert.equal([...all.values()].filter(w=>w.s==='老公').length,1);assert.ok(data.editions.hsk2025.members[husband.id]);
});
test('source errors remain visible and teaching readings are explicitly reconciled',()=>{
 for(const [row,printed,reading] of [[3847,'dàdū','da4 dou1'],[7454,'jiǎotāshídì','jiao3 ta4 shi2 di4'],[8815,'rénxìng','ren4 xing4'],[9667,'wēnchà','wen1 cha1']]){
  assert.equal(source.rows[row-1].pinyin,printed);assert.equal(joins.rows[row-1].cards[0].cardReading,reading);
 }
 assert.equal(all.get('只|zhi1').t,'隻');assert.equal(all.get('嗯|ng4').p,'ǹg');
});
test('every selected card has authored Vietnamese and explicit audio identity',()=>{
 for(const edition of Object.values(data.editions))for(const id of Object.keys(edition.members)){const w=all.get(id);assert.ok(w.v.trim());assert.ok(w.a.includes('{voice}'));assert.ok(edition.members[id]>=1&&edition.members[id]<=7)}
});
global.window={};global.TONES=require('../tones.js');global.matchMedia=()=>({matches:false});require('../lang-zh.js');const L=window.LANG;
test('reader offers all homograph readings and preserves arbitrary literal text',()=>{
 const text='😀你好，得<img src=x>。';const inventory=[{id:'hello',s:'你好',t:'你好'},{id:'de',s:'得',t:'得'},{id:'dei',s:'得',t:'得'}];
 const tokens=L._readingTokens(text,inventory);assert.equal(tokens.map(t=>t.text).join(''),text);assert.deepEqual(tokens.find(t=>t.text==='得').ids,['de','dei']);
 assert.deepEqual(L._readingTokens('甲乙丙',[{id:'a',s:'甲乙',t:'甲乙'},{id:'b',s:'乙丙',t:'乙丙'}]),[{text:'甲乙',ids:['a']},{text:'丙'}]);
});
test('membership is optional and excludes the other edition without deleting words',()=>{
 assert.equal(L._curriculumLevel(data,'hsk2021','你好|ni3hao3'),0);assert.equal(L._curriculumLevel(data,'hsk2025','你好|ni3hao3'),1);assert.equal(all.get('你好|ni3hao3').s,'你好');assert.equal(L.bringForward,false);
});
console.log(count,'curriculum tests passed');
