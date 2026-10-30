# Responsiveness audit — 2026-10-30

Scope: flashcards, catalog search, reading lookup, route rendering, decorative animation and handwriting resource lifetimes. The learner's report of stutter was investigated with isolated browser profiles before changing the implementation. No learner data or physical microphone recordings were used.

## Learner-visible behavior

- Chinese question faces show the word without pinyin. Answer faces retain pinyin unless the learner has hidden it in settings. Reverse cards still start with the Vietnamese meaning.
- Advancing a free flashcard preserves the screen, controls, mascot, scroll position and keyboard focus. Only the card and progress feedback change. Flips use backface visibility; the outgoing face no longer disappears before the rotation reaches its midpoint.
- List search keeps all matching entries available through pagination, with 50 rows mounted at a time. Reading lookup retains the existing limit of 30 results.
- Handwriting changes cancel the previous quiz/animation and stale requests. Leaving a screen cancels its pending gestures, timers and observers. Offscreen mascots stop drawing.

## Findings and implementation

1. `bury()` formatted a local scheduler day repeatedly inside inventory loops. Home/review now take one snapshot per traversal. List status counts are collected in one pass and reused until a details action or scheduler day rollover invalidates them. The scheduler's 04:00 boundary and FSRS behavior are unchanged.
2. Search repeatedly normalized the same word and query, and list search queried the input DOM element inside the word loop. The Chinese adapter now prepares immutable search fields in a `WeakMap`, yielding between batches during loading. One predicate prepares each query. Hanzi, traditional variants, toned/toneless pinyin, Hán Việt and Vietnamese matching are checked against the previous results across the entire catalog.
3. Sorting a large catalog still occupied the main thread after removing redundant work. A stable merge sort now yields after an approximately 8 ms work budget, with a timer fallback where `scheduler.yield()` is unavailable. Sorting is reused across query and page changes, invalidated when relevant state changes, and cancelled on navigation or a replacement sort. Stale renders cannot overwrite newer results. Rendering stays bounded to 50 rows; no worker, framework or new runtime dependency is required.
4. Every free-card answer rebuilt the route, replayed its entrance animation and recreated its mascot. The route now keeps its surrounding DOM. Each answer and updated session position are written together once, synchronously, rather than delaying persistence. Completion can still perform a separate session-clear write. Card cleanup is idempotent and covers the document selection listener, mutation observer, delayed text tap and pending fling.
5. Mascot geometry recalculated fixed trigonometric terms on each frame. Those constants are now prepared once. The same 120-point outline and motion remain. Unchanged decoration markup is not rewritten, the mount observer inspects added HTML subtrees instead of rescanning the document after its own SVG changes, and an intersection observer pauses offscreen work.
6. The bundled Hanzi Writer registers document pointer-end listeners and offers no public destructor. Repeated construction accumulated them. The adapter retains one widget per page lifetime, uses public `setCharacter`, `updateDimensions`, `updateColor`, `cancelQuiz` and pause/resume methods, and guards async completions by generation. Detached writing no longer animates; listener counts remain bounded when revisiting the route. The vendor bundle is unchanged.

## Measurement

`tools/profile-ui.py` runs Chromium with a 390 × 844 viewport, 4× CPU slowdown, blocked service workers and all 12,387 cards loaded. Audio autoplay is disabled. It records five route samples, eight card advances, typing `zhongguo` in both search fields, and a 3,600-character reader submission. Baseline frontend files come from commit `0744f1ee10ca2a5d4f01394d31f0d47a721995f1` against the same local data and browser.

Commands, with the local server already running:

```sh
python tools/profile-ui.py baseline http://127.0.0.1:8931/ 0744f1ee10ca2a5d4f01394d31f0d47a721995f1
python tools/profile-ui.py optimized
```

Route samples separate synchronous handler work from time until rows are present and two animation-frame callbacks have passed. This distinction matters because list sorting is now asynchronous. Event Timing samples describe the scripted interaction, not production INP. CPU sampling adds overhead; compare bottlenecks and repeated behavior rather than treating every millisecond as a device-independent guarantee.

Chromium 151.0.7922.34 on Windows; medians of five samples, milliseconds:

