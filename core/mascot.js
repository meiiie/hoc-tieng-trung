'use strict';
/* Neko v9: a procedural SVG character, written for this app (no third-party code or animation data).
   The animation anatomy follows github.com/ArvinYin1/grokbot-animation-anatomy:
   - every frame is computed: a radial-outline body (here with two cat ears) written to a few SVG nodes;
   - eyes are cut-outs (a mask) shaped by 7-point stroked polylines; expressions morph point by point;
   - choreography = hand-authored clips: keyframe tracks with cubic-Bezier easing (overshoot allowed) and
     clip-embedded face/blink events (blink 0.26 s, fully closed at 45 %); faces that already read as closed
     (happy, sad, squinted, sleepy, confused, calm) are not blinked through;
   - a state = clip list + face + optional morph/decor + next/hold; clips are shuffled with a seeded PRNG;
   - transitions are springs integrated at 120 Hz (semi-implicit Euler), never timers;
   - pseudo-3D: eye centres live on a sphere rotated by yaw/pitch with orthographic projection;
   - glow comes from fill (radial gradient + breathing halo), not geometry;
   - "morph" states turn the body into another shape (here: three bouncing dots while processing).
   Reduced motion: a single static pose per state, no animation loop. */
const MASCOT_NAME='Neko';
/* user colours: l = body on light theme, d = body on dark theme. tests/mascot.test.js checks >= 3:1 against the page. */
const NK_COLORS={cocoa:{l:'#2A2928',d:'#B9B2A8',vi:'Than'},sky:{l:'#245E87',d:'#6FA8D6',vi:'Xanh trời'},sage:{l:'#3E7C59',d:'#6DB58B',vi:'Xanh lá'},
 plum:{l:'#6B4A7A',d:'#B48CC4',vi:'Tím mận'},clay:{l:'#A8523A',d:'#D98A6E',vi:'Đất nung'},gold:{l:'#8A6A12',d:'#D9B04A',vi:'Vàng mật'}};
const NK_STATES=['idle','wave','think','happy','sad','meditate','celebrate','sleepy','surprised','encouraging','curious','confused','proud','waking',
 'listen','listening','speaking','processing','analyzing','correct','wrong'];
