const V='htt-v4',DATA='htt-data-v3',AUDIO='htt-audio-v1';
const SHELL=['./','index.html','core/style.css','lang-zh.css','core/app-core.js','core/mascot.js','core/speech.js','lang-zh.js','zh-asr-worker.js','vendor/ort/ort.wasm.min.js','srs.js','tones.js','vendor/ts-fsrs.min.js','vendor/hanzi-writer.min.js','manifest.webmanifest','data/meta.json','data/hsk1.json','icons/icon.svg','icons/icon-192.png','icons/apple-touch-icon.png'];
/* Progress lives in localStorage; a service-worker update never touches it. New versions wait until the user taps "Tải lại". */
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL.map(u=>new Request(u,{cache:'reload'}))))));
self.addEventListener('message',e=>{if(e.data==='skip'||(e.data&&e.data.type==='skip'))self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V&&x!==DATA&&x!==AUDIO&&x!=='htt-engine-v1').map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
const timeout=(p,ms)=>new Promise((ok,no)=>{const t=setTimeout(()=>no(new Error('timeout')),ms);p.then(r=>{clearTimeout(t);ok(r)},e=>{clearTimeout(t);no(e)})});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin)return;
 if(u.pathname.includes('/models/')||u.pathname.endsWith('.wasm'))return; /* the model worker caches these itself (htt-engine-v1) */
 if(u.pathname.includes('/audio/')){e.respondWith(caches.open(AUDIO).then(async c=>{const m=await c.match(r);if(m)return m;const res=await fetch(r);if(res.ok)c.put(r,res.clone());return res}));return}
 if(u.pathname.includes('/data/strokes/')||/\/data\/(hsk[2-7]|chars)\.json$/.test(u.pathname)){
  e.respondWith(caches.open(DATA).then(async c=>{const m=await c.match(r);if(m)return m;const res=await fetch(r);if(res.ok)c.put(r,res.clone());return res}));return}
 e.respondWith(timeout(fetch(r,{cache:'no-cache'}),4000).then(res=>{if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c))}return res})
  .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||(r.mode==='navigate'?caches.match('./'):Response.error()))))});
