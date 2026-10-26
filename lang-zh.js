/* Chinese (HSK 3.0) adapter for the shared Neko core (core/app-core.js). The core owns the UI, scheduling and storage;
   this file supplies data, answers, audio, the tone-based speaking mode and the stroke-order writing mode. See docs/ECOSYSTEM.md. */
(function(){'use strict';
const LV=[1,2,3,4,5,6,7],LVN=L=>L==7?'HSK 7–9':'HSK '+L,OLD_KEY='htt';
const TM={a:'āáǎàa',e:'ēéěèe',i:'īíǐìi',o:'ōóǒòo',u:'ūúǔùu',v:'ǖǘǚǜü'};
const strip=s=>String(s).replace(/[ǖǘǚǜüÜ]/g,'v').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ü/g,'v').toLowerCase();
const spoken=w=>{const p=w.p.split(/\s+/),n=w.n.split(/\s+/),out=[];n.forEach((s,i)=>{if(s=='r5'&&out.length)out[out.length-1].p+='r';else out.push({p:p[i],n:s})});return out};
const sylls=w=>spoken(w).map(s=>s.p),tonesOf=w=>TONES.toneNums(spoken(w).map(s=>s.n).join(' '));
let CH={},CURRICULA={editions:{}};const $q=(s,r=document)=>r.querySelector(s);
const editionKey=()=>CURRICULA.editions[S.set.curriculum]?S.set.curriculum:'hsk2021';
const edition=()=>CURRICULA.editions[editionKey()];
const curriculumLevel=(data,key,id)=>data.editions[key]?.members[id]||0;
const isTrad=()=>S.set.script=='t';
const remap=()=>{for(const w of words){w.w=isTrad()?w.t:w.s;w.L=curriculumLevel(CURRICULA,editionKey(),w.id)||w.baseL;w.lv=LVN(w.L);w.cefr=w.lv;w.page='hsk'+w.L}};
function chooseCurriculum(){const current=editionKey();const {close}=sheet(`<h2>Chọn danh mục từ</h2><p>Mọi cấp đều mở. Danh mục giúp chọn từ để học hoặc tra cứu; không bắt buộc học theo thứ tự.</p><div class="choice" role="group" aria-label="Phiên bản HSK">${Object.entries(CURRICULA.editions).map(([key,e])=>`<button class="radio ${key===current?'on':''}" aria-pressed="${key===current}" data-edition="${key}"><span><b>${esc(e.title)}</b><small>${Object.keys(e.members).length.toLocaleString('vi-VN')} thẻ${e.sourceRows?' · '+e.sourceRows.toLocaleString('vi-VN')+' mục trong đề cương':''}</small></span></button>`).join('')}</div><p class="muted">Các từ cùng cách đọc dùng chung tiến độ. Đổi danh mục không xóa lịch ôn, ghi chú hay từ đã gắn sao.</p>`,route);
 $$('[data-edition]').forEach(b=>b.onclick=()=>{S.set.curriculum=b.dataset.edition;save();remap();close()})}
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
const TN={1:['Thanh 1 (ngang)','Giữ giọng cao và tương đối đều (5-5). Các số chỉ mức cao độ tương đối trong giọng của bạn.','M10 22 L90 22'],2:['Thanh 2 (lên)','Từ khoảng giữa đi lên cao (3-5). Nghe hướng đi của cao độ; không quy đổi trực tiếp thành một dấu thanh tiếng Việt.','M10 50 Q55 45 90 18'],
 3:['Thanh 3 (thấp)','Khi đọc riêng có thể xuống thấp rồi lên (2-1-4). Trong câu thường chỉ xuống thấp; trước một thanh 3 khác thường chuyển thành thanh lên. Đường vẽ chỉ minh họa cách đọc riêng.','M10 44 Q40 82 60 74 T90 30'],4:['Thanh 4 (xuống)','Đi từ cao xuống thấp (5-1), tương đối nhanh. Không cần gằn giọng hoặc tạo cảm giác ra lệnh.','M10 16 L90 80'],5:['Thanh nhẹ','Ngắn, nhẹ, không nhấn; cao độ phụ thuộc âm tiết trước.','M45 56 L55 56']};
/* initials/finals with mouth-shape hints (articulation) */
const INI=['zh','ch','sh','b','p','m','f','d','t','n','l','g','k','h','j','q','x','r','z','c','s','y','w'];
const ART={zh:'Đầu lưỡi nâng về phía sau lợi trên, chặn rồi thả hơi qua khe hẹp; không bật hơi mạnh.',ch:'Vị trí lưỡi như zh, có luồng hơi bật ra rõ.',sh:'Đầu lưỡi nâng về phía sau lợi trên, hơi đi liên tục qua khe hẹp.',r:'Đầu lưỡi nâng về phía sau lợi trên, có rung dây thanh; không rung đầu lưỡi.',
 z:'Đầu lưỡi ở vùng răng–lợi, chặn rồi thả hơi qua khe hẹp; không bật hơi mạnh.',c:'Vị trí lưỡi như z, có luồng hơi bật ra rõ.',s:'Lưỡi gần vùng răng–lợi, hơi đi qua khe hẹp liên tục.',j:'Phần trước mặt lưỡi nâng gần ngạc cứng, đầu lưỡi ở sau răng dưới; chặn rồi thả, không bật hơi mạnh.',q:'Vị trí lưỡi như j, có luồng hơi bật ra rõ.',x:'Phần trước mặt lưỡi nâng gần ngạc cứng, đầu lưỡi ở sau răng dưới; hơi đi liên tục qua khe hẹp.',
 b:'Khép rồi mở hai môi; âm tắc vô thanh, không bật hơi mạnh.',p:'Khép rồi mở hai môi, bật ra một luồng hơi rõ. Có thể thử với mẩu giấy trước miệng.',d:'Đầu lưỡi chạm vùng răng–lợi rồi thả; âm tắc vô thanh, không bật hơi mạnh.',t:'Vị trí lưỡi như d, có luồng hơi bật ra rõ.',g:'Phần sau lưỡi chạm ngạc mềm rồi thả; không bật hơi mạnh.',k:'Vị trí lưỡi như g, có luồng hơi bật ra rõ.',h:'Phần sau lưỡi gần ngạc mềm; hơi xát qua khe hẹp, không đóng kín như g/k.',
 m:'Hai môi khép, hơi đi qua mũi.',f:'Răng trên gần môi dưới, hơi xát qua khe hẹp.',n:'Đầu lưỡi chạm lợi, hơi đi qua mũi.',l:'Đầu lưỡi chạm lợi, hơi đi hai bên lưỡi.',y:'Ký hiệu đầu âm tiết trong pinyin; xem cả vần đi kèm, chẳng hạn yi và yu có khẩu hình khác nhau.',w:'Ký hiệu đầu âm tiết trong pinyin; môi tròn khi chuyển vào vần.'};
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
/* Versioned audio assets are bound to word IDs during the data build. */
let zhVoice=null;const pickVoice=()=>{try{const vs=speechSynthesis.getVoices().filter(v=>/^zh[-_](CN|Hans)/i.test(v.lang)||v.lang=='zh-CN');zhVoice=vs.find(v=>/Tingting|Xiaoxiao|Google/.test(v.name))||vs[0]||null}catch(e){}};
try{if(typeof speechSynthesis!='undefined'){speechSynthesis.onvoiceschanged=pickVoice;pickVoice()}}catch(e){}
const hasRec=w=>!!w.a;
function zhPlay(w,kind,opt){if(hasRec(w))return false;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(w.s);u.lang='zh-CN';if(zhVoice)u.voice=zhVoice;u.rate=(opt.slow??S.set.slow)?0.55:0.85;speechSynthesis.speak(u)}catch(e){toast('Thiết bị không có giọng đọc tiếng Trung','volume-x')}return true}
/* ---------- on-device syllable + tone model (zh-asr-worker.js), lazy: downloaded only when the learner asks ---------- */
const ENG=typeof ZhEngine!=='undefined'?ZhEngine:null;
const MODEL_MB=44;
const sylBase=s=>s.toLowerCase().replace(/[1-5]$/,'').replace(/u:|ü/g,'v');

