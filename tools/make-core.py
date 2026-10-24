#!/usr/bin/env python3
"""Derive core/app-core.js from the English app (meiiie/hoc-tu-vung v17 app.js).
Every change is a named hook into window.LANG; with no LANG hooks the code behaves like v17.
Run: tools/make-core.py /workspace/english/hoc-tu-vung/app.js > core/app-core.js"""
import sys
s=open(sys.argv[1],encoding='utf8').read()
def R(a,b,n=1):
  global s
  c=s.count(a)
  assert c==n,(c,a[:80])
  s=s.replace(a,b)
R("/* Học Từ Vựng – Oxford 3000. Static PWA. Progress is stored per device in localStorage. */",
  "/* Neko vocabulary core (derived from Học Từ Vựng v17, meiiie/hoc-tu-vung). Language specifics come from window.LANG (see docs/ECOSYSTEM.md). */\nconst LANG=window.LANG||{};")
R("const DAY=864e5,KEY='htv2',AUDIO_CACHE='htv-audio-v1';","const DAY=864e5,KEY=LANG.key||'htv2',AUDIO_CACHE=LANG.audioCache||'htv-audio-v1';")
R("retention:0.9,rev:true,fcMode:'sched'}};","retention:0.9,rev:true,fcMode:'sched',...(LANG.setDefaults||{})}};")
R("let S,loadErr=false;{const raw=lsGet(KEY);",
  "/* hook: import progress from an older, separate storage key (the old key is never modified or deleted) */\nif(LANG.legacy&&!lsGet(KEY)){try{const L=LANG.legacy(lsGet);if(L)lsSet(KEY,JSON.stringify(L))}catch(e){console.warn('legacy import',e)}}\nlet S,loadErr=false;{const raw=lsGet(KEY);")
R("if(!ok&&m!='match'&&bringForward(w.id))","if(!ok&&m!='match'&&LANG.bringForward!==false&&bringForward(w.id))")
R("async function loadData(){const r=await fetch('data/pages.json');","let WMAP=new Map();\nasync function loadData(){if(LANG.loadData){const x=await LANG.loadData();pages=x.pages;words=x.words;WMAP=new Map(words.map(w=>[w.id,w]));return}const r=await fetch('data/pages.json');")
R("ws.map(w=>({...w,page:p.id,num:w.id.split('-')[1]})))));words=all.flat()}","ws.map(w=>({...w,page:p.id,num:w.id.split('-')[1]})))));words=all.flat();WMAP=new Map(words.map(w=>[w.id,w]))}")
R("function deck(){const f=F();return words.filter(w=>(","function deck(){const f=F();return words.filter(w=>(!LANG.inDeck||LANG.inDeck(w))&&(")
R("const byId=id=>words.find(w=>w.id==id);","const byId=id=>WMAP.get(id);")
R("const aurl=(w,kind='w',v=S.set.voice)=>`audio/${w.page}/${v}/${kind}/${w.num}.mp3`;","const aurl=(w,kind='w',v=S.set.voice)=>LANG.aurl?LANG.aurl(w,kind,v):`audio/${w.page}/${v}/${kind}/${w.num}.mp3`;")
R("function play(w,kind='w',opt={}){if(!w)return;try{","function play(w,kind='w',opt={}){if(!w)return;if(LANG.play&&LANG.play(w,kind,opt))return;try{")
R("const answerText=w=>w.w.replace(/\\s*\\(.*?\\)/g,'');","const answerText=LANG.answerText||(w=>w.w.replace(/\\s*\\(.*?\\)/g,''));")
R("const norm=s=>String(s).toLowerCase()","const norm=LANG.norm||(s=>String(s).toLowerCase()")
R(".replace(/\\s+/g,' ').trim();\nconst accepts=w=>answerText(w).split(/,\\s*/).map(norm);",".replace(/\\s+/g,' ').trim());\nconst accepts=LANG.accepts||(w=>answerText(w).split(/,\\s*/).map(norm));")
R("function cloze(w){const ex=","function cloze(w){if(LANG.cloze)return LANG.cloze(w);const ex=")
R("function backFace(w){return `","function backFace(w){if(LANG.backFace)return LANG.backFace(w);return `")
R("function frontFace(w,dir){return `","function frontFace(w,dir){if(LANG.frontFace)return LANG.frontFace(w,dir);return `")
# filter sheet
R(" <div class=\"eyebrow\">Ngày học</div>${chips('day',[['','Tất cả'],...days.map(d=>[d,'Ngày '+(+d.slice(3))])])}\n <div class=\"eyebrow\">Cấp độ CEFR</div>${chips('cefr',[['','Tất cả'],['A1','A1'],['A2','A2'],['B1','B1'],['B2','B2']])}\n <div class=\"group\" style=\"margin-top:16px\"><label class=\"opt-row\"><span>Chỉ từ IELTS Task 1</span><input class=\"sw\" type=\"checkbox\" id=\"f-t1\" ${f.task1?'checked':''}></label>",
  " ${days.length?`<div class=\"eyebrow\">Ngày học</div>${chips('day',[['','Tất cả'],...days.map(d=>[d,'Ngày '+(+d.slice(3))])])}`:''}\n <div class=\"eyebrow\">${LANG.levelName||'Cấp độ CEFR'}</div>${chips('cefr',[['','Tất cả'],...(LANG.levels||['A1','A2','B1','B2']).map(x=>[x,x])])}\n <div class=\"group\" style=\"margin-top:16px\">${LANG.levels?'':`<label class=\"opt-row\"><span>Chỉ từ IELTS Task 1</span><input class=\"sw\" type=\"checkbox\" id=\"f-t1\" ${f.task1?'checked':''}></label>`}")
