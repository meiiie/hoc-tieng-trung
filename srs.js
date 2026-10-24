/* Học Từ Vựng scheduler.
   - FSRS-6 (default) via ts-fsrs 5.4.2 (MIT, open-spaced-repetition), desired retention configurable.
   - SM-2 fallback that mirrors Anki's v3 "legacy" scheduler with default deck options.
   - Anki-style learning/relearning steps (1m 10m / 10m), 4am day boundary, fuzz, load balancing
     with sibling dispersion (ported from ankitects/anki rslib/src/scheduler/states/load_balancer.rs),
     leech detection (8 lapses, re-alert every 4), SM-2 -> FSRS memory-state conversion
     (ported from fsrs-rs model_v6::memory_state_from_sm2_scalar).
   Card record: {state:'new'|'learn'|'review'|'relearn', due, last, reps, lapses, step, int, ef, s, d, leech, susp}
   All functions are pure; time, randomness and load data are injected. */
(function(root){'use strict';
const L=(typeof FSRS!='undefined')?FSRS:(typeof require=='function'?require(__dirname+'/vendor/ts-fsrs.min.js'):null);
const MIN=6e4,DAY=864e5;
const CFG={learnSteps:[1,10],relearnSteps:[10],gradInt:1,easyInt:4,startEase:2.5,minEase:1.3,easyBonus:1.3,hardMult:1.2,newIntMult:0,minInt:1,maxInt:36500,leech:8,dayStartHour:4,maxLoadBalance:90};
const ST={new:0,learn:1,review:2,relearn:3},STN=['new','learn','review','relearn'];
function dayStart(now,cfg=CFG){const d=new Date(now);d.setHours(cfg.dayStartHour,0,0,0);if(d.getTime()>now)d.setDate(d.getDate()-1);return d.getTime()}
function dayAt(now,days,cfg=CFG){const d=new Date(dayStart(now,cfg));d.setDate(d.getDate()+days);return d.getTime()}
const dayIndex=(t,now,cfg=CFG)=>Math.round((dayStart(t,cfg)-dayStart(now,cfg))/DAY);
/* Anki fuzz: <2.5d none; +15% of 2.5..7, +10% of 7..20, +5% beyond 20, base 1 day. */
function fuzzRange(ivl,cfg=CFG){if(ivl<2.5)return[Math.round(ivl),Math.round(ivl)];let delta=1;for(const[a,b,f]of[[2.5,7,.15],[7,20,.1],[20,Infinity,.05]])delta+=f*Math.max(0,Math.min(ivl,b)-a);
 const lo=Math.max(2,Math.round(ivl-delta)),hi=Math.min(cfg.maxInt,Math.round(ivl+delta));return[Math.min(lo,hi),hi]}
const SIB=[1,.8,.6,.4,.2,1e-6,.2,.4,.6,.8,1];
/* Load balancer: weight = (1/count)^2.15 * (1/ivl)^3 (count 0 => 1), times sibling modifier; weighted random pick. */
function pickInterval(ivl,opt={},cfg=CFG){if(opt.fuzz===false)return Math.round(ivl);const[lo,hi]=fuzzRange(ivl,cfg),rnd=opt.rnd||Math.random;if(lo==hi)return lo;
 if(!opt.load||ivl>cfg.maxLoadBalance)return Math.floor(lo+rnd()*(hi-lo+1));
 const ws=[];for(let t=lo;t<=hi;t++){const n=opt.load(t)||0;let w=n==0?1:Math.pow(1/n,2.15)*Math.pow(1/t,3);
  if(opt.sib)for(let k=-5;k<=5;k++)if(opt.sib(t+k)){w*=SIB[k+5]}ws.push([t,w])}
 const tot=ws.reduce((a,x)=>a+x[1],0);let x=rnd()*tot;for(const[t,w]of ws){if((x-=w)<=0)return t}return hi}
function fresh(){return{state:'new',step:0,ef:CFG.startEase,int:0,due:0,reps:0,lapses:0,last:0}}
/* Upgrade a legacy SM-2 record from app v<=5 ({ef,reps,int,lapses,due,last}) without losing schedule. */
function migrate(c){if(!c)return fresh();if(c.state)return c;const o={...fresh(),...c};
 if(c.int>=1)o.state='review';else if(c.lapses>0){o.state='relearn';o.step=0;o.lapseInt=1}else{o.state='learn';o.step=0}
 o.ef=Math.max(CFG.minEase,+c.ef||CFG.startEase);return o}
/* ---------- FSRS ---------- */
const _f={};function sched(ret){const k=String(ret);return _f[k]||(_f[k]=L.fsrs(L.generatorParameters({request_retention:ret,maximum_interval:CFG.maxInt,enable_fuzz:false,enable_short_term:true,learning_steps:['1m','10m'],relearning_steps:['10m']})))}
const W=()=>L.default_w;
function memFromSM2(ef,ivl,ret=.9){const w=W(),decay=-w[20],factor=Math.pow(.9,1/decay)-1;const s=Math.max(.001,ivl)*factor/(Math.pow(ret,1/decay)-1);
 const d=11-(ef-1)/(Math.exp(w[8])*Math.pow(s,-w[9])*Math.expm1((1-ret)*w[10]));return{s,d:Math.min(10,Math.max(1,d))}}
function toT(c,now){let s=c.s,d=c.d,state=c.state;
 if(state!='new'&&!(s>0)){if(state=='learn'&&!(c.reps>0&&c.int>0)){return L.createEmptyCard(new Date(now))}const m=memFromSM2(c.ef||2.5,Math.max(1,c.int||c.lapseInt||1));s=m.s;d=m.d}
 if(state=='new')return L.createEmptyCard(new Date(now));
 return{due:new Date(c.due||now),stability:s,difficulty:d,elapsed_days:0,scheduled_days:c.int||0,reps:c.reps||0,lapses:c.lapses||0,learning_steps:c.step||0,state:ST[state],last_review:new Date(c.last||now)}}
function fsrsAnswer(c,r,now,opt){const f=sched(opt.retention||.9);const out=f.next(toT(c,now),new Date(now),r).card;
 const n={...c,state:STN[out.state],s:out.stability,d:out.difficulty,step:out.learning_steps,reps:(c.reps||0)+1,lapses:out.lapses,last:now};
 if(n.state=='review'){const ivl=Math.max(1,out.scheduled_days);n.int=Math.min(CFG.maxInt,pickInterval(ivl,opt));n.due=dayAt(now,n.int)}else{n.due=out.due.getTime();if(c.state=='review'&&r==1)n.lapseInt=1}
 return n}
/* ---------- SM-2 (Anki legacy) ---------- */
const clampInt=(i,cfg)=>Math.min(cfg.maxInt,Math.max(cfg.minInt,i));
function reviewIvls(c,now,cfg=CFG){const elapsed=Math.max(0,(dayStart(now,cfg)-dayStart(c.last||now,cfg))/DAY);const late=Math.max(0,elapsed-c.int);
 const hard=Math.max(c.int+1,c.int*cfg.hardMult);const good=Math.max(hard+1,(c.int+late/2)*c.ef);const easy=Math.max(good+1,(c.int+late)*c.ef*cfg.easyBonus);
 return{hard:clampInt(Math.round(hard),cfg),good:clampInt(Math.round(good),cfg),easy:clampInt(Math.round(easy),cfg)}}
function sm2Answer(c,r,now,opt,cfg=CFG){c={...c};c.reps=(c.reps||0)+1;const prevLast=c.last;c.last=now;
 const toReview=(ivl,doFuzz=true)=>{c.state='review';c.step=0;c.int=clampInt(doFuzz?pickInterval(ivl,opt,cfg):ivl,cfg);c.due=dayAt(now,c.int,cfg);delete c.lapseInt;return c};
 const atStep=(steps,i)=>{c.step=i;c.due=now+steps[i]*MIN;return c};
 if(c.state!='review'){const relearn=c.state=='relearn';const steps=relearn?cfg.relearnSteps:cfg.learnSteps;if(c.state=='new')c.state='learn';const i=Math.min(c.step||0,steps.length-1);
  if(r==1)return atStep(steps,0);
  if(r==2){const d=i==0?(steps.length>1?(steps[0]+steps[1])/2:Math.min(steps[0]*1.5,steps[0]+1440)):steps[i];c.step=i;c.due=now+d*MIN;return c}
  if(r==3){if(i+1<steps.length)return atStep(steps,i+1);return relearn?toReview(Math.max(cfg.minInt,c.lapseInt||1),false):toReview(cfg.gradInt,false)}
  return relearn?toReview(Math.max(cfg.minInt,(c.lapseInt||1)+1),false):toReview(cfg.easyInt,false)}
 c.last=prevLast||now;const iv=reviewIvls(c,now,cfg);c.last=now;
 if(r==1){c.lapses=(c.lapses||0)+1;c.ef=Math.max(cfg.minEase,c.ef-.2);c.lapseInt=clampInt(Math.round(c.int*cfg.newIntMult),cfg);c.state='relearn';return atStep(cfg.relearnSteps,0)}
 if(r==2){c.ef=Math.max(cfg.minEase,c.ef-.15);return toReview(iv.hard)}
 if(r==3)return toReview(iv.good);
 c.ef=c.ef+.15;return toReview(iv.easy)}
/* ---------- public ---------- */
/* r: 1 Again, 2 Hard, 3 Good, 4 Easy. opt: {algo:'fsrs'|'sm2', retention, rnd, load(dayOffset)->count, sib(dayOffset)->bool} */
function answer(c0,r,now=Date.now(),opt={}){const c=migrate(c0);const wasReview=c.state=='review';
 const n=(opt.algo=='sm2'?sm2Answer:fsrsAnswer)(c,r,now,opt);
 if(wasReview&&r==1){n.lapses=(c.lapses||0)+1;if(n.lapses>=CFG.leech&&(n.lapses-CFG.leech)%(CFG.leech/2)==0){n.leech=true;n.susp=true;n.leechNew=true}else delete n.leechNew}else delete n.leechNew;
 return n}
function preview(c,now=Date.now(),opt={}){const o={...opt,rnd:()=>.5,load:null,sib:null};return[1,2,3,4].map(r=>{const n=answer(c,r,now,o);return n.state=='review'?{days:n.int}:{ms:n.due-now}})}
function label(p){if(p.days!=null){const d=p.days;return d<30?d+' ngày':d<365?(d/30).toFixed(1).replace('.0','').replace('.',',')+' th':(d/365).toFixed(1).replace('.0','').replace('.',',')+' năm'}
 const m=Math.round(p.ms/MIN);return m<=1?'<1p':m<60?m+'p':m<1440?Math.round(m/60)+' giờ':Math.round(m/1440)+' ngày'}
/* Probability of recall now (FSRS-6 power forgetting curve). SM-2 cards use an estimated memory state. */
function retrievability(c,now=Date.now()){if(!c||c.state=='new')return null;let s=c.s;if(!(s>0))s=memFromSM2(c.ef||2.5,Math.max(1,c.int||1)).s;
 const t=Math.max(0,(now-(c.last||now))/DAY);return L.forgetting_curve(W(),t,s)}
const isDue=(c,now)=>!!c&&c.state!='new'&&!c.susp&&c.due<=now;
const kind=c=>!c||c.state=='new'?'new':c.state=='review'?'review':'learn';
const api={CFG,dayStart,dayAt,dayIndex,fuzzRange,pickInterval,fresh,migrate,memFromSM2,reviewIvls,answer,preview,label,retrievability,isDue,kind,MIN,DAY,lib:L};
if(typeof module!='undefined'&&module.exports)module.exports=api;else root.SRS=api})(typeof self!='undefined'?self:this);
