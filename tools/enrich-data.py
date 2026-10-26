"""Apply versioned corrections without deriving identity/audio from array order."""
import argparse
import copy
from collections import Counter
import json
from content import ROOT, MODEL, atomic_json, catalog, enrich, read_json, validate


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true', help='Write validated output; default is a dry run')
    args = parser.parse_args()
    legacy = read_json(ROOT / 'data/sources/legacy-index.json')
    fixes = read_json(ROOT / 'data/sources/corrections.json')
    data = enrich(copy.deepcopy(catalog()), legacy, fixes)
    counts = validate(data, legacy)
    meta = read_json(ROOT / 'data/meta.json')
    meta.update({'schema': 3, 'curriculum': 'HSK 2021 and CTI 2025/2026 (optional editions)',
                 'release': '2026-10-26', 'audioModel': MODEL})
    meta['meaningSources'] = dict(Counter(w.get('vs', 'own-hsk1-3') for ws in data.values() for w in ws))
    sources = meta['meaningSources']
    meta['stats'].update({'vi_none': 0, 'vi_editorial': sources.get('editorial-2026-10-26', 0),
                         'vi_cv': sources.get('cvdict', 0), 'vi_own': sources.get('own-hsk1-3', 0),
                         'vi_manual': sources.get('manual', 0)})
    for level, words in data.items():
        if level == '-extra':
            meta['supplementalCards'] = len(words)
        else:
            meta['levels'][level]['count'] = len(words)
    if (ROOT/'data/curricula.json').exists():
        meta['curricula'] = {k:{'title':v['title'],'cards':len(v['members']),
                               'sourceRows':v.get('sourceRows',len(v['members']))}
                            for k,v in read_json(ROOT/'data/curricula.json')['editions'].items()}
    if args.write:
        for level, words in data.items():
            atomic_json(ROOT / f'data/hsk{level}.json', words)
        atomic_json(ROOT / 'data/meta.json', meta)
    print(json.dumps({'written': args.write, **counts}, ensure_ascii=False))


if __name__ == '__main__':
    main()
