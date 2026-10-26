"""Select a reproducible, level-stratified listening/ASR sample from real mapped assets."""
import argparse
import random
from pathlib import Path
from content import ROOT, audio_path, atomic_json, catalog


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--per-level', type=int, default=20)
    parser.add_argument('--seed', type=int, default=20261027)
    parser.add_argument('--available-only', action='store_true', help='Development sample; excludes missing assets')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.per_level < 1:
        parser.error('per-level must be positive')
    rng, rows = random.Random(args.seed), []
    for level, words in catalog().items():
        if args.available_only:
            words = [w for w in words if all(audio_path(ROOT, w, v).exists() for v in ('f', 'm'))]
        for word in rng.sample(words, min(args.per_level, len(words))):
            for voice in ('f', 'm'):
                path = audio_path(ROOT, word, voice)
                if not path.exists():
                    raise ValueError(f'Missing sampled audio: {path}')
                rows.append({'id':word['id'],'word':word['s'],'numeric':word['n'], 'level':level,
                             'voice':voice,'path':path.relative_to(ROOT).as_posix(), 'seed':args.seed,
                             'partition':'development-available-only' if args.available_only else 'release-sample'})
    atomic_json(args.output, rows)
    print(f'Selected {len(rows)} files')


if __name__ == '__main__':
    main()
