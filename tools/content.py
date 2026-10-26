"""Catalog boundaries shared by enrichment, audio generation and release checks."""
from pathlib import Path
import hashlib
import json
import re
import unicodedata
from functools import lru_cache

ROOT = Path(__file__).resolve().parents[1]
MODEL = {
    'repo': 'hexgrad/Kokoro-82M-v1.1-zh',
    'revision': '01e7505bd6a7a2ac4975463114c3a7650a9f7218',
    'sha256': 'b1d8410fa44dfb5c15471fd6c4225ea6b4e9ac7fa03c98e8bea47a9928476e2b',
    'voices': {'f': 'zf_001', 'm': 'zm_011'},
    'speed': 0.9,
    'sampleRate': 24000,
    'phonemes': 'dictionary-pinyin-sandhi-v1',
    'synthesis': 'bounded-carrier-pause-v2',
    'pauseMaxRms': 0.01,
    'edgeFadeSamples': 120,
    'runtime': 'kokoro-0.9.4; torch-2.6.0; transformers-4.51.3',
    'license': 'Apache-2.0',
}
NUMERIC = re.compile(r'[a-zü:]+[1-5](?: [a-zü:]+[1-5])*', re.I)
MARKS = {'a': 'āáǎà', 'e': 'ēéěè', 'i': 'īíǐì', 'o': 'ōóǒò', 'u': 'ūúǔù', 'ü': 'ǖǘǚǜ'}


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def atomic_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n'
    if path.exists() and path.read_text(encoding='utf-8') == raw:
        return
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(raw, encoding='utf-8', newline='\n')
    temp.replace(path)


def sha256(path):
    with Path(path).open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def tone_marks(numeric):
    result = []
    for original in numeric.split():
        syllable = original.lower()
        base, tone = syllable[:-1].replace('u:', 'ü').replace('v', 'ü'), int(syllable[-1])
        if tone != 5:
            match = re.search('a|e|ou', base) or re.search('[iouü](?!.*[iouü])', base)
            if match:
                i = match.start()
                base = base[:i] + MARKS[base[i]][tone - 1] + base[i + 1:]
            elif base in ('m', 'n', 'ng'):
                base = unicodedata.normalize('NFC', base[0] + ('\u0304', '\u0301', '\u030c', '\u0300')[tone - 1] + base[1:])
        result.append(base[0].upper() + base[1:] if original[0].isupper() else base)
    return ' '.join(result)


def short_gloss(definition, approved=None, limit=60):
    if approved:
        return approved
    parts = [p.strip() for p in definition.split('; ') if p.strip()]
    if not parts or len(parts[0]) > limit:
        raise ValueError('A concise, reviewed Vietnamese gloss is required; do not truncate a sense')
    result = parts[0]
    for part in parts[1:]:
        if len(result) + len(part) + 2 > limit:
            break
        result += '; ' + part
    return result


def catalog(root=ROOT):
    data = {str(level): read_json(root / f'data/hsk{level}.json') for level in range(1, 8)}
    extra = root / 'data/hsk-extra.json'
    if extra.exists():
        data['-extra'] = read_json(extra)
    return data


@lru_cache(maxsize=1)
def audio_overrides():
    return read_json(ROOT / 'data/sources/audio-overrides.json')['entries']


def audio_template(word):
    inputs = [word['id'], word['s'], word['n'], MODEL]
    if override := audio_overrides().get(word['id']):
        inputs.append({v:{k:s[k] for k in ('voice', 'carrier')} for v,s in override.items()})
    content = json.dumps(inputs, ensure_ascii=False, sort_keys=True)
    key = hashlib.sha256(content.encode()).hexdigest()[:24]
    return f'generated/kokoro-v1.1-zh-v2/{{voice}}/{key}.mp3'


def audio_path(root, word, voice):
    relative = word.get('a', '')
    if voice not in ('f', 'm') or not re.fullmatch(r'[a-zA-Z0-9/_{}.-]+\.mp3', relative):
        raise ValueError(f"Invalid audio path: {word['id']}")
    if relative.count('{voice}') != 1 or '..' in relative or relative.startswith('/'):
        raise ValueError(f"Unsafe audio path: {word['id']}")
    return root / 'audio' / relative.replace('{voice}', voice)


