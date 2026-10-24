import sys,json,numpy as np,onnxruntime as ort
sys.path.insert(0,'/tmp/stl/tools/mandarin_grader')
from mandarin_grader.model.syllable_predictor_v4 import _create_mel_filterbank
V=json.load(open('/tmp/stl/apps/mobile_flutter/assets/ml/syllable_vocab.json'))['syllables'];IDX={s:i+2 for i,s in enumerate(V)}
import os
S=ort.InferenceSession(os.environ.get('M','/tmp/stl/apps/mobile_flutter/assets/models/model_v6.onnx'),providers=['CPUExecutionProvider'])
FB=_create_mel_filterbank(16000,400,80);WIN=np.hanning(400)
def mel(a):
  m=np.abs(a).max();a=a/m if m>1e-6 else a
  n=1+(len(a)-400)//160
  if n<1:a=np.pad(a,(0,400-len(a)+160));n=1
  fr=np.stack([a[i*160:i*160+400] for i in range(n)])*WIN;sp=np.abs(np.fft.rfft(fr,axis=1))**2
  return np.log(FB@sp.T+1e-9).astype(np.float32)
def run(a,n):
  M=mel(a);T=min(M.shape[1],1000);M=M[:,:T];P=int(os.environ.get('PADT','1000')) or min(1000,-(-T//int(os.environ.get('RND','128')))*int(os.environ.get('RND','128')));X=np.zeros((n,80,P),np.float32);X[:,:,:T]=M;mask=np.zeros((n,P),bool);mask[:,T:]=True
  sl,tl=S.run(['syllable_logits','tone_logits'],{'mel':X,'position':np.arange(n,dtype=np.int64)[:,None],'audio_mask':mask})
  return sl,tl
def norm_syl(s):
  import unicodedata,re
  s=s.lower().replace('ü','v').replace('u:','v');s=re.sub(r'[1-5]$','',s);return s.replace('v','u') if s not in IDX else s
if __name__=='__main__':
  pass
