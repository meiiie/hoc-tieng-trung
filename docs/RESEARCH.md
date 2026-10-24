# Research notes (first pass, 2026-10-24)

What each claim rests on: **Checked** = verified in this repo (file read, licence file read, or test run). **Known** = general knowledge of the project or platform, not re-read for this note. Treat Known items as leads to verify.

## 1. Open HSK 3.0 word lists
| Source | Licence | Status |
|---|---|---|
| drkameleon/complete-hsk-vocabulary, `wordlists/exclusive/new/1..7.json`, commit 7ac65bf | MIT (LICENSE file copied to `data/`) | **Checked.** Used. 506 / 750 / 953 / 972 / 1059 / 1123 / 5606 words for HSK 1, 2, 3, 4, 5, 6, 7–9 (10,969 in total after de-duplication by simplified+pinyin). Per word: simplified, traditional, pinyin with tone marks, numeric pinyin, radical, CC-CEDICT meanings. |
| Official standard GF0025-2021 (《国际中文教育中文水平等级标准》, Ministry of Education PRC, 2021) | Government standard, PDF | **Known.** It is the primary source; the dataset above transcribes it. Not re-checked word by word against the PDF. Levels 7–9 are one band in the standard, which is why the app has one "HSK 7–9" deck. |
| CC-CEDICT (meanings) | CC BY-SA 4.0 | **Known** (attribution given in app). Meanings are English. |

Vietnamese meanings exist **only for HSK 1** (506 short glosses written for this app, `tools/vi1.txt`). HSK 2 to 7–9 show the English CC-CEDICT meaning and the app says so on the card. This is the main content gap.

## 2. Stroke-order data
| Source | Licence | Status |
|---|---|---|
| hanzi-writer 3.x (library) | MIT (`vendor/hanzi-writer.LICENSE`) | **Checked.** |
| hanzi-writer-data 2.0.1 (per-character stroke JSON) | Arphic Public License (`data/strokes/ARPHICPL.TXT`); derived from Make Me a Hanzi `graphics.txt` | **Checked.** 4,110 of 4,199 simplified+traditional characters used in the lists have data; the files are self-hosted under `data/strokes/` (no CDN at runtime) and cached on first view. |
| Make Me a Hanzi `dictionary.txt` (definition, decomposition, radical, etymology hint) | LGPL-3.0 (per its COPYING) | **Checked.** Used for `data/chars.json`. |
Radical names are the Unicode character names of the Kangxi Radicals block (e.g. "water"), mapped by NFKC normalisation; they are English.

## 3. Chinese TTS on iPhone
- The app uses the Web Speech API (`speechSynthesis`) with `lang="zh-CN"` and picks the first `zh-CN` voice, else any `zh*` voice. **Known:** iOS ships a Mandarin voice (Tingting, zh-CN; Meijia zh-TW; Sinji zh-HK); higher-quality "Enhanced/Premium" variants are downloaded in Settings > Accessibility > Spoken Content > Voices. iOS Safari returns voices asynchronously and only speaks after a user gesture, which the app respects (it speaks on tap).
- **Not tested on a real iPhone.** If no Chinese voice is found the app shows the Settings path above.
- Alternatives considered: pre-recorded audio (best quality, needs a licensed corpus; none chosen yet), cloud TTS (needs a key and network, no).

## 4. Tone scoring on device
| Approach | Feasibility | Notes |
|---|---|---|
| Pitch tracking + rules (implemented) | Works offline, tiny, instant | f0 by normalised autocorrelation, semitones relative to the speaker's median, contour shape per syllable. **Checked** only on synthetic glides (unit tests). Expected weak points: tone 3 (often realised low without the rise), neutral tone, tone sandhi (3+3 is handled loosely), coarticulation, noisy rooms, syllable boundaries (split evenly, not segmented). Shown to the user as an estimate. |
| pYIN / CREPE-tiny pitch | Better f0, more code / a ~2 MB model | **Known.** Improves the f0 track, not the classification rules. A sensible next step. |
| Small CNN tone classifier on mel spectrograms (ToneNet-style) | Feasible with ONNX Runtime Web (already used by the English app) | **Known** from the literature to reach high accuracy on clean isolated syllables. Needs training data with a licence that allows it; not built. |
| ASR (e.g. Whisper) | Heavy for an iPhone PWA; ASR normalises tones away | Not suitable as a tone judge. |

Verdict: tone feedback here is **partial and unvalidated**. No accuracy figure on human speech is claimed.
