'use strict';
/* On-device syllable + tone scorer: SpeakToLearn SyllablePredictorV6 (cogeor/speaktolearn, README licence MIT; trained on AISHELL-3),
   converted FP16 -> FP32 -> dynamic INT8 (MatMul) by tools/stl-convert.py, about 30 MB. onnxruntime-web WASM, 1 thread.
   Model and runtime are cached in Cache Storage ("htt-engine-v1") so scoring works offline after one download.
   Input: 16 kHz mono PCM. Front end matches the training code: peak-normalise, Hann 400 / hop 160 power spectrum, 80 mel (HTK formula,
   floor bins), log(x+1e-9), no CMVN, zero-padded to 1000 frames with an audio mask. One forward pass per syllable position. */
importScripts('vendor/ort/ort.wasm.min.js');
const MODEL=new URL('models/stl-v6-int8.onnx',self.location).href,VOCAB=new URL('models/stl-v6-vocab.json',self.location).href,CACHE='htt-engine-v1';
let sess=null,loading=null,V=null;
ort.env.wasm.numThreads=1;ort.env.wasm.wasmPaths=new URL('vendor/ort/',self.location).href;
async function cached(url,onProg,total0){const c=await caches.open(CACHE);let r=await c.match(url);if(r)return new Uint8Array(await r.arrayBuffer());
 r=await fetch(url);if(!r.ok)throw new Error('http '+r.status);const total=+r.headers.get('content-length')||total0,rd=r.body.getReader(),parts=[];let got=0,last=0;
 for(;;){const {done,value}=await rd.read();if(done)break;parts.push(value);got+=value.length;if(got-last>4e5){last=got;onProg&&onProg(got,total)}}
 const buf=new Uint8Array(got);let o=0;for(const p of parts){buf.set(p,o);o+=p.length}
 try{await c.put(url,new Response(buf,{headers:{'Content-Type':'application/octet-stream'}}))}catch(e){}return buf}
async function load(onProg){if(sess)return;if(loading)return loading;
 loading=(async()=>{V=JSON.parse(new TextDecoder().decode(await cached(VOCAB,null,1e4))).syllables;
  const wasm=new URL('vendor/ort/ort-wasm-simd-threaded.wasm',self.location).href;await cached(wasm,(g,t)=>onProg&&onProg(g,t+30.2e6),14.3e6);
  const m=await cached(MODEL,(g,t)=>onProg&&onProg(g+14.3e6,t+14.3e6),30.2e6);postMessage({type:'phase',phase:'init'});
  sess=await ort.InferenceSession.create(m,{executionProviders:['wasm'],graphOptimizationLevel:'all'})})();
 try{await loading}catch(e){loading=null;throw e}}
/* ---- front end (must match training) ---- */
const N=400,H=160,NB=201,NM=80,T=1000;let FB=null,WIN=null,COS=null,SIN=null;
function init(){if(FB)return;WIN=new Float32Array(N);for(let n=0;n<N;n++)WIN[n]=0.5-0.5*Math.cos(2*Math.PI*n/(N-1));
 COS=new Float32Array(NB*N);SIN=new Float32Array(NB*N);for(let k=0;k<NB;k++)for(let n=0;n<N;n++){const a=2*Math.PI*k*n/N;COS[k*N+n]=Math.cos(a);SIN[k*N+n]=Math.sin(a)}
 const hz2m=h=>2595*Math.log10(1+h/700),m2hz=m=>700*(Math.pow(10,m/2595)-1),mx=hz2m(8000),bins=[];for(let i=0;i<NM+2;i++)bins.push(Math.floor((N+1)*m2hz(mx*i/(NM+1))/16000));
 FB=[];for(let i=0;i<NM;i++){const f=new Float32Array(NB),l=bins[i],c=bins[i+1],r=bins[i+2];for(let j=l;j<c;j++)if(c!=l)f[j]=(j-l)/(c-l);for(let j=c;j<r;j++)if(r!=c)f[j]=(r-j)/(r-c);FB.push(f)}}
