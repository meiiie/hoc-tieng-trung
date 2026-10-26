# Học Tiếng Trung – HSK 3.0

Live: https://meiiie.github.io/hoc-tieng-trung/

Application version: **5.0.0** · [Release notes](CHANGELOG.md) · content release: 2026-10-26.

A Vietnamese-language PWA for Chinese vocabulary, running on the same Neko core and UI as the English app Học Từ Vựng v17.

## Modes and data

- **Modes:** Ôn theo lịch (FSRS, the only mode that changes schedules), Thẻ ghi nhớ, Học, Ghép thẻ, Nghe – chép, Kiểm tra, Luyện nói (record/replay, optional conservative recognition), Viết chữ, Danh sách từ, Đọc đoạn tự chọn, Chọn cách học, Thống kê, Cài đặt.
- **Curricula:** choose the 2021 list (10,969 cards) or the 2025/2026 examination syllabus (all 11,000 source rows mapped to 10,960 distinct cards). Their union contains 12,387 cards. Every level is open; 7–9 remains one band. Switching editions preserves progress and notes.
- **Coverage:** Vietnamese glosses and female/male word audio for every card; metadata and stroke data for all 4,304 used characters. Complete fields do not certify every sense or pronunciation; independent bilingual/native review and full bilingual example coverage remain outstanding.
- **Chinese options:** simplified or traditional (header chip), pinyin on or off, Hán Việt, radicals.

## Learner UX and speaking (27 October 2026)

Plain interactive pinyin, a simpler private reader, the shared Neko logo and PWA/search metadata. Speaking shows the real microphone signal, supports cancellation and self-comparison, and gives optional recognition hints without unvalidated numerical grades. Existing progress is preserved. See [research, decisions and limits](docs/LEARNER-UX-SPEECH-2026-10-27.md).

## Docs

- `docs/EDUCATION-RESEARCH-2026-10-26.md`: university/textbook research, empirical evidence, limits and decisions supporting learner choice.
- `docs/EDUCATION-DELIVERY-2026-10-26.md`: final dual-curriculum delivery, checks and remaining limits.
- `docs/CONTENT-DELIVERY-RESULT-2026-10-26.md`: kết quả bổ sung, kiểm thử và giới hạn còn lại.

- `docs/CONTENT-PIPELINE.md`: nhập dữ liệu theo ID, nguồn nghĩa, audio có phiên bản, kiểm tra và phát hành.
- `docs/DATA-DELIVERY-2026-10-26.md`: thiết kế, nghiên cứu và nguyên tắc pstack đã áp dụng.
- `docs/RESEARCH-DATA-2026-10-26.md`: nghiên cứu đến 26-10-2026, thử nghiệm audio và giới hạn của việc kiểm tra bằng ASR.
- `docs/PROJECT-AUDIT-2026-10-26.md`: kiến trúc, thuật toán học, kiểm kê dữ liệu và kế hoạch chuẩn bị HSK 1–9; phân biệt bộ hiện tại với đề cương HSK mới.
- `docs/ECOSYSTEM.md`: shared core, hooks, migration and the plan for the English repo.
- `docs/VIETNAMESE.md`: meaning sources and quality checks.
- `docs/PRONUNCIATION-ZH.md`: historical model experiments; the 27 October UX/speech document supersedes the old grading behavior.
- `docs/APPS.md`: reference apps and open source.
- `docs/RESEARCH.md`: HSK lists, stroke licences and iPhone TTS.
- `docs/LIFECYCLE.md`: card lifecycle.

## Tests

    npm install
    npm test
    python -X utf8 tests/content_test.py
    python -X utf8 tools/build-curricula.py --check
    python -X utf8 tools/verify-content.py --decode

Run the local server (including on Windows):

    python tools/serve.py

In a second terminal, after installing Python Playwright and its browsers:

    python -m pip install playwright
    python -m playwright install chromium webkit
    python -X utf8 tests/e2e.py http://127.0.0.1:8931/ all
    python -X utf8 tests/model_parity.py http://127.0.0.1:8931/ all
    python -X utf8 tests/content_browser.py http://127.0.0.1:8931/
    python -X utf8 tests/curricula_browser.py http://127.0.0.1:8931/
    python -X utf8 tests/cache_upgrade.py

The server explicitly serves `.mjs` as JavaScript so the pronunciation model can load on Windows. Tests use Playwright's bundled Chromium; set `CHROMIUM_EXECUTABLE` to use another installed Chromium. Accessibility checks use the installed `axe-core` dependency; set `AXE` to override its path.

Read-only data inventory:

    node tools/audit-hsk.cjs

An optional first argument points to the pinned source directory containing `1.json` through `7.json`, to compare IDs and their order.

## Licences

The code is MIT. Data licences are listed in `data/` and in the settings credits:
- complete-hsk-vocabulary: MIT
- CC-CEDICT and CVDICT: CC BY-SA 4.0
- Kai Hanzi: CC BY 4.0
- Make Me a Hanzi: Arphic PL / LGPL
- Unihan: Unicode licence
- Kokoro v1.1-zh model: Apache-2.0; generated-audio provenance is recorded separately from legacy Microsoft audio. See `docs/CONTENT-PIPELINE.md`.
