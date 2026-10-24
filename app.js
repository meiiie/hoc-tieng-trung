/* Học Tiếng Trung – HSK 3.0. Static PWA; progress in localStorage (versioned, migrated, backed up). */
'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const I=(n,c='')=>`<svg class="i ${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const LS={getItem:k=>{try{return localStorage.getItem(k)}catch(e){return null}},setItem:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){toast('Không lưu được: bộ nhớ đầy hoặc chế độ riêng tư.')}}};
let D=CORE.load(LS);if(!D.created){D.created=Date.now()}const save=()=>CORE.save(LS,D);save();
const app=$('#app'),title=$('#title'),back=$('#back');
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2600)};
const buzz=p=>{try{if(D.set.haptics&&navigator.vibrate)navigator.vibrate(p)}catch(e){}};
/* ---------- data ---------- */
let META=null;const WORDS={};const byId={};let CHARS=null;
async function getJSON(u){const r=await fetch(u);if(!r.ok)throw new Error(u+' '+r.status);return r.json()}
async function loadLevel(L){if(WORDS[L])return WORDS[L];const a=await getJSON(`data/hsk${L}.json`);a.forEach((w,i)=>{w.L=L;w.i=i;byId[w.id]=w});return WORDS[L]=a}
async function ensureLevels(){const need=CORE.LEVELS.filter(L=>D.unlocked[L]||D.unlocked[L-1]);await Promise.all(need.map(loadLevel))}
const allWords=()=>CORE.LEVELS.flatMap(L=>WORDS[L]||[]);
const chars=async()=>CHARS||(CHARS=await getJSON('data/chars.json'));
const hz=w=>D.set.script=='t'?w.t:w.s;
const other=w=>D.set.script=='t'?w.s:w.t;
const TONEC=['','t1','t2','t3','t4','t5'];
function pinyinHTML(w){const p=w.p.split(/\s+/),n=w.n.split(/\s+/);return p.map((s,i)=>{const m=/([1-5])$/.exec(n[i]||'');return`<span class="${TONEC[m?+m[1]:5]}">${esc(s)}</span>`}).join(' ')}
const meaning=w=>w.v?esc(w.v):esc(w.m.join('; '));
const meaningSub=w=>w.v?`<span class="muted en">${esc(w.m.join('; '))}</span>`:'<span class="muted en">Nghĩa tiếng Anh (CC-CEDICT). Bản dịch tiếng Việt hiện có cho HSK 1–3.</span>';
/* ---------- speech (Web Speech API) ---------- */
let VOICE=null;function pickVoice(){const v=speechSynthesis.getVoices();VOICE=v.find(x=>/^zh[-_]CN/i.test(x.lang))||v.find(x=>/^zh/i.test(x.lang))||null}
if('speechSynthesis'in window){pickVoice();speechSynthesis.onvoiceschanged=pickVoice}
function say(text,rate=D.set.rate){if(!('speechSynthesis'in window)){toast('Trình duyệt không hỗ trợ đọc.');return}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';if(VOICE)u.voice=VOICE;u.rate=rate;speechSynthesis.speak(u);
 if(!VOICE&&!say.warned){say.warned=1;setTimeout(()=>{if(!VOICE)toast('Chưa thấy giọng tiếng Trung. Trên iPhone: Cài đặt > Trợ năng > Nội dung được đọc > Giọng nói > Tiếng Trung.')},800)}}
/* ---------- navigation ---------- */
let screen='home',cleanup=null;
function go(s,arg){if(cleanup){cleanup();cleanup=null}screen=s;window.scrollTo(0,0);back.classList.toggle('hidden',s=='home');(SCREENS[s]||SCREENS.home)(arg);app.focus({preventScroll:true})}
back.onclick=()=>go('home');
document.addEventListener('click',e=>{const a=e.target.closest('[data-say]');if(a){e.stopPropagation();say(a.dataset.say,a.dataset.slow?0.5:undefined)}});
/* ---------- swipe (pointer events; tap vs horizontal swipe vs vertical scroll) ---------- */
function swipeable(el,{onTap,onLeft,onRight,enabled=()=>true}){let x0,y0,st='idle',pid;
 el.addEventListener('pointerdown',e=>{if(e.pointerType=='mouse'&&e.button!==0)return;if(e.target.closest('button'))return;x0=e.clientX;y0=e.clientY;st='pending';pid=e.pointerId});
 el.addEventListener('pointermove',e=>{if(st=='idle'||e.pointerId!==pid)return;const dx=e.clientX-x0,dy=e.clientY-y0;
  if(st=='pending'&&Math.hypot(dx,dy)>10){if(enabled()&&Math.abs(dx)>Math.abs(dy)*1.2){st='swipe';el.classList.add('dragging');try{el.setPointerCapture(pid)}catch(_){}}else{st='scroll';return}}
  if(st=='swipe'){el.style.transform=`translateX(${dx}px) rotate(${dx/30}deg)`;el.dataset.dir=dx>40?'r':dx<-40?'l':''}});
 const end=e=>{if(e.pointerId!==pid)return;const dx=e.clientX-x0;el.classList.remove('dragging');el.style.transform='';delete el.dataset.dir;
  if(st=='pending'&&e.type=='pointerup'){onTap&&onTap()}else if(st=='swipe'){window._swT=performance.now();if(dx>90)onRight&&onRight();else if(dx<-90)onLeft&&onLeft()}st='idle'};
 el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end)}
