const assert=require('node:assert/strict');
const fs=require('node:fs');
const market=require('../games/market.js');
const words=new Map([...Array.from({length:7},(_,i)=>`hsk${i+1}.json`),'hsk-extra.json'].flatMap(file=>JSON.parse(fs.readFileSync(`data/${file}`,'utf8'))).map(w=>[w.id,w]));
let n=0;
function test(name,run){run();n++;console.log('ok',name)}
test('every illustrated item has a unique catalog ID and two playable local recordings',()=>{
 assert.equal(new Set(market.items.map(x=>x.id)).size,8);
 assert.equal(new Set(market.items.map(x=>x.art)).size,8);
 for(const item of market.items){const w=words.get(item.id);assert.ok(w,item.id);assert.ok(w.s&&w.t&&w.p&&w.v,item.id);
  for(const voice of ['m','f'])assert.ok(fs.statSync('audio/'+w.a.replace('{voice}',voice)).size>500,item.id+' '+voice);
 }
});
test('visits have six distinct targets and one answer among four distinct choices',()=>{
 for(let seed=1;seed<=100;seed++){
  let state=seed;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const before=JSON.stringify(market.items),rounds=market.rounds(market.items,random);
  assert.equal(rounds.length,6);assert.equal(new Set(rounds.map(r=>r.target.id)).size,6);
  for(const r of rounds){assert.equal(r.options.length,4);assert.equal(new Set(r.options.map(x=>x.id)).size,4);assert.equal(r.options.filter(x=>x.id===r.target.id).length,1)}
  assert.equal(JSON.stringify(market.items),before);
 }
});
test('a partially available catalog never invents or duplicates choices',()=>{
 const pool=market.items.slice(0,4),rounds=market.rounds(pool);
 assert.equal(rounds.length,4);for(const r of rounds)assert.deepEqual(new Set(r.options),new Set(pool));
});
console.log(n,'market tests passed');
