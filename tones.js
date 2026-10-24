/* Tone feedback (on-device, no network).
   1) f0 track: normalised autocorrelation per 40 ms frame (hop 10 ms), 70-500 Hz, with frame energy.
   2) Contour: semitones relative to the utterance's median voiced f0, gaps bridged, median-smoothed.
   3) Syllables: n-1 boundaries placed at the lowest-energy / unvoiced frames near the even split.
   4) Tone per syllable: a small softmax model over 12 contour features (weights in MODEL below, trained by
      tools/tone-train.py on the app's own neural-voice recordings). Falls back to slope rules when MODEL is empty.
   Expected tones use standard sandhi (3-3 -> 2-3, 不 before tone 4 -> 2, 一 before 4 -> 2 and before 1/2/3 -> 4).
   Accuracy is measured on synthetic reference voices only (see docs/PRONUNCIATION-ZH.md), NOT on learners. */
(function(root){'use strict';
const MODEL={"mu":[1.0719,0.3777,-0.1047,-0.6422,-1.1999,-1.1766,-1.0952,5.6742,0.6065,0.526,0.1423,0.4737],"sd":[3.9629,3.8476,3.7683,4.1705,4.797,2.8612,4.5094,3.6666,0.3833,0.4993,0.3493,0.2155],"W":[[0.0149,0.0508,0.0307,0.2466,0.4597,-0.3584,0.2544,-0.5873,-0.9195,-0.3818,0.0916,-0.2223,0.4129],[-0.1216,-0.141,-0.8022,-0.2114,0.6696,0.1367,-0.0831,0.322,0.3904,-0.5531,-0.0243,-0.2281,0.0851],[-0.2647,-0.0186,-0.2289,-0.3853,-0.1482,0.1243,-0.4816,0.4542,-0.1384,0.3135,-0.1869,0.424,-0.0717],[0.3715,0.1088,1.0005,0.3501,-0.9812,0.0974,0.3104,-0.1889,0.6676,0.6214,0.1196,0.0263,-0.4263]],"trained":"HSK1-3 reference recordings, zh-CN-XiaoxiaoNeural + zh-CN-YunxiNeural","n":7464};/*MODEL*/
function track(x,sr){const W=Math.round(sr*.04),H=Math.round(sr*.01),lo=Math.floor(sr/500),hi=Math.ceil(sr/70),f0=[],en=[];
 for(let s=0;s+W+hi<x.length;s+=H){let e=0;for(let i=0;i<W;i++)e+=x[s+i]*x[s+i];en.push(e/W);if(e/W<1e-5){f0.push(0);continue}
  const R=new Float64Array(hi+2);let best=0;for(let l=lo;l<=hi+1;l++){let c=0,e2=0;for(let i=0;i<W;i++){c+=x[s+i]*x[s+i+l];e2+=x[s+i+l]*x[s+i+l]}R[l]=c/Math.sqrt(e*e2+1e-12);if(l<=hi&&R[l]>best)best=R[l]}
  /* first local peak within 85% of the best: avoids picking a multiple of the period (octave-down errors) */
  let bl=0;for(let l=lo+1;l<=hi;l++)if(R[l]>=best*.85&&R[l]>=R[l-1]&&R[l]>=R[l+1]){bl=l;break}
  if(best<.5||!bl){f0.push(0);continue}
  const a=R[bl-1],b=R[bl],c2=R[bl+1],d=a-2*b+c2,off=d<0?.5*(a-c2)/d:0;f0.push(sr/(bl+Math.max(-.5,Math.min(.5,off))))}
 const track_=f0;track_.energy=en;return track_}
const med=a=>{const b=a.slice().sort((p,q)=>p-q);return b.length?b[b.length>>1]:0};
function contour(f0){const v=f0.filter(f=>f>0);if(v.length<5)return null;const m=med(v);
 let a=f0.map(f=>f>0?12*Math.log2(f/m):null);const i0=a.findIndex(x=>x!=null),i1=a.length-1-a.slice().reverse().findIndex(x=>x!=null);a=a.slice(i0,i1+1);
 const voiced=a.map(x=>x!=null);
 /* octave-jump repair: a frame more than 9 st from its predecessor is folded by 12 st */
 for(let i=1;i<a.length;i++)if(a[i]!=null&&a[i-1]!=null){const d=a[i]-a[i-1];if(d>9)a[i]-=12;else if(d<-9)a[i]+=12}
 for(let i=0;i<a.length;i++)if(a[i]==null)a[i]=a[i-1];let s=a.map((_,i)=>med(a.slice(Math.max(0,i-2),i+3)));
 /* speaker range: scale so the utterance's spread is comparable across voices (floor 2.5 st so a flat tone 1 is not inflated) */
 const vs=s.filter((_,i)=>voiced[i]),mu=vs.reduce((t,v)=>t+v,0)/vs.length,sd=Math.sqrt(vs.reduce((t,v)=>t+(v-mu)*(v-mu),0)/vs.length);const k=4/Math.max(2.5,sd);s=s.map(v=>v*k);
 s.voiced=voiced;s.start=i0;s.scale=k;return s}
function bounds(c,en,n){const L=c.length,b=[0];if(n<=1)return [0,L];const E=en?en.slice(c.start,c.start+L):null;
 for(let k=1;k<n;k++){const e=Math.round(k*L/n),w=Math.max(2,Math.round(L/n*.35));let best=e,bv=1e9;
  for(let i=Math.max(b[b.length-1]+3,e-w);i<=Math.min(L-3,e+w);i++){const v=(c.voiced[i]?0:-1)+(E?Math.log10((E[i]||0)+1e-9)/10:0)+Math.abs(i-e)/L*.5;if(v<bv){bv=v;best=i}}b.push(best)}
 b.push(L);return b}
function feats(c,a,b,k,n){const seg=[];for(let i=a;i<b;i++)if(c.voiced[i])seg.push(c[i]);if(seg.length<4)return null;
 const m=seg.length,t0=Math.floor(m*.12),t1=Math.max(t0+3,Math.ceil(m*.92)),s=seg.slice(t0,t1),q=j=>{const x=j*(s.length-1)/4,i=Math.floor(x),f=x-i;return s[i]*(1-f)+(s[Math.min(i+1,s.length-1)])*f};
 const p=[0,1,2,3,4].map(q),mn=Math.min(...s),mx=Math.max(...s),im=s.indexOf(mn)/(s.length-1);
 return [...p,p[2]-p[0],p[4]-p[2],mx-mn,im,k==n-1?1:0,n==1?1:0,m/c.length]}
function rules(seg){if(!seg||seg.length<4)return null;const n=seg.length,q=Math.max(1,Math.floor(n/4));
 const avg=(a,b)=>{let t=0;for(let i=a;i<b;i++)t+=seg[i];return t/(b-a)};const st=avg(0,q),en=avg(n-q,n),mn=Math.min(...seg),im=seg.indexOf(mn);
 const rise=en-st,dip=Math.min(st,en)-mn,mean=avg(0,n);if(dip>1.5&&im>n*.2&&im<n*.8)return 3;if(rise>2)return 2;if(rise<-2.5)return mean<-2?3:4;if(mean<-2.5)return 3;return 1}
function classify(f,seg){if(!f)return {t:null,p:null};if(!MODEL)return {t:rules(seg),p:null};const {mu,sd,W}=MODEL;const z=f.map((v,i)=>(v-mu[i])/(sd[i]||1));
 const lg=W.map(r=>r[0]+z.reduce((t,v,i)=>t+v*r[i+1],0)),mx=Math.max(...lg),ex=lg.map(v=>Math.exp(v-mx)),S=ex.reduce((a,b)=>a+b,0),p=ex.map(v=>v/S);
 const k=p.indexOf(Math.max(...p));return {t:k+1,p}}
/* surface (spoken) tones after standard sandhi */
function surface(tones,hz){const t=tones.slice(),h=hz?[...hz]:[];
 for(let i=0;i<t.length-1;i++){if(h[i]=='不'&&t[i]==4&&t[i+1]==4)t[i]=2;else if(h[i]=='一'&&t[i]==1&&t.length>1){if(t[i+1]==4)t[i]=2;else if(t[i+1]>=1&&t[i+1]<=3)t[i]=4}}
 for(let i=t.length-2;i>=0;i--)if(t[i]==3&&t[i+1]==3)t[i]=2;return t}
function analyse(x,sr,expected,hz){const f0=track(x,sr),c=contour(f0);if(!c)return{ok:false,reason:'Không nghe rõ giọng. Nói to và gần micro hơn.'};
 const n=expected.length,sf=surface(expected,hz),B=bounds(c,f0.energy,n),res=[];
 for(let k=0;k<n;k++){const f=feats(c,B[k],B[k+1],k,n),r=classify(f,c.slice(B[k],B[k+1])),e=sf[k];
  /* a non-final tone 3 is usually only the low part ("half third"): accept 3 or a low level/falling shape */
  const okT=r.t==null?null:e==5?null:r.t==e||(e==3&&k<n-1&&(r.t==1&&f&&f[2]<-1.5||r.t==4&&f&&f[4]<-2));
  res.push({expected:e,underlying:expected[k],got:r.t,match:e==5||r.t==null?null:!!okT,p:r.p,from:B[k],to:B[k+1]})}
 return{ok:true,contour:c,syl:res,bounds:B}}
const toneNums=numeric=>String(numeric).trim().split(/\s+/).map(s=>{const m=/([1-5])$/.exec(s);return m?+m[1]:5});
const api={track,contour,bounds,feats,classify,surface,analyse,toneNums,get model(){return MODEL}};
if(typeof module!='undefined'&&module.exports)module.exports=api;else root.TONES=api})(typeof self!='undefined'?self:this);