addEventListener('click',e=>{if(window._swT!=null&&performance.now()-window._swT<400){e.stopPropagation();e.preventDefault()}},true);
/* ---------- home ---------- */
function streak(){let n=0;const d=new Date(SRS.dayStart(Date.now()));if(!D.log[CORE.dayKey(d.getTime())])d.setDate(d.getDate()-1);
 while(D.log[CORE.dayKey(d.getTime()+3600e3)]){n++;d.setDate(d.getDate()-1)}return n}
function counts(now=Date.now()){const q=CORE.queue(D,allWords(),now);return{due:q.rev.length+q.learn.filter(w=>D.srs[w.id].due<=now).length,learn:q.learn.length,rev:q.rev.length,fresh:q.fresh.length}}
const SCREENS={};
SCREENS.home=()=>{title.textContent='Học Tiếng Trung';const now=Date.now(),opened=CORE.applyUnlocks(D,allWords(),now);if(opened.length){save();toast('Đã mở khoá '+opened.map(l=>META.levels[l].name).join(', '));ensureLevels().then(()=>screen=='home'&&go('home'))}
 const c=counts(now),total=c.rev+c.learn+c.fresh,today=D.log[CORE.dayKey(now)]||{rev:0,new:0};
 const lv=CORE.LEVELS.map(L=>{const m=META.levels[L],open=!!D.unlocked[L];let s={n:m.count,grad:0,mastered:0,seen:0,ratio:0};if(WORDS[L])s=CORE.levelStats(D,WORDS[L],L,now);
  const prev=L>1&&WORDS[L-1]?CORE.levelStats(D,WORDS[L-1],L-1,now):null;const pct=Math.round(s.ratio*100);
  const hint=open?`${s.grad}/${s.n} đã thuộc bước đầu · ${s.mastered} thành thạo`:prev&&D.unlocked[L-1]?`Mở khi ${META.levels[L-1].name} đạt 80% (hiện ${Math.round(prev.ratio*100)}%)`:`Mở sau ${META.levels[L-1].name}`;
  return`<li class="lv ${open?'':'locked'}"><div class="lvh"><span class="lvn">${esc(m.name)}</span><span class="muted sm">${m.count} từ</span>${open?'':I('lock','s muted')}</div><div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Tiến độ ${esc(m.name)}"><i style="width:${pct}%"></i></div><p class="muted sm">${hint}</p></li>`}).join('');
 app.innerHTML=`<section class="card today"><div><span class="lab">Hôm nay</span><b>${today.rev}</b> lượt ôn · <b>${today.new}</b> từ mới</div><div class="streak">${I('flame','s')} ${streak()} ngày liên tiếp</div></section>
 <button class="primary big" id="goRev">${I('calendar-check')}<span><b>Ôn theo lịch</b><small>${total?`${c.fresh} mới · ${c.learn} đang học · ${c.rev} cần ôn`:'Đã xong cho hôm nay'}</small></span>${total?`<em>${total}</em>`:''}</button>
 <div class="grid">${[['cards','layers','Thẻ ghi nhớ','Xem nhanh, không đổi lịch ôn'],['speak','mic','Luyện nói','Nghe mẫu, thu âm, xem thanh điệu'],['write','pen-line','Viết chữ','Thứ tự nét, bộ thủ'],['list','list','Danh sách từ','Tìm, lọc theo trạng thái']].map(([k,i,t,d])=>`<button class="mode" data-go="${k}">${I(i)}<b>${t}</b><small>${d}</small></button>`).join('')}</div>
 <h2>Cấp độ HSK 3.0</h2><ul class="levels">${lv}</ul>
 <p class="foot muted sm">Danh sách từ: HSK 3.0 (GF0025-2021) qua complete-hsk-vocabulary (MIT), nghĩa CC-CEDICT (CC BY-SA 4.0). Nét chữ: Make Me a Hanzi / hanzi-writer-data (Arphic Public License). <a href="#" id="about">Chi tiết</a></p>`;
 $('#goRev').onclick=()=>go('review');$$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));$('#about').onclick=e=>{e.preventDefault();aboutSheet()}};
