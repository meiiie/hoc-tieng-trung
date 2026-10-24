/* Measure the F0 tone heuristic on the reference TTS recordings (neural voices, not learners).
   Usage: node tools/tone-eval.js [level] [voice] [limit]  (needs ffmpeg). Prints per-tone accuracy. */
const fs=require('fs'),cp=require('child_process'),T=require('../tones.js');
const L=+(process.argv[2]||1),V=process.argv[3]||'f',N=+(process.argv[4]||9999);const ws=JSON.parse(fs.readFileSync(`data/hsk${L}.json`));
const st={};let n=0,ok=0,words=0,wok=0;
ws.slice(0,N).forEach((w,i)=>{const f=`audio/hsk${L}/${V}/w/${String(i).padStart(4,'0')}.mp3`;if(!fs.existsSync(f))return;
 const raw=cp.execFileSync('ffmpeg',['-loglevel','quiet','-i',f,'-ac','1','-ar','16000','-f','f32le','-']);const x=new Float32Array(raw.buffer,raw.byteOffset,raw.length/4);
 const r=T.analyse(x,16000,T.toneNums(w.n));if(!r.ok)return;words++;let all=true;
 for(const s of r.syl){if(s.match===null)continue;const k=s.expected;st[k]=st[k]||[0,0];st[k][1]++;n++;if(s.match){st[k][0]++;ok++}else all=false}if(all)wok++});
console.log(JSON.stringify({level:L,voice:V,words,wordAllCorrect:+(wok/words).toFixed(3),syllables:n,acc:+(ok/n).toFixed(3),perTone:Object.fromEntries(Object.entries(st).map(([k,[a,b]])=>[k,`${a}/${b} ${(a/b*100).toFixed(0)}%`]))}));
