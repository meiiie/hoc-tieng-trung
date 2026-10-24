import json,numpy as np,sys,re,time
from stl_eval import *
sys.path.insert(0,'.')
R={'syl':[0,0],'tone_a':[0,0],'tone_b':[0,0],'word':[0,0]};miss=0;t0=time.time();N=int(sys.argv[1]) if len(sys.argv)>1 else 300
import random;random.seed(1)
items=[(L,v,i,w) for L in (1,2,3) for v in ('f','m') for i,w in enumerate(json.load(open(f'/workspace/chinese/hoc-tieng-trung/data/hsk{L}.json')))]
random.shuffle(items)
for L,v,i,w in items[:N]:
  a=np.fromfile(f'/tmp/pcm/audio_hsk{L}_{v}_w_{i:04d}.mp3.f32',dtype=np.float32)
  sy=w['n'].split();n=len(sy);sl,tl=run(a,n);allok=True
  sys.path
  for k,s in enumerate(sy):
    t=int(s[-1]) if s[-1].isdigit() else 5;base=norm_syl(s)
    if base not in IDX:miss+=1;continue
    ps=sl[k].argmax();R['syl'][1]+=1;ok=ps==IDX[base];R['syl'][0]+=ok;allok&=bool(ok)
    if t<5:
      pt=tl[k].argmax();R['tone_a'][1]+=1;R['tone_a'][0]+=pt==t;R['tone_b'][1]+=1;R['tone_b'][0]+=pt==t-1
  R['word'][1]+=1;R['word'][0]+=allok
print({k:(round(a/b,3),b) for k,(a,b) in R.items()},'miss',miss,'sec',round(time.time()-t0))
