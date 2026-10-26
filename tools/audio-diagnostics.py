"""A scorer disagreement audit, not a native-speaker certification of TTS quality."""
import argparse
from pathlib import Path
import random
import re
import json
import numpy as np
import onnxruntime as ort
import soundfile as sf
from scipy.signal import resample_poly
from content import ROOT, catalog, audio_path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--count', type=int, default=70)
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/audits/audio-scorer-diagnostics.json')
    args = parser.parse_args()
    vocab = json.loads((ROOT / 'models/stl-v6-vocab.json').read_text())['syllables']
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    session = ort.InferenceSession(str(ROOT / 'models/stl-v6-int8.onnx'), options, providers=['CPUExecutionProvider'])
    bins = np.floor(401 * (700 * (10 ** (np.linspace(0, 2595*np.log10(1+8000/700), 82)/2595)-1)) / 16000).astype(int)
    fb = np.zeros((80, 201))
    for i in range(80):
        l, c, r = bins[i:i+3]
        if c > l:
            fb[i, l:c] = (np.arange(l, c)-l)/(c-l)
        if r > c:
            fb[i, c:r] = (r-np.arange(c, r))/(r-c)
    rng = random.Random(20261026)
    selected = []
    for level, ws in catalog().items():
        candidates = [(level, w, v) for w in ws if 'r5' not in w['n'].split()
                      for v in ('f', 'm') if audio_path(ROOT, w, v).exists()]
        rng.shuffle(candidates)
        selected.extend(candidates[:max(1, args.count // 7)])
    rows = []
    for level, word, voice in selected:
        signal, rate = sf.read(str(audio_path(ROOT, word, voice)), dtype='float32')
        signal = resample_poly(signal, 16000, rate)
        signal /= max(float(np.max(np.abs(signal))), 1e-6)
        n = min(1000, 1 + (len(signal)-400)//160)
        frames = np.stack([signal[i*160:i*160+400] for i in range(n)]) * np.hanning(400)
        mel = np.zeros((1, 80, 1000), np.float32)
        mel[0, :, :n] = np.log(fb @ (np.abs(np.fft.rfft(frames, axis=1))**2).T + 1e-9)
        mask = np.zeros((1, 1000), bool)
        mask[:, n:] = True
        expected = [re.sub('[1-5]$', '', s.lower()).replace('u:', 'u').replace('ü', 'u').replace('v', 'u') for s in word['n'].split()]
        got = []
        for i in range(len(expected)):
            out = session.run(['syllable_logits'], {'mel': mel, 'audio_mask': mask, 'position': np.array([[i]], dtype=np.int64)})[0]
            index = int(out[0].argmax())
            got.append(vocab[index-2] if index >= 2 else '')
        rows.append({'level':level,'id':word['id'],'voice':voice,'expected':expected,'heard':got,
                     'matched':sum(a==b for a,b in zip(expected,got))})
    report = {'scope': 'Diagnostic top-1 syllable agreement with the app scorer. Scorer errors, merged u/ü and segmentation errors are possible. Erhua excluded. This is not a TTS quality pass/fail gate.',
              'seed':20261026,'files':len(rows),'syllables':sum(len(r['expected']) for r in rows),
              'matched':sum(r['matched'] for r in rows),'rows':rows}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='rows'}))


if __name__ == '__main__':
    main()