const TMK={a:'āáǎà',e:'ēéěè',i:'īíǐì',o:'ōóǒò',u:'ūúǔù',v:'ǖǘǚǜ'};
function mark(b,t){if(!b)return '?';if(t<1||t>4)return b;const s=b.replace('v','ü');const v=/a|e/.exec(s)||/ou/.exec(s)||/[iouü](?!.*[aeiouü])/.exec(s);if(!v)return s;const c=v[0][0]=='o'&&v[0]=='ou'?'o':v[0];const k=c=='ü'?'v':c;const i=s.indexOf(c,v.index);return s.slice(0,i)+TMK[k][t-1]+s.slice(i+1)}
/* last capture diagnostics, shown in Settings > Kiểm tra micro and under errors */
let LASTDIAG=null;
function diagText(d){if(!d)return '';return `tốc độ mẫu ${d.sr||'?'} Hz · ${(d.dur||0).toFixed(1)} s · đỉnh ${(d.peak||0).toFixed(3)} · nền ${(d.floor||0).toFixed(4)} · ngưỡng ${(d.thr||0).toFixed(4)} · khối ${d.calls||0}/${d.nonzero||0} có tín hiệu · kết thúc: ${d.why||'?'}`}
/* Recording, self-comparison and optional on-device recognition. */
function zhSpeak(){
 const d=deck().filter(w=>spoken(w).length<=4);
 let q=shuffle(d),i=0,attempt=0,rec=null,cancel=null,meter=null,my=null,myUrl=null,minePlayer=null,dead=false,slow=false,engine='self',playback=0,endCompare=null;
 const requested=new URLSearchParams(location.hash.split('?')[1]||'').get('w');
 if(requested){const word=byId(requested);if(word&&spoken(word).length<=4)q=[word,...q.filter(w=>w.id!==word.id)]}
 if(!q.length){view('Luyện nói','<p>Chưa có từ phù hợp trong bộ đang chọn.</p>');return}
 function stopPlayback(){playback++;endCompare?.();endCompare=null;audio.pause();minePlayer?.pause()}
 function stop(){stopPlayback();cancel?.abort();cancel=null;rec?.stop('cancelled');rec=null;meter?.stop();meter=null;minePlayer=null}
 function release(){if(myUrl)URL.revokeObjectURL(myUrl);myUrl=null;my=null}
 function history(w){const n=(S.pron[w.id]||[]).length;return n?`<small class="muted">${n>=20?'20 lượt luyện gần đây':n+' lượt luyện'}</small>`:''}
 async function show(){
  const a=++attempt;stop();release();const w=q[i%q.length];
  view('Luyện nói',`<div class="card q center zh-speak" data-wid="${esc(w.id)}"><div class="kind">Từ ${i%q.length+1} / ${q.length}</div>${hzW(w)}${S.set.py=='off'?'<button class="btn sm sec" id="shp">Hiện pinyin</button>':pyHTML(w)}
   <p class="muted zh-speak-meaning">${esc(w.vi)}</p><div class="audiobar">${auBtns(w,false)}</div>
   <div id="sarea"></div><div id="shist">${history(w)}</div></div>
   <div class="row"><button class="btn sec" id="prev" ${i?'':'disabled'}>Từ trước</button><button class="btn" id="next">Từ tiếp theo</button></div>
   <button class="text-link zh-speech-help" id="speech-help">Về phản hồi phát âm</button>`);
  $('#prev').onclick=()=>{i=Math.max(0,i-1);show()};$('#next').onclick=()=>{i++;show()};
  if($('#shp'))$('#shp').onclick=e=>{e.currentTarget.outerHTML=pyHTML(w,null,true)};
  $('#speech-help').onclick=()=>sheet(`<h2>Luyện nói theo cách của bạn</h2><p>Nghe mẫu, ghi âm, rồi nghe lại để tự so sánh. Bấm vào pinyin để xem gợi ý cách đọc.</p><p>Phản hồi của máy là gợi ý nhận dạng, không phải điểm phát âm. Máy có thể nhận nhầm; “chưa nhận rõ” không có nghĩa là bạn đọc sai. Chưa có kiểm chứng riêng trên người Việt học tiếng Trung.</p><p>Mô hình hiện chưa phân biệt chắc chắn u/ü sau n, l; chưa đánh giá đuôi r và thanh nhẹ. Không dùng cao độ đơn thuần để chấm đúng/sai.</p><p>Bản ghi chỉ nằm trong bộ nhớ khi bạn luyện từ này. Giọng nói không gửi đi; lịch ôn không thay đổi. Bạn có thể chọn chỉ nghe lại trong Cài đặt.</p>`);
  render('checking');
  if(S.set.autoplay)play(w);
  const status=ENG.supported()&&S.set.zhEngine!=='f0'?await ENG.status():{cached:false,ready:false};
  if(a!==attempt||dead)return;
  engine=status.cached||status.ready?'model':'self';
  render(engine==='model'||S.set.zhEngine==='f0'||!ENG.supported()?'ready':'offer');
 }
 function render(state,data={}){
  const b=$('#sarea');if(!b||dead)return;const w=q[i%q.length];b.dataset.state=state;
  $$('[data-au]',document.getElementById('app')).forEach(button=>{button.disabled=['rec','busy'].includes(state)});
  const mic=(label='Bấm để nói')=>`<button class="mic" id="mic" aria-label="${label}">${I('mic','xl')}</button>`;
  if(state==='checking')b.innerHTML='<p class="muted" role="status">Đang chuẩn bị…</p>';
  else if(state==='offer')b.innerHTML=`${mic()}<p class="muted">Nghe mẫu, rồi ghi âm để nghe lại.</p><button class="btn sm sec" id="dlm">${I('download','s')}Thêm gợi ý từ máy · ${MODEL_MB} MB</button><p class="zh-local-note">Giọng nói chỉ xử lý trên thiết bị.</p>`;
  else if(state==='dl')b.innerHTML=`<p role="status">${data.phase==='init'?'Đang chuẩn bị mô hình…':`Đang tải… ${data.pct||0}%`}</p><div class="bar" role="progressbar" aria-label="Tải mô hình" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${data.pct||0}"><i style="width:${data.pct||0}%"></i></div>`;
  else if(state==='ready')b.innerHTML=`${mic()}<p class="muted">Bấm để nói. Tự dừng khi bạn nói xong.</p>`;
  else if(state==='rec')b.innerHTML=`<div class="recw perm" id="recw"><button class="mic rec" id="mic" aria-label="Hủy mở micro"><span class="ring" aria-hidden="true"></span>${I('square','xl')}</button><canvas class="wave" id="wave" aria-hidden="true"></canvas><div class="tailbar" aria-hidden="true"><i></i></div><p class="rst" id="rst" role="status">Đang mở micro…</p><p class="zh-rec-meta"><span id="record-time" aria-hidden="true">0.0 s</span><span> · Bấm để dừng</span></p></div>`;
  else if(state==='busy')b.innerHTML='<div class="spin" aria-hidden="true"></div><p role="status">Đang nghe lại bản ghi…</p>';
  else if(state==='err')b.innerHTML=`${mic('Thử ghi lại')}<p role="status">${esc(data.msg)}</p>`;
  else if(state==='result')b.innerHTML=resultHTML(w,data);
  if($('#mic'))$('#mic').onclick=()=>{if(state==='rec'){if(rec)rec.stop();else{attempt++;stop();render('ready')}}else start(w)};
  if($('#again'))$('#again').onclick=()=>start(w);
  if($('#dlm'))$('#dlm').onclick=download;
  if(state==='result'){
   $('#pm').onclick=()=>playMine();$('#pn').onclick=()=>{stopPlayback();play(w,'w',{slow})};
   $('#pb').onclick=async()=>{stopPlayback();const a=attempt,version=playback;play(w,'w',{slow});
    await new Promise(resolve=>{const done=()=>{clearTimeout(timer);audio.removeEventListener('ended',done);audio.removeEventListener('error',done);if(endCompare===done)endCompare=null;resolve()};const timer=setTimeout(done,8000);endCompare=done;audio.addEventListener('ended',done,{once:true});audio.addEventListener('error',done,{once:true})});
    if(a===attempt&&version===playback&&!dead)playMine();
   };
   $('#sl').onclick=e=>{slow=!slow;e.currentTarget.setAttribute('aria-pressed',String(slow));e.currentTarget.classList.toggle('on',slow)};
  }
 }
 function playMine(){stopPlayback();if(!myUrl)return;minePlayer=new Audio(myUrl);minePlayer.playbackRate=slow?.75:1;minePlayer.play().catch(()=>toast('Chưa phát được bản ghi. Hãy thử lại.','volume-x'))}
 async function download(){const a=attempt;render('dl');
  try{await ENG.load(m=>{if(a===attempt&&!dead)render('dl',{pct:m.phase==='init'?100:Math.min(99,Math.round(m.got/m.total*100)),phase:m.phase})});
   if(a!==attempt||dead)return;S.set.zhEngine='model';save();engine='model';render('ready');
  }catch(e){if(a!==attempt||dead)return;render('offer');toast('Chưa tải được mô hình. Bạn vẫn có thể ghi âm và nghe lại.','wifi-off',4000)}
 }
 function resultHTML(w,{feedback,notice}){
  let html=`<p class="zh-result-title" role="status">${feedback?'Nghe lại và đối chiếu':'Đã ghi âm'}</p>`;
  if(feedback){const labels={matched:'Máy nhận gần mẫu',syllable:'Nhận ra âm · chưa xét thanh nhẹ',compare:'Nên nghe đối chiếu',unclear:'Máy chưa nhận rõ',unsupported:'Âm này chưa được hỗ trợ'};
   html+=`<ul class="zh-feedback">${feedback.map((r,k)=>`<li><span lang="zh-Latn">${esc(sylls(w)[k])}</span><span>${labels[r.state]}${r.state==='compare'&&r.heard?`<small>Máy nghe gần ${esc(mark(r.heard,r.got||5))}</small>`:''}</span></li>`).join('')}</ul>`;
  }
  if(notice)html+=`<p class="muted">${esc(notice)}</p>`;
  return html+`<div class="row wrap3 zh-playback"><button class="btn sm sec" id="pn">${I('volume-2','s')}Mẫu</button><button class="btn sm sec" id="pm">${I('play','s')}Giọng bạn</button><button class="btn sm sec" id="pb">${I('repeat','s')}Mẫu rồi bạn</button><button class="btn sm sec" id="sl" aria-pressed="${slow}">${I('turtle','s')}Chậm</button></div><button class="btn" id="again">${I('mic','s')}Ghi lại</button>`;
 }
 async function start(w){
  const a=++attempt;stop();release();audio.pause();try{speechSynthesis.cancel()}catch(e){}
  if(!navigator.mediaDevices?.getUserMedia){render('err',{msg:'Trình duyệt chưa mở được micro. Hãy mở trang bằng HTTPS hoặc thử trình duyệt khác.'});return}
  cancel=new AbortController();render('rec');meter=micMeter($('#wave'),$('#recw .ring'),$('#record-time'));
  const visual=meter;let capture;
  try{capture=await Speech.record({signal:cancel.signal,maxMs:8000,silenceMs:1200,
   onLevel:v=>{if(a===attempt&&!dead)visual.push(v)},
   onState:(k,p)=>{if(a!==attempt||dead)return;const box=$('#recw'),text=$('#rst');if(!box||!text)return;
    if(k==='tailp'){box.style.setProperty('--tp',p.toFixed(3));return}
    box.className='recw '+k;text.textContent={perm:'Đang mở micro…',listen:'Micro đã sẵn sàng — mời bạn nói',quiet:'Chưa nhận được tiếng. Hãy nói gần micro hơn.',voice:'Đang thu giọng bạn',tail:'Đang chờ bạn nói hết…'}[k]||'';
    $('#mic').setAttribute('aria-label',k==='perm'?'Hủy mở micro':'Dừng ghi âm');
   }});
  }catch(e){visual.stop();if(a===attempt&&!dead&&e.name!=='AbortError')render('err',{msg:e.name==='NotAllowedError'?'Chưa có quyền micro. Hãy cho phép micro trong cài đặt của trình duyệt.':'Không mở được micro. Hãy kiểm tra thiết bị rồi thử lại.'});return}
  if(a!==attempt||dead){capture.stop('cancelled');visual.stop();return}rec=capture;
  const r=await capture.done;visual.stop();if(a!==attempt||dead)return;rec=null;cancel=null;
  LASTDIAG={...r.diag,sr:r.sr,dur:r.pcm.length/r.sr,why:r.why,speech:r.speech,at:Date.now()};
  try{sessionStorage.zhDiag=JSON.stringify(LASTDIAG)}catch(e){}
  if(r.why==='dead'||r.why==='ended'){render('err',{msg:'Micro đã ngắt hoặc không gửi âm thanh. Hãy kiểm tra micro rồi thử lại.'});return}
  const pcm=Speech.trim(Speech.to16k(r.pcm,r.sr));
  if(!r.speech||pcm.length<3200||Speech.peak(pcm)<.02){render('err',{msg:'Chưa nhận được giọng nói rõ. Hãy nói gần micro hơn rồi thử lại.'});return}
  my=pcm;myUrl=URL.createObjectURL(Speech.wav(pcm));
  let feedback=null,notice=null;
  if(r.diag.clipped>.02)notice='Âm thanh bị vỡ. Thử đặt micro xa hơn một chút.';
  else if(engine==='model'){
   render('busy');try{const targets=spoken(w).map(x=>ZhPron.target(x.n)||'');const output=await ENG.run(pcm.slice(),targets);
    if(a!==attempt||dead)return;const underlying=tonesOf(w);
    feedback=ZhPron.feedback({syllables:spoken(w).map(x=>x.n),underlying,expected:TONES.surface(underlying,w.s),erhua:w.n.split(/\s+/).includes('r5')},output);
   }catch(e){if(a!==attempt||dead)return;notice='Máy chưa phân tích được. Bạn vẫn có thể nghe lại bản ghi.'}
  }
  const h=S.pron[w.id]=S.pron[w.id]||[];h.push({t:Date.now(),k:feedback?'recognition':'listen',v:2});if(h.length>20)h.splice(0,h.length-20);
  logIt(false);save();render('result',{feedback,notice});$('#shist').innerHTML=history(w);
 }
 const reference=event=>{if(event.target.closest('[data-au]'))stopPlayback()};addEventListener('click',reference,true);
 const pause=()=>{stopPlayback();if(rec||cancel){attempt++;stop();if(!dead)render('ready')}};
 const overlay=new MutationObserver(()=>{if(!$('#sheet').classList.contains('hidden'))pause()});overlay.observe($('#sheet'),{attributes:true,attributeFilter:['class']});
 const visibility=()=>{if(document.hidden)pause()};document.addEventListener('visibilitychange',visibility);addEventListener('pagehide',pause);
 show();keys=e=>{if(/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName))return;if(e.key===' '){const b=$('#mic')||$('#again');if(b){e.preventDefault();b.click()}}else if(e.key==='ArrowRight')$('#next')?.click()};
 return ()=>{dead=true;attempt++;stop();release();overlay.disconnect();removeEventListener('click',reference,true);document.removeEventListener('visibilitychange',visibility);removeEventListener('pagehide',pause)};
}

