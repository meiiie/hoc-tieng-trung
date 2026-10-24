#!/usr/bin/env python3
"""Build data/ from drkameleon/complete-hsk-vocabulary (MIT; meanings from CC-CEDICT, CC BY-SA 4.0),
makemeahanzi dictionary.txt and hanzi-writer-data 2.0.1 (Arphic Public License).
Usage: tools/build-data.py <chv_dir> <makemeahanzi_dictionary.txt> <hanzi-writer-data/package>"""
import json,sys,os,re,shutil,unicodedata
chv,dictf,hwd=sys.argv[1:4];out='data'
VI={L:open(f'tools/vi{L}.txt',encoding='utf8').read().strip().split('|') for L in (1,2,3)}
BAD=re.compile(r'^(surname|variant of|old variant|abbr\.|erhua variant|used in|\(archaic\)|Japanese variant|see )',re.I)
def means(ms):
  g=[m for m in ms if not BAD.match(m)] or ms
  return [m[:80] for m in g[:3]]
chars=set();meta={'source':'https://github.com/drkameleon/complete-hsk-vocabulary (commit 7ac65bf, MIT); meanings CC-CEDICT CC BY-SA 4.0','levels':{}}
names={1:'HSK 1',2:'HSK 2',3:'HSK 3',4:'HSK 4',5:'HSK 5',6:'HSK 6',7:'HSK 7–9'}
seen=set()
for L in range(1,8):
  d=json.load(open(f'{chv}/wordlists/exclusive/new/{L}.json',encoding='utf8'));W=[]
  if L in VI: assert len(VI[L])==len(d),(L,len(VI[L]),len(d))
  for i,w in enumerate(d):
    f=w['forms'][0];tr=f['transcriptions'];id=w['simplified']+'|'+tr['numeric'].replace(' ','')
    if id in seen: continue
    seen.add(id)
    r={'id':id,'s':w['simplified'],'t':f['traditional'],'p':tr['pinyin'],'n':tr['numeric'],'m':means(f['meanings']),'r':w.get('radical','')}
    if L in VI: r['v']=VI[L][i].strip()
    if len(w['forms'])>1: r['alt']=[x['transcriptions']['pinyin'] for x in w['forms'][1:3]]
    W.append(r);chars.update(w['simplified']);chars.update(f['traditional'])
  json.dump(W,open(f'{out}/hsk{L}.json','w',encoding='utf8'),ensure_ascii=False,separators=(',',':'))
  meta['levels'][L]={'name':names[L],'count':len(W)}
json.dump(meta,open(f'{out}/meta.json','w',encoding='utf8'),ensure_ascii=False)
info={}
for line in open(dictf,encoding='utf8'):
  j=json.loads(line);c=j['character']
  if c in chars:
    e={'d':j.get('definition',''),'c':j.get('decomposition',''),'r':j.get('radical','')}
    h=(j.get('etymology') or {}).get('hint')
    if h:e['h']=h
    info[c]=e
# Kangxi radical names via Unicode: NFKC of U+2F00..U+2FD5 maps to the ideograph
rad={}
for cp in list(range(0x2F00,0x2FD6))+list(range(0x2E80,0x2EF4)):
  try:n=unicodedata.name(chr(cp))
  except ValueError:continue
  k=unicodedata.normalize('NFKC',chr(cp))
  rad.setdefault(k,n.replace('KANGXI RADICAL ','').replace('CJK RADICAL ','').lower())
  rad.setdefault(chr(cp),rad[k])
for c,e in info.items():
  if e['r'] in rad:e['rn']=rad[e['r']]
json.dump(info,open(f'{out}/chars.json','w',encoding='utf8'),ensure_ascii=False,separators=(',',':'))
os.makedirs(f'{out}/strokes',exist_ok=True);n=0
for c in chars:
  s=f'{hwd}/{c}.json'
  if os.path.exists(s):shutil.copy(s,f'{out}/strokes/{c}.json');n+=1
print('words',sum(v['count'] for v in meta['levels'].values()),'chars',len(chars),'strokes',n,'info',len(info))