| Route | Synchronous work, baseline → optimized | Settled view, baseline → optimized |
|---|---:|---:|
| Home | 685.7 → 187.7 | 730.9 → 260.0 |
| Cards (opening/reopening) | 33.5 → 45.7 | 104.1 → 119.4 |
| Word list | 2,223.4 → 139.0 | 2,669.2 → 815.6 |
| Reader | 34.4 → 21.9 | 67.9 → 43.2 |
| Stats | 154.2 → 168.1 | 200.1 → 206.2 |
| Scheduled review | 398.2 → 82.5 | 449.4 → 120.7 |

Initial card and stats route measurements did not improve in this run; the card fix targets repeated answers and lifecycle behavior. The initial list still takes time to sort, but yields so input can be handled during that work.

- Eight card advances: storage writes **16 → 8**, live selection listeners after the route/advance sequence **21 → 1**. Screen and mascot identity changed before; both are preserved after.
- Reader typing: observed keydown durations **240–336 ms → 16–120 ms**. Event Timing only reports entries at or above the configured 16 ms threshold.
- Longest observed main-thread task in the complete scripted run: **3,224 ms → 390 ms**. Long tasks remain; this is not a zero-jank claim.
- First reader submission (3,600 characters): **180.1 ms → 142.6 ms**, one sample. Large passage rendering remains a potential optimization target.

Raw captures: [baseline](audits/performance-baseline-2026-10-30.json), [optimized](audits/performance-optimized-2026-10-30.json).

These are local lab measurements, not real-user percentile data or proof of smoothness on every phone. Network startup, rendering thousands of reader tokens, model inference and large saved histories can still create work. Existing audio/model lazy loading and offline behavior remain. No monitoring endpoint or learner telemetry was added.

## Validation

- Unit tests include full-catalog search parity; generator parity ensures shared-core edits are reproducible from the pinned English input.
- `tests/responsiveness_browser.py` covers both Chromium and WebKit: front/answer pinyin, preserved DOM and focus, one save per answer, reload persistence, unchanged schedules, listener cleanup, cancelled navigation gestures, stable/cancelled sorting, scheduler day rollover, bounded handwriting listeners and offscreen animation suspension.
- Existing browser suites cover learning modes, content, curricula, accessibility, speaking capture and model behavior. Cache upgrade and PWA checks cover the new shell version while preserving installed identity and saved progress.
- Timing thresholds are not hard-coded into shared CI; correctness/lifetime invariants are. Measurements are reproducible separately so shared-runner noise cannot turn a valid change into a flaky release gate.

The local Windows run passed the unit/content checks, generator parity, cache/PWA checks, 40 end-to-end checks, offline/curriculum/learner UX suites, both responsiveness suites and three model-parity fixtures on each browser. The 200 sampled mascot poses produced identical SVG paths before/after the geometry optimization. [Local learner UX results](audits/learner-ux-windows-2026-10-30.json) distinguish tested behavior from unavailable capture: this Windows WebKit build did not expose usable microphone capture, so it exercised the unsupported path; simulated capture was tested on Chromium. Physical microphones and real iPhones were not tested.

## Primary references and decisions

- [Google/web.dev: Optimize INP](https://web.dev/articles/optimize-inp), updated 2025-09-02. Measure interaction work and rendering together; lab profiling does not establish the real-user 75th-percentile INP.
- [Google/web.dev: Optimize long tasks](https://web.dev/articles/optimize-long-tasks), updated 2024-12-19. Remove redundant work first, then yield in necessary long computations. Applied to index preparation and cancellable list sorting.
- [Google/web.dev: Avoid large layouts and layout thrashing](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing). Keep DOM work bounded and preserve existing elements where possible.
- [Google/web.dev: High-performance CSS animations](https://web.dev/articles/animations-guide). Preserve transform/opacity card transitions and avoid restarting the entire view animation for each answer.
- [MDN: Intl.Collator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator). Reuse one locale-sensitive comparator per list; preserve the existing locale-based ordering and stable ties.
- [Hanzi Writer API](https://hanziwriter.org/docs.html). Use documented lifecycle operations; the bundled implementation was also inspected for its document listeners and cancellation behavior.

These techniques were selected for measured bottlenecks in this application. This audit does not claim a new learning-method result, a pronunciation-model upgrade, or a universal “SOTA” performance ranking.