/* ---------- Settings > Kiểm tra micro: a 4 s capture through the same path, with a live meter and the numbers Darren can report ---------- */
async function micCheck(root){const out=$('#mcd',root),bar=$('#mcl',root),btn=$('#mcb',root);
 if(!navigator.mediaDevices?.getUserMedia||!(window.AudioContext||window.webkitAudioContext)){out.textContent='Trình duyệt này chưa hỗ trợ kiểm tra micro. Hãy dùng trình duyệt khác hoặc mở trang bằng HTTPS.';return}
 const abort=new AbortController(),ac=Speech.prime();btn.disabled=true;let perm='không rõ';
 const cancel=()=>abort.abort(),hidden=()=>{if(document.hidden)cancel()},observer=new MutationObserver(()=>{if(root.classList.contains('hidden')||!root.contains(btn))cancel()});observer.observe(root,{attributes:true,childList:true});addEventListener('hashchange',cancel);addEventListener('pagehide',cancel);document.addEventListener('visibilitychange',hidden);
 try{if(navigator.permissions&&navigator.permissions.query){const p=await navigator.permissions.query({name:'microphone'});perm={granted:'đã cho phép',denied:'đã chặn',prompt:'sẽ hỏi'}[p.state]||p.state}}catch(e){}
 out.textContent='Đang nghe 4 giây, hãy nói “mǎ shàng”…';let pk=0;
 try{const rec=await Speech.record({ac,signal:abort.signal,maxMs:4000,silenceMs:4000,onLevel:(v,rms)=>{pk=Math.max(pk,rms);bar.style.width=Math.round(v*100)+'%'}});const r=await rec.done;
  const d={...(r.diag||{}),sr:r.sr,dur:r.pcm.length/r.sr,why:r.why,speech:r.speech};LASTDIAG=d;
  let tr='';try{const s=await navigator.mediaDevices.enumerateDevices();tr=s.filter(x=>x.kind=='audioinput').length+' micro'}catch(e){}
  out.innerHTML=`<b>${d.speech?'Micro hoạt động: đã nghe thấy giọng nói':'Không phát hiện giọng nói'}</b><br>Quyền micro: ${esc(perm)} · ${esc(tr)}<br>${esc(diagText(d))}<br>Trình duyệt: ${esc(navigator.userAgent.replace(/^Mozilla\/5.0 /,''))}`}
 catch(e){out.innerHTML=`<b>Không mở được micro: ${esc(e&&e.name||'lỗi')}</b><br>Quyền micro: ${esc(perm)}. ${e&&e.name=='NotAllowedError'?'Trên iPhone: Cài đặt > Safari > Micrô, hoặc “aA” > Cài đặt trang web > Micrô > Cho phép.':''}`}
 btn.disabled=false;bar.style.width='0';observer.disconnect();removeEventListener('hashchange',cancel);removeEventListener('pagehide',cancel);document.removeEventListener('visibilitychange',hidden)}
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
function readingTokens(text,inventory){const trie=new Map();for(const w of inventory)for(const form of new Set([w.s,w.t])){let node=trie;for(const c of form){if(!node.has(c))node.set(c,new Map());node=node.get(c)}if(!node.has(''))node.set('',new Set());node.get('').add(w.id)}
 const chars=Array.from(text),out=[];let i=0;while(i<chars.length){let node=trie,best=null,j=i;while(j<chars.length&&node.has(chars[j])){node=node.get(chars[j++]);if(node.has(''))best={end:j,ids:[...node.get('')]}}
  if(best){out.push({text:chars.slice(i,best.end).join(''),ids:best.ids});i=best.end}else{const prev=out[out.length-1];if(prev&&!prev.ids)prev.text+=chars[i++];else out.push({text:chars[i++]})}}return out}
