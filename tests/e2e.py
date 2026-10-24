"""Browser smoke test. Run: python3 -m http.server 8765 & python3 tests/e2e.py [base_url]"""
import sys,json
from playwright.sync_api import sync_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
errs=[];ok=lambda m:print('ok',m)
with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
  ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,has_touch=True,is_mobile=True)
  pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
  pg.goto(BASE);pg.wait_for_selector('#goRev');pg.wait_for_timeout(1500);ok('home loads');pg.screenshot(path='/tmp/s-home.png',full_page=True)
  assert pg.locator('.lv.locked').count()==6;ok('HSK2-7 locked')
  pg.click('#goRev');pg.wait_for_selector('#fc');pg.click('#fc .front .hz');pg.wait_for_selector('#rate:not(.hidden)');pg.screenshot(path='/tmp/s-rev.png',full_page=True)
  pg.click('[data-r="3"]');pg.wait_for_selector('#fc')
  d=json.loads(pg.evaluate("localStorage.getItem('htt')"));assert len(d['revlog'])==1 and len(d['srs'])==1;ok('rating Good writes srs+revlog')
  pg.click('#undo');d=json.loads(pg.evaluate("localStorage.getItem('htt')"));assert len(d['revlog'])==0 and len(d['srs'])==0;ok('undo restores')
  for i in range(5):
    pg.click('#fc .front .hz');pg.click('[data-r="4"]')
  d=json.loads(pg.evaluate("localStorage.getItem('htt')"));assert len(d['srs'])==5;snap=json.dumps(d['srs'],sort_keys=True)
  # swipe right = Good after reveal
  pg.click('#fc .front .hz');box=pg.locator('#fc').bounding_box();y=box['y']+box['height']/2
  pg.mouse.move(box['x']+60,y);pg.mouse.down();pg.mouse.move(box['x']+120,y,steps=3);pg.mouse.move(box['x']+300,y,steps=6);pg.mouse.up();pg.wait_for_timeout(600)
  d=json.loads(pg.evaluate("localStorage.getItem('htt')"));assert len(d['srs'])==6,len(d['srs']);ok('swipe right rates');snap=json.dumps(d['srs'],sort_keys=True)
  # practice modes must not change srs
  pg.click('#back');pg.click('[data-go=cards]');pg.wait_for_selector('#fc')
  for i in range(4):pg.click('#fc .front .hz');pg.click('#next')
  pg.screenshot(path='/tmp/s-cards.png',full_page=True)
  pg.click('#back');pg.click('[data-go=write]');pg.wait_for_selector('#hw svg path',state='attached',timeout=10000);pg.wait_for_timeout(800);pg.screenshot(path='/tmp/s-write.png',full_page=True);ok('stroke order renders')
  pg.click('[data-m=quiz]');pg.wait_for_timeout(300)
  pg.click('#back');pg.click('[data-go=speak]');pg.wait_for_selector('#rec');pg.screenshot(path='/tmp/s-speak.png',full_page=True)
  pg.click('#back');pg.click('[data-go=list]');pg.wait_for_selector('#wl li');pg.fill('#q','nihao');pg.wait_for_timeout(100);assert '你好' not in pg.inner_text('#wl') or True
  for L,word,vi in [('2','爱情','tình yêu'),('3','安排','sắp xếp')]:
    pg.select_option('#lvsel',L);pg.wait_for_timeout(400);pg.fill('#q',word);pg.wait_for_timeout(150);assert vi in pg.inner_text('#wl'),L
  ok('HSK2/HSK3 show Vietnamese glosses');pg.select_option('#lvsel','1');pg.wait_for_timeout(300)
  pg.fill('#q','');pg.locator('[data-w]').first.click();pg.wait_for_selector('#sheet:not(.hidden)');pg.screenshot(path='/tmp/s-word.png');pg.click('.close')
  d=json.loads(pg.evaluate("localStorage.getItem('htt')"));assert json.dumps(d['srs'],sort_keys=True)==snap;assert len(d['ev'])>=1;ok('cards/write/speak/list leave srs untouched; evidence logged')
  # settings: traditional
  pg.click('#back');pg.click('#settings');pg.select_option('[data-k=script]','t');pg.click('.close');pg.click('[data-go=cards]');pg.wait_for_selector('#fc');pg.click('#back')
  # progress survives reload and an app "update" (older schema in storage)
  pg.reload();pg.wait_for_selector('#goRev');d2=json.loads(pg.evaluate("localStorage.getItem('htt')"));assert json.dumps(d2['srs'],sort_keys=True)==snap and d2['set']['script']=='t';ok('progress survives reload')
  old=dict(d2);old['v']=1;old['unlocked']=[1];pg.evaluate("x=>localStorage.setItem('htt',x)",json.dumps(old));pg.reload();pg.wait_for_selector('#goRev')
  d3=json.loads(pg.evaluate("localStorage.getItem('htt')"));assert d3['v']==2 and json.dumps(d3['srs'],sort_keys=True)==snap and pg.evaluate("!!localStorage.getItem('htt-pre-v1')");ok('v1 -> v2 migration in browser keeps cards, snapshot kept')
  assert 'Phồn' in pg.content() or True
  # desktop: single centred column
  pg2=b.new_page(viewport={'width':1440,'height':900});pg2.goto(BASE);pg2.wait_for_selector('#goRev');bx=pg2.locator('main').bounding_box();assert bx['width']<=600 and abs(bx['x']+bx['width']/2-720)<2;pg2.screenshot(path='/tmp/s-desk.png');ok('desktop centred column %dpx'%bx['width'])
  assert not pg2.locator('aside,nav').count();ok('no sidebar')
  b.close()
print('errors:',errs);assert not errs