/* ---------- Ôn theo lịch (the ONLY screen that calls CORE.rate) ---------- */
SCREENS.review=()=>{title.textContent='Ôn theo lịch';let cur=null,shown=false,undo=null;
 const draw=()=>{const now=Date.now(),q=CORE.queue(D,allWords(),now);cur=CORE.nextCard(q,D,now);shown=false;
  if(!cur){app.innerHTML=`<section class="card done">${I('circle-check','xl')}<h2>Xong phần ôn hôm nay</h2><p class="muted">Thẻ tiếp theo sẽ đến hạn theo lịch. Bạn có thể luyện thêm ở Thẻ ghi nhớ, Luyện nói hoặc Viết chữ mà không làm thay đổi lịch.</p><button class="primary" id="h">Về trang chủ</button></section>`;$('#h').onclick=()=>go('home');return}
  const c=D.srs[cur.id],k=SRS.kind(c),pv=SRS.preview(c,now,{retention:D.set.retention});
  app.innerHTML=`<div class="counters" aria-label="Số thẻ"><span class="c-new ${k=='new'?'on':''}">Mới <b>${q.fresh.length}</b></span><span class="c-learn ${k=='learn'?'on':''}">Học <b>${q.learn.length}</b></span><span class="c-rev ${k=='review'?'on':''}">Ôn <b>${q.rev.length}</b></span></div>
  <article class="flash" id="fc" tabindex="0" aria-live="polite"><div class="front"><span class="tag">${esc(META.levels[cur.L].name)}${k=='new'?' · Mới':''}</span><div class="hz" lang="zh-${D.set.script=='t'?'Hant':'Hans'}">${esc(hz(cur))}</div>${D.set.pinyin=='front'?`<div class="py">${pinyinHTML(cur)}</div>`:''}<p class="muted sm hint">Chạm để xem đáp án</p></div><div class="backside hidden" id="bk"></div></article>
  <div class="rate hidden" id="rate">${['Lại','Khó','Được','Dễ'].map((t,i)=>`<button class="r r${i+1}" data-r="${i+1}"><b>${t}</b><small>${SRS.label(pv[i])}</small></button>`).join('')}</div>
  <div class="row"><button class="ghost" id="undo" ${undo?'':'disabled'}>${I('undo-2','s')} Hoàn tác</button><button class="ghost" id="susp">${I('pause','s')} Tạm ngưng thẻ</button></div>`;
  const fc=$('#fc');swipeable(fc,{onTap:reveal,enabled:()=>shown,onLeft:()=>answer(1),onRight:()=>answer(3)});
  $$('[data-r]').forEach(b=>b.onclick=()=>answer(+b.dataset.r));$('#undo').onclick=doUndo;
  $('#susp').onclick=()=>{undo={id:cur.id,prev:D.srs[cur.id]?{...D.srs[cur.id]}:null,rl:D.revlog.length,log:JSON.stringify(D.log)};D.srs[cur.id]={...SRS.migrate(D.srs[cur.id]),susp:true};save();toast('Đã tạm ngưng. Mở lại trong Danh sách từ.');draw()};
  if(D.set.autoplay&&D.set.pinyin=='front')say(cur.s)};
 const reveal=()=>{if(shown)return;shown=true;$('#bk').innerHTML=backHTML(cur);$('#bk').classList.remove('hidden');$('.hint').remove();$('#rate').classList.remove('hidden');if(D.set.autoplay)say(cur.s);$('[data-r="3"]').focus({preventScroll:true})};
 const answer=r=>{if(!shown||!cur)return;const now=Date.now();undo={id:cur.id,prev:D.srs[cur.id]?JSON.parse(JSON.stringify(D.srs[cur.id])):null,rl:D.revlog.length,log:JSON.stringify(D.log)};
  const n=CORE.rate(D,cur.id,r,now);if(n.leechNew)toast('Từ này hay quên: đã tạm ngưng. Thử Viết chữ hoặc đặt mẹo nhớ.');save();buzz(r==1?[30,40,30]:15);draw()};
 const doUndo=()=>{if(!undo)return;if(undo.prev)D.srs[undo.id]=undo.prev;else delete D.srs[undo.id];D.revlog.length=undo.rl;D.log=JSON.parse(undo.log);undo=null;save();draw();toast('Đã hoàn tác')};
 const key=e=>{if(e.target.matches('input,textarea,select'))return;if(e.key==' '||e.key=='Enter'){e.preventDefault();shown?answer(3):reveal()}else if(shown&&/^[1-4]$/.test(e.key))answer(+e.key);else if(e.key=='z'||e.key=='Z')doUndo()};
 addEventListener('keydown',key);cleanup=()=>removeEventListener('keydown',key);draw()};
