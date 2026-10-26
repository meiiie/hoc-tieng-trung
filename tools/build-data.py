#!/usr/bin/env python3
"""Build data/ (v3: adds CVDICT Vietnamese meanings, part of speech, Hán Việt readings).
Extra inputs via env: CVDICT=CVDICT.u8 path, UNIHAN=Unihan_Readings.txt path; Kai Hanzi data is in data/sources/.
Build data/ from drkameleon/complete-hsk-vocabulary (MIT; meanings from CC-CEDICT, CC BY-SA 4.0),
makemeahanzi dictionary.txt and hanzi-writer-data 2.0.1 (Arphic Public License).
Usage: tools/build-data.py <chv_dir> <makemeahanzi_dictionary.txt> <hanzi-writer-data/package>"""
import json,sys,os,re,shutil,unicodedata,subprocess
from content import ROOT, atomic_json, enrich, read_json, short_gloss, validate
CORRECTIONS=read_json(ROOT/'data/sources/corrections.json')
chv,dictf,hwd=sys.argv[1:4];out='data'
VI={L:open(f'tools/vi{L}.txt',encoding='utf8').read().strip().split('|') for L in (1,2,3)}
BAD=re.compile(r'^(surname|variant of|old variant|abbr\.|erhua variant|used in|\(archaic\)|Japanese variant|see )',re.I)
def means(ms):
  g=[m for m in ms if not BAD.match(m)] or ms
  return g[:3]
CV={};CV1={}
for line in open(os.environ['CVDICT'],encoding='utf8'):
  if line.startswith('#'):continue
  m=re.match(r'(\S+) (\S+) \[([^\]]+)\] /(.*)/\s*$',line)
  if not m:continue
  tr,si,py,ds=m.groups();senses=[x for x in ds.split('/') if x]
  k=(si,py.replace('u:','v').replace(' ',''))
  CV.setdefault(k,[]).extend(senses);CV1.setdefault(si,[]).extend(senses)
VBAD=re.compile(r'^(họ |biến thể|dạng cổ|viết tắt|xem |cách viết|giản thể|phồn thể|tên riêng|dạng khác)',re.I)
def cvmeans(si,num):
  k=(si,num.replace('u:','v').replace('ü','v').replace(' ',''))
  ss=CV.get(k) or CV.get((si,k[1].lower())) or []
  if not ss:ss=CV1.get(si) or []
  ss=[x for x in ss if not re.search(r'\[[a-z]+\d(?: [a-z]+\d)*\]',x) or re.search(r'\|',x)]
  ss=[x for x in ss if not re.search(r'(Đài Loan|cũng đọc|phát âm|cách đọc).*\[',x)]
  MW=re.compile(r'\(?\s*(?:LT|lượng từ)\s*:[^)/;]*\)?',re.I)
  ss=[x for x in ss if not re.match(r'^\s*(?:LT|lượng từ)\s*:',x,re.I) and not re.match(r'^[^\w]*(?:\w+\|)?\w+\[[a-z]+\d\](?:,\s*(?:\w+\|)?\w+\[[a-z]+\d\])*\s*$',x)]
  ss=[MW.sub('',x) for x in ss]
  ss=[re.sub(r'(?:[^\s|\[\]]+\|)?([^\s|\[\],;()]+)\[[A-Za-z:]+\d?(?: [A-Za-z:]+\d?)*\]',r'\1',x).strip(' ,;') for x in ss]
  ss=[re.sub(r'(?<![\w])(?:[^\s|]+)\|([^\s|,;()]+)',r'\1',x) for x in ss]
  ss=[x for x in ss if x]
  if not ss:return None,'none'
  if len(ss)==1:
    m=re.match(r'biến thể (?:er hoá )?của (?:[^|\[]+\|)?([^\[|]+)\|?\[([^\]]+)\]',ss[0])
    if m and m.group(1)!=si:
      r,_=cvmeans(m.group(1),m.group(2))
      if r:return r,'exact'
  g=[x for x in ss if not VBAD.match(x)] or ss
  return '; '.join(dict.fromkeys(g[:3])).replace('(văn học)','(văn viết)'),'exact'