R("$('#f-t1').onchange=e=>{f.task1=e.target.checked;save();cnt()};","$('#f-t1')&&($('#f-t1').onchange=e=>{f.task1=e.target.checked;save();cnt()});")
R("${pages.length>1?'<div class=\"eyebrow\">Trang</div>'","${pages.length>1&&!LANG.levels?'<div class=\"eyebrow\">Trang</div>'")
# settings
R("<div class=\"opt-row\"><span>Giọng đọc</span>${seg('voice',[['gb','Anh (UK)'],['us','Mỹ (US)']])}</div>","<div class=\"opt-row\"><span>Giọng đọc</span>${seg('voice',LANG.voices||[['gb','Anh (UK)'],['us','Mỹ (US)']])}</div>${LANG.settingsTop?LANG.settingsTop(seg):''}")
a=s.index(" <div class=\"eyebrow\">Chấm phát âm</div>");b=s.index(" <div class=\"eyebrow\">Giao diện</div>")
s=s[:a]+" ${LANG.settingsPron?LANG.settingsPron(seg):`"+s[a:b].replace('`','\\`').replace('${','\\${')+"`}\n"+s[b:]
# the inner template must stay live, so undo the escaping: rebuild it as a real nested template
inner=s[s.index("${LANG.settingsPron?LANG.settingsPron(seg):`")+len("${LANG.settingsPron?LANG.settingsPron(seg):`"):s.index("`}\n <div class=\"eyebrow\">Giao diện</div>")]
s=s.replace(inner,inner.replace('\\`','`').replace('\\${','${'))
R("<p class=\"muted center\" style=\"margin-top:16px\">Phiên bản 15 · Chấm phát âm: ZIPA (CC BY-NC-SA 4.0) · Linh vật Neko · Biểu tượng Lucide (ISC) · Giọng đọc Microsoft Neural</p>`,route);",
  "<p class=\"muted center\" style=\"margin-top:16px\">${LANG.credits||'Phiên bản 15 · Chấm phát âm: ZIPA (CC BY-NC-SA 4.0) · Linh vật Neko · Biểu tượng Lucide (ISC) · Giọng đọc Microsoft Neural'}</p>`,route);")
