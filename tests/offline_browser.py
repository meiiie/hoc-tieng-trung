"""Verify cached learning with the origin stopped, including a no-worker negative control."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
import urllib.error
import urllib.request
from playwright.sync_api import Error, sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript'}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def copyfile(self, source, output):
        try:
            super().copyfile(source, output)
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            pass


with sync_playwright() as playwright:
    for kind in ('chromium', 'webkit'):
        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        base = f'http://127.0.0.1:{server.server_port}/'
        browser = getattr(playwright, kind).launch()
        try:
            context = browser.new_context()
            page = context.new_page()
            page.goto(base)
            page.wait_for_function('typeof words!=="undefined" && words.length===12387')
            page.evaluate("S.user={name:'Offline',done:true,goal:'10'};S.set.autoplay=false;S.star[words[0].id]=true;save();route()")
            saved = page.evaluate('JSON.stringify([S.srs,S.star,S.ev])')
            page.evaluate('navigator.serviceWorker.ready')
            page.wait_for_function('!!navigator.serviceWorker.controller')
            urls = page.evaluate("['f','m'].map(voice=>LANG.aurl(words.find(w=>w.L===4),'w',voice))")
            page.evaluate('urls=>Promise.all(urls.map(url=>fetch(url).then(r=>r.arrayBuffer())))', urls)
            page.wait_for_function('urls=>Promise.all(urls.map(u=>caches.match(u).then(Boolean))).then(x=>x.every(Boolean))', arg=urls)

            server.shutdown()
            server.server_close()
            try:
                urllib.request.urlopen(base, timeout=2)
            except urllib.error.URLError:
                pass
            else:
                raise AssertionError('The test origin is still reachable')

            control = browser.new_context(service_workers='block')
            try:
                control.new_page().goto(base, timeout=10000)
            except Error:
                pass
            else:
                raise AssertionError('Navigation unexpectedly succeeded without a service worker')
            finally:
                control.close()

            response = page.reload()
            assert response.status == 200 and response.from_service_worker
            page.wait_for_selector('.v-home')
            assert page.evaluate('words.length') == 12387
            assert page.evaluate('JSON.stringify([S.srs,S.star,S.ev])') == saved
            assert page.evaluate("fetch('data/hsk4.json').then(r=>r.json()).then(words=>words.length)") == 972
            assert page.evaluate('urls=>Promise.all(urls.map(u=>fetch(u).then(r=>r.arrayBuffer()).then(b=>b.byteLength>512))).then(x=>x.every(Boolean))', urls)
            page.evaluate("location.hash='#/reader'")
            page.fill('#zh-text', '你好')
            page.click('#zh-read')
            assert page.text_content('#zh-reading') == '你好'
            print(json.dumps({'browser':kind, 'originStoppedReload':True, 'responseFromWorker':True,
                              'negativeControlFailed':True, 'catalogAndAudioFromCache':True,
                              'progressUnchanged':True, 'readerAvailable':True}), flush=True)
        finally:
            browser.close()
            server.shutdown()
            server.server_close()
