"""Extract the pinned CTI table and prepare reading-aware editorial candidates.

This never publishes vocabulary. Run with the TTS venv (pypinyin) and PyMuPDF.
"""
import argparse
from collections import Counter, defaultdict
from functools import lru_cache
import json
import re
from pathlib import Path
import pymupdf
from pypinyin import pinyin, Style
from content import ROOT, atomic_json, catalog, sha256, tone_marks

from curriculum_readings import PDF_SHA, norm, sandhi
CEDICT_SHA = '3d8967fe566bc23a74f8ba008d38ac83269a8c7550bd7dc48218fc9bdf284885'
SOURCE = 'https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf'


def extract(pdf):
    if sha256(pdf) != PDF_SHA:
        raise ValueError('Unreviewed syllabus edition')
    rows = []
    with pymupdf.open(pdf) as document:
        for page in range(79, 354):
            text = document[page].get_text()
            matches = list(re.finditer(r'(?m)^(\d+)\n([1-6](?:（[^）]+）)*|7-9)\n([^\n]+)\n([^\n]+)\n', text))
            for index, match in enumerate(matches):
                number, level, word, reading = match.groups()
                tail = text[match.end():matches[index+1].start() if index+1 < len(matches) else len(text)]
                pos = tail.split('\n')[0]
                if not re.fullmatch(r'[名动形副数量代介连助叹拟声词缀前后、（）]+', pos):
                    pos = ''
                rows.append({'number':int(number), 'level':level, 'word':word, 'pinyin':reading,
                             'pos':pos, 'pdfPage':page+1})
    if [r['number'] for r in rows] != list(range(1, 11001)):
        raise ValueError('Missing/duplicate official rows')
    counts = Counter(re.match(r'\d+', r['level'])[0] for r in rows)
    if dict(counts) != {'1':300, '2':200, '3':500, '4':1000, '5':1600, '6':1800, '7':5600}:
        raise ValueError(f'Unexpected official counts {counts}')
    return rows


def cedict(path):
    if sha256(path) != CEDICT_SHA:
        raise ValueError('Unpinned CC-CEDICT snapshot')
    entries = defaultdict(list)
    for line in path.read_text(encoding='utf8').splitlines():
        m = re.fullmatch(r'(\S+) (\S+) \[([^\]]+)\] /(.*)/', line)
        if m:
            t, s, n, meaning = m.groups()
            entries[s].append({'t':t, 'n':n.lower(), 'sourceN':n, 'm':meaning.split('/')})
    return entries


@lru_cache(maxsize=None)
def char_readings(char):
    values = pinyin(char, style=Style.TONE3, heteronym=True, neutral_tone_with_five=True, errors=lambda x:[])
    return values[0] if values else []


