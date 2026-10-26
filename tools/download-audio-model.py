"""Fetch only the pinned, checksummed model files used by this content release."""
import argparse
import shutil
from pathlib import Path
from content import ROOT, read_json, sha256


def main():
    from huggingface_hub import hf_hub_download
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / '.cache/kokoro-v1.1-zh')
    args = parser.parse_args()
    manifest = read_json(ROOT / 'data/sources/audio-model-files.json')
    for name, expected in manifest['files'].items():
        target = args.output / name
        if target.exists() and sha256(target) == expected:
            continue
        downloaded = Path(hf_hub_download(manifest['repo'], name, revision=manifest['revision'],
                                         cache_dir=ROOT / '.cache/huggingface'))
        if sha256(downloaded) != expected:
            raise ValueError(f'Model checksum mismatch: {name}')
        target.parent.mkdir(parents=True, exist_ok=True)
        temp = target.with_suffix('.tmp')
        shutil.copyfile(downloaded, temp)
        temp.replace(target)
    print('All pinned model files verified')


if __name__ == '__main__':
    main()
