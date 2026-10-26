"""Export a reviewable catalog without inventing human approval or changing learning data."""
import argparse
import csv
from pathlib import Path
from content import ROOT, catalog, read_json


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/audits/content-review-2026-10-26.tsv')
    args = parser.parse_args()
    fixes = read_json(ROOT / 'data/sources/corrections.json')['entries']
    curricula = read_json(ROOT / 'data/curricula.json')['editions']
    fields = ['id', 'level', 'hsk2021', 'hsk2025', 'official_rows', 'simplified', 'numeric', 'vietnamese', 'detail', 'meaning_source',
              'changed_fields', 'reference_headwords', 'meaning_review', 'audio_review',
              'reviewer', 'reviewed_at', 'audio_f', 'audio_m']
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('w', encoding='utf-8', newline='') as out:
        writer = csv.DictWriter(out, fieldnames=fields, delimiter='\t', lineterminator='\n')
        writer.writeheader()
        for level, words in catalog().items():
            for w in words:
                fix = fixes.get(w['id'], {})
                writer.writerow({'id':w['id'],'level':level,'simplified':w['s'],'numeric':w['n'],
                    'hsk2021':curricula['hsk2021']['members'].get(w['id'],''),
                    'hsk2025':curricula['hsk2025']['members'].get(w['id'],''),
                    'official_rows':','.join(map(str,curricula['hsk2025']['references'].get(w['id'],[]))),
                    'vietnamese':w['v'],'detail':w.get('vd',''),'meaning_source':w.get('vs','own-hsk1-3'),
                    'changed_fields':','.join(k for k in ('n','t','v','vd','pos') if k in fix),
                    'reference_headwords':'; '.join(fix.get('basis',[])),
                    'meaning_review':'pending independent review','audio_review':'pending native listening',
                    'audio_f':'audio/'+w['a'].replace('{voice}','f'),'audio_m':'audio/'+w['a'].replace('{voice}','m')})
    print(f'Exported {sum(len(ws) for ws in catalog().values())} review rows')


if __name__ == '__main__':
    main()