def numeric_reading(word, marked, dictionary):
    target = norm(marked)
    exact = [e['n'] for e in dictionary if norm(tone_marks(e['n'])) == target]
    if exact:
        return sorted(set(exact))[0], 'cedict-exact', []
    # One written Han character per syllable, including a separate r5 for 儿化.
    @lru_cache(maxsize=None)
    def split(i, offset):
        if i == len(word):
            return [(0, ())] if offset == len(target) else []
        possible = char_readings(word[i])
        bases = {re.sub(r'\d', '', s) for s in possible}
        if word[i] == '儿' and i:
            bases.add('r')
        options = {b+str(t) for b in bases for t in range(1,6)}
        if word[i] == '嗯':
            options |= {b+str(t) for b in ('ng','n','en') for t in range(1,6)}
        out = []
        for n in options:
            m = norm(tone_marks(n))
            if target.startswith(m, offset):
                for cost, parts in split(i+1, offset+len(m)):
                    out.append((cost+(0 if n in possible or n=='r5' else 1), (n,)+parts))
        return sorted(set(out))[:12]
    found = split(0, 0)
    if not found:
        raise ValueError(f'Cannot align {word} {marked}')
    best = [parts for cost, parts in found if cost == found[0][0]]
    return ' '.join(best[0]), 'character-alignment', [' '.join(x) for x in best[1:]]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    args = parser.parse_args()
    rows = extract(args.pdf)
    dictionary = cedict(ROOT / '.cache/research/cedict.u8')
    old = {w['s']:w for level,ws in catalog().items() if level != '-extra' for w in ws}
    candidates, matches = {}, []
    decisions = json.loads((ROOT / 'data/sources/cti-editorial.json').read_text(encoding='utf8'))
    editorial = decisions['rows']
    for row in rows:
        s = re.sub(r'\d+$', '', row['word'])
        readings = (tone_marks(editorial[str(row['number'])]['n']) if str(row['number']) in editorial else row['pinyin']).split('/')
        ids = []
        for reading in readings:
            n, method, ambiguity = numeric_reading(s, reading, dictionary[s])
            if ambiguity:
                raise ValueError(f'Ambiguous segmentation: {row} {n} {ambiguity}')
            previous = old.get(s)
            if previous and (norm(tone_marks(previous['n'])) == norm(reading)
                             or norm(tone_marks(sandhi(previous['n'], s))) == norm(reading)):
                wid = previous['id']
                decision = 'exact' if norm(tone_marks(previous['n'])) == norm(reading) else 'yi-bu-sandhi'
            else:
                wid = s+'|'+n.replace(' ', '').replace('ü','u:')
                if wid in {w['id'] for w in old.values()}:
                    wid += '|cti2025'
                decision = 'new-reading' if previous else 'new-headword'
                reference = [e for e in dictionary[s] if norm(tone_marks(e['n'])) == norm(reading)]
                if not reference:
                    reference = [e for e in dictionary[s] if re.sub(r'[1-5 :]', '', e['n']) == re.sub(r'[1-5 :]', '', n)]
                if wid not in candidates:
                    candidates[wid] = {'id':wid,'s':s,'n':n,'p':tone_marks(n),'rows':[],
                                       'pos':row['pos'],'readingMethod':method,'decision':decision,
                                       'reference':reference,'previous':previous}
                candidates[wid]['rows'].append(row['number'])
            ids.append({'id':wid,'n':n,'decision':decision})
        matches.append({**row, 'cards':ids})
    atomic_json(ROOT / '.cache/curriculum-candidates.json', list(candidates.values()))
    if unknown := set(decisions.get('cards',{}))-set(candidates):
        raise ValueError(f'Editorial card keys no longer match additions: {unknown}')
    atomic_json(ROOT / '.cache/curriculum-matches.json', matches)
    from importlib.util import spec_from_file_location, module_from_spec
    spec = spec_from_file_location('build_curricula', ROOT/'tools/build-curricula.py')
    builder = module_from_spec(spec)
    spec.loader.exec_module(builder)
    lexical = []
    bad = re.compile(r'^(surname |variant of |old variant |see |abbr\.|erhua variant |CL:)', re.I)
    for item in candidates.values():
        refs = item['reference']
        def score(e):
            return sum(not bad.match(m) for m in e['m']) - 10*bool(bad.match(e['m'][0])) - 8*e['sourceN'][0].isupper()
        chosen = max(refs,key=score) if refs else None
        previous = item['previous']
        traditional = chosen['t'] if chosen else previous['t'] if previous else item['s']
        tags = item['pos'].replace('（','').replace('）','').split('、')
        pos = ', '.join(builder.POS[t] for t in tags if t in builder.POS)
        if item['s']=='客服':pos='danh từ'
        if item['s']=='垂直':pos='tính từ'
        if not pos and len(item['s'])==4:pos='thành ngữ, cụm từ'
        lexical.append({k:item[k] for k in ('id','s','n','rows','readingMethod')} |
                       {'t':traditional,'pos':pos,'references':dictionary[item['s']]} |
                       decisions.get('cards',{}).get(item['id'],{}))
    atomic_json(ROOT/'data/sources/cti-lexical-2026-10-26.json',{
        'schema':1,'dictionary':'https://www.mdbg.net/chinese/dictionary?page=cc-cedict','sha256':CEDICT_SHA,
        'license':'CC-BY-SA-4.0','review':'Assistant-selected lexical references and Vietnamese editing; independent bilingual review pending.',
        'entries':lexical})
    cards = {w['id']:w for w in old.values()} | {x['id']:x for x in lexical}
    atomic_json(ROOT/'data/sources/cti-joins-2026-10-26.json',{
        'schema':1,'sourcePdfSha256':PDF_SHA,'editorial':'cti-editorial.json',
        'rows':[{'row':r['number'],'cards':[dict(c,cardReading=cards[c['id']]['n']) for c in r['cards']]} for r in matches]})
    atomic_json(ROOT / 'data/sources/cti-syllabus-2025.json', {
        'schema':1,'source':SOURCE,'sha256':PDF_SHA,'published':'2025-11','coverEffective':'2026-07',
        'extracted':'2026-10-26','method':'PDF table pages 80–354; contiguous rows and band totals checked; factual word/reading/POS index, not textbook content.',
        'rows':rows})
    print(json.dumps({'rows':len(rows),'newCards':len(candidates),
                      'decisions':dict(Counter(x['decision'] for r in matches for x in r['cards']))}, ensure_ascii=False))


if __name__ == '__main__':
    main()
