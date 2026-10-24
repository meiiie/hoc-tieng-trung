#!/usr/bin/env python3
"""Train the 4-way softmax tone model used by tones.js. Honest evaluation: train on one voice, test on the other (unseen speaker).
Run: node tools/tone-feats.js > /tmp/tf.jsonl && python3 tools/tone-train.py /tmp/tf.jsonl"""
import json,sys,numpy as np,re
R=[json.loads(l) for l in open(sys.argv[1])]
def fit(X,y,l2=1e-2,it=3000,lr=.5):
  mu=X.mean(0);sd=X.std(0)+1e-6;Z=(X-mu)/sd;Z=np.hstack([np.ones((len(Z),1)),Z]);W=np.zeros((4,Z.shape[1]));Y=np.eye(4)[y-1]
  for _ in range(it):
    L=Z@W.T;L-=L.max(1,keepdims=True);P=np.exp(L);P/=P.sum(1,keepdims=True);G=(P-Y).T@Z/len(Z)+l2*np.hstack([np.zeros((4,1)),W[:,1:]]);W-=lr*G
  return mu,sd,W
def pred(m,X):mu,sd,W=m;Z=np.hstack([np.ones((len(X),1)),(X-mu)/sd]);return (Z@W.T).argmax(1)+1
def sub(f):r=[x for x in R if f(x)];return np.array([x['f'] for x in r]),np.array([x['t'] for x in r]),r
out={}
for tr,te in [('f','m'),('m','f')]:
  X,y,_=sub(lambda x:x['v']==tr);Xt,yt,rt=sub(lambda x:x['v']==te);m=fit(X,y);p=pred(m,Xt)
  out[f'train {tr} -> test {te}']={'syllables':len(yt),'acc':round(float((p==yt).mean()),3),'perTone':{int(t):round(float((p[yt==t]==t).mean()),3) for t in range(1,5)},
   'confusion':[[int(((yt==a)&(p==b)).sum()) for b in range(1,5)] for a in range(1,5)]}
X,y,_=sub(lambda x:True);mu,sd,W=fit(X,y)
print(json.dumps(out,indent=1))
model={'mu':[round(float(v),4) for v in mu],'sd':[round(float(v),4) for v in sd],'W':[[round(float(v),4) for v in r] for r in W],'trained':'HSK1-3 reference recordings, zh-CN-XiaoxiaoNeural + zh-CN-YunxiNeural','n':len(y)}
s=open('tones.js').read();s=re.sub(r'const MODEL=.*?;/\*MODEL\*/','const MODEL='+json.dumps(model,separators=(',',':'))+';/*MODEL*/',s,flags=re.S);open('tones.js','w').write(s)
json.dump(out,open('docs/tone-eval.json','w'),indent=1)
