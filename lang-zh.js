/* Chinese (HSK 3.0) adapter for the shared Neko core (core/app-core.js). The core owns the UI, scheduling and storage;
   this file supplies data, answers, audio, the tone-based speaking mode and the stroke-order writing mode. See docs/ECOSYSTEM.md. */
(function(){'use strict';
const LV=[1,2,3,4,5,6,7],LVN=L=>L==7?'HSK 7–9':'HSK '+L,UNLOCK=0.8,OLD_KEY='htt';
const TM={a:'āáǎàa',e:'ēéěèe',i:'īíǐìi',o:'ōóǒòo',u:'ūúǔùu',v:'ǖǘǚǜü'};
const strip=s=>String(s).replace(/[ǖǘǚǜüÜ]/g,'v').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ü/g,'v').toLowerCase();
const sylls=w=>w.p.split(/\s+/),tonesOf=w=>TONES.toneNums(w.n);
let CH={};const $q=(s,r=document)=>r.querySelector(s);
const unl=()=>{S.zhUnl=S.zhUnl&&typeof S.zhUnl=='object'?S.zhUnl:{1:true};S.zhUnl[1]=true;return S.zhUnl};
const isTrad=()=>S.set.script=='t';
const remap=()=>{for(const w of words)w.w=isTrad()?w.t:w.s};
/* v2 ('htt') record -> core record. The old key is read only, never changed or deleted. */
const EVC={cards:'f',write:'w',speak:'s',learn:'l',listen:'d',test:'t',match:'m'};
function fromV2(o){if(!o||typeof o!='object')return null;const set=o.set||{};
 const d={v:8,srs:o.srs||{},revlog:(o.revlog||[]).map(r=>[r[2],r[0],r[1],0,0]),ev:{},log:o.log||{},star:o.star||{},zhUnl:o.unlocked||{1:true},
  user:{name:'',goal:set.newPerDay>=9999?'all':String(set.newPerDay||20),done:true},
  set:{script:set.script=='t'?'t':'s',py:set.pinyin=='hide'?'off':'on',retention:+set.retention||0.9,theme:set.theme||'system',autoplay:set.autoplay!==false,haptics:set.haptics!==false,voice:'f',f:{}},importedFrom:'htt-v'+(o.v||1)};
 for(const id in o.ev||{})d.ev[id]=(o.ev[id]||[]).map(e=>[e[2],EVC[e[0]]||'p',e[1]?1:0]);
 if(Array.isArray(d.zhUnl)){const x={};for(const l of d.zhUnl)x[l]=true;d.zhUnl=x}return d}
const zhNorm=s=>String(s).toLowerCase().normalize('NFC').replace(/[’'.,!?;:"，。！？、\s]/g,'').trim();
function accepts(w){const sy=w.n.toLowerCase().split(/\s+/);const a=[w.s,w.t,w.p.replace(/\s+/g,''),strip(w.p).replace(/\s+/g,''),strip(w.p).replace(/v/g,'u').replace(/\s+/g,''),sy.join('').replace(/u:/g,'v')];return [...new Set(a.map(zhNorm))]}
function pyHTML(w,res,force){if(S.set.py=='off'&&!force)return '';const ss=sylls(w),tn=tonesOf(w);
 return `<div class="pyrow" lang="zh-Latn">${ss.map((s,k)=>{const r=res&&res[k];const c=r?(r.cls!=null?r.cls:(r.match===null?'':r.match?'g':'r')):'';return `<button class="pyc t${tn[k]} ${c}" data-tone="${tn[k]}" data-k="${k}" aria-label="${esc(s)}, thanh ${tn[k]==5?'nhẹ':tn[k]}. Xem cách đọc">${esc(s)}</button>`}).join('')}</div>`}
const TN={1:['Thanh 1 (ngang)','Cao và đều, giữ giọng ở mức cao (5-5). Gần giống kéo dài một tiếng không dấu nhưng cao hơn.','M10 22 L90 22'],2:['Thanh 2 (lên)','Đi từ giữa lên cao (3-5), như hỏi lại “hả?”. Gần với dấu sắc tiếng Việt.','M10 50 Q55 45 90 18'],
 3:['Thanh 3 (xuống rồi lên)','Thấp, xuống rồi lên (2-1-4). Trong lời nói nhanh thường chỉ còn phần thấp; trước một thanh 3 khác thì đọc thành thanh 2.','M10 44 Q40 82 60 74 T90 30'],4:['Thanh 4 (xuống)','Rơi mạnh từ cao xuống thấp (5-1), dứt khoát như ra lệnh. Gần với dấu nặng nhưng bắt đầu cao.','M10 16 L90 80'],5:['Thanh nhẹ','Ngắn, nhẹ, không nhấn; cao độ phụ thuộc âm tiết trước.','M45 56 L55 56']};
/* initials/finals with mouth-shape hints (articulation) */
const INI=['zh','ch','sh','b','p','m','f','d','t','n','l','g','k','h','j','q','x','r','z','c','s','y','w'];
const ART={zh:'Cong lưỡi lên chạm sau lợi trên, bật nhẹ, không bật hơi (gần “tr” miền Bắc đọc cong lưỡi).',ch:'Như zh nhưng bật hơi mạnh.',sh:'Cong lưỡi, để hơi đi qua khe hẹp (gần “s” cong lưỡi).',r:'Cong lưỡi như sh nhưng rung dây thanh, gần “r” nhẹ.',
 z:'Đầu lưỡi chạm sau răng trên, không bật hơi (giống “ch” nhẹ, phẳng lưỡi).',c:'Như z nhưng bật hơi mạnh (“ts”).',s:'Đầu lưỡi sau răng dưới, như “x” tiếng Việt.',j:'Mặt lưỡi chạm ngạc cứng, không bật hơi, môi dẹt (gần “ch”).',q:'Như j nhưng bật hơi.',x:'Mặt lưỡi gần ngạc cứng, hơi đi qua (gần “x” mềm).',
 b:'Hai môi, không bật hơi (như “p” không hơi, gần “b”).',p:'Hai môi, bật hơi mạnh (như “ph” nhưng bằng môi).',d:'Đầu lưỡi, không bật hơi (gần “t” tiếng Việt).',t:'Đầu lưỡi, bật hơi mạnh (như “th”).',g:'Gốc lưỡi, không bật hơi (gần “c/k”).',k:'Gốc lưỡi, bật hơi (như “kh” nhưng bật).',h:'Hơi xát ở gốc lưỡi, gần “h/kh”.',
 m:'Hai môi khép, âm mũi.',f:'Răng trên chạm môi dưới.',n:'Đầu lưỡi chạm lợi, âm mũi.',l:'Đầu lưỡi chạm lợi, hơi đi hai bên.',y:'Như “i” ở đầu âm tiết.',w:'Như “u” ở đầu âm tiết, tròn môi.'};
const MOUTH={round:'M20 40 Q50 14 80 40 Q50 66 20 40Z',flat:'M14 40 Q50 30 86 40 Q50 50 14 40Z',open:'M22 36 Q50 6 78 36 Q50 74 22 36Z',curl:'M18 40 Q50 22 82 40 Q50 58 18 40Z'};
const mouthOf=i=>/^(b|p|m)$/.test(i)?['flat','Hai môi khép rồi mở']:/^(zh|ch|sh|r)$/.test(i)?['curl','Lưỡi cong lên phía sau']:/^(j|q|x|y)$/.test(i)?['flat','Môi dẹt, cười nhẹ']:/^w$/.test(i)?['round','Môi tròn']:['open','Miệng mở tự nhiên'];
const split=s=>{s=strip(s).replace(/[1-5]$/,'');const i=INI.find(x=>s.startsWith(x)&&s.length>x.length)||'';return [i,s.slice(i.length)]};
function toneSheet(w,k){const s=sylls(w)[k],t=tonesOf(w)[k],[ini,fin]=split(s),m=mouthOf(ini),RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
 sheet(`<h2>${esc(s)} <span class="muted">· ${esc(TN[t][0])}</span></h2>
 <svg class="tguide" viewBox="0 0 100 100" role="img" aria-label="Đường cao độ của ${esc(TN[t][0])}"><g class="tgrid">${[18,34,50,66,82].map((y,i)=>`<line x1="6" x2="94" y1="${y}" y2="${y}"/><text x="2" y="${y+3}">${5-i}</text>`).join('')}</g><path class="tpath ${RM?'':'anim'}" d="${TN[t][2]}"/></svg>
 <p>${esc(TN[t][1])}</p>
 <div class="mrow"><svg class="mouth" viewBox="0 0 100 80" role="img" aria-label="Khẩu hình: ${esc(m[1])}"><path class="lip ${RM?'':'anim'}" d="${MOUTH[m[0]]}"/></svg><div><b>Phụ âm đầu: ${esc(ini||'(không có)')}</b><br><span class="muted">${esc(ART[ini]||'Bắt đầu thẳng bằng nguyên âm.')}</span><br><b>Vần: ${esc(fin)}</b><br><span class="muted">${esc(m[1])}</span></div></div>
 <div class="row"><button class="btn sec" id="tgp">${I('volume-2','s')}Nghe từ</button></div>`);$('#tgp').onclick=()=>play(w)}
if(typeof document!='undefined')document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.pyc[data-k]');if(!b)return;const card=b.closest('[data-wid]');const w=card?byId(card.dataset.wid):null;if(w){e.stopPropagation();toneSheet(w,+b.dataset.k)}},true);
function hvLine(w){return w.hv?`<span class="tag" title="${w.hvq?'Âm Hán Việt tra theo từng chữ (Unihan), chỉ để tham khảo':'Âm Hán Việt'}">HV: ${esc(w.hv)}${w.hvq?'*':''}</span>`:''}
function extra(w){const cs=[...w.s];return `<div class="zx">${w.vd?`<p class="muted" style="margin:4px 0">${esc(w.vd)}</p>`:''}<div class="tags" style="justify-content:flex-start">${hvLine(w)}${w.t!=w.s?`<span class="tag">${isTrad()?'Giản':'Phồn'}: ${esc(isTrad()?w.s:w.t)}</span>`:''}</div>
 <div class="chars">${cs.map(c=>{const x=CH[c]||{};return `<a class="chr" href="#/write?w=${encodeURIComponent(w.id)}&c=${encodeURIComponent(c)}"><b lang="zh">${esc(c)}</b><small>${x.r?'Bộ '+esc(x.r)+(x.rv?' · '+esc(x.rv):''):''}</small></a>`}).join('')}</div></div>`}
const hzW=w=>`<div class="w hz" lang="zh">${esc(w.w)}</div>`;
function front(w,dir){return `<div class="corner l">${starBtn(w)}</div>`+(dir=='en'?`<div class="corner r"><button class="ib" data-au="${w.id}" data-k="w" aria-label="Nghe phát âm">${I('volume-2')}</button></div><div data-wid="${w.id}">${hzW(w)}${pyHTML(w)}</div><div class="tags"><span class="tag">${esc(w.pos||'')}</span></div>`
 :`<div class="vi">${esc(w.vi)}</div><div class="tags"><span class="tag">${esc(w.pos||'')}</span></div><p class="muted">Từ tiếng Trung là gì?</p>`)}
function back(w){return `<div class="corner l">${starBtn(w)}</div><div class="corner r">${auBtns(w,false)}</div>
 <div data-wid="${w.id}"><div class="w hz" lang="zh">${esc(w.w)}<button class="ib sm cp" data-copy="${esc(w.w)}" aria-label="Sao chép từ" title="Sao chép từ">${I('copy','s')}</button></div>${pyHTML(w)}</div>
 <div class="tags"><span class="tag">${esc(w.pos||'')}</span><span class="tag lv">${esc(w.lv)}</span>${hvLine(w)}</div><div class="vi" style="margin-top:12px">${esc(w.vi)}</div>${extra(w).replace(/<div class="tags"[^]*?<\/div>/,'')}${noteHTML(w)}`}
/* ---------- audio: recorded neural voice for HSK 1-3, device voice otherwise ---------- */
let zhVoice=null;const pickVoice=()=>{try{const vs=speechSynthesis.getVoices().filter(v=>/^zh[-_](CN|Hans)/i.test(v.lang)||v.lang=='zh-CN');zhVoice=vs.find(v=>/Tingting|Xiaoxiao|Google/.test(v.name))||vs[0]||null}catch(e){}};
try{if(typeof speechSynthesis!='undefined'){speechSynthesis.onvoiceschanged=pickVoice;pickVoice()}}catch(e){}
const hasRec=w=>w.L<=3;
function zhPlay(w,kind,opt){if(hasRec(w))return false;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(w.s);u.lang='zh-CN';if(zhVoice)u.voice=zhVoice;u.rate=(opt.slow??S.set.slow)?0.55:0.85;speechSynthesis.speak(u)}catch(e){toast('Thiết bị không có giọng đọc tiếng Trung','volume-x')}return true}
/* ---------- on-device syllable + tone model (zh-asr-worker.js), lazy: downloaded only when the learner asks ---------- */
const ENG=(()=>{let wk=null,seq=0;const pend=new Map();let progCb=null,statusCb=null,loadP=null;
 const W=()=>{if(wk)return wk;wk=new Worker('zh-asr-worker.js');wk.onmessage=e=>{const m=e.data;
  if(m.type=='prog'||m.type=='phase'){progCb&&progCb(m)}else if(m.type=='status'){statusCb&&statusCb(m);statusCb=null}
  else if(m.type=='loaded'){loadP&&loadP.ok();loadP=null}else if(m.type=='res'){const p=pend.get(m.id);pend.delete(m.id);p&&p.ok(m)}
  else if(m.type=='err'){if(m.id!=null&&pend.has(m.id)){pend.get(m.id).no(new Error(m.msg));pend.delete(m.id)}else if(loadP){loadP.no(new Error(m.msg));loadP=null}}};return wk};
 return {supported:()=>typeof Worker!='undefined'&&typeof WebAssembly!='undefined'&&'caches' in window,
  status:()=>new Promise(ok=>{statusCb=ok;W().postMessage({type:'status'});setTimeout(()=>ok({cached:false,ready:false}),4000)}),
  load:cb=>new Promise((ok,no)=>{progCb=cb;loadP={ok,no};W().postMessage({type:'load'})}),
  run:(pcm,targets)=>new Promise((ok,no)=>{const id=++seq;pend.set(id,{ok,no});W().postMessage({type:'run',id,pcm,n:targets.length,targets})}),
  forget:()=>new Promise(ok=>{statusCb=ok;W().postMessage({type:'forget'})})}})();
const MODEL_MB=44;
const sylBase=s=>s.toLowerCase().replace(/[1-5]$/,'').replace(/u:|ü/g,'v');
const targetsOf=w=>{const n=w.n.toLowerCase().split(/\s+/);return n.map(s=>/^[a-z:ü]+[1-5]$/.test(s)?sylBase(s).replace(/v/g,'u'):null)};
const TMK={a:'āáǎà',e:'ēéěè',i:'īíǐì',o:'ōóǒò',u:'ūúǔù',v:'ǖǘǚǜ'};
function mark(b,t){if(!b)return '?';if(t<1||t>4)return b;const s=b.replace('v','ü');const v=/a|e/.exec(s)||/ou/.exec(s)||/[iouü](?!.*[aeiouü])/.exec(s);if(!v)return s;const c=v[0][0]=='o'&&v[0]=='ou'?'o':v[0];const k=c=='ü'?'v':c;const i=s.indexOf(c,v.index);return s.slice(0,i)+TMK[k][t-1]+s.slice(i+1)}
/* last capture diagnostics, shown in Settings > Kiểm tra micro and under errors */
let LASTDIAG=null;
function diagText(d){if(!d)return '';return `tốc độ mẫu ${d.sr||'?'} Hz · ${(d.dur||0).toFixed(1)} s · đỉnh ${(d.peak||0).toFixed(3)} · nền ${(d.floor||0).toFixed(4)} · ngưỡng ${(d.thr||0).toFixed(4)} · khối ${d.calls||0}/${d.nonzero||0} có tín hiệu · kết thúc: ${d.why||'?'}`}
/* ---------- speaking: model scoring when downloaded, F0 tone fallback otherwise ---------- */
function zhSpeak(){const d=deck().filter(w=>w.s.length<=4);let q=shuffle(d.length?d:deck()),i=0,att=0,rec=null,my=null,myUrl=null,nat=null,dead=false,slow=false,eng='f0';
 function hist(w){const h=S.pron[w.id]||[];return h.length?`<p class="muted hist">Lịch sử: ${h.slice(-6).map(x=>`<span class="hs ${x.s>=85?'g':x.s>=60?'y':'r'}">${x.s}</span>`).join(' ')}</p>`:''}
 async function show(){const w=q[i%q.length];att++;stop();my=null;nat=null;
  view('Luyện nói',`${mascot('idle','Nghe mẫu, rồi bấm micro và đọc to.',{small:true,row:true})}
  <div class="card q center" style="margin-top:12px" data-wid="${w.id}"><div class="kind">Từ ${i%q.length+1} / ${q.length}</div>${hzW(w)}${S.set.py=='off'?`<button class="btn sm sec" id="shp">Hiện pinyin</button>`:pyHTML(w)}
  <div class="tags"><span class="tag">${esc(w.pos||'')}</span><span class="tag lv">${esc(w.lv)}</span></div><p class="muted" style="margin:8px 0 0">${esc(w.vi)}</p>
  <div class="audiobar">${auBtns(w,false)}</div><div id="sarea" aria-live="polite"></div><div id="shist">${hist(w)}</div></div>
  <div class="row"><button class="btn sec" id="prev" ${i?'':'disabled'}>Từ trước</button><button class="btn" id="next">Từ tiếp theo</button></div>
  <p class="hint">Bấm vào từng âm pinyin để xem đường thanh điệu và khẩu hình.</p>`);
  $('#next').onclick=()=>{i++;show()};$('#prev').onclick=()=>{i=Math.max(0,i-1);show()};$('#shp')&&($('#shp').onclick=e=>{e.currentTarget.outerHTML=pyHTML(w,null,true)});
  if(S.set.autoplay)play(w);
  const a=att;let st={cached:false,ready:false};if(ENG.supported()&&S.set.zhEngine!='f0')st=await ENG.status();if(a!==att||dead)return;
  eng=st.cached||st.ready?'model':'f0';render(eng=='model'||S.set.zhEngine=='f0'||!ENG.supported()?'ready':'offer')}
 const box=()=>$('#sarea');
 function render(s,data={}){const w=q[i%q.length],b=box();if(!b)return;const mic=(lab='Bấm để nói')=>`<button class="mic ${s=='rec'?'rec':''}" id="mic" aria-label="${s=='rec'?'Dừng ghi âm':lab}">${I(s=='rec'?'square':'mic','xl')}</button>`;
  if(s=='offer')b.innerHTML=`<div class="note dl" role="note">${I('download')}<div><b>Chấm từng âm (phụ âm, vần, thanh) ngay trên máy</b><br>Tải mô hình nhận dạng (${MODEL_MB} MB, một lần, nên dùng Wi‑Fi). Giọng của bạn không gửi đi đâu và chấm được khi offline.</div></div>
   <div class="row"><button class="btn" id="dlm">${I('download','s')}Tải mô hình</button><button class="btn sec" id="usef0">Chỉ chấm thanh điệu</button></div>`;
  else if(s=='dl')b.innerHTML=`<p class="muted" style="margin-top:16px">${data.phase=='init'?'Đang khởi động mô hình…':`Đang tải mô hình… ${data.pct||0}%`}</p><div class="bar" role="progressbar" aria-label="Tải mô hình" aria-valuenow="${data.pct||0}" aria-valuemin="0" aria-valuemax="100"><i style="width:${data.pct||0}%"></i></div>`;
  else if(s=='ready')b.innerHTML=`${mic()}<p class="muted">Bấm micro, đọc to rồi dừng lại. Máy tự dừng khi bạn ngừng nói.</p><p class="muted" style="font-size:var(--fs-xs)">${eng=='model'?'Chấm phụ âm, vần và thanh bằng mô hình trên máy.':'Đang chấm thanh điệu cơ bản (chưa tải mô hình).'}</p>`;
  else if(s=='rec')b.innerHTML=`<div class="recw ${data.perm?'perm':'listen'}" id="recw"><button class="mic rec" id="mic" aria-label="Dừng ghi âm"><span class="ring" aria-hidden="true"></span>${I('square','xl')}</button><canvas class="wave" id="wave" aria-hidden="true"></canvas><div class="tailbar" aria-hidden="true"><i></i></div><p class="rst" id="rst">${data.perm?'Đang mở micro…':'Mời bạn đọc…'}</p><p class="muted">Hãy đọc “${esc(w.w)}”</p></div>`;
  else if(s=='busy')b.innerHTML=`<div class="spin" aria-hidden="true"></div><p class="muted">${eng=='model'?'Đang chấm từng âm…':'Đang chấm thanh điệu…'}</p>`;
  else if(s=='err')b.innerHTML=`${mic('Thử lại')}<p class="err-t">${esc(data.msg)}</p>${data.diag?`<p class="muted diag" style="font-size:var(--fs-xs)">Chi tiết micro: ${esc(diagText(data.diag))}</p>`:''}`;
  else if(s=='result')b.innerHTML=resHTML(w,data);
  $('#mic')&&($('#mic').onclick=()=>s=='rec'?(rec&&rec.stop()):start(w));$('#again')&&($('#again').onclick=()=>start(w));
  $('#dlm')&&($('#dlm').onclick=()=>download());$('#usef0')&&($('#usef0').onclick=()=>{S.set.zhEngine='f0';save();eng='f0';render('ready')});
  if(s=='result'&&my){const cv=$('#cmp');(async()=>{if(!nat&&hasRec(w)){try{nat=await Speech.decodeUrl(aurl(w,'w'))}catch(e){nat=null}}if(!dead&&cv&&cv.isConnected)drawCompare(cv,nat,my)})();
   const pm=()=>new Promise(ok=>{const a=new Audio(myUrl);a.playbackRate=slow?0.7:1;a.onended=ok;a.onerror=ok;audio.pause();a.play().catch(ok)});
   const pn=()=>new Promise(ok=>{play(w,'w',{slow});const f=()=>{audio.removeEventListener('ended',f);ok()};audio.addEventListener('ended',f);setTimeout(f,hasRec(w)?4000:2500)});
   $('#pn').onclick=pn;$('#pm').onclick=pm;$('#pb').onclick=async()=>{await pn();await pm()};$('#sl').onclick=e=>{slow=!slow;e.currentTarget.setAttribute('aria-pressed',slow);e.currentTarget.classList.toggle('on',slow)}}}
 async function download(){const a=att;render('dl',{pct:0});try{await ENG.load(m=>{if(a!==att||dead)return;render('dl',{pct:m.phase=='init'?100:Math.min(99,Math.round(m.got/m.total*100)),phase:m.phase})});if(a!==att||dead)return;
   S.set.zhEngine='model';save();eng='model';toast('Đã tải xong mô hình chấm phát âm','check');render('ready')}
  catch(e){if(a!==att||dead)return;render('offer');toast('Không tải được mô hình. Kiểm tra mạng rồi thử lại.','wifi-off',4000)}}
 function resHTML(w,{score,syl,heard,kind}){const c=score>=85?'var(--success)':score>=60?'var(--warn)':'var(--danger)',lab=score>=85?'Rất tốt':score>=60?'Khá, còn vài âm cần sửa':score>=40?'Cần luyện thêm':'Chưa giống, nghe mẫu rồi thử lại';
  let h=`<div class="score" style="--p:${score};--c:${c}" role="img" aria-label="Điểm ${score} trên 100"><b>${score}</b></div><p class="sres-l"><b>${lab}</b></p>`;
  h+=`<div data-wid="${w.id}">${pyHTML(w,syl,true)}</div><p class="legend2"><span><span class="lg g"></span> đúng</span> <span><span class="lg y"></span> gần đúng</span> <span><span class="lg r"></span> chưa đúng</span> <span>· bấm vào âm để xem cách đọc</span></p>`;
  if(heard)h+=`<p class="muted">Máy nghe được: <b lang="zh-Latn">${esc(heard)}</b></p>`;
  const tips=[];syl.forEach((r,k)=>{const s=sylls(w)[k];if(r.segOk===false)tips.push(`Âm <b>${esc(s)}</b>: phụ âm hoặc vần chưa đúng${r.heardSyl?`, máy nghe giống <b>${esc(r.heardSyl)}</b>`:''}.`);
   if(r.match===false)tips.push(`Âm <b>${esc(s)}</b>: cần ${esc(TN[r.expected][0].toLowerCase())}${r.expected!=r.underlying?` (biến điệu từ thanh ${r.underlying})`:''}${r.got?`, máy nghe giống ${esc(TN[r.got][0].toLowerCase())}`:''}.`)});
  if(tips.length)h+=`<div class="tips">${tips.slice(0,4).map(t=>`<div class="tip2">${I('lightbulb','s')}<div>${t}</div></div>`).join('')}</div>`;
  h+=`<p class="muted" style="font-size:var(--fs-xs)">${kind=='model'?'Chấm bằng mô hình SyllablePredictorV6 trên máy: trên giọng người thật (Tatoeba) đúng khoảng 79% thanh điệu và 74% âm tiết. Là gợi ý, không phải điểm thi.':'Chỉ chấm thanh điệu bằng đường cao độ (đúng khoảng 47% trên giọng người thật): tải mô hình ở trên để chấm chính xác hơn và chấm cả phụ âm, vần.'}</p>`;
  h+=`<canvas class="cmp" id="cmp" role="img" aria-label="So sánh cao độ giọng mẫu với giọng bạn"></canvas><div class="row wrap3"><button class="btn sm sec" id="pn">${I('volume-2','s')}Mẫu</button><button class="btn sm sec" id="pm">${I('play','s')}Giọng bạn</button><button class="btn sm sec" id="pb">${I('repeat','s')}Mẫu rồi bạn</button><button class="btn sm sec" id="sl" aria-pressed="${slow}">${I('turtle','s')}Chậm</button></div>`;
  return h+`<button class="btn" id="again" style="margin-top:12px">${I('mic','s')}Thử lại</button>`}
 function stop(){try{rec&&rec.stop()}catch(e){}rec=null}
 /* ROOT CAUSE (iOS, 2026-10-24): the first version also started webkitSpeechRecognition in the same tap. On iOS Safari the recogniser
    takes the audio session, so the getUserMedia/AudioContext capture received only silence and every attempt ended in "Chưa nghe thấy".
    Capture now runs alone, through the English app's proven Speech.record path (context created and resumed inside the tap). */
 async function start(w){const a=++att;stop();audio.pause();try{speechSynthesis.cancel()}catch(e){}render('rec',{perm:1});const t0=performance.now();
  try{rec=await Speech.record({onLevel:v=>{if(a===att)mascotLevel($('.mascot'),v)},onState:k=>{const t=$('#rst'),bx=$('#recw');if(!t||a!==att)return;if(bx&&k!='tailp')bx.className='recw '+k;t.textContent={perm:'Đang mở micro…',listen:'Mời bạn đọc…',quiet:'Không nhận được tiếng từ micro. Nói to hơn nhé.',voice:'Neko nghe thấy bạn',tail:'Đang chờ bạn nói hết…'}[k]||t.textContent}})}
  catch(e){if(a===att){LASTDIAG={why:'error '+(e&&e.name),sr:0,dur:0};render('err',{msg:e&&e.name=='NotAllowedError'?'Bạn chưa cho phép dùng micro. Trên iPhone: Cài đặt > Safari > Micrô > Cho phép (hoặc bấm “aA” trên thanh địa chỉ > Cài đặt trang web > Micrô).':'Không mở được micro ('+(e&&e.name||'lỗi')+'). Đóng ứng dụng khác đang dùng micro rồi thử lại.',diag:LASTDIAG})}return}
  if(a!==att)return rec.stop();const r=await rec.done;rec=null;if(a!==att||dead)return;
  const pcm=Speech.trim(Speech.to16k(r.pcm,r.sr));LASTDIAG={...(r.diag||{}),sr:r.sr,dur:r.pcm.length/r.sr,why:r.why,speech:r.speech,at:Date.now()};try{sessionStorage.zhDiag=JSON.stringify(LASTDIAG)}catch(e){}
  if(r.why=='dead'||r.why=='ended'){render('err',{msg:'Micro không gửi tiếng nào. Tải lại trang hoặc đóng ứng dụng khác đang dùng micro rồi thử lại.',diag:LASTDIAG});return}
  if(!r.speech||pcm.length<16000*0.2||Speech.peak(pcm)<0.02){render('err',{msg:'Chưa nghe thấy giọng nói. Hãy nói to, gần micro hơn rồi thử lại.',diag:LASTDIAG});return}
  my=pcm;if(myUrl)URL.revokeObjectURL(myUrl);myUrl=URL.createObjectURL(Speech.wav(pcm));render('busy');
  const tn=tonesOf(w),sf=TONES.surface(tn,w.s);let syl,heard=null,kind='f0';
  if(eng=='model'){try{const tg=targetsOf(w),out=await ENG.run(pcm.slice(),tg.map(x=>x||''));if(a!==att||dead)return;kind='model';
    syl=out.syl.map((x,k)=>{const tp=x.tone,got=tp.indexOf(Math.max(...tp))+1,e=sf[k];const top=x.top[0][0];
     const segOk=tg[k]&&x.known?(top==tg[k]||x.pTarget>=0.25):null,pSeg=segOk==null?null:Math.min(1,(x.pTarget||0)/0.5);
     const pT=e>=1&&e<=4?tp[e-1]:null,match=e==5?null:got==e||(e==3&&k<tn.length-1&&got==2&&tn[k+1]==3);
     return {expected:e,underlying:tn[k],got:got==5?null:got,match,segOk,pSeg,pT,heardSyl:segOk===false?mark(top,got):null,heardMark:mark(top,got)}});
    heard=syl.map(x=>x.heardMark).join(' ')}
   catch(e){eng='f0';toast('Mô hình lỗi trên máy này, dùng chấm thanh điệu cơ bản','info',3500)}}
  if(!syl){const an=TONES.analyse(pcm,16000,tn,w.s);if(!an.ok){render('err',{msg:an.reason,diag:LASTDIAG});return}syl=an.syl}
  const parts=syl.map(x=>{const t=x.match==null?null:(x.pT!=null?Math.max(x.match?1:0,Math.min(1,x.pT/0.6)):x.match?1:0),s=x.pSeg;return s==null?t:t==null?s:0.6*s+0.4*t}).filter(v=>v!=null);
  const score=parts.length?Math.round(100*parts.reduce((p,q)=>p+q,0)/parts.length):60;
  syl.forEach(x=>{x.cls=(x.segOk===false&&x.match===false)?'r':(x.segOk===false||x.match===false)?(x.segOk===false&&x.match==null?'r':'y'):(x.match==null&&x.segOk==null?'':'g')});
  const h=S.pron[w.id]=S.pron[w.id]||[];h.push({t:Date.now(),s:score,k:kind=='model'?'m':'t'});if(h.length>20)h.splice(0,h.length-20);S.speak[w.id]=Math.max(S.speak[w.id]||0,score);evidence(w,score>=60,'speak');logIt(false);save();
  render('result',{score,syl,heard,kind});$('#shist')&&($('#shist').innerHTML=hist(w));buzz(score>=85?[10,30,10]:10)}
 show();keys=e=>{if(e.target.tagName=='INPUT')return;if(e.key==' '&&$('#mic')){e.preventDefault();$('#mic').click()}else if(e.key=='ArrowRight')$('#next').click()};
 return ()=>{dead=true;att++;stop();if(myUrl)URL.revokeObjectURL(myUrl)}}
/* ---------- Settings > Kiểm tra micro: a 4 s capture through the same path, with a live meter and the numbers Darren can report ---------- */
async function micCheck(root){const out=$('#mcd',root),bar=$('#mcl',root),btn=$('#mcb',root);btn.disabled=true;let perm='không rõ';
 try{if(navigator.permissions&&navigator.permissions.query){const p=await navigator.permissions.query({name:'microphone'});perm={granted:'đã cho phép',denied:'đã chặn',prompt:'sẽ hỏi'}[p.state]||p.state}}catch(e){}
 out.textContent='Đang nghe 4 giây, hãy nói “mǎ shàng”…';let pk=0;
 try{const rec=await Speech.record({maxMs:4000,silenceMs:4000,onLevel:(v,rms)=>{pk=Math.max(pk,rms);bar.style.width=Math.round(v*100)+'%'}});const r=await rec.done;
  const d={...(r.diag||{}),sr:r.sr,dur:r.pcm.length/r.sr,why:r.why,speech:r.speech};LASTDIAG=d;
  let tr='';try{const s=await navigator.mediaDevices.enumerateDevices();tr=s.filter(x=>x.kind=='audioinput').length+' micro'}catch(e){}
  out.innerHTML=`<b>${d.speech?'Micro hoạt động: đã nghe thấy giọng nói':'Không phát hiện giọng nói'}</b><br>Quyền micro: ${esc(perm)} · ${esc(tr)}<br>${esc(diagText(d))}<br>Trình duyệt: ${esc(navigator.userAgent.replace(/^Mozilla\/5.0 /,''))}`}
 catch(e){out.innerHTML=`<b>Không mở được micro: ${esc(e&&e.name||'lỗi')}</b><br>Quyền micro: ${esc(perm)}. ${e&&e.name=='NotAllowedError'?'Trên iPhone: Cài đặt > Safari > Micrô, hoặc “aA” > Cài đặt trang web > Micrô > Cho phép.':''}`}
 btn.disabled=false;bar.style.width='0'}
/* ---------- writing: Hanzi Writer stroke order (watch) and quiz (practice; evidence only, never the schedule) ---------- */
function zhWrite(){const P=new URLSearchParams(location.hash.split('?')[1]||'');let d=deck().slice();let i=0,ci=0,mode='anim',hw=null,dead=false;
 const pw=P.get('w');if(pw){const k=d.findIndex(w=>w.id==pw);if(k>=0)i=k;else{const w=byId(pw);if(w){d=[w,...d];i=0}}}else d=shuffle(d);
 if(!d.length){view('Viết chữ',`${mascot('idle','Chưa có từ nào trong bộ này.')}`);return}
 const draw=()=>{const w=d[(i%d.length+d.length)%d.length],cs=[...w.w];if(P.get('c')&&pw===w.id){const k=cs.indexOf(P.get('c'));if(k>=0)ci=k;P.delete('c')}ci=Math.min(ci,cs.length-1);const ch=cs[ci],x=CH[ch]||CH[[...w.s][ci]]||{};
  view('Viết chữ',`<div class="card q center write" data-wid="${w.id}"><div class="kind">${esc(w.lv)} · ${esc(w.vi)}</div>
   <div class="chs">${cs.map((c,k)=>`<button class="chb ${k==ci?'on':''}" data-ci="${k}" aria-pressed="${k==ci}" lang="zh">${esc(c)}</button>`).join('')}</div>${pyHTML(w)}
   <div id="hw" class="hwbox" role="img" aria-label="Thứ tự nét chữ ${esc(ch)}"></div>
   <div class="segc" role="radiogroup" style="margin:12px auto"><button role="radio" aria-checked="${mode=='anim'}" class="${mode=='anim'?'on':''}" data-m="anim">Xem nét</button><button role="radio" aria-checked="${mode=='quiz'}" class="${mode=='quiz'?'on':''}" data-m="quiz">Tự viết</button></div>
   <p id="qs" class="muted" aria-live="polite"></p>
   <div class="wstat" style="text-align:left">${x.r?`<div><span class="muted">Bộ thủ</span><b lang="zh">${esc(x.r)}</b>${x.rv?`<small>${esc(x.rv)}</small>`:''}</div>`:''}${x.c?`<div><span class="muted">Cấu tạo</span><b lang="zh">${esc(x.c)}</b></div>`:''}${x.hv?`<div><span class="muted">Hán Việt${x.hvq?' (tham khảo)':''}</span><b>${esc(x.hv)}</b></div>`:''}</div>
   ${x.vi?`<p class="muted" style="text-align:left">${esc(x.vi)}</p>`:x.d?`<p class="muted" style="text-align:left">${esc(x.d)}</p>`:''}${x.mn?`<div class="sec tip" style="text-align:left">${I('lightbulb','s')}<div>${esc(x.mn)}</div></div>`:''}</div>
   <div class="row"><button class="btn sec" id="prev">Từ trước</button><button class="btn" id="next">Từ tiếp theo</button></div>
   <p class="hint">Nét chữ: Make Me a Hanzi (Arphic PL). Nghĩa chữ, bộ thủ, mẹo nhớ: Kai Hanzi (CC BY 4.0) khi có.</p>`);
  $('#prev').onclick=()=>{i--;ci=0;draw()};$('#next').onclick=()=>{i++;ci=0;draw()};$$('[data-ci]').forEach(b=>b.onclick=()=>{ci=+b.dataset.ci;draw()});$$('[data-m]').forEach(b=>b.onclick=()=>{mode=b.dataset.m;draw()});
  const box=$('#hw'),sz=Math.min(280,(box.parentElement.clientWidth||300)-32),css=getComputedStyle(document.body),col=n=>css.getPropertyValue(n).trim();
  if(typeof HanziWriter=='undefined'){$('#qs').textContent='Không tải được công cụ thứ tự nét.';return}
  hw=HanziWriter.create('hw',ch,{width:sz,height:sz,padding:10,showOutline:true,strokeColor:col('--text')||'#222',outlineColor:col('--line')||'#ddd',drawingColor:col('--primary')||'#2e6db4',highlightColor:col('--primary')||'#2e6db4',radicalColor:col('--danger')||'#b0413e',strokeAnimationSpeed:1.2,delayBetweenStrokes:180,
   charDataLoader:(c,ok,no)=>fetch('data/strokes/'+encodeURIComponent(c)+'.json').then(r=>{if(!r.ok)throw 0;return r.json()}).then(ok).catch(()=>{const q=$('#qs');if(q)q.textContent='Chưa có dữ liệu nét cho chữ này.';no&&no()})});
  if(mode=='anim')hw.loopCharacterAnimation();else{$('#qs').textContent='Viết từng nét theo đúng thứ tự. Sai 3 lần sẽ có gợi ý.';
   hw.quiz({showHintAfterMisses:3,onComplete:s=>{if(dead)return;const ok=s.totalMistakes<=2;$('#qs').textContent=`Xong chữ ${ch}: ${s.totalMistakes} lần sai nét.`;evidence(w,ok,'write');logIt(false);save();buzz(ok?[10,30,10]:20);
    if(ok)moodTo&&moodTo($('.mascot'),'correct')}})}};
 draw();keys=e=>{if(e.key=='ArrowRight')$('#next').click();else if(e.key=='ArrowLeft')$('#prev').click()};return ()=>{dead=true}}
const getJ=async u=>{const r=await fetch(u);if(!r.ok)throw new Error(u);return r.json()};
const mk=(a,L)=>a.map((x,j)=>({...x,L,w:x.s,ipa:x.p,vi:x.v||(x.m||[]).join('; '),pos:x.pos||'',lv:LVN(L),cefr:LVN(L),page:'hsk'+L,num:String(j).padStart(4,'0'),tags:[],ex:'',exvi:'',col:''}));
/* unlock state read before the core has loaded S (same key, or the old v2 key on first run) */
const unl0=()=>{try{const d=JSON.parse(localStorage.getItem('htt-core')||'null');if(d&&d.zhUnl)return d.zhUnl;const o=JSON.parse(localStorage.getItem(OLD_KEY)||'null');if(o&&o.unlocked)return Array.isArray(o.unlocked)?Object.fromEntries(o.unlocked.map(l=>[l,true])):o.unlocked}catch(e){}return {1:true}};
const loaded=new Set();async function ensureLevel(L){if(loaded.has(L)||words.some(w=>w.L==L)){loaded.add(L);return}loaded.add(L);try{const a=mk(await getJ(`data/hsk${L}.json`),L);for(const w of a){w.w=isTrad()?w.t:w.s;words.push(w);WMAP.set(w.id,w)}}catch(e){loaded.delete(L);toast('Không tải được '+LVN(L)+'. Kiểm tra mạng.','wifi-off',3500)}}
/* ---------- level unlocking (80% of the previous level graduated) ---------- */
function levelRatio(L){let n=0,g=0;for(const w of words){if(w.L!=L)continue;n++;const c=S.srs[w.id];if(c&&(c.state=='review'||c.state=='relearn'||(c.int||0)>=1))g++}return n?g/n:0}
function applyUnlocks(){const u=unl(),op=[];for(const L of LV.slice(1))if(!u[L]&&u[L-1]&&levelRatio(L-1)>=UNLOCK){u[L]=true;op.push(L)}if(op.length){save();Promise.all(op.map(ensureLevel)).then(()=>{if(!location.hash.replace(/^#\/?/,''))home()});setTimeout(()=>toast('Đã mở '+op.map(LVN).join(', '),'sparkles',3500),0)}return op}
window.LANG={key:'htt-core',app:'hoc-tieng-trung',audioCache:'htt-audio-v1',title:'Học Tiếng Trung',bringForward:false, /* strict rule: only Ôn theo lịch changes a schedule; practice records evidence only */
 setDefaults:{voice:'f',script:'s',py:'on',dir:'en',zhEngine:'model'},legacy:get=>{const r=get(OLD_KEY);if(!r)return null;try{return fromV2(JSON.parse(r))}catch(e){return null}},importAny:j=>j&&j.data&&j.data.srs&&j.data.revlog&&j.data.unlocked?fromV2(j.data):j&&j.srs&&j.unlocked?fromV2(j):j,
 async loadData(){const u=unl0();const need=LV.filter(L=>u[L]);const ls=await Promise.all(need.map(L=>getJ(`data/hsk${L}.json`)));
  fetch('data/chars.json').then(r=>r.ok?r.json():{}).then(c=>{CH=c}).catch(()=>{});
  const ws=[];ls.forEach((a,k)=>ws.push(...mk(a,need[k])));return {pages:LV.map(L=>({id:'hsk'+L,title:LVN(L),short:LVN(L)})),words:ws}},
 boot(){remap();const u=unl();return Promise.all(LV.filter(L=>u[L]).map(ensureLevel)).then(applyUnlocks)},inDeck:w=>!!unl()[w.L],levels:LV.map(LVN),levelName:'Cấp độ HSK',lvOrder:Object.fromEntries(LV.map(L=>[LVN(L),L])),
 aurl:(w,kind,v)=>`audio/hsk${w.L}/${v=='m'?'m':'f'}/w/${w.num}.mp3`,play:zhPlay,audioUrls:()=>words.filter(w=>hasRec(w)&&unl()[w.L]).map(w=>aurl(w,'w')),
 answerText:w=>w.w,norm:zhNorm,accepts,cloze:()=>null,ipaOf:w=>S.set.py=='off'?'':w.p,search:(w,q)=>{const n=zhNorm(strip(q));return !!n&&(w.s.includes(q.trim())||w.t.includes(q.trim())||strip(w.p).replace(/\s/g,'').includes(n)||(w.hv||'').includes(q.trim().toLowerCase()))},
 frontFace:front,backFace:back,wordExtra:extra,voices:[['f','Nữ'],['m','Nam']],
 settingsTop:seg=>`<div class="opt-row"><span>Chữ</span>${seg('script',[['s','Giản thể'],['t','Phồn thể']])}</div><div class="opt-row"><span>Pinyin</span>${seg('py',[['on','Hiện'],['off','Ẩn']])}</div>`,
 settingsPron:seg=>`<div class="eyebrow">Chấm phát âm</div><div class="group"><div class="opt-row"><span>Cách chấm</span>${seg('zhEngine',[['model','Mô hình (từng âm)'],['f0','Chỉ thanh điệu']])}</div>
  <div class="opt-row"><span>Mô hình trên máy <small class="muted" id="zms">…</small></span><button class="btn sm sec" id="zmd">${I('download','s')}Tải</button></div>
  <div style="padding:12px"><button class="btn sm sec" id="mcb">${I('mic','s')}Kiểm tra micro</button><div class="bar" style="margin:8px 0" aria-hidden="true"><i id="mcl" style="width:0"></i></div><p class="muted" id="mcd" style="font-size:var(--fs-xs)" aria-live="polite">${LASTDIAG?'Lần ghi gần nhất: '+esc(diagText(LASTDIAG)):'Bấm để ghi thử 4 giây và xem thông số micro.'}</p></div></div>`,
 bindSettings(sh){$('#mcb',sh)&&($('#mcb',sh).onclick=()=>micCheck(sh));const zs=$('#zms',sh),zb=$('#zmd',sh);if(zs&&ENG.supported()){ENG.status().then(st=>{zs.textContent=st.cached?'đã tải, dùng được offline':'chưa tải ('+MODEL_MB+' MB)';zb.innerHTML=st.cached?I('trash-2','s')+'Xoá':I('download','s')+'Tải';zb.onclick=async()=>{zb.disabled=true;if(st.cached){await ENG.forget();zs.textContent='đã xoá'}else{try{await ENG.load(m=>{zs.textContent=m.phase=='init'?'đang khởi động…':'đang tải '+Math.round(m.got/m.total*100)+'%'});S.set.zhEngine='model';save();zs.textContent='đã tải, dùng được offline'}catch(e){zs.textContent='lỗi tải, thử lại'}}zb.disabled=false}})}else if(zs){zs.textContent='trình duyệt không hỗ trợ';zb.disabled=true}$$('[data-set="script"],[data-set="py"]',sh).forEach(b=>b.addEventListener('click',()=>{remap();if(LANG.chip)LANG.chip.paint();setTimeout(route,0)}))},
 chip:{paint(){const b=$('#voice');b.textContent=isTrad()?'繁':'简';b.setAttribute('lang','zh');b.setAttribute('aria-label',(isTrad()?'Phồn thể':'Giản thể')+'. Bấm để đổi')},click(){S.set.script=isTrad()?'s':'t';save();remap();LANG.chip.paint();toast(isTrad()?'Chữ phồn thể':'Chữ giản thể','languages');buzz(8);route()}},
 onHome(){applyUnlocks()},homeChips(){const u=unl();return LV.map(L=>`<button class="chip ${F().cefr==LVN(L)?'on':''}" data-zl="${L}" aria-pressed="${F().cefr==LVN(L)}" ${u[L]?'':'aria-disabled="true"'}>${u[L]?'':I('lock','s')}${LVN(L)}</button>`).join('')},
 bindHome(){$$('[data-zl]').forEach(b=>b.onclick=()=>{const L=+b.dataset.zl;if(!unl()[L]){const r=Math.round(levelRatio(L-1)*100);toast(`${LVN(L)} mở khi 80% từ ${LVN(L-1)} đã qua bước học (hiện ${r}%)`,'lock',4000);return}F().cefr=F().cefr==LVN(L)?'':LVN(L);save();home();buzz(8)})},
 modes:{write:['pen-line','Viết chữ','Thứ tự nét, tự viết từng nét']},routes:{write:zhWrite},speak:zhSpeak,keys:{write:[['→','Từ tiếp'],['←','Từ trước']]},
 typePrompt:'Gõ chữ Hán hoặc pinyin',listenPrompt:'Gõ chữ Hán hoặc pinyin (không dấu cũng được)',matchWhat:'từ tiếng Trung',reversePrompt:'Từ tiếng Trung là gì?',searchPrompt:'Tìm chữ Hán, pinyin, Hán Việt hoặc nghĩa',
 planTitle:()=>'10.969 từ HSK 3.0 (cấp 1–9)',planSub:'Giọng đọc chuẩn, pinyin, thứ tự nét, mở dần theo cấp',
 credits:'Lõi Neko từ Học Từ Vựng v17 · Từ vựng HSK 3.0: complete-hsk-vocabulary (MIT) · Nghĩa tiếng Việt HSK 4–9: CVDICT (CC BY-SA 4.0) · Hán Việt, bộ thủ: Kai Hanzi (CC BY 4.0), Unihan · Nét chữ: Make Me a Hanzi (Arphic PL, LGPL) · Giọng đọc Microsoft Neural · Biểu tượng Lucide (ISC)',
 _fromV2:fromV2,_accepts:accepts};
})();
