/* Web motion: see MOTION.md. All artwork is original, in a 120 × 100 viewBox. */
(function(root){
 'use strict';
 const ITEMS=[
  {id:'苹果|ping2guo3',art:'apple'}, {id:'香蕉|xiang1jiao1',art:'banana'},
  {id:'橙子|cheng2zi5',art:'orange'}, {id:'西瓜|xi1gua1',art:'watermelon'},
  {id:'面包|mian4bao1',art:'bread'}, {id:'牛奶|niu2nai3',art:'milk'},
  {id:'鸡蛋|ji1dan4',art:'egg'}, {id:'茶|cha2',art:'tea'}
 ];
 const MOTION={travel:280,return:180,press:120,arc:28,dragThreshold:6,ease:'cubic-bezier(.23,1,.32,1)'};
 const ART={
  apple:'<path d="M59 30C39 15 19 29 22 52c2 22 17 36 29 33 6-2 10-2 16 0 14 3 29-18 30-36 1-22-21-32-38-19Z" fill="#D56B53"/><path d="M60 32c-1-11 2-18 8-23" fill="none" stroke="#75503C" stroke-width="5"/><path d="M66 21C68 7 87 9 89 11c-3 12-14 15-23 10Z" fill="#658368"/><path d="M32 43c0-6 3-10 9-12" fill="none" stroke="#F5B19A" stroke-width="5" stroke-linecap="round"/><path d="M78 71c9-9 11-17 10-25" fill="none" stroke="#BF5745" stroke-width="5" stroke-linecap="round"/>',
  banana:'<path d="m37 19 9 3c-2 23 13 46 39 43 8-1 15-5 21-11-8 28-30 37-51 24C35 66 26 40 37 19Z" fill="#E2B653"/><path d="m26 28 9 1c1 25 15 45 40 43 10 0 18-3 26-10-9 24-35 34-56 17C28 65 20 44 26 28Z" fill="#F0CD71"/><path d="m26 28 2-9 9 3-2 7m2-10 3-9 9 4-3 8" fill="#7C7851"/><path d="M34 41c3 20 20 37 39 37" fill="none" stroke="#D9AC4A" stroke-width="3" stroke-linecap="round"/>',
  orange:'<circle cx="60" cy="55" r="34" fill="#E9A04C"/><path d="M60 22c1-8 5-13 11-15" fill="none" stroke="#75503C" stroke-width="4"/><path d="M65 19C66 5 84 6 88 9c-4 13-16 14-23 10Z" fill="#658368"/><path d="M36 44c2-6 6-10 12-12" fill="none" stroke="#F8CC86" stroke-width="5" stroke-linecap="round"/><g fill="#D58A3A"><circle cx="70" cy="69" r="2"/><circle cx="78" cy="59" r="2"/><circle cx="61" cy="75" r="2"/><circle cx="80" cy="70" r="1.5"/></g>',
  watermelon:'<path d="M9 39h102c-5 33-24 51-51 51S14 72 9 39Z" fill="#568465"/><path d="M15 39h90c-5 27-21 44-45 44S20 66 15 39Z" fill="#D4DCA9"/><path d="M21 39h78c-5 23-19 37-39 37S26 61 21 39Z" fill="#DC7965"/><g fill="#6B4540"><ellipse cx="39" cy="49" rx="2.5" ry="4" transform="rotate(-35 39 49)"/><ellipse cx="59" cy="50" rx="2.5" ry="4"/><ellipse cx="80" cy="49" rx="2.5" ry="4" transform="rotate(35 80 49)"/><ellipse cx="49" cy="64" rx="2.5" ry="4"/><ellipse cx="70" cy="63" rx="2.5" ry="4"/></g>',
  bread:'<path d="M16 62c-6-14 9-28 23-30 7-18 29-20 40-6 20-2 32 20 25 38l-7 20H23Z" fill="#CE965A"/><path d="M21 62c-5-11 8-23 22-24 7-18 25-19 34-6 20-2 28 14 22 29Z" fill="#E8BE83"/><path d="m45 34-9 20m30-25-9 24m31-13-8 16" stroke="#F8DEAE" stroke-width="6" stroke-linecap="round"/><path d="M25 73h68" stroke="#BD834D" stroke-width="3" stroke-linecap="round"/>',
  milk:'<path d="m38 24 10-15h27l9 15v64H38Z" fill="#E3EBE9"/><path d="m38 24 10-15h27L64 24Z" fill="#C6DAD7"/><path d="M64 24h20v64H64Z" fill="#AED0CB"/><path d="M38 40h26v30H38Z" fill="#698F91"/><path d="M64 40h20v30H64Z" fill="#547B7D"/><path d="M51 46c-2 5-7 9-7 13a7 7 0 0 0 14 0c0-4-5-8-7-13Z" fill="#F7FAF6"/><path d="M48 9h27" stroke="#698F91" stroke-width="5" stroke-linecap="round"/>',
  egg:'<path d="M37 24C19 24 15 49 17 63c2 17 30 19 35 1 5-16 0-40-15-40Z" fill="#D5B291"/><path d="M69 14C51 14 42 45 44 63c2 24 38 28 46 6 7-20-3-55-21-55Z" fill="#EAD3B8"/><path d="M61 28c-5 7-8 16-8 24" fill="none" stroke="#FAEBD8" stroke-width="5" stroke-linecap="round"/><path d="M72 83c15 0 22-13 19-26" fill="none" stroke="#D5B291" stroke-width="3"/>',
  tea:'<ellipse cx="57" cy="84" rx="44" ry="7" fill="#D1D7BD"/><path d="M86 41h9c17 0 18 26-6 27" fill="none" stroke="#789276" stroke-width="8"/><path d="M24 39h65l-6 34c-4 14-45 14-51 0Z" fill="#95AB87"/><ellipse cx="56" cy="39" rx="32" ry="8" fill="#C7D4B1"/><ellipse cx="56" cy="40" rx="26" ry="5" fill="#8E7B4E"/><path d="M55 18c-1-9 15-14 21-12-2 12-14 16-21 12Z" fill="#658368"/>'
 };
 function art(key){return `<svg viewBox="0 0 120 100" aria-hidden="true" focusable="false">${ART[key]}</svg>`}
 function shuffled(list,random=Math.random){const out=list.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
 function rounds(pool,random=Math.random){return shuffled(pool,random).slice(0,6).map(target=>({target,options:shuffled([target,...shuffled(pool.filter(x=>x.id!==target.id),random).slice(0,3)],random)}))}

 function mount({host,byId,play,stopAudio,audio,icon,mascot,react,escape,script,pinyin}){
  const pool=ITEMS.map(item=>({...item,word:byId(item.id)})).filter(item=>item.word);
  if(pool.length<4){host.innerHTML='<p>Chưa tải đủ từ cho trò chơi. Hãy quay lại và thử tải lại trang.</p>';return ()=>{}}
  const abort=new AbortController(),signal=abort.signal,reduced=matchMedia('(prefers-reduced-motion: reduce)'),animations=new Set();
  let session=rounds(pool),index=0,phase='choosing',hint=false,mode='read',dead=false,drag=null,frame=0,visible=true,suppressClick=false;
  const e=escape;
  const places=()=>session.map(()=>'<span class="market-place"></span>').join('');
  host.innerHTML=`<div class="market-top"><span class="market-count"></span><div class="market-modes" role="group" aria-label="Cách chơi"><button type="button" data-mode="read" aria-pressed="true">Nhìn chữ</button><button type="button" data-mode="listen" aria-pressed="false">Nghe từ</button></div></div>
   <div class="market-play"><div class="market-prompt"><p class="market-task">Tìm món cho giỏ hàng</p><div class="market-wordrow"><h2 class="market-word" tabindex="-1"></h2><button type="button" class="ib solid market-audio" aria-label="Nghe từ cần tìm">${icon('volume-2')}</button></div><div class="market-hintline"><span class="market-reading"></span><button type="button" class="market-hint">Gợi ý</button></div></div>
   <div class="market-stage"><div class="market-options" role="group" aria-label="Chọn một món đồ"></div><div class="market-counter"><div class="market-friend" aria-hidden="true">${mascot()}</div><div class="market-basket" role="img" aria-label="Giỏ hàng trống"><svg class="market-basket-art" viewBox="0 0 240 140" aria-hidden="true"><path class="market-handle" d="M65 74C65 0 175 0 175 74" fill="none" stroke="#AB855C" stroke-width="9" stroke-linecap="round"/><path d="m20 70 18 57c2 7 8 9 15 9h134c7 0 13-2 15-9l18-57Z" fill="#C8A87B"/><path d="m51 83 9 37m29-37 3 37m29-37v37m30-37-3 37m38-37-9 37" stroke="#AF8B61" stroke-width="5" stroke-linecap="round"/><path d="M20 70h200" stroke="#E0C39B" stroke-width="12" stroke-linecap="round"/></svg><div class="market-collected" aria-hidden="true">${places()}</div><span class="market-basket-count" aria-hidden="true">0 / ${session.length}</span></div></div></div>
   <p class="market-instruction">Kéo món vào giỏ, hoặc chạm để chọn.</p><div class="market-feedback" role="status" aria-live="polite" aria-atomic="true"></div><button type="button" class="btn market-next" hidden>Món tiếp theo ${icon('chevron-right')}</button></div>
   <div class="market-end" hidden><h2 tabindex="-1">Giỏ hàng đã đủ!</h2><p>Nghe lại những món vừa chọn.</p><div class="market-review"></div><button type="button" class="btn market-restart">Đi chợ lần nữa ${icon('refresh-cw')}</button><a class="market-home" href="#/">Về trang chủ</a></div>
   <details class="market-help"><summary>Cách chơi</summary><p>Tìm món ứng với từ tiếng Trung. Chọn “Nghe từ” để thử nghe trước khi xem chữ; bấm loa để nghe lại, hoặc “Gợi ý” khi cần.</p><p>Có thể kéo vào giỏ, chạm vào món, hoặc dùng Tab rồi Enter / phím cách để chọn. Escape hủy thao tác kéo. Không giới hạn thời gian.</p><p>Đây là nhóm 8 từ về đồ ăn, thức uống riêng, không theo bộ lọc HSK. Mỗi lượt có tối đa 6 món; kết quả không thay đổi lịch ôn hay đánh dấu đã thuộc.</p></details>`;
  const $=s=>host.querySelector(s),options=$('.market-options'),basket=$('.market-basket'),feedback=$('.market-feedback'),next=$('.market-next'),friend=$('.market-friend');
  const on=(node,type,fn)=>node.addEventListener(type,fn,{signal});
  const current=()=>session[index];
  const label=item=>script()==='t'?item.word.t:item.word.s;
  const reading=item=>pinyin()?item.word.p:'';
  function say(html){feedback.innerHTML=html}
  function paintPrompt(){
   const item=current().target,shown=mode==='read'||hint||phase==='correct';
   $('.market-word').textContent=shown?label(item):'Nghe và chọn';
   $('.market-word').lang=shown?'zh':'vi';$('.market-word').classList.toggle('market-listen-word',!shown);
   $('.market-reading').textContent=hint||phase==='correct'?[reading(item),item.word.vi].filter(Boolean).join(' · '):'';
   $('.market-hint').hidden=hint||phase==='correct';
   $('.market-count').textContent=`Món ${index+1} / ${session.length}`;
  }
  function drawRound(focus=false){
   stopAudio();hint=false;phase='choosing';host.dataset.phase=phase;next.hidden=true;say('');
   $('.market-instruction').textContent='Kéo món vào giỏ, hoặc chạm để chọn.';
   options.innerHTML=current().options.map(item=>`<button type="button" class="market-item" data-item="${e(item.id)}" aria-label="Chọn ${e(item.word.vi)}">${art(item.art)}<span class="market-item-name">${e(item.word.vi)}</span></button>`).join('');
   react(friend,'idle');paintPrompt();
   if(focus){$('.market-word').focus({preventScroll:true});$('.market-word').scrollIntoView({block:'nearest',behavior:'instant'})}
  }
  function overlayOpen(){return !!(overlay&&!overlay.classList.contains('hidden'))}
  function pauseAnimations(){for(const a of animations){if(document.hidden||!visible||overlayOpen())a.pause();else a.play()}}
  async function animate(node,frames,duration){
   if(dead||reduced.matches||!node.animate)return;
   const a=node.animate(frames,{duration,easing:MOTION.ease,fill:'forwards'});animations.add(a);pauseAnimations();
   try{await a.finished}catch(_){}finally{animations.delete(a);a.cancel()}
  }
  function makeGhost(button){
   const svg=button.querySelector('svg'),box=svg.getBoundingClientRect(),ghost=document.createElement('div');
   ghost.className='market-ghost';ghost.setAttribute('aria-hidden','true');ghost.innerHTML=svg.outerHTML;
   Object.assign(ghost.style,{left:box.x+'px',top:box.y+'px',width:box.width+'px',height:box.height+'px'});
   document.body.append(ghost);button.classList.add('market-picked');
   return {button,ghost,box,x:0,y:0};
  }
  function clearGhost(g){g.ghost?.remove();g.button.classList.remove('market-picked')}
  async function travel(g,destination){
   const dx=destination?destination.x+destination.width/2-g.box.x-g.box.width/2:0;
   const dy=destination?destination.y+destination.height/2-g.box.y-g.box.height/2:0;
   const scale=destination?destination.width/g.box.width:1;
   const frames=Array.from({length:17},(_,i)=>{const t=i/16;return {transform:`translate(${g.x+(dx-g.x)*t}px,${g.y+(dy-g.y)*t-Math.sin(Math.PI*t)*(destination?MOTION.arc:0)}px) scale(${1+(scale-1)*t})`}});
   await animate(g.ghost,frames,destination?MOTION.travel:MOTION.return);
  }
  async function choose(button,g=null){
   if(dead||phase!=='choosing'){if(g)clearGhost(g);return}
   const item=current().options.find(x=>x.id===button.dataset.item);if(!item)return;
   phase='moving';host.dataset.phase=phase;stopAudio();
   options.querySelectorAll('button').forEach(b=>b.setAttribute('aria-disabled','true'));
   if(item.id!==current().target.id){
    if(g){await travel(g,null);clearGhost(g)}
    else await animate(button,[{transform:'scale(1)'},{transform:'scale(.97)'},{transform:'scale(1)'}],MOTION.press);
    if(dead)return;
    say(`Đây là <span lang="zh">${e(label(item))}</span>${reading(item)?` <span class="market-feedback-py">(${e(reading(item))})</span>`:''} — ${e(item.word.vi)}. Thử món khác nhé.`);
    phase='choosing';host.dataset.phase=phase;options.querySelectorAll('button').forEach(b=>b.removeAttribute('aria-disabled'));return;
   }
   g=g||makeGhost(button);
   const slot=$('.market-collected').children[index];slot.classList.add('market-slot');slot.innerHTML=art(item.art);slot.style.visibility='hidden';
   await travel(g,slot.getBoundingClientRect());clearGhost(g);if(dead)return;
   slot.style.visibility='';button.classList.add('market-chosen');
   phase='correct';host.dataset.phase=phase;paintPrompt();say(`Đúng rồi! <span lang="zh">${e(label(item))}</span> — ${e(item.word.vi)}.`);
   basket.setAttribute('aria-label',`Giỏ hàng: ${index+1} / ${session.length} món`);$('.market-basket-count').textContent=`${index+1} / ${session.length}`;
   react(friend,'wave');$('.market-instruction').textContent='';
   next.innerHTML=(index===session.length-1?'Xem giỏ hàng':'Món tiếp theo')+icon('chevron-right');next.hidden=false;
   if(visible&&!document.hidden&&!overlayOpen()){next.focus({preventScroll:true});next.scrollIntoView({block:'nearest',behavior:'instant'})}
   animate($('.market-handle'),[{transform:'rotate(0deg)'},{transform:'rotate(-3deg)'},{transform:'rotate(0deg)'}],MOTION.travel);
  }
  function clearDrag(){
   if(!drag)return null;const g=drag;drag=null;cancelAnimationFrame(frame);frame=0;
   basket.classList.remove('market-over');
   if(g.button.hasPointerCapture(g.pointer))g.button.releasePointerCapture(g.pointer);
   return g;
  }
  function cancelDrag(){const g=clearDrag();if(g){suppressClick=true;clearGhost(g)}}
  function inside(x,y,r){return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom}
  on(options,'pointerdown',event=>{
   const button=event.target.closest('.market-item');if(!button||phase!=='choosing'||event.button!==0||!event.isPrimary||drag)return;
   suppressClick=false;drag={button,pointer:event.pointerId,startX:event.clientX,startY:event.clientY,x:0,y:0,moved:false};button.setPointerCapture(event.pointerId);
  });
  on(options,'pointermove',event=>{
   if(!drag||event.pointerId!==drag.pointer)return;const g=drag;
   g.x=event.clientX-g.startX;g.y=event.clientY-g.startY;
   if(!g.moved&&Math.hypot(g.x,g.y)<MOTION.dragThreshold)return;
   if(!g.moved){const x=g.x,y=g.y;Object.assign(g,makeGhost(g.button),{x,y,moved:true});g.drop=basket.getBoundingClientRect()}
   g.over=inside(event.clientX,event.clientY,g.drop);
   if(!frame)frame=requestAnimationFrame(()=>{frame=0;if(drag!==g)return;g.ghost.style.transform=`translate(${g.x}px,${g.y}px)`;basket.classList.toggle('market-over',g.over)});
  });
  on(options,'pointerup',event=>{
   if(!drag||event.pointerId!==drag.pointer)return;
   const g=clearDrag();suppressClick=true;
   if(!g.moved){choose(g.button);return}
   g.ghost.style.transform=`translate(${g.x}px,${g.y}px)`;
   if(inside(event.clientX,event.clientY,g.drop))choose(g.button,g);
   else {phase='moving';host.dataset.phase=phase;travel(g,null).then(()=>{clearGhost(g);if(!dead){phase='choosing';host.dataset.phase=phase}})}
  });
  on(options,'pointercancel',()=>cancelDrag());on(options,'lostpointercapture',()=>{if(drag)cancelDrag()});
  on(options,'click',event=>{const button=event.target.closest('.market-item');if(!button)return;if(suppressClick&&event.detail!==0){suppressClick=false;return}if(!drag)choose(button)});
  on(document,'keydown',event=>{if(event.key==='Escape'&&drag){event.preventDefault();cancelDrag()}});
  on($('.market-hint'),'click',()=>{hint=true;paintPrompt()});
  on($('.market-audio'),'click',()=>play(current().target.word,$('.market-audio')));
  on(audio,'error',()=>{if(phase!=='done')say('Chưa phát được âm thanh. Bạn có thể bấm Gợi ý để xem từ.')});
  on($('.market-modes'),'click',event=>{
   const button=event.target.closest('[data-mode]');if(!button||phase!=='choosing'||drag)return;
   stopAudio();mode=button.dataset.mode;hint=false;say('');paintPrompt();
   host.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
   if(mode==='listen')play(current().target.word,$('.market-audio'));
  });
  on(next,'click',()=>{
   if(phase!=='correct')return;
   if(index+1<session.length){index++;drawRound(true);if(mode==='listen')play(current().target.word,$('.market-audio'));return}
   stopAudio();phase='done';host.dataset.phase=phase;$('.market-play').hidden=true;$('.market-top').hidden=true;$('.market-end').hidden=false;
   $('.market-review').innerHTML=session.map(({target:item})=>`<button type="button" class="market-review-item" data-review="${e(item.id)}" aria-label="Nghe ${e(label(item))}, ${e(item.word.vi)}">${art(item.art)}<span><b lang="zh">${e(label(item))}</b>${reading(item)?`<small>${e(reading(item))}</small>`:''}<span>${e(item.word.vi)}</span></span>${icon('volume-2')}</button>`).join('');
   $('.market-end h2').focus({preventScroll:true});$('.market-end h2').scrollIntoView({block:'nearest',behavior:'instant'});
  });
  on($('.market-review'),'click',event=>{const button=event.target.closest('[data-review]');if(button)play(byId(button.dataset.review),button)});
  on($('.market-restart'),'click',()=>{
   session=rounds(pool);index=0;$('.market-end').hidden=true;$('.market-play').hidden=false;$('.market-top').hidden=false;
   $('.market-collected').innerHTML=places();basket.setAttribute('aria-label','Giỏ hàng trống');$('.market-basket-count').textContent=`0 / ${session.length}`;drawRound(true);
   if(mode==='listen')play(current().target.word,$('.market-audio'));
  });
  function visibility(){if(document.hidden){cancelDrag();stopAudio()}pauseAnimations()}
  on(document,'visibilitychange',visibility);on(window,'blur',()=>cancelDrag());on(window,'resize',()=>cancelDrag());on(window,'scroll',()=>cancelDrag());
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)cancelDrag();pauseAnimations()});observer.observe($('.market-stage'));
  const overlayObserver=new MutationObserver(()=>{if(overlayOpen()){cancelDrag();stopAudio()}pauseAnimations()});
  const overlay=document.querySelector('#sheet');if(overlay)overlayObserver.observe(overlay,{attributes:true,attributeFilter:['class']});
  on(reduced,'change',()=>{if(reduced.matches)for(const a of animations)a.finish()});
  drawRound();
  return ()=>{dead=true;cancelDrag();stopAudio();abort.abort();observer.disconnect();overlayObserver.disconnect();for(const a of animations)a.cancel();animations.clear();document.querySelectorAll('.market-ghost').forEach(g=>g.remove())};
 }
 const api={mount,items:ITEMS,rounds};
 if(typeof module!=='undefined')module.exports=api;else root.ZH_MARKET=api;
})(typeof window==='undefined'?globalThis:window);
