"""All-level access, stable progress, recorded audio and offline failure/retry behavior."""
import json
import os
import sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8931/'
KINDS = [sys.argv[2]] if len(sys.argv) > 2 else ['chromium', 'webkit']

with sync_playwright() as p:
    for kind in KINDS:
        browser = (p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),
                   args=['--autoplay-policy=no-user-gesture-required']) if kind == 'chromium' else p.webkit.launch())
        context = browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
        page = context.new_page()
        page.goto(BASE)
        page.wait_for_function('typeof words !== "undefined" && words.length===12387')
        page.evaluate("S.user={name:'Kiểm tra',done:true,goal:'10'};S.set.autoplay=false;save();route()")
        page.wait_for_selector('.v-home')
        assert page.evaluate("""() => {
          delete window._swipeT;
          Object.defineProperty(performance,'now',{configurable:true,value:()=>1});
          document.querySelector('[data-zl="4"]').click();delete performance.now;
          return deck().length;
        }""") == 972
        assert page.locator('[data-zl]').count() == 7
        assert page.locator('[data-zl][aria-disabled]').count() == 0
        page.click('[data-zl="7"]')
        assert page.evaluate('deck().length') == 5606
        assert page.evaluate("""() => {
          const stage=document.createElement('div');
          Object.defineProperty(performance,'now',{configurable:true,value:()=>1});
          const card=makeCard(stage,words[0],'en',()=>{});card.flip();delete performance.now;
          return card.el.classList.contains('flip');
        }""")
        page.evaluate("""() => {
          const id='致力于|zhìlìyú';
          S.srs[id]={state:'review',due:4102444800000,int:40,s:43,d:4,reps:8,lapses:2};
          S.srs[id+'~r']={state:'review',due:4102444801000,int:12,s:12,d:6,reps:3,lapses:0};
          S.notes[id]='Ghi chú phải được giữ';S.star[id]=true;
          S.ev[id]=[[1760000000000,'w',1]];save();
        }""")
        saved = page.evaluate('JSON.stringify([S.srs,S.ev,S.notes,S.star,S.set.retention])')
        page.reload()
        page.wait_for_selector('.v-home')
        assert page.evaluate('JSON.stringify([S.srs,S.ev,S.notes,S.star,S.set.retention])') == saved
        page.goto(BASE+'#/list')
        page.wait_for_selector('#ls .it')
        assert page.locator('#ls .it').count() == 50
        first = page.locator('#ls [data-w]').first.get_attribute('data-w')
        page.click('[data-page="1"]')
        assert page.locator('#ls [data-w]').first.get_attribute('data-w') != first
        page.fill('#sq', '致力于')
        page.wait_for_function("document.querySelector('#lc').textContent.startsWith('1 từ')")
        assert page.locator('#ls .it').count() == 1
        assert page.locator('#ls [data-w]').first.get_attribute('data-w') == '致力于|zhìlìyú'
        assert page.evaluate("""async () => {
          S.set.script='t';LANG.boot();
          const correct=words.find(w=>w.s==='咸').w==='鹹';
          const strokes=await (await fetch('data/strokes/%E9%B9%B9.json')).json();
          S.set.script='s';LANG.boot();
          return correct&&strokes.strokes.length===20&&strokes.medians.length===20;
        }""")
        page.goto(BASE)
        page.wait_for_selector('.v-home')
        page.evaluate('navigator.serviceWorker.ready')
        page.wait_for_function('!!navigator.serviceWorker.controller')
        word = page.evaluate('words.find(w=>w.L===4)')
        urls = page.evaluate("w=>['f','m'].map(v=>LANG.aurl(w,'w',v))", word)
        can_decode = page.evaluate("typeof (window.AudioContext||window.webkitAudioContext)==='function'")
        for url in urls:
            result = page.evaluate("""async url => {
              const response=await fetch(url);if(!response.ok)throw Error(response.status);
              if(!window.AudioContext&&!window.webkitAudioContext)return {transportOnly:true,bytes:(await response.arrayBuffer()).byteLength};
              const ctx=new (window.AudioContext||window.webkitAudioContext)();
              const buffer=await ctx.decodeAudioData(await response.arrayBuffer());
              await ctx.close();return {seconds:buffer.duration,channels:buffer.numberOfChannels};
            }""", url)
            if can_decode:
                assert result['seconds'] > 0.15 and result['channels'] == 1, result
            else:
                assert result['transportOnly'] and result['bytes'] > 512, result
        page.click('#settings')
        page.evaluate("urls=>{window.savedAudioUrls=LANG.audioUrls;LANG.audioUrls=()=>[urls[0],'audio/missing-test.mp3']}", urls)
        page.click('#dl')
        page.wait_for_function("!document.querySelector('#dl').disabled")
        assert '1/2' in page.text_content('#dlst') and 'chưa tải được' in page.text_content('#dlst')
        page.evaluate("u=>{LANG.audioUrls=()=>[u]}", urls[0])
        page.click('#dl')
        page.wait_for_function("!document.querySelector('#dl').disabled")
        assert 'Đã lưu 1 tệp' in page.text_content('#dlst')
        page.evaluate('LANG.audioUrls=window.savedAudioUrls')
        page.keyboard.press('Escape')
        page.wait_for_selector('#sheet.hidden', state='attached')
        # WebKit's offline flag rejects even service-worker responses (Playwright #42775).
        # offline_browser.py checks both engines with the origin actually stopped.
        offline_navigation = kind != 'webkit'
        if offline_navigation:
            context.set_offline(True)
            page.reload()
            page.wait_for_selector('.v-home')
        else:
            assert page.evaluate("Promise.all([1,2,3,4,5,6,7].map(l=>caches.match('data/hsk'+l+'.json').then(r=>!!r))).then(x=>x.every(Boolean))")
        assert page.evaluate('words.length') == 12387
        assert page.evaluate('JSON.stringify([S.srs,S.ev,S.notes,S.star,S.set.retention])') == saved
        assert page.evaluate('async u=>(await fetch(u)).ok', urls[0])
        page.click('[data-zl="4"]')
        assert page.evaluate('deck().length') == 972, page.evaluate('({count:deck().length,filter:F()})')
        print(json.dumps({'browser': kind, 'allLevels': True, 'progressUnchanged': True,
                          'femaleAndMaleDecode': can_decode, 'audioFetch': True, 'downloadFailureAndRetry': True,
                          'offlineReload': offline_navigation, 'offlineDataFetch': offline_navigation,
                          'allLevelCachesPresent': True, 'paginationAndFullCatalogSearch': True,
                          'correctedTraditionalCharacter': True}, ensure_ascii=False), flush=True)
        browser.close()
