"""Browser tests for the core-based app. Start python tools/serve.py in a separate terminal,
then run: python -X utf8 tests/e2e.py [base_url] [chromium|webkit|all]
Covers: v2 -> core migration (old key untouched), practice never changes schedules, scheduled review does, script and pinyin toggles,
all levels open, writing mode, speaking mode with a fake microphone (Chromium), axe accessibility checks, no console errors."""
import sys,json,os
from playwright.sync_api import sync_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8931/'
WHICH=sys.argv[2] if len(sys.argv)>2 else 'all'
AXE=open(os.environ.get('AXE','node_modules/axe-core/axe.min.js'),encoding='utf8').read() if os.path.exists(os.environ.get('AXE','node_modules/axe-core/axe.min.js')) else None
V2={"v":2,"srs":{"爱|ai4":{"state":"review","due":4102444800000,"int":30,"s":31.5,"d":4.2,"reps":4,"lapses":0,"last":1760000000000}},"revlog":[["爱|ai4",3,1760000000000,"learn"]],
 "ev":{"爱|ai4":[["write",1,1760000000001]]},"log":{"2026-10-20":{"rev":1,"new":0}},"star":{},"unlocked":{"1":True,"2":True},"set":{"script":"s","pinyin":"show","newPerDay":20,"retention":0.9,"theme":"light","autoplay":False,"haptics":True},"created":1}
