'use strict';
/* Neko vocabulary core (derived from Học Từ Vựng v17, meiiie/hoc-tu-vung). Language specifics come from window.LANG (see docs/ECOSYSTEM.md). */
const LANG=window.LANG||{};
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const DAY=864e5,KEY=LANG.key||'htv2',AUDIO_CACHE=LANG.audioCache||'htv-audio-v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const ymd=d=>d.toLocaleDateString('sv');const today=()=>ymd(new Date());
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const buzz=p=>{try{if(S.set.haptics!==false&&navigator.vibrate)navigator.vibrate(p)}catch(e){}};
const I=(n,c='')=>`<svg class="i ${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

/* ---------- state ---------- */
const blank={srs:{},known:{},star:{},learn:{},speak:{},pron:{},log:{},best:{},notes:{},miss:{},ev:{},streak:{freeze:0,frozen:[],earned:''},user:null,set:{goalAns:20,asr:'auto',mcolor:'cocoa',autoplay:true,dir:'en',voice:'gb',slow:false,theme:'system',haptics:true,f:{},algo:'fsrs',retention:0.9,rev:true,fcMode:'sched',...(LANG.setDefaults||{})}};
const SCHEMA=8;
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};const lsSet=(k,v)=>{try{localStorage.setItem(k,v);return true}catch(e){return false}};
/* Migrations: each step upgrades stored data by one schema version. Never drops unknown fields. */
function migrate(d){d=d&&typeof d=='object'?d:{};let v=+d.v||2;
 if(v<3){if(d.set&&d.set.dark!=null&&(d.set.theme==null||d.set.theme=='system')){d.set.theme=d.set.dark?'dark':'light';delete d.set.dark}v=3}
 if(v<4){if(d.srs&&typeof d.srs=='object')for(const id in d.srs)d.srs[id]=SRS.migrate(d.srs[id]);v=4}
 /* v5: Learn has 4 steps (choice, recall, cloze, dictation); an old "mastered" (2) becomes 4, "familiar" (1) stays 1 */
 if(v<5){if(d.learn&&typeof d.learn=='object')for(const id in d.learn)if(d.learn[id]>=2)d.learn[id]=4;v=5}
 /* v6: speaking history (pron), engine and mascot colour settings; filled from defaults below */
 if(v<6)v=6;
 /* v7: mascot palette changed ("milk" removed); unknown colours fall back to the default */
 if(v<7){if(d.set&&typeof d.set=='object'&&d.set.mcolor!=null&&!NK_COLORS[d.set.mcolor])d.set.mcolor='cocoa';v=7}
 /* v8: unified word lifecycle. Adds an evidence log (ev) per word; existing srs/revlog are kept untouched. Flashcards default to the scheduled mode. */
 if(v<8){if(d.set&&typeof d.set=='object'&&d.set.fcMode==null)d.set.fcMode='sched';v=8}
 d.v=SCHEMA;for(const k in blank)if(d[k]==null||typeof d[k]!=typeof blank[k])d[k]=structuredClone(blank[k]);
 for(const k in blank.set)if(d.set[k]==null)d.set[k]=structuredClone(blank.set[k]);if(!d.set.f||typeof d.set.f!='object')d.set.f={};return d}
/* hook: import progress from an older, separate storage key (the old key is never modified or deleted) */
if(LANG.legacy&&!lsGet(KEY)){try{const L=LANG.legacy(lsGet);if(L)lsSet(KEY,JSON.stringify(L))}catch(e){console.warn('legacy import',e)}}
let S,loadErr=false;{const raw=lsGet(KEY);if(raw){try{S=JSON.parse(raw)}catch(e){loadErr=true;lsSet(KEY+'-corrupt-'+Date.now(),raw)}}
 if(!S||loadErr){const bak=lsGet(KEY+'-bak');if(bak)try{S=JSON.parse(bak)}catch(e){}}S=migrate(S)}
let saveWarned=false;
const save=()=>{S.v=SCHEMA;S.saved=Date.now();const j=JSON.stringify(S);if(lsSet(KEY,j)){saveWarned=false;const b=lsGet(KEY+'-bakd');if(b!==today()){lsSet(KEY+'-bak',j);lsSet(KEY+'-bakd',today())}}
 else if(!saveWarned){saveWarned=true;setTimeout(()=>toast('Không lưu được tiến độ (bộ nhớ đầy hoặc chế độ ẩn danh). Hãy xuất bản sao lưu trong Cài đặt.','info',5000),0)}};
lsSet(KEY,JSON.stringify(S));
async function persistStorage(){try{if(navigator.storage&&navigator.storage.persist&&!(await navigator.storage.persisted()))await navigator.storage.persist()}catch(e){}}
const logIt=isNew=>{const t=today(),first=!(S.log[t]&&S.log[t].rev),l=S.log[t]=S.log[t]||{rev:0,new:0};l.rev++;if(isNew)l.new++;
 if(first){applyFreezes();const n=streakNow();if(n>0&&n%7==0&&S.streak.freeze<2&&S.streak.earned!=t){S.streak.freeze++;S.streak.earned=t;setTimeout(()=>toast(`Chuỗi ${n} ngày: bạn có thêm 1 ngày nghỉ được bảo vệ`,'shield',3500),0)}}};
/* ---------- streak (separate from the daily goal; freezes are earned, never bought; no guilt messages) ---------- */
const addDays=(t,n)=>{const d=new Date(t+'T12:00:00');d.setDate(d.getDate()+n);return ymd(d)};
const active=t=>!!(S.log[t]&&S.log[t].rev);
function streakNow(){const fz=new Set(S.streak.frozen);let n=0,t=today();if(!active(t))t=addDays(t,-1);
 for(let k=0;k<5000;k++,t=addDays(t,-1)){if(active(t))n++;else if(!fz.has(t))break}return n}
/* missed days right before today are covered automatically if enough freezes were earned */
function applyFreezes(){const st=S.streak,fz=new Set(st.frozen),miss=[];let t=addDays(today(),-1);
 for(let k=0;k<30&&!active(t)&&!fz.has(t);k++,t=addDays(t,-1))miss.push(t);
 if(!miss.length||miss.length>=30||miss.length>st.freeze||!streakBefore(t))return 0;
 st.freeze-=miss.length;st.frozen=st.frozen.concat(miss).slice(-60);save();return miss.length}
const streakBefore=t=>active(t)||S.streak.frozen.includes(t);
const goalAns=()=>+S.set.goalAns||20;
const newPerDay=()=>{const g=S.user&&S.user.goal;return !g||g=='all'?1e9:+g};
const uname=()=>S.user&&S.user.name?S.user.name:'bạn';

/* ---------- scheduler (Anki-style, see srs.js) ---------- */
const card=id=>S.srs[id]?SRS.migrate(S.srs[id]):null;
const isLearned=id=>{const c=S.srs[id];return !!c&&c.state=='review'};
const isDueId=(id,now=Date.now())=>SRS.isDue(S.srs[id],now);
/* rating 1..4 = Lại/Khó/Được/Dễ. Only the scheduled review mode calls this. */
function grade(w,r){if(!S._p){S._p=1;persistStorage()}const prev=card(w.id),isNew=!prev||prev.state=='new';const c=SRS.answer(prev,r);S.srs[w.id]=c;S.known[w.id]=r>=3;logIt(isNew);
 if(c.leech&&!(prev&&prev.leech)){S.star[w.id]=true;setTimeout(()=>toast('Từ này hay quên: đã gắn sao để ôn riêng','star',3500),0)}save();return c}
/* practice modes (flashcards, learn, listen, test) record familiarity but never touch the schedule */
/* v16 evidence policy (docs/LIFECYCLE.md): practice never changes stability/difficulty/interval.
   - every answer is logged in S.ev[id] (history shown in the word sheet)
   - a FAILED recall on a Review card that is not due yet brings it forward to tomorrow (once per day), the interval memory is kept
   - successes only help ordering: new words already met in practice are introduced first by the scheduler */
const EVM={cards:'f',learn:'l',hard:'l',listen:'d',test:'t',match:'m',speak:'s',write:'w'};
function evidence(w,ok,m){const e=S.ev[w.id]=S.ev[w.id]||[];e.push([Date.now(),EVM[m]||'p',ok?1:0]);if(e.length>40)e.splice(0,e.length-40)}
function bringForward(id,now=Date.now()){const c=S.srs[id];if(!c||c.state!='review'||c.susp)return false;const tm=SRS.dayAt(now,1);if(c.due<=tm||c.fwd&&SRS.dayIndex(c.fwd,now)==0)return false;c.due=tm;c.fwd=now;return true}
function practice(w,ok,m=location.hash.replace(/^#\/?/,'')){S.known[w.id]=!!ok;evidence(w,ok,m);if(!ok&&m!='match'&&LANG.bringForward!==false&&bringForward(w.id))S.ev[w.id].at(-1).push('fwd');logIt(false);save()}
/* ---------- session persistence ---------- */
function sess(m,o){S.sess=S.sess||{};if(o===undefined)return S.sess[m];if(o===null){delete S.sess[m];if(S.sess._last==m)delete S.sess._last}else{S.sess[m]=o;S.sess._last=m}save()}


/* ---------- data ---------- */
let pages=[],words=[];
let WMAP=new Map();
async function loadData(){if(LANG.loadData){const x=await LANG.loadData();pages=x.pages;words=x.words;WMAP=new Map(words.map(w=>[w.id,w]));return}const r=await fetch('data/pages.json');if(!r.ok)throw new Error('pages');pages=(await r.json()).pages;
 const all=await Promise.all(pages.map(p=>fetch(p.file).then(r=>{if(!r.ok)throw new Error(p.file);return r.json()}).then(ws=>ws.map(w=>({...w,page:p.id,num:w.id.split('-')[1]})))));words=all.flat();WMAP=new Map(words.map(w=>[w.id,w]))}
const F=()=>S.set.f;
function deck(){const f=F();return words.filter(w=>(!LANG.inDeck||LANG.inDeck(w))&&(!f.page||w.page==f.page)&&(!f.day||w.tags.includes(f.day))&&(!f.cefr||w.cefr.includes(f.cefr))&&(!f.task1||w.tags.includes('ielts-task1'))&&(!f.star||S.star[w.id]))}
function deckName(){const f=F(),p=[];if(f.day)p.push('Ngày '+(+f.day.slice(3)));if(f.cefr)p.push(f.cefr);if(f.task1)p.push('Task 1');if(f.star)p.push('Gắn sao');return p.length?p.join(' · '):'Tất cả từ'}
const byId=id=>WMAP.get(id);

/* ---------- audio ---------- */
const audio=new Audio();audio.preload='auto';let playingBtn=null;
const aurl=(w,kind='w',v=S.set.voice)=>LANG.aurl?LANG.aurl(w,kind,v):`audio/${w.page}/${v}/${kind}/${w.num}.mp3`;
function play(w,kind='w',opt={}){if(!w)return;if(LANG.play&&LANG.play(w,kind,opt))return;try{audio.pause();audio.src=aurl(w,kind);const slow=opt.slow??S.set.slow;audio.playbackRate=slow?0.7:1;audio.preservesPitch=true;audio.webkitPreservesPitch=true;
 if(playingBtn)playingBtn.classList.remove('playing');playingBtn=opt.btn||null;if(playingBtn)playingBtn.classList.add('playing');
 audio.play().catch(()=>{if(playingBtn)playingBtn.classList.remove('playing')})}catch(e){}}
audio.onended=audio.onerror=()=>{if(playingBtn)playingBtn.classList.remove('playing');playingBtn=null};
audio.addEventListener('error',()=>{if(!navigator.onLine)toast('Âm thanh này chưa được tải để dùng offline','wifi-off')});
const auBtns=(w,ex=true)=>`<button class="ib" data-au="${w.id}" data-k="w" aria-label="Nghe phát âm">${I('volume-2')}</button><button class="ib" data-au="${w.id}" data-k="w" data-slow="1" aria-label="Nghe chậm">${I('turtle')}</button>${ex?`<button class="ib" data-au="${w.id}" data-k="ex" aria-label="Nghe câu ví dụ">${I('book-open')}</button>`:''}`;

/* ---------- ui helpers ---------- */
let toastT;function toast(m,ic='check',ms=2200,act){const t=$('#toast');t.innerHTML=I(ic,'s')+`<span>${esc(m)}</span>`+(act?`<button class="tact">${esc(act.label)}</button>`:'');t.classList.toggle('act',!!act);if(act)$('.tact',t).onclick=()=>{t.classList.remove('on');act.run()};t.classList.add('on');clearTimeout(toastT);if(ms)toastT=setTimeout(()=>t.classList.remove('on'),ms)}
const app=$('#app');
function view(title,html,back=true){$('#title').textContent=title||LANG.title||'Học Từ Vựng';$('#title').classList.toggle('sr',!title);$('#back').classList.toggle('hidden',!back);const rk=location.hash.replace(/^#\/?/,'').split('?')[0];app.innerHTML=`<div class="view ${['','list','stats'].includes(rk)?'wide':'narrow'} v-${rk||'home'}">${html}</div>`;app.focus({preventScroll:true});scrollTo(0,0)}
const answerText=LANG.answerText||(w=>w.w.replace(/\s*\(.*?\)/g,''));
const norm=LANG.norm||(s=>String(s).toLowerCase().normalize('NFC').replace(/[’']/g,"'").replace(/[.,!?;:"]/g,' ').replace(/\s+/g,' ').trim());
const accepts=LANG.accepts||(w=>answerText(w).split(/,\s*/).map(norm));
/* ---------- answer checking: typo tolerance + letter diff (Quizlet-style lenient grading; HLR paper shows a diff as feedback) ---------- */
function dlev(a,b){const m=a.length,n=b.length,d=Array.from({length:m+1},(_,i)=>{const r=Array(n+1).fill(0);r[0]=i;return r});for(let j=0;j<=n;j++)d[0][j]=j;
 for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]==b[j-1]?0:1));if(i>1&&j>1&&a[i-1]==b[j-2]&&a[i-2]==b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1)}return d[m][n]}
const typoTol=n=>n>=8?2:n>=4?1:0;
function checkAns(input,targets){const h=norm(input);let best=targets[0],bd=1e9;if(!h)return{ok:false,exact:false,target:best,input:h};
 for(const t of targets){if(h==t)return{ok:true,exact:true,target:t,input:h};const x=dlev(h,t);if(x<bd){bd=x;best=t}}
 return{ok:bd<=typoTol(best.length),exact:false,target:best,input:h,dist:bd}}
/* expected word with missing/wrong letters underlined and extra typed letters struck through */
function diffHTML(a,b){const m=a.length,n=b.length,d=Array.from({length:m+1},(_,i)=>{const r=Array(n+1).fill(0);r[0]=i;return r});for(let j=0;j<=n;j++)d[0][j]=j;
 for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]==b[j-1]?0:1));
 const o=[];let i=m,j=n;while(i>0||j>0){if(i>0&&j>0&&d[i][j]==d[i-1][j-1]+(a[i-1]==b[j-1]?0:1)){o.push(a[i-1]==b[j-1]?esc(b[j-1]):`<del>${esc(a[i-1])}</del><ins>${esc(b[j-1])}</ins>`);i--;j--}
  else if(j>0&&d[i][j]==d[i][j-1]+1){o.push(`<ins>${esc(b[j-1])}</ins>`);j--}else{o.push(`<del>${esc(a[i-1])}</del>`);i--}}
 return `<span class="diff">${o.reverse().join('')}</span>`}
const diffRow=r=>r.dist==null||r.dist>Math.max(2,r.target.length/2)?'':`<p class="diffrow"><span class="sr">Bạn gõ “${esc(r.input)}”, đáp án “${esc(r.target)}”.</span><span aria-hidden="true"><small class="muted">So sánh:</small> ${diffHTML(r.input,r.target)}</span></p>`;
/* cloze: blank the word inside its own example sentence (allows simple inflections such as -s, -ed, -ing) */
function cloze(w){if(LANG.cloze)return LANG.cloze(w);const ex=w.ex||'',t=answerText(w).split(/,\s*/)[0].trim();if(!t||!ex)return null;const q=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 let m=ex.match(new RegExp('\\b'+q(t)+'\\b','i'));
 if(!m&&!t.includes(' ')&&t.length>=3){const st=t.replace(/(e|y)$/i,'');m=ex.match(new RegExp('\\b'+q(st)+'[a-z]{0,4}\\b','i'));if(m&&m[0].length>t.length+4)m=null}
 return m?{before:ex.slice(0,m.index),ans:m[0],after:ex.slice(m.index+m[0].length)}:null}
/* ---------- personal mnemonic notes ---------- */
const noteHTML=w=>{const n=S.notes[w.id];return `<div class="sec note">${I('lightbulb','s')}<div><span class="lab">Mẹo nhớ của bạn</span>${n?esc(n):'<span class="muted">Chưa có. Tự đặt một liên tưởng giúp nhớ lâu hơn.</span>'}</div><button class="ib sm" data-note="${w.id}" aria-label="${n?'Sửa':'Thêm'} mẹo nhớ cho ${esc(w.w)}">${I('square-pen','s')}</button></div>`};
function openNote(id){const w=byId(id);if(!w)return;const {sh,close}=sheet(`<h2>Mẹo nhớ: ${esc(w.w)}</h2><p class="muted">${esc(w.vi)}</p>
 <label class="kind" for="nt" style="display:block;margin-bottom:8px">Liên tưởng, hình ảnh hoặc câu của riêng bạn</label><textarea class="ti" id="nt" rows="3" maxlength="280" style="resize:vertical">${esc(S.notes[id]||'')}</textarea>
 <div class="row" style="margin-top:12px">${S.notes[id]?'<button class="btn sec" id="ndel">Xoá</button>':''}<button class="btn" id="nsave">Lưu</button></div>`);
 const upd=()=>$$(`[data-note="${id}"]`).forEach(b=>{const s=b.closest('.note');if(s)s.outerHTML=noteHTML(w)});
 $('#nsave').onclick=()=>{const v=$('#nt').value.trim();if(v)S.notes[id]=v;else delete S.notes[id];save();upd();close();toast('Đã lưu mẹo nhớ','check')};
 $('#ndel')&&($('#ndel').onclick=()=>{delete S.notes[id];save();upd();close()});setTimeout(()=>$('#nt').focus(),60)}
const starBtn=w=>`<button class="ib star ${S.star[w.id]?'on':''}" data-star="${w.id}" aria-pressed="${!!S.star[w.id]}" aria-label="Gắn sao từ khó">${I('star')}</button>`;
function backFace(w){if(LANG.backFace)return LANG.backFace(w);return `<div class="corner l">${starBtn(w)}</div><div class="corner r">${auBtns(w,false)}</div>
 <div class="w">${esc(w.w)}<button class="ib sm cp" data-copy="${esc(w.w)}" aria-label="Sao chép từ" title="Sao chép từ">${I('copy','s')}</button></div><div class="ipa" data-ipa="${w.id}">${esc(ipaOf(w))}</div>
 <div class="tags"><span class="tag">${esc(w.pos)}</span><span class="tag lv">${esc(w.lv)}</span>${w.tags.includes('ielts-task1')?'<span class="tag">IELTS Task 1</span>':''}</div>
 <div class="vi" style="margin-top:12px">${esc(w.vi)}</div>
 <div class="sec"><div class="lab">Ví dụ <button class="ib sm" data-au="${w.id}" data-k="ex" aria-label="Nghe câu ví dụ">${I('play','s')}</button><button class="ib sm" data-copy="${esc(w.ex)}" aria-label="Sao chép câu ví dụ" title="Sao chép câu ví dụ">${I('copy','s')}</button></div><i>${esc(w.ex)}</i><br><span class="muted">${esc(w.exvi)}</span></div>
 <div class="sec"><div class="lab">Cụm từ · họ từ</div>${esc(w.col)}</div>${w.tip?`<div class="sec tip">${I('lightbulb','s')}<div>${esc(w.tip)}</div></div>`:''}${noteHTML(w)}`}
function frontFace(w,dir){if(LANG.frontFace)return LANG.frontFace(w,dir);return `<div class="corner l">${starBtn(w)}</div>`+(dir=='en'?`<div class="corner r"><button class="ib" data-au="${w.id}" data-k="w" aria-label="Nghe phát âm">${I('volume-2')}</button></div><div class="w">${esc(w.w)}</div><div class="ipa" data-ipa="${w.id}">${esc(ipaOf(w))}</div><div class="tags"><span class="tag">${esc(w.pos)}</span></div>`
 :`<div class="vi">${esc(w.vi)}</div><div class="tags"><span class="tag">${esc(w.pos)}</span></div><p class="muted">${LANG.reversePrompt||'Từ tiếng Anh là gì?'}</p>`)}
async function copyText(t){try{await navigator.clipboard.writeText(t)}catch(_){const x=document.createElement('textarea');x.value=t;x.setAttribute('readonly','');x.style.cssText='position:fixed;opacity:0';document.body.appendChild(x);x.select();try{document.execCommand('copy')}catch(_){}x.remove()}toast('Đã sao chép','copy');buzz(8)}
document.addEventListener('click',e=>{const cp=e.target.closest('[data-copy]');if(cp){e.stopPropagation();copyText(cp.dataset.copy);return}const a=e.target.closest('[data-au]');if(a){e.stopPropagation();play(byId(a.dataset.au),a.dataset.k||'w',{slow:a.dataset.slow?true:undefined,btn:a});return}
 const nb=e.target.closest('[data-note]');if(nb){e.stopPropagation();openNote(nb.dataset.note);return}
 const s=e.target.closest('[data-star]');if(s){e.stopPropagation();const id=s.dataset.star;S.star[id]=!S.star[id];if(!S.star[id])delete S.star[id];save();$$(`[data-star="${id}"]`).forEach(b=>{b.classList.toggle('on',!!S.star[id]);b.setAttribute('aria-pressed',!!S.star[id])});buzz(10);toast(S.star[id]?'Đã gắn sao':'Đã bỏ sao','star')}},true);
/* a click that ends a swipe must not also press the button under the finger */
addEventListener('click',e=>{if(window._swipeT!=null&&performance.now()-window._swipeT<450){e.stopPropagation();e.preventDefault()}},true);

/* ---------- confetti ---------- */
function confetti(){if(reduce)return;const c=$('#confetti'),x=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;const cs=getComputedStyle(document.body);
 const cols=['--primary','--success','--warn','--danger','--star'].map(v=>cs.getPropertyValue(v).trim());
 const ps=Array.from({length:110},()=>({x:c.width/2,y:c.height*.32,vx:(Math.random()-.5)*13,vy:-Math.random()*13-4,s:Math.random()*6+4,r:Math.random()*6,vr:(Math.random()-.5)*.3,c:cols[Math.random()*cols.length|0]}));
 let t=0;(function f(){x.clearRect(0,0,c.width,c.height);ps.forEach(p=>{p.vy+=.33;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);x.restore()});
 if(++t<140)requestAnimationFrame(f);else x.clearRect(0,0,c.width,c.height)})();buzz([20,30,20])}

/* ---------- sheets: filter & settings ---------- */
function sheet(html,onClose){const sh=$('#sheet');sh.innerHTML=`<div><div class="grab" aria-hidden="true"></div>${html}</div>`;sh.classList.remove('hidden');
 const close=()=>{sh.classList.add('hidden');onClose&&onClose()};sh.onclick=e=>{if(e.target==sh)close()};sh._close=close;return {sh,close}}
document.addEventListener('keydown',e=>{if(e.key=='Escape'&&!$('#sheet').classList.contains('hidden'))$('#sheet')._close()});
function openFilter(){const f=F(),days=[...new Set(words.flatMap(w=>w.tags.filter(t=>/^day/.test(t))))].sort();
 const chips=(k,opts)=>`<div class="chips" role="group">${opts.map(([v,l])=>`<button class="chip ${(f[k]||'')==v?'on':''}" data-k="${k}" data-v="${v}" aria-pressed="${(f[k]||'')==v}">${l}</button>`).join('')}</div>`;
 const {sh,close}=sheet(`<h2>Chọn bộ từ</h2>
 ${pages.length>1&&!LANG.levels?'<div class="eyebrow">Trang</div>'+chips('page',[['','Tất cả'],...pages.map(p=>[p.id,p.short||p.title])]):''}
 ${days.length?`<div class="eyebrow">Ngày học</div>${chips('day',[['','Tất cả'],...days.map(d=>[d,'Ngày '+(+d.slice(3))])])}`:''}
 <div class="eyebrow">${LANG.levelName||'Cấp độ CEFR'}</div>${chips('cefr',[['','Tất cả'],...(LANG.levels||['A1','A2','B1','B2']).map(x=>[x,x])])}
 <div class="group" style="margin-top:16px">${LANG.levels?'':`<label class="opt-row"><span>Chỉ từ IELTS Task 1</span><input class="sw" type="checkbox" id="f-t1" ${f.task1?'checked':''}></label>`}
 <label class="opt-row"><span>Chỉ từ đã gắn sao</span><input class="sw" type="checkbox" id="f-st" ${f.star?'checked':''}></label></div>
 <p class="muted center" id="fcount" aria-live="polite"></p><button class="btn" id="fdone">Xong</button>`,route);
 const cnt=()=>$('#fcount').textContent=deck().length+' từ được chọn';cnt();
 $$('.chip',sh).forEach(b=>b.onclick=()=>{f[b.dataset.k]=b.dataset.v;$$(`.chip[data-k="${b.dataset.k}"]`,sh).forEach(x=>{x.classList.toggle('on',x==b);x.setAttribute('aria-pressed',x==b)});save();cnt();buzz(8)});
 $('#f-t1')&&($('#f-t1').onchange=e=>{f.task1=e.target.checked;save();cnt()});$('#f-st').onchange=e=>{f.star=e.target.checked;save();cnt()};$('#fdone').onclick=close;$('#fdone').focus()}
function openSettings(){const cur=k=>k=='goal'?((S.user&&S.user.goal)||'all'):String(S.set[k]);const seg=(k,opts)=>`<div class="segc" role="radiogroup">${opts.map(([v,l])=>`<button role="radio" aria-checked="${cur(k)==v}" class="${cur(k)==v?'on':''}" data-set="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
 const {sh,close}=sheet(`<h2>Cài đặt</h2><div class="eyebrow">Phát âm</div><div class="group">
 <div class="opt-row"><span>Giọng đọc</span>${seg('voice',LANG.voices||[['gb','Anh (UK)'],['us','Mỹ (US)']])}</div>${LANG.settingsTop?LANG.settingsTop(seg):''}
 <div class="opt-row"><span>Tốc độ mặc định</span>${seg('slow',[['false','Bình thường'],['true','Chậm']])}</div>
 <label class="opt-row"><span>Tự phát âm khi hiện thẻ</span><input class="sw" type="checkbox" data-sw="autoplay" ${S.set.autoplay?'checked':''}></label>
 <label class="opt-row"><span>Kéo thẻ bằng chuột<br><small class="muted">Máy tính: kéo nhanh sang ngang để chuyển thẻ; giữ chuột rồi kéo để bôi đen chữ</small></span><input class="sw" type="checkbox" data-sw="mdrag" ${S.set.mdrag!==false?'checked':''}></label>
 <div class="opt-row"><span>Tải âm thanh để học offline<br><small class="muted" id="dlst">${LANG.audioUrls?LANG.audioUrls().length.toLocaleString('vi-VN')+' từ trong bộ đang chọn, giọng '+(S.set.voice=='m'?'nam':'nữ')+'. Chọn cấp ở trang chủ để tải từng phần.':'Âm thanh được lưu dần khi bạn nghe'}</small></span><button class="btn sm sec" id="dl">${I('download','s')}Tải</button></div></div>
 <div class="eyebrow">Lịch ôn (kiểu Anki)</div><div class="group">
 <div class="opt-row"><span>Mục tiêu mỗi ngày<br><small class="muted">Số câu trả lời ở mọi chế độ</small></span>${seg('goalAns',[['10','10'],['20','20'],['50','50'],['100','100']])}</div>
 <div class="opt-row"><span>Từ mới mỗi ngày</span>${seg('goal',[['all','Tất cả'],['10','10'],['25','25'],['50','50']])}</div>
 <div class="opt-row"><span>Thuật toán<br><small class="muted">FSRS chính xác hơn; SM-2 giống Anki cũ</small></span>${seg('algo',[['fsrs','FSRS'],['sm2','SM-2']])}</div>
 <div class="opt-row"><span>Mức nhớ mong muốn<br><small class="muted">Cao hơn = ôn nhiều hơn (chỉ FSRS)</small></span>${seg('retention',[['0.85','85%'],['0.9','90%'],['0.95','95%']])}</div>
 <label class="opt-row"><span>Thẻ hai chiều<br><small class="muted">Anh → Việt và Việt → Anh; thẻ cùng từ không hiện cùng ngày</small></span><input class="sw" type="checkbox" data-sw="rev" ${S.set.rev?'checked':''}></label></div>
 ${LANG.settingsPron?LANG.settingsPron(seg):` <div class="eyebrow">Chấm phát âm</div><div class="group">
 <div class="opt-row"><span>Cách chấm<br><small class="muted">Trên máy: chấm từng âm, riêng tư, offline</small></span>${seg('asr',[['auto','Trên máy'],['browser','Trình duyệt']])}</div>
 <div class="opt-row"><span>Mô hình ZIPA (71 MB)<br><small class="muted" id="mst2">Đang kiểm tra…</small></span><button class="btn sm sec" id="mdl">${I('download','s')}Tải</button></div></div>
`}
 <div class="eyebrow">Giao diện</div><div class="group"><div class="opt-row mcrow">${mascot('idle','',{small:true})}<div><span id="mcl">Màu Neko</span><div class="swatches" role="radiogroup" aria-labelledby="mcl">${Object.entries(MCOL).map(([k,c])=>`<button role="radio" class="swatch ${S.set.mcolor==k?'on':''}" aria-checked="${S.set.mcolor==k}" data-mc="${k}" aria-label="${c.vi}" style="--sw:${c.l};--swd:${c.d}"></button>`).join('')}</div></div></div>
 <div class="opt-row"><span>Chế độ</span>${seg('theme',[['system','Tự động'],['light','Sáng'],['dark','Tối']])}</div>
 <label class="opt-row"><span>Rung phản hồi</span><input class="sw" type="checkbox" data-sw="haptics" ${S.set.haptics?'checked':''}></label></div>
 <div class="eyebrow">Tài khoản trên máy này</div><div class="group"><button class="opt-row" style="width:100%;border:none;background:none;text-align:left" id="redo"><span>Đổi tên, mục tiêu, kiểu học</span>${I('chevron-right')}</button>
 <button class="opt-row" style="width:100%;border:none;background:none;text-align:left" id="exp"><span>Xuất bản sao lưu tiến độ<br><small class="muted">Lưu tệp .json để chuyển máy hoặc phòng mất dữ liệu</small></span>${I('download')}</button>
 <button class="opt-row" style="width:100%;border:none;background:none;text-align:left" id="imp"><span>Nhập tiến độ từ tệp sao lưu</span>${I('upload')}</button><input type="file" id="impf" accept="application/json,.json" hidden aria-label="Chọn tệp sao lưu">
 <button class="opt-row" style="width:100%;border:none;background:none;text-align:left;color:var(--danger)" id="rst"><span>Xoá toàn bộ tiến độ</span>${I('rotate-ccw')}</button></div>
 <p class="muted center" style="margin-top:16px">${LANG.credits||'Phiên bản 15 · Chấm phát âm: ZIPA (CC BY-NC-SA 4.0) · Linh vật Neko · Biểu tượng Lucide (ISC) · Giọng đọc Microsoft Neural'}</p>`,route);
 $$('[data-set]',sh).forEach(b=>b.onclick=()=>{const k=b.dataset.set;let v=b.dataset.v;if(k=='slow')v=v=='true';if(k=='retention'||k=='goalAns')v=+v;if(k=='goal'){S.user=S.user||{};S.user.goal=v}else S.set[k]=v;save();$$(`[data-set="${k}"]`,sh).forEach(x=>{x.classList.toggle('on',x==b);x.setAttribute('aria-checked',x==b)});if(k=='theme')applyTheme();if(k=='asr')toast(v=='auto'?'Chấm trên máy (từng âm)':'Dùng nhận dạng của trình duyệt','mic');if(k=='voice'||k=='slow')play(words[2]);if(LANG.onSet)LANG.onSet(k,v);updVoice();buzz(8)});
 $$('[data-mc]',sh).forEach(b=>b.onclick=()=>{S.set.mcolor=b.dataset.mc;save();applyTheme();$$('[data-mc]',sh).forEach(x=>{x.classList.toggle('on',x==b);x.setAttribute('aria-checked',x==b)});moodTo($('.mcrow .mascot',sh),'happy',null,1400);buzz(8)});
 if(LANG.bindSettings)LANG.bindSettings(sh,close);
 if(LANG.settingsPron){}else if(Speech.supported()){const upd=s=>{const t=$('#mst2',sh),b=$('#mdl',sh);if(!t)return;t.textContent=s.cached?'Đã tải, dùng được offline':'Chưa tải';b.innerHTML=s.cached?I('trash-2','s')+'Xoá':I('download','s')+'Tải';
   b.onclick=async()=>{if(s.cached){await Speech.forget();upd({cached:false});toast('Đã xoá mô hình','check')}else{b.disabled=true;try{await Speech.load(m=>{t.textContent=m.phase=='init'?'Đang khởi động…':'Đang tải '+Math.round(m.got/m.total*100)+'%'});upd({cached:true})}catch(e){t.textContent='Tải lỗi, thử lại';}b.disabled=false}}};Speech.status().then(upd)}
 else if($('#mst2',sh)){$('#mst2',sh).textContent='Trình duyệt này không hỗ trợ';$('#mdl',sh).disabled=true}
 $$('[data-sw]',sh).forEach(x=>x.onchange=()=>{S.set[x.dataset.sw]=x.checked;save();applyTheme()});
 $('#redo').onclick=()=>{close();onboarding(0)};$('#exp').onclick=exportProgress;$('#imp').onclick=()=>$('#impf').click();$('#impf').onchange=e=>{const f=e.target.files[0];if(f)importProgress(f,close);e.target.value=''};$('#rst').onclick=()=>{if(confirm('Xoá toàn bộ tiến độ trên thiết bị này?')){Object.assign(S,{srs:{},known:{},learn:{},speak:{},pron:{},log:{},best:{},notes:{},miss:{},ev:{},streak:{freeze:0,frozen:[],earned:''}});save();FC=null;toast('Đã xoá tiến độ','rotate-ccw');close()}};
 $('#dl').onclick=async()=>{if(!('caches'in window)){toast('Trình duyệt không hỗ trợ lưu offline','info');return}const b=$('#dl');b.disabled=true;const urls=LANG.audioUrls?LANG.audioUrls():words.flatMap(w=>[aurl(w,'w'),aurl(w,'ex')]);let saved=0,failed=0;
  try{const c=await caches.open(AUDIO_CACHE);
   for(let i=0;i<urls.length;i+=4){await Promise.all(urls.slice(i,i+4).map(async u=>{const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),30000);try{if(!(await c.match(u))){const r=await fetch(u,{signal:abort.signal});if(!r.ok)throw new Error('HTTP '+r.status);await c.put(u,r)}saved++}catch(e){failed++}finally{clearTimeout(timer)}}));const st=$('#dlst');if(st)st.textContent=`Đã lưu ${saved}/${urls.length}${failed?' · lỗi '+failed:''}…`}
   const st=$('#dlst');if(st)st.textContent=failed?`Đã lưu ${saved}/${urls.length} tệp. ${failed} tệp chưa tải được; bấm Tải để thử lại.`:`Đã lưu ${saved} tệp âm thanh`;
   toast(failed?'Còn tệp chưa tải được. Kiểm tra mạng hoặc dung lượng máy.':'Đã tải xong âm thanh',failed?'wifi-off':'download')
  }catch(e){toast('Không mở được bộ nhớ offline. Kiểm tra dung lượng máy.','info')}finally{b.disabled=false}}}

/* ---------- onboarding ---------- */
function onboarding(step=0,draft={...(S.user||{})}){const N=4,seg=`<div class="seg" role="progressbar" aria-label="Bước thiết lập" aria-valuemin="1" aria-valuemax="${N}" aria-valuenow="${step+1}">${[...Array(N)].map((_,i)=>`<i class="${i<=step?'on':''}"></i>`).join('')}</div>`;
 const goals=[['10','Tối đa 10 từ mới mỗi ngày','Có thể đổi bất cứ lúc nào','leaf'],['25','Tối đa 25 từ mới mỗi ngày','Có thể đổi bất cứ lúc nào','target'],['50','Tối đa 50 từ mới mỗi ngày','Có thể đổi bất cứ lúc nào','layers'],['all','Tự chọn số từ','Không giới hạn từ mới mỗi ngày','repeat']];
 const styles=[['cards','Thẻ ghi nhớ','Lật thẻ, vuốt trái hoặc phải','layers'],['learn','Học từng vòng','Trắc nghiệm rồi gõ từ','brain'],['speak','Luyện nói','Nghe, nói lại và xem phản hồi tham khảo','mic'],['mix','Kết hợp','Mỗi ngày một kiểu','shuffle']];
 let html;const radio=(k,arr)=>`<div class="choice" role="radiogroup">${arr.map(([v,l,d,ic])=>`<button class="radio ${(draft[k]||arr[k=='goal'?3:0][0])==v?'on':''}" role="radio" aria-checked="${(draft[k]||arr[k=='goal'?3:0][0])==v}" data-${k}="${v}"><span class="ic">${I(ic=='leaf'?'sparkles':ic)}</span><span><b>${l}</b><small>${d}</small></span></button>`).join('')}</div>`;
 if(step==0)html=`${mascot('wave','Chào bạn, mình là Neko.<br>Bạn tên là gì?')}<label class="sr" for="nm">Tên của bạn</label><input class="bigin" id="nm" placeholder="Tên của bạn" maxlength="24" autocomplete="given-name" value="${esc(draft.name||'')}"><div class="grow"></div>
  <button class="btn" id="nx">Tiếp tục</button><button class="btn sec" id="sk" style="margin-top:10px">Để sau</button>`;
 if(step==1)html=`${mascot('think',`Mỗi ngày ${esc(draft.name||'bạn')} muốn học bao nhiêu từ mới?`)}${radio('goal',goals)}<p class="muted center">Đây là giới hạn từ mới trong lịch ôn. Bạn vẫn có thể tự chọn từ và kiểu luyện bất cứ lúc nào.</p><div class="grow"></div><button class="btn" id="nx">Tiếp tục</button>`;
 if(step==2)html=`${mascot('idle','Bạn thích học theo kiểu nào?')}${radio('style',styles)}<div class="grow"></div><button class="btn" id="nx">Tiếp tục</button>`;
 if(step==3){const g=goals.find(x=>x[0]==(draft.goal||'all')),st=styles.find(x=>x[0]==(draft.style||'cards'));
  html=`${mascot('celebrate',`Thiết lập của ${esc(draft.name||'bạn')} đã sẵn sàng`)}<div class="card plan" style="padding:4px 18px">
  <div class="li"><span class="ic">${I('target')}</span><div><b>${g[1]}</b><small>Tự điều chỉnh theo thời gian và nhu cầu của bạn</small></div></div>
  <div class="li"><span class="ic">${I(st[3])}</span><div><b>${st[1]}</b><small>${st[2]}</small></div></div>
  <div class="li"><span class="ic">${I('headphones')}</span><div><b>${LANG.planTitle?LANG.planTitle(words.length):words.length+' từ Oxford 3000 · IELTS'}</b><small>${LANG.planSub||'Giọng Anh và Mỹ, phát âm chậm, câu ví dụ'}</small></div></div></div>
  <p class="muted center">Tiến độ chỉ lưu trên thiết bị này.</p><div class="grow"></div><button class="btn pri" id="nx">Bắt đầu</button>`}
 view('',`<div class="ob">${seg}${html}</div>`,step>0);$('#back').onclick=()=>onboarding(step-1,draft);
 if(step==0){const nm=$('#nm');nm.onkeydown=e=>{if(e.key=='Enter')$('#nx').click()};$('#nx').onclick=()=>{draft.name=nm.value.trim();onboarding(1,draft)};$('#sk').onclick=()=>{draft.name='';onboarding(1,draft)}}
 if(step==1){$$('[data-goal]').forEach(b=>b.onclick=()=>{draft.goal=b.dataset.goal;buzz(8);onboarding(1,draft)});$('#nx').onclick=()=>{draft.goal=draft.goal||'all';onboarding(2,draft)}}
 if(step==2){$$('[data-style]').forEach(b=>b.onclick=()=>{draft.style=b.dataset.style;buzz(8);onboarding(2,draft)});$('#nx').onclick=()=>{draft.style=draft.style||'cards';onboarding(3,draft)}}
 if(step==3)$('#nx').onclick=()=>{S.user={...draft,done:true,since:S.user?.since||today()};save();confetti();location.hash='#/';route()}}

/* ---------- home ---------- */
const MODES={cards:['layers','Thẻ ghi nhớ','Xem nhanh cả bộ, không ảnh hưởng lịch ôn'],learn:['brain','Học','4 bước: chọn, nhớ lại, điền câu, nghe'],hard:['target','Từ khó',''],
 speak:['mic','Luyện nói','Nghe, nói lại; phản hồi tham khảo'],listen:['headphones','Nghe – chép','Nghe từ rồi gõ lại'],review:['calendar-clock','Ôn theo lịch',''],cram:['repeat','Ôn toàn bộ','Lướt cả bộ từ, không làm lệch lịch ôn'],
 match:['zap','Ghép thẻ',''],test:['clipboard-check','Kiểm tra','20 câu hỗn hợp, chấm điểm'],...(LANG.modes||{}),list:['list-checks','Danh sách từ',''],stats:['chart-column','Thống kê','Tiến độ theo cấp độ']};
/* v14: earliest upcoming due time among scheduled cards (for the 'nothing due' state) */
function nextDueAt(cards,now=Date.now()){let m=Infinity;for(const x of cards){const c=S.srs[x.cid];if(!c||c.susp||c.state=='new')continue;if(c.due>now&&c.due<m)m=c.due}return m==Infinity?null:m}
function whenText(t,now=Date.now()){const ms=t-now,h=Math.round(ms/36e5),d=new Date(t),hm=d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
 if(ms<36e5)return `sau ${Math.max(1,Math.round(ms/6e4))} phút`;if(ymd(d)==today())return `hôm nay lúc ${hm} (sau ${h} giờ)`;if(ymd(d)==addDays(today(),1))return `ngày mai lúc ${hm}`;
 return `${d.toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'numeric'})}`}
function dueLine(d,now=Date.now()){const cs=allCards(d),q=counts(cs,now),due=q.r+q.l;
 if(due)return {due,n:q.n,txt:`Có ${due} thẻ đến hạn${q.n?` · ${q.n} thẻ mới`:''}`};
 const nx=nextDueAt(cs,now);if(q.n)return {due,n:q.n,txt:newPerDay()>=1e9?'Không có thẻ đến hạn · Tự chọn từ mới':`Không có thẻ đến hạn · Tối đa ${q.n} thẻ mới theo thiết lập`};
 return {due,n:0,txt:nx?`Không có thẻ đến hạn · lần ôn tiếp theo ${whenText(nx,now)}`:'Chưa có thẻ nào trong lịch ôn. Học vài từ mới trước nhé.'}}
function home(){if(LANG.onHome)LANG.onHome();const d=deck(),now=Date.now(),learned=d.filter(w=>isLearned(w.id)).length,cq=counts(allCards(d),now),due=cq.r+cq.l;
 const fz=applyFreezes();if(fz)setTimeout(()=>toast(`Đã dùng ${fz} ngày nghỉ để giữ chuỗi`,'shield',3500),300);const streak=streakNow(),frz=S.streak.freeze;
 const tl=S.log[today()]||{rev:0,new:0},g=newPerDay(),ga=goalAns(),gp=Math.min(100,tl.rev/ga*100);
 const hr=new Date().getHours(),hi=hr<11?'Chào buổi sáng':hr<18?'Chào buổi chiều':'Chào buổi tối';
 let st='wave',msg=`${hi}, ${esc(uname())}.<br>${g>=1e9?'Hôm nay bạn muốn học gì?':'Tối đa '+g+' từ mới theo thiết lập của bạn.'}`;
 if(!tl.rev&&streak>0){st='encouraging';msg=`${hi}, ${esc(uname())}.<br>Bạn có thể ôn lại, học tiếp hoặc nghỉ theo nhu cầu.`}
 else if(tl.rev>=ga){st='happy';msg=`Xong mục tiêu hôm nay. Giỏi lắm, ${esc(uname())}!`}
 if(!d.length){st='meditate';msg='Bộ từ đang trống. Hãy đổi bộ lọc nhé.'}
 const main='review';
 {const dl=dueLine(d,now);MODES.review[2]=`<span class="due-t">${dl.txt}</span>`}MODES.match[2]=S.best.match?`Kỷ lục ${(S.best.match/1000).toFixed(1)} giây`:'Ghép nhanh nhất có thể';MODES.list[2]=`Tìm, nghe, gắn sao (${Object.keys(S.star).length})`;{const h=hardWords().length;MODES.hard[2]=h?`${h} từ hay sai, gắn sao hoặc hay quên`:'Chưa có từ khó nào'}
 const M=k=>`<button class="mode ${k==main?'hero':''}" data-go="${k}"><span class="ic">${I(MODES[k][0])}</span><span><b>${MODES[k][1]}</b><br><small>${MODES[k][2]}</small></span>${k==main?`<span class="go">${I('chevron-right','l')}</span>`:''}</button>`;
 view('',`${mascot(st,msg)}
 <section class="card today" aria-label="Hôm nay"><div class="top"><b>Hôm nay</b><span class="streak" title="Chuỗi ngày học">${I('flame','s')}${streak} ngày${frz?`<span class="frz">${I('shield','s')}${frz}<span class="sr"> ngày nghỉ được bảo vệ</span></span>`:''}</span></div>
 <div class="top" style="margin:6px 0 10px"><span class="num">${Math.min(tl.rev,ga)}<span class="muted" style="font-size:15px;font-weight:500"> / ${ga} câu</span></span><span class="muted">${tl.new} từ mới${g<1e9?' / '+g:''}</span></div>
 <div class="bar" role="progressbar" aria-label="Mục tiêu hôm nay" aria-valuenow="${Math.round(gp)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${gp}%"></i></div>
 <div class="kpis"><div><b>${learned}</b>đã học</div><div><b>${due}</b>cần ôn</div><div><b>${d.length}</b>${esc(deckName())}</div></div></section>
 <div class="chips"><button class="chip on" id="filt">${I('sliders-horizontal','s')}Chọn bộ từ</button>${LANG.homeChips?LANG.homeChips():''}${[...new Set(words.flatMap(w=>w.tags.filter(t=>/^day/.test(t))))].sort().map(x=>`<button class="chip ${F().day==x?'on':''}" data-day="${x}" aria-pressed="${F().day==x}">Ngày ${+x.slice(3)}</button>`).join('')}</div>
 ${resumeBanner()}<div class="modes">${M(main)}${Object.keys(MODES).filter(k=>k!=main).map(M).join('')}</div>
 <p class="muted center" style="margin-top:20px">Tiến độ lưu riêng trên thiết bị này. Thêm vào màn hình chính để học cả khi offline.</p>`,false);
 $('#resume')&&($('#resume').onclick=()=>location.hash='#/'+S.sess._last);$('#filt').onclick=openFilter;$$('[data-day]').forEach(b=>b.onclick=()=>{F().day=F().day==b.dataset.day?'':b.dataset.day;save();home();buzz(8)});if(LANG.bindHome)LANG.bindHome();
 $$('[data-go]').forEach(b=>b.onclick=()=>{if(b.dataset.go=='hard'&&!hardWords().length){toast('Chưa có từ khó: từ bạn trả lời sai sẽ tự vào đây','info',3500);return}if(!deck().length&&b.dataset.go!='stats'){toast('Bộ từ đang trống, hãy đổi bộ lọc','info');return}location.hash='#/'+b.dataset.go})}

/* ---------- swipeable card ---------- */
function makeCard(stage,w,dir,onSwipe){const el=document.createElement('div');el.className='fc';el.tabIndex=0;el.setAttribute('role','group');el.setAttribute('aria-roledescription','thẻ ghi nhớ');el.setAttribute('aria-label',(dir=='en'?w.w:w.vi)+'. Chạm hoặc nhấn phím cách để lật');
 el.innerHTML=`<div class="inner"><div class="face f">${frontFace(w,dir)}</div><div class="face b">${backFace(w)}</div></div><span class="lbl L">${I('x','s')}Đang học</span><span class="lbl K">${I('check','s')}Đã biết</span>`;
 stage.appendChild(el);const L=$('.lbl.L',el),K=$('.lbl.K',el),FF=$('.face.f',el),FB=$('.face.b',el);const faces=()=>{const f=el.classList.contains('flip');FF.inert=f;FB.inert=!f;FF.setAttribute('aria-hidden',f);FB.setAttribute('aria-hidden',!f)};faces();new MutationObserver(faces).observe(el,{attributes:true,attributeFilter:['class']});
 /* Gesture state machine: idle -> pending -> (tap | swipe | scroll). Only a clean tap flips. */
 const TAP_SLOP=10,TAP_MS=450,FLIP_LOCK=reduce?60:540;let st='idle',pid=null,sx=0,sy=0,dx=0,t0=0,lastFlip=-Infinity,lastSwipeEnd=-Infinity,busy=false;
 const INTERACTIVE='button,a,input,textarea,select,label,[data-au],[data-star],[data-copy],[data-noflip]';
 /* v12 desktop: text is selectable; a mouse never drag-swipes from text (and never at all unless the "drag with mouse" setting is on).
    A mouse click flips only when the mouse did not move and nothing got selected; a click on text waits out the double-click window. */
 const TEXT='.w,.ipa,.vi,.sec,.muted,.tag,p';let mode='',flipT=0;
 /* v13 mouse on text: decide swipe vs select from the first movement. Fast, mostly-horizontal motion that crosses DEC_PX within DEC_MS
    (and before a DWELL_MS hold) = swipe (selection cleared); a hold, slow or vertical motion = native text selection. */
 const DEC_PX=8,DEC_MS=150,DWELL_MS=220,DEC_V=0.5,DEC_RATIO=1.5,mdragOn=()=>S.set.mdrag!==false;
 const hasSel=()=>{const g=getSelection&&getSelection();return !!(g&&!g.isCollapsed&&String(g).trim()&&el.contains(g.anchorNode))};
 const flip=()=>{const n=performance.now();if(busy||n-lastFlip<FLIP_LOCK)return;lastFlip=n;el.classList.toggle('flip');el.classList.remove('hint');buzz(6);if(el.classList.contains('flip')&&dir=='vi'&&S.set.autoplay)play(w);if(el._onflip)el._onflip()};
 const reset=()=>{el.style.transition=reduce?'none':'transform 480ms var(--ease-spring)';el.style.transform='';L.style.opacity=K.style.opacity=0;el.classList.remove('dragging')};
 let onBtn=false;el.addEventListener('pointerdown',e=>{clearTimeout(flipT);if(busy||(e.pointerType=='mouse'&&e.button!==0)){st='idle';return}
  onBtn=!!e.target.closest(INTERACTIVE);const onText=!!e.target.closest(TEXT);mode=e.pointerType=='mouse'?(mdragOn()?(onText?'mdecide':'mdrag'):(onText?'mtext':'mclick')):'touch';
  if(mode=='mtext'||mode=='mclick'||mode=='mdecide'){st=mode=='mdecide'?'decide':'mouse';dx=0;pid=e.pointerId;sx=e.clientX;sy=e.clientY;t0=performance.now();el._sel0=hasSel();return}st='pending';pid=e.pointerId;sx=e.clientX;sy=e.clientY;dx=0;t0=performance.now();if(!onBtn)el.classList.add('pressed')});
 el.addEventListener('pointermove',e=>{if(e.pointerId!==pid||st=='idle'||st=='scroll'||st=='mouse')return;const mx=e.clientX-sx,my=e.clientY-sy;
  if(st=='decide'){const d=Math.hypot(mx,my),t=performance.now()-t0;if(d<DEC_PX){if(t>DWELL_MS)st='mouse';return}
   if(t<=DEC_MS&&d/Math.max(t,1)>=DEC_V&&Math.abs(mx)>Math.abs(my)*DEC_RATIO){try{getSelection().removeAllRanges()}catch(_){}st='swipe';el.classList.add('dragging');el.style.transition='none';try{el.setPointerCapture(pid)}catch(_){}}
   else{st='mouse';return}}
  if(st=='pending'){if(Math.hypot(mx,my)<TAP_SLOP)return;el.classList.remove('pressed');
   if(Math.abs(mx)>Math.abs(my)*1.2){st='swipe';el.classList.add('dragging');el.style.transition='none';try{el.setPointerCapture(pid)}catch(_){}}else{st='scroll';return}}
  if(st=='swipe'){if(e.pointerType=='mouse'&&hasSel())getSelection().removeAllRanges();dx=mx;const lim=innerWidth*.9,rx=Math.abs(dx)>lim?Math.sign(dx)*(lim+(Math.abs(dx)-lim)*.25):dx;
   el.style.transform=`translate3d(${rx}px,0,0) rotate(${rx/24}deg)`;const o=Math.min(1,Math.abs(dx)/100);L.style.opacity=dx<0?o:0;K.style.opacity=dx>0?o:0}});
 el.addEventListener('pointerup',e=>{if(e.pointerId!==pid)return;el.classList.remove('pressed');const s0=st;st='idle';pid=null;
  if(s0=='mouse'||s0=='decide'){if(onBtn)return;const moved=Math.hypot(e.clientX-sx,e.clientY-sy)>4;if(moved||e.detail>1||hasSel()||el._sel0)return;
   if(mode=='mtext'||mode=='mdecide')flipT=setTimeout(()=>{if(!hasSel())flip()},280);else flip();return}
  if(s0=='mselect')return;
  if(s0=='pending'){if(onBtn)return;const sel=getSelection&&String(getSelection()).length>0;if(performance.now()-t0<=TAP_MS&&!sel&&performance.now()-lastSwipeEnd>300)flip();return}
  if(s0=='swipe'){if(e.pointerType=='mouse')try{getSelection().removeAllRanges()}catch(_){}lastSwipeEnd=window._swipeT=performance.now();const v=Math.abs(dx)/(performance.now()-t0);if(Math.abs(dx)>100||(v>.5&&Math.abs(dx)>40))fling(dx>0);else reset()}});
 el.addEventListener('pointercancel',()=>{el.classList.remove('pressed');if(st=='swipe')reset();st='idle';pid=null});
 el.addEventListener('lostpointercapture',e=>{if(e.target===el&&st=='swipe'){st='idle';reset()}});
 el.addEventListener('click',e=>{if(!e.target.closest(INTERACTIVE)){e.preventDefault()}});
 el.addEventListener('contextmenu',e=>{if(e.pointerType!='mouse'&&!e.target.closest(TEXT))e.preventDefault()});
 el.addEventListener('dblclick',()=>clearTimeout(flipT));
 el.addEventListener('mousedown',e=>{if(mode=='mdrag'&&!onBtn)e.preventDefault()});/* drag-to-swipe from a non-text area must not start a text selection */
 /* touch long-press selection: once the user selects text inside the card, cancel any pending tap/swipe */
 const onSel=()=>{if(!el.isConnected){document.removeEventListener('selectionchange',onSel);return}if(st!=='idle'&&st!=='mouse'&&hasSel()){if(st=='swipe')reset();el.classList.remove('pressed');st='idle';pid=null}};document.addEventListener('selectionchange',onSel);
 function fling(right){if(busy)return;busy=true;buzz(12);el.classList.remove('dragging');if(reduce){el.remove();onSwipe(right);return}
  el.style.transition='transform 300ms var(--ease),opacity 300ms';el.style.transform=`translate3d(${(right?1:-1)*innerWidth*1.2}px,24px,0) rotate(${right?18:-18}deg)`;el.style.opacity=0;(right?K:L).style.opacity=1;setTimeout(()=>{el.remove();onSwipe(right)},240)}
 el.addEventListener('keydown',e=>{if(e.target!==el)return;if(e.key==' '||e.key=='Enter'){e.preventDefault();e.stopPropagation();flip()}});return {el,flip,fling}}

/* ---------- flashcards ---------- */
/* v16: Flashcards have two modes. "Theo lịch" = the same FSRS queue as Ôn theo lịch (shared session, no double counting);
   "Lướt tự do" = free browsing that never changes the schedule. */
const FCX={sched:'Theo lịch: chỉ thẻ đến hạn và thẻ mới, tự xếp lịch ôn',free:'Lướt tự do: xem cả bộ theo thứ tự, không ảnh hưởng lịch ôn'};
const fcSwitch=()=>`<div class="fcwrap"><div class="fcmode" role="radiogroup" aria-label="Chế độ thẻ ghi nhớ">${[['sched','Theo lịch','calendar-clock'],['free','Lướt tự do','layers']].map(([k,l,ic])=>`<button role="radio" class="fcm ${S.set.fcMode==k?'on':''}" aria-checked="${S.set.fcMode==k}" data-fcm="${k}">${I(ic,'s')}${l}</button>`).join('')}</div><p class="fcx" id="fcx">${FCX[S.set.fcMode=='free'?'free':'sched']}</p></div>`;
function bindFc(){if(!S.set.fchint){S.set.fchint=1;save();setTimeout(()=>toast('Thẻ ghi nhớ có 2 chế độ: “Theo lịch” giúp nhớ lâu (khuyên dùng), “Lướt tự do” để xem nhanh cả bộ','info',6000),700)}$$('[data-fcm]').forEach(b=>b.onclick=()=>{if(S.set.fcMode==b.dataset.fcm)return;S.set.fcMode=b.dataset.fcm;save();route()})}
let FC=null,keys=null;document.addEventListener('keydown',e=>keys&&keys(e));
function cards(){const d=deck();if(!FC){const o=sess('cards');if(o&&o.sig==JSON.stringify(F())&&o.queue.every(byId))FC=o}if(!FC||FC.sig!=JSON.stringify(F()))FC={sig:JSON.stringify(F()),queue:d.map(w=>w.id),i:0,know:0,learn:0,hist:[],shuffled:false,flipped:false};render();
 function render(){const total=FC.queue.length;if(FC.i>=total)return done();sess('cards',FC);const w=byId(FC.queue[FC.i]);
  view('Thẻ ghi nhớ',`${mascot(FC.mood||(FC.i==0?'wave':'idle'),FC.tip||(matchMedia('(hover:hover) and (pointer:fine)').matches?'Nhấp để lật. Phím → nếu đã biết.':'Chạm để lật. Vuốt phải nếu đã biết.'),{small:true,row:true})}
  <div class="prog"><span class="count l" aria-label="Đang học ${FC.learn}">${FC.learn}</span><div class="bar" role="progressbar" aria-label="Tiến độ bộ thẻ" aria-valuenow="${FC.i}" aria-valuemax="${total}"><i style="width:${FC.i/total*100}%"></i></div><span class="count k" aria-label="Đã biết ${FC.know}">${FC.know}</span></div>
  <div class="stage" id="stage"></div>
  <div class="yn"><button class="btn l" id="nL" title="Đang học (phím ←)">${I('x')}Đang học</button><button class="btn k" id="nK" title="Đã biết (phím →)">${I('check')}Đã biết</button></div>
  <div class="ctrl"><button class="ib" id="undo" aria-label="Hoàn tác" title="Hoàn tác (phím Z)" ${FC.hist.length?'':'disabled'}>${I('undo-2')}</button><button class="ib ${FC.shuffled?'on':''}" id="shuf" title="Trộn thẻ" aria-label="Trộn thẻ" aria-pressed="${FC.shuffled}">${I('shuffle')}</button>
  <button class="ib" id="flipb" aria-label="Lật thẻ" title="Lật thẻ (phím cách)">${I('refresh-cw')}</button><button class="ib ${S.set.dir=='vi'?'on':''}" id="dirb" aria-label="Đổi chiều Anh – Việt" title="Đổi chiều Anh – Việt">${I('languages')}</button><button class="ib ${S.set.autoplay?'on':''}" id="autob" title="Tự phát âm" aria-label="Tự phát âm" aria-pressed="${S.set.autoplay}">${I(S.set.autoplay?'volume-2':'volume-x')}</button></div>
  <p class="xnote">${I('info','s')}Xem cả bộ, không thay đổi lịch ôn. Muốn ghi nhớ lâu dài: <a href="#/review">Ôn theo lịch</a></p><p class="hint">${FC.i+1} / ${total} · <span class="t-touch">Chạm để lật, vuốt để chọn</span><span class="t-desk">Nhấp để lật · kéo nhanh hoặc phím ← → để chọn · giữ chuột rồi kéo để bôi đen chữ</span></p>`);
  if(!S.set.mhint&&matchMedia('(hover:hover) and (pointer:fine)').matches&&S.set.mdrag!==false){S.set.mhint=1;save();setTimeout(()=>{if(location.hash==='#/cards')toast('Mẹo: kéo nhanh thẻ sang ngang để chuyển thẻ; giữ chuột một chút rồi kéo để bôi đen chữ','info',5000)},900)}
  if(FC.mood){const m=$('.mascot');setTimeout(()=>moodTo(m,'idle'),1300);FC.mood=null}
  const c=makeCard($('#stage'),w,S.set.dir,right=>{FC.tip=right?['Tuyệt, đã biết!','Nhớ tốt lắm!','Giỏi quá!'][Math.random()*3|0]:'Không sao, mình sẽ gặp lại từ này.';FC.mood=right?'happy':'sad';FC.hist.push({id:w.id,right});right?FC.know++:FC.learn++;practice(w,right);if(!right)FC.queue.push(w.id);FC.i++;FC.flipped=false;render()});
  c.el._onflip=()=>{FC.flipped=c.el.classList.contains('flip');sess('cards',FC)};if(FC.flipped)c.el.classList.add('flip');
  if(S.set.dir=='en'&&S.set.autoplay&&!FC.flipped)play(w);
  $('#nL').onclick=()=>c.fling(false);$('#nK').onclick=()=>c.fling(true);$('#flipb').onclick=c.flip;
  $('#undo').onclick=()=>{const h=FC.hist.pop();if(!h)return;FC.i--;FC.flipped=false;h.right?FC.know--:FC.learn--;if(!h.right)FC.queue.pop();FC.tip='Đã hoàn tác';render()};
  $('#shuf').onclick=()=>{FC.shuffled=!FC.shuffled;const rest=FC.queue.slice(FC.i);FC.queue=FC.queue.slice(0,FC.i).concat(FC.shuffled?shuffle(rest):rest.sort((a,b)=>a.localeCompare(b)));toast(FC.shuffled?'Đã trộn thẻ':'Theo thứ tự','shuffle');render()};
  $('#dirb').onclick=()=>{S.set.dir=S.set.dir=='en'?'vi':'en';save();render()};$('#autob').onclick=()=>{S.set.autoplay=!S.set.autoplay;save();render()};
  keys=e=>{if(e.target.tagName=='INPUT'||e.ctrlKey||e.metaKey||e.altKey)return;if((e.key=='z'||e.key=='Z')&&FC.hist.length){$('#undo').click();return}if(e.key=='ArrowRight')c.fling(true);else if(e.key=='ArrowLeft')c.fling(false);else if(e.key==' '){e.preventDefault();c.flip()}}}
 function done(){sess('cards',null);confetti();view('Thẻ ghi nhớ',`<div class="res">${mascot('celebrate','Bạn đã đi hết bộ thẻ!')}<p class="muted">${FC.know} lần “đã biết” · ${FC.learn} lần “đang học”</p>
  <div class="row"><button class="btn sec" id="again">Bắt đầu lại</button><button class="btn" id="learnm">Chế độ Học</button></div></div>`);
  $('#again').onclick=()=>{FC=null;sess('cards',null);cards()};$('#learnm').onclick=()=>location.hash='#/learn'}}

/* ---------- SRS review (Anki-style queues, FSRS/SM-2) ---------- */
const LEARN_AHEAD=20*60e3;
const cidOf=(w,dir)=>dir=='vi'?w.id+'~r':w.id;
function allCards(d){const out=[];for(const w of d){out.push({cid:w.id,w,dir:'en'});if(S.set.rev)out.push({cid:w.id+'~r',w,dir:'vi'})}return out}
function bury(){const day=ymd(new Date(SRS.dayStart(Date.now())));if(!S.bury||S.bury.day!=day)S.bury={day,w:{}};return S.bury}
const buried=(x)=>{const b=bury().w[x.w.id];return !!b&&b!=x.cid};
const schedOpt=()=>({algo:S.set.algo,retention:+S.set.retention||.9});
function counts(cards,now=Date.now()){let n=0,l=0,r=0;const end=SRS.dayAt(now,1);for(const x of cards){const c=S.srs[x.cid];if(c&&c.susp)continue;
  if(!c||c.state=='new'){if(!buried(x))n++}else if(c.state=='review'){if(c.due<=now&&!buried(x))r++}else if(c.due<end)l++}
 return{n:Math.min(n,Math.max(0,newPerDay()-((S.log[today()]||{}).new||0))),l,r}}
function nextCard(cards,now=Date.now(),cur){if(cur){const x=cards.find(x=>x.cid==cur);if(x)return x}
 const Lq=[],Rq=[],Nq=[];for(const x of cards){const c=S.srs[x.cid];if(c&&c.susp)continue;if(!c||c.state=='new'){if(!buried(x))Nq.push(x)}else if(c.state=='review'){if(c.due<=now&&!buried(x))Rq.push(x)}else Lq.push(x)}
 const exp=x=>(S.ev[x.w.id]||[]).length?1:0;Nq.sort((a,b)=>exp(b)-exp(a));const due=x=>S.srs[x.cid].due;Lq.sort((a,b)=>due(a)-due(b));Rq.sort((a,b)=>due(a)-due(b));
 const ld=Lq.find(x=>due(x)<=now);if(ld)return ld;if(Rq.length)return Rq[0];if(Nq.length&&counts(cards,now).n>0)return Nq[0];return Lq.find(x=>due(x)<=now+LEARN_AHEAD)||null}
function loadFns(x,now){const per={};let sibDay=null;const sib=x.dir=='en'?x.w.id+'~r':x.w.id;
 for(const k in S.srs){const c=S.srs[k];if(c.state!='review'||c.susp)continue;const t=SRS.dayIndex(c.due,now);per[t]=(per[t]||0)+1;if(k==sib)sibDay=t}
 return{load:t=>per[t]||0,sib:S.set.rev&&sibDay!=null?(t=>t==sibDay):null}}
function gradeCard(x,r,now=Date.now()){if(!S._p){S._p=1;persistStorage()}const prev=S.srs[x.cid]?SRS.migrate(S.srs[x.cid]):null,kb=SRS.kind(prev);
 const c=SRS.answer(prev,r,now,{...schedOpt(),...loadFns(x,now)});S.srs[x.cid]=c;if(x.dir=='en')S.known[x.w.id]=r>=3;logIt(kb=='new');
 const l=S.log[today()];l[['','again','hard','good','easy'][r]]=(l[['','again','hard','good','easy'][r]]||0)+1;if(kb=='review'){l.rv=(l.rv||0)+1;if(r>1)l.pass=(l.pass||0)+1}
 bury().w[x.w.id]=x.cid;S.revlog=S.revlog||[];S.revlog.push([now,x.cid,r,kb,c.int||0]);if(S.revlog.length>20000)S.revlog.splice(0,S.revlog.length-20000);
 if(c.leechNew){delete c.leechNew;S.star[x.w.id]=true;setTimeout(()=>toast('Từ “'+x.w.w+'” hay quên: đã tạm ngưng và gắn sao. Mở lại trong Danh sách từ.','star',4500),0)}save();return c}
function review(cram=false,flash=false){const d=deck(),T=cram?'Ôn toàn bộ':flash?'Thẻ ghi nhớ':'Ôn theo lịch',key=cram?'cram':'review',sig=JSON.stringify(F())+(cram?'':S.set.rev);
 const cards=cram?null:allCards(d);
 let ss=sess(key);if(!ss||ss.sig!=sig||(!cram&&ss.day!=today()))ss={sig,day:today(),cur:null,flipped:false,done:0,undo:[],...(cram?{queue:shuffle(d).map(w=>w.id),i:0}:{})};
 const put=()=>sess(key,ss);
 (function nx(){const now=Date.now();let x;
  if(cram){x=ss.i<ss.queue.length?{w:byId(ss.queue[ss.i]),dir:S.set.dir}:null}else x=nextCard(cards,now,ss.cur);
  if(!x){if(!cram&&ss.undo.length){ss.cur=null;put()}else sess(key,null);if(ss.done)confetti();const later=cram?0:cards.filter(y=>{const c=S.srs[y.cid];return c&&!c.susp&&(c.state=='learn'||c.state=='relearn')}).length;
   view(T,`${flash?fcSwitch():''}<div class="res">${mascot(ss.done?'celebrate':'meditate',cram?'Bạn đã ôn hết cả bộ từ!':ss.done?'Xong lượt ôn hôm nay!':'Chưa có thẻ nào cần ôn lúc này.')}
   ${later?`<p class="muted">Còn ${later} thẻ đang học sẽ đến hạn lại sau ít phút.</p><button class="btn sec" id="ahead">Học trước các thẻ này</button>`:''}
   <p class="muted">${cram?'Lượt ôn toàn bộ không thay đổi lịch ôn của bạn.':flash?'Muốn xem lại cả bộ? Chọn “Lướt tự do” ở trên, không làm lệch lịch ôn.':'Muốn lướt lại cả bộ? Dùng “Ôn toàn bộ”, không làm lệch lịch ôn.'}</p>
   <div class="row">${!cram&&ss.undo.length?`<button class="btn sec" id="undo2">${I('undo-2','s')}Hoàn tác</button>`:''}<button class="btn sec" onclick="location.hash='#/'">Trang chủ</button><button class="btn" id="again">${cram?'Ôn lại lượt mới':'Ôn toàn bộ'}</button></div></div>`);
   if(flash)bindFc();$('#again').onclick=()=>{if(cram){sess('cram',null);review(true)}else location.hash='#/cram'};$('#undo2')&&($('#undo2').onclick=undo);
   $('#ahead')&&($('#ahead').onclick=()=>{const y=cards.filter(y=>{const c=S.srs[y.cid];return c&&!c.susp&&(c.state=='learn'||c.state=='relearn')}).sort((a,b)=>S.srs[a.cid].due-S.srs[b.cid].due)[0];if(y){ss.cur=y.cid;put();nx()}});return}
  const w=x.w;if(!cram){ss.cur=x.cid}put();
  const c=cram?null:S.srs[x.cid]?SRS.migrate(S.srs[x.cid]):null,k=SRS.kind(c),q=cram?null:counts(cards,now),labs=cram?['ôn lại','sau ít thẻ','xong','xong']:SRS.preview(c,now,schedOpt()).map(SRS.label);
  const R=cram?null:SRS.retrievability(c,now);
  const head=cram?`<div class="prog"><div class="bar" role="progressbar" aria-label="Tiến độ ôn toàn bộ" aria-valuenow="${ss.i}" aria-valuemax="${ss.queue.length}"><i style="width:${ss.i/ss.queue.length*100}%"></i></div><span>${ss.i+1}/${ss.queue.length}</span></div>`
   :`<div class="qhead"><div class="qcounts" role="status" aria-label="Mới ${q.n}, đang học ${q.l}, cần ôn ${q.r}"><span class="cn n ${k=='new'?'cur':''}"><b>${q.n}</b><small>Mới</small></span><span class="cn l ${k=='learn'?'cur':''}"><b>${q.l}</b><small>Học</small></span><span class="cn r ${k=='review'?'cur':''}"><b>${q.r}</b><small>Ôn</small></span></div>
    <span class="rtag" title="Xác suất bạn còn nhớ thẻ này lúc này">${R==null?'Thẻ mới':'Khả năng nhớ '+Math.round(R*100)+'%'}${x.dir=='vi'?' · Việt → Anh':''}</span>
    <button class="ib" id="undo" aria-label="Hoàn tác câu trả lời trước" ${ss.undo.length?'':'disabled'}>${I('undo-2')}</button></div>`;
  view(T,`${flash?fcSwitch():''}${head}<div class="stage" id="stage"></div>
  ${flash&&S.set.fc4?`<div class="grades g4f" role="group" aria-label="Bạn nhớ thẻ này thế nào?">${['Lại','Khó','Được','Dễ'].map((t,i)=>`<button class="gbtn g${i+1}${i==2?' main':''}" data-g="${i+1}" aria-label="${t}, gặp lại sau ${labs[i]}"><small>${labs[i]}</small><b>${t}</b></button>`).join('')}</div>`:''}
  ${flash&&!S.set.fc4?`<div class="yn"><button class="btn l" id="fA" aria-label="Lại, gặp lại sau ${labs[0]}">${I('x')}<span>Lại <small>${labs[0]}</small></span></button><button class="btn k" id="fG" aria-label="Được, gặp lại sau ${labs[2]}">${I('check')}<span>Được <small>${labs[2]}</small></span></button></div>
</div>`:''}
  ${flash?`<label class="sw4"><span>4 mức đánh giá (Lại · Khó · Được · Dễ)</span><button role="switch" id="more4" class="swt ${S.set.fc4?'on':''}" aria-checked="${!!S.set.fc4}" aria-label="Hiện 4 mức đánh giá"><i></i></button></label>`:''}
  <div class="grades hidden${flash?' f-off':''}" id="gr" role="group" aria-label="Bạn nhớ thẻ này thế nào?">${['Lại','Khó','Được','Dễ'].map((t,i)=>`<button class="gbtn g${i+1}${i==2?' main':''}" data-g="${i+1}" title="${['Quên, gặp lại sớm','Nhớ ra nhưng rất vất vả','Nhớ được bình thường (phím cách)','Nhớ ngay, quá dễ'][i]} · phím ${i+1}" aria-label="${t}, gặp lại sau ${labs[i]}"><small>${labs[i]}</small><b>${t}</b></button>`).join('')}</div>
  ${S.set.gtip?'':`<div class="gtip hidden" id="gtip" role="note"><div><b>Chọn thế nào?</b> <b class="c1">Lại</b> = quên hẳn. <b class="c2">Khó</b> = nhớ ra được nhưng rất vất vả (không phải trả lời sai). <b class="c3">Được</b> = nhớ bình thường, chọn mặc định. <b class="c4">Dễ</b> = nhớ ngay, quá dễ.</div><button class="btn sm sec" id="gtipx">Đã hiểu</button></div>`}
  ${flash?'':'<button class="btn" id="show" style="margin-top:12px">Hiện đáp án</button>'}<p class="hint">Vuốt phải = Được · trái = Lại · phím 1–4, phím cách = ${flash?'lật / Được':'Được'}${cram?'':' · Z hoàn tác'}</p>`);
  const answer=r=>{buzz(8);ss.flipped=false;ss.done++;
   if(cram){const back=r==1?3:r==2?8:0;if(back){const id=ss.queue[ss.i];ss.queue.splice(Math.min(ss.queue.length,ss.i+1+back),0,id)}ss.i++}
   else{const t=today();ss.undo.push({cid:x.cid,prev:S.srs[x.cid]?structuredClone(S.srs[x.cid]):null,log:structuredClone(S.log[t]||null),t,bury:structuredClone(bury()),rl:(S.revlog||[]).length,known:S.known[w.id],done:ss.done-1});if(ss.undo.length>30)ss.undo.shift();gradeCard(x,r,Date.now());ss.cur=null}
   put();nx()};
  function undo(){const u=ss.undo.pop();if(!u)return;if(u.prev)S.srs[u.cid]=u.prev;else delete S.srs[u.cid];if(u.log)S.log[u.t]=u.log;else delete S.log[u.t];S.bury=u.bury;if(S.revlog)S.revlog.length=Math.min(S.revlog.length,u.rl);
   if(u.known===undefined)delete S.known[u.cid.replace('~r','')];else S.known[u.cid.replace('~r','')]=u.known;ss.cur=u.cid;ss.flipped=true;ss.done=u.done;save();put();toast('Đã hoàn tác','undo-2');nx()}
  const cc=makeCard($('#stage'),w,x.dir,right=>answer(right?3:1));
  if(flash){bindFc();$('#fA')&&($('#fA').onclick=()=>cc.fling(false));$('#fG')&&($('#fG').onclick=()=>cc.fling(true));$('#more4').onclick=()=>{S.set.fc4=!S.set.fc4;save();buzz(8);nx()}}
  const showGr=()=>{$('#gr').classList.remove('hidden');$('#show')&&$('#show').classList.add('hidden');const gt=$('#gtip');if(gt){gt.classList.remove('hidden');$('#gtipx').onclick=()=>{S.set.gtip=1;save();gt.remove()}}};
  cc.el._onflip=()=>{ss.flipped=cc.el.classList.contains('flip');put();showGr()};
  if(ss.flipped){cc.el.classList.add('flip');showGr()}
  const reveal=()=>{if(!cc.el.classList.contains('flip'))cc.flip();showGr()};
  $('#show')&&($('#show').onclick=reveal);$$('[data-g]').forEach(b=>b.onclick=()=>answer(+b.dataset.g));$('#undo')&&($('#undo').onclick=undo);
  if(x.dir=='en'&&S.set.autoplay&&!ss.flipped)play(w);
  keys=e=>{if(e.target.tagName=='INPUT')return;if(flash&&(e.key=='ArrowRight'||e.key=='ArrowLeft')){cc.fling(e.key=='ArrowRight');return}if(e.key==' '){e.preventDefault();if(!$('#gr').classList.contains('hidden'))answer(3);else reveal()}else if('1234'.includes(e.key)&&(flash||!$('#gr').classList.contains('hidden')))answer(+e.key);else if((e.key=='z'||e.key=='Z')&&!cram)undo()}})()}
function resumeBanner(){const m=S.sess&&S.sess._last,o=m&&S.sess[m];if(!o||!R[m])return '';const nm={cards:'Thẻ ghi nhớ',review:'Ôn theo lịch',cram:'Ôn toàn bộ',learn:'Học',listen:'Nghe – chép',speak:'Luyện nói',test:'Kiểm tra'}[m];if(!nm)return '';
 return `<button class="resume" id="resume">${I('play','s')}<span><b>Tiếp tục phiên trước</b><small>${nm}</small></span>${I('chevron-right','s')}</button>`}

/* ---------- Learn ---------- */
const PRAISE=['Chính xác!','Tuyệt vời!','Giỏi lắm!','Quá chuẩn!'];
/* Difficult words: missed in practice, lapsed in review, leeches, or starred (Memrise "difficult words") */
function hardWords(){const sc=w=>{let s=(S.miss[w.id]||0)*2+(S.star[w.id]?1:0);for(const id of [w.id,w.id+'~r']){const c=S.srs[id];if(c)s+=(c.lapses||0)*2+(c.leech?4:0)}return s};
 return deck().map(w=>[w,sc(w)]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).map(x=>x[0])}
/* Learn: each word climbs 4 steps, from recognition to recall: 0 choice, 1 typed recall, 2 cloze in its example, 3 dictation; 4 = mastered.
   A miss steps back one level. Practice only: the review schedule is never touched. */
function learn(mode){const hard=mode=='hard',SK=hard?'hard':'learn',MAX=4,ROUND=hard?12:7;const d=hard?hardWords():deck();let round=[],ri=0,rc=0;
 const lv=w=>S.learn[w.id]||0,KIND=['Trắc nghiệm','Nhớ lại','Điền vào câu','Nghe – chép'];
 const stageOf=w=>{if(hard){const o=cloze(w)?[1,2,3]:[1,3];let h=ri;for(const c of w.id)h+=c.charCodeAt(0);return o[h%o.length]}let s=Math.min(lv(w),3);if(s==2&&!cloze(w))s=3;return s};
 const put=()=>sess(SK,{sig:JSON.stringify(F()),round:round.map(w=>w.id),ri,rc});
 function start(){ri=0;rc=0;if(hard){const h=hardWords();if(!h.length)return finished();round=shuffle(h.slice(0,ROUND));return ask()}
  const pend=d.filter(w=>lv(w)<MAX);if(!pend.length)return finished();round=shuffle(shuffle(pend.filter(w=>S.learn[w.id]!=null)).concat(shuffle(pend.filter(w=>S.learn[w.id]==null)).slice(0,ROUND)).slice(0,ROUND));ask()}
 function header(st){const tip=['Từ này nghĩa là gì nhỉ?','Tự nhớ lại trước khi xem đáp án.','Đọc cả câu để đoán từ còn thiếu.','Nghe kỹ rồi gõ lại.'][st];
  if(hard)return `${mascot('think',tip,{small:true,row:true})}<div class="prog"><div class="bar" role="progressbar" aria-label="Tiến độ vòng" aria-valuenow="${ri}" aria-valuemin="0" aria-valuemax="${round.length}"><i style="width:${ri/round.length*100}%"></i></div><span>${ri+1}/${round.length}</span></div><p class="muted">Từ khó · ${KIND[st]}</p>`;
  const m=d.filter(w=>lv(w)>=MAX).length,sum=d.reduce((a,w)=>a+Math.min(MAX,lv(w)),0);
  return `${mascot('think',tip,{small:true,row:true})}<div class="prog"><div class="bar" role="progressbar" aria-label="Tiến độ" aria-valuenow="${m}" aria-valuemin="0" aria-valuemax="${d.length}"><i style="width:${sum/(MAX*d.length)*100}%"></i></div><span>${m}/${d.length}</span></div>
  <p class="muted">Câu ${ri+1}/${round.length} · ${KIND[st]} <span class="sr">· bước ${st+1} trên 4</span><span class="steps" aria-hidden="true">${[0,1,2,3].map(k=>`<i class="${k<st?'done':k==st?'cur':''}"></i>`).join('')}</span></p>`}
 function ask(){if(ri>=round.length)return roundEnd();put();const w=round[ri],st=stageOf(w),T=hard?'Từ khó':'Học';
  if(st==0){const en=Math.random()<.5;const pool=shuffle(words.filter(x=>x.id!=w.id&&x.pos.split(',')[0]==w.pos.split(',')[0])).concat(shuffle(words.filter(x=>x.id!=w.id)));const opts=shuffle([w,...pool.filter((x,i,a)=>a.indexOf(x)==i).slice(0,3)]);
   view(T,header(st)+`<div class="card q"><div class="kind">${en?'Thuật ngữ':'Định nghĩa'}</div><div class="term">${esc(en?w.w:w.vi)}</div>${en?`<div class="audiobar" style="justify-content:flex-start;margin:-8px 0 12px">${auBtns(w,false)}</div>`:''}
   <div class="kind" style="margin-bottom:8px">Chọn đáp án đúng</div><div class="opts">${opts.map((o,i)=>`<button class="opt" data-id="${o.id}"><span class="n">${i+1}</span>${esc(en?o.vi:o.w)}</button>`).join('')}</div><div id="fb" aria-live="polite"></div></div>`);
   if(en&&S.set.autoplay)play(w);
   const pick=b=>{if($('.opt[disabled]'))return;const ok=b.dataset.id==w.id;$$('.opt').forEach(x=>{x.disabled=true;if(x.dataset.id==w.id)x.classList.add('ok')});if(!ok)b.classList.add('bad');res(w,ok,st,null)};
   $$('.opt').forEach(b=>b.onclick=()=>pick(b));keys=e=>{if('1234'.includes(e.key)&&$$('.opt')[e.key-1])pick($$('.opt')[e.key-1])};return}
  const cz=st==2?cloze(w):null;let body;
  if(st==1)body=`<div class="kind">Định nghĩa</div><div class="term">${esc(w.vi)}</div><div class="tags" style="justify-content:flex-start;margin:-8px 0 16px"><span class="tag">${esc(w.pos)}</span></div><label class="kind" for="ti" style="display:block;margin-bottom:8px">${LANG.typePrompt||'Gõ từ tiếng Anh'}</label>`;
  else if(st==2)body=`<div class="kind">Điền từ còn thiếu</div><p class="cloze">${esc(cz.before)}<span class="gap"><span class="sr">chỗ trống</span><span aria-hidden="true">${'_'.repeat(Math.max(4,cz.ans.length))}</span></span>${esc(cz.after)}</p><p class="muted" style="margin:0 0 4px">${esc(w.exvi)}</p><p class="muted" style="margin:0 0 16px">Gợi ý: ${esc(w.vi)} · bắt đầu bằng “${esc(cz.ans[0])}”</p><label class="kind" for="ti" style="display:block;margin-bottom:8px">Từ còn thiếu</label>`;
  else body=`<div class="kind">Nghe và gõ lại</div><div class="audiobar" style="justify-content:flex-start;margin:0 0 16px"><button class="btn sm sec" id="pl">${I('volume-2','s')}Nghe lại</button><button class="btn sm sec" data-au="${w.id}" data-k="w" data-slow="1">${I('turtle','s')}Chậm</button></div><label class="kind" for="ti" style="display:block;margin-bottom:8px">Từ bạn nghe được</label>`;
  view(T,header(st)+`<div class="card q">${body}<input class="ti" id="ti" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done">
  <div class="row" id="tirow"><button class="btn sec" id="dk">Không biết</button><button class="btn" id="ck">Kiểm tra</button></div><div id="fb" aria-live="polite"></div></div>`);
  if(st==3){const pl=$('#pl');pl.onclick=()=>play(w,'w',{btn:pl});setTimeout(()=>play(w,'w',{btn:pl}),250)}
  const ti=$('#ti'),targets=cz?[norm(cz.ans),...accepts(w)]:accepts(w);setTimeout(()=>ti.focus(),60);
  const chk=give=>{if(ti.disabled)return;const r=give?{ok:false,exact:false,input:'',target:targets[0]}:checkAns(ti.value,targets);ti.disabled=true;ti.classList.add(r.ok?(r.exact?'ok':'near'):'bad');$('#tirow').remove();res(w,r.ok,st,r)};
  $('#ck').onclick=()=>chk(false);$('#dk').onclick=()=>chk(true);ti.onkeydown=e=>{if(e.key=='Enter')chk(false)};keys=null}
 function res(w,ok,st,r){const snap=[S.learn[w.id],S.miss[w.id]];
  const apply=ok=>{if(hard){if(ok){S.miss[w.id]=Math.max(0,(S.miss[w.id]||0)-1);if(!S.miss[w.id])delete S.miss[w.id]}else S.miss[w.id]=(S.miss[w.id]||0)+1;return}
   let n=ok?st+1:Math.max(0,Math.min(lv(w),st)-1);if(n==2&&!cloze(w))n=ok?3:1;S.learn[w.id]=Math.min(MAX,Math.max(ok?lv(w):0,n));if(!ok)S.miss[w.id]=(S.miss[w.id]||0)+1};
  apply(ok);if(ok)rc++;buzz(ok?10:[30,40,30]);practice(w,ok);play(w);
  const near=!!(r&&r.ok&&!r.exact);
  moodTo($('.mascot'),ok?'happy':'sad',ok?(near?'Gần đúng! Chú ý chính tả nhé.':PRAISE[Math.random()*PRAISE.length|0]):'Chưa đúng, xem lại nhé.');
  $('#fb').innerHTML=`<div class="fb ${ok?(near?'near':'ok'):'bad'}">${I(ok?'circle-check':'circle-x')}<div>${near?'Gần đúng · ':''}${ok?'':'Đáp án: '}<b>${esc(w.w)}</b> ${esc(ipaOf(w))}<br><span style="font-weight:500">${esc(w.vi)}</span></div></div>
  ${r&&r.input&&!r.exact?diffRow(r):''}${ok?'':`<p class="muted"><i>${esc(w.ex)}</i></p>`}${noteHTML(w)}
  <div class="row" style="margin-top:12px">${!ok&&r&&r.input?'<button class="btn sec" id="ovr">Tôi đã đúng</button>':''}<button class="btn" id="nx">Tiếp tục</button></div>`;
  ri++;put();ri--;const go=()=>{ri++;ask()};$('#nx').onclick=go;$('#nx').focus({preventScroll:true});keys=e=>{if(e.key=='Enter'&&!$('#sheet:not(.hidden)')&&document.activeElement.tagName!='TEXTAREA'){e.preventDefault();go()}};
  $('#ovr')&&($('#ovr').onclick=()=>{if(snap[0]==null)delete S.learn[w.id];else S.learn[w.id]=snap[0];if(snap[1]==null)delete S.miss[w.id];else S.miss[w.id]=snap[1];apply(true);rc++;S.known[w.id]=true;save();go()})}
 function roundEnd(){sess(SK,null);confetti();const m=d.filter(w=>lv(w)>=MAX).length;
  const tag=w=>hard?(S.miss[w.id]?['warn','Còn khó']:['success','Đã ổn hơn']):lv(w)>=MAX?['success','Đã thuộc']:lv(w)>=1?['warn',`Bước ${lv(w)+1}/4`]:['danger','Cần ôn'];
  view(hard?'Từ khó':'Học',`<div class="res">${mascot('celebrate','Hoàn thành vòng!')}<p class="muted">Đúng ${rc}/${round.length} câu${hard?'':` · đã thuộc ${m}/${d.length} từ`}</p></div>
  <div class="list">${round.map(w=>{const[t,l]=tag(w);return `<div class="it"><div><b>${esc(w.w)}</b> <span class="muted">${esc(w.vi)}</span></div><span class="tag" style="background:var(--${t}-soft);color:var(--${t})">${l}</span></div>`}).join('')}</div><button class="btn" id="nr" style="margin-top:12px">Vòng tiếp theo</button>`);
  $('#nr').onclick=start;$('#nr').focus();keys=e=>{if(e.key=='Enter')start()}}
 function finished(){if(hard){view('Từ khó',`<div class="res">${mascot('happy','Chưa có từ khó nào.')}<p class="muted">Từ bạn trả lời sai, hay quên khi ôn, hoặc gắn sao sẽ tự vào đây.</p><button class="btn" onclick="location.hash='#/'">Trang chủ</button></div>`);return}
  confetti();view('Học',`<div class="res">${mascot('celebrate',`Bạn đã thuộc cả ${d.length} từ!`)}<p class="muted">Hãy làm bài kiểm tra, hoặc học lại từ đầu.</p>
  <div class="row"><button class="btn sec" id="rs">Học lại từ đầu</button><button class="btn" onclick="location.hash='#/test'">Kiểm tra</button></div></div>`);$('#rs').onclick=()=>{d.forEach(w=>delete S.learn[w.id]);save();start()}}
 {const o=sess(SK);if(o&&o.sig==JSON.stringify(F())&&o.round.length&&o.round.every(byId)&&o.ri<o.round.length){round=o.round.map(byId);ri=o.ri;rc=o.rc;ask()}else start()}}


/* ---------- Speaking ---------- */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const isIOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform=='MacIntel'&&navigator.maxTouchPoints>1);
const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
function lev(a,b){const m=a.length,n=b.length,d=Array.from({length:m+1},(_,i)=>[i]);for(let j=1;j<=n;j++)d[0][j]=j;
 for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]==b[j-1]?0:1));return d[m][n]}
function speechScore(w,alts){const targets=accepts(w);let best=0,heard=alts[0]||'';
 for(const a of alts){const h=norm(a);for(const t of targets){let s;if(h==t||h.split(' ').includes(t)||(t.includes(' ')&&h.includes(t)))s=1;else{const toks=[h,...h.split(' ')];s=Math.max(...toks.map(x=>1-lev(x,t)/Math.max(x.length,t.length,1)))}if(s>best){best=s;heard=a}}}
 return {score:Math.round(best*best*100),heard}}
/* ---------- Speaking: on-device pronunciation trainer (v8) ---------- */
let PRON=null,PRON_UK={};async function loadPron(){if(PRON)return PRON;const get=async u=>{try{const r=await fetch(u);return r.ok?await r.json():{}}catch(e){return {}}};[PRON,PRON_UK]=await Promise.all([get('data/pron.json'),get('data/pron-uk.json')]);return PRON}
/* reference variants: UK voice = British pronunciations (Britfone) first, US (CMUdict) still accepted; US voice = CMUdict */
/* v12: IPA shown follows the selected accent when pronunciation data is loaded (falls back to the dictionary IPA) */
function ipaOf(w){if(LANG.ipaOf)return LANG.ipaOf(w);const v=pronVars(w);if(!v.length||typeof syllables!='function')return w.ipa;const ph=v[0].map(([p,s])=>({p,stress:s}));
 const sy=syllables(ph);return '/'+sy.map(idx=>{const st=sy.length<2?'':idx.some(i=>ph[i].stress===1)?'ˈ':idx.some(i=>ph[i].stress===2)?'ˌ':'';return st+idx.map(i=>phDisp(ph[i].p)).join('')}).join('').replace(/^\/?/,'')+'/'}
function pronVars(w){const us=PRON&&PRON[w.id]||[],uk=S.set.voice=='gb'&&PRON_UK[w.id];return uk?[...uk,...us].slice(0,5):us}
const PDISP={'i':'iː','u':'uː','ɑ':'ɑː','ɔ':'ɔː','ɛ':'e','t͡ʃ':'tʃ','d͡ʒ':'dʒ','ɹ':'r','ɡ':'g'};
const phDisp=p=>S.set.voice=='gb'?({...PDISP,'oʊ':'əʊ','ɚ':'ə'}[p]||p):({...PDISP,'ɚ':'ər'}[p]||p);
const ONSETS=new Set(['pl','pr','tr','kl','kr','bl','br','dr','fl','fr','ɡr','ɡl','sp','st','sk','sm','sn','sw','tw','kw','θr','ʃr','pj','bj','kj','fj','mj','hj','vj','dj','tj','nj','lj','sl','spl','spr','str','skr','skw']);
/* split reference phones into syllables (maximal legal onset) */
function syllables(ph){const v=ph.map((x,i)=>PR.isVowel(x.p)?i:-1).filter(i=>i>=0);if(!v.length)return [ph.map((x,i)=>i)];const cut=[0];
 for(let k=1;k<v.length;k++){const a=v[k-1]+1,b=v[k];let s=b;for(let j=a;j<b;j++){const on=ph.slice(j,b).map(x=>x.p).join('');if(b-j==1||ONSETS.has(on)){s=j;break}}cut.push(s)}
 return cut.map((c,k)=>{const e=k+1<cut.length?cut[k+1]:ph.length;return [...Array(e-c)].map((_,i)=>c+i)})}
const phClass=x=>x.st=='ok'?'g':x.st=='close'?'y':'r';
const phLabel=x=>x.st=='ok'?'tốt':x.st=='close'?`gần đúng, nghe như /${x.heard}/`:x.st=='sub'?`chưa đúng, nghe như /${x.heard}/`:'bị thiếu';
function refRow(w,res){const v=pronVars(w);if(!v.length)return '';const ph=res?res.phones:v[0].map(([p,s])=>({p,stress:s}));const syl=syllables(ph),multi=syl.length>1;
 /* v13: one compact IPA line; each phone is a button; syllables split by thin middots; primary stress = bold + accent colour, secondary = semibold */
 return `<div class="ipal${res?' scored':''}" role="group" aria-label="${res?'Kết quả từng âm':'Phiên âm, chạm vào âm để xem cách phát âm'}" title="${multi?'Âm tiết in đậm màu: trọng âm chính. ':''}Bấm vào một âm để xem cách phát âm"><span class="sl" aria-hidden="true">/</span>${syl.map((idx,k)=>{const st=multi?(idx.some(i=>ph[i].stress===1)?1:idx.some(i=>ph[i].stress===2)?2:0):0;
  return `${k?'<span class="md" aria-hidden="true">·</span>':''}<span class="syl${st==1?' s1':st==2?' s2':''}">${st?`<span class="sr">${st==1?'Trọng âm chính: ':'Trọng âm phụ: '}</span>`:''}${idx.map(i=>{const x=ph[i];return `<button class="ph ${res?phClass(x):''}" data-ph="${esc(x.p)}" title="${res?'/'+esc(phDisp(x.p))+'/: '+esc(phLabel(x))+' · ':''}Xem cách phát âm /${esc(phDisp(x.p))}/" aria-label="Âm /${esc(phDisp(x.p))}/${res?': '+phLabel(x):''}. Xem cách phát âm">${esc(phDisp(x.p))}</button>`}).join('')}</span>`}).join('')}<span class="sl" aria-hidden="true">/</span></div>`}
function openArtic(p){const t=ARTIC.text(p);if(!t)return;const ex=ARTIC.ex(p);sheet(`<h2>Âm /${esc(phDisp(p))}/</h2><div class="artic">${ARTIC.svg(p)}</div><p>${esc(t)}</p>${ex?`<p class="muted">Ví dụ: <b>${esc(ex)}</b></p>`:''}
 <p class="muted" style="font-size:var(--fs-xs)">Hình vẽ mặt cắt miệng nhìn nghiêng: môi bên phải, lưỡi màu hồng.</p><button class="btn" id="acl">Đã hiểu</button>`);$('#acl').onclick=()=>$('#sheet')._close();$('#acl').focus()}
function drawCompare(cv,nat,mine){if(!cv)return;const dpr=devicePixelRatio||1,W=cv.clientWidth||300,H=cv.clientHeight||150;cv.width=W*dpr;cv.height=H*dpr;const g=cv.getContext('2d');g.scale(dpr,dpr);g.clearRect(0,0,W,H);
 const cs=getComputedStyle(document.body),col=v=>cs.getPropertyValue(v).trim();const lanes=[['Mẫu',nat,col('--text-3')],['Bạn',mine,col('--primary')]];const lh=H/2;
 lanes.forEach(([lab,x,c],k)=>{const y0=k*lh;g.fillStyle=col('--text-2');g.font='600 11px system-ui';g.fillText(lab,4,y0+13);if(!x)return;const n=Math.floor(W-40),env=Speech.envelope(x,n),pt=Speech.pitch(x);
  g.fillStyle=c;g.globalAlpha=.35;for(let i=0;i<n;i++){const h=env[i]*(lh-18);g.fillRect(36+i,y0+lh/2+4-h/2,1,Math.max(1,h))}g.globalAlpha=1;
  const ps=pt.filter(v=>v),lo=Math.min(...ps,90),hi=Math.max(...ps,260);g.strokeStyle=c;g.lineWidth=2;g.beginPath();let on=false;
  pt.forEach((v,i)=>{const px=36+i/Math.max(1,pt.length-1)*n;if(!v){on=false;return}const py=y0+lh-6-(v-lo)/(hi-lo+1)*(lh-20);if(on)g.lineTo(px,py);else g.moveTo(px,py);on=true});g.stroke()});
 g.fillStyle=col('--text-3');g.font='10px system-ui';g.fillText('Dải mờ: độ to · đường: cao độ (ngữ điệu)',36,H-2)}
function speak(){if(LANG.speak)return LANG.speak();const d=deck();let q=shuffle(d),i=0,att=0,st='init',rec=null,sr=null,my=null,myUrl=null,nat=null,dead=false,slow=false,modelOK=false;
 const SRok=!!SR&&!(isIOS&&standalone),devOK=Speech.supported();
 const mode=()=>S.set.asr=='browser'?(SRok?'browser':(devOK?'model':'none')):(devOK?'model':(SRok?'browser':'none'));
 const box=()=>$('#sarea');
 function hist(w){const h=S.pron[w.id]||[];if(!h.length)return '';return `<p class="muted hist">Lịch sử: ${h.slice(-6).map(x=>`<span class="hs ${x.s>=85?'g':x.s>=60?'y':'r'}">${x.s}</span>`).join(' ')} · cao nhất ${Math.max(...h.map(x=>x.s))}</p>`}
 async function show(){const w=q[i%q.length];att++;stop();my=null;nat=null;if(myUrl){URL.revokeObjectURL(myUrl);myUrl=null}await loadPron();if(dead)return;
  view('Luyện nói',`${mascot('idle','Nghe mẫu, rồi bấm micro và đọc to.',{small:true,row:true})}
  <div class="card q center" style="margin-top:12px"><div class="kind">Từ ${i%q.length+1} / ${q.length}</div><div class="w" style="margin-top:6px">${esc(w.w)}</div>${refRow(w)||`<div class="ipa" data-ipa="${w.id}">${esc(ipaOf(w))}</div>`}<div class="tags"><span class="tag">${esc(w.pos)}</span><span class="tag lv">${esc(w.lv)}</span></div><p class="muted" style="margin:8px 0 0">${esc(w.vi)}</p>
  <div class="audiobar">${auBtns(w)}</div><div id="sarea" aria-live="polite"></div><div id="shist">${hist(w)}</div></div>
  <div class="row"><button class="btn sec" id="prev" ${i?'':'disabled'}>Từ trước</button><button class="btn" id="next">Từ tiếp theo</button></div>
  <p class="hint">Ví dụ: <i>${esc(w.ex)}</i></p>`);
  $('#next').onclick=()=>{i++;show()};$('#prev').onclick=()=>{i=Math.max(0,i-1);show()};if(S.set.autoplay)play(w);
  const m=mode();if(m=='model'){const s=await Speech.status();if(dead)return;modelOK=s.cached||s.ready;render(modelOK?'ready':'offer')}else render(m=='browser'?'ready':'none')}
 /* one renderer: the status area always shows exactly one state */
 function render(s,data={}){st=s;const w=q[i%q.length],b=box();if(!b)return;const m=mode();
  const micBtn=(lab='Bấm để nói')=>`<button class="mic ${s=='rec'?'rec':''}" id="mic" aria-label="${s=='rec'?'Dừng ghi âm':lab}">${I(s=='rec'?'square':'mic','xl')}</button>`;
  if(s=='offer')b.innerHTML=`<div class="note dl" role="note">${I('download')}<div><b>Chấm phát âm từng âm ngay trên máy</b><br>Tải mô hình nhận dạng âm (71 MB, một lần, nên dùng Wi‑Fi). Giọng của bạn không gửi đi đâu và chấm được cả khi offline.</div></div>
   <div class="row"><button class="btn" id="dlm">${I('download','s')}Tải mô hình</button>${SRok?'<button class="btn sec" id="usebr">Dùng nhận dạng của trình duyệt</button>':''}</div>`;
  else if(s=='dl')b.innerHTML=`<p class="muted" style="margin-top:16px">${data.phase=='init'?'Đang khởi động mô hình…':`Đang tải mô hình… ${data.pct||0}%`}</p><div class="bar" role="progressbar" aria-label="Tải mô hình" aria-valuenow="${data.pct||0}" aria-valuemin="0" aria-valuemax="100"><i style="width:${data.pct||0}%"></i></div>`;
  else if(s=='ready')b.innerHTML=`${micBtn()}<p class="muted">${m=='model'?'Bấm micro, đọc to rồi dừng lại. Máy tự dừng khi bạn ngừng nói.':'Bấm micro và đọc to từ trên.'}</p>${m=='browser'?'<p class="muted" style="font-size:var(--fs-xs)">Đang dùng nhận dạng của trình duyệt: chỉ chấm cả từ, không chấm từng âm.</p>':''}`;
  else if(s=='rec')b.innerHTML=`<div class="recw ${data.perm?'perm':'listen'}" id="recw"><button class="mic rec" id="mic" aria-label="Dừng ghi âm"><span class="ring" aria-hidden="true"></span>${I('square','xl')}</button>
   <canvas class="wave" id="wave" aria-hidden="true"></canvas><div class="tailbar" aria-hidden="true"><i></i></div>
   <p class="rst" id="rst">${data.perm?'Đang mở micro…':'Mời bạn đọc…'}</p><p class="muted">Hãy đọc “${esc(answerText(w).split(/,\s*/)[0])}”</p></div>`;
  else if(s=='busy')b.innerHTML=`<div class="spin" aria-hidden="true"></div><p class="muted">Đang chấm từng âm…</p>`;
  else if(s=='err')b.innerHTML=`${micBtn('Thử lại')}<p class="err-t">${esc(data.msg)}</p>`;
  else if(s=='none')b.innerHTML=`<div class="note" role="note">${I('info')}<div><b>Thiết bị này chưa chấm phát âm được.</b> Bạn vẫn có thể ghi âm và so sánh với giọng chuẩn.</div></div>${micBtn('Ghi âm')}`;
  else if(s=='result')b.innerHTML=resultHTML(w,data);
  wire(w,data)}
 function resultHTML(w,{res,score,heard,kind}){const c=score>=85?'var(--success)':score>=60?'var(--warn)':'var(--danger)',lab=score>=85?'Rất tốt':score>=60?'Khá, còn vài âm cần sửa':score>=40?'Cần luyện thêm':'Chưa giống, nghe mẫu rồi thử lại';
  let h=`<div class="score" style="--p:${score};--c:${c}" role="img" aria-label="Điểm ${score} trên 100"><b>${score}</b></div><p class="sres-l"><b>${lab}</b></p>`;
  if(kind=='model'){const stz=res.stress;h+=refRow(w,res)+`<p class="legend2"><span><span class="lg g"></span> tốt</span> <span><span class="lg y"></span> gần đúng</span> <span><span class="lg r"></span> chưa đúng/thiếu</span> <span>· bấm vào âm để xem cách phát âm</span></p>`;
   h+=`<p class="muted">Máy nghe được: <b class="ipa-h">/${esc(res.heard||'–')}/</b></p>`;
   if(stz)h+=`<p class="stz ${stz.ok?'ok':'bad'}">${I(stz.ok?'circle-check':'info','s')}<span>${stz.ok?'Trọng âm: đúng chỗ':'Trọng âm: có vẻ bạn nhấn sai âm tiết, hãy nhấn mạnh âm tiết có dấu ˈ'} <small class="muted">(ước lượng theo độ to và độ dài)</small></span></p>`;
   const tips=PR.tips(res,w.w);if(tips.length)h+=`<div class="tips">${tips.map(t=>`<div class="tip2">${I('lightbulb','s')}<div>${esc(t.m)}</div>${ARTIC.has(t.p)?`<button class="btn sm sec" data-ph="${esc(t.p)}">Cách đặt lưỡi</button>`:''}</div>`).join('')}</div>`;
   else if(score<85)h+=`<p class="muted">Các âm đều gần đúng; hãy nói rõ và đều hơn.</p>`}
  else if(kind=='browser')h+=`<p>Trình duyệt nghe được: <b>“${esc(heard)}”</b></p><p class="muted" style="font-size:var(--fs-xs)">Chấm theo nhận dạng từ của trình duyệt, không chấm từng âm.</p>`;
  if(my)h+=`<canvas class="cmp" id="cmp" role="img" aria-label="So sánh độ to và cao độ giọng mẫu với giọng bạn"></canvas>
   <div class="row wrap3"><button class="btn sm sec" id="pn">${I('volume-2','s')}Mẫu</button><button class="btn sm sec" id="pm">${I('play','s')}Giọng bạn</button><button class="btn sm sec" id="pb">${I('repeat','s')}Mẫu rồi bạn</button><button class="btn sm sec" id="sl" aria-pressed="${slow}">${I('turtle','s')}Chậm</button></div>`;
  return h+`<button class="btn" id="again" style="margin-top:12px">${I('mic','s')}Thử lại</button>`}
 function wire(w,data){const b=box();if(!b)return;$$('[data-ph]',$('.card.q')||b).forEach(x=>x.onclick=()=>openArtic(x.dataset.ph));
  $('#dlm')&&($('#dlm').onclick=()=>download());$('#usebr')&&($('#usebr').onclick=()=>{S.set.asr='browser';save();render('ready')});
  $('#mic')&&($('#mic').onclick=()=>st=='rec'?(rec&&rec.stop(),sr&&sr.stop()):start(w));$('#again')&&($('#again').onclick=()=>start(w));
  if(st=='result'&&my){const cv=$('#cmp');const go=async()=>{if(!nat){try{nat=await Speech.decodeUrl(aurl(w,'w'))}catch(e){nat=null}}if(!dead&&cv.isConnected)drawCompare(cv,nat,my)};go();
   const rate=()=>slow?0.7:1;const pm=()=>new Promise(ok=>{const a=new Audio(myUrl);a.playbackRate=rate();a.preservesPitch=true;a.onended=ok;a.onerror=ok;audio.pause();a.play().catch(ok)});
   const pn=()=>new Promise(ok=>{play(w,'w',{slow});moodTo($('.mascot'),'speaking');const f=()=>{audio.removeEventListener('ended',f);moodTo($('.mascot'),'idle');ok()};audio.addEventListener('ended',f);setTimeout(f,4000)});
   $('#pn').onclick=pn;$('#pm').onclick=pm;$('#pb').onclick=async()=>{await pn();await pm()};$('#sl').onclick=e=>{slow=!slow;e.currentTarget.setAttribute('aria-pressed',slow);e.currentTarget.classList.toggle('on',slow)}}}
 async function download(){const a=att;render('dl',{pct:0});try{await Speech.load(m=>{if(a!==att||dead)return;render('dl',{pct:m.phase=='init'?100:Math.round(m.got/m.total*100),phase:m.phase})});if(a!==att||dead)return;modelOK=true;toast('Đã tải xong mô hình chấm phát âm','check');render('ready')}
  catch(e){if(a!==att||dead)return;render(SRok?'offer':'none');toast('Không tải được mô hình. Kiểm tra mạng rồi thử lại.','wifi-off',4000)}}
 /* live level: a scrolling bar waveform and a ring that follows the voice, drawn at display rate */
 function meter(a){const hist=new Array(48).fill(0);let cur=0,shown=0,raf=0,on=true;const RMq=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const draw=()=>{raf=0;if(!on||a!==att)return;const cv=$('#wave'),ring=$('#recw .ring');shown+=(cur-shown)*(RMq?1:.35);
   if(ring){ring.style.setProperty('--lv',shown.toFixed(3))}
   if(cv){const dpr=devicePixelRatio||1,W=cv.clientWidth||240,H=cv.clientHeight||44;if(cv.width!==W*dpr){cv.width=W*dpr;cv.height=H*dpr}const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
    const col=getComputedStyle(cv).color,n=hist.length,bw=W/n;g.fillStyle=col;for(let k=0;k<n;k++){const h=Math.max(2,hist[k]*(H-4));const x=k*bw+bw*.2;g.globalAlpha=.35+.65*(k/n);g.beginPath();g.roundRect?g.roundRect(x,(H-h)/2,bw*.6,h,bw*.3):g.rect(x,(H-h)/2,bw*.6,h);g.fill()}g.globalAlpha=1}
   raf=requestAnimationFrame(draw)};
  raf=requestAnimationFrame(draw);
  return {push(v){cur=v;hist.push(v);hist.shift()},stop(){on=false;if(raf)cancelAnimationFrame(raf)}}}
 function stop(){try{rec&&rec.stop()}catch(e){}rec=null;try{sr&&sr.abort()}catch(e){}sr=null}
 function save1(w,score,kind){S.speak[w.id]=Math.max(S.speak[w.id]||0,score);const h=S.pron[w.id]=S.pron[w.id]||[];h.push({t:Date.now(),s:score,k:kind=='model'?'m':'b'});if(h.length>20)h.splice(0,h.length-20);logIt(false);save();$('#shist')&&($('#shist').innerHTML=hist(w))}
 function feel(score){const m=$('.mascot');if(score>=85){moodTo(m,'correct','Chuẩn lắm!');buzz([10,30,10])}else if(score>=60)moodTo(m,'encouraging','Gần được rồi, sửa các âm màu vàng/đỏ nhé.');else{moodTo(m,'wrong','Nghe mẫu chậm rồi thử lại nhé.');buzz([30,40,30])}}
 async function start(w){const a=++att;stop();const m=mode();audio.pause();
  if(m=='model'&&!modelOK)return render('offer');
  if(m=='browser')return startSR(w,a);
  /* the capture context is created inside this tap (Speech.record primes it synchronously) */
  render('rec',{perm:1});const vis=meter(a);let r,heardOnce=false;
  try{rec=await Speech.record({onLevel:(v,rms)=>{if(a!==att)return;vis.push(v);mascotLevel($('.mascot'),v)},
   onState:(k,p)=>{if(a!==att)return;const box=$('#recw'),t=$('#rst');if(!box||!t)return;
    if(k=='tailp'){box.style.setProperty('--tp',p.toFixed(3));return}
    box.className='recw '+k;t.textContent={perm:'Đang mở micro…',listen:'Mời bạn đọc…',quiet:'Không nhận được tiếng từ micro. Hãy nói to hơn, hoặc kiểm tra micro.',voice:'Neko nghe thấy bạn',tail:'Đang chờ bạn nói hết…'}[k]||'';
    if(k=='voice'&&!heardOnce){heardOnce=true;buzz(8);moodTo($('.mascot'),'listening','Neko nghe thấy bạn')}
    if(k=='listen')moodTo($('.mascot'),'listening','Neko đang nghe…')}})}
  catch(e){vis.stop();if(a===att)render('err',{msg:e&&e.name=='NotAllowedError'?'Bạn chưa cho phép dùng micro. Hãy bật quyền micro cho trang này trong cài đặt trình duyệt.':'Không mở được micro. Hãy đóng ứng dụng khác đang dùng micro rồi thử lại.'});return}
  if(a!==att){vis.stop();return rec.stop()}buzz(10);
  r=await rec.done;rec=null;vis.stop();if(a!==att||dead)return;
  const pcm=Speech.trim(Speech.to16k(r.pcm,r.sr));
  if(r.why=='dead'||r.why=='ended'){render('err',{msg:'Không nhận được tiếng từ micro. Hãy thử lại; nếu vẫn vậy, tải lại trang hoặc đóng ứng dụng khác đang dùng micro.'});moodTo($('.mascot'),'confused','Micro không gửi tiếng nào.');return}
  if(!r.speech||pcm.length<16000*0.25||Speech.peak(pcm)<0.02){render('err',{msg:'Chưa nghe thấy giọng nói. Hãy nói to, gần micro hơn rồi thử lại.'});moodTo($('.mascot'),'idle','Mình chưa nghe thấy gì.');return}
  my=pcm;if(myUrl)URL.revokeObjectURL(myUrl);myUrl=URL.createObjectURL(Speech.wav(pcm));
  if(m=='none'){render('result',{score:0,kind:'none'});$('.score')&&$('.score').remove();$('.sres-l')&&($('.sres-l').innerHTML='<b>Đã ghi âm: nghe lại và so sánh với giọng chuẩn</b>');return}
  render('busy');moodTo($('.mascot'),'processing','Đang chấm…');
  try{const res=await Speech.analyze(pcm.slice(),pronVars(w).length?pronVars(w):[[]],S.set.voice=='gb');if(a!==att||dead)return;
   if(res.empty){render('err',{msg:'Không nhận ra âm nào. Hãy nói rõ từng âm và gần micro hơn.'});moodTo($('.mascot'),'idle','Thử lại nhé.');return}
   res.stress=PR.stress(res.phones,pcm,16000,res.frameSec);save1(w,res.score,'model');render('result',{res,score:res.score,kind:'model'});feel(res.score)}
  catch(e){if(a!==att||dead)return;render('err',{msg:'Chấm phát âm bị lỗi trên thiết bị này. Thử lại, hoặc chọn “Trình duyệt” trong Cài đặt.'})}}
 function startSR(w,a){let fin=false;try{sr=new SR()}catch(e){return render('err',{msg:'Không khởi động được nhận dạng giọng nói.'})}
  sr.lang=S.set.voice=='us'?'en-US':'en-GB';sr.interimResults=false;sr.maxAlternatives=5;sr.continuous=false;
  sr.onresult=e=>{if(fin||a!==att)return;fin=true;const alts=[...e.results[0]].map(x=>x.transcript);const {score,heard}=speechScore(w,alts);save1(w,score,'browser');render('result',{score,heard,kind:'browser'});feel(score)};
  sr.onerror=e=>{if(fin||a!==att)return;fin=true;const msg={'not-allowed':'Bạn chưa cho phép dùng micro. Hãy bật quyền micro cho trang này.','service-not-allowed':'Trình duyệt chặn nhận dạng giọng nói.','no-speech':'Chưa nghe thấy gì, thử lại nhé.','network':'Nhận dạng của trình duyệt cần mạng.','audio-capture':'Không tìm thấy micro.','aborted':'Đã dừng.'}[e.error]||'Có lỗi nhận dạng, thử lại nhé.';render('err',{msg})};
  sr.onend=()=>{if(a!==att)return;sr=null;if(!fin){fin=true;render('err',{msg:'Chưa nghe rõ, thử lại nhé.'})}};
  try{sr.start();render('rec');moodTo($('.mascot'),'listening','Neko đang nghe…');buzz(10)}catch(e){fin=true;render('err',{msg:'Không khởi động được micro.'})}}
 show();keys=e=>{if(e.target.tagName=='INPUT'||e.target.tagName=='TEXTAREA')return;if(e.key==' '&&$('#mic')){e.preventDefault();$('#mic').click()}else if(e.key=='ArrowRight')$('#next').click()};
 return ()=>{dead=true;att++;stop();if(myUrl)URL.revokeObjectURL(myUrl)}}

/* ---------- Listening / dictation ---------- */
function listen(fresh){const d=deck();let o=!fresh&&sess('listen');if(!o||o.sig!=JSON.stringify(F())||!o.qs.every(byId))o={sig:JSON.stringify(F()),qs:shuffle(d).slice(0,Math.min(10,d.length)).map(w=>w.id),i:0,sc:0,wrong:[]};
 const N=o.qs.length,qs=o.qs.map(byId);let i=o.i,sc=o.sc;const wrong=o.wrong.map(byId);const put=()=>{o.i=i;o.sc=sc;o.wrong=wrong.map(w=>w.id);sess('listen',o)};
 function ask(){if(i>=N)return end();put();const w=qs[i];const t=answerText(w).split(/,\s*/)[0];
  view('Nghe – chép',`${mascot('listen','Nghe kỹ rồi gõ lại từ bạn nghe được.',{small:true,row:true})}<div class="prog"><div class="bar"><i style="width:${i/N*100}%"></i></div><span>${i+1}/${N}</span></div>
  <div class="card q center"><button class="mic" id="pl" aria-label="Nghe lại">${I('volume-2','xl')}</button>
  <div class="audiobar"><button class="btn sm sec" data-au="${w.id}" data-k="w" data-slow="1">${I('turtle','s')}Chậm</button><button class="btn sm sec" id="hint">${I('lightbulb','s')}Gợi ý</button></div>
  <div class="slots" id="slots" aria-hidden="true"></div><label class="sr" for="ti">Từ bạn nghe được</label><input class="ti" id="ti" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${LANG.listenPrompt||'Gõ từ bạn nghe được'}" enterkeyhint="done" style="margin-top:12px">
  <div class="row" id="tirow"><button class="btn sec" id="dk">Không biết</button><button class="btn" id="ck">Kiểm tra</button></div><div id="fb" aria-live="polite"></div></div>`);
  const pl=$('#pl');pl.onclick=()=>play(w,'w',{btn:pl});setTimeout(()=>play(w,'w',{btn:pl}),250);let hints=0;
  $('#hint').onclick=()=>{hints++;$('#slots').textContent=t.split('').map((c,k)=>c==' '?' ':k<hints?c:'_').join('');buzz(6)};
  const ti=$('#ti');setTimeout(()=>ti.focus(),80);
  const chk=give=>{if(ti.disabled)return;const r=give?{ok:false,input:''}:checkAns(ti.value,accepts(w)),ok=r.ok,near=ok&&!r.exact;ti.disabled=true;ti.classList.add(ok?(near?'near':'ok'):'bad');$('#tirow').remove();if(ok)sc++;else{wrong.push(w);S.miss[w.id]=(S.miss[w.id]||0)+1}practice(w,ok);
   moodTo($('.mascot'),ok?'happy':'sad',ok?(near?'Gần đúng! Chú ý chính tả nhé.':PRAISE[Math.random()*PRAISE.length|0]):'Chưa đúng, nghe lại nhé.');buzz(ok?10:[30,40,30]);
   $('#fb').innerHTML=`<div class="fb ${ok?'ok':'bad'}" style="text-align:left">${I(ok?'circle-check':'circle-x')}<div><b>${esc(w.w)}</b> ${esc(ipaOf(w))}<br><span style="font-weight:500">${esc(w.vi)}</span></div></div>${r.input&&!r.exact?diffRow(r):''}<div class="audiobar">${auBtns(w)}</div><button class="btn" id="nx" style="margin-top:12px">Tiếp tục</button>`;
   i++;put();i--;const go=()=>{i++;ask()};$('#nx').onclick=go;$('#nx').focus({preventScroll:true});keys=e=>{if(e.key=='Enter'){e.preventDefault();go()}}};
  $('#ck').onclick=()=>chk(false);$('#dk').onclick=()=>chk(true);ti.onkeydown=e=>{if(e.key=='Enter')chk(false)};keys=null}
 function end(){sess('listen',null);const p=Math.round(sc/N*100);if(p>=80)confetti();
  view('Nghe – chép',`<div class="res">${mascot(p>=80?'celebrate':p>=50?'happy':'sad',p>=80?'Tai nghe rất tốt!':p>=50?'Khá lắm, luyện thêm nhé.':'Nghe chậm vài lần rồi thử lại nhé.')}<div class="big">${sc}/${N}</div></div>
  ${wrong.length?`<h3>Cần nghe lại</h3><div class="list">${wrong.map(w=>`<div class="it"><div><b>${esc(w.w)}</b> <span class="muted">${esc(ipaOf(w))}</span><br><span class="muted">${esc(w.vi)}</span></div>${auBtns(w,false)}</div>`).join('')}</div>`:''}
  <div class="row"><button class="btn sec" onclick="location.hash='#/'">Trang chủ</button><button class="btn" id="ag">Làm lượt mới</button></div>`);$('#ag').onclick=()=>listen(true)}
 ask()}

/* ---------- Match ---------- */
function match(){const d=deck();if(d.length<3){toast('Cần ít nhất 3 từ','info');return home()}const N=Math.min(6,d.length);
 function intro(){view('Ghép thẻ',`<div class="res">${mascot('idle','Sẵn sàng chưa?')}<p class="muted">Ghép ${N} cặp ${LANG.matchWhat||'từ tiếng Anh'} với nghĩa tiếng Việt nhanh nhất có thể. Ghép sai bị cộng 1 giây.</p>${S.best.match?`<p><span class="streak" style="color:var(--primary);background:var(--primary-soft)">${I('trophy','s')}Kỷ lục ${(S.best.match/1000).toFixed(1)} giây</span></p>`:''}<button class="btn pri" id="go">Bắt đầu</button></div>`);$('#go').onclick=game;$('#go').focus()}
 function game(){const ps=shuffle(d).slice(0,N),tiles=shuffle(ps.flatMap(w=>[{id:w.id,t:w.w,k:'en'},{id:w.id,t:w.vi,k:'vi'}]));let sel=null,left=N,pen=0,raf;const t0=performance.now();
  view('Ghép thẻ',`<div class="timer">${I('zap')}<span id="tm">0.0</span> giây</div><div class="mgrid">${tiles.map((x,i)=>`<button class="tile" data-i="${i}" lang="${x.k}">${esc(x.t)}</button>`).join('')}</div>`);
  const tick=()=>{const e=$('#tm');if(!e)return;e.textContent=((performance.now()-t0)/1000+pen).toFixed(1);raf=requestAnimationFrame(tick)};tick();
  $$('.tile').forEach(b=>b.onclick=()=>{const x=tiles[b.dataset.i];if(!sel){sel=b;b.classList.add('sel');buzz(5);return}if(sel==b){b.classList.remove('sel');sel=null;return}
   const y=tiles[sel.dataset.i];if(x.id==y.id&&x.k!=y.k){b.classList.add('ok');sel.classList.add('ok');buzz(10);play(byId(x.id));evidence(byId(x.id),1,'match');sel=null;if(--left==0){cancelAnimationFrame(raf);finish(performance.now()-t0+pen*1000)}}
   else{const s=sel;[s,b].forEach(z=>{z.classList.remove('sel');z.classList.add('bad')});pen++;buzz([30,40,30]);setTimeout(()=>[s,b].forEach(z=>z.classList.remove('bad')),400);sel=null}})}
 function finish(ms){const rec=!S.best.match||ms<S.best.match;if(rec)S.best.match=Math.round(ms);save();confetti();
  view('Ghép thẻ',`<div class="res">${mascot('celebrate',rec?'Kỷ lục mới!':'Xong rồi, nhanh quá!')}<div class="big">${(ms/1000).toFixed(1)}s</div><p class="muted">${rec?'Bạn vừa lập kỷ lục mới':'Kỷ lục của bạn: '+(S.best.match/1000).toFixed(1)+' giây'}</p><div class="row"><button class="btn sec" onclick="location.hash='#/'">Trang chủ</button><button class="btn" id="pa">Chơi lại</button></div></div>`);$('#pa').onclick=game}
 intro()}

/* ---------- Test ---------- */
function test(){const d=deck();if(d.length<4){toast('Cần ít nhất 4 từ','info');return home()}
 const n=Math.min(20,d.length),qs=shuffle(d).slice(0,n).map((w,i)=>{const t=['type','mc','tf'][i%3],q={w,t};if(t=='mc')q.opts=shuffle([w,...shuffle(d.filter(x=>x.id!=w.id)).slice(0,3)]);if(t=='tf'){q.truth=Math.random()<.5;q.shown=q.truth?w:shuffle(words.filter(x=>x.id!=w.id))[0]}return q});
 view('Kiểm tra',`<p class="muted">${n} câu · gõ từ, trắc nghiệm và đúng/sai</p>`+qs.map((q,i)=>`<div class="card q" style="margin-bottom:12px" data-q="${i}"><div class="kind">Câu ${i+1}/${n} · ${q.t=='type'?(LANG.typePrompt||'Gõ từ tiếng Anh'):q.t=='mc'?'Chọn nghĩa đúng':'Đúng hay sai?'}</div>
  ${q.t=='type'?`<div class="term">${esc(q.w.vi)}</div><input class="ti" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Đáp án câu ${i+1}">`
  :q.t=='mc'?`<div class="term">${esc(q.w.w)}</div><div class="opts" role="radiogroup">${q.opts.map((o,k)=>`<button class="opt" role="radio" aria-checked="false" data-id="${o.id}"><span class="n">${k+1}</span>${esc(o.vi)}</button>`).join('')}</div>`
  :`<div class="term">${esc(q.w.w)} <span class="muted">=</span> ${esc(q.shown.vi)}</div><div class="row" role="radiogroup"><button class="opt" role="radio" aria-checked="false" data-tf="1">${I('check','s')}Đúng</button><button class="opt" role="radio" aria-checked="false" data-tf="0">${I('x','s')}Sai</button></div>`}</div>`).join('')+`<button class="btn pri" id="sub">Nộp bài</button>`);
 $$('[data-q]').forEach(c=>$$('.opt',c).forEach(b=>b.onclick=()=>{$$('.opt',c).forEach(x=>{x.classList.remove('sel');x.setAttribute('aria-checked','false')});b.classList.add('sel');b.setAttribute('aria-checked','true');c.dataset.a=b.dataset.id||b.dataset.tf;buzz(5)}));
 $('#sub').onclick=()=>{let sc=0;const wrong=[];qs.forEach((q,i)=>{const c=$(`[data-q="${i}"]`);const ok=q.t=='type'?checkAns($('.ti',c).value,accepts(q.w)).ok:q.t=='mc'?c.dataset.a==q.w.id:c.dataset.a==(q.truth?'1':'0');if(ok)sc++;else{wrong.push(q.w);S.miss[q.w.id]=(S.miss[q.w.id]||0)+1}practice(q.w,ok)});
  const p=Math.round(sc/n*100);if(p>=80)confetti();
  view('Kết quả',`<div class="res">${mascot(p>=80?'celebrate':p>=50?'happy':'sad',p>=80?'Xuất sắc! Neko tự hào lắm.':p>=50?'Khá lắm, cố thêm chút nữa!':'Không sao, ôn lại rồi thử lại nhé.')}<div class="big">${p}%</div><p class="muted">Đúng ${sc}/${n} câu</p></div>
  ${wrong.length?`<h3>Cần ôn lại (${wrong.length})</h3><div class="list">${wrong.map(w=>`<div class="it"><div><b>${esc(w.w)}</b> <span class="muted">${esc(ipaOf(w))}</span><br><span class="muted">${esc(w.vi)}</span></div><button class="ib" data-au="${w.id}" aria-label="Nghe">${I('volume-2')}</button>${starBtn(w)}</div>`).join('')}</div>`:''}
  <div class="row"><button class="btn sec" onclick="location.hash='#/'">Trang chủ</button><button class="btn" id="rt">Làm bài mới</button></div>`);$('#rt').onclick=test}}

/* ---------- List & stats ---------- */
function list(){const d=deck(),wideQ=matchMedia('not all')/* v15: always the simple mobile list */;let sortK=S.set.lsort||'az',dirS=1;
 view('Danh sách từ',`<div class="ltools"><div class="search">${I('search')}<input type="search" id="sq" placeholder="${LANG.searchPrompt||'Tìm từ hoặc nghĩa'}" aria-label="Tìm kiếm"></div>
 <label class="lsort"><span>Sắp xếp</span><select id="ssort" aria-label="Sắp xếp danh sách">${[['az','A → Z'],['lv','Cấp độ'],['due','Đến hạn sớm'],['state','Trạng thái'],['star','Gắn sao trước']].map(([v,l])=>`<option value="${v}" ${v==sortK?'selected':''}>${l}</option>`).join('')}</select></label></div>
 <div class="chips lf" role="radiogroup" aria-label="Lọc theo trạng thái">${[['','Tất cả'],['new','Mới'],['learning','Đang học'],['review','Đang ôn'],['mastered','Thành thạo'],['leech','Hay quên'],['susp','Tạm ngưng / ẩn']].map(([k,l])=>`<button class="chip" role="radio" data-lf="${k}">${l} <span class="n" data-lfn="${k}"></span></button>`).join('')}</div>
 <p class="muted" id="lc" aria-live="polite"></p><div class="list" id="ls"></div><nav class="row" id="lp" aria-label="Trang danh sách từ"></nav>`);
 let lf=S.set.lf||'';const LG={learning:['learn','relearn'],susp:['susp','buried']},inLf=(w,f=lf)=>!f||(LG[f]||[f]).includes(life(w));
 const paintLf=()=>$$('[data-lf]').forEach(b=>{const on=b.dataset.lf==lf;b.classList.toggle('on',on);b.setAttribute('aria-checked',on);$('[data-lfn]',b).textContent=d.filter(w=>inLf(w,b.dataset.lf)).length});
 $$('[data-lf]').forEach(b=>b.onclick=()=>{lf=b.dataset.lf;S.set.lf=lf;save();paintLf();r()});
 const LV={A1:1,A2:2,B1:3,B2:4,C1:5,C2:6,...(LANG.lvOrder||{})},stOf=w=>{const k=life(w);return [LIFE[k][1],LIFE[k][0],k]},
  dueOf=w=>{const c=S.srs[w.id];return c&&c.state!='new'&&!c.susp?c.due:Infinity},
  dueTxt=w=>{const t=dueOf(w);if(t==Infinity)return '–';return t<=Date.now()?'Đến hạn':whenText(t)};
 const cmp={az:(a,b)=>a.w.localeCompare(b.w),lv:(a,b)=>(LV[a.lv]||LV[a.lv.slice(0,2)]||9)-(LV[b.lv]||LV[b.lv.slice(0,2)]||9)||a.w.localeCompare(b.w),due:(a,b)=>dueOf(a)-dueOf(b)||a.w.localeCompare(b.w),state:(a,b)=>stOf(a)[0]-stOf(b)[0]||a.w.localeCompare(b.w),star:(a,b)=>(!!S.star[b.id]-!!S.star[a.id])||a.w.localeCompare(b.w)};
 const acts=w=>`${susp(w)?`<button class="ib" data-unsus="${w.id}" aria-label="Mở lại thẻ ${esc(w.w)}">${I('rotate-ccw')}</button>`:''}<button class="ib" data-au="${w.id}" aria-label="Nghe ${esc(w.w)}">${I('volume-2')}</button>${starBtn(w)}`;
 const TH=[['az','Từ'],[null,'Phiên âm'],[null,'Nghĩa'],['lv','Cấp'],['state','Trạng thái'],['due','Ôn tiếp']];
 let page=0,lastQuery='',lastFilter=lf,lastSort=sortK;const pageSize=100;
 const r=()=>{const q=norm($('#sq').value);let xs=d.filter(w=>inLf(w)&&(!q||norm(w.w).includes(q)||norm(w.vi).includes(q)||(LANG.search&&LANG.search(w,$('#sq').value)))).sort((a,b)=>cmp[sortK](a,b)*dirS);
  if(q!==lastQuery||lf!==lastFilter||sortK!==lastSort)page=0;lastQuery=q;lastFilter=lf;lastSort=sortK;
  const total=xs.length,pages=Math.ceil(total/pageSize);page=Math.max(0,Math.min(page,pages-1));
  $('#lc').textContent=total+' từ'+(total?' · '+(page*pageSize+1)+'–'+Math.min(total,(page+1)*pageSize):'');
  $('#lp').innerHTML=pages>1?`<button class="btn sec" data-page="-1" ${page===0?'disabled':''}>Trang trước</button><span>Trang ${page+1}/${pages}</span><button class="btn sec" data-page="1" ${page===pages-1?'disabled':''}>Trang sau</button>`:'';
  xs=xs.slice(page*pageSize,(page+1)*pageSize);
  if(!xs.length){$('#ls').innerHTML=mascot('meditate','Không tìm thấy từ nào.');return}
  if(wideQ.matches){$('#ls').innerHTML=`<table class="wtab"><caption class="sr">Danh sách từ, ${xs.length} từ</caption><thead><tr>${TH.map(([k,l])=>k?`<th scope="col" aria-sort="${k==sortK?(dirS>0?'ascending':'descending'):'none'}"><button class="thb" data-sk="${k}">${l}${k==sortK?`<span class="sarr" aria-hidden="true">${dirS>0?'↑':'↓'}</span>`:''}</button></th>`:`<th scope="col">${l}</th>`).join('')}<th scope="col"><span class="sr">Thao tác</span></th></tr></thead>
   <tbody>${xs.map(w=>{const st=stOf(w);return `<tr><th scope="row"><b>${esc(w.w)}</b></th><td class="ipa-c">${esc(ipaOf(w))}</td><td>${esc(w.vi)}</td><td><span class="tag lv">${esc(w.lv)}</span></td><td><span class="stt s${st[0]}">${st[1]}</span></td><td class="muted">${dueTxt(w)}</td><td class="acts">${acts(w)}</td></tr>`}).join('')}</tbody></table>`;return}
  $('#ls').innerHTML=xs.map(w=>`<div class="it"><button class="wopen" data-w="${w.id}" aria-label="Chi tiết và lịch sử của ${esc(w.w)}"><b>${esc(w.w)}</b> <span class="muted">${esc(ipaOf(w))}</span> <span class="tag lv">${esc(w.lv)}</span> ${lifeTag(life(w))}<br><span class="muted">${esc(w.vi)}</span></button>${acts(w)}</div>`).join('')};
 $('#lp').onclick=e=>{const b=e.target.closest('[data-page]');if(!b)return;page+=Number(b.dataset.page);r();$('#sq').focus()};
 let t;$('#sq').oninput=()=>{clearTimeout(t);t=setTimeout(r,120)};$('#ssort').onchange=e=>{sortK=e.target.value;dirS=1;S.set.lsort=sortK;save();r()};
 $('#ls').onclick=e=>{const h=e.target.closest('[data-sk]');if(h){if(h.dataset.sk==sortK)dirS=-dirS;else{sortK=h.dataset.sk;dirS=1}$('#ssort').value=sortK;r();$(`[data-sk="${sortK}"]`)?.focus();return}
  const wo=e.target.closest('[data-w]');if(wo){openWord(wo.dataset.w,()=>{paintLf();r()});return}
  const b=e.target.closest('[data-unsus]');if(!b)return;for(const k of [b.dataset.unsus,b.dataset.unsus+'~r'])if(S.srs[k])delete S.srs[k].susp;save();toast('Đã mở lại thẻ','rotate-ccw');r()};
 const mq=()=>r();wideQ.addEventListener('change',mq);paintLf();r();return ()=>wideQ.removeEventListener('change',mq)}
const susp=w=>[w.id,w.id+'~r'].some(k=>S.srs[k]&&S.srs[k].susp);
/* v16 unified word lifecycle (docs/LIFECYCLE.md). The word state is derived from its English->Vietnamese card (the main card);
   flags (suspended, leech, buried) win over the scheduling state. Mastered = Review with FSRS stability >= 21 days (SM-2: interval >= 21). */
const MASTER_S=21;
const LIFE={new:['Mới',0],learn:['Đang học',1],relearn:['Học lại',2],review:['Đang ôn',3],mastered:['Thành thạo',4],leech:['Hay quên',5],buried:['Tạm ẩn hôm nay',6],susp:['Tạm ngưng',7]};
function life(w){const c=S.srs[w.id];if(susp(w))return 'susp';if([w.id,w.id+'~r'].some(k=>S.srs[k]&&S.srs[k].leech))return 'leech';if(bury().w[w.id]=='*')return 'buried';
 if(!c||c.state=='new')return 'new';if(c.state=='learn')return 'learn';if(c.state=='relearn')return 'relearn';return ((c.s>0?c.s:c.int)||0)>=MASTER_S?'mastered':'review'}
const lifeTag=k=>`<span class="stt life-${k}">${LIFE[k][0]}</span>`;
const EVN={f:'Thẻ ghi nhớ (tự do)',l:'Học',d:'Nghe – chép',t:'Kiểm tra',m:'Ghép thẻ',s:'Luyện nói',w:'Viết chữ',p:'Luyện tập'},RN=['','Lại','Khó','Được','Dễ'];
function openWord(id,onChange){const w=byId(id);if(!w)return;const now=Date.now();
 const draw=()=>{const k=life(w),c=S.srs[w.id],R=c?SRS.retrievability(SRS.migrate(c),now):null;
  const hist=[...(S.revlog||[]).filter(r=>r[1]==w.id||r[1]==w.id+'~r').map(r=>({t:r[0],txt:`Ôn theo lịch${r[1].endsWith('~r')?' (Việt → Anh)':''}: ${RN[r[2]]}${r[4]?' · '+r[4]+' ngày':''}`,ok:r[2]>1})),
   ...(S.ev[w.id]||[]).map(e=>({t:e[0],txt:`${EVN[e[1]]||'Luyện tập'}: ${e[2]?'đúng':'sai'}${e[3]=='fwd'?' · đưa lên ôn sớm':''}`,ok:!!e[2]}))].sort((a,b)=>b.t-a.t).slice(0,25);
  const row=(l,v)=>`<div><span class="muted">${l}</span><b>${v}</b></div>`;
  return `<h2>${esc(w.w)} ${lifeTag(k)}</h2><p class="muted">${esc(ipaOf(w))} · ${esc(w.vi)}</p>${LANG.wordExtra?LANG.wordExtra(w):''}
  <div class="wstat">${row('Lần ôn',c?c.reps||0:0)}${row('Lần quên',c?c.lapses||0:0)}${row('Ôn tiếp',!c||c.state=='new'?'Chưa lên lịch':c.susp?'–':c.due<=now?'Đến hạn':whenText(c.due,now))}${row('Khả năng nhớ',R==null?'–':Math.round(R*100)+'%')}${row('Độ bền trí nhớ',c&&c.s>0?SRS.label({days:Math.max(1,Math.round(c.s))}):'–')}${row('Độ khó',c&&c.d>0?(c.d).toFixed(1)+' / 10':'–')}</div>
  <h3 class="eyebrow">Lịch sử</h3>${hist.length?`<ol class="whist">${hist.map(h=>`<li class="${h.ok?'ok':'bad'}"><time>${new Date(h.t).toLocaleString('vi-VN',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'})}</time>${esc(h.txt)}</li>`).join('')}</ol>`:'<p class="muted">Chưa có lượt học nào.</p>'}
  <div class="wact">${k=='susp'||k=='leech'?`<button class="btn sec" data-wa="unsus">${I('play','s')}Mở lại</button>`:`<button class="btn sec" data-wa="sus">${I('pause','s')}Tạm ngưng</button>`}
  ${k=='buried'?`<button class="btn sec" data-wa="unbury">${I('rotate-ccw','s')}Bỏ tạm ẩn</button>`:`<button class="btn sec" data-wa="bury">${I('calendar-clock','s')}Ẩn đến mai</button>`}
  <button class="btn sec danger" data-wa="reset">${I('trash-2','s')}Học lại từ đầu</button></div>`};
 const {sh,close}=sheet(`<div id="wsh">${draw()}</div>`);
 const bindA=()=>$$('[data-wa]',sh).forEach(b=>b.onclick=()=>{const a=b.dataset.wa,ks=[w.id,w.id+'~r'];
  if(a=='sus'){for(const k of ks){S.srs[k]=S.srs[k]?SRS.migrate(S.srs[k]):SRS.fresh();S.srs[k].susp=true}toast('Đã tạm ngưng: từ này không xuất hiện trong lịch ôn','pause')}
  if(a=='unsus'){for(const k of ks)if(S.srs[k]){delete S.srs[k].susp;delete S.srs[k].leech}toast('Đã mở lại','play')}
  if(a=='bury'){bury().w[w.id]='*';toast('Đã ẩn đến ngày mai (4 giờ sáng)','calendar-clock')}
  if(a=='unbury'){delete bury().w[w.id]}
  if(a=='reset'){if(!b.dataset.sure){b.dataset.sure=1;b.lastChild.textContent='Chạm lần nữa để xác nhận';return}for(const k of ks)delete S.srs[k];delete S.learn[w.id];delete S.miss[w.id];toast('Đã đặt lại: từ này trở thành từ mới','trash-2')}
  save();$('#wsh',sh).innerHTML=draw();bindA();onChange&&onChange()});bindA()}
function stats(){const d=deck(),now=Date.now(),cards=allCards(d);let nw=0,lr=0,yg=0,mt=0,su=0;const fc=Array(30).fill(0);
 for(const x of cards){const c=S.srs[x.cid];if(!c||c.state=='new'){nw++;continue}if(c.susp){su++;continue}if(c.state!='review')lr++;else if(((c.s>0?c.s:c.int)||0)>=MASTER_S)mt++;else yg++;
  const t=Math.max(0,SRS.dayIndex(c.due,now));if(t<30)fc[t]++}
 const days=[...Array(84)].map((_,i)=>ymd(new Date(now-(83-i)*DAY))),mx=Math.max(1,...days.map(x=>(S.log[x]||{}).rev||0));
 const last30=days.slice(-30).map(x=>S.log[x]||{}),rv=last30.reduce((a,l)=>a+(l.rv||0),0),ps=last30.reduce((a,l)=>a+(l.pass||0),0);
 const Rs=cards.map(x=>S.srs[x.cid]).filter(c=>c&&c.state=='review'&&!c.susp).map(c=>SRS.retrievability(c,now)),avgR=Rs.length?Rs.reduce((a,b)=>a+b,0)/Rs.length:null;
 const sp=d.filter(w=>(S.pron[w.id]||[]).length),fm=Math.max(1,...fc),tot=cards.length;
 const seg=[['Mới',nw,'var(--primary)'],['Đang học',lr,'var(--danger)'],['Đang ôn',yg,'color-mix(in srgb,var(--success) 45%,var(--surface-2))'],['Thành thạo (độ bền ≥21 ngày)',mt,'var(--success)'],['Tạm ngưng',su,'var(--text-3)']];
 view('Thống kê',`<div class="stat"><div><b>${rv?Math.round(ps/rv*100)+'%':'–'}</b><span class="muted">tỉ lệ nhớ đúng khi ôn (30 ngày, ${rv} lượt)</span></div><div><b>${avgR==null?'–':Math.round(avgR*100)+'%'}</b><span class="muted">khả năng nhớ trung bình hiện tại</span></div><div><b>${fc[0]}</b><span class="muted">thẻ đến hạn hôm nay</span></div><div><b>${sp.length}</b><span class="muted">từ đã luyện nói</span></div></div>
 <div class="sgrid"><section class="sb"><h2 class="eyebrow">Trạng thái thẻ (${tot} thẻ${S.set.rev?', hai chiều':''})</h2><div class="card"><div class="stack" role="img" aria-label="${seg.map(x=>x[0]+' '+x[1]).join(', ')}">${seg.map(x=>x[1]?`<i style="flex:${x[1]};background:${x[2]}"></i>`:'').join('')}</div>
 <div class="legend">${seg.map(x=>`<span><i style="background:${x[2]}"></i>${x[0]} <b>${x[1]}</b></span>`).join('')}</div></div></section>
 <section class="sb"><h2 class="eyebrow">Dự báo 30 ngày tới</h2><div class="card"><div class="fcast" role="img" aria-label="Số thẻ đến hạn mỗi ngày trong 30 ngày tới">${fc.map((v,i)=>`<i style="height:${Math.max(2,v/fm*80)}px" title="${i==0?'Hôm nay':'+'+i+' ngày'}: ${v}"></i>`).join('')}</div><div class="fx"><span>Hôm nay</span><span>+15</span><span>+29</span></div></div></section>
 <section class="sb full"><h2 class="eyebrow">Lượt ôn 12 tuần qua</h2><div class="card"><div class="heat" role="img" aria-label="Bản đồ nhiệt số lượt học mỗi ngày">${days.map(x=>{const v=(S.log[x]||{}).rev||0;return `<i data-l="${v?Math.min(4,Math.ceil(v/mx*4)):0}" title="${x}: ${v} lượt"></i>`}).join('')}</div></div></section></div>`)}

/* ---------- backup ---------- */
function exportProgress(){const data=JSON.stringify({app:LANG.app||'hoc-tu-vung',schema:SCHEMA,exported:new Date().toISOString(),data:S},null,1);
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.download=`${LANG.app||'hoc-tu-vung'}-tien-do-${today()}.json`;document.body.appendChild(a);a.click();
 setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);S.lastExport=Date.now();save();toast('Đã xuất tệp sao lưu','download')}
async function importProgress(file,close){try{if(file.size>5e6)throw new Error('size');const j=JSON.parse(await file.text());const d=j&&j.app==(LANG.app||'hoc-tu-vung')&&j.data?j.data:(LANG.importAny?LANG.importAny(j):j);
  if(!d||typeof d!='object'||!(d.srs||d.known||d.user))throw new Error('format');if((+d.v||2)>SCHEMA){toast('Tệp sao lưu từ phiên bản mới hơn. Hãy tải lại ứng dụng.','info',4000);return}
  const n=Object.keys(d.srs||{}).length;if(!confirm(`Thay tiến độ hiện tại bằng tệp sao lưu (${n} từ đã học)? Tiến độ hiện tại sẽ được lưu dự phòng.`))return;
  lsSet(KEY+'-preimport',JSON.stringify(S));const m=migrate(structuredClone(d));for(const k of Object.keys(S))delete S[k];Object.assign(S,m);save();FC=null;applyTheme();updVoice();toast('Đã nhập tiến độ','check');close&&close();route()}
 catch(e){toast('Tệp không hợp lệ, không thay đổi gì','info',3000)}}

/* ---------- router & boot ---------- */
const R={'':home,cards,review,cram:()=>review(true),learn:()=>learn(),hard:()=>learn('hard'),speak,listen,match,test,list,stats,...(LANG.routes||{})};let cleanup=null;
function route(){keys=null;audio.pause();if(cleanup){try{cleanup()}catch(e){}cleanup=null}$('#back').onclick=()=>{location.hash='#/'};
 if(!words.length)return;if(!S.user||!S.user.done)return onboarding(0);const k=location.hash.replace(/^#\/?/,'').split('?')[0];const r=(R[k]||home)();if(typeof r=='function')cleanup=r;document.body.classList.toggle('home-v',!k)}
addEventListener('hashchange',route);
/* v15: keyboard shortcuts per mode, shown in a '?' sheet (desktop) instead of a side panel */
const KEYS={cards:[['Phím cách','Lật thẻ'],['→','Đã biết'],['←','Đang học'],['Z','Hoàn tác']],review:[['Phím cách','Hiện đáp án, rồi chọn Được'],['1','Lại'],['2','Khó'],['3','Được'],['4','Dễ'],['Z','Hoàn tác']],cram:[['Phím cách','Hiện đáp án, rồi Được'],['1–4','Chấm điểm']],
 learn:[['1–4','Chọn đáp án'],['Enter','Kiểm tra / tiếp']],test:[['1–4','Chọn đáp án'],['Enter','Kiểm tra / tiếp']],listen:[['Enter','Kiểm tra'],['Ctrl + Space','Nghe lại']],speak:[['Space','Nghe mẫu']],'':[['Tab','Di chuyển giữa các mục'],['Enter','Mở chế độ']],...(LANG.keys||{})};
function openKeys(){const k=location.hash.replace(/^#\/?/,'').split('?')[0];const ks=KEYS[k]||[];
 sheet(`<h2>Phím tắt</h2>${ks.length?`<dl class="kgrid">${ks.map(([a,b])=>`<div><dt><kbd>${a}</kbd></dt><dd>${b}</dd></div>`).join('')}</dl>`:'<p class="muted">Màn hình này không có phím tắt riêng.</p>'}<dl class="kgrid"><div><dt><kbd>?</kbd></dt><dd>Mở bảng phím tắt</dd></div><div><dt><kbd>Esc</kbd></dt><dd>Đóng bảng</dd></div></dl>`)}
document.addEventListener('keydown',e=>{if(e.key=='?'&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&$('#sheet').classList.contains('hidden')){e.preventDefault();openKeys()}});

const MCOL=NK_COLORS;
function applyTheme(){const dark=S.set.theme=='dark'||(S.set.theme=='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.body.classList.toggle('dark',dark);document.body.classList.toggle('mdrag',S.set.mdrag!==false);
 const mc=MCOL[S.set.mcolor]||MCOL.cocoa;document.body.style.setProperty('--mk-body',dark?mc.d:mc.l);$('meta[name=theme-color]').content=dark?'#121214':'#F6F5F2';if(LANG.onTheme)LANG.onTheme(dark)}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',applyTheme);
applyTheme();
const updVoice=()=>{if(LANG.chip)return LANG.chip.paint();$('#voice').textContent=S.set.voice=='us'?'US':'UK';$('#voice').setAttribute('aria-label',(S.set.voice=='us'?'US':'UK')+', giọng '+(S.set.voice=='us'?'Mỹ':'Anh')+'. Bấm để đổi')};updVoice();
$('#voice').onclick=()=>{if(LANG.chip)return LANG.chip.click();S.set.voice=S.set.voice=='gb'?'us':'gb';save();updVoice();toast(S.set.voice=='gb'?'Giọng Anh (UK)':'Giọng Mỹ (US)','languages');buzz(8);if(/^#\/(speak|cards)/.test(location.hash))route();else $$('.ipa[data-ipa]').forEach(x=>{const w=byId(x.dataset.ipa);if(w)x.textContent=ipaOf(w)})};
$('#settings').onclick=openSettings;$('#keysb')&&($('#keysb').onclick=openKeys);
addEventListener('offline',()=>toast('Đang offline: vẫn học được, âm thanh đã nghe sẽ có sẵn','wifi-off'));addEventListener('online',()=>toast('Đã có mạng trở lại','check'));
if('serviceWorker' in navigator){let reloading=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading||!window._wantReload)return;reloading=true;location.reload()});
 const offer=w=>{toast('Có bản mới','sparkles',0,{label:'Tải lại',run:()=>{window._wantReload=true;w.postMessage('skip')}})};
 navigator.serviceWorker.register('sw.js').then(r=>{if(r.waiting&&navigator.serviceWorker.controller)offer(r.waiting);
  r.addEventListener('updatefound',()=>{const n=r.installing;n&&n.addEventListener('statechange',()=>{if(n.state=='installed'&&navigator.serviceWorker.controller)offer(n)})});
  setInterval(()=>r.update().catch(()=>{}),36e5);document.addEventListener('visibilitychange',()=>{if(document.visibilityState=='visible')r.update().catch(()=>{})})}).catch(()=>{})}
function boot(){app.innerHTML=`<div class="sk" style="height:150px;margin:12px 0"></div><div class="sk" style="height:170px;margin-bottom:12px"></div><div class="modes"><div class="sk" style="height:112px"></div><div class="sk" style="height:112px"></div><div class="sk" style="height:112px"></div><div class="sk" style="height:112px"></div></div>`;
 loadData().then(()=>LANG.boot?LANG.boot():loadPron()).then(route).catch(e=>{console.warn(e);view('',`${mascot('sad','Không tải được dữ liệu.')}<p class="muted center">Kiểm tra kết nối mạng rồi thử lại.</p><button class="btn" id="retry">${I('refresh-cw','s')}Thử lại</button>`,false);$('#retry').onclick=boot})}
boot();
/* v17: expose the sticky header height so the flashcard mode switch can stick right under it (iOS safe-area aware) */
{const h=document.querySelector('header');if(h){const set=()=>document.documentElement.style.setProperty('--hh',h.getBoundingClientRect().height+'px');set();try{new ResizeObserver(set).observe(h)}catch(e){addEventListener('resize',set)}}}
