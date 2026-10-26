"""Build/check the content release manifest. A release requires both voices for every word."""
import argparse
import json
import math
import runpy
from pathlib import Path
from content import ROOT, MODEL, atomic_json, audio_overrides, audio_path, audio_template, catalog, enrich, read_json, sha256, validate


def verify_characters(data):
    chars = read_json(ROOT / 'data/chars.json')
    used = sorted({c for ws in data.values() for w in ws for c in w['s']+w['t']})
    extension = read_json(ROOT / 'data/sources/character-extensions-2026-10-26.json')
    if not set(extension['entries']) <= set(used):
        raise ValueError('Orphan character extension')
    for c in used:
        if c not in chars:
            raise ValueError(f'Missing character metadata: {c}')
        path = ROOT / f'data/strokes/{c}.json'
        strokes = read_json(path)
        paths, medians = strokes.get('strokes', []), strokes.get('medians', [])
        if not paths or len(paths) != len(medians) or not all(isinstance(p, str) and p.startswith('M') for p in paths):
            raise ValueError(f'Invalid stroke paths: {c}')
        for median in medians:
            if len(median) < 2 or not all(len(point) == 2 and all(isinstance(x, (int, float)) and math.isfinite(x) for x in point) for point in median):
                raise ValueError(f'Invalid stroke median: {c}')
        if c in extension['entries']:
            record = extension['entries'][c]
            entry = record['dictionaryEntry']
            if (entry['character'], entry['decomposition'], entry['radical']) != (c, chars[c]['c'], chars[c]['r']):
                raise ValueError(f'Character dictionary provenance differs: {c}')
            if sha256(path) != record['strokeSha256'] or len(paths) != record['strokeCount']:
                raise ValueError(f'Character stroke provenance differs: {c}')
    return [f'data/strokes/{c}.json' for c in used]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true', help='Record a new complete release after audio generation')
    parser.add_argument('--decode', action='store_true', help='Decode every MP3; requires numpy and soundfile')
    args = parser.parse_args()
    data = catalog()
    extra, curricula = runpy.run_path(str(ROOT / 'tools/build-curricula.py'))['build']()
    if extra != data['-extra'] or curricula != read_json(ROOT / 'data/curricula.json'):
        raise ValueError('Curriculum outputs differ from tracked source inputs')
    legacy = read_json(ROOT / 'data/sources/legacy-index.json')
    fixes = read_json(ROOT / 'data/sources/corrections.json')
    counts = validate(data, legacy, require_audio=True)
    stroke_files = verify_characters(data)
    counts['charactersWithStrokes'] = len(stroke_files)
    expected_data = enrich(json.loads(json.dumps(data)), legacy, fixes)
    if data != expected_data:
        raise ValueError('Shipped catalog differs from corrections or stable audio mapping; run enrich-data.py')
    character_update = read_json(ROOT / 'data/sources/character-updates-2026-10-26.json')
    character = character_update['character']
    if sha256(ROOT / f'data/strokes/{character}.json') != character_update['strokes']['sha256']:
        raise ValueError('Updated traditional character stroke provenance differs')
    info = read_json(ROOT / 'data/chars.json')[character]
    if info['c'] != character_update['dictionary']['entry']['decomposition'] or info['vi'] != character_update['editorial']['vi']:
        raise ValueError('Updated traditional character metadata differs')
    asset_file = ROOT / 'data/sources/audio-assets.jsonl'
    records = {}
    if asset_file.exists():
        for row in map(json.loads, asset_file.read_text(encoding='utf-8').splitlines()):
            if row['path'] in records:
                raise ValueError(f'Duplicate asset record: {row["path"]}')
            records[row['path']] = row
    if args.write:
        for journal in sorted((ROOT / '.cache').glob('audio-receipts-*.jsonl'), key=lambda p:p.stat().st_mtime_ns):
            records.update({r['path']: r for r in map(json.loads, journal.read_text(encoding='utf-8').splitlines())})
    rows = []
    for ws in data.values():
        for word in ws:
            for voice in ('f', 'm'):
                path = audio_path(ROOT, word, voice)
                relative = path.relative_to(ROOT).as_posix()
                digest = sha256(path)
                row = records.get(relative)
                if row:
                    if (row['id'], row['voice'], row['sha256']) != (word['id'], voice, digest):
                        raise ValueError(f'Audio identity/checksum mismatch: {relative}')
                elif args.write and not word['a'].startswith('generated/'):
                    row = {'id':word['id'],'voice':voice,'path':relative,'sha256':digest,
                           'bytes':path.stat().st_size,'source':'legacy-microsoft-neural',
                           'validation':'legacy; not human-listened in this release'}
                else:
                    raise ValueError(f'Missing audio provenance: {relative}')
                if word['a'].startswith('generated/') and word['a'] != audio_template(word):
                    raise ValueError(f'Stale generated pronunciation: {word["id"]}')
                if word['a'].startswith('generated/'):
                    settings = audio_overrides().get(word['id'], {}).get(voice, {})
                    expected_voice = settings.get('voice', MODEL['voices'][voice])
                    expected_carrier = settings.get('carrier', 'read')
                    row = {'modelVoice':MODEL['voices'][voice], 'carrier':'read', **row}
                    if row['modelVoice'] != expected_voice or row['carrier'] != expected_carrier:
                        raise ValueError(f'Audio generation settings mismatch: {relative}')
                if row['bytes'] != path.stat().st_size:
                    raise ValueError(f'Audio byte count mismatch: {relative}')
                if args.decode:
                    import soundfile as sf
                    import numpy as np
                    audio, rate = sf.read(str(path), dtype='float32')
                    seconds = len(audio) / rate
                    if audio.ndim != 1 or not np.isfinite(audio).all() or not 0.15 <= seconds <= 12:
                        raise ValueError(f'Invalid decoded audio: {relative}')
                    if np.max(np.abs(audio)) < 0.01 or np.mean(audio**2) < 0.000004:
                        raise ValueError(f'Silent audio: {relative}')
                    row = {**row, 'decodedSeconds':round(seconds, 4), 'sampleRate':rate}
                rows.append(row)
    if not args.write and set(records) != {r['path'] for r in rows}:
        raise ValueError('Audio manifest contains unexpected assets')
    protected = [*[f'data/hsk{l}.json' for l in range(1,8)], 'data/hsk-extra.json','data/curricula.json',
                 'data/sources/cti-syllabus-2025.json','data/sources/cti-joins-2026-10-26.json',
                 'data/sources/cti-lexical-2026-10-26.json','data/sources/cti-vietnamese-2026-10-26.tsv',
                 'data/sources/cti-editorial.json','tools/build-curricula.py','tools/prepare-curricula.py','tools/curriculum_readings.py',
                 'data/meta.json', 'data/chars.json',
                 *stroke_files,'data/sources/character-updates-2026-10-26.json',
                 'data/sources/character-extensions-2026-10-26.json','tools/extend-characters.py',
                 'data/sources/kaihanzi-characters.json','data/sources/kaihanzi-radicals.json',
                 'data/SOURCES.md','data/sources/legacy-index.json','data/sources/corrections.json','data/sources/audio-overrides.json',
                 'data/sources/cedict-reference-2026-10-26.json','data/sources/audio-model-files.json',
                 'data/sources/audio-assets.jsonl', 'tools/content.py', 'tools/enrich-data.py',
                 'tools/audio_phonemes.py', 'tools/audio_synthesis.py', 'tools/generate-audio.py',
                 'tools/tts-requirements.txt','tools/build-data.py']
    release_path = ROOT / 'data/content-release.json'
    if args.write:
        temp = asset_file.with_suffix('.jsonl.tmp')
        temp.write_text(''.join(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n' for r in rows), encoding='utf-8', newline='\n')
        temp.replace(asset_file)
        atomic_json(release_path, {'schema':2,'release':'2026-10-26','curriculum':'HSK 2021 and CTI 2025/2026 (optional editions)',
                                  'counts':counts,'generatedAudioFiles':sum(r['source']=='kokoro-v1.1-zh' for r in rows),
                                  'model':MODEL,'files':{f:sha256(ROOT/f) for f in protected},
                                  'quality':'Complete fields and assets; not a bilingual-teacher or native-listener certification.'})
    release = read_json(release_path)
    if release['counts'] != counts:
        raise ValueError('Release coverage drift')
    for name, expected in release['files'].items():
        if sha256(ROOT / name) != expected:
            raise ValueError(f'Release checksum mismatch: {name}')
    if set(release['files']) != set(protected):
        raise ValueError('Release manifest file set mismatch')
    print(json.dumps({**counts,'verifiedAssetHashes':len(rows),'decoded':args.decode,'written':args.write}))


if __name__ == '__main__':
    main()
