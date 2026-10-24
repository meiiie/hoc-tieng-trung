/* Unit tests for srs.js. Run: npm i --no-save ts-fsrs@5.4.2 && node tests/srs.test.js (reference implementation) */
const S=require('../srs.js'),R=(()=>{try{return require('ts-fsrs')}catch(e){return require('/tmp/tsf/package/dist/index.cjs')}})(),assert=require('assert');let n=0;const t=(m,f)=>{f();n++;console.log('ok',m)};
const now=new Date(2026,9,22,10,0).getTime(),mid=()=>.5,MIN=6e4,DAY=864e5,sm={algo:'sm2',rnd:mid};
// ---- SM-2 (Anki legacy defaults) ----
t('sm2 new Again -> 1m',()=>{const c=S.answer(null,1,now,sm);assert.equal(c.state,'learn');assert.equal(c.due-now,MIN)});
t('sm2 new Hard -> 5.5m (avg of 1m,10m)',()=>{assert.equal(S.answer(null,2,now,sm).due-now,5.5*MIN)});
t('sm2 new Good -> 10m step',()=>{const c=S.answer(null,3,now,sm);assert.equal(c.step,1);assert.equal(c.due-now,10*MIN)});
t('sm2 graduate Good -> 1d, Easy -> 4d',()=>{let c=S.answer(null,3,now,sm);c=S.answer(c,3,now+10*MIN,sm);assert.equal(c.state,'review');assert.equal(c.int,1);assert.equal(c.due,S.dayAt(now,1));assert.equal(S.answer(null,4,now,sm).int,4)});
t('sm2 Hard on step 2 repeats 10m',()=>{let c=S.answer(null,3,now,sm);c=S.answer(c,2,now,sm);assert.equal(c.due-now,10*MIN)});
const rev={state:'review',step:0,ef:2.5,int:10,due:now,reps:5,lapses:0,last:now-10*DAY};
t('sm2 review Good = 25, Hard = 12 (ease -15%), Easy = 33 (ease +15%)',()=>{assert.equal(S.answer(rev,3,now,{...sm,fuzz:false}).int,25);const h=S.answer(rev,2,now,{...sm,fuzz:false});assert.equal(h.int,12);assert.equal(+h.ef.toFixed(2),2.35);const e=S.answer(rev,4,now,{...sm,fuzz:false});assert.equal(e.int,33);assert.equal(+e.ef.toFixed(2),2.65)});
t('sm2 overdue 4d: good=(10+2)*2.5=30',()=>{assert.equal(S.reviewIvls({...rev,last:now-14*DAY},now).good,30)});
t('sm2 lapse -> relearn 10m, ease -20%, then 1d',()=>{let c=S.answer(rev,1,now,sm);assert.equal(c.state,'relearn');assert.equal(c.due-now,10*MIN);assert.equal(c.lapses,1);assert.equal(+c.ef.toFixed(2),2.3);c=S.answer(c,3,now+10*MIN,sm);assert.equal(c.int,1)});
t('sm2 ease floor 1.3; hard >= ivl+1',()=>{assert.equal(S.answer({...rev,ef:1.35},1,now,sm).ef,1.3);assert.equal(S.reviewIvls({...rev,int:1,last:now-DAY},now).hard,2)});
// ---- shared ----
t('leech at 8th lapse suspends, re-alert at 12',()=>{const a=S.answer({...rev,lapses:7},1,now,sm);assert.ok(a.leech&&a.susp&&a.leechNew);assert.ok(!S.answer({...rev,lapses:8},1,now,sm).leechNew);assert.ok(S.answer({...rev,lapses:11},1,now).leechNew)});
t('fuzz ranges match Anki',()=>{assert.deepEqual(S.fuzzRange(2),[2,2]);assert.deepEqual(S.fuzzRange(10),[8,12]);const[lo,hi]=S.fuzzRange(100);assert.ok(lo>=93&&hi<=107)});
t('load balancer prefers empty day, avoids sibling day',()=>{const load=d=>d==9?0:50;const cnt={};for(let i=0;i<300;i++){const x=S.pickInterval(10,{load});cnt[x]=(cnt[x]||0)+1}assert.ok(cnt[9]>250,JSON.stringify(cnt));
 const sib=d=>d==10;const c2={};for(let i=0;i<300;i++){const x=S.pickInterval(10,{load:()=>5,sib});c2[x]=(c2[x]||0)+1}assert.ok(!c2[10]||c2[10]<3,JSON.stringify(c2))});
t('migrate SM-2 records losslessly',()=>{const m=S.migrate({ef:2.2,reps:3,int:15,lapses:1,due:123,last:5});assert.equal(m.state,'review');assert.equal(m.int,15);assert.equal(m.ef,2.2);assert.equal(m.due,123);assert.equal(S.migrate({ef:2,reps:0,int:0,lapses:2,due:1}).state,'relearn')});
t('SM-2 -> FSRS memory state: R(ivl)=0.9',()=>{const m=S.memFromSM2(2.5,10);assert.ok(Math.abs(m.s-10)<1e-9);assert.ok(m.d>=1&&m.d<=10);assert.ok(Math.abs(S.retrievability({state:'review',s:m.s,last:now-10*DAY},now)-.9)<1e-6)});
t('labels',()=>{assert.deepEqual(S.preview(null,now,sm).map(S.label),['<1p','6p','10p','4 ngày']);assert.equal(S.label({days:45}),'1,5 th')});
t('day boundary 4am',()=>{assert.equal(new Date(S.dayStart(new Date(2026,9,23,2).getTime())).getDate(),22)});
// ---- FSRS vs reference ts-fsrs (no fuzz) ----
const ref=R.fsrs(R.generatorParameters({request_retention:.9,enable_fuzz:false,enable_short_term:true,learning_steps:['1m','10m'],relearning_steps:['10m']}));
function sim(seq,ret=.9){let mine=null,rc=R.createEmptyCard(new Date(now)),tm=now;const rf=ret==.9?ref:R.fsrs(R.generatorParameters({request_retention:ret,enable_fuzz:false,learning_steps:['1m','10m'],relearning_steps:['10m']}));
 for(const g of seq){const o=rf.next(rc,new Date(tm),g).card;mine=S.answer(mine,g,tm,{algo:'fsrs',retention:ret,fuzz:false});
  assert.equal(mine.state,['new','learn','review','relearn'][o.state],'state');assert.ok(Math.abs(mine.s-o.stability)<1e-9,'S '+mine.s+' '+o.stability);assert.ok(Math.abs(mine.d-o.difficulty)<1e-9,'D');
  if(o.state==2)assert.equal(mine.int,o.scheduled_days,'ivl');else assert.equal(mine.due,o.due.getTime(),'due');
  rc=o;tm=o.state==2?Math.max(o.due.getTime(),mine.due):o.due.getTime();rc={...o,due:new Date(tm)};}
 return mine}
for(const seq of [[3,3,3,3,3],[1,3,3,3,1,3,3],[4,4,4],[2,3,2,3,3,3],[3,3,3,1,1,3,3,4]])t('fsrs matches ts-fsrs for '+seq.join(''),()=>sim(seq));
t('fsrs retention 0.8 gives longer intervals than 0.95',()=>{assert.ok(sim([3,3,3,3],.8).int>sim([3,3,3,3],.95).int)});
t('fsrs from migrated SM-2 review card works',()=>{const c=S.answer({ef:2.5,reps:4,int:10,lapses:0,due:now,last:now-10*DAY},3,now,{fuzz:false});assert.equal(c.state,'review');assert.ok(c.int>10&&c.s>10)});
console.log(n,'tests passed')
