# Changelog

## 5.1.1 — 2026-11-01

- Keep collected food illustrations visible above the basket rim, with larger fixed slots that preserve the prop's size and position at the end of its flight.

## 5.1.0 — 2026-11-01

- Add the optional “Đi chợ cùng Neko” game: six distinct food/drink targets per visit from eight illustrated catalog entries, with reading and listening choices, hints, immediate feedback and replay at the end.
- Support dragging, tapping and native keyboard buttons equally. Keep pinyin behind hints/answers, respect traditional script and reduced motion, and preserve all study progress and schedules.
- Apply Rossark Motion Skill to original SVG props: short curved journeys into the basket, quiet reused Neko, fixed layout, and cleanup/pause when leaving the scene. Add both game assets to the PWA shell.
- Verify Chromium/WebKit interactions, accessible responsive themes, media failure, interrupted gestures and offline play. See [game decisions and validation](docs/MARKET-GAME-2026-11-01.md).

## 5.0.1 — 2026-10-30

- Hide pinyin on flashcard question faces; retain it on answers according to the learner's pinyin setting. Preserve keyboard focus and the surrounding screen while advancing cards; fix the blank half of the flip animation.
- Index Chinese, pinyin and Vietnamese search text once, yield while preparing the index, and stop reader lookup after 30 results. Count word states in one pass, reuse sorted lists, and split sorting into cancellable tasks with 50 visible rows per page.
- Save each free-card answer and session position together once. Dispose card observers, listeners and pending gestures on navigation; keep the existing learning schedule rules.
- Reduce mascot geometry work and unnecessary SVG mutations; pause offscreen animation. Reuse one handwriting widget, abort stale stroke requests and stop drawing when leaving the page.
- Add Chromium/WebKit lifecycle, keyboard, search and sorting regressions plus a reproducible CPU profiling script. See [the performance audit](docs/PERFORMANCE-2026-10-30.md) for measurements and limits.

## 5.0.0 — 2026-10-27

- Offer both HSK 2021 and the CTI 2025/2026 syllabus without level locks: 12,387 distinct cards, Vietnamese meanings and 24,774 female/male word recordings. Preserve existing word IDs, progress and schedules.
- Add reproducible content imports, source provenance, asset checksums, complete character stroke coverage and release validation.
- Add private reading and dictionary lookup, optional learning guidance, flat interactive pinyin and the shared Neko logo across favicon/PWA/share metadata.
- Rework speaking practice around actual microphone feedback, safe cancellation and replay/comparison. Keep optional on-device recognition; remove unvalidated numeric grades and F0-only verdicts.
- Add browser/accessibility, microphone lifecycle, model parity, installed PWA identity and cache-upgrade checks to CI.

The pronunciation model has not been independently validated on Vietnamese learners or physical iPhone microphones. Complete fields do not certify every translation or synthesized pronunciation; bilingual/native review and full bilingual example coverage remain outstanding.

This is the first tagged release. The previous public application used service-worker shell `htt-v4`; local development cache revisions were not public release versions. Content release identifiers and saved-progress schema versions are independent of the application version.
