"""Lab profiling only: isolated Chromium, 4x CPU slowdown, complete word catalog.

Start tools/serve.py, then: python tools/profile-ui.py LABEL [BASE_URL] [GIT_REF]
GIT_REF overrides the four changed frontend files with their committed contents.
Writes .cache/perf-LABEL.json. Lab timings are not field INP or physical-device results.
"""
import collections
import json
from pathlib import Path
import sys
import subprocess
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
label=sys.argv[1] if len(sys.argv)>1 else 'current'
base=sys.argv[2] if len(sys.argv)>2 else 'http://127.0.0.1:8931/'
ref=sys.argv[3] if len(sys.argv)>3 else None
(root/'.cache').mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':390,'height':844},service_workers='block')
    if ref:
        for file in ['core/app-core.js','core/mascot.js','lang-zh.js','lang-zh.css']:
            body=subprocess.check_output(['git','show',f'{ref}:{file}'],cwd=root)
            mime='text/css' if file.endswith('.css') else 'text/javascript'
            context.route('**/'+file,lambda route,request,body=body,mime=mime:route.fulfill(body=body,content_type=mime))
    page=context.new_page()
    page.add_init_script("""window.perfProbe={writes:0,listeners:0,long:[],events:[],frames:[]};
      const set=Storage.prototype.setItem;Storage.prototype.setItem=function(...args){perfProbe.writes++;return set.apply(this,args)};
      const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
      EventTarget.prototype.addEventListener=function(type,...args){if(this===document&&type==='selectionchange')perfProbe.listeners++;return add.call(this,type,...args)};
      EventTarget.prototype.removeEventListener=function(type,...args){if(this===document&&type==='selectionchange')perfProbe.listeners--;return remove.call(this,type,...args)};
      new PerformanceObserver(list=>perfProbe.long.push(...list.getEntries().map(e=>({start:e.startTime,ms:e.duration})))).observe({type:'longtask',buffered:true});
      new PerformanceObserver(list=>perfProbe.events.push(...list.getEntries().filter(e=>e.interactionId).map(e=>({name:e.name,ms:e.duration})))).observe({type:'event',buffered:true,durationThreshold:16});
    """)
    cdp=context.new_cdp_session(page)
    cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
    page.goto(base)
    page.wait_for_function('typeof words!=="undefined"&&words.length===12387')
    page.wait_for_load_state('networkidle')
    page.evaluate("S.user={name:'Performance',done:true,goal:'10'};S.set.autoplay=false;S.set.mhint=1;S.set.f={};save();route()")
    report={'label':label,'ref':ref or 'working tree','browser':browser.version,'cpuSlowdown':4,'viewport':[390,844],'words':12387,'loadLongTasks':page.evaluate('perfProbe.long')}
    def profile(name,action):
        cdp.send('Profiler.enable');cdp.send('Profiler.start')
        action()
        profile=cdp.send('Profiler.stop')['profile']
        nodes={n['id']:n['callFrame'] for n in profile['nodes']};times=collections.Counter()
        for node,delta in zip(profile.get('samples',[]),profile.get('timeDeltas',[])):
            f=nodes[node];times[(f['functionName'],f['url'].split('/')[-1],f.get('lineNumber',0)+1)]+=delta/1000
        return [{'fn':f[0],'file':f[1],'line':f[2],'ms':round(ms,1)} for f,ms in times.most_common(15)]
    report['routes']=[]
    for route in ['', 'cards','list','reader','stats','review']:
        page.evaluate('(r)=>location.hash="#/"+r',route)
        page.wait_for_timeout(600)
        timing=page.evaluate("""async(r)=>{const out=[];for(let i=0;i<5;i++){
          const t=performance.now();route();const sync=performance.now()-t;
          if(r==='list')while(!document.querySelector('#ls')?.children.length)await new Promise(requestAnimationFrame);
          await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
          out.push({syncMs:sync,settledMs:performance.now()-t});
        }return out}""",route)
        report['routes'].append({'route':route,'samples':timing})
    page.evaluate("location.hash='#/cards'");page.wait_for_selector('.fc')
    page.wait_for_timeout(600)
    report['idleCards']=profile('idle',lambda:page.wait_for_timeout(2500))
    page.evaluate('perfProbe.writes=0;window.savedView=document.querySelector(".view");window.savedMascot=document.querySelector(".mwrap")')
    for _ in range(8):
        page.click('#nK');page.wait_for_timeout(350)
    report['advance']=page.evaluate('({writes:perfProbe.writes,listeners:perfProbe.listeners,sameView:savedView===document.querySelector(".view"),sameMascot:savedMascot===document.querySelector(".mwrap")})')
    page.evaluate("location.hash='#/list'");page.wait_for_selector('#sq')
    page.wait_for_selector('#ls .it');eventStart=page.evaluate('perfProbe.events.length')
    report['listSearch']=profile('search',lambda:(page.locator('#sq').press_sequentially('zhongguo',delay=160),page.wait_for_timeout(400)))
    report['listTypingEvents']=page.evaluate('(i)=>perfProbe.events.slice(i)',eventStart)
    page.evaluate("location.hash='#/reader'");page.wait_for_selector('#zh-lookup')
    eventStart=page.evaluate('perfProbe.events.length')
    report['readerSearch']=profile('search',lambda:(page.locator('#zh-lookup').press_sequentially('zhongguo',delay=80),page.wait_for_timeout(200)))
    report['readerTypingEvents']=page.evaluate('(i)=>perfProbe.events.slice(i)',eventStart)
    page.fill('#zh-text','你好，中国。'*600)
    report['readerSubmitMs']=page.evaluate("()=>{const t=performance.now();document.querySelector('#zh-read').click();return performance.now()-t}")
    report['longTasks']=page.evaluate('perfProbe.long');report['interactions']=page.evaluate('perfProbe.events')
    (root/f'.cache/perf-{label}.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k not in ['longTasks','loadLongTasks','interactions']},ensure_ascii=False,indent=2))
    print('long tasks',len(report['longTasks']),'max',max([x['ms'] for x in report['longTasks']],default=0))
    browser.close()
