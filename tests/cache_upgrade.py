"""Exercise an installed old service worker, a failed update, and a complete update."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import subprocess
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SHELL = 'htt-v'+json.loads((ROOT/'version.json').read_text())['version']
OLD_SW = subprocess.check_output(['git', 'show', 'c9336d6ca1cc17fde1f7d9e6eee728847f87ffa5:sw.js'], cwd=ROOT)
STATE = {'old': True, 'fail': False}


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.mjs':'text/javascript', '.js':'text/javascript'}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_):
        pass

    def copyfile(self, source, output):
        try:
            super().copyfile(source, output)
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            pass

    def do_GET(self):
        if self.path == '/sw.js' and STATE['old']:
            self.send_response(200)
            self.send_header('Content-Type', 'text/javascript')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(OLD_SW)
        elif self.path == '/data/curricula.json' and STATE['fail']:
            self.send_error(503)
        else:
            super().do_GET()


server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        page = context.new_page()
        page.goto(f'http://127.0.0.1:{server.server_port}/')
        page.wait_for_function('typeof words!=="undefined"&&words.length===12387')
        page.evaluate("S.user={name:'Upgrade',done:true,goal:'10'};S.srs['爱|ai4']={state:'review',due:4102444800000,int:30,s:31.5,d:4.2,reps:4,lapses:0};save();route()")
        progress = page.evaluate('JSON.stringify(S.srs)')
        page.evaluate('navigator.serviceWorker.ready')
        page.wait_for_function('!!navigator.serviceWorker.controller')
        page.evaluate("""async()=>{
          await (await caches.open('htt-data-v3')).put('data/hsk4.json',new Response('[{"id":"stale"}]'));
          await (await caches.open('another-app')).put('sentinel',new Response('keep'));
        }""")
        assert page.evaluate("fetch('data/hsk4.json').then(r=>r.json()).then(x=>x[0].id)") == 'stale'
        STATE.update(old=False, fail=True)
        page.evaluate("""async()=>{
          const r=await navigator.serviceWorker.getRegistration();
          window.updateEnded=new Promise(ok=>r.addEventListener('updatefound',()=>{
            const w=r.installing;w.addEventListener('statechange',()=>{if(w.state==='redundant')ok()});
          },{once:true}));await r.update();await window.updateEnded;
        }""")
        assert page.evaluate('(async()=>!(await navigator.serviceWorker.getRegistration()).waiting)()')
        assert page.evaluate('JSON.stringify(S.srs)') == progress
        STATE['fail'] = False
        page.evaluate("(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update()})()")
        page.evaluate("""async()=>{
          const r=await navigator.serviceWorker.getRegistration();
          if(!r.waiting)await new Promise((ok,no)=>{
            const watch=w=>w.addEventListener('statechange',()=>{
              if(w.state==='installed')ok();else if(w.state==='redundant')no(Error('Update install failed'));
            });
            if(r.installing)watch(r.installing);else r.addEventListener('updatefound',()=>watch(r.installing),{once:true});
          });
          r.waiting.postMessage('skip');
        }""")
        page.wait_for_function("shell=>caches.keys().then(k=>!k.includes('htt-data-v3')&&k.includes(shell))",arg=SHELL)
        page.reload()
        page.wait_for_selector('.v-home')
        assert page.evaluate('words.length') == 12387
        assert page.evaluate('JSON.stringify(S.srs)') == progress
        assert page.evaluate("fetch('data/hsk4.json').then(r=>r.json()).then(x=>x.length)") == 972
        assert page.evaluate("caches.open('another-app').then(c=>c.match('sentinel')).then(r=>r.text())") == 'keep'
        context.set_offline(True)
        page.reload()
        page.wait_for_selector('.v-home')
        assert page.evaluate('words.length') == 12387
        offline_assets = page.evaluate("""async()=>{
          const files=['core/mic-worklet.js','core/mic-meter.js','zh-pronunciation.js','zh-engine.js','icons/icon-512.png','icons/maskable-192.png','icons/maskable-512.png'];
          return Promise.all(files.map(async file=>{const r=await fetch(file);return r.ok&&(await r.arrayBuffer()).byteLength>0}));
        }""")
        assert all(offline_assets)
        print(json.dumps({'failedInstallKeptOldWorker':True,'successfulUpdateReplacedStaleData':True,
                          'progressUnchanged':True,'unrelatedCachePreserved':True,'offlineAllLevels':True,'offlineSpeechModulesAndIcons':True}), flush=True)
        browser.close()
finally:
    server.shutdown()
    server.server_close()
