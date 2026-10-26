# Vietnamese meanings, part of speech and Hán Việt: sources and how quality was checked

Updated 2026-10-26: 10,969 words from the 2021 HSK 3.0 list, levels 1-9 (7-9 merged). Every word has a Vietnamese short gloss. This measures field coverage, not expert certification of every sense.

| Field | Source | Coverage |
|---|---|---|
| `v` retained HSK 1-3 glosses | Written for this app (concise glosses), cross-checked historically against CC-CEDICT English and CVDICT. **Not independently teacher-reviewed.** | 2,194 |
| `v` CVDICT | Retained glosses from the earlier build. CVDICT (Phong Phan, CC BY-SA 4.0) describes AI translation with author corrections. Its upstream returned 404 when downloaded during this audit. | 8,589 |
| `v` editorial entries | 36 missing glosses filled and 141 existing short glosses changed; four further entries retain their short gloss while receiving editorial detail/source attribution. Cross-checked with the 2026-10-26 CC-CEDICT snapshot; not independently teacher-reviewed. See `data/sources/corrections.json`. | 181 |
| `v` previous overrides | Existing manually authored override entries | 5 |
| `vd` | Longer dictionary entry or an editorial usage note (shown in the word sheet) | 3,064 |
| `pos` | Source POS codes mapped to Vietnamese names, plus the documented corrections | 10,707 / 10,969 (97.6%) |
| `hv` (Hán Việt) | Per character: Kai Hanzi `sinoViet` (768 chars, CC BY 4.0) first, else Unihan `kVietnamese` (first reading, traditional form first). Words with any Unihan-derived syllable carry `hvq` and are shown with `*` / "tham khảo". | 84% full, 13% partial |
| Character notes in Viết chữ | Kai Hanzi meaningVi, mnemonic, radical names (CC BY 4.0) for 768 chars; Make Me a Hanzi (English) otherwise | |

## Checks run

- Automatic (`tests/data.test.js`, `tests/content_test.py`): every HSK 1-9 word has a gloss; glosses are at most 60 characters with no tabs or pipes; no CEDICT markup (`LT:`, `[pin1yin1]`) is left; numbered pinyin is valid and aligned; part of speech is present for at least 90% of words and Hán Việt for at least 80%; no emoji. ID loss and unknown correction IDs are rejected.
- This update changes 50 numbered readings: 30 malformed readings, 定为, 13 additional dictionary-reading differences, and the sense-aligned readings of 干, 价, 胖, 雨, 调 and 空. All historical progress IDs are preserved. Some neutral-tone alternatives vary by usage; these changes select the cited headword reading rather than declaring every alternative wrong. Sources and checksums are in `data/sources/cedict-reference-2026-10-26.json`.
- Tone-marked pinyin is derived from the numbered reading, repairing 13 additional display inconsistencies such as `lu:è`, `˙nu:` and `Aò`. Four traditional forms are aligned with the taught sense: 幹, 雲, 鹹 and 醜.
- Cross-reference-only glosses and clipped explanations were rewritten. The importer no longer cuts short glosses at character 60 or details at character 140. Overlong new short glosses require editorial input. A full TSV export is available through `tools/export-content-review.py`.
- Historical lexical cross-check: 2,194 HSK 1-3 words had a CVDICT entry. 2,059 (93.8%) share at least one word with the CVDICT gloss. The 135 others are listed in `docs/VI_DISAGREE.tsv`. Word overlap alone does not establish translation correctness; this update has not re-reviewed every gloss.
- Pinyin reading fix: the source list puts readings in an arbitrary order. For 564 words the first reading was a surname or a rare reading (for example 都 Dū instead of dōu, 还 Huán instead of hái). The build now scores readings against the Vietnamese gloss and the CVDICT senses, and penalises capitalised readings, surnames and variant readings. The list is in `docs/FORM_FIX.tsv`. Word ids stay on the original reading, so saved progress still matches.
- Historical spot check recorded by the original repo: 100 random CVDICT glosses from HSK 4-9 (seed 20261024), reported as about 96 usable. The retained override file has five entries (大厦, 悼念, 闲, 好心人, 便条); this audit does not reinterpret that historical count as five errors in the sample. It was not an independent native-speaker certification.
- "(văn học)", CVDICT's translation of "(literary)", is rewritten to "(văn viết)".

## Known limits

- Hán Việt from Unihan is a mechanical first reading, and some are wrong (for example 厦 is given as "hè" instead of "hạ"). Such readings are marked "tham khảo".
- There are no example sentences yet. Tatoeba has few cmn–vie pairs. Plan: cmn–eng pairs from Tatoeba (CC BY 2.0 FR), filtered to sentences that use only words at or below the word's HSK level, with Vietnamese translations generated and checked separately. Not started.
- Legacy audio for polyphonic single characters was synthesized from hanzi and can choose a different reading. New generated audio uses explicit dictionary pinyin. Neither the legacy corpus nor the new corpus has received a complete native-listener review.
