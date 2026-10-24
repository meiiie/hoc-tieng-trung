# Word lifecycle and scheduling rules

Ported from the English app (meiiie/hoc-tu-vung `docs/LIFECYCLE.md`, `srs.js`), with one stricter rule.

## The rule
**Only "Ôn theo lịch" changes a card's schedule.** In code, `CORE.rate()` is the only function that writes `D.srs[id]`, and it is called only from the review screen. Thẻ ghi nhớ, Luyện nói, Viết chữ and Danh sách từ call `CORE.practice()`, which appends to `D.ev[id]` (evidence) and never reads or writes `D.srs`. Unlike the English app, failures in practice do **not** bring a card forward: the scheduled path is the single source of truth. Tests: `tests/core.test.js` ("practice never touches srs") and `tests/e2e.py` (byte-identical `srs` before and after using every practice mode).

Two card-management actions are not ratings: "Tạm ngưng thẻ" (suspend, on the review screen, with Undo) and "Mở lại thẻ" (unsuspend, in the word sheet). Both are Anki browser actions.

## Scheduler (Anki-like)
FSRS-6 via ts-fsrs 5.4.2, desired retention 90% by default (80–95% in Settings). Learning steps 1 m, 10 m; relearning 10 m; 4 am day boundary; Anki fuzz and load balancing; leech at 8 lapses (auto-suspend, alert every 4 more). `srs.js` is copied unchanged from the English app and its 23 tests (including step-by-step equality with the reference ts-fsrs) run here.

Queue order (`CORE.queue`): due learning cards (learn-ahead 20 min), then due reviews (most overdue relative to interval first), then new cards in list order, up to the daily new limit (default 20). Buttons: Lại / Khó / Được / Dễ with interval previews; Space = Được, 1–4, Z = undo; swipe left = Lại, swipe right = Được (only after the answer is shown).

## States
Mới, Đang học, Học lại, Đang ôn, Thành thạo (review with stability ≥ 21 days), Tạm ngưng.

## Level unlock
HSK 1 is open. HSK n+1 opens automatically when **80% of HSK n words have graduated**, meaning they left the learning steps into Review at least once (state Review or Relearning). Graduation requires a correct recall on a later spaced attempt, so merely seeing a word does not count. 80% (not 100%) avoids being blocked by a few leeches. "Mở sớm" in Settings opens the next level manually (two taps), for learners who already know it. Unlocking never changes any card.

## Data safety
- Storage key `htt`, field `v` = schema version (now 2). `CORE.migrate` runs numbered steps that only add or reshape fields; it never deletes `srs`, `revlog` or `ev`, and it leaves data from a newer schema untouched.
- Before migrating, the raw old record is copied to `htt-pre-v<n>`. A daily backup is kept in `htt-bak`. A record that fails to parse is moved to `htt-corrupt-<time>` and the backup is restored.
- The service worker never touches localStorage; a new version waits until the user taps "Tải lại".
- Settings > Sao lưu / Khôi phục exports and imports JSON (the current data is saved to `htt-before-import-<time>` first).