R("if(Speech.supported()){const upd=s=>{","if(LANG.bindSettings)LANG.bindSettings(sh,close);\n if(LANG.settingsPron){}else if(Speech.supported()){const upd=s=>{")
R("else{$('#mst2',sh).textContent='Trình duyệt này không hỗ trợ';$('#mdl',sh).disabled=true}","else if($('#mst2',sh)){$('#mst2',sh).textContent='Trình duyệt này không hỗ trợ';$('#mdl',sh).disabled=true}")
R("if(k=='voice'||k=='slow')play(words[2]);updVoice();buzz(8)});","if(k=='voice'||k=='slow')play(words[2]);if(LANG.onSet)LANG.onSet(k,v);updVoice();buzz(8)});")
R("const urls=words.flatMap(w=>[aurl(w,'w'),aurl(w,'ex')]);","const urls=LANG.audioUrls?LANG.audioUrls():words.flatMap(w=>[aurl(w,'w'),aurl(w,'ex')]);")
R("tệp giọng ${S.set.voice=='gb'?'Anh':'Mỹ'}`","tệp âm thanh`")
# onboarding
R("<div><b>${words.length} từ Oxford 3000 · IELTS</b><small>Giọng Anh và Mỹ, phát âm chậm, câu ví dụ</small></div>","<div><b>${LANG.planTitle?LANG.planTitle(words.length):words.length+' từ Oxford 3000 · IELTS'}</b><small>${LANG.planSub||'Giọng Anh và Mỹ, phát âm chậm, câu ví dụ'}</small></div>")
# home
R("function home(){const d=deck()","function home(){if(LANG.onHome)LANG.onHome();const d=deck()")
R("<div class=\"chips\"><button class=\"chip on\" id=\"filt\">${I('sliders-horizontal','s')}Chọn bộ từ</button>${[...new Set(",
  "<div class=\"chips\"><button class=\"chip on\" id=\"filt\">${I('sliders-horizontal','s')}Chọn bộ từ</button>${LANG.homeChips?LANG.homeChips():''}${[...new Set(")
R("$$('[data-day]').forEach(b=>b.onclick=()=>{F().day=F().day==b.dataset.day?'':b.dataset.day;save();home();buzz(8)});",
  "$$('[data-day]').forEach(b=>b.onclick=()=>{F().day=F().day==b.dataset.day?'':b.dataset.day;save();home();buzz(8)});if(LANG.bindHome)LANG.bindHome();")
R(" match:['zap','Ghép thẻ',''],test:['clipboard-check','Kiểm tra','20 câu hỗn hợp, chấm điểm'],list:['list-checks','Danh sách từ',''],stats:['chart-column','Thống kê','Tiến độ theo cấp độ']};",
  " match:['zap','Ghép thẻ',''],test:['clipboard-check','Kiểm tra','20 câu hỗn hợp, chấm điểm'],...(LANG.modes||{}),list:['list-checks','Danh sách từ',''],stats:['chart-column','Thống kê','Tiến độ theo cấp độ']};")
# learn / test prompts
R("<label class=\"kind\" for=\"ti\" style=\"display:block;margin-bottom:8px\">Gõ từ tiếng Anh</label>","<label class=\"kind\" for=\"ti\" style=\"display:block;margin-bottom:8px\">${LANG.typePrompt||'Gõ từ tiếng Anh'}</label>")
R("q.t=='type'?'Gõ từ tiếng Anh'","q.t=='type'?(LANG.typePrompt||'Gõ từ tiếng Anh')")
R("placeholder=\"Gõ từ bạn nghe được\"","placeholder=\"${LANG.listenPrompt||'Gõ từ bạn nghe được'}\"")
R("Ghép ${N} cặp từ tiếng Anh với nghĩa tiếng Việt","Ghép ${N} cặp ${LANG.matchWhat||'từ tiếng Anh'} với nghĩa tiếng Việt")
R("<p class=\"muted\">Từ tiếng Anh là gì?</p>","<p class=\"muted\">${LANG.reversePrompt||'Từ tiếng Anh là gì?'}</p>")
# speaking + pronunciation hooks
R("function ipaOf(w){const v=","function ipaOf(w){if(LANG.ipaOf)return LANG.ipaOf(w);const v=")
R("function speak(){const d=deck();","function speak(){if(LANG.speak)return LANG.speak();const d=deck();")
# list
R("const r=()=>{const q=norm($('#sq').value);const xs=d.filter(w=>inLf(w)&&(!q||norm(w.w).includes(q)||norm(w.vi).includes(q)))",
  "const r=()=>{const q=norm($('#sq').value);const xs=d.filter(w=>inLf(w)&&(!q||norm(w.w).includes(q)||norm(w.vi).includes(q)||(LANG.search&&LANG.search(w,$('#sq').value))))")
