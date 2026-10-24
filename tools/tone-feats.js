/* Dump per-syllable tone features from the reference recordings (decoded to 16 kHz f32 in $PCM). Output: JSON lines {L,v,i,k,t,f}. */
const fs=require('fs'),T=require('../tones.js'),P=process.env.PCM||'/tmp/pcm';
for(const L of [1,2,3]){const ws=JSON.parse(fs.readFileSync(`data/hsk${L}.json`));for(const v of ['f','m'])ws.forEach((w,i)=>{
 const f=`${P}/audio_hsk${L}_${v}_w_${String(i).padStart(4,'0')}.mp3.f32`;if(!fs.existsSync(f))return;const b=fs.readFileSync(f),x=new Float32Array(b.buffer,b.byteOffset,b.length/4);
 const tn=T.toneNums(w.n),sf=T.surface(tn,w.s),f0=T.track(x,16000),c=T.contour(f0);if(!c)return;const n=tn.length,B=T.bounds(c,f0.energy,n);
 for(let k=0;k<n;k++){const ft=T.feats(c,B[k],B[k+1],k,n);if(ft&&sf[k]>=1&&sf[k]<=4)process.stdout.write(JSON.stringify({L,v,i,k,n,t:sf[k],f:ft.map(z=>+z.toFixed(4))})+'\n')}})}