const NK=(()=>{
 if(typeof window==='undefined')return null;
 const RM=matchMedia('(prefers-reduced-motion: reduce)');let uid=0;const live=new Set();
 const bez=(x1,y1,x2,y2)=>x=>{if(x<=0)return 0;if(x>=1)return 1;let t=x;for(let i=0;i<8;i++){const cx=3*x1*t*(1-t)**2+3*x2*t*t*(1-t)+t**3-x,d=3*x1*(1-t)**2+6*(x2-x1)*t*(1-t)+3*(1-x2)*t*t;if(Math.abs(d)<1e-6)break;t=Math.min(1,Math.max(0,t-cx/d))}return 3*y1*t*(1-t)**2+3*y2*t*t*(1-t)+t**3};
 const EZ={io:bez(.42,0,.58,1),out:bez(.2,.8,.3,1),pop:bez(.3,1.55,.55,1),in:bez(.55,0,.9,.45),back:bez(.5,-.45,.6,1)};
 const rng=s=>()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
 /* ---- faces: per eye a 7-point polyline (x>0 = towards the outside of the face) and a stroke width ---- */
 const ln=(x0,y0,x1,y1)=>Array.from({length:7},(_,i)=>[x0+(x1-x0)*i/6,y0+(y1-y0)*i/6]);
 const ar=(w,h,dy)=>Array.from({length:7},(_,i)=>{const u=i/3-1;return [u*w,dy-h*(1-u*u)]});
 const FACE={neutral:{r:[ln(0,-8,0,8),8.6]},surprised:{r:[ln(0,-10.5,0,10.5),10.4]},happy:{r:[ar(6.8,7,3),4.6],nb:1},
  calm:{r:[ar(6.2,-4.2,-1.5),4.2],nb:1},sleepy:{r:[ln(-6,2,6,2),3.6],nb:1},squinted:{r:[ln(-5.5,2,5.5,-1.5),5.2],nb:1},
  sad:{r:[ln(-1.6,-5.5,1.2,6),7.4],nb:1},inspecting:{r:[ln(0,-8.5,0,8.5),9],l:[ln(-5,0,5,0),6]},
  confused:{r:[ln(0,-4.5,0,4.5),7.2].map((v,i)=>i?v:v.map(([x,y])=>[x,y-4])),l:[ln(0,-8,0,8),8.6],nb:1}};
 const CLOSED=[ln(-6,1,6,1),3.6];
 /* ---- clips: tracks x,y,rot,sx,sy,yaw,pitch,eL,eR (ear raise),lid; keyframes [t, v, ease]; f = face/blink events ---- */
 const K=(...a)=>a;
 const CL={
  breathe:{d:6,k:{y:K([0,0],[1.5,-1.4,'io'],[3,0,'io'],[4.5,-1.4,'io'],[6,0,'io']),sy:K([0,1],[1.5,1.014,'io'],[3,1,'io'],[4.5,1.014,'io'],[6,1,'io']),yaw:K([0,0],[2.5,.1,'io'],[6,0,'io'])},f:[[1.9,'blink'],[4.7,'blink']]},
  look:{d:5,k:{yaw:K([0,0],[.5,.32,'pop'],[2,.32],[2.5,-.26,'pop'],[3.8,-.26],[4.4,0,'io']),pitch:K([0,0],[.5,-.06,'io'],[2.5,.04,'io'],[4.4,0,'io']),rot:K([0,0],[.5,2,'io'],[2.5,-2,'io'],[4.4,0,'io'])},f:[[2.2,'blink'],[2.45,'blink']]},
  twitch:{d:4,k:{eL:K([0,0],[1.1,0],[1.22,.9,'out'],[1.45,0,'pop'],[2.6,0],[2.72,.7,'out'],[2.95,0,'pop']),eR:K([0,0],[2.6,0],[2.72,.7,'out'],[2.95,0,'pop']),y:K([0,0],[2,-1,'io'],[4,0,'io'])},f:[[3.4,'blink']]},
  wave:{d:1.3,k:{y:K([0,0],[.16,2,'out'],[.42,-11,'out'],[.7,0,'in'],[.9,-4,'out'],[1.15,0,'io']),sy:K([0,1],[.16,.9,'out'],[.42,1.08,'out'],[.7,.95,'in'],[1.15,1,'io']),sx:K([0,1],[.16,1.07,'out'],[.42,.95,'out'],[.7,1.04,'in'],[1.15,1,'io']),rot:K([0,0],[.42,-7,'out'],[.7,5,'io'],[.95,-4,'io'],[1.2,0,'io']),eL:K([0,0],[.42,1.2,'out'],[1.2,.3,'io']),eR:K([0,0],[.42,.6,'out'],[1.2,.3,'io'])}},
  ponder:{d:4,k:{yaw:K([0,-.34],[2,-.26,'io'],[4,-.34,'io']),pitch:K([0,-.3],[2,-.34,'io'],[4,-.3,'io']),rot:K([0,-6],[2,-8,'io'],[4,-6,'io']),eL:K([0,.3]),eR:K([0,-.2]),y:K([0,0],[2,-1,'io'],[4,0,'io'])},f:[[2.6,'blink']]},
  hop:{d:1.1,once:1,k:{y:K([0,0],[.14,2,'out'],[.38,-10,'out'],[.62,0,'in'],[.8,-3,'out'],[1,0,'io']),sy:K([0,1],[.14,.92,'out'],[.38,1.07,'out'],[.62,.94,'in'],[.8,1.02,'out'],[1,1,'io']),sx:K([0,1],[.14,1.06,'out'],[.38,.96,'out'],[.62,1.05,'in'],[1,1,'io']),eL:K([0,0],[.38,.9,'out'],[1,.3,'io']),eR:K([0,0],[.38,.9,'out'],[1,.3,'io'])}},
  hop2:{d:1.2,once:1,k:{y:K([0,0],[.12,3,'out'],[.4,-14,'out'],[.68,0,'in'],[.86,-2,'out'],[1.05,0,'io']),sy:K([0,1],[.12,.88,'out'],[.4,1.1,'out'],[.68,.92,'in'],[1.05,1,'io']),sx:K([0,1],[.12,1.09,'out'],[.4,.94,'out'],[.68,1.06,'in'],[1.05,1,'io']),eL:K([0,0],[.4,1.25,'out'],[1.1,.6,'io']),eR:K([0,0],[.4,1.25,'out'],[1.1,.6,'io']),pitch:K([0,0],[.4,-.12,'out'],[1,0,'io'])}},
  spin:{d:1.6,k:{y:K([0,0],[.2,3,'out'],[.55,-16,'out'],[.95,0,'in'],[1.2,-4,'out'],[1.6,0,'io']),rot:K([0,0],[.2,-8,'out'],[.95,360,'io'],[1.6,360]),sy:K([0,1],[.2,.88,'out'],[.55,1.1,'out'],[.95,.92,'in'],[1.6,1,'io']),eL:K([0,0],[.55,1.2,'out'],[1.6,.4,'io']),eR:K([0,0],[.55,1.2,'out'],[1.6,.4,'io'])}},
  droop:{d:1,once:1,k:{y:K([0,0],[.8,4,'out']),pitch:K([0,0],[.8,.3,'out']),sy:K([0,1],[.8,.97,'out']),eL:K([0,0],[.7,-1,'out']),eR:K([0,0],[.8,-1,'out']),yaw:K([0,0],[.8,-.1,'io'])}},
  shake:{d:1,once:1,k:{x:K([0,0],[.1,-4.5,'out'],[.25,4.5,'io'],[.4,-3,'io'],[.55,2,'io'],[.75,0,'io']),rot:K([0,0],[.1,-6,'out'],[.25,6,'io'],[.4,-3,'io'],[.55,2,'io'],[.75,0,'io']),y:K([0,0],[.75,2,'io']),pitch:K([0,0],[.75,.18,'io']),eL:K([0,0],[.15,-.9,'out']),eR:K([0,0],[.15,-.9,'out'])},f:[[.8,'sad']]},
  float:{d:7,k:{y:K([0,0],[3.5,-4,'io'],[7,0,'io']),sy:K([0,1],[3.5,1.012,'io'],[7,1,'io']),eL:K([0,-.15]),eR:K([0,-.15])}},
  doze:{d:5,k:{y:K([0,2],[2.5,3.2,'io'],[5,2,'io']),rot:K([0,6],[2.5,8,'io'],[5,6,'io']),sy:K([0,.98],[2.5,.955,'io'],[5,.98,'io']),eL:K([0,-.7]),eR:K([0,-.5]),pitch:K([0,.12])}},
  pop:{d:.8,once:1,k:{y:K([0,0],[.1,-7,'out'],[.35,0,'io']),sy:K([0,1],[.1,1.1,'out'],[.35,.97,'io'],[.6,1,'io']),sx:K([0,1],[.1,.93,'out'],[.35,1.02,'io'],[.6,1,'io']),eL:K([0,0],[.1,1.3,'out'],[.6,.9,'io']),eR:K([0,0],[.1,1.3,'out'],[.6,.9,'io'])}},
  nod:{d:1.4,once:1,k:{rot:K([0,0],[.3,5,'out'],[1.2,4,'io']),pitch:K([0,0],[.3,.18,'out'],[.55,-.06,'io'],[.8,.15,'io'],[1.1,0,'io']),y:K([0,0],[.3,2,'out'],[.55,-1,'io'],[.8,2,'io'],[1.1,0,'io']),eL:K([0,0],[1.1,.35,'io']),eR:K([0,0],[1.1,.35,'io'])}},
  tilt:{d:4,k:{rot:K([0,0],[.45,12,'pop'],[2.2,12],[2.7,9,'io'],[4,12,'io']),yaw:K([0,0],[.45,.22,'pop'],[4,.18,'io']),eL:K([0,0],[.45,1,'out'],[2,.6,'io']),eR:K([0,0],[.45,.2,'out'])},f:[[1.6,'blink']]},
  puzzle:{d:3.2,k:{rot:K([0,-8],[1.6,8,'io'],[3.2,-8,'io']),yaw:K([0,-.15],[1.6,.15,'io'],[3.2,-.15,'io']),eL:K([0,.7],[1.6,-.2,'io'],[3.2,.7,'io']),eR:K([0,-.2],[1.6,.7,'io'],[3.2,-.2,'io'])}},
  puff:{d:1.2,once:1,k:{sx:K([0,1],[.35,1.06,'pop'],[1.2,1.04,'io']),sy:K([0,1],[.35,1.04,'pop'],[1.2,1.02,'io']),pitch:K([0,0],[.35,-.16,'out']),y:K([0,0],[.35,-2,'out']),eL:K([0,0],[.35,.9,'out']),eR:K([0,0],[.35,.9,'out'])}},
  wake:{d:1.2,once:1,k:{y:K([0,3],[.2,4,'out'],[.45,-6,'out'],[.8,0,'io']),sy:K([0,.95],[.2,.92,'out'],[.45,1.08,'out'],[.8,1,'io']),eL:K([0,-.6],[.45,1.2,'out'],[1.1,.5,'io']),eR:K([0,-.6],[.5,1.2,'out'],[1.1,.5,'io'])}},
  perk:{d:3,k:{eL:K([0,1.1],[1.5,1.25,'io'],[3,1.1,'io']),eR:K([0,1.1],[1.5,1.2,'io'],[3,1.1,'io']),yaw:K([0,.14]),pitch:K([0,-.05]),rot:K([0,3],[1.5,4,'io'],[3,3,'io']),y:K([0,0],[1.5,-1,'io'],[3,0,'io'])},f:[[1.8,'blink']]},
  talk:{d:.9,k:{sy:K([0,1],[.22,1.04,'out'],[.45,.98,'io'],[.68,1.03,'out'],[.9,1,'io']),sx:K([0,1],[.22,.97,'out'],[.45,1.01,'io'],[.68,.98,'out'],[.9,1,'io']),y:K([0,0],[.22,-2,'out'],[.45,0,'io'],[.68,-1,'out'],[.9,0,'io']),eL:K([0,.3]),eR:K([0,.3])}},
  bob:{d:1.4,k:{y:K([0,0],[.7,-1,'io'],[1.4,0,'io'])}}};
 const ST={idle:{c:['breathe','breathe','look','breathe','twitch'],f:'neutral',gaze:1},wave:{c:['wave'],f:'happy',next:'idle',hold:2.4},
  think:{c:['ponder'],f:'inspecting',decor:'orbit'},happy:{c:['hop'],f:'happy'},sad:{c:['droop'],f:'sad'},meditate:{c:['float'],f:'calm',halo:.5},
  celebrate:{c:['spin','hop2'],f:'happy',decor:'spark',halo:.35},sleepy:{c:['doze'],f:'sleepy',decor:'zz'},surprised:{c:['pop'],f:'surprised',next:'idle',hold:1.6},
  encouraging:{c:['nod'],f:'calm'},curious:{c:['tilt'],f:'inspecting',gaze:1},confused:{c:['puzzle'],f:'confused'},proud:{c:['puff'],f:'calm',halo:.3},
  waking:{c:['wake'],f:'surprised',next:'idle',hold:1.6},listening:{c:['perk'],f:'neutral',decor:'rings',halo:.35},speaking:{c:['talk'],f:'calm',decor:'wave'},
  processing:{c:['bob'],f:'neutral',morph:1},correct:{c:['hop2'],f:'happy',decor:'spark',halo:.4},wrong:{c:['shake'],f:'squinted'}};
 ST.listen=ST.listening;ST.analyzing=ST.processing;
 const TR=['x','y','rot','sx','sy','yaw','pitch','eL','eR','lid'],BASE={x:0,y:0,rot:0,sx:1,sy:1,yaw:0,pitch:0,eL:0,eR:0,lid:0};
 function sample(c,t){const o={...BASE};for(const tr in c.k){const k=c.k[tr];let a=k[0],b=null;for(const f of k){if(f[0]<=t)a=f;else{b=f;break}}
   o[tr]=!b||b===a?a[1]:a[1]+(b[1]-a[1])*(EZ[b[2]]||EZ.io)((t-a[0])/(b[0]-a[0]))}
  let lid=0,face=null;for(const [ft,v] of c.f||[]){if(v=='blink'){const u=(t-ft)/.26;if(u>=0&&u<=1)lid=Math.max(lid,u<.45?u/.45:1-(u-.45)/.55)}else if(t>=ft)face=v}
  o.lid=Math.max(o.lid,lid);o.face=face;return o}
 /* ---- body: radial outline with two ears, sampled on 120 rays -> closed Catmull-Rom path ---- */
 function outline(eL,eR,sx,sy,m){const N=120,R=40*(1-.5*m),pts=[];
  for(let i=0;i<N;i++){const a=i/N*2*Math.PI-Math.PI/2;let r=R*(1-0.05*Math.pow(Math.max(0,Math.sin(a)),6)+0.025*Math.cos(2*a)*(1-m));
   for(const s of [-1,1]){const e=s<0?eL:eR,c=s*(0.66+0.13*Math.max(0,-e)-0.03*Math.max(0,e)),w=0.36,d=Math.atan2(Math.sin(a+Math.PI/2-c),Math.cos(a+Math.PI/2-c)),h=(17+5.5*e)*(1-.62*m);
    r+=Math.max(0,h)*Math.pow(Math.max(0,1-Math.abs(d)/w),1.5)}
   pts.push([Math.cos(a)*r*sx*1.06,Math.sin(a)*r*sy+(1-sy)*10])}
  return cr(pts)}
 const f1=v=>Math.round(v*10)/10;
 function cr(p){const N=p.length;let s=`M${f1(p[0][0])} ${f1(p[0][1])}`;for(let i=0;i<N;i++){const p0=p[(i-1+N)%N],p1=p[i],p2=p[(i+1)%N],p3=p[(i+2)%N];
  s+=`C${f1(p1[0]+(p2[0]-p0[0])/6)} ${f1(p1[1]+(p2[1]-p0[1])/6)} ${f1(p2[0]-(p3[0]-p1[0])/6)} ${f1(p2[1]-(p3[1]-p1[1])/6)} ${f1(p2[0])} ${f1(p2[1])}`}return s+'Z'}
 function eyePos(side,yaw,pitch){const lon=side*0.36,lat=-0.06;let x=Math.sin(lon)*Math.cos(lat),y=Math.sin(lat),z=Math.cos(lon)*Math.cos(lat);
  const x1=x*Math.cos(yaw)+z*Math.sin(yaw),z1=-x*Math.sin(yaw)+z*Math.cos(yaw),y2=y*Math.cos(pitch)-z1*Math.sin(pitch),z2=y*Math.sin(pitch)+z1*Math.cos(pitch);return [x1*36,y2*36,Math.max(.3,z2)]}
 function decor(kind,t,lv){if(!kind)return'';const P=(x,y,r,o=1)=>`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" opacity="${o.toFixed(2)}"/>`;
  if(kind=='orbit'){let s='';for(let i=0;i<3;i++){const a=t*2.2+i*2.09;s+=P(Math.cos(a)*50,-36+Math.sin(a)*9,i?2.4:3.2,.45+.55*(Math.sin(a)+1)/2)}return s}
  if(kind=='spark'){let s='';const u=Math.min(1,t/.75);for(let i=0;i<8;i++){const a=i*.785+.2,d=34+24*EZ.out(u);s+=P(Math.cos(a)*d,Math.sin(a)*d-4,2.8*(1-u*.55),1-u*.75)}return s}
  if(kind=='rings'){let s='';for(let i=0;i<2;i++){const u=(t*.9+i*.5)%1,r=10+u*(12+10*lv);for(const sd of [-1,1])s+=`<path d="M${f1(sd*(47+u*6))} ${f1(-12-r*.6)} q${f1(sd*r*.5)} ${f1(r*.6)} 0 ${f1(r*1.2)}" fill="none" stroke-width="2.4" stroke-linecap="round" opacity="${((1-u)*(.55+.45*Math.min(1,lv*2))).toFixed(2)}"/>`}return s}
  if(kind=='wave'){let s='';for(let i=0;i<4;i++){const h=4+8*Math.abs(Math.sin(t*7+i*1.3));s+=`<rect x="${50+i*5}" y="${f1(-4-h/2)}" width="2.6" height="${f1(h)}" rx="1.3"/>`}return s}
  if(kind=='zz'){const u=(t%2.4)/2.4;return `<text x="${f1(40+u*10)}" y="${f1(-38-u*16)}" font-size="${f1(9+u*4)}" font-weight="700" opacity="${(1-u).toFixed(2)}" stroke="none">z</text>`}return''}
 let gx=0,gy=0;addEventListener('pointermove',e=>{gx=Math.max(-1,Math.min(1,(e.clientX/innerWidth)*2-1));gy=Math.max(-1,Math.min(1,(e.clientY/innerHeight)*2-1))},{passive:true});
 class Bot{
  constructor(el){this.el=el;this.id='nk'+(++uid);this.rnd=rng(uid*7919+13);this.lv=0;this.m=0;this.mv=0;this.pk=0;this.frozen=el.dataset.frozen!=null?+el.dataset.frozen:null;
   this.pos={...BASE};this.vel={};for(const k of TR)this.vel[k]=0;const f=FACE[(ST[el.dataset.state]||ST.idle).f];this.eye=[this.ft(f,-1),this.ft(f,1)];this.efrom=null;
   this.svgInit();this.set(el.dataset.state||'idle',true);live.add(this);el._nk=this;
   el.addEventListener('pointerdown',()=>this.poke());loop()}
  ft(f,side){const s=side<0&&f.l?f.l:f.r;return {p:s[0].map(q=>q.slice()),w:s[1]}}
  svgInit(){const i=this.id;this.el.innerHTML=`<svg class="nk2" viewBox="-66 -74 132 132" aria-hidden="true" focusable="false"><defs>
   <radialGradient id="${i}g" gradientUnits="userSpaceOnUse" cx="-12" cy="-22" r="70" fx="-14" fy="-26"><stop offset="0" class="nk-hi"/><stop offset=".6" class="nk-mid"/><stop offset="1" class="nk-lo"/></radialGradient>
   <radialGradient id="${i}h"><stop offset=".55" class="nk-halo" stop-opacity="0"/><stop offset=".78" class="nk-halo" stop-opacity=".5"/><stop offset="1" class="nk-halo" stop-opacity="0"/></radialGradient>
   <mask id="${i}m" maskUnits="userSpaceOnUse" x="-80" y="-90" width="160" height="170"><rect x="-80" y="-90" width="160" height="170" fill="#fff"/><path class="nk-eh" fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round"/><path class="nk-eh" fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round"/></mask></defs>
   <ellipse class="nk-shadow" cx="0" cy="47" rx="30" ry="4"/><circle class="nk-hl" cx="0" cy="-4" r="62" fill="url(#${i}h)" opacity="0"/>
   <g class="nk-body"><g class="nk-dots"></g><path class="nk-fill" fill="url(#${i}g)" mask="url(#${i}m)"/></g><g class="nk-decor"></g></svg>`;
   const q=s=>this.el.querySelector(s);this.$b=q('.nk-body');this.$p=q('.nk-fill');this.$e=[...this.el.querySelectorAll('.nk-eh')];this.$d=q('.nk-decor');this.$s=q('.nk-shadow');this.$h=q('.nk-hl');this.$o=q('.nk-dots')}
  set(st,snap){if(!ST[st])st='idle';const same=st==this.st;this.st=st;this.S=ST[st];this.el.dataset.state=st;this.t0=performance.now();this.face=null;
   if(!same||snap)this.pick(true);else this.pick(false);this.setFace(this.S.f,snap);if(snap||RM.matches||this.frozen!=null)this.frame(performance.now(),true);loop()}
  pick(first){const c=this.S.c;this.clip=CL[c[first?0:Math.floor(this.rnd()*c.length)]];this.ct0=performance.now();
   /* looping clips start at a random phase so several Nekos never move in lockstep */
   this.phase=first&&!this.clip.once&&this.S.c.length>1?0:(!this.clip.once&&first?this.rnd()*this.clip.d*.5:0)}
  setFace(name,snap){const f=FACE[name]||FACE.neutral;if(name==this.fname&&!snap)return;this.fname=name;this.fdef=f;
   const to=[this.ft(f,-1),this.ft(f,1)];if(snap||RM.matches){this.eye=to;this.efrom=null;return}this.efrom=this.eye.map(e=>({p:e.p.map(q=>q.slice()),w:e.w}));this.eto=to;this.et0=performance.now()}
  level(v){this.lv=Math.max(v,this.lv*.8)}
  poke(){if(RM.matches||this.frozen!=null)return;this.vel.rot+=(this.rnd()<.5?-1:1)*520;this.vel.sy-=3;this.vel.eL+=14;this.vel.eR+=14;this.pk=performance.now();loop()}
  frame(now,snap){const S=this.S;let t=(now-this.ct0)/1000+this.phase;
   if(this.frozen!=null)t=this.frozen;else if(RM.matches)t=this.clip.once?this.clip.d:(this.clip.rm||0);
   if(S.next&&!RM.matches&&this.frozen==null&&(now-this.t0)/1000>S.hold){this.set(S.next);return}
   if(t>=this.clip.d&&!this.clip.once&&this.frozen==null&&!RM.matches){this.pick(false);t=0}
   const tgt=sample(this.clip,Math.min(t,this.clip.d));if(tgt.face)this.setFace(tgt.face);
   if(S.gaze&&!RM.matches&&this.frozen==null){tgt.yaw+=gx*.28;tgt.pitch+=gy*.16}
   if(S.decor=='rings'){tgt.eL+=.4*this.lv;tgt.eR+=.4*this.lv}
   const mt=S.morph?1:0,dt=1/120,frozen=this.frozen!=null||RM.matches;
   if(snap||frozen){for(const k of TR){this.pos[k]=tgt[k];this.vel[k]=0}this.m=mt;this.mv=0}
   else{const steps=Math.min(12,Math.max(1,Math.round(((now-(this.last||now))/1000)/dt)));
    for(let s=0;s<steps;s++){for(const k of TR){const w=k=='eL'||k=='eR'?2*Math.PI*6:k=='lid'?2*Math.PI*14:2*Math.PI*8,kk=w*w,c=2*w*.7;
      this.vel[k]+=(kk*(tgt[k]-this.pos[k])-c*this.vel[k])*dt;this.pos[k]+=this.vel[k]*dt}
     const w=2*Math.PI*3.2;this.mv+=(w*w*(mt-this.m)-2*w*.8*this.mv)*dt;this.m+=this.mv*dt}}
   this.last=now;const p=this.pos,m=Math.max(0,Math.min(1.1,this.m)),tt=(now-this.t0)/1000;
   /* face point morph (0.28 s ease) + blink: the eye polyline is pulled towards a closed line */
   if(this.efrom){const u=EZ.io(Math.min(1,(now-this.et0)/280));this.eye=this.eto.map((e,j)=>({p:e.p.map((q,i)=>[this.efrom[j].p[i][0]+(q[0]-this.efrom[j].p[i][0])*u,this.efrom[j].p[i][1]+(q[1]-this.efrom[j].p[i][1])*u]),w:this.efrom[j].w+(e.w-this.efrom[j].w)*u}));if(u>=1)this.efrom=null}
   const lid=this.fdef.nb?0:Math.max(0,Math.min(1,p.lid)),pkf=this.pk&&now-this.pk<500?1:0;
   let mx=0,my=0;if(m>.01){const lift=frozen?0:Math.max(0,Math.sin(((now/1400)%1)*2*Math.PI));my=-9*m*lift}
   this.$b.setAttribute('transform',`translate(${f1(p.x)} ${f1(p.y+my)}) rotate(${f1(p.rot)})`);this.$p.setAttribute('d',outline(p.eL,p.eR,p.sx,p.sy,Math.min(1,m)));
   this.$s.setAttribute('rx',f1(30*(1+(p.y+my)/60)*(1-.3*m)));
   this.$e.forEach((node,j)=>{const sd=j?1:-1,[ex,ey,z]=eyePos(sd,p.yaw,p.pitch),e=this.eye[j];
    const pts=e.p.map((q,i)=>{const c=CLOSED[0][i],k=pkf?.0:lid;return [(q[0]+(c[0]-q[0])*k)*sd*(.55+.45*z),q[1]+(c[1]-q[1])*k]});
    node.setAttribute('d','M'+pts.map(([x,y])=>`${f1(ex*p.sx+x)} ${f1(ey*p.sy+2+y)}`).join('L'));node.setAttribute('stroke-width',f1((e.w+(CLOSED[1]-e.w)*lid)*(.6+.4*z)));
    node.setAttribute('opacity',(1-Math.min(1,Math.max(0,(m-.35)/.25))).toFixed(2))});
   let dots='';if(m>.01){for(const sd of [-1,1]){const ph=frozen?0:Math.max(0,Math.sin((((now/1400)+(sd<0?.12:-.12))%1)*2*Math.PI));dots+=`<circle class="nk-dot" cx="${f1(sd*34*Math.min(1,m))}" cy="${f1(-9*m*ph*.9-my+2)}" r="${f1(13*Math.min(1,m))}"/>`}}
   this.$o.innerHTML=dots;
   const breath=.42+.16*Math.sin(tt*2*Math.PI/5.4);this.$h.setAttribute('opacity',((S.halo||.1)*(frozen?.58:breath)*1.1).toFixed(3));
   const dc=S.decor;this.$d.innerHTML=frozen?decor(dc,dc=='spark'?.5:.35,.5):decor(dc,tt,this.lv);this.lv*=.96}}
 let raf=0;function loop(){if(raf||RM.matches)return;raf=requestAnimationFrame(tick)}
 function tick(now){raf=0;if(document.hidden)return;let any=0;for(const b of live){if(!b.el.isConnected){live.delete(b);continue}if(b.frozen!=null)continue;b.frame(now);any=1}if(any)loop()}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)loop()});
 RM.addEventListener&&RM.addEventListener('change',()=>{for(const b of live)b.set(b.st,true);loop()});
 function mountAll(root=document){root.querySelectorAll('.mwrap[data-state]').forEach(el=>{if(!el._nk)new Bot(el)})}
 new MutationObserver(()=>mountAll()).observe(document.documentElement,{childList:true,subtree:true});
 return {mountAll,Bot,states:Object.keys(ST),faces:Object.keys(FACE),clips:Object.keys(CL)}})();
