"""Compare a locally downloaded HSK 2025 syllabus PDF with shipped headwords.

Usage: python tools/compare-hsk-syllabus.py syllabus.pdf output_directory
Requires PyMuPDF. Outputs review candidates only; never modifies application data.
"""
import collections
import hashlib
import json
from pathlib import Path
import re
import sys

import pymupdf

repo = Path(__file__).resolve().parents[1]
pdf = Path(sys.argv[1])
out = Path(sys.argv[2])
source = "https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf"
expected_sha = "ec74ce0439e837bbb15154be13e747ae798903b2fd3a331629df6c3b45504941"
digest = hashlib.sha256(pdf.read_bytes()).hexdigest()
if digest != expected_sha:
    raise ValueError("PDF differs from the audited edition; review page boundaries and extraction before using it")

rows = []
with pymupdf.open(pdf) as document:
    for page in range(79, 354):
        text = document[page].get_text()
        for match in re.finditer(r"(?m)^(\d+)\n([1-6](?:（[^）]+）)*|7-9)\n([^\n]+)\n([^\n]+)", text):
            number, level, word, pinyin = match.groups()
            rows.append({"number": int(number), "level": level, "word": word,
                         "pinyin": pinyin, "pdfPage": page + 1})

if [row["number"] for row in rows] != list(range(1, 11001)):
    raise ValueError("Expected every official row from 1 to 11000, in order, exactly once")

current = {word["s"]: level for level in range(1, 8)
           for word in json.loads((repo / f"data/hsk{level}.json").read_text(encoding="utf8"))}
if len(current) != sum(len(json.loads((repo / f"data/hsk{level}.json").read_text(encoding="utf8"))) for level in range(1, 8)):
    raise ValueError("Current data has duplicate headwords; this comparison needs a reading-aware join")

def headword(value):
    return re.sub(r"\d+$", "", value).strip()

def band(row):
    return row["level"].split("（")[0]

missing = [row for row in rows if headword(row["word"]) not in current]
moved = [row for row in rows if headword(row["word"]) in current
         and str(current[headword(row["word"])]) != band(row).replace("7-9", "7")]
official = {headword(row["word"]) for row in rows}
summary = {
    "source": source, "sourcePdfSha256": digest,
    "method": "Extracted table rows from PDF pages 80-354; checked row numbers 1..11000 with no gaps/duplicates. Comparison by simplified headword only, stripping trailing homograph digits. NOT sense/reading validation or a migration-ready import. Page spot-check only.",
    "officialRows": len(rows), "officialUniqueHeadwords": len(official),
    "exclusiveCounts": dict(collections.Counter(map(band, rows))),
    "missingHeadwordRows": len(missing),
    "missingUniqueHeadwords": len({headword(row["word"]) for row in missing}),
    "differentLevelRows": len(moved),
    "existingHeadwordsNotInOfficial": len(set(current) - official),
    "missingByLevel": dict(collections.Counter(map(band, missing))),
    "missingSamples": missing[:10], "differentLevelSamples": moved[:10]
}
out.mkdir(parents=True, exist_ok=True)
(out / "hsk-syllabus-comparison-2026-10-26.json").write_text(
    json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
for name, candidates in [("syllabus-missing-candidates", missing), ("syllabus-level-change-candidates", moved)]:
    lines = ["official_number\tlevel\theadword_raw\tpinyin_raw\tpdf_page\tstatus"]
    for row in candidates:
        cells = [str(row[key]).replace("\t", " ").replace("\n", " ")
                 for key in ["number", "level", "word", "pinyin", "pdfPage"]]
        lines.append("\t".join(cells) + "\tneeds_lexical_review")
    (out / f"{name}-2026-10-26.tsv").write_text("\n".join(lines) + "\n", encoding="utf8")
print(json.dumps(summary, indent=2))
