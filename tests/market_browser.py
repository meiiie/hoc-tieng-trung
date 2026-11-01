"""Play the optional market game with real pointer/keyboard input and isolated progress."""
import json
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8931/'
WHICH=sys.argv[2] if len(sys.argv)>2 else 'all'
AXE=(ROOT/'node_modules/axe-core/axe.min.js').read_text(encoding='utf-8')
OUT=ROOT/'.cache/market';OUT.mkdir(parents=True,exist_ok=True)
results=[]

with sync_playwright() as p:
 for kind in (['chromium','webkit'] if WHICH=='all' else [WHICH]):
  browser=getattr(p,kind).launch()
  context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce',service_workers='block',has_touch=True)
  page=context.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.wait_for_function('typeof words!=="undefined"&&words.length===12387');page.wait_for_load_state('networkidle')
  page.evaluate("S.user={name:'Test',done:true,goal:'10'};S.set.autoplay=false;S.set.py='on';S.set.script='s';S.set.mhint=1;save();route()")
  saved=page.evaluate('JSON.stringify([S.srs,S.revlog,S.known,S.ev,S.log,S.star,S.sessions])')
  def route():
   page.evaluate("location.hash='#/market';route()")
   page.wait_for_selector('.market-item');page.wait_for_timeout(80)
  def target():
   return page.evaluate("ZH_MARKET.items.find(x=>byId(x.id).w===document.querySelector('.market-word').textContent).id")
  def button(word_id):return page.locator(f'[data-item="{word_id}"]')
  def phase(value):
   try:page.wait_for_selector(f'.market[data-phase="{value}"]',timeout=8000)
   except Exception:
    page.screenshot(path=str(OUT/f'{kind}-failure.png'),full_page=True)
    print(kind,'PHASE FAILURE',page.locator('.market').inner_text(),errors,flush=True)
    raise
  def audit(label):
   page.evaluate(AXE)
   failures=page.evaluate("axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}).then(r=>r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})))")
   assert not failures,(kind,label,failures)
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),label
  def point(locator):
   locator.scroll_into_view_if_needed();r=locator.bounding_box();return {'x':r['x']+r['width']/2,'y':r['y']+r['height']/2}
  def start_drag(locator):
   xy=point(locator);page.mouse.move(**xy);page.mouse.down();page.mouse.move(xy['x']+16,xy['y']+16,steps=4);page.wait_for_selector('.market-ghost');return xy
  def release_to(xy):page.mouse.move(**xy,steps=10);page.mouse.up()
  route();print(kind,'choice, keyboard, cancel, drag',flush=True)
  assert page.locator('.market-reading').inner_text()==''
  correct=target();wrong=page.locator(f'[data-item]:not([data-item="{correct}"])').first
  wrong.tap();phase('choosing');assert 'Thử món khác' in page.locator('.market-feedback').inner_text();assert page.locator('.market-slot').count()==0
  wrong.focus();page.keyboard.press('Space');phase('choosing');assert page.locator('.market-slot').count()==0
  page.locator('.market-hint').click();assert page.locator('.market-reading').inner_text();assert page.locator('.market-hint').is_hidden()
  button(correct).focus();page.keyboard.press('Enter');phase('correct');assert page.locator('.market-slot').count()==1
  first_slot=page.locator('.market-slot').first.bounding_box()
  assert page.locator('.market-next').evaluate('el=>el===document.activeElement')
  assert page.locator('.market-ghost').count()==0
  audit('correct');page.keyboard.press('Enter');phase('choosing')
  assert page.locator('.market-count').inner_text()=='Món 2 / 6'
  assert page.locator('.market-reading').inner_text()==''
  # A canceled drop is not an answer, and its synthetic click must not become one.
  correct=target();start_drag(button(correct));release_to({'x':10,'y':90});phase('choosing');assert page.locator('.market-slot').count()==1
  start_drag(button(correct));page.keyboard.press('Escape');page.mouse.up();assert page.locator('.market-ghost').count()==0;phase('choosing')
  # Canceling before the pointer crosses the threshold must also be harmless.
  xy=point(button(correct));page.mouse.move(**xy);page.mouse.down();page.keyboard.press('Escape');page.mouse.up();phase('choosing')
  # Wrong drop returns the prop; right drop collects it exactly once.
  wrong=page.locator(f'[data-item]:not([data-item="{correct}"])').first
  start_drag(wrong);release_to(point(page.locator('.market-basket')));phase('choosing');assert page.locator('.market-slot').count()==1
  start_drag(button(correct));release_to(point(page.locator('.market-basket')));phase('correct');assert page.locator('.market-slot').count()==2
  second_slot=page.locator('.market-slot').first.bounding_box()
  assert abs(first_slot['x']-second_slot['x'])<1 and abs(first_slot['width']-second_slot['width'])<1
  page.locator('.market-next').click();phase('choosing')
  # Native touch input can drag on Chromium; WebKit's tap path is exercised above.
  if kind=='chromium':
   xy=point(button(target()));dest=point(page.locator('.market-basket'));cdp=context.new_cdp_session(page)
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[xy]})
   for i in range(1,13):
    cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':xy['x']+(dest['x']-xy['x'])*i/12,'y':xy['y']+(dest['y']-xy['y'])*i/12}]})
   cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});phase('correct');page.locator('.market-next').click();phase('choosing')
  # Listening hides the answer and uses the selected catalog recording.
  print(kind,'listening',flush=True);correct=target();page.locator('[data-mode="listen"]').click();assert page.locator('.market-word').inner_text()=='Nghe và chọn'
  page.wait_for_function('(id)=>audio.src.endsWith(LANG.aurl(byId(id),"w",S.set.voice))',arg=correct)
  page.wait_for_function('audio.readyState>=2')
  page.locator('.market-hint').click();assert page.locator('.market-word').inner_text()!='Nghe và chọn'
  button(correct).tap();phase('correct');page.locator('.market-next').click();phase('choosing')
  page.locator('[data-mode="read"]').click()
  while page.locator('.market-end').is_hidden():
   button(target()).click();phase('correct');page.locator('.market-next').click()
  assert page.locator('.market-review-item').count()==6
  assert len(set(page.locator('[data-review]').evaluate_all('els=>els.map(e=>e.dataset.review)')))==6
  audit('finished');page.screenshot(path=str(OUT/f'{kind}-finished.png'),full_page=True)
  page.locator('.market-review-item').first.click();page.wait_for_function('audio.readyState>=2')
  page.locator('.market-restart').click();phase('choosing');assert page.locator('.market-slot').count()==0
  assert page.evaluate('JSON.stringify([S.srs,S.revlog,S.known,S.ev,S.log,S.star,S.sessions])')==saved
  # Every responsive/theme variant has complete icons, no overflow and accessible controls.
  for width in [320,390,768,1280]:
   page.set_viewport_size({'width':width,'height':844})
   for theme in ['light','dark']:
    page.evaluate('(v)=>{S.set.theme=v;applyTheme()}',theme);route();audit(f'{width}-{theme}')
    assert page.locator('.market-item').evaluate_all('xs=>xs.every(x=>x.clientWidth>=44&&x.clientHeight>=44)')
    if width==390:page.screenshot(path=str(OUT/f'{kind}-{theme}.png'),full_page=True)
  page.set_viewport_size({'width':320,'height':668});route();button(target()).click();phase('correct')
  assert page.locator('.market-next').evaluate('el=>el.getBoundingClientRect().bottom<=innerHeight')
  page.locator('.market-next').click();assert page.locator('.market-word').evaluate('el=>el.getBoundingClientRect().top>=document.querySelector("header").getBoundingClientRect().bottom')
  page.set_viewport_size({'width':390,'height':844});page.evaluate("S.set.theme='light';S.set.script='t';S.set.py='off';applyTheme();LANG.boot();route()")
  page.locator('.market-hint').click();assert ' · ' not in page.locator('.market-reading').inner_text()
  assert page.evaluate("ZH_MARKET.items.some(x=>byId(x.id).t===document.querySelector('.market-word').textContent)")
  # Network failure leaves an explicit usable hint instead of a silent listening task.
  page.locator('[data-mode="listen"]').click()
  # Windows WebKit's native media loader bypasses Playwright routing; use a real 404.
  page.evaluate("audio.src=new URL('tests/fixtures/market-unavailable.mp3',location.href);audio.play().catch(()=>{})")
  page.wait_for_function('document.querySelector(".market-feedback").textContent.includes("Chưa phát")',timeout=10000)
  page.evaluate("S.set.script='s';S.set.py='on';LANG.boot()");route()
  page.emulate_media(reduced_motion='no-preference')
  # Inspect the exact initial and midpoint frames of the one-shot (without waiting on real time).
  correct=target();button(correct).evaluate("el=>{el.click();for(const a of document.querySelector('.market-ghost').getAnimations()){a.pause();a.currentTime=0}}")
  start=page.locator('.market-ghost').bounding_box();page.screenshot(path=str(OUT/f'{kind}-flight-start.png'),full_page=True)
  page.evaluate("for(const a of document.querySelector('.market-ghost').getAnimations())a.currentTime=140")
  middle=page.locator('.market-ghost').bounding_box();assert middle!=start
  page.screenshot(path=str(OUT/f'{kind}-flight-mid.png'),full_page=True)
  page.evaluate("for(const a of document.querySelector('.market-ghost').getAnimations())a.play()");phase('correct')
  # Toggling reduced motion during travel completes it, retaining the same semantic result.
  page.locator('.market-next').click();correct=target()
  button(correct).evaluate("el=>{el.click();for(const a of document.querySelector('.market-ghost').getAnimations()){a.pause();a.currentTime=60}}")
  page.keyboard.press('?');page.evaluate('window.marketFocusBeforeReduce=document.activeElement')
  page.emulate_media(reduced_motion='reduce');phase('correct');assert page.locator('.market-ghost').count()==0
  assert page.evaluate('document.activeElement===marketFocusBeforeReduce');page.keyboard.press('Escape')
  # Offscreen and hidden scenes pause; opening help cancels direct manipulation.
  page.locator('.market-next').click();page.emulate_media(reduced_motion='no-preference')
  button(target()).evaluate("el=>{el.click();for(const a of document.querySelector('.market-ghost').getAnimations())a.updatePlaybackRate(.1)}")
  page.keyboard.press('?');page.wait_for_function("document.querySelector('.market-ghost').getAnimations().every(a=>a.playState==='paused')")
  page.keyboard.press('Escape');phase('correct');page.locator('.market-next').click()
  # Real intersection changes suspend a flight without losing the pending answer.
  button(target()).evaluate("el=>{el.click();for(const a of document.querySelector('.market-ghost').getAnimations())a.updatePlaybackRate(.1)}")
  page.evaluate("const spacer=document.createElement('div');spacer.id='test-market-spacer';spacer.style.height='2000px';document.body.append(spacer);scrollTo(0,document.body.scrollHeight)")
  page.wait_for_function("document.querySelector('.market-ghost').getAnimations().every(a=>a.playState==='paused')")
  page.evaluate("document.querySelector('#test-market-spacer').remove();scrollTo(0,0)");phase('correct')
  # Navigation during capture or flight must remove all transient nodes and callbacks.
  for moving in [False,True]:
   route();correct=target()
   if moving:button(correct).evaluate("el=>{el.click();for(const a of document.querySelector('.market-ghost').getAnimations())a.pause()}")
   else:start_drag(button(correct))
   page.evaluate("location.hash='#/reader'");page.wait_for_selector('#zh-text');page.mouse.up();page.wait_for_timeout(350)
   assert page.locator('.market-ghost').count()==0;assert page.evaluate('audio.paused')
  assert page.evaluate('JSON.stringify([S.srs,S.revlog,S.known,S.ev,S.log,S.star,S.sessions])')==saved
  assert not errors,errors
  results.append({'browser':kind,'roundsComplete':6,'tapKeyboardDrag':True,'nativeTouchDrag':kind=='chromium','cancelAndNavigate':True,'listenAndAudioFailure':True,'reducedMotion':True,'offscreenAndModalPause':True,'smallViewportFocus':True,'animationFramesInspected':True,'responsiveThemes':8,'axeViolations':0,'progressUnchanged':True,'pageErrors':errors})
  print(json.dumps(results[-1]),flush=True);context.close();browser.close()

(ROOT/'docs/audits/market-browser-2026-11-01.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