KAI={c['hanzi']:c for c in json.load(open('data/sources/kaihanzi-characters.json',encoding='utf8'))}
UV={}
for line in open(os.environ['UNIHAN'],encoding='utf8'):
  if '\tkVietnamese\t' in line:
    cp,_,v=line.rstrip('\n').split('\t');UV[chr(int(cp[2:],16))]=v.split()[0]
def hv1(s,t):
  if s in KAI and KAI[s].get('sinoViet'):return KAI[s]['sinoViet'].split(',')[0].strip().lower(),'kai'
  for c in (t,s):
    if c in UV:return UV[c].lower(),'unihan'
  return None,None
POS={'n':'danh từ','v':'động từ','a':'tính từ','d':'phó từ','p':'giới từ','c':'liên từ','u':'trợ từ','m':'số từ','q':'lượng từ','r':'đại từ','t':'từ chỉ thời gian','f':'phương vị từ','s':'từ chỉ nơi chốn','e':'thán từ','y':'trợ từ ngữ khí','o':'từ tượng thanh','vn':'động từ, danh từ','an':'tính từ, danh từ','ad':'tính từ, phó từ','nr':'tên người','ns':'địa danh','nz':'danh từ riêng','mq':'số lượng từ','qt':'lượng từ thời gian','qv':'động lượng từ','tg':'từ chỉ thời gian','vd':'động từ','vi':'nội động từ','b':'từ khu biệt','g':'ngữ tố','k':'hậu tố','h':'tiền tố','i':'thành ngữ','l':'quán ngữ','cc':'liên từ'}
FIX=['level\tword\tfrom\tto']
OVR={l.split('\t')[0]:l.rstrip('\n').split('\t')[1] for l in open('tools/vi-overrides.tsv',encoding='utf8') if l.strip() and not l.startswith('#')}
DIS=['level\tword\tours\tcvdict']
stat={'vi_own':0,'vi_cv':0,'vi_none':0,'hv_full':0,'hv_part':0,'cv_agree':0,'cv_checked':0}
chars=set();meta={'source':'https://github.com/drkameleon/complete-hsk-vocabulary (commit 7ac65bf, MIT); meanings CC-CEDICT CC BY-SA 4.0','levels':{}}
names={1:'HSK 1',2:'HSK 2',3:'HSK 3',4:'HSK 4',5:'HSK 5',6:'HSK 6',7:'HSK 7–9'}
seen=set();built={}
for L in range(1,8):
  d=json.load(open(f'{chv}/wordlists/exclusive/new/{L}.json',encoding='utf8'));W=[]
  if L in VI: assert len(VI[L])==len(d),(L,len(VI[L]),len(d))
  for i,w in enumerate(d):
    f0=w['forms'][0];id=w['simplified']+'|'+f0['transcriptions']['numeric'].replace(' ','')  # id frozen to forms[0] so stored progress keeps matching
    own=set(re.findall(r'\w+',VI[L][i].lower())) if L in VI else set()
    def fscore(f):
      n=f['transcriptions']['numeric'];ms=' '.join(f['meanings']).lower();k=(w['simplified'],n.replace(' ','').replace('u:','v'))
      cvs=' '.join(CV.get(k,[])).lower()
      sc=10*len(own&set(re.findall(r'\w+',cvs)))
      if n[:1].isupper():sc-=8
      if 'surname' in ms:sc-=6
      if re.search(r'variant of|old variant|used in ',ms):sc-=4
      return sc+min(len(f['meanings']),6)*0.5
    f=max(w['forms'],key=fscore) if len(w['forms'])>1 else f0
    if f is not f0:stat['form_fix']=stat.get('form_fix',0)+1;FIX.append(f"{L}\t{w['simplified']}\t{f0['transcriptions']['pinyin']}\t{f['transcriptions']['pinyin']}")
    tr=f['transcriptions']
    if id in seen: continue
    seen.add(id)
    r={'id':id,'s':w['simplified'],'t':f['traditional'],'p':tr['pinyin'],'n':tr['numeric'],'m':means(f['meanings']),'r':w.get('radical','')}
    cvm,_=cvmeans(w['simplified'],tr['numeric'])
    if L in VI:
      r['v']=VI[L][i].strip();stat['vi_own']+=1
      if cvm:
        stat['cv_checked']+=1;a=set(re.findall(r'\w+',r['v'].lower()));b=set(re.findall(r'\w+',cvm.lower()))
        if a&b:stat['cv_agree']+=1
        else:DIS.append(f"{L}\t{w['simplified']}\t{r['v']}\t{cvm}")
        r['vd']=cvm
    elif cvm:
      try:sv=short_gloss(cvm,CORRECTIONS['entries'].get(id,{}).get('v'))
      except ValueError as error:raise ValueError(f'{id}: {error}') from error
      r['v']=sv
      if sv!=cvm:r['vd']=cvm
      r['vs']='cvdict';stat['vi_cv']+=1
    else: stat['vi_none']+=1
    if r.get('vs')=='cvdict' and w['simplified'] in OVR: r['v']=OVR[w['simplified']];r['vs']='manual';r.pop('vd',None)

    ps=[POS[p] for p in w.get('pos',[]) if p in POS][:2]
    if ps: r['pos']=', '.join(dict.fromkeys(', '.join(ps).split(', ')))
    hs=[hv1(c,tc) for c,tc in zip(w['simplified'],f['traditional'] if len(f['traditional'])==len(w['simplified']) else w['simplified'])]
    if all(h[0] for h in hs): r['hv']=' '.join(h[0] for h in hs);stat['hv_full']+=1
    elif any(h[0] for h in hs): stat['hv_part']+=1
    if 'hv' in r and not all(h[1]=='kai' for h in hs): r['hvq']=1  # contains Unihan-derived reading: show as tham khảo
    if len(w['forms'])>1: r['alt']=[x['transcriptions']['pinyin'] for x in w['forms'][1:3]]
    W.append(r);chars.update(w['simplified']);chars.update(f['traditional'])
  SYM=re.compile('\\s*[\U0001F300-\U0001FAFF\u2600-\u27BF\U0001F000-\U0001F2FF\uFE0F]')
  cl=lambda x:SYM.sub('',x) if isinstance(x,str) else [cl(y) for y in x] if isinstance(x,list) else x
  W=[{k:cl(v) for k,v in r.items()} for r in W]
  built[str(L)]=W
  meta['levels'][L]={'name':names[L],'count':len(W)}
