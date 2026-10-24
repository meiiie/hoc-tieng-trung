# Reference apps and open source (what we took, what we did not)

Based on the public descriptions and documentation of each product as of October 2026. These are not paid deep-dives.

| App / project | What it does well | What this app adopts |
|---|---|---|
| **Anki** + **FSRS** (open-spaced-repetition, ts-fsrs MIT) | Scheduler with explicit 4-button grading, learning and relearning steps, a day boundary, fuzz, leech handling, card suspend and bury | The same FSRS-6 scheduler and v17 lifecycle as the English app. Only "Ôn theo lịch" changes a schedule. Practice modes log evidence only (`bringForward:false` for Chinese). |
| **Pleco** | Dictionary depth, a stroke-order view, a flashcard system tied to the dictionary, character decomposition | A word sheet showing the full CVDICT meaning, traditional/simplified form, Hán Việt and per-character radical, with links into stroke order. |
| **HelloChinese** | Beginner-first course, speech scoring with per-syllable colours, tone drills, pinyin toggling | Pinyin on/off, per-syllable tone colours and feedback, and tone-curve and mouth-shape guides on each pinyin chip. |
| **Du Chinese** | Graded reading with tap-to-gloss, pinyin on/off and HSK levels | Pinyin toggle and HSK-graded decks. Graded reading is not built (a future idea for example sentences). |
| **Skritter** | Handwriting from memory with stroke checking, writing as SRS recall | Viết chữ mode with Hanzi Writer quiz (stroke checking, hints after 3 misses). Results are evidence only and do not change the schedule. A writing-direction SRS card is possible later. |
| **Hack Chinese** | HSK-level vocabulary decks, "known word" fast-forward, frequency ordering, minimal daily friction | HSK 3.0 decks unlocked progressively (80% of the previous level graduated). Daily new-word goal. Free Thẻ ghi nhớ for fast triage. |
| **Make Me a Hanzi** (Arphic PL / LGPL) | Stroke paths and decomposition for about 9,000 characters | Stroke data (`data/strokes`) and decomposition. |
| **Hanzi Writer** (MIT) | Stroke animation and quiz in the browser | Used directly. |
| **complete-hsk-vocabulary** (MIT) | HSK 3.0 lists with all readings and POS | The word list, readings and POS. |
| **CVDICT** (CC BY-SA 4.0) | A Chinese-Vietnamese dictionary derived from CC-CEDICT | Vietnamese for HSK 4-9. |
| **Kai Hanzi hanzi-sino-vietnamese** (CC BY 4.0) | Hán Việt, Vietnamese meaning and mnemonics for 768 common characters, Vietnamese radical names | Character notes in Viết chữ, plus Hán Việt and radical names. |

Deliberately not copied: streak pressure, paywalls and gamified penalties. The English app's no-guilt streak with earned freezes is kept as it is.
