# Neko ecosystem: one core, one adapter per language

Since 2026-10-24 this app runs on the same UI core as the English app (Học Từ Vựng v17, meiiie/hoc-tu-vung). The Chinese part is data plus an adapter.

## Files

| File | Role |
|---|---|
| `core/app-core.js` | Generated from English `app.js` v17 by `tools/make-core.py`. Router, views, card gestures, scheduler calls, sessions, lifecycle, stats, backups, service-worker update prompt. |
| `core/style.css`, `core/mascot.js`, `core/speech.js` | Copied byte for byte from English v17: design tokens, Neko mascot, mic capture (record/trim/resample/WAV/pitch/envelope). |
| `srs.js`, `vendor/ts-fsrs.min.js` | The same FSRS-6 scheduler as English. |
| `lang-zh.js`, `lang-zh.css` | Chinese adapter: HSK data, unlocking, pinyin, hanzi answers, simplified/traditional, tone-based speaking, stroke-order writing, migration from the old v2 app. |
| `tones.js` | On-device F0 tone model (see PRONUNCIATION-ZH.md). |

## How the core is made

`tools/make-core.py` applies about 60 exact string replacements to English `app.js`. It asserts that each one matches exactly once, so a changed upstream file fails loudly instead of drifting. Each replacement only adds a check such as `LANG.x ? LANG.x(...) : <original code>`. When `window.LANG` is not set, every branch runs the original v17 code.

Regenerate it with:

    python3 tools/make-core.py ../hoc-tu-vung/app.js > core/app-core.js

### Proof of equivalence

1. A copy of the English repo was made with `app.js` replaced by `core/app-core.js`, and no `LANG` set.
2. The English accessibility and route test (`tests/axe7.py`) was run against it. The test covers 14 routes and sheets in light and dark themes.
3. Result: 0 axe violations and 0 page errors, the same as the original app.

## Hooks (window.LANG)

**Storage**
- `key`, `audioCache`, `app`: the storage key, audio cache name and export name.
- `setDefaults`: default settings.
- `legacy(get)`: imports progress from an older key. The old key is never changed.
- `importAny`: reads backup files from older versions.

**Data**
- `loadData()`: returns `{pages, words}`.
- `inDeck(w)`: decides which words are in the deck. Chinese uses it for level locking.
- `levels`, `levelName`, `lvOrder`: the level labels and their order.

**Answers**
- `answerText`, `norm`, `accepts`, `cloze`, `search`: how typed answers and searches are matched.

**Audio**
- `aurl(w, kind, voice)`: the audio file URL.
- `play(w, kind, opt)`: returns `true` when the adapter handles playback, for example with device TTS.
- `audioUrls()`: the files for the offline download.

**Display**
- `frontFace`, `backFace`, `wordExtra`, `ipaOf`: card faces, the extra block in the word sheet, and the pronunciation line.
- `chip.paint`, `chip.click`: the header chip. English uses it for UK/US, Chinese for 简/繁.
- `voices`, `settingsTop(seg)`, `settingsPron(seg)`, `bindSettings`, `credits`: the settings screen.
- `typePrompt`, `listenPrompt`, `matchWhat`, `reversePrompt`, `searchPrompt`, `planTitle`, `planSub`, `title`: interface text.

**Modes**
- `modes`, `routes`, `keys`: extra modes, their screens and keyboard shortcuts.
- `speak`: replaces the speaking mode.
- `onHome`, `homeChips`, `bindHome`, `boot`, `onTheme`: lifecycle hooks.

**Schedule**
- `bringForward: false`: practice never moves a due date. Only "Ôn theo lịch" changes schedules. English keeps its v16 behaviour, where a failed recall during practice brings the card forward one day.

## Storage and migration

| Key | Owner | Contents |
|---|---|---|
| `htt` | Old Chinese app v1/v2 | Read once and never changed or deleted. |
| `htt-core` | This app | Core schema 8. |
| `htt-core-bak` | This app | Daily backup. |
| `htv2` | English app | Separate key. Neither app touches the other's data. |

Mapping from v2 to the core record:

| v2 field | Core field |
|---|---|
| `srs` | Copied unchanged. Same SRS card format. |
| `revlog [id,r,t,prev]` | `[t,id,r,0,0]` |
| `ev [mode,ok,t]` | `[t,code,ok]` |
| `unlocked` | `zhUnl` |
| `set.newPerDay` | `user.goal` |
| `set.pinyin` | `set.py` |
| `set.script` | Kept. |
| `theme`, `retention`, `autoplay`, `haptics` | Kept. |

Tests:
- Unit tests: `tests/lang-zh.test.js`.
- Browser tests in Chromium and WebKit: `tests/e2e.py`. They check that the old record is untouched, the srs is copied exactly, and unlocks and evidence survive.

## Plan for the English repo (not done yet; English is untouched)

1. Copy `core/`, `tools/make-core.py` and a `lang-en.js` into hoc-tu-vung. The English adapter would be almost empty, because every hook defaults to the English behaviour.
2. Reverse the direction of the source: `core/app-core.js` becomes the source, English `app.js` is deleted, and English `index.html` loads `core/app-core.js`. Run the full English suite (test_v6/v7, touch, axe, unit tests) before and after on the same fixtures.
3. Move the shared core to its own repo (for example meiiie/neko-core), vendored into each app by tag. Each app pins a core version, so one language never breaks another.
4. Storage keys stay per app and per origin, so no user progress moves.
