/* Tone feedback (heuristic, on-device, no model).
   1) f0 track: normalised autocorrelation per 40 ms frame (hop 10 ms), 70-500 Hz, voicing threshold 0.5.
   2) Contour: semitones relative to the speaker's median voiced f0, median-smoothed.
   3) Per syllable (voiced span split evenly by syllable count): slope + shape -> tone 1 level, 2 rising, 3 dipping/low, 4 falling.
   This is a rule of thumb, not a trained classifier. Accuracy on real speech is NOT measured. */
(function(root){'use strict';
function track(x,sr){const W=Math.round(sr*.04),H=Math.round(sr*.01),lo=Math.floor(sr/500),hi=Math.ceil(sr/70),out=[];
 for(let s=0;s+W+hi<x.length;s+=H){let e=0;for(let i=0;i<W;i++)e+=x[s+i]*x[s+i];if(e/W<1e-5){out.push(0);continue}
  let best=0,bl=0;for(let l=lo;l<=hi;l++){let c=0,e2=0;for(let i=0;i<W;i++){c+=x[s+i]*x[s+i+l];e2+=x[s+i+l]*x[s+i+l]}const r=c/Math.sqrt(e*e2+1e-12);if(r>best){best=r;bl=l}}
  if(best<.5||!bl){out.push(0);continue}
  /* parabolic refinement */
  out.push(sr/bl)}return out}
const med=a=>{const b=a.slice().sort((p,q)=>p-q);return b.length?b[b.length>>1]:0};
function contour(f0){const v=f0.filter(f=>f>0);if(v.length<5)return null;const m=med(v);
 let a=f0.map(f=>f>0?12*Math.log2(f/m):null);let i0=a.findIndex(x=>x!=null),i1=a.length-1-a.slice().reverse().findIndex(x=>x!=null);a=a.slice(i0,i1+1);
 /* fill short gaps, then median-smooth (5) to kill octave jumps */
 for(let i=0;i<a.length;i++)if(a[i]==null)a[i]=a[i-1];const s=a.map((_,i)=>med(a.slice(Math.max(0,i-2),i+3)));return s}
function classify(seg){if(!seg||seg.length<4)return null;const n=seg.length,q=Math.max(1,Math.floor(n/4));
 const avg=(a,b)=>{let t=0;for(let i=a;i<b;i++)t+=seg[i];return t/(b-a)};const st=avg(0,q),en=avg(n-q,n),mn=Math.min(...seg),im=seg.indexOf(mn);
 const rise=en-st,dip=Math.min(st,en)-mn,mean=avg(0,n);
 if(dip>1.5&&im>n*.2&&im<n*.8)return 3;
 if(rise>2)return 2;if(rise<-2.5)return mean<-2?3:4;if(mean<-2.5)return 3;return 1}
function analyse(x,sr,expected){const f0=track(x,sr),c=contour(f0);if(!c)return{ok:false,reason:'Không nghe rõ giọng. Nói to và gần micro hơn.'};
 const n=expected.length,L=c.length,res=[];for(let k=0;k<n;k++){const seg=c.slice(Math.floor(k*L/n),Math.floor((k+1)*L/n));const t=classify(seg);
  const e=expected[k];res.push({expected:e,got:t,match:e==5?null:t==e||(e==3&&n>1&&k<n-1&&t==2)})} /* 3 before 3 is sandhi-rising; a non-final 3 often lacks its rise */
 return{ok:true,contour:c,syl:res}}
const toneNums=numeric=>String(numeric).trim().split(/\s+/).map(s=>{const m=/([1-5])$/.exec(s);return m?+m[1]:5});
const api={track,contour,classify,analyse,toneNums};
if(typeof module!='undefined'&&module.exports)module.exports=api;else root.TONES=api})(typeof self!='undefined'?self:this);
