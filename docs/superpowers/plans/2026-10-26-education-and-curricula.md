# Education and complete curricula implementation plan

> Execute directly in this chat. The user explicitly forbids subagents and has authorized autonomous continuation while asleep; no approval checkpoint is inferred.

**Goal:** Complete the published vocabulary scope, preserve learner choice and historical progress, and document the educational evidence and its limits.

**Architecture:** Keep the static PWA and FSRS. Add versioned curriculum membership independently of word identity. Reuse a card only when written form and reading agree (including explicitly documented sandhi normalization); new readings receive new stable IDs. Keep lexical additions and examples attributable and separate from user progress. All levels remain open.

**Tech stack:** Existing JavaScript/Python, pinned CC-CEDICT, official 2025 HSK syllabus, existing local Kokoro pipeline. No backend, paid API, telemetry, or framework migration.

## Design choices

Replacing all 2021 levels would alter the learner's familiar collection without their choice. Mixing new words into the old list would mislabel the curriculum. The selected design retains both editions, exposes the selector, and keeps cards/FSRS IDs stable. The first selected edition stays compatible with current progress; the learner can change it any time.

Curriculum membership is a factual index, not a mandatory course. HSK exam success, communication, vocabulary recognition and pronunciation accuracy remain distinct outcomes. Publisher descriptions inform design but do not establish effectiveness. Do not import copyrighted textbook chapters or portray AI editing as independent teacher approval.

## Work and checks

- [x] Research primary university/publisher material, retrieval/autonomy research and OSS architecture/license boundaries; record URLs, evidence type and application limits.
- [x] Extract all 11,000 official rows with POS and page references from the pinned 406-page PDF. Validate consecutive numbers, 300/200/500/1000/1600/1800/5600 rows per band and reading-aware joins.
- [x] Build `data/curricula.json`, `data/hsk-extra.json` and versioned sources using `tools/build-curricula.py`; resolve every new gloss and reading before write, preserve all historical IDs. Test empty meanings, duplicate mappings, ambiguous/mismatched readings and stale audio.
- [x] Extend catalog/enrichment/release verification/audio generation to include additions. Generate both voices with existing signal and checksum gates. Repair detected faults, retain honest review status, and verify every mapped asset.
- [x] Add an optional curriculum selector in the Chinese adapter, update SW shell/version and keep FSRS/user state unchanged. Test every band, switching editions, old progress, offline upgrades and full-catalog search.
- [x] Remove unsupported time-to-learn promises and evaluative daily-goal labels. Offer self-directed reading/word selection and concise evidence-based learning guidance without a required sequence. Test that using these tools never advances schedules automatically.
- [x] Fill available missing character/stroke data from licensed originals; investigate useful licensed Chinese–Vietnamese contextual examples. Report exact coverage instead of inventing completeness.
- [x] Rebuild core through its pinned generator, run the relevant unit/contract/browser/accessibility suites, freeze final content manifest and publish a local delivery report. No deployment is assumed.

## Review focus

Polyphonic homographs must not inherit the wrong gloss or progress. Neutral tones and sandhi are not automatically spelling errors. Source rows and distinct cards may have different counts. Changing curriculum must not delete or silently reset cards. Pasted reading text stays on the device and cannot execute HTML. ASR disagreement and an HSK label must not be presented as human validation or general language proficiency.

Completion evidence and explicit limits: `docs/EDUCATION-DELIVERY-2026-10-26.md`. Research cutoff remains 2026-10-26; final local checks continued on 2026-10-27. Independent human review and a full bilingual example corpus are not claimed.
