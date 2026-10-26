"""Isolated learner UX + real Web Audio capture, without accessing a physical microphone."""
import json
import os
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8931/'
WHICH = sys.argv[2] if len(sys.argv) > 2 else 'all'
AXE = (ROOT/'node_modules/axe-core/axe.min.js').read_text(encoding='utf-8')
FAKE = """async()=>{
 window.micMode='voice';window.micCalls=0;window.testTracks=[];window.captureContexts=[];window.streamStarts=new WeakMap();
 const RealAC=window.AudioContext||window.webkitAudioContext;
 window.AudioContext=class extends RealAC {
  constructor(...args){super(...args);captureContexts.push(this)}
  createMediaStreamSource(stream){const node=super.createMediaStreamSource(stream);streamStarts.get(stream)?.();streamStarts.delete(stream);return node}
 };
 const pcm=new Float32Array(await (await fetch('tests/fixtures/tts228.f32')).arrayBuffer());
 navigator.mediaDevices.getUserMedia=async()=>{
  micCalls++;if(micMode==='denied')throw new DOMException('Denied','NotAllowedError');
  const ac=new RealAC();await ac.resume();const dst=ac.createMediaStreamDestination();
  const src=ac.createBufferSource(),buf=ac.createBuffer(1,16000*6,16000);
  if(micMode!=='silence')buf.getChannelData(0).set(pcm,4800);
  src.buffer=buf;src.connect(dst);streamStarts.set(dst.stream,()=>src.start());
  const track=dst.stream.getAudioTracks()[0],stop=track.stop.bind(track);
  track.stop=()=>{stop();try{src.stop()}catch(_){}ac.close()};testTracks.push(track);
  if(micMode==='pending')return new Promise(resolve=>{window.grantLate=()=>resolve(dst.stream)});
  return dst.stream;
 };
}"""