let readingText='';
function showReadingWords(ids){const found=ids.map(byId).filter(Boolean);sheet(`<h2>Chọn nghĩa theo ngữ cảnh</h2>${found.map(w=>`<section class="card zh-reading-word" data-wid="${esc(w.id)}"><div class="row"><b class="hz" lang="zh">${esc(w.w)}</b>${starBtn(w)}${auBtns(w,false)}</div>${pyHTML(w,null,true)}<p>${esc(w.vi)}</p>${w.vd?`<p class="muted">${esc(w.vd)}</p>`:''}<small>${esc(w.lv)} · Gắn sao để tự chọn từ luyện sau.</small></section>`).join('')}`)}
function zhRead(){
 const inventory=words.filter(w=>LANG.inDeck(w));let tokens=[];
 view('Đọc đoạn tự chọn',`<form id="zh-reader-form" class="zh-reader-form"><div class="zh-reader-label"><label for="zh-text">Đoạn tiếng Trung</label><small id="zh-count">${readingText.length.toLocaleString('vi-VN')} / 12.000</small></div>
  <textarea id="zh-text" rows="6" maxlength="12000" lang="zh" spellcheck="false" placeholder="Dán hoặc viết đoạn bạn muốn đọc…" aria-describedby="zh-count">${esc(readingText)}</textarea>
  <div class="zh-reader-tools"><small>Chỉ ở trên thiết bị này</small><button class="btn" id="zh-read" type="submit">${I('search','s')}Tra từ</button></div></form>
  <div id="zh-reading" class="card zh-reading" lang="zh" hidden></div>
  <label for="zh-lookup" class="zh-lookup-label">Tra riêng một từ</label><div class="zh-search">${I('search')}<input id="zh-lookup" type="search" placeholder="Chữ Hán, pinyin hoặc nghĩa tiếng Việt" autocomplete="off" spellcheck="false"></div>
  <p id="zh-found-status" class="muted" role="status"></p><div id="zh-found" class="list"></div>
  <details class="zh-reader-help"><summary>Cách dùng</summary><p>Bấm vào từ trong đoạn để xem cách đọc và nghĩa. Công cụ tìm theo danh mục đang chọn, có thể tách từ chưa đúng; bạn có thể tra riêng một cụm.</p><p>Nội dung chỉ giữ trong bộ nhớ trang, không gửi đi hay lưu vào hồ sơ. Đọc và gắn sao không thay đổi lịch ôn.</p></details>`);
 const input=$('#zh-text'),button=$('#zh-read'),result=$('#zh-reading');
 const update=()=>{readingText=input.value.slice(0,12000);$('#zh-count').textContent=readingText.length.toLocaleString('vi-VN')+' / 12.000';button.disabled=!readingText.trim()};
 const render=()=>{update();tokens=readingTokens(readingText,inventory);result.innerHTML=tokens.map((t,i)=>t.ids?`<button class="zh-token" data-token="${i}" aria-label="Tra ${esc(t.text)}">${esc(t.text)}</button>`:esc(t.text)).join('');result.hidden=!readingText.trim()};
 $('#zh-reader-form').onsubmit=e=>{e.preventDefault();render()};input.oninput=()=>{update();result.hidden=true};
 result.onclick=e=>{const b=e.target.closest('[data-token]');if(b)showReadingWords(tokens[+b.dataset.token].ids)};
 $('#zh-lookup').oninput=e=>{const query=e.target.value.trim();const found=query?inventory.filter(w=>w.s.includes(query)||w.t.includes(query)||LANG.search(w,query)||norm(w.vi).includes(norm(query))).slice(0,30):[];
  $('#zh-found-status').textContent=query?(found.length?`${found.length===30?'Hiện 30':found.length} kết quả`:'Chưa tìm thấy trong danh mục đang chọn.'):'';
  $('#zh-found').innerHTML=found.map((w,i)=>`<button class="it zh-lookup-word" data-found="${i}"><span lang="zh">${esc(w.w)}</span><span>${esc(w.p)} · ${esc(w.vi)}</span></button>`).join('');
  $('#zh-found').onclick=ev=>{const b=ev.target.closest('[data-found]');if(b)showReadingWords([found[+b.dataset.found].id])};
 };
 update();if(readingText.trim())render();
}