function backHTML(w){return`<div class="py big">${pinyinHTML(w)}</div><div class="mean">${meaning(w)}</div>${meaningSub(w)}
 <div class="meta">${w.t!==w.s?`<span>${D.set.script=='t'?'Giản thể':'Phồn thể'}: <b lang="zh">${esc(other(w))}</b></span>`:''}${w.r?`<span>Bộ thủ: <b lang="zh">${esc(w.r)}</b></span>`:''}</div>
 <div class="row c"><button class="ib" data-say="${esc(w.s)}" aria-label="Nghe">${I('volume-2')}</button><button class="ib" data-say="${esc(w.s)}" data-slow="1" aria-label="Nghe chậm">${I('turtle')}</button><button class="ib" onclick="event.stopPropagation();go('write','${esc(w.id)}')" aria-label="Xem thứ tự nét">${I('pen-line')}</button></div>`}
/* ---------- Thẻ ghi nhớ (browse only; evidence, never schedule) ---------- */
function levelPicker(cur,cb){const o=CORE.LEVELS.filter(L=>D.unlocked[L]).map(L=>`<option value="${L}" ${L==cur?'selected':''}>${esc(META.levels[L].name)}</option>`).join('');return`<label class="pick">Cấp độ <select id="lvsel">${o}</select></label>`}
SCREENS.cards=()=>{title.textContent='Thẻ ghi nhớ';let L=+(sessionStorage.cl||1);if(!D.unlocked[L])L=1;let i=+(sessionStorage['ci'+L]||0),flip=false;
 const draw=async()=>{const ws=await loadLevel(L);i=(i+ws.length)%ws.length;sessionStorage['ci'+L]=i;const w=ws[i];
  app.innerHTML=`${levelPicker(L)}<p class="note">${I('info','s')} Chế độ xem tự do. Không thay đổi lịch ôn. Chạm để lật, vuốt trái/phải để chuyển thẻ.</p>
  <article class="flash" id="fc" tabindex="0"><div class="front"><span class="tag">${i+1}/${ws.length} · ${esc(CORE.LABEL[CORE.stateOf(D.srs[w.id],Date.now())])}</span><div class="hz" lang="zh">${esc(hz(w))}</div></div><div class="backside ${flip?'':'hidden'}">${backHTML(w)}</div></article>
  <div class="row"><button class="ghost" id="prev">${I('chevron-left','s')} Trước</button><button class="ghost" id="next">Sau ${I('chevron-right','s')}</button></div>`;
  $('#lvsel').onchange=e=>{L=+e.target.value;sessionStorage.cl=L;i=+(sessionStorage['ci'+L]||0);flip=false;draw()};
  const mv=d=>{if(flip)CORE.practice(D,w.id,'cards',true,Date.now()),save();i+=d;flip=false;draw()};
  window._flip=()=>{flip=!flip;if(flip&&D.set.autoplay)say(w.s);draw()};swipeable($('#fc'),{onTap:window._flip,onLeft:()=>mv(1),onRight:()=>mv(-1)});$('#prev').onclick=()=>mv(-1);$('#next').onclick=()=>mv(1)};
 const key=e=>{if(e.key=='ArrowRight')$('#next')?.click();else if(e.key=='ArrowLeft')$('#prev')?.click();else if(e.key==' '){e.preventDefault();window._flip&&window._flip()}};addEventListener('keydown',key);cleanup=()=>removeEventListener('keydown',key);draw()};