R("const LV={A1:1,A2:2,B1:3,B2:4,C1:5,C2:6},","const LV={A1:1,A2:2,B1:3,B2:4,C1:5,C2:6,...(LANG.lvOrder||{})},")
R("(LV[a.lv.slice(0,2)]||9)-(LV[b.lv.slice(0,2)]||9)","(LV[a.lv]||LV[a.lv.slice(0,2)]||9)-(LV[b.lv]||LV[b.lv.slice(0,2)]||9)")
R("placeholder=\"Tìm từ hoặc nghĩa\"","placeholder=\"${LANG.searchPrompt||'Tìm từ hoặc nghĩa'}\"")
R("const EVN={f:'Thẻ ghi nhớ (tự do)',l:'Học',d:'Nghe – chép',t:'Kiểm tra',m:'Ghép thẻ',s:'Luyện nói',p:'Luyện tập'}","const EVN={f:'Thẻ ghi nhớ (tự do)',l:'Học',d:'Nghe – chép',t:'Kiểm tra',m:'Ghép thẻ',s:'Luyện nói',w:'Viết chữ',p:'Luyện tập'}")
R("const EVM={cards:'f',learn:'l',hard:'l',listen:'d',test:'t',match:'m',speak:'s'};","const EVM={cards:'f',learn:'l',hard:'l',listen:'d',test:'t',match:'m',speak:'s',write:'w'};")
R("<h2>${esc(w.w)} ${lifeTag(k)}</h2><p class=\"muted\">${esc(ipaOf(w))} · ${esc(w.vi)}</p>","<h2>${esc(w.w)} ${lifeTag(k)}</h2><p class=\"muted\">${esc(ipaOf(w))} · ${esc(w.vi)}</p>${LANG.wordExtra?LANG.wordExtra(w):''}")
# backup
R("{app:'hoc-tu-vung',schema:SCHEMA","{app:LANG.app||'hoc-tu-vung',schema:SCHEMA")
R("a.download=`hoc-tu-vung-tien-do-${today()}.json`","a.download=`${LANG.app||'hoc-tu-vung'}-tien-do-${today()}.json`")
R("const d=j&&j.app=='hoc-tu-vung'&&j.data?j.data:j;","const d=j&&j.app==(LANG.app||'hoc-tu-vung')&&j.data?j.data:(LANG.importAny?LANG.importAny(j):j);")
# router, header chip, boot
R("const R={'':home,cards,review,cram:()=>review(true),learn:()=>learn(),hard:()=>learn('hard'),speak,listen,match,test,list,stats};",
  "const R={'':home,cards,review,cram:()=>review(true),learn:()=>learn(),hard:()=>learn('hard'),speak,listen,match,test,list,stats,...(LANG.routes||{})};")
R("const updVoice=()=>{$('#voice').textContent=","const updVoice=()=>{if(LANG.chip)return LANG.chip.paint();$('#voice').textContent=")
R("$('#voice').onclick=()=>{S.set.voice=","$('#voice').onclick=()=>{if(LANG.chip)return LANG.chip.click();S.set.voice=")
R("loadData().then(()=>loadPron()).then(route)","loadData().then(()=>LANG.boot?LANG.boot():loadPron()).then(route)")
R("$('#title').textContent=title||'Học Từ Vựng';","$('#title').textContent=title||LANG.title||'Học Từ Vựng';")
R("$('meta[name=theme-color]').content=dark?'#121214':'#F6F5F2'}","$('meta[name=theme-color]').content=dark?'#121214':'#F6F5F2';if(LANG.onTheme)LANG.onTheme(dark)}")
R("'':[['Tab','Di chuyển giữa các mục'],['Enter','Mở chế độ']]};","'':[['Tab','Di chuyển giữa các mục'],['Enter','Mở chế độ']],...(LANG.keys||{})};")
R("const k=location.hash.replace(/^#\\/?/,'');const r=(R[k]||home)();","const k=location.hash.replace(/^#\\/?/,'').split('?')[0];const r=(R[k]||home)();")  # routes may carry ?params (no English route does)
sys.stdout.write(s)
