# Học Tiếng Trung – HSK 3.0

Live: https://meiiie.github.io/hoc-tieng-trung/

A Vietnamese-language PWA for Chinese vocabulary, running on the same Neko core and UI as the English app Học Từ Vựng v17.

## Modes and data

- **Modes:** Ôn theo lịch (FSRS, the only mode that changes schedules), Thẻ ghi nhớ, Học, Ghép thẻ, Nghe – chép, Kiểm tra, Luyện nói (per-syllable tones), Viết chữ (stroke order and handwriting quiz), Danh sách từ, Thống kê, Cài đặt.
- **Levels:** HSK 3.0 levels 1-9 (7-9 as one band), 10,969 words. Each level unlocks when 80% of the previous level has graduated.
- **Chinese options:** simplified or traditional (header chip), pinyin on or off, Hán Việt, radicals.

## Docs

- `docs/ECOSYSTEM.md`: shared core, hooks, migration and the plan for the English repo.
- `docs/VIETNAMESE.md`: meaning sources and quality checks.
- `docs/PRONUNCIATION-ZH.md`: tone scoring, measured accuracy and the state of the art.
- `docs/APPS.md`: reference apps and open source.
- `docs/RESEARCH.md`: HSK lists, stroke licences and iPhone TTS.
- `docs/LIFECYCLE.md`: card lifecycle.

## Tests

    npm test
    python3 -m http.server 8931 & python3 tests/e2e.py http://localhost:8931/ all

The e2e suite runs in Chromium and WebKit, with axe checks.

## Licences

The code is MIT. Data licences are listed in `data/` and in the settings credits:
- complete-hsk-vocabulary: MIT
- CC-CEDICT and CVDICT: CC BY-SA 4.0
- Kai Hanzi: CC BY 4.0
- Make Me a Hanzi: Arphic PL / LGPL
- Unihan: Unicode licence
