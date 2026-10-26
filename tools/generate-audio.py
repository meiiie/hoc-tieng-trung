"""Generate missing versioned word audio. Resume by verified file hash, never by filename alone."""
import argparse
import json
import os
from pathlib import Path
import time
from datetime import datetime, timezone

from content import ROOT, MODEL, audio_overrides, audio_path, audio_template, catalog, read_json, sha256


def read_receipts(path):
    records = {}
    if path.exists():
        lines = path.read_text(encoding='utf-8').splitlines()
        for i, line in enumerate(lines):
            try:
                row = json.loads(line)
                records[row['path']] = row
            except json.JSONDecodeError:
                if i != len(lines) - 1:
                    raise
    return records


def load_receipts(root):
    records = read_receipts(root / 'data/sources/audio-assets.jsonl')
    for journal in sorted((root / '.cache').glob('audio-receipts-*.jsonl'), key=lambda p:p.stat().st_mtime_ns):
        records.update(read_receipts(journal))
    return records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model-dir', type=Path, default=ROOT / '.cache/kokoro-v1.1-zh')
    parser.add_argument('--device', choices=['cpu', 'cuda'], default='cpu')
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--threads', type=int, default=2)
    parser.add_argument('--voice', choices=['f', 'm', 'both'], default='both')
    parser.add_argument('--shard', type=int, default=0)
    parser.add_argument('--shards', type=int, default=1)
    parser.add_argument('--words', type=Path, help='Staged word records; assets must use the same content-addressed mapping as the final catalog')
    args = parser.parse_args()
    if args.shards < 1 or not 0 <= args.shard < args.shards:
        parser.error('shard must be in [0, shards)')
    for name, expected in read_json(ROOT / 'data/sources/audio-model-files.json')['files'].items():
        if sha256(args.model_dir / name) != expected:
            raise ValueError(f'Model checksum mismatch: {name}')
    os.environ['HF_HUB_OFFLINE'] = '1'
    import numpy as np
    import soundfile as sf
    import torch
    from kokoro import KModel
    from audio_synthesis import synthesize

    torch.set_num_threads(args.threads)
    torch.manual_seed(20261026)
    model = KModel(repo_id=MODEL['repo'], config=str(args.model_dir / 'config.json'),
                   model=str(args.model_dir / 'kokoro-v1_1-zh.pth')).to(args.device).eval()
    overrides = audio_overrides()
    voice_names = set(MODEL['voices'].values()) | {v['voice'] for entry in overrides.values() for v in entry.values()}
    voices = {name: torch.load(args.model_dir / f'voices/{name}.pt', weights_only=True) for name in voice_names}
    inventory = read_json(args.words) if args.words else [w for ws in catalog().values() for w in ws]
    if args.words:
        if len({w['id'] for w in inventory}) != len(inventory):
            raise ValueError('Duplicate staged word IDs')
        for w in inventory:
            if w['a'] != audio_template(w):
                raise ValueError('Staged audio address differs from canonical mapping')
    jobs = [(w, v) for w in inventory if w['a'].startswith('generated/')
            for v in ('f', 'm') if args.voice in ('both', v)]
    jobs = jobs[args.shard::args.shards]
    receipt_path = ROOT / f'.cache/audio-receipts-{args.shard}.jsonl'
    receipts = load_receipts(ROOT)
    receipt_path.parent.mkdir(exist_ok=True)
    # Rewriting the journal removes a trailing partial line left by an interrupted append.
    own_receipts = read_receipts(receipt_path)
    receipt_path.write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in own_receipts.values()), encoding='utf-8')
    completed = skipped = 0
    failures = []
    start = time.perf_counter()
    with receipt_path.open('a', encoding='utf-8') as journal, torch.inference_mode():
        for word, voice in jobs:
            target = audio_path(ROOT, word, voice)
            relative = target.relative_to(ROOT).as_posix()
            previous = receipts.get(relative)
            if previous and target.exists() and sha256(target) == previous['sha256']:
                skipped += 1
                continue
            try:
                settings = overrides.get(word['id'], {}).get(voice, {})
                voice_name = settings.get('voice', MODEL['voices'][voice])
                signal, pronunciation = synthesize(model, voices[voice_name], word, MODEL['speed'], relative,
                                                   carrier=settings.get('carrier', 'read'))
            except ValueError as error:
                failures.append({'id': word['id'], 'voice': voice, 'error': str(error)})
                print(json.dumps(failures[-1], ensure_ascii=False), flush=True)
                continue
            if not np.isfinite(signal).all():
                raise ValueError(f'Non-finite audio: {relative}')
            peak = float(np.max(np.abs(signal)))
            rms = float(np.sqrt(np.mean(signal ** 2)))
            duration = len(signal) / MODEL['sampleRate']
            if not (0.15 <= duration <= 12 and 0.01 <= peak <= 1 and rms >= 0.002):
                raise ValueError(f'Invalid audio: {relative}: {duration=}, {peak=}, {rms=}')
            target.parent.mkdir(parents=True, exist_ok=True)
            temp = target.with_suffix('.tmp')
            sf.write(str(temp), signal, MODEL['sampleRate'], format='MP3', subtype='MPEG_LAYER_III',
                     bitrate_mode='CONSTANT', compression_level=0.5)
            decoded, rate = sf.read(str(temp), dtype='float32')
            if rate != MODEL['sampleRate'] or len(decoded) != len(signal) or not np.isfinite(decoded).all():
                raise ValueError(f'Invalid encoded audio: {relative}')
            temp.replace(target)
            row = {'id': word['id'], 'voice': voice, 'path': relative, 'sha256': sha256(target),
                   'bytes': target.stat().st_size, 'seconds': round(duration, 4),
                   'generatedAt': datetime.now(timezone.utc).isoformat(),
                   'peak': round(peak, 5), 'rms': round(rms, 5), 'modelVoice': voice_name, **pronunciation,
                   'source': 'kokoro-v1.1-zh', 'validation': 'signal-and-decode; not human-listened'}
            journal.write(json.dumps(row, ensure_ascii=False) + '\n')
            journal.flush()
            completed += 1
            if completed % 100 == 0 or completed == 1:
                print(json.dumps({'generated': completed, 'reused': skipped, 'total': len(jobs),
                                  'elapsedSeconds': round(time.perf_counter() - start, 1)}), flush=True)
            if args.limit and completed >= args.limit:
                break
    print(json.dumps({'generated': completed, 'reused': skipped, 'total': len(jobs),
                      'failed': len(failures), 'elapsedSeconds': round(time.perf_counter() - start, 1)}), flush=True)
    from content import atomic_json
    atomic_json(ROOT / f'.cache/audio-failures-{args.shard}.json', failures)
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