function mascot(state,text,opts={}){const clean=text?String(text).replace(/<[^>]+>/g,' ').replace(/"/g,'').replace(/\s+/g,' ').trim():'';
 return `<div class="mascot ${opts.small?'small':''} ${opts.row?'row':''}" role="img" aria-label="${MASCOT_NAME}${clean?': '+clean:''}"><div class="mwrap" data-state="${NK_STATES.includes(state)?state:'idle'}"></div>${text?`<div class="bubble">${text}</div>`:''}</div>`}
function moodTo(el,state,text,ms){if(!el)return;const w=el.querySelector('.mwrap');if(w){if(w._nk)w._nk.set(state);else w.dataset.state=state}
 if(text!=null){let b=el.querySelector('.bubble');if(!b){b=document.createElement('div');b.className='bubble';el.appendChild(b)}b.innerHTML=text;b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop');el.setAttribute('aria-label',MASCOT_NAME+': '+String(text).replace(/<[^>]+>/g,' ').trim())}
 if(ms){clearTimeout(el._t);el._t=setTimeout(()=>moodTo(el,'idle'),ms)}}
function mascotLevel(el,v){const w=el&&el.querySelector('.mwrap');if(w&&w._nk)w._nk.level(v)}
if(typeof module!=='undefined')module.exports={NK_COLORS,NK_STATES};
