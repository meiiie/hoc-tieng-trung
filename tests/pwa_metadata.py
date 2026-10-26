"""Check installability and preserve the installed identity at root and GitHub Pages paths."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import subprocess
import threading
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OLD=subprocess.check_output(['git','show','c9336d6ca1cc17fde1f7d9e6eee728847f87ffa5:manifest.webmanifest'],cwd=ROOT)

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def log_message(self,*_):pass
    def translate_path(self,path):
        if path.startswith('/hoc-tieng-trung/'):path=path[len('/hoc-tieng-trung'):]
        return super().translate_path(path)

server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
results=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch()
        for path in ['/', '/hoc-tieng-trung/']:
            ids=[]
            for old in [True,False]:
                context=browser.new_context(service_workers='block');page=context.new_page()
                if old:page.route('**/manifest.webmanifest',lambda route:route.fulfill(body=OLD,content_type='application/manifest+json'))
                page.goto(f'http://127.0.0.1:{server.server_port}'+path)
                session=context.new_cdp_session(page)
                manifest=session.send('Page.getAppManifest')
                assert not manifest.get('errors'),manifest.get('errors')
                ids.append(manifest['manifest']['id'])
                if not old:
                    errors=session.send('Page.getInstallabilityErrors')['installabilityErrors']
                    assert not errors,errors
                    structured=json.loads(page.locator('script[type="application/ld+json"]').text_content())
                    assert structured['@type']=='WebApplication'
                context.close()
            assert ids[0]==ids[1],(path,ids)
            results.append({'path':path,'identityUnchanged':True,'manifestErrors':[],'installabilityErrors':[]})
        browser.close()
finally:
    server.shutdown();server.server_close()
(ROOT/'docs/audits/pwa-metadata-2026-10-27.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8')
print(json.dumps(results))