/* ---------- Luyện nói: TTS model + mic + heuristic tone feedback ---------- */
SCREENS.speak=()=>{title.textContent='Luyện nói';let L=+(sessionStorage.sl||1);if(!D.unlocked[L])L=1;let i=+(sessionStorage['si'+L]||0),rec=null;
 const draw=async(result)=>{const ws=await loadLevel(L);i=(i+ws.length)%ws.length;sessionStorage['si'+L]=i;const w=ws[i],tn=TONES.toneNums(w.n);
  app.innerHTML=`${levelPicker(L)}<p class="note">${I('info','s')} Nhận xét thanh điệu là ước lượng từ cao độ giọng (không dùng AI, chưa được kiểm chứng trên giọng thật). Chỉ để tham khảo, không đổi lịch ôn.</p>
  <section class="card speak"><div class="hz" lang="zh">${esc(hz(w))}</div><div class="py big">${pinyinHTML(w)}</div><div class="mean">${meaning(w)}</div>
  <div class="row c"><button class="ib" data-say="${esc(w.s)}" aria-label="Nghe mẫu">${I('volume-2')}</button><button class="ib" data-say="${esc(w.s)}" data-slow="1" aria-label="Nghe chậm">${I('turtle')}</button></div>
  <button class="primary" id="rec">${I(rec?'square':'mic')} ${rec?'Dừng':'Thu âm (tối đa 3 giây)'}</button><div id="res">${result||''}</div></section>
  <div class="row"><button class="ghost" id="prev">${I('chevron-left','s')} Trước</button><button class="ghost" id="next">Sau ${I('chevron-right','s')}</button></div>`;
  $('#lvsel').onchange=e=>{L=+e.target.value;sessionStorage.sl=L;i=+(sessionStorage['si'+L]||0);draw()};$('#prev').onclick=()=>{i--;draw()};$('#next').onclick=()=>{i++;draw()};
  $('#rec').onclick=async()=>{if(rec){rec.stop();return}try{rec=await record(3000,x=>{rec=null;const r=TONES.analyse(x.data,x.sr,tn);if(r.ok)CORE.practice(D,w.id,'speak',r.syl.every(s=>s.match!==false),Date.now()),save();draw(toneHTML(r,w))});draw()}catch(e){rec=null;toast('Không mở được micro: '+(e.message||e))}}};
 cleanup=()=>{if(rec)rec.stop()};draw()};
async function record(ms,done){const st=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:true}});
 const ac=new(window.AudioContext||window.webkitAudioContext)();await ac.resume();const src=ac.createMediaStreamSource(st),pr=ac.createScriptProcessor(2048,1,1),buf=[];
 pr.onaudioprocess=e=>buf.push(new Float32Array(e.inputBuffer.getChannelData(0)));src.connect(pr);pr.connect(ac.destination);let stopped=false;
 const stop=()=>{if(stopped)return;stopped=true;clearTimeout(t);pr.disconnect();src.disconnect();st.getTracks().forEach(x=>x.stop());const n=buf.reduce((a,b)=>a+b.length,0),x=new Float32Array(n);let o=0;for(const b of buf){x.set(b,o);o+=b.length}const sr=ac.sampleRate;ac.close();done({data:x,sr})};
 const t=setTimeout(stop,ms);return{stop}}
const TN=['','ngang (1)','sắc lên (2)','xuống-lên (3)','đi xuống (4)','nhẹ'];
function toneHTML(r,w){if(!r.ok)return`<p class="warn">${esc(r.reason)}</p>`;const c=r.contour,W=280,H=90,mn=Math.min(-6,...c),mx=Math.max(6,...c);
 const pts=c.map((v,i)=>`${(i/(c.length-1||1)*W).toFixed(1)},${(H-(v-mn)/(mx-mn)*H).toFixed(1)}`).join(' ');const py=w.p.split(/\s+/);
 return`<svg class="contour" viewBox="0 0 ${W} ${H}" role="img" aria-label="Đường cao độ giọng của bạn"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>
 <ul class="syl">${r.syl.map((s,k)=>`<li class="${s.match==null?'':s.match?'ok':'bad'}">${I(s.match==null?'minus':s.match?'circle-check':'circle-x','s')}<b>${esc(py[k]||'')}</b> cần ${TN[s.expected]}${s.expected==5?'':` · nghe như ${s.got?TN[s.got]:'không rõ'}`}</li>`).join('')}</ul>`}
