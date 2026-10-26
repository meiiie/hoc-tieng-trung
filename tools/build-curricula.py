"""Build optional curriculum membership and lexical additions from tracked sources.

Default is a dry run. No download, translation service or progress migration occurs.
The preparation script is only needed when auditing a new source edition.
"""
import argparse
import csv
from collections import Counter, defaultdict
from content import ROOT, atomic_json, audio_template, read_json, tone_marks, validate
from curriculum_readings import PDF_SHA, norm, sandhi

POS = {'名':'danh từ','动':'động từ','形':'tính từ','副':'phó từ','数':'số từ',
       '量':'lượng từ','代':'đại từ','介':'giới từ','连':'liên từ','助':'trợ từ',
       '叹':'thán từ','拟声':'từ tượng thanh','前缀':'tiền tố','后缀':'hậu tố'}


def build():
    legacy_data = {str(l):read_json(ROOT/f'data/hsk{l}.json') for l in range(1,8)}
    legacy_ids = {w['id'] for ws in legacy_data.values() for w in ws}
    source = read_json(ROOT/'data/sources/cti-syllabus-2025.json')
    lexical = read_json(ROOT/'data/sources/cti-lexical-2026-10-26.json')
    joins = read_json(ROOT/'data/sources/cti-joins-2026-10-26.json')
    editorial = read_json(ROOT/'data/sources/cti-editorial.json')['rows']
    with (ROOT/'data/sources/cti-vietnamese-2026-10-26.tsv').open(encoding='utf8',newline='') as f:
        rows = list(csv.DictReader(f, delimiter='\t'))
    glosses = {int(r['row']):r['v'] for r in rows}
    if len(glosses) != len(rows):
        raise ValueError('Duplicate editorial row keys')
    if [r['number'] for r in source['rows']] != list(range(1,11001)):
        raise ValueError('Incomplete official source')
    if [r['row'] for r in joins['rows']] != list(range(1,11001)):
        raise ValueError('Incomplete reading-aware joins')
    if source['sha256'] != joins['sourcePdfSha256'] or source['sha256'] != PDF_SHA:
        raise ValueError('Source edition drift')
    if not set(editorial) <= {str(r['number']) for r in source['rows']}:
        raise ValueError('Editorial correction references an unknown source row')
    extra = []
    characters = read_json(ROOT/'data/chars.json')
    for item in lexical['entries']:
        row = min(item['rows'])
        if row not in glosses:
            raise ValueError(f'Missing authored Vietnamese gloss: {row}')
        w = {k:item[k] for k in ('id','s','t','n')}
        w.update({'p':tone_marks(w['n']),'v':glosses[row],
                  'vs':'cti-editorial-2026-10-26','pos':item['pos'],
                  'a':audio_template(w)})
        for field in ('vd','hv','hvq'):
            if field in item:
                w[field] = item[field]
        readings=[characters.get(c,{}).get('hv','').split(',')[0].strip().lower() for c in w['s']]
        if all(readings):
            w['hv']=' '.join(readings)
            w['hvq']=1
        extra.append(w)
    ids = legacy_ids | {w['id'] for w in extra}
    if len(ids) != len(legacy_ids)+len(extra):
        raise ValueError('New word ID collides with historical progress')
    counts, members, references = Counter(), {}, defaultdict(list)
    by_id = {w['id']:w for ws in [*legacy_data.values(),extra] for w in ws}
    official = {r['number']:r for r in source['rows']}
    for row in joins['rows']:
        src = official[row['row']]
        level = int(src['level'][0])
        counts[level] += 1
        if not row['cards'] or len({c['id'] for c in row['cards']}) != len(row['cards']):
            raise ValueError(f'Missing or duplicate reading mapping: {row["row"]}')
        correction = editorial.get(str(row['row']))
        reading = tone_marks(correction['n']) if correction else src['pinyin']
        if sorted(norm(r) for r in reading.split('/')) != sorted(norm(tone_marks(c['n'])) for c in row['cards']):
            raise ValueError(f'Source pronunciation coverage drift: {row["row"]}')
        for c in row['cards']:
            wid = c['id']
            if wid not in ids or by_id[wid]['s'] != src['word'].rstrip('0123456789'):
                raise ValueError(f'Invalid word mapping: {row["row"]}')
            if by_id[wid]['n'] != c['cardReading']:
                raise ValueError(f'Reading drift for {wid}; re-audit joins before publishing')
            actual = by_id[wid]['n']
            allowed = {norm(tone_marks(actual)), norm(tone_marks(sandhi(actual, by_id[wid]['s'])))}
            if norm(tone_marks(c['n'])) not in allowed:
                raise ValueError(f'Incompatible polyphonic card: {row["row"]} {wid}')
            members[wid] = min(members.get(wid, 9), level)
            references[wid].append(row['row'])
    if dict(counts) != {1:300,2:200,3:500,4:1000,5:1600,6:1800,7:5600}:
        raise ValueError('Official band counts drift')
    if not {w['id'] for w in extra} <= set(members):
        raise ValueError('Orphan supplemental word')
    curricula = {'schema':1,'default':'hsk2021','editions':{
        'hsk2021':{'title':'Danh sách HSK 2021','description':'Danh sách từ của tiêu chuẩn 2021; giữ nguyên mã tiến độ lịch sử.',
                   'source':'https://github.com/drkameleon/complete-hsk-vocabulary',
                   'members':{w['id']:int(l) for l,ws in legacy_data.items() for w in ws}},
        'hsk2025':{'title':'Đề cương HSK 2025/2026','description':'Đề cương công bố 11/2025; 11.000 mục, có từ trùng và cách đọc khác nhau.',
                   'source':source['source'],'sourceRows':11000,'sourcePdfSha256':source['sha256'],
                   'members':members,'references':dict(references)}},
        'quality':'All source rows mapped. Curriculum membership is not a prescribed learning sequence or proof of proficiency.'}
    validate({**legacy_data,'-extra':extra},read_json(ROOT/'data/sources/legacy-index.json'))
    return extra, curricula


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write',action='store_true')
    parser.add_argument('--check',action='store_true',help='Require exact reproducibility of shipped files')
    args=parser.parse_args()
    extra, curricula=build()
    if args.check and (extra != read_json(ROOT/'data/hsk-extra.json') or curricula != read_json(ROOT/'data/curricula.json')):
        raise ValueError('Shipped curricula differ from tracked editorial inputs')
    if args.write:
        atomic_json(ROOT/'data/hsk-extra.json',extra)
        atomic_json(ROOT/'data/curricula.json',curricula)
    print({'written':args.write,'extraCards':len(extra),
           'editions':{k:len(v['members']) for k,v in curricula['editions'].items()},'officialRows':11000})


if __name__=='__main__':
    main()
