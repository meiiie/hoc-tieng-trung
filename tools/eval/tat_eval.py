import json,numpy as np,collections
from stl_eval import *
from pypinyin import lazy_pinyin,Style
lab=json.load(open('tat_labels.json'));R=collections.Counter()
for r in lab:
  h=r['h'];py=lazy_pinyin(h,style=Style.TONE3,neutral_tone_with_five=True);base=[p.rstrip('12345').replace('ü','v') for p in py]
  a=np.fromfile(f"tat/{r['id']}.f32",dtype=np.float32)
  if len(a)>160000:continue
  sl,tl=run(a,len(h))
  for k in range(len(h)):
    b=base[k] if base[k] in IDX else base[k].replace('v','u')
    if b in IDX:R['sn']+=1;R['so']+=sl[k].argmax()==IDX[b]
    pt=tl[k].argmax();pt=5 if pt==0 else pt
    if r['tn'][k]<5:R['tn']+=1;R['to']+=pt==r['sf'][k]
print({'syl':round(R['so']/R['sn'],3),'tone':round(R['to']/R['tn'],3)})