/* ---------- Viết chữ: hanzi-writer + radical info ---------- */
SCREENS.write=async id=>{title.textContent='Viết chữ';let w=id&&byId[id];let L=w?w.L:+(sessionStorage.wl||1);if(!D.unlocked[L]&&!w)L=1;let i=w?w.i:+(sessionStorage['wi'+L]||0),ci=0,hw=null,mode='anim';
 const info=await chars();
 const draw=async()=>{const ws=await loadLevel(L);i=(i+ws.length)%ws.length;sessionStorage['wi'+L]=i;w=ws[i];const cs=[...hz(w)];ci=Math.min(ci,cs.length-1);const ch=cs[ci],inf=info[ch]||{};
  app.innerHTML=`${levelPicker(L)}<section class="card write"><div class="word"><span lang="zh">${cs.map((c,k)=>`<button class="chb ${k==ci?'on':''}" data-ci="${k}">${esc(c)}</button>`).join('')}</span><span class="py">${pinyinHTML(w)}</span></div>
  <div id="hw" class="hwbox" aria-label="Thứ tự nét chữ ${esc(ch)}"></div>
  <div class="seg"><button data-m="anim" class="${mode=='anim'?'on':''}">Xem nét</button><button data-m="quiz" class="${mode=='quiz'?'on':''}">Tự viết</button></div><p id="qs" class="muted sm c"></p>
  <dl class="cinfo"><dt>Nghĩa chữ</dt><dd>${esc(inf.d||'–')}</dd><dt>Bộ thủ</dt><dd><b lang="zh">${esc(inf.r||'–')}</b> ${inf.rn?`<span class="muted">(${esc(inf.rn)})</span>`:''}</dd><dt>Cấu tạo</dt><dd lang="zh">${esc(inf.c||'–')}</dd>${inf.h?`<dt>Gợi ý</dt><dd>${esc(inf.h)}</dd>`:''}</dl>
  <p class="muted sm">Nghĩa chữ và cấu tạo: Make Me a Hanzi dictionary.txt (tiếng Anh, LGPL-3.0). Nét chữ: Make Me a Hanzi graphics (Arphic Public License).</p></section>
  <div class="row"><button class="ghost" id="prev">${I('chevron-left','s')} Từ trước</button><button class="ghost" id="next">Từ sau ${I('chevron-right','s')}</button></div>`;
  $('#lvsel').onchange=e=>{L=+e.target.value;sessionStorage.wl=L;i=+(sessionStorage['wi'+L]||0);ci=0;draw()};$('#prev').onclick=()=>{i--;ci=0;draw()};$('#next').onclick=()=>{i++;ci=0;draw()};
  $$('[data-ci]').forEach(b=>b.onclick=()=>{ci=+b.dataset.ci;draw()});$$('[data-m]').forEach(b=>b.onclick=()=>{mode=b.dataset.m;draw()});
  const sz=Math.min(260,app.clientWidth-64);const css=getComputedStyle(document.documentElement);
  hw=HanziWriter.create('hw',ch,{width:sz,height:sz,padding:8,showOutline:true,strokeColor:css.getPropertyValue('--ink').trim()||'#222',outlineColor:css.getPropertyValue('--line').trim()||'#ddd',drawingColor:css.getPropertyValue('--accent').trim()||'#2e6db4',highlightColor:css.getPropertyValue('--accent').trim(),radicalColor:css.getPropertyValue('--rad').trim()||'#b0413e',
   charDataLoader:(c,ok,no)=>fetch('data/strokes/'+encodeURIComponent(c)+'.json').then(r=>{if(!r.ok)throw 0;return r.json()}).then(ok).catch(()=>{$('#qs').textContent='Chưa có dữ liệu nét cho chữ này.';no&&no()}),onLoadCharDataSuccess:()=>{}});
  if(mode=='anim'){hw.loopCharacterAnimation()}else{let miss=0;$('#qs').textContent='Viết từng nét theo đúng thứ tự.';hw.quiz({onMistake:()=>{miss++},onComplete:s=>{const ok=s.totalMistakes<=2;$('#qs').textContent=`Xong. ${s.totalMistakes} lần sai nét.`;CORE.practice(D,w.id,'write',ok,Date.now());save()}})}};
 draw()};
/* ---------- Danh sách từ ---------- */
SCREENS.list=()=>{title.textContent='Danh sách từ';let L=+(sessionStorage.ll||1),f='all',qy='';
 const draw=async()=>{const ws=await loadLevel(L),now=Date.now();const cnt={all:ws.length};for(const w of ws){const s=CORE.stateOf(D.srs[w.id],now);cnt[s]=(cnt[s]||0)+1}
  const opts=CORE.LEVELS.map(x=>`<option value="${x}" ${x==L?'selected':''}>${esc(META.levels[x].name)}${D.unlocked[x]?'':' (khoá)'}</option>`).join('');
  app.innerHTML=`<label class="pick">Cấp độ <select id="lvsel">${opts}</select></label><input id="q" class="search" type="search" placeholder="Tìm chữ Hán, pinyin hoặc nghĩa" value="${esc(qy)}" autocomplete="off">
  <div class="chips">${['all','new','learn','relearn','review','mastered','susp'].map(k=>`<button class="chip ${f==k?'on':''}" data-f="${k}">${k=='all'?'Tất cả':CORE.LABEL[k]} <span>${cnt[k]||0}</span></button>`).join('')}</div><ul class="wl" id="wl"></ul>`;
  const fill=()=>{const q=qy.trim().toLowerCase(),qn=q.normalize('NFD').replace(/[\u0300-\u036f]/g,'');const out=ws.filter(w=>(f=='all'||CORE.stateOf(D.srs[w.id],now)==f)&&(!q||w.s.includes(q)||w.t.includes(q)||w.n.replace(/[1-5 ]/g,'').includes(qn.replace(/\s/g,''))||(w.v||'').toLowerCase().includes(q)||w.m.join(' ').toLowerCase().includes(q))).slice(0,300);
   $('#wl').innerHTML=out.map(w=>`<li><button data-w="${esc(w.id)}"><span class="hzs" lang="zh">${esc(hz(w))}</span><span class="py">${pinyinHTML(w)}</span><span class="m">${meaning(w)}</span><span class="st st-${CORE.stateOf(D.srs[w.id],now)}">${CORE.LABEL[CORE.stateOf(D.srs[w.id],now)]}</span></button></li>`).join('')||'<li class="muted c">Không có từ nào.</li>';
   $$('[data-w]').forEach(b=>b.onclick=()=>wordSheet(byId[b.dataset.w],draw))};
  $('#lvsel').onchange=e=>{L=+e.target.value;sessionStorage.ll=L;draw()};$('#q').oninput=e=>{qy=e.target.value;fill()};$$('[data-f]').forEach(b=>b.onclick=()=>{f=b.dataset.f;draw()});fill()};draw()};
