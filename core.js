/* Học Tiếng Trung core: storage schema + migrations, word lifecycle, queue building, level unlock.
   Pure functions (time injected) so they run in Node tests. Depends on SRS (srs.js). */
(function(root){'use strict';
const SRS=root.SRS||(typeof require=='function'?require('./srs.js'):null);
const KEY='htt',SCHEMA=2,LEVELS=[1,2,3,4,5,6,7],UNLOCK_RATIO=0.8,LEARN_AHEAD=20*6e4;
const blankSet=()=>({script:'s',pinyin:'show',newPerDay:20,retention:0.9,autoplay:true,rate:0.8,theme:'system',haptics:true});
const blank=()=>({v:SCHEMA,srs:{},revlog:[],ev:{},log:{},star:{},unlocked:{1:true},set:blankSet(),created:0});
/* Migrations only ADD or reshape; they never delete srs/revlog/ev. Each step is idempotent. */
const MIG={
 /* v1 -> v2: v1 stored unlocked levels as an array [1,2]; v2 uses an object, and adds the daily log and star map. */
 2:d=>{if(Array.isArray(d.unlocked)){const o={};for(const l of d.unlocked)o[l]=true;d.unlocked=o}return d}
};
function migrate(d,now=0){if(!d||typeof d!='object')return{...blank(),created:now};let v=+d.v||1;
 if(v>SCHEMA)return d; /* data from a newer app version: leave it exactly as it is */
 while(v<SCHEMA){v++;if(MIG[v])d=MIG[v](d)}d.v=SCHEMA;const b=blank();
 for(const k in b)if(d[k]==null||typeof d[k]!=typeof b[k]||Array.isArray(d[k])!=Array.isArray(b[k]))d[k]=b[k];
 for(const k in b.set)if(d.set[k]==null)d.set[k]=b.set[k];d.unlocked[1]=true;
 for(const id in d.srs)d.srs[id]=SRS.migrate(d.srs[id]);return d}
/* Storage wrapper: main key, a daily backup and a pre-migration snapshot. A corrupt main record is kept aside, never overwritten. */
function load(ls,now=Date.now()){let raw=ls.getItem(KEY),d=null;
 if(raw){try{d=JSON.parse(raw)}catch(e){ls.setItem(KEY+'-corrupt-'+now,raw);d=null}}
 if(!d){const b=ls.getItem(KEY+'-bak');if(b)try{d=JSON.parse(b)}catch(e){}}
 if(d&&(+d.v||1)<SCHEMA&&raw)ls.setItem(KEY+'-pre-v'+(+d.v||1),raw);
 return migrate(d,now)}
function save(ls,d,now=Date.now()){const j=JSON.stringify(d);ls.setItem(KEY,j);const day=new Date(now).toDateString();
 if(ls.getItem(KEY+'-bakd')!==day){ls.setItem(KEY+'-bak',j);ls.setItem(KEY+'-bakd',day)}return j}
/* ---- lifecycle ---- */
function stateOf(c,now){if(!c||c.state=='new')return'new';if(c.susp)return'susp';if(c.bury&&c.bury>now)return'buried';
 if(c.state=='learn')return'learn';if(c.state=='relearn')return'relearn';return(c.s||0)>=21||(!c.s&&c.int>=21)?'mastered':'review'}
const LABEL={new:'Mới',learn:'Đang học',relearn:'Học lại',review:'Đang ôn',mastered:'Thành thạo',susp:'Tạm ngưng',buried:'Tạm ẩn'};
/* The ONLY function that changes scheduling. Called from "Ôn theo lịch" alone. */
function rate(d,id,r,now,opt={}){const prev=d.srs[id]||null;const n=SRS.answer(prev,r,now,{algo:'fsrs',retention:d.set.retention,...opt});
 d.srs[id]=n;d.revlog.push([id,r,now,prev?prev.state:'new']);const k=dayKey(now);const l=d.log[k]=d.log[k]||{rev:0,new:0};l.rev++;if(!prev||prev.state=='new')l.new++;return n}
/* Practice modes record evidence only. They never read-modify-write d.srs. */
function practice(d,id,mode,ok,now){const e=d.ev[id]=d.ev[id]||[];e.push([mode,ok?1:0,now]);if(e.length>30)e.splice(0,e.length-30)}
const dayKey=t=>{const s=SRS.dayStart(t);const x=new Date(s);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
function newToday(d,now){const l=d.log[dayKey(now)];return l?l.new:0}
/* Build the scheduled queue: due learning cards first (Anki learn-ahead 20 min), then due reviews (most overdue relative to interval first), then new cards in deck order up to the daily limit. */
function queue(d,words,now){const learn=[],rev=[],fresh=[];const lim=Math.max(0,(d.set.newPerDay>=9999?1e9:d.set.newPerDay)-newToday(d,now));
 for(const w of words){if(!d.unlocked[w.L])continue;const c=d.srs[w.id];
  if(!c||c.state=='new'){if(fresh.length<lim)fresh.push(w);continue}
  if(c.susp||(c.bury&&c.bury>now))continue;
  if(c.state=='learn'||c.state=='relearn'){if(c.due<=now+LEARN_AHEAD)learn.push(w)}else if(c.due<=now)rev.push(w)}
 learn.sort((a,b)=>d.srs[a.id].due-d.srs[b.id].due);rev.sort((a,b)=>{const A=d.srs[a.id],B=d.srs[b.id];return(A.due-now)/((A.int||1)*864e5)-(B.due-now)/((B.int||1)*864e5)});
 return{learn,rev,fresh}}
function nextCard(q,d,now){const l=q.learn.find(w=>d.srs[w.id].due<=now);if(l)return l;if(q.rev.length)return q.rev[0];if(q.fresh.length)return q.fresh[0];return q.learn[0]||null}
/* Unlock rule: level L+1 opens when at least 80% of level L words have graduated (left the learning steps at least once, i.e. state review or relearn with reps>0, or suspended after graduating).
   Rationale: graduation means the word was recalled on a later spaced attempt, not merely seen. */
function levelStats(d,words,L,now){let n=0,g=0,m=0,seen=0;for(const w of words){if(w.L!=L)continue;n++;const c=d.srs[w.id];if(!c||c.state=='new')continue;seen++;
  if(c.state=='review'||c.state=='relearn'||(c.int||0)>=1){g++;if(stateOf(c,now)=='mastered')m++}}return{n,seen,grad:g,mastered:m,ratio:n?g/n:0}}
function applyUnlocks(d,words,now){const opened=[];for(const L of LEVELS.slice(1)){if(d.unlocked[L])continue;const p=levelStats(d,words,L-1,now);if(d.unlocked[L-1]&&p.ratio>=UNLOCK_RATIO){d.unlocked[L]=true;opened.push(L)}}return opened}
const api={KEY,SCHEMA,LEVELS,UNLOCK_RATIO,blank,migrate,load,save,stateOf,LABEL,rate,practice,dayKey,newToday,queue,nextCard,levelStats,applyUnlocks};
if(typeof module!='undefined'&&module.exports)module.exports=api;else root.CORE=api})(typeof self!='undefined'?self:this);
