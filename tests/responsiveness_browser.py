"""Interaction/resource regressions in isolated profiles; no physical microphone or learner storage."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8931/'
WHICH = sys.argv[2] if len(sys.argv) > 2 else 'all'
INSTRUMENT = """(()=>{
 const tracked=new Map(['selectionchange','mouseup','touchend'].map(k=>[k,new Set()]));
 const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
 EventTarget.prototype.addEventListener=function(type,fn,...args){if(this===document)tracked.get(type)?.add(fn);return add.call(this,type,fn,...args)};
 EventTarget.prototype.removeEventListener=function(type,fn,...args){if(this===document)tracked.get(type)?.delete(fn);return remove.call(this,type,fn,...args)};
 window.listenerCounts=()=>Object.fromEntries([...tracked].map(([k,v])=>[k,v.size]));
 window.storageWrites=0;const set=Storage.prototype.setItem;
 Storage.prototype.setItem=function(...args){storageWrites++;return set.apply(this,args)};
})()"""

with sync_playwright() as p:
 for kind in (['chromium','webkit'] if WHICH=='all' else [WHICH]):
  browser=getattr(p,kind).launch()
  context=browser.new_context(viewport={'width':390,'height':844},service_workers='block',reduced_motion='reduce')
  page=context.new_page();page.add_init_script(INSTRUMENT);errors=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(BASE);page.wait_for_function('typeof words!=="undefined"&&words.length===12387')
  page.evaluate("S.user={name:'Test',done:true,goal:'10'};S.set.autoplay=false;S.set.mhint=1;S.set.py='on';save();route()")
  def route(path):
   page.evaluate('(path)=>location.hash="#/"+path',path);page.wait_for_timeout(150)
  route('cards');page.wait_for_selector('.fc')
  assert page.locator('.face.f .pyc').count()==0
  assert page.locator('.face.b').get_attribute('aria-hidden')=='true'
  page.click('#flipb');page.wait_for_selector('.fc.flip')
  assert page.locator('.face.b .pyc').first.is_visible()
  assert page.locator('.face.f').get_attribute('aria-hidden')=='true'
  progress=page.evaluate('JSON.stringify([S.srs,S.revlog])')
  page.evaluate("window.savedView=document.querySelector('.view');window.savedMascot=document.querySelector('.mwrap');window.savedNext=document.querySelector('#nK');storageWrites=0")
  for _ in range(16):page.click('#nK')
  assert page.evaluate("savedView===document.querySelector('.view')&&savedMascot===document.querySelector('.mwrap')&&savedNext===document.querySelector('#nK')")
  assert page.evaluate('storageWrites')==16
  assert page.evaluate('listenerCounts().selectionchange')==1
  assert page.evaluate('JSON.stringify([S.srs,S.revlog])')==progress
  assert page.evaluate("JSON.parse(localStorage.getItem('htt-core')).sess.cards.i") == 16
  page.click('#undo');assert page.evaluate('FC.i')==15
  page.click('#nL');assert page.evaluate('FC.learn')==1
  assert page.locator('.face.f .pyc').count()==0
  page.reload();page.wait_for_selector('.fc');assert page.evaluate('FC.i')==16
  page.evaluate("document.querySelector('.fc').focus()");page.keyboard.press('Space');page.wait_for_selector('.fc.flip')
  page.keyboard.press('ArrowRight');assert page.locator('.fc').evaluate('(el)=>el===document.activeElement')
  route('reader');assert page.evaluate('listenerCounts().selectionchange')==0
  page.fill('#zh-lookup','zhongguo');assert '中国' in page.locator('#zh-found').inner_text()
  route('list');page.wait_for_selector('#ls .it')
  assert page.evaluate("""async()=>{const input=Array.from({length:4000},(_,id)=>({id,k:(id*17)%19})),cmp=(a,b)=>a.k-b.k;
   const actual=await sortInChunks(input,cmp,()=>true);return JSON.stringify(actual)===JSON.stringify(input.toSorted(cmp))&&await sortInChunks(input,cmp,()=>false)===null}""")
  assert page.evaluate("""async()=>{let active=true;const input=Array.from({length:100000},(_,i)=>100000-i),pending=sortInChunks(input,(a,b)=>a-b,()=>active);active=false;return await pending===null}""")
  assert page.evaluate("Array.from(document.querySelectorAll('#ls [data-w]')).map(b=>b.dataset.w).join()===deck().sort((a,b)=>a.w.localeCompare(b.w)).slice(0,50).map(w=>w.id).join()")
  page.set_viewport_size({'width':1280,'height':844})
  first_star=page.locator('#ls [data-star]').nth(10).get_attribute('data-star');page.locator('#ls [data-star]').nth(10).click()
  page.select_option('#ssort','star');page.wait_for_function("id=>document.querySelector('#ls [data-w]').dataset.w===id",arg=first_star)
  second_star=page.locator('#ls [data-star]').nth(1).get_attribute('data-star');page.locator('#ls [data-star]').nth(1).click()
  page.fill('#sq',' ');page.wait_for_function("id=>document.querySelector('#ls [data-w]').dataset.w===id",arg=second_star)
  page.fill('#sq','bàn tiān');page.wait_for_function("document.querySelector('#ls').textContent.includes('半天')")
  page.fill('#sq','pending');route('reader');page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(200)
  assert page.locator('#zh-text').count()==1
  # Count and filter snapshots refresh when word state changes in the details sheet.
  route('list');page.locator('[data-w]').first.click();page.wait_for_selector('#sheet:not(.hidden)')
  page.click('[data-wa="sus"]');page.wait_for_function("document.querySelector('[data-lfn=\"susp\"]').textContent==='1'")
  page.click('[data-wa="unsus"]');page.wait_for_function("document.querySelector('[data-lfn=\"susp\"]').textContent==='0'")
  page.keyboard.press('Escape');page.wait_for_timeout(100)
  # Scheduler day rollover must still expire burial; never cache the day across runs.
  assert page.evaluate("""()=>{const now=Date.now,day=new Date(2026,9,30,3,59).getTime();
   try{Date.now=()=>day;bury().w[words[0].id]='*';if(life(words[0])!=='buried')return false;
    Date.now=()=>day+120000;return life(words[0])==='new'&&counts(allCards([words[0]])).n>0}
   finally{Date.now=now}}""")
  # Re-entering writing and changing a character must not accumulate document listeners.
  for _ in range(3):
   route('write?w=爱|ai4');page.wait_for_selector('#hw svg path',state='attached');page.wait_for_function("document.querySelector('#qs').textContent===''")
   page.click('[data-m="quiz"]');page.wait_for_function("document.querySelector('#qs').textContent.startsWith('Viết từng nét')")
   page.click('[data-m="anim"]');page.wait_for_function("document.querySelector('#qs').textContent===''")
   page.evaluate("window.oldWriting=document.querySelector('#hw');window.writingChanges=0;window.watchWriting=new MutationObserver(()=>writingChanges++);watchWriting.observe(oldWriting,{attributes:true,subtree:true})")
   route('reader');page.wait_for_timeout(250);page.evaluate('writingChanges=0');page.wait_for_timeout(350)
   assert page.evaluate('writingChanges')==0
   page.evaluate('watchWriting.disconnect()')
  listeners=page.evaluate('listenerCounts()');assert listeners['mouseup']==1 and listeners['touchend']==1,listeners
  # A delayed data response must not attach a writer after navigating away.
  page.route('**/data/strokes/*.json',lambda req:req.abort())
  route('write?w=八|ba1');route('reader');page.wait_for_timeout(150)
  assert page.locator('#hw').count()==0
  assert not errors,(kind,errors)
  context.close()
  # Real animation timing: leave during a fling, then wait past its deadline.
  context=browser.new_context(service_workers='block',reduced_motion='no-preference')
  page=context.new_page();page.goto(BASE);page.wait_for_function('typeof words!=="undefined"&&words.length===12387')
  page.evaluate("S.user={done:true,goal:'10'};S.set.autoplay=false;S.set.mhint=1;route()")
  route('cards');page.wait_for_selector('.fc');page.evaluate("document.querySelector('#nK').click();location.hash='#/reader'")
  page.wait_for_selector('#zh-text');page.wait_for_timeout(500)
  assert page.locator('#zh-text').count()==1 and page.locator('.fc').count()==0
  assert page.evaluate('FC.i')==0
  # Offscreen decoration must not keep drawing; it resumes when visible.
  route('cards');page.wait_for_selector('.mwrap svg')
  page.evaluate("window.bot=document.querySelector('.mwrap')._nk;bot.el.style.position='fixed';bot.el.style.top='-1000px'")
  page.wait_for_function('bot.visible===false');page.wait_for_timeout(100)
  sample=page.evaluate('bot.last');page.wait_for_timeout(150);assert page.evaluate('bot.last')==sample
  page.evaluate("bot.el.style.top='100px'");page.wait_for_function('bot.visible===true&&bot.last>'+str(sample))
  context.close();browser.close();print(kind,'responsiveness regressions passed',flush=True)