function sheet(html){const s=$('#sheet');s.innerHTML=`<div class="sh-in"><button class="ib close" aria-label="Đóng">${I('x')}</button>${html}</div>`;s.classList.remove('hidden');$('.close',s).onclick=closeSheet;s.onclick=e=>{if(e.target==s)closeSheet()};$('.close',s).focus()}
const closeSheet=()=>$('#sheet').classList.add('hidden');
function wordSheet(w,redraw){const c=D.srs[w.id],now=Date.now(),R=SRS.retrievability(c,now),ev=D.ev[w.id]||[];const fmt=t=>new Date(t).toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short'});
 const hist=D.revlog.filter(x=>x[0]==w.id).map(x=>`<li>${fmt(x[2])} · Ôn theo lịch: ${['','Lại','Khó','Được','Dễ'][x[1]]}</li>`).concat(ev.map(e=>`<li>${fmt(e[2])} · Luyện ${({cards:'thẻ',write:'viết',speak:'nói'})[e[0]]||e[0]}: ${e[1]?'đúng':'chưa đúng'}</li>`));
 sheet(`<div class="hz" lang="zh">${esc(hz(w))}</div><div class="py big c">${pinyinHTML(w)}</div><p class="c">${meaning(w)}</p>
 <dl class="cinfo"><dt>Trạng thái</dt><dd>${CORE.LABEL[CORE.stateOf(c,now)]}</dd>${c&&c.state!='new'?`<dt>Lượt ôn</dt><dd>${c.reps} (quên ${c.lapses||0})</dd><dt>Đến hạn</dt><dd>${fmt(c.due)}</dd><dt>Khả năng nhớ</dt><dd>${R==null?'–':Math.round(R*100)+'%'}</dd><dt>Độ ổn định</dt><dd>${(c.s||0).toFixed(1)} ngày</dd><dt>Độ khó</dt><dd>${(c.d||0).toFixed(1)}/10</dd>`:''}</dl>
 ${c&&c.susp?`<button class="primary" id="uns">Mở lại thẻ</button>`:''}<h3>Lịch sử</h3><ul class="hist">${hist.join('')||'<li class="muted">Chưa có</li>'}</ul>`);
 const u=$('#uns');if(u)u.onclick=()=>{D.srs[w.id]={...c,susp:false,leech:false};save();closeSheet();redraw()}}
