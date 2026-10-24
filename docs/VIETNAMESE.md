# Vietnamese meanings, part of speech and Hán Việt: sources and how quality was checked

Last build: 10,969 words, HSK 3.0 levels 1-9 (7-9 merged).

| Field | Source | Coverage |
|---|---|---|
| `v` HSK 1-3 (2,209 words) | Written for this app (concise glosses), reviewed by me against CC-CEDICT English and CVDICT. **Not reviewed by a native speaker.** | 100% |
| `v` HSK 4-9 (8,724 words) | CVDICT (Phong Phan, CC BY-SA 4.0): CC-CEDICT translated to Vietnamese with AI and corrected by hand by its author. Matched by simplified form + numbered pinyin; markup (measure words, cross-references, Taiwan-reading notes) stripped; first senses up to 60 characters, full entry kept in `vd`. | 99.7% (36 words fall back to the English meaning) |
| `vd` | Longer CVDICT entry (shown in the word sheet) | most words |
| `pos` | complete-hsk-vocabulary POS codes, mapped to Vietnamese names | 99%+ |
| `hv` (Hán Việt) | Per character: Kai Hanzi `sinoViet` (768 chars, CC BY 4.0) first, else Unihan `kVietnamese` (first reading, traditional form first). Words with any Unihan-derived syllable carry `hvq` and are shown with `*` / "tham khảo". | 84% full, 13% partial |
| Character notes in Viết chữ | Kai Hanzi meaningVi, mnemonic, radical names (CC BY 4.0) for 768 chars; Make Me a Hanzi (English) otherwise | |

## Checks run

- Automatic (tests/data.test.js): every HSK 1-3 word has a gloss; at least 99.5% of all words have Vietnamese; glosses are at most 60 characters with no tabs or pipes; no CEDICT markup (`LT:`, `[pin1yin1]`) is left; part of speech is present for at least 90% of words and Hán Việt for at least 80%; no emoji.
- Cross-check of my HSK 1-3 glosses against CVDICT: 2,194 words had a CVDICT entry. 2,059 (93.8%) share at least one word with the CVDICT gloss. The 135 that do not are listed in `docs/VI_DISAGREE.tsv`. Most are synonyms (for example "ti vi" against "truyền hình"); none were found to be wrong.
- Pinyin reading fix: the source list puts readings in an arbitrary order. For 564 words the first reading was a surname or a rare reading (for example 都 Dū instead of dōu, 还 Huán instead of hái). The build now scores readings against the Vietnamese gloss and the CVDICT senses, and penalises capitalised readings, surnames and variant readings. The list is in `docs/FORM_FIX.tsv`. Word ids stay on the original reading, so saved progress still matches.
- Manual spot check: 100 random CVDICT glosses from HSK 4-9 (seed 20261024). About 96 were judged correct and usable. 4 were wrong or awkward and were fixed in `tools/vi-overrides.tsv` (大厦, 悼念, 闲, 好心人, 便条). The reviewer is not a native speaker, so treat this as a sanity check, not a certification.
- "(văn học)", CVDICT's translation of "(literary)", is rewritten to "(văn viết)".

## Known limits

- Hán Việt from Unihan is a mechanical first reading, and some are wrong (for example 厦 is given as "hè" instead of "hạ"). Such readings are marked "tham khảo".
- There are no example sentences yet. Tatoeba has few cmn–vie pairs. Plan: cmn–eng pairs from Tatoeba (CC BY 2.0 FR), filtered to sentences that use only words at or below the word's HSK level, with Vietnamese translations generated and checked separately. Not started.
- The audio for polyphonic single characters comes from text-to-speech of the hanzi, so the voice picks the most common reading.