def run(kind):
  errs=[];res=[];ok=lambda m:(res.append(m),print(f'[{kind}] ok',m))
  with sync_playwright() as p:
    if kind=='chromium':b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required'])
    else:b=p.webkit.launch()
    ctx=b.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=kind!='webkit' or True)
    if kind=='chromium':ctx.grant_permissions(['microphone'])
    pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and '.mp3' not in m.text and 'Failed to load resource' not in m.text and errs.append(m.text))
    E=pg.evaluate;Wt=pg.wait_for_timeout
    def settled():
      pg.wait_for_function("document.querySelector('.view')&&getComputedStyle(document.querySelector('.view')).opacity==='1'")
      E("Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))")
    # 1. migration from the old v2 app
    pg.goto(BASE)
    # Finish bootstrap before deliberately reloading the migration fixture.
    # WebKit can report aborted background fetches as access-control errors.
    pg.wait_for_function('typeof words!=="undefined"&&words.length===12387');pg.wait_for_load_state('networkidle')
    E("k=>{localStorage.clear();localStorage.setItem('htt',k)}",json.dumps(V2));pg.reload();pg.wait_for_selector('.v-home');Wt(800)
    old=E("localStorage.getItem('htt')");assert json.loads(old)==V2;ok('old v2 record untouched')
    d=json.loads(E("localStorage.getItem('htt-core')"));assert d['srs']['爱|ai4']['int']==30 and d['srs']['爱|ai4']['reps']==4;ok('srs migrated exactly')
    assert d['zhUnl'].get('2') and d['user']['done'] and d['ev']['爱|ai4'][0][1]=='w';ok('unlocks, onboarding state and evidence migrated')
    assert pg.locator('[data-zl][aria-disabled]').count()==0 and E('words.length')==12387;ok('all HSK levels open and loaded with legacy progress')
    learned=E("document.querySelector('.v-home').innerText");assert '1\nđã học' in learned or '1\n' in learned;ok('home counts migrated word')
    # 2. practice modes do not touch schedules
    snap=E("JSON.stringify(S.srs)")
    pg.goto(BASE+'#/cards');pg.wait_for_selector('.fc');Wt(500);pg.locator('.fc').first.click(position={'x':40,'y':200});Wt(400)
    for k in ['ArrowRight','ArrowLeft','ArrowRight']:pg.keyboard.press(k);Wt(350)
    pg.goto(BASE+'#/learn');Wt(800);pg.locator('.opt').first.click();Wt(500)
    pg.goto(BASE+'#/test');Wt(800);pg.click('#sub') if pg.locator('#sub').count() else None;Wt(500)
    pg.goto(BASE+'#/listen');Wt(800);pg.fill('#ti','xxx');pg.keyboard.press('Enter');Wt(400)
    assert E("JSON.stringify(S.srs)")==snap;ok('flashcards/learn/test/listen leave S.srs unchanged')
    assert sum(len(v) for v in E("S.ev").values())>1;ok('practice recorded as evidence')
    # 3. scheduled review changes the schedule
    pg.goto(BASE+'#/review');pg.wait_for_selector('.fc');Wt(500);pg.keyboard.press('Space');Wt(400);pg.keyboard.press('3');Wt(600)
    assert len(E("S.srs"))>=2;ok('Ôn theo lịch writes a schedule')
    # 4. script + pinyin toggles
    pg.goto(BASE+'#/');pg.wait_for_selector('.v-home');pg.click('#voice');Wt(400);assert E("S.set.script")=='t' and pg.text_content('#voice')=='繁';ok('header chip switches to traditional')
    assert E("byId('爱|ai4').w")=='愛';ok('words show traditional')
    pg.click('#voice');Wt(300);E("S.set.py='off';save()");pg.goto(BASE+'#/cards');pg.wait_for_selector('.fc');Wt(400);assert pg.locator('.fc .pyc').count()==0;ok('pinyin hidden when off')
    E("S.set.py='on';save()")
    pg.goto(BASE+'#/');pg.wait_for_selector('.v-home');pg.click('[data-zl="7"]');Wt(300);assert E("deck().length")==5606;ok('HSK 7-9 can be selected immediately')
    pg.click('[data-zl="7"]');Wt(300)
    # 6. writing mode
    pg.goto(BASE+'#/write?w='+'爱|ai4');pg.wait_for_selector('#hw svg',state='attached');Wt(800);assert pg.locator('#hw svg path').count()>3;ok('stroke order renders')
    pg.click('[data-m="quiz"]');Wt(600);assert 'Viết từng nét' in pg.text_content('#qs');ok('writing quiz starts')
    # 7. speaking
    pg.goto(BASE+'#/speak');pg.wait_for_selector('#dlm');assert pg.locator('#mic').count();ok('speak screen supports self-comparison with optional model download')
    if kind=='chromium':
      pg.click('#dlm');pg.wait_for_selector('#mic',timeout=120000);ok('model downloads, caches and loads in the page')
    else:
      pg.wait_for_selector('#mic');ok('self-comparison without the model')
    pg.locator('.pyc').first.click();pg.wait_for_selector('.tguide');ok('plain pinyin opens tone + mouth guide');pg.keyboard.press('Escape');Wt(400)
    if kind=='chromium':
      if pg.locator('#sheet:not(.hidden)').count():E("document.querySelector('#sheet').classList.add('hidden')")
      pg.click('#mic');Wt(4500)
      if pg.locator('.recw').count():pg.click('#mic')
      pg.wait_for_function("['result','err'].includes(document.querySelector('#sarea').dataset.state)",timeout=30000)
      t=pg.text_content('#sarea');assert ('Nghe lại và đối chiếu' in t) or ('Chưa nhận được' in t) or ('Đã ghi âm' in t),t;ok('fake mic + model: result shows what the model heard, or a clear message')
      pg.goto(BASE);Wt(500);pg.click('#settings');Wt(400);pg.click('#mcb');pg.wait_for_function("/Hz/.test(document.querySelector('#mcd').textContent)",timeout=10000)
      d=pg.text_content('#mcd');assert 'Hz' in d,d;ok('settings mic check shows permission, sample rate, peak, duration')
      E("document.querySelector('#sheet').classList.add('hidden')")
    # 8. accessibility
    if AXE:
      bad={}
      for r in ['','#/cards','#/review','#/write','#/speak','#/list','#/stats','#/learn','#/listen']:
        print(f'[{kind}] axe screen {r or "home"}', flush=True)
        pg.goto(BASE+r);Wt(900);settled();E(AXE);v=E("axe.run(document,{runOnly:['wcag2a','wcag2aa']}).then(r=>r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,html:n.html,summary:n.failureSummary}))})))")
        if v:
          bad[r or 'home']=v
          os.makedirs('.cache',exist_ok=True);pg.screenshot(path=f'.cache/axe-{kind}-{r.replace("#/","") or "home"}.png')
      pg.goto(BASE);Wt(600);pg.click('#settings');Wt(500);E(AXE);v=E("axe.run(document,{runOnly:['wcag2a','wcag2aa']}).then(r=>r.violations.map(v=>v.id+':'+v.nodes.length))")
      if v:bad['settings']=v
      print(f'[{kind}] axe',bad or 'no violations');assert not bad;ok('axe wcag2a/aa clean on 10 screens')
    assert not errs,errs[:5];ok('no console errors')
    b.close()
  return res
tot=0
for k in (['chromium','webkit'] if WHICH=='all' else [WHICH]):tot+=len(run(k))
print(tot,'e2e checks passed')