/* ---------- settings ---------- */
$('#settings').onclick=()=>{const s=D.set,o=(k,v,t)=>`<option value="${v}" ${String(s[k])==String(v)?'selected':''}>${t}</option>`;
 sheet(`<h2>Cài đặt</h2><div class="form">
 <label>Chữ viết<select data-k="script">${o('script','s','Giản thể')}${o('script','t','Phồn thể')}</select></label>
 <label>Pinyin ở mặt trước thẻ ôn<select data-k="pinyin">${o('pinyin','show','Ẩn (hiện khi lật)')}${o('pinyin','front','Hiện ngay')}</select></label>
 <label>Từ mới mỗi ngày<select data-k="newPerDay" data-n="1">${[5,10,20,30,50,9999].map(v=>o('newPerDay',v,v==9999?'Không giới hạn':v)).join('')}</select></label>
 <label>Mục tiêu ghi nhớ (FSRS)<select data-k="retention" data-n="1">${[.8,.85,.9,.95].map(v=>o('retention',v,Math.round(v*100)+'%')).join('')}</select></label>
 <label>Tốc độ đọc<select data-k="rate" data-n="1">${[.6,.8,1].map(v=>o('rate',v,v==1?'Bình thường':v==.8?'Hơi chậm':'Chậm')).join('')}</select></label>
 <label>Tự đọc khi lật thẻ<select data-k="autoplay" data-b="1">${o('autoplay',true,'Bật')}${o('autoplay',false,'Tắt')}</select></label>
 <label>Giao diện<select data-k="theme">${o('theme','system','Theo hệ thống')}${o('theme','light','Sáng')}${o('theme','dark','Tối')}</select></label></div>
 <p class="muted sm">Giọng đọc: ${VOICE?esc(VOICE.name+' ('+VOICE.lang+')'):'chưa có giọng tiếng Trung trên máy'}.</p>
 <h3>Mở khoá cấp độ</h3><p class="muted sm">Cấp tiếp theo tự mở khi 80% từ của cấp trước đã thuộc bước đầu (qua bước học, lên lịch ôn). Nếu bạn đã biết trước, có thể mở sớm.</p>
 <div class="row">${CORE.LEVELS.filter(L=>!D.unlocked[L]).slice(0,1).map(L=>`<button class="ghost" id="early" data-l="${L}">Mở sớm ${esc(META.levels[L].name)}</button>`).join('')}</div>
 <h3>Dữ liệu</h3><p class="muted sm">Tiến độ lưu trên máy này (phiên bản dữ liệu ${D.v}). Cập nhật ứng dụng không xoá tiến độ. Nên sao lưu định kỳ.</p>
 <div class="row"><button class="ghost" id="exp">${I('download','s')} Sao lưu</button><label class="ghost btn">${I('upload','s')} Khôi phục<input type="file" id="imp" accept="application/json" hidden></label></div>`);
 $$('#sheet [data-k]').forEach(el=>el.onchange=()=>{let v=el.value;if(el.dataset.n)v=+v;if(el.dataset.b)v=v=='true';D.set[el.dataset.k]=v;save();applyTheme();go(screen)});
 const e=$('#early');if(e)e.onclick=async()=>{if(e.dataset.c){D.unlocked[+e.dataset.l]=true;save();await ensureLevels();closeSheet();go('home');toast('Đã mở khoá')}else{e.dataset.c=1;e.textContent='Chạm lần nữa để xác nhận'}};
 $('#exp').onclick=()=>{const b=new Blob([JSON.stringify(D)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='hoc-tieng-trung-'+CORE.dayKey(Date.now())+'.json';a.click()};
 $('#imp').onchange=async ev=>{const f=ev.target.files[0];if(!f)return;try{const j=JSON.parse(await f.text());if(!j||typeof j!='object'||!j.srs)throw 0;LS.setItem(CORE.KEY+'-before-import-'+Date.now(),JSON.stringify(D));D=CORE.migrate(j);save();await ensureLevels();closeSheet();go('home');toast('Đã khôi phục')}catch(_){toast('Tệp không hợp lệ')}}};
function aboutSheet(){sheet(`<h2>Nguồn dữ liệu</h2><ul class="hist"><li>Danh sách từ HSK 3.0 (chuẩn GF0025-2021; cấp 7–9 gộp một nhóm): drkameleon/complete-hsk-vocabulary, giấy phép MIT.</li><li>Pinyin và nghĩa tiếng Anh: CC-CEDICT, CC BY-SA 4.0.</li><li>Nghĩa tiếng Việt HSK 1–3: biên soạn cho ứng dụng này dựa trên nghĩa CC-CEDICT, chưa được người bản ngữ duyệt.</li><li>Thứ tự nét: hanzi-writer (MIT), dữ liệu hanzi-writer-data 2.0.1 từ Make Me a Hanzi graphics (Arphic Public License).</li><li>Bộ thủ, cấu tạo, nghĩa chữ: Make Me a Hanzi dictionary.txt (LGPL-3.0); tên bộ thủ theo tên ký tự Unicode Kangxi.</li><li>Lập lịch: FSRS-6 qua ts-fsrs (MIT).</li></ul>`)}
/* ---------- theme, SW ---------- */
function applyTheme(){const t=D.set.theme;document.documentElement.dataset.theme=t=='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t}
applyTheme();matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme);
if('serviceWorker'in navigator){navigator.serviceWorker.register('sw.js').then(r=>{const ask=w=>{const t=$('#toast');t.innerHTML='Có bản mới. <button id="upd">Tải lại</button>';t.classList.add('on');$('#upd').onclick=()=>w.postMessage('skip')};
 if(r.waiting&&navigator.serviceWorker.controller)ask(r.waiting);r.addEventListener('updatefound',()=>{const w=r.installing;w.addEventListener('statechange',()=>{if(w.state=='installed'&&navigator.serviceWorker.controller)ask(w)})})}).catch(()=>{});
 const had=!!navigator.serviceWorker.controller;let rl=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had&&!rl){rl=true;location.reload()}})}
(async()=>{try{META=await getJSON('data/meta.json');await ensureLevels();go('home')}catch(e){app.innerHTML=`<p class="warn">Không tải được dữ liệu. Kiểm tra kết nối rồi mở lại.</p>`}})();
