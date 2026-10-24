const fs=require('fs'),T=require('/workspace/chinese/hoc-tieng-trung/tones.js');const lab=JSON.parse(fs.readFileSync('tat_labels.json'));let n=0,ok=0;
for(const r of lab){const b=fs.readFileSync(`tat/${r.id}.f32`),x=new Float32Array(b.buffer,b.byteOffset,b.length/4);const a=T.analyse(x,16000,r.tn,r.h);if(!a.ok)continue;
 a.syl.forEach((s,k)=>{if(r.tn[k]<5&&s.got!=null){n++;if(s.got==r.sf[k])ok++}})}
console.log(JSON.stringify({f0_tone_vs_surface:+(ok/n).toFixed(3),n}));