def enrich(data, legacy, corrections):
    locations = {wid: (level, i) for level, ids in legacy['levels'].items() for i, wid in enumerate(ids)}
    ids = [w['id'] for ws in data.values() for w in ws]
    if len(set(ids)) != len(ids):
        raise ValueError('Duplicate word IDs')
    if missing := (set(locations) | set(legacy.get('supplementalIds', []))) - set(ids):
        raise ValueError(f'Legacy progress IDs removed: {sorted(missing)[:3]}')
    if unknown := set(corrections['entries']) - set(ids):
        raise ValueError(f'Correction references unknown IDs: {sorted(unknown)}')
    if unknown := set(audio_overrides()) - set(ids):
        raise ValueError(f'Audio override references unknown IDs: {sorted(unknown)}')
    model_files = read_json(ROOT / 'data/sources/audio-model-files.json')['files']
    for wid, entry in audio_overrides().items():
        if not entry or set(entry) - {'f', 'm'}:
            raise ValueError(f'Invalid audio override voices: {wid}')
        for settings in entry.values():
            if settings.get('carrier') not in ('read', 'listen') or f"voices/{settings.get('voice')}.pt" not in model_files:
                raise ValueError(f'Unpinned audio override: {wid}')
    for ws in data.values():
        for word in ws:
            fix = corrections['entries'].get(word['id'], {})
            for field in ('n', 't', 'v', 'vd', 'pos', 'm'):
                if field in fix:
                    word[field] = fix[field]
            word['p'] = tone_marks(word['n'])
            if 'v' in fix:
                word['vs'] = 'editorial-2026-10-26'
                if 'vd' not in fix:
                    word.pop('vd', None)
            old = locations.get(word['id'])
            if old and int(old[0]) <= 3 and 'n' not in fix and word['id'] not in audio_overrides():
                word['a'] = f'hsk{old[0]}/{{voice}}/w/{old[1]:04d}.mp3'
            else:
                word['a'] = audio_template(word)
    return data


def validate(data, legacy, require_audio=False, root=ROOT):
    seen, assets = set(), set()
    counts = {'words': 0, 'vietnamese': 0, 'audioFiles': 0, 'audioBytes': 0}
    for level, ws in data.items():
        if not ws:
            raise ValueError(f'Empty level {level}')
        for word in ws:
            wid = word.get('id')
            if not isinstance(wid, str) or not wid.strip() or re.search(r'[<>"\x00-\x1f]', wid) or wid in seen:
                raise ValueError(f'Missing or duplicate ID: {wid}')
            seen.add(wid)
            for field in ('s', 't', 'p', 'n', 'v', 'a'):
                if not isinstance(word.get(field), str) or not word[field].strip():
                    raise ValueError(f'{wid}: missing {field}')
            if not NUMERIC.fullmatch(word['n']) or len(word['p'].split()) != len(word['n'].split()):
                raise ValueError(f'{wid}: invalid or unaligned pinyin')
            if word['p'] != tone_marks(word['n']):
                raise ValueError(f'{wid}: tone-marked pinyin differs from numbered reading')
            if len(word['v']) > 60 or re.search(r'[|\t\n]|LT:|\[[a-z]+\d', word['v']):
                raise ValueError(f'{wid}: malformed Vietnamese gloss')
            if word['v'].count('(') != word['v'].count(')') or re.match(r'^(?:biến thể[^;]* của|viết tắt của|xem)\s+[\u3400-\u9fff]', word['v']):
                raise ValueError(f'{wid}: incomplete or cross-reference-only Vietnamese gloss')
            counts['words'] += 1
            counts['vietnamese'] += 1
            for voice in ('f', 'm'):
                path = audio_path(root, word, voice)
                if path in assets:
                    raise ValueError(f'Audio assigned to more than one word: {path}')
                assets.add(path)
                if path.exists():
                    counts['audioFiles'] += 1
                    counts['audioBytes'] += path.stat().st_size
                    if path.stat().st_size < 512:
                        raise ValueError(f'Empty/truncated audio: {path}')
                elif require_audio:
                    raise ValueError(f'Missing audio: {path}')
    old_ids = {wid for ids in legacy['levels'].values() for wid in ids} | set(legacy.get('supplementalIds', []))
    if old_ids - seen:
        raise ValueError('Legacy progress IDs removed')
    return counts
