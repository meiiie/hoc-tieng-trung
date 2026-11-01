# Đi chợ cùng Neko — 1 November 2026

An optional word–picture and listening activity at `#/market`, accessible from the home screen. Eight concrete food/drink entries use existing stable word IDs, Vietnamese meanings, pinyin and recorded audio; each visit samples six distinct targets with four distinct choices each. The group is independent of the HSK filter, as explained in the collapsed help. The game deliberately does not mark words known, write evidence, alter the review schedule, award a proficiency score or impose a timer. Completing a round demonstrates a choice in that round, not durable vocabulary mastery.

## Applying the requested skill

Read [Rossark Motion Skill at 9b20964](https://github.com/rossark0/rossark-motion-skill/tree/9b20964e32f07f8ac7e2948cd175746fa4a7712f), including `SKILL.md` and `MOTION.md`. Applied its web guidance directly; no React Native/SwiftUI dependency or demo artwork is imported. [The local motion notes](../games/MOTION.md) preserve its method and specify project overrides; [the MIT license](../games/ROSSARK-LICENSE) is retained.

The main action is a prop traveling continuously from the chosen item (or released pointer position) to the basket. One-shot travel lasts 280 ms, return 180 ms, with a small arc and the skill's arrival easing. The basket handle has a subtle 3-degree follow-through. Original SVG drawings use a shared 120 × 100 coordinate system. The existing Neko rig supplies a brief acknowledgment; choice buttons remain still. Motion parameters are centralized in `games/market.js`.

The module uses native Web Animations and batches pointer moves with one pending animation frame. It does not run a perpetual game loop, render the whole view each frame, measure layout on every pointer move or add a UI framework. Animations pause out of view, in the background or under a dialog. Leaving the route aborts listeners, disconnects observers, releases capture, cancels animation and stops audio. Reduced motion skips one-shots; direct manipulation still follows the hand.

## Interaction and accessibility

- A single tap and a native button's Enter/Space action produce the same choice as a drop, following [WCAG 2.2 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html). The pictures also have visible Vietnamese names and accessible button names.
- Pointer capture keeps a drag attached to its source; Escape, cancellation, focus loss, scrolling and navigation release it. An outside drop returns the object without counting an answer. The implementation handles tap on pointer release and suppresses the subsequent compatibility click to prevent double answers. See [MDN pointer capture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture).
- Pinyin is initially hidden and revealed with help or an answer, unless disabled in settings. Listening hides the Chinese prompt until help or a correct answer. It has a replay button and a readable fallback when media fails.
- Wrong choices identify the selected object and invite another try. Success retains the answer until the learner explicitly continues. Live feedback, focus placement, touch targets, simplified/traditional script and light/dark themes are included.
- The mechanics provide recognition practice and learner choice. No comparative learning study has been run; this is a product experiment, not a validated improvement in retention.

## Validation and limits

- `npm test`: existing scheduler, catalog, adapter, tone and pronunciation tests plus catalog/audio references and round uniqueness for the game.
- `tests/market_browser.py`: Chromium and WebKit; complete sessions, retries, mouse drag, outside drop, Escape before/after movement, tap, keyboard, native Chromium touch dragging, hints, listening, real media 404, traditional text, pinyin preference, reduced motion during flight, offscreen/modal pause and navigation cleanup. Eight width/theme combinations per browser are audited with axe; a 320 × 668 viewport also checks that the next prompt and action remain visible. Basket slots stay fixed as items are collected. Learning state is compared before/after. [Machine-readable results](audits/market-browser-2026-11-01.json).
- `tests/offline_browser.py`: origin actually stopped, reload served by the worker, reader and game playable on Chromium/WebKit. Uncached audio is not promised offline.
- `tests/cache_upgrade.py`: failed update keeps the old worker; successful update retains progress and unrelated caches, including both new game assets offline. New shell cache `htt-v5.1.0` prevents mixing the new adapter with an older shell.
- Generated core is unchanged and passes parity against the pinned English source. Browser screenshots inspect the initial state, dark theme, in-flight frames and end-of-visit review.

Physical phones, assistive-technology users and classroom effectiveness have not yet been tested. Browser automation and axe do not replace those checks. The existing audio/translation review limits still apply.