results = []
with sync_playwright() as p:
    for kind in (['chromium', 'webkit'] if WHICH == 'all' else [WHICH]):
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),args=['--autoplay-policy=no-user-gesture-required']) if kind=='chromium' else p.webkit.launch()
        context = browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
        page = context.new_page(); errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE);page.wait_for_function('typeof words!=="undefined"&&words.length===12387')
        page.evaluate("S.user={name:'Test',done:true,goal:'10'};S.set.autoplay=false;S.set.mhint=1;S.set.zhEngine='f0';S.speak['马上|ma3shang4']=88;S.pron['马上|ma3shang4']=[{t:1,s:88,k:'m'}];save();route()")
        snapshot=page.evaluate('JSON.stringify([S.srs,S.revlog,S.ev,S.star,S.speak])')
        def route(path):
            page.evaluate('(path)=>{location.hash=path}', '#/'+path)
            page.wait_for_timeout(250)
        def audit(name):
            page.evaluate(AXE)
            violations=page.evaluate("axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}).then(r=>r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})))")
            assert not violations,(kind,name,violations)
            assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),name
        def idle_tracks():
            page.wait_for_function("testTracks.every(t=>t.readyState==='ended')&&captureContexts.every(c=>c.state==='closed')")
        for width in [360,390,768,1280]:
            print(kind,'layout',width,flush=True)
            page.set_viewport_size({'width':width,'height':900})
            for theme in ['light','dark']:
                page.evaluate('(theme)=>{S.set.theme=theme;applyTheme()}',theme)
                route('')
                missing=page.evaluate("Array.from(document.querySelectorAll('#app use')).map(x=>x.getAttribute('href')).filter(h=>h?.startsWith('#')&&!document.querySelector(h))")
                assert not missing,missing
                assert page.locator('[data-go="guide"] use').get_attribute('href')=='#i-lightbulb'
                route('cards');page.wait_for_selector('.pyc')
                assert page.locator('.pyc').first.evaluate("e=>{const s=getComputedStyle(e);return s.borderWidth==='0px'&&s.backgroundColor==='rgba(0, 0, 0, 0)'&&s.boxShadow==='none'&&e.clientHeight>=24}")
                route('reader');page.wait_for_selector('#zh-text');assert page.locator('#zh-reading').is_hidden()
                page.fill('#zh-text','你好，得。<img src=x onerror="window.executed=true">😀');page.click('#zh-read')
                assert page.locator('#zh-reading img').count()==0 and not page.evaluate('!!window.executed')
                assert 'onerror=' in page.text_content('#zh-reading')
                page.fill('#zh-lookup','不存在的词012345');assert 'Chưa tìm thấy' in page.text_content('#zh-found-status')
                audit(f'reader-{width}-{theme}')
                page.fill('#zh-text','');assert page.locator('#zh-read').is_disabled() and page.locator('#zh-reading').is_hidden()
        page.set_viewport_size({'width':390,'height':844});page.evaluate("S.set.theme='light';applyTheme()")
        route('speak?w=马上|ma3shang4');page.wait_for_selector('#mic')
        if not page.evaluate("typeof (window.AudioContext||window.webkitAudioContext)==='function'&&!!navigator.mediaDevices?.getUserMedia"):
            page.click('#mic');page.wait_for_selector('#sarea[data-state="err"]')
            assert 'Trình duyệt' in page.text_content('#sarea')
            audit('capture unsupported')
            page.click('#settings');page.click('#mcb');assert 'chưa hỗ trợ' in page.text_content('#mcd');page.keyboard.press('Escape')
            assert not errors,errors
            results.append({'browser':kind,'responsiveThemes':8,'readerSafe':True,'iconsComplete':True,'flatPinyin':True,'capture':'Unavailable in this browser build; actual capture not tested','unsupportedMessage':True,'axeViolations':0})
            context.close();browser.close();continue
        page.evaluate(FAKE)
        for trial in range(3):
            print(kind,'capture',trial,flush=True)
            page.locator('#mic' if trial==0 else '#again').click()
            page.wait_for_selector('#recw.voice')
            assert page.locator('#wave').evaluate("c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return a.some((v,i)=>i%4===3&&v>0)}")
            if trial==0:page.screenshot(path=str(ROOT/f'.cache/speech-recording-{kind}.png'),full_page=True)
            page.wait_for_selector('#again',timeout=15000);idle_tracks()
            assert page.locator('.score').count()==0
            assert 'Đã ghi âm' in page.text_content('#sarea')
        assert page.evaluate('micCalls')==3
        assert page.evaluate('S.pron["马上|ma3shang4"][0].s')==88
        assert page.evaluate('S.pron["马上|ma3shang4"].slice(1).every(r=>r.s===undefined&&r.v===2)')
        audit('self-comparison');page.screenshot(path=str(ROOT/f'.cache/speech-result-{kind}.png'),full_page=True)
        page.evaluate("micMode='silence'");page.click('#again');page.wait_for_selector('#sarea[data-state="err"]',timeout=15000);idle_tracks()
        assert page.locator('.score').count()==0
        page.evaluate("micMode='denied'");page.click('#mic');page.wait_for_selector('#sarea[data-state="err"]');assert 'quyền micro' in page.text_content('#sarea');idle_tracks()
        page.evaluate("micMode='pending'");page.click('#mic');page.wait_for_function('typeof grantLate==="function"');page.click('#next');page.evaluate('grantLate()');idle_tracks()
        page.wait_for_selector('#mic');page.evaluate("micMode='pending';grantLate=null");page.click('#mic');page.wait_for_function('typeof grantLate==="function"');page.click('#mic');page.evaluate('grantLate()');idle_tracks()
        page.evaluate("micMode='voice'");page.click('#mic');page.wait_for_selector('#recw.voice');route('reader');idle_tracks()
        route('speak?w=马上|ma3shang4');page.wait_for_selector('#mic');page.click('#mic');page.wait_for_selector('#recw.voice');page.click('#settings');idle_tracks();page.keyboard.press('Escape')
        page.wait_for_selector('#mic');page.evaluate("micMode='voice'")
        # Exercise the fallback with the same actual audio, not a stubbed recorder.
        fallback=page.evaluate("async()=>{const AC=window.AudioContext,ac=new AC();Object.defineProperty(ac,'audioWorklet',{value:null});const r=await Speech.record({ac,maxMs:5000});const out=await r.done;return {speech:out.speech,backend:out.diag.backend,duration:out.pcm.length/out.sr}}")
        assert fallback['speech'] and fallback['backend']=='script' and fallback['duration']>1,fallback
        idle_tracks()
        # Worker errors reject promptly instead of leaving the busy UI forever.
        page.reload();page.wait_for_function('typeof ZhEngine!=="undefined"&&typeof S!=="undefined"')
        failure=page.evaluate("async()=>{const real=window.Worker;window.Worker=class{postMessage(){setTimeout(()=>this.onerror(new Error('test')),10)}terminate(){}};try{await ZhEngine.run(new Float32Array(1600),['ma']);return false}catch(e){return true}finally{window.Worker=real}}")
        assert failure
        print(kind,'model feedback',flush=True)
        page.evaluate('ZhEngine.load(()=>{})')
        page.evaluate("S.set.zhEngine='model';save()")
        route('speak?w=马上|ma3shang4');page.evaluate('route()');page.wait_for_selector('#mic');page.evaluate(FAKE)
        page.click('#mic');page.wait_for_selector('#again',timeout=45000);idle_tracks()
        assert page.locator('.zh-feedback li').count()==2 and page.locator('.score').count()==0
        audit('model feedback')
        page.screenshot(path=str(ROOT/f'.cache/speech-model-{kind}.png'),full_page=True)
        page.evaluate("()=>{window.mediaPlay=HTMLMediaElement.prototype.play;window.played=[];HTMLMediaElement.prototype.play=function(){played.push(this.src);return Promise.resolve()}}")
        page.click('#pb');page.click('#pm');page.evaluate("audio.dispatchEvent(new Event('ended'))");page.wait_for_timeout(100)
        assert len(page.evaluate("played.filter(src=>src.startsWith('blob:'))"))==1
        page.click('#pb');page.click('#next');page.evaluate("audio.dispatchEvent(new Event('ended'))");page.wait_for_timeout(100)
        assert len(page.evaluate("played.filter(src=>src.startsWith('blob:'))"))==1
        page.evaluate('()=>{HTMLMediaElement.prototype.play=mediaPlay}')
        page.click('#settings');page.wait_for_function("document.querySelector('#zmd').textContent.includes('Xoá')")
        page.click('#zmd');page.wait_for_function("document.querySelector('#zmd').textContent.includes('Tải')&&!document.querySelector('#zmd').disabled")
        assert not page.evaluate("caches.keys().then(k=>k.includes('htt-engine-v1'))") or not page.evaluate("ZhEngine.status().then(s=>s.cached)")
        page.click('#zmd');page.wait_for_function("document.querySelector('#zmd').textContent.includes('Xoá')&&!document.querySelector('#zmd').disabled",timeout=120000)
        page.keyboard.press('Escape')
        assert page.evaluate('JSON.stringify([S.srs,S.revlog,S.ev,S.star,S.speak])')==snapshot
        route('stats');assert 'điểm nói TB' not in page.text_content('#app') and 'từ đã luyện nói' in page.text_content('#app')
        assert not errors,errors
        results.append({'browser':kind,'responsiveThemes':8,'readerSafe':True,'iconsComplete':True,'flatPinyin':True,'repeatedRecordings':3,'latePermissionCleanup':True,'cancelCleanup':True,'navigationCleanup':True,'overlayCleanup':True,'silenceAndDenial':True,'fallbackCapture':fallback,'workerFailure':True,'modelRemoveReload':True,'playbackCancellation':True,'noFakeGrades':True,'progressPreserved':True,'axeViolations':0})
        context.close();browser.close()
report=ROOT/'docs/audits/learner-ux-2026-10-27.json'
if WHICH!='all' and report.exists():
    results=[r for r in json.loads(report.read_text(encoding='utf-8')) if r['browser']!=WHICH]+results
report.write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(results,ensure_ascii=False,indent=2))