function mel(x){init();let m=0;for(const v of x)m=Math.max(m,Math.abs(v));if(m>1e-6){const y=new Float32Array(x.length);for(let i=0;i<x.length;i++)y[i]=x[i]/m;x=y}
 let nf=1+Math.floor((x.length-N)/H);if(nf<1){const y=new Float32Array(N+H);y.set(x);x=y;nf=1}nf=Math.min(nf,T);
 const out=new Float32Array(NM*T),fr=new Float32Array(N),ps=new Float32Array(NB);
 for(let t=0;t<nf;t++){for(let n=0;n<N;n++)fr[n]=(x[t*H+n]||0)*WIN[n];
  for(let k=0;k<NB;k++){let re=0,im=0;const o=k*N;for(let n=0;n<N;n++){re+=fr[n]*COS[o+n];im-=fr[n]*SIN[o+n]}ps[k]=re*re+im*im}
  for(let i=0;i<NM;i++){const f=FB[i];let s=0;for(let k=0;k<NB;k++)if(f[k])s+=f[k]*ps[k];out[i*T+t]=Math.log(s+1e-9)}}
 return {mel:out,frames:nf}}
const sm=a=>{const mx=Math.max(...a),e=a.map(v=>Math.exp(v-mx)),s=e.reduce((p,q)=>p+q,0);return e.map(v=>v/s)};
async function run(pcm,n){await load();const {mel:M,frames}=mel(pcm),res=[];const mask=new Uint8Array(T);for(let t=frames;t<T;t++)mask[t]=1;
 for(let k=0;k<n;k++){const out=await sess.run({mel:new ort.Tensor('float32',M,[1,80,T]),position:new ort.Tensor('int64',BigInt64Array.from([BigInt(k)]),[1,1]),audio_mask:new ort.Tensor('bool',mask,[1,T])});
  const sp=sm(Array.from(out.syllable_logits.data)),tp=sm(Array.from(out.tone_logits.data));
  const top=sp.map((p,i)=>[p,i]).sort((a,b)=>b[0]-a[0]).slice(0,5).map(([p,i])=>[i>=2?V[i-2]:'',+p.toFixed(4)]);
  res.push({top,sp,tone:[tp[1],tp[2],tp[3],tp[4],tp[0]].map(v=>+v.toFixed(4))})} /* tone order 1,2,3,4,neutral */
 return {res,frames,vocab:V}}
onmessage=async e=>{const m=e.data;try{
 if(m.type=='status'){const c=await caches.open(CACHE);const ok=!!(await c.match(MODEL))&&!!(await c.match(VOCAB))&&!!(await c.match(new URL('vendor/ort/ort-wasm-simd-threaded.wasm',self.location).href));postMessage({type:'status',id:m.id,cached:ok,ready:!!sess})}
 else if(m.type=='load'){await load((got,total)=>postMessage({type:'prog',got,total}));postMessage({type:'loaded',id:m.id})}
 else if(m.type=='run'){const t0=Date.now();const r=await run(m.pcm,m.n);
  /* return only what the page needs: per syllable top-5, prob of each requested target, tone probs */
  const idx=s=>{const i=r.vocab.indexOf(s);return i<0?-1:i+2};
  postMessage({type:'res',id:m.id,ms:Date.now()-t0,syl:r.res.map((x,k)=>({top:x.top,pTarget:idx(m.targets[k])>=0?+x.sp[idx(m.targets[k])].toFixed(4):null,known:idx(m.targets[k])>=0,tone:x.tone}))})}
 else if(m.type=='forget'){await caches.delete(CACHE);sess=null;loading=null;postMessage({type:'status',id:m.id,cached:false,ready:false})}
}catch(err){postMessage({type:'err',id:m.id,msg:String(err&&err.message||err)})}};
