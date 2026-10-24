const fs=require('fs'),assert=require('assert'),p=__dirname+'/../data/';let n=0;const t=(m,f)=>{f();n++;console.log('ok',m)};
const meta=JSON.parse(fs.readFileSync(p+'meta.json'));const all=[];for(let L=1;L<=7;L++){const a=JSON.parse(fs.readFileSync(p+`hsk${L}.json`));assert.equal(a.length,meta.levels[L].count);a.forEach(w=>all.push([L,w]))}
t('ids unique across levels',()=>{const s=new Set(all.map(x=>x[1].id));assert.equal(s.size,all.length)});
for(const L of[1,2,3])t('every HSK'+L+' word has Vietnamese',()=>{const ws=all.filter(x=>x[0]==L);assert.ok(ws.length>0);const miss=ws.filter(x=>!(x[1].v&&x[1].v.trim().length));assert.equal(miss.length,0,miss.slice(0,5).map(x=>x[1].s).join(','))});
t('Vietnamese glosses are short and clean',()=>{for(const[L,w]of all)if(w.v){assert.ok(w.v.length<=60,w.s+' '+w.v);assert.ok(!/[|\t]|^\d/.test(w.v),w.s)}});
t('word ids unchanged for HSK1 (progress keys stable)',()=>{const ids=all.filter(x=>x[0]==1).map(x=>x[1].id);assert.equal(ids.length,506);assert.equal(ids[0],'爱|ai4');assert.ok(ids.includes('你|ni3'))});
t('pinyin syllables align with numeric',()=>{let bad=all.filter(([,w])=>w.p.split(/\s+/).length!==w.n.split(/\s+/).length);assert.ok(bad.length<all.length*.01,bad.length+' misaligned')});
t('pinyin carries tone marks',()=>assert.ok(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(all[0][1].p+all[1][1].p)));
t('stroke data present for >=97% of HSK1 chars',()=>{const cs=new Set(all.filter(x=>x[0]==1).flatMap(x=>[...x[1].s]));const have=[...cs].filter(c=>fs.existsSync(p+'strokes/'+c+'.json'));assert.ok(have.length/cs.size>=.97,have.length+'/'+cs.size)});
t('no emoji in shipped text files',()=>{const re=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{FE0F}]/u;for(const f of['index.html','app.js','style.css','core.js','tones.js','manifest.webmanifest','data/hsk1.json'])assert.ok(!re.test(fs.readFileSync(__dirname+'/../'+f,'utf8')),f)});
console.log(n,'data tests passed',all.length,'words');