legacy=read_json(ROOT/'data/sources/legacy-index.json')
built=enrich(built,legacy,CORRECTIONS)
validate(built,legacy)
chars.update(c for words in built.values() for word in words for c in word['s']+word['t'])
for level,words in built.items():atomic_json(ROOT/f'data/hsk{level}.json',words)
meta['stats']=stat
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
RADV={r['char']:r['nameVi'] for r in json.load(open('data/sources/kaihanzi-radicals.json',encoding='utf8'))}
for c,x in info.items():
  k=KAI.get(c)
  if k:
    if k.get('sinoViet'):x['hv']=k['sinoViet'].lower()
    if k.get('meaningVi'):x['vi']=k['meaningVi']
    if k.get('mnemonic'):x['mn']=k['mnemonic']
  elif c in UV:x['hv']=UV[c].lower();x['hvq']=1
  if x.get('r') in RADV:x['rv']=RADV[x['r']]
character_update=read_json(ROOT/'data/sources/character-updates-2026-10-26.json')
updated_char=character_update['character']
if updated_char in info:
  info[updated_char].update(vi=character_update['editorial']['vi'],rv=character_update['editorial']['radicalVietnamese'])
json.dump(info,open(f'{out}/chars.json','w',encoding='utf8'),ensure_ascii=False,separators=(',',':'))
os.makedirs(f'{out}/strokes',exist_ok=True);n=0
for c in chars:
  s=f'{hwd}/{c}.json'
  if os.path.exists(s):shutil.copy(s,f'{out}/strokes/{c}.json');n+=1
print(stat);open('docs/FORM_FIX.tsv','w',encoding='utf8').write('\n'.join(FIX));open('docs/VI_DISAGREE.tsv','w',encoding='utf8').write('\n'.join(DIS));print('words',sum(v['count'] for v in meta['levels'].values()),'chars',len(chars),'strokes',n,'info',len(info))
subprocess.run([sys.executable,'tools/enrich-data.py','--write'],check=True)
