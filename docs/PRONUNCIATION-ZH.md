# Chinese pronunciation feedback: what ships, what it measures, the state of the art

## What ships (Stage 1, 2026-10-24)

The Luyện nói screen uses the English app's microphone pipeline (`core/speech.js`: capture, end-of-speech detection, trimming, 16 kHz resampling, the comparison chart) with a Chinese scorer.

1. **Tone, per syllable, on the device.** `tones.js` runs these steps:
   - An autocorrelation pitch tracker. It picks the first strong peak, which avoids octave-down errors, and uses parabolic refinement.
   - A semitone contour relative to the speaker's median, scaled by the speaker's range.
   - Syllable boundaries placed at the lowest-energy points near an even split.
   - A 4-way softmax over 12 contour features.
   - Expected tones apply the standard sandhi rules: 3-3 becomes 2-3, 不 before tone 4 becomes 2, and 一 before tone 4 becomes 2 and before tones 1-3 becomes 4. A non-final tone 3 is also accepted as a low half-third.
2. **Initials and finals.** When the browser has speech recognition (zh-CN), the recognised text is compared with the word's characters, which catches gross initial or final errors. This is not available in an iPhone home-screen PWA. There, the screen says so and only tones are scored.
3. **Pinyin chips.** Each chip is coloured by tone and turns green or red after scoring. Tapping one opens a sheet with:
   - an animated SVG pitch line on the 5-level Chao scale,
   - an animated mouth-shape SVG,
   - an articulation hint for the initial, written for Vietnamese speakers.
4. **Reference audio.**
   - HSK 1-3 use Microsoft neural voices recorded at -10% rate: zh-CN-XiaoxiaoNeural (female) and zh-CN-YunxiNeural (male). That is 4,418 files.
   - HSK 4-9 use the device's zh-CN voice through speechSynthesis.
   - The chart compares the learner's pitch with the reference recording where one exists.

## Measured accuracy (honest)

`tools/tone-feats.js` and `tools/tone-train.py` train and evaluate on the app's own reference recordings. The test speaker is never used for training. Results are in `docs/tone-eval.json`.

| Train → test (unseen voice) | Syllables | Accuracy | T1 | T2 | T3 | T4 |
|---|---|---|---|---|---|---|
| Xiaoxiao → Yunxi | 3,689 | 62.3% | 45% | 54% | 45% | 86% |
| Yunxi → Xiaoxiao | 3,777 | 75.6% | 52% | 77% | 75% | 89% |

For comparison, the old rule-based classifier scored 50-52% on the same recordings when tested on the same voice (`tools/tone-eval.js`, before the change). Chance is 25%.

**Not measured:** accuracy on real learners, on Vietnamese-accented speech, in noise, or on iPhone microphones. Two synthetic voices are not a learner population. The UI therefore calls the score a hint and steers the learner to the reference-versus-you comparison.

## State of the art as of 2026-10-24 (on-device)

- **CTC models with pinyin+tone tokens and forced alignment.** Example: Simon Edwardsson's "Ear" (January 2026). It is a 9M-parameter Conformer-CTC trained on AISHELL-1 and Primewords (about 300 h), INT8 (about 11 MB), running in onnxruntime-web, and reports 98.3% tone accuracy on read speech. Native speakers reported that it is strict on casual speech. Its weights are not published under an open licence, so it cannot be vendored.
- **charsiu-js** (npm). Mandarin wav2vec2 forced alignment in the browser, with about 40 MB INT8 and tonal phones. It is useful for syllable boundaries and goodness of pronunciation (GOP) per phone.
- **GOP-CTC over phoneme posteriors.** Used in the English app (ZIPA) and in open tools such as "Slip". It correlates about 0.45 with human raters at phone level, which is useful but not examiner grade.
- **Commercial APIs** such as Azure Pronunciation Assessment zh-CN and SpeechSuper. They are server-side and paid, which conflicts with this app's offline and privacy-first design.

## Plan (Stage 2)

Train a small Conformer-CTC model with about 1,300 pinyin+tone tokens on open data:
- AISHELL-1 (Apache-2.0),
- Common Voice zh-CN (CC0),
- this app's neural reference recordings.

Then export it as an INT8 ONNX file of 10-15 MB, run it in the existing `core/speech.js` worker path the way English runs ZIPA, and score initials, finals and tones by forced alignment against the expected pinyin. Keep the F0 model as a fallback for when the model is not downloaded. Collect a small consented test set of learner recordings before claiming any accuracy.

## Stage 2 (2026-10-24): iPhone fix + on-device model

### iPhone bug: "Chưa nghe thấy giọng nói" every time
Root cause (code inspection, consistent with WebKit's single audio session): the speak screen started `webkitSpeechRecognition` (zh-CN)
in the same tap as our PCM capture. On iOS Safari the recogniser takes over the mic/audio session, so our ScriptProcessor capture got
only zeros, the RMS gate never opened, and every attempt ended with "no voice". Chrome on desktop shares the mic, so the bug hid there.
Fix: the recogniser is gone; one capture path only (`Speech.record`: fresh AudioContext created in the tap, noise floor from the first
300 ms, gate = max(0.008, 3 x floor), live level meter). Permission denied shows iPhone steps (Settings > Safari > Microphone).
Settings > Phát âm has "Kiểm tra micro": 4 s capture with a meter, then permission state, sample rate, duration, peak, floor, gate,
callback/non-zero counts and the user agent. "Chi tiết micro" under any error shows the same line.

### Candidates (licences checked by me, 2026-10-24)
| Model | Size | Licence | Verdict |
|---|---|---|---|
| SpeakToLearn SyllablePredictorV6 (github.com/cogeor/speaktolearn) | 45 MB FP16 -> 30 MB INT8 | README: "License: MIT"; no LICENSE file; trained on AISHELL-3 (Apache-2.0) | **Shipped**. Confirmation request to the author drafted, not sent. |
| Tonara (MIT, Dart) | small | MIT | Monosyllables only; good tone candidate for a later JS port. |
| Ear (simedw) | 11-14 MB | no public repo/licence found | Not usable. |
| Buddy Mandarin ONNX | 357 MB | Apache-2.0 | Too large for iPhone download. |
| SenseVoice Small Dual-CTC pinyin | 239 MB | "other" (model licence) | Too large, licence unclear. |

### Measured (held-out)
| Data | Engine | Syllable top-1 | Tone |
|---|---|---|---|
| Our TTS, 400 HSK 1-3 words | V6 FP16 | 67.6% | 84.4% |
| Tatoeba human speech, 187 sentences, 4 speakers (not in AISHELL-3) | V6 FP16 | 73.9% | 79.4% (surface tones) |
| same | V6 INT8 (shipped) | 73.5% | 79.3% |
| same | our F0 rule model (fallback) | - | 47% |
Browser parity (tests/model_parity.py): JS front end + onnxruntime-web 1.30 WASM gives the same top syllable and tone as Python on
fixtures, in Chromium and WebKit; about 0.25-0.6 s per word on the test box; ~4 s first load; cached in "htt-engine-v1" (offline).
Probabilities differ slightly (up to ~0.1) between WASM and CPU INT8 kernels.
Scoring: syllable OK if model top-1 is the target or P(target) >= 0.25; score = 0.6 x syllables + 0.4 x tones. Known gaps: vocabulary
merges ü into u, lacks fei/gei/hei/shei (those syllables are tone-only). Download is opt-in (~44 MB incl. runtime); "Chỉ chấm thanh điệu" keeps the F0 path.
