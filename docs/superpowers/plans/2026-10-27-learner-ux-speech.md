# Learner UX and speech reliability

Execute directly, without subagents, under the user's explicit autonomy request. Research cutoff: 2026-10-26 (Asia/Ho_Chi_Minh). Preserve the curriculum, IDs, schedules and all existing progress.

1. Follow the pinned English project's learner UX: centred single column, content first, one primary action, details on demand. Make all pinyin plain typography with keyboard focus and usable hit targets. Simplify the reader form, hide empty results, retain safe text rendering and private transient input.
2. Copy the explicitly requested English logo assets from commit `89eedfc66d9b43ce5cf9e876ba14967785de5102`. Unify favicon, touch and maskable icons; add accurate search/share metadata and crawlable fallback. Keep the installed app identity and start URL stable.
3. Separate capture, visualisation and conservative model feedback. Add an AudioWorklet capture path with a bounded fallback, AbortSignal cancellation, fresh contexts, full teardown and live signal display. Never leave a microphone running after navigation, cancellation or an error.
4. Retain the locally parity-tested SyllablePredictorV6 as optional recognition assistance. Do not substitute an unvalidated aligner or equate probabilities with pronunciation scores. Abstain on unsupported/ambiguous syllables, low confidence and malformed results; neutral tone and contextual variants need explicit handling. Without the model, offer replay/self-comparison, not heuristic grading. Keep previous history but stop generating misleading grades or changing SRS from speaking practice.
5. Verify recording races, silence, repeated attempts, worker failure, model output semantics, XSS-safe reader, mobile/desktop/dark/reduced-motion layouts, all mode icons, accessibility, generator parity and PWA upgrade/offline behavior. Record actual outcomes and remaining device/learner validation limits.

Success means the requested changes work locally and are reviewable. It does not mean certification on physical iPhones or Vietnamese learner speech, deployment, or guaranteed search ranking.
