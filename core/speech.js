'use strict';
/* Recording, on-device scoring engine bridge, playback and voice visualisation for "Luyện nói" (v11). */
const Speech=(()=>{
 let worker=null,seq=0;const pend=new Map();let progCb=null,statusCb=null;
 function W(){if(worker)return worker;worker=new Worker('asr-worker.js');worker.onmessage=e=>{const m=e.data;
  if(m.type=='progress'){progCb&&progCb(m);return}
  if(m.type=='status'){statusCb&&statusCb(m);statusCb=null;return}
  if(m.type=='ready'){const p=pend.get('load');p&&p.ok();pend.delete('load');return}
  const p=pend.get(m.id!=null?m.id:'load');if(!p)return;pend.delete(m.id!=null?m.id:'load');m.type=='error'?p.no(new Error(m.msg)):p.ok(m.res)};
  worker.onerror=e=>{for(const [,p] of pend)p.no(new Error('worker'));pend.clear()};return worker}
 const supported=()=>typeof Worker!='undefined'&&typeof WebAssembly=='object'&&'caches' in self&&!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);
 const status=()=>new Promise(ok=>{if(!supported())return ok({cached:false,ready:false});statusCb=ok;W().postMessage({type:'status'});setTimeout(()=>ok({cached:false,ready:false}),4000)});
 const load=onProg=>new Promise((ok,no)=>{progCb=onProg;pend.set('load',{ok,no});W().postMessage({type:'load'})});
 const analyze=(pcm,variants,uk)=>new Promise((ok,no)=>{const id=++seq;pend.set(id,{ok,no});W().postMessage({type:'run',id,pcm,variants,uk},[pcm.buffer])});
 const forget=()=>new Promise(ok=>{statusCb=ok;W().postMessage({type:'forget'})});
 /* ---------- recording (v11) ----------
   iOS Safari lessons: a single long-lived AudioContext that was used for an earlier capture or for playback can come back
   "interrupted" or deliver only zeros from a new MediaStreamSource (the audio session / hardware sample rate changed when
   the previous mic track stopped or when <audio> played). So every attempt gets: a fresh AudioContext created and resumed
   inside the tap, a fresh getUserMedia stream, a context rebuilt at the track's own sample rate when they differ, a
   watchdog that rebuilds once if only silence/zeros arrive, and full teardown (tracks stopped, context closed) at the end.
   The energy gate drives capture status and auto-stop; it is not a language or pronunciation detector. */
 const AC=()=>window.AudioContext||window.webkitAudioContext;
 let PB=null;const ctx=()=>{if(!PB||PB.state=='closed')PB=new (AC())();return PB}; /* playback/decoding only, never used for capture */
 const DBG=/[?&]debug=1/.test(location.search);let dbgEl=null;
 function dbg(o){if(!DBG)return;if(!dbgEl){dbgEl=document.createElement('pre');dbgEl.id='micdbg';dbgEl.setAttribute('aria-hidden','true');document.body.appendChild(dbgEl)}
  dbgEl.textContent=Object.entries(o).map(([k,v])=>k+': '+(typeof v=='number'?(+v.toFixed(4)):v)).join('\n')}
 function prime(){/* call synchronously inside the tap: creates and resumes the capture context while the gesture is valid */
  const ac=new (AC())();try{ac.resume().catch(()=>{})}catch(e){}return ac}
 async function record({onLevel,onState,maxMs=6000,silenceMs=1100,ac=null,signal}={}){
  ac=ac||prime();let stream=null,src=null,proc=null,sink=null,wd=null,stopped=false,rebuilding=false,resolve;
  let calls=0,nonzero=0,rebuilt=0,speech=false,loudRun=0,lastLoud=0,peakLv=0,clipped=0,samples=0;
  let floor=.0015,thr=.008,noise=[],state='perm',graphStart=performance.now(),started=0,backend='';
  const chunks=[],abortError=()=>new DOMException('Recording cancelled','AbortError');
  const close=()=>{try{ac.close().catch(()=>{})}catch(_){}};
  function teardown(){if(proc){if(proc.port){proc.port.onmessage=null;proc.port.close()}else proc.onaudioprocess=null;try{proc.disconnect()}catch(_){}}
   try{src&&src.disconnect()}catch(_){}try{sink&&sink.disconnect()}catch(_){}src=proc=sink=null}
  const done=new Promise(r=>resolve=r);
  const set=k=>{if(k!==state){state=k;onState&&onState(k)}};
  function stop(why='manual'){if(stopped)return;stopped=true;clearInterval(wd);signal?.removeEventListener('abort',abort);
   teardown();stream?.getTracks().forEach(t=>t.stop());const sr=ac.sampleRate;close();
   const pcm=new Float32Array(samples);let offset=0;for(const x of chunks){pcm.set(x,offset);offset+=x.length}
   const diag={calls,nonzero,rebuilt,floor,thr,peak:peakLv,clipped:samples?clipped/samples:0,backend};
   dbg({why,rate:sr,...diag});resolve({pcm,sr,speech,why,diag})}
  const abort=()=>stop('cancelled');
  function onAudio(x){if(stopped)return;calls++;let sum=0,nz=false;
   for(const v of x){sum+=v*v;if(v!==0)nz=true;if(Math.abs(v)>=.99)clipped++}if(nz)nonzero++;
   chunks.push(new Float32Array(x));samples+=x.length;const rms=Math.sqrt(sum/x.length),now=performance.now(),elapsed=now-started;
   if(elapsed<300)noise.push(rms);else if(noise){noise.sort((a,b)=>a-b);floor=Math.max(.0015,Math.min(.004,noise[Math.floor(noise.length*.2)]||0));thr=Math.max(.008,floor*3);noise=null}
   if(rms>thr){loudRun++;if(loudRun>=2){speech=true;lastLoud=now;set('voice')}}else loudRun=0;
   peakLv=Math.max(peakLv,rms);onLevel&&onLevel(Math.min(1,Math.sqrt(rms)*3.2),rms);
   if(!speech&&elapsed>1800)set('quiet');
   if(speech&&now-lastLoud>300){set('tail');onState&&onState('tailp',Math.min(1,(now-lastLoud-300)/Math.max(1,silenceMs-300)))}
   if(samples>=ac.sampleRate*maxMs/1000)stop('max');
  }
  async function build(){
   const context=ac;let useWorklet=false;
   if(context.audioWorklet&&typeof AudioWorkletNode!=='undefined'){
    let timer;
    try{await Promise.race([context.audioWorklet.addModule('core/mic-worklet.js'),new Promise((_,no)=>{timer=setTimeout(()=>no(new Error('Worklet timeout')),2500)}),done.then(()=>{throw abortError()})]);useWorklet=true}catch(_){}finally{clearTimeout(timer)}
   }
   if(stopped||context!==ac)return;
   src=context.createMediaStreamSource(stream);sink=context.createGain();sink.gain.value=0;
   if(useWorklet){proc=new AudioWorkletNode(context,'mic-capture');proc.port.onmessage=e=>onAudio(e.data);backend='worklet'}
   else{proc=context.createScriptProcessor(1024,1,1);proc.onaudioprocess=e=>onAudio(e.inputBuffer.getChannelData(0));backend='script'}
   src.connect(proc);proc.connect(sink);sink.connect(context.destination);graphStart=performance.now();
  }
  onState&&onState('perm');
  if(signal?.aborted){close();throw abortError()}
  signal?.addEventListener('abort',abort,{once:true});
  try{
   const permission=navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}});
   // getUserMedia has no AbortSignal. A late permission grant must still close every track.
   permission.then(s=>{if(stopped)s.getTracks().forEach(t=>t.stop())},()=>{});
   stream=await Promise.race([permission,done.then(()=>{throw abortError()})]);
   if(stopped)throw abortError();
   const tr=stream.getAudioTracks()[0];if(!tr||tr.readyState!=='live')throw new DOMException('No live microphone','NotReadableError');
   const want=tr.getSettings?.().sampleRate;
   if(want&&want!==ac.sampleRate){close();try{ac=new (AC())({sampleRate:want})}catch(_){ac=new (AC())()}}
   if(ac.state!=='running')await Promise.race([ac.resume().catch(()=>{}),new Promise(r=>setTimeout(r,800)),done]);
   if(stopped)throw abortError();
   started=performance.now();await build();if(stopped)throw abortError();
   tr.addEventListener('ended',()=>stop('ended'),{once:true});set('listen');
   wd=setInterval(async()=>{if(stopped||rebuilding)return;const now=performance.now(),elapsed=now-started;
    if(elapsed>=maxMs)return stop(speech?'max':'nospeech');
    if(speech&&now-lastLoud>silenceMs)return stop('silence');
    if(tr.readyState==='ended')return stop('ended');
    if(now-graphStart>1200&&(calls===0||nonzero===0)){
     if(rebuilt)return stop('dead');rebuilding=true;rebuilt++;teardown();close();
     try{ac=new (AC())(want?{sampleRate:want}:undefined);await Promise.race([ac.resume(),new Promise(r=>setTimeout(r,800)),done]);
      if(stopped){close();return}calls=0;nonzero=0;await build();
     }catch(_){stop('dead')}finally{rebuilding=false}
    }
   },100);
   return {stop,done,get state(){return state}};
  }catch(e){stop('error');throw e}
 }
 /* resample to 16 kHz (box filter + linear interpolation) and trim leading/trailing silence */
 function to16k(pcm,sr){const r=sr/16000,n=Math.floor(pcm.length/r),out=new Float32Array(n),w=Math.max(1,Math.round(r));
  for(let i=0;i<n;i++){const c=i*r,a=Math.floor(c);let s=0,k=0;for(let j=a-(w>>1);j<=a+(w>>1);j++)if(j>=0&&j<pcm.length){s+=pcm[j];k++}out[i]=k?s/k:0}return out}
 function trim(x){const f=320,E=[];for(let i=0;i+f<=x.length;i+=f){let s=0;for(let j=i;j<i+f;j++)s+=x[j]*x[j];E.push(Math.sqrt(s/f))}
  const mx=Math.max(...E,1e-6),thr=Math.max(0.008,mx*0.08);let a=E.findIndex(e=>e>thr),b=E.length-1-[...E].reverse().findIndex(e=>e>thr);if(a<0)return x;
  a=Math.max(0,(a-8)*f);b=Math.min(x.length,(b+10)*f);return x.slice(a,b)}
 function peak(x){let m=0;for(let i=0;i<x.length;i++)m=Math.max(m,Math.abs(x[i]));return m}
 function wav(x,sr=16000){const b=new ArrayBuffer(44+x.length*2),v=new DataView(b),w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
  w(0,'RIFF');v.setUint32(4,36+x.length*2,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,x.length*2,true);
  const g=0.9/Math.max(0.05,peak(x));for(let i=0;i<x.length;i++)v.setInt16(44+i*2,Math.max(-1,Math.min(1,x[i]*g))*32767,true);return new Blob([b],{type:'audio/wav'})}
 async function decodeUrl(url){const r=await fetch(url);const ab=await r.arrayBuffer();const OC=window.OfflineAudioContext||window.webkitOfflineAudioContext;const ac=OC?new OC(1,1,44100):ctx();const buf=await new Promise((ok,no)=>{const p=ac.decodeAudioData(ab,ok,no);p&&p.catch&&p.catch(no)});return trim(to16k(buf.getChannelData(0),buf.sampleRate))}
 /* pitch by normalised autocorrelation, 20 ms hop, 75-400 Hz; null where unvoiced */
 function pitch(x){const hop=320,win=640,out=[];for(let s=0;s+win<=x.length;s+=hop){let e=0;for(let i=0;i<win;i++)e+=x[s+i]*x[s+i];if(e/win<2e-5){out.push(null);continue}
  let best=0,bl=0;for(let l=40;l<=213;l++){let c=0,e1=0,e2=0;for(let i=0;i<win-l;i++){c+=x[s+i]*x[s+i+l];e1+=x[s+i]*x[s+i];e2+=x[s+i+l]*x[s+i+l]}const r=c/Math.sqrt(e1*e2+1e-9);if(r>best){best=r;bl=l}}
  out.push(best>0.55?16000/bl:null)}return out}
 function envelope(x,n){const out=new Float32Array(n),f=Math.max(1,Math.floor(x.length/n));for(let i=0;i<n;i++){let m=0;for(let j=i*f;j<Math.min(x.length,(i+1)*f);j++)m=Math.max(m,Math.abs(x[j]));out[i]=m}const p=Math.max(...out,1e-6);return out.map(v=>v/p)}
 return {supported,status,load,analyze,forget,record,prime,to16k,trim,wav,decodeUrl,pitch,envelope,peak,ctx}})();
