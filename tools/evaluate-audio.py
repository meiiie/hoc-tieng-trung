"""Independent Mandarin ASR diagnostic; agreement is not a pronunciation certificate."""
import argparse
import json
import re
import time
from pathlib import Path
from content import ROOT, atomic_json, sha256


def main():
    import sherpa_onnx
    import soundfile as sf
    from pypinyin import lazy_pinyin, Style
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('inputs', type=Path, help='JSON array with word, numeric and path fields')
    parser.add_argument('--model-dir', type=Path, default=ROOT / '.cache/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    model = args.model_dir / 'model.int8.onnx'
    tokens = args.model_dir / 'tokens.txt'
    recognizer = sherpa_onnx.OfflineRecognizer.from_sense_voice(
        model=str(model), tokens=str(tokens), num_threads=2, language='zh', use_itn=False)
    rows = json.loads(args.inputs.read_text(encoding='utf-8'))
    start = time.perf_counter()
    for i, row in enumerate(rows):
        path = ROOT / row['path']
        audio, rate = sf.read(str(path), dtype='float32')
        stream = recognizer.create_stream()
        stream.accept_waveform(rate, audio)
        recognizer.decode_stream(stream)
        heard = re.sub(r'[^\u3400-\u9fff]', '', stream.result.text)
        expected = row.get('numeric') or ' '.join(lazy_pinyin(row['word'], style=Style.TONE3, neutral_tone_with_five=True))
        normalize = lambda s: re.sub('[1-5]', '', s.lower().replace('u:', 'v').replace('ü', 'v')).split()
        target = [x for x in normalize(expected) if x != 'r']
        observed = normalize(' '.join(lazy_pinyin(heard, style=Style.TONE3, neutral_tone_with_five=True)))
        # ASR often writes or omits 儿. This is an orthographic tolerance, not an erhua score.
        if expected.endswith('r5') and observed and observed[-1] == 'er':
            observed.pop()
        row.update({'heardSenseVoice': heard, 'targetSyllables': target, 'heardSyllables': observed,
                    'syllablesAgreeIgnoringTone': target == observed, 'audioSha256': sha256(path)})
        if (i + 1) % 25 == 0:
            print(json.dumps({'checked': i + 1, 'total': len(rows), 'seconds': round(time.perf_counter()-start, 1)}), flush=True)
    result = {'engine': 'SenseVoiceSmall INT8 via sherpa-onnx', 'engineVersion': sherpa_onnx.__version__,
              'modelSha256': sha256(model), 'tokensSha256': sha256(tokens),
              'settings': {'language':'zh','use_itn':False,'num_threads':2,'expectedTextPrompt':False},
              'limitations': 'ASR transcription and dictionary pinyin are fallible; tone and native quality are not certified.',
              'total': len(rows), 'syllablesAgreeIgnoringTone': sum(r['syllablesAgreeIgnoringTone'] for r in rows),
              'rows': rows}
    atomic_json(args.output, result)
    print(json.dumps({k:v for k,v in result.items() if k != 'rows'}, ensure_ascii=False))


if __name__ == '__main__':
    main()
