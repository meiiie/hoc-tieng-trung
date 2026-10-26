"""Fill missing character records/strokes from pinned, attributed upstream data."""
import argparse
import base64
import hashlib
import io
import json
import tarfile
import urllib.request
from content import ROOT, atomic_json, catalog, read_json, sha256

URL='https://registry.npmjs.org/hanzi-writer-data/-/hanzi-writer-data-2.0.1.tgz'
INTEGRITY='nbQwM+MaryGoq7pBMIZLCd3lFq03nXuJuwku1+6UbjL58uU+9OULVcMkoNvNuJSoIV7f1bbPRfD4D/LQa5S7qg=='
DICT_SHA='744bb05d5b0742e9ee35c37791f94d56a173349b3367569e7ca11e510364d203'


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write',action='store_true')
    args=parser.parse_args()
    dictionary=ROOT/'.cache/research/makemeahanzi-dictionary.txt'
    if sha256(dictionary)!=DICT_SHA:raise ValueError('Unpinned character dictionary')
    archive=ROOT/'.cache/research/hanzi-writer-data-2.0.1.tgz'
    if not archive.exists():
        with urllib.request.urlopen(URL,timeout=60) as response:raw=response.read()
        if base64.b64encode(hashlib.sha512(raw).digest()).decode()!=INTEGRITY:raise ValueError('Package integrity mismatch')
        archive.write_bytes(raw)
    raw=archive.read_bytes()
    if base64.b64encode(hashlib.sha512(raw).digest()).decode()!=INTEGRITY:raise ValueError('Cached package integrity mismatch')
    source={x['character']:x for x in map(json.loads,dictionary.read_text(encoding='utf8').splitlines())}
    kai={x['hanzi']:x for x in read_json(ROOT/'data/sources/kaihanzi-characters.json')}
    radicals={x['char']:x['nameVi'] for x in read_json(ROOT/'data/sources/kaihanzi-radicals.json')}
    chars=read_json(ROOT/'data/chars.json')
    used=sorted({c for ws in catalog().values() for w in ws for c in w['s']+w['t']})
    manifest_path=ROOT/'data/sources/character-extensions-2026-10-26.json'
    manifest=read_json(manifest_path) if manifest_path.exists() else {
        'schema':1,'dictionary':{'url':'https://raw.githubusercontent.com/skishore/makemeahanzi/bddc96d41bef78427ed0e034e9f7e31d71fd1b92/dictionary.txt','sha256':DICT_SHA},
        'strokes':{'url':URL,'sha512':INTEGRITY,'license':'Arphic Public License'},
        'kai':'data/sources/kaihanzi-characters.json (CC-BY-4.0)','entries':{}}
    added_info=added_strokes=0
    writes={}
    with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as package:
        names=set(package.getnames())
        for c in used:
            evidence=manifest['entries'].get(c,{})
            new_info=c not in chars
            if new_info:
                if c not in source:raise ValueError(f'No character metadata: {c}')
                src=source[c]
                info={'d':src.get('definition',''),'c':src.get('decomposition',''),'r':src.get('radical','')}
                if src.get('etymology',{}).get('hint'):info['h']=src['etymology']['hint']
                if c in kai:
                    for old,new in [('sinoViet','hv'),('meaningVi','vi'),('mnemonic','mn')]:
                        if kai[c].get(old):info[new]=kai[c][old].lower() if old=='sinoViet' else kai[c][old]
                if info['r'] in radicals:info['rv']=radicals[info['r']]
                chars[c]=info;evidence['dictionaryEntry']=src;added_info+=1
            target=ROOT/f'data/strokes/{c}.json'
            if not target.exists() or new_info:
                name=f'package/{c}.json'
                if name not in names:raise ValueError(f'No stroke data: {c}')
                blob=package.extractfile(name).read()
                data=json.loads(blob)
                if not data.get('strokes') or len(data['strokes'])!=len(data.get('medians',[])):raise ValueError(f'Invalid strokes: {c}')
                evidence['strokeSha256']=hashlib.sha256(blob).hexdigest();evidence['strokeCount']=len(data['strokes'])
                if target.exists() and target.read_bytes()!=blob:raise ValueError(f'Existing supplemental strokes differ: {c}')
                if not target.exists():
                    writes[target]=blob
                    added_strokes+=1
            if evidence:manifest['entries'][c]=evidence
    if args.write:
        for target,blob in writes.items():target.write_bytes(blob)
        atomic_json(ROOT/'data/chars.json',chars)
        atomic_json(manifest_path,manifest)
    print({'written':args.write,'usedCharacters':len(used),'addedInfo':added_info,'addedStrokes':added_strokes})


if __name__=='__main__':main()
