# Changelog

## 5.0.0 — 2026-10-27

- Offer both HSK 2021 and the CTI 2025/2026 syllabus without level locks: 12,387 distinct cards, Vietnamese meanings and 24,774 female/male word recordings. Preserve existing word IDs, progress and schedules.
- Add reproducible content imports, source provenance, asset checksums, complete character stroke coverage and release validation.
- Add private reading and dictionary lookup, optional learning guidance, flat interactive pinyin and the shared Neko logo across favicon/PWA/share metadata.
- Rework speaking practice around actual microphone feedback, safe cancellation and replay/comparison. Keep optional on-device recognition; remove unvalidated numeric grades and F0-only verdicts.
- Add browser/accessibility, microphone lifecycle, model parity, installed PWA identity and cache-upgrade checks to CI.

The pronunciation model has not been independently validated on Vietnamese learners or physical iPhone microphones. Complete fields do not certify every translation or synthesized pronunciation; bilingual/native review and full bilingual example coverage remain outstanding.

This is the first tagged release. The previous public application used service-worker shell `htt-v4`; local development cache revisions were not public release versions. Content release identifiers and saved-progress schema versions are independent of the application version.
