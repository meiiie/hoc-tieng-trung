"""The in-browser model (zh-asr-worker.js: JS mel front end + onnxruntime-web WASM) must give the same answers as the Python
reference (numpy front end + onnxruntime CPU) on fixture audio. Run: python3 tests/model_parity.py [base] [chromium|webkit|all]"""
import sys,json,os
from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8931/';K=sys.argv[2] if len(sys.argv)>2 else 'all'
EX=json.load(open('tests/fixtures/stl-expected.json'));V=json.load(open('models/stl-v6-vocab.json'))['syllables']
JS="""async fx=>{const w=new Worker('zh-asr-worker.js');const call=m=>new Promise((ok,no)=>{w.onmessage=e=>{if(e.data.type=='prog'||e.data.type=='phase')return;e.data.type=='err'?no(e.data.msg):ok(e.data)};w.postMessage(m)});
 const t0=performance.now();await call({type:'load'});const tl=performance.now()-t0;const out=[];
 for(const f of fx){const b=await (await fetch('tests/fixtures/'+f.file)).arrayBuffer();const pcm=new Float32Array(b);const r=await call({type:'run',id:1,pcm,n:f.n,targets:Array(f.n).fill('ma')});
  out.push({top:r.syl.map(s=>s.top[0][0]),p0:r.syl.map(s=>s.top[0][1]),tone:r.syl.map(s=>{const t=s.tone,i=t.indexOf(Math.max(...t));return i==4?0:i+1}),ms:r.ms})}
 const st=await call({type:'status'});return {load:tl,out,cached:st.cached}}"""
with sync_playwright() as p:
  for kind in (['chromium','webkit'] if K=='all' else [K]):
    b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE')) if kind=='chromium' else p.webkit.launch()
    pg=b.new_page();pg.goto(B);pg.wait_for_timeout(500);r=pg.evaluate(JS,EX)
    for e,o in zip(EX,r['out']):
      want=[V[i-2] for i in e['top']];assert o['top']==want,(kind,e['word'],o['top'],want);assert o['tone']==e['tone'],(kind,e['word'],o['tone'],e['tone'])
      assert all(abs(a-b)<0.12 for a,b in zip(o['p0'],e['p0'])),(o['p0'],e['p0'])
    assert r['cached'];print("p0 js",[x["p0"] for x in r["out"]]);print(f"[{kind}] ok parity on {len(EX)} fixtures; load {r['load']/1000:.1f}s, per word {[x['ms'] for x in r['out']]} ms, cached offline")
    b.close()