function zhGuide(){view('Chọn cách học phù hợp',`<section class="card zh-guide"><h2>Bắt đầu từ việc bạn muốn làm</h2><p>Bạn có thể chọn một cấp HSK, tìm từ cho công việc, đọc một đoạn yêu thích hoặc chỉ ôn từ đã gặp. Không cần hoàn thành cấp trước mới được mở cấp sau.</p><h2>Nhớ từ và dùng được từ là hai việc khác nhau</h2><p>Thẻ nhớ giúp luyện nhận ra và nhớ lại từ. Để dùng từ, hãy nghe hoặc đọc trong ngữ cảnh, thử nói hay viết một câu, rồi đối chiếu với nguồn đáng tin hoặc người có chuyên môn.</p><h2>Ôn cách quãng, tự điều chỉnh lượng học</h2><p>Trong Ôn theo lịch, thử nhớ trước khi xem đáp án và tự đánh giá đúng mức. Nghiên cứu nhìn chung ủng hộ ôn cách quãng, nhưng không xác định một số từ mỗi ngày tốt nhất cho mọi người. Bạn có thể đổi mục tiêu bất cứ lúc nào; không có cam kết số phút hoặc thời gian đạt trình độ.</p><h2>Dùng phản hồi phát âm để tham khảo</h2><p>Giọng mẫu tổng hợp và nhận dạng trên máy có thể sai, nhất là từ ngắn, âm nhẹ, âm cuốn lưỡi và ngữ cảnh đặc biệt. Phản hồi của máy không phải chứng chỉ phát âm. Đối chiếu cách đọc và nghĩa, nghe nhiều người nói và nhờ giáo viên khi cần.</p><h2>Nguồn và giới hạn</h2><p><a href="https://doi.org/10.1111/lang.12479" target="_blank" rel="noopener">Kim &amp; Webb (2022): tổng hợp nghiên cứu ôn cách quãng</a> · <a href="https://doi.org/10.1017/s0272263124000706" target="_blank" rel="noopener">Rogers và cộng sự (2025): thực nghiệm trực tuyến</a>. Kết quả ở nhóm người học khác chưa chứng minh hiệu quả riêng của ứng dụng này.</p><p><a href="https://hanyu.pku.edu.cn/xzky/kycg/366311.htm" target="_blank" rel="noopener">Boya của Đại học Bắc Kinh</a> kết hợp các kỹ năng; mô tả giáo trình là tài liệu tham khảo thiết kế, không phải kết quả thử nghiệm ứng dụng. Nghĩa Việt được biên soạn và đối chiếu từ điển, chưa được giáo viên song ngữ duyệt toàn bộ.</p><a class="btn" href="#/reader">Đọc một đoạn bạn tự chọn</a></section>`)}
const mk=(a,L)=>a.map(x=>({...x,L,baseL:L,w:x.s,ipa:x.p,vi:x.v||(x.m||[]).join('; '),pos:x.pos||'',lv:LVN(L),cefr:LVN(L),page:'hsk'+L,tags:[],ex:x.ex||'',exvi:x.exvi||'',col:x.col||''}));
window.LANG={key:'htt-core',app:'hoc-tieng-trung',audioCache:'htt-audio-v1',title:'Học Tiếng Trung',bringForward:false, /* strict rule: only Ôn theo lịch changes a schedule; practice records evidence only */
 setDefaults:{voice:'f',script:'s',py:'on',dir:'en',zhEngine:'model',curriculum:'hsk2021'},legacy:get=>{const r=get(OLD_KEY);if(!r)return null;try{return fromV2(JSON.parse(r))}catch(e){return null}},importAny:j=>j&&j.data&&j.data.srs&&j.data.revlog&&j.data.unlocked?fromV2(j.data):j&&j.srs&&j.unlocked?fromV2(j):j,
 async loadData(){const [ls,supplement,index]=await Promise.all([Promise.all(LV.map(L=>getJ(`data/hsk${L}.json`))),getJ('data/hsk-extra.json'),getJ('data/curricula.json')]);CURRICULA=index;
  fetch('data/chars.json').then(r=>r.ok?r.json():{}).then(c=>{CH=c}).catch(()=>{});
  const ws=[];ls.forEach((a,k)=>ws.push(...mk(a,LV[k])));ws.push(...supplement.flatMap(x=>mk([x],index.editions.hsk2025.members[x.id])));return {pages:LV.map(L=>({id:'hsk'+L,title:LVN(L),short:LVN(L)})),words:ws}},
 boot(){remap()},levels:LV.map(LVN),levelName:'Cấp độ HSK',lvOrder:Object.fromEntries(LV.map(L=>[LVN(L),L])),
 inDeck:w=>!!curriculumLevel(CURRICULA,editionKey(),w.id),
 aurl:(w,kind,v)=>'audio/'+w.a.replace('{voice}',v=='m'?'m':'f'),play:zhPlay,audioUrls:()=>deck().filter(hasRec).map(w=>aurl(w,'w')),
 answerText:w=>w.w,norm:zhNorm,accepts,cloze:()=>null,ipaOf:w=>S.set.py=='off'?'':w.p,search:(w,q)=>{const n=zhNorm(strip(q));return !!n&&(w.s.includes(q.trim())||w.t.includes(q.trim())||strip(w.p).replace(/\s/g,'').includes(n)||(w.hv||'').includes(q.trim().toLowerCase()))},
 frontFace:front,backFace:back,wordExtra:extra,voices:[['f','Nữ'],['m','Nam']],
 settingsTop:seg=>`<div class="opt-row"><span>Chữ</span>${seg('script',[['s','Giản thể'],['t','Phồn thể']])}</div><div class="opt-row"><span>Pinyin</span>${seg('py',[['on','Hiện'],['off','Ẩn']])}</div>`,
 settingsPron:seg=>`<div class="eyebrow">Luyện nói</div><div class="group"><div class="opt-row"><span>Phản hồi</span>${seg('zhEngine',[['model','Gợi ý từ máy'],['f0','Tự nghe lại']])}</div>
  <div class="opt-row"><span>Mô hình trên máy <small class="muted" id="zms">…</small></span><button class="btn sm sec" id="zmd">${I('download','s')}Tải</button></div>
  <div style="padding:12px"><button class="btn sm sec" id="mcb">${I('mic','s')}Kiểm tra micro</button><div class="bar" style="margin:8px 0" aria-hidden="true"><i id="mcl" style="width:0"></i></div><p class="muted" id="mcd" style="font-size:var(--fs-xs)" aria-live="polite">${LASTDIAG?'Lần ghi gần nhất: '+esc(diagText(LASTDIAG)):'Bấm để ghi thử 4 giây và xem thông số micro.'}</p></div></div>`,
 bindSettings(sh){
  if($('#mcb',sh))$('#mcb',sh).onclick=()=>micCheck(sh);
  const status=$('#zms',sh),button=$('#zmd',sh);
  async function refresh(){
   const state=await ENG.status();if(!sh.contains(button))return;
   status.textContent=state.cached?'đã tải, dùng được offline':'chưa tải ('+MODEL_MB+' MB)';
   button.innerHTML=state.cached?I('trash-2','s')+'Xoá':I('download','s')+'Tải';
   button.onclick=async()=>{button.disabled=true;
    try{if(state.cached)await ENG.forget();else{await ENG.load(m=>{status.textContent=m.phase==='init'?'đang chuẩn bị…':'đang tải '+Math.round(m.got/m.total*100)+'%'});S.set.zhEngine='model';save()}await refresh()}
    catch(e){status.textContent='chưa tải được, thử lại'}finally{button.disabled=false}
   };
  }
  if(status&&ENG.supported())refresh();else if(status){status.textContent='trình duyệt không hỗ trợ';button.disabled=true}
  $$('[data-set="script"],[data-set="py"]',sh).forEach(b=>b.addEventListener('click',()=>{remap();if(LANG.chip)LANG.chip.paint();setTimeout(route,0)}));
 },
 chip:{paint(){const b=$('#voice');b.textContent=isTrad()?'繁':'简';b.setAttribute('lang','zh');b.setAttribute('aria-label',(isTrad()?'Phồn thể':'Giản thể')+'. Bấm để đổi')},click(){S.set.script=isTrad()?'s':'t';save();remap();LANG.chip.paint();toast(isTrad()?'Chữ phồn thể':'Chữ giản thể','languages');buzz(8);route()}},
 homeChips(){return `<button class="chip" id="zh-edition">${esc(edition().title)}</button>`+LV.map(L=>`<button class="chip ${F().cefr==LVN(L)?'on':''}" data-zl="${L}" aria-pressed="${F().cefr==LVN(L)}">${LVN(L)}</button>`).join('')},
 bindHome(){$('#zh-edition').onclick=chooseCurriculum;$$('[data-zl]').forEach(b=>b.onclick=()=>{const L=+b.dataset.zl;F().cefr=F().cefr==LVN(L)?'':LVN(L);save();home();buzz(8)})},
 modes:{write:['pen-line','Viết chữ','Thứ tự nét, tự viết từng nét'],reader:['book-open','Đọc đoạn tự chọn','Tra từ trong nội dung bạn muốn đọc'],guide:['lightbulb','Chọn cách học','Gợi ý có căn cứ, tùy nhu cầu của bạn']},routes:{write:zhWrite,reader:zhRead,guide:zhGuide},speak:zhSpeak,keys:{speak:[['Phím cách','Ghi âm / dừng ghi'],['→','Từ tiếp']],write:[['→','Từ tiếp'],['←','Từ trước']]},
 typePrompt:'Gõ chữ Hán hoặc pinyin',listenPrompt:'Gõ chữ Hán hoặc pinyin (không dấu cũng được)',matchWhat:'từ tiếng Trung',reversePrompt:'Từ tiếng Trung là gì?',searchPrompt:'Tìm chữ Hán, pinyin, Hán Việt hoặc nghĩa',
 planTitle:()=>Object.keys(edition().members).length.toLocaleString('vi-VN')+' thẻ · '+edition().title,planSub:'Nghĩa Việt, audio nam/nữ, pinyin, thứ tự nét; tự chọn mọi cấp và đổi danh mục ở trang chủ',
 credits:'Phiên bản 5.0.0 · Lõi Neko từ Học Từ Vựng v17 · Danh sách HSK 2021: complete-hsk-vocabulary (MIT); đề cương HSK 2025/2026: Chinese Testing International (chỉ mục từ thực tế, không sao chép giáo trình) · Nghĩa Việt: CVDICT và bản biên soạn bổ sung (CC BY-SA 4.0), chưa được giáo viên song ngữ duyệt toàn bộ · Hán Việt, bộ thủ: Kai Hanzi (CC BY 4.0), Unihan · Nét chữ: Hanzi Writer Data / Make Me a Hanzi (Arphic PL; dữ liệu từ điển LGPL) · Audio tổng hợp: Microsoft Neural và Kokoro v1.1-zh (Apache-2.0), chưa nghe duyệt từng tệp · Biểu tượng Lucide (ISC)',
 _fromV2:fromV2,_accepts:accepts,_spoken:spoken,_readingTokens:readingTokens,_curriculumLevel:curriculumLevel};
})();
