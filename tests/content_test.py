import copy
import json
import runpy
import sys
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from content import ROOT, audio_path, audio_template, catalog, enrich, read_json, short_gloss, tone_marks, validate


class CatalogContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.legacy = read_json(ROOT / 'data/sources/legacy-index.json')
        cls.fixes = read_json(ROOT / 'data/sources/corrections.json')

    def enriched(self):
        return enrich(copy.deepcopy(catalog()), self.legacy, self.fixes)

    def test_audio_resume_after_clone_uses_published_manifest(self):
        load = runpy.run_path(str(ROOT / 'tools/generate-audio.py'))['load_receipts']
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            manifest = root / 'data/sources/audio-assets.jsonl'
            manifest.parent.mkdir(parents=True)
            published = {'path':'audio/generated/f/a.mp3', 'sha256':'published'}
            manifest.write_text(json.dumps(published)+'\n', encoding='utf-8')
            self.assertEqual(load(root), {published['path']:published})
            cache = root / '.cache'
            cache.mkdir()
            repaired = {**published, 'sha256':'repaired'}
            (cache / 'audio-receipts-0.jsonl').write_text(json.dumps(repaired)+'\n{"path":', encoding='utf-8')
            self.assertEqual(load(root), {repaired['path']:repaired})

    def test_corrupt_audio_journal_middle_is_not_silently_accepted(self):
        read = runpy.run_path(str(ROOT / 'tools/generate-audio.py'))['read_receipts']
        with tempfile.TemporaryDirectory() as folder:
            journal = Path(folder) / 'receipts.jsonl'
            journal.write_text('{broken}\n'+json.dumps({'path':'valid'})+'\n', encoding='utf-8')
            with self.assertRaises(json.JSONDecodeError):
                read(journal)

    def test_all_levels_have_vietnamese_and_numbered_pinyin(self):
        self.assertEqual(validate(self.enriched(), self.legacy)['vietnamese'], 12387)

    def test_rerunning_and_reordering_preserve_ids_and_audio(self):
        once = self.enriched()
        self.assertEqual(enrich(copy.deepcopy(once), self.legacy, self.fixes), once)
        shuffled = {l: list(reversed(ws)) for l, ws in copy.deepcopy(once).items()}
        twice = enrich(shuffled, self.legacy, self.fixes)
        paths = lambda data: {w['id']: w['a'] for ws in data.values() for w in ws}
        self.assertEqual(paths(twice), paths(once))

    def test_silent_loss_of_progress_identity_is_rejected(self):
        data = catalog()
        data['1'].pop()
        with self.assertRaisesRegex(ValueError, 'Legacy progress IDs removed'):
            enrich(data, self.legacy, self.fixes)

    def test_supplemental_progress_identity_is_also_preserved(self):
        data = catalog()
        data['-extra'].pop()
        with self.assertRaisesRegex(ValueError, 'Legacy progress IDs removed'):
            enrich(data, self.legacy, self.fixes)

    def test_misspelled_correction_id_is_rejected(self):
        fixes = copy.deepcopy(self.fixes)
        fixes['entries']['nonexistent'] = {'v': 'sai'}
        with self.assertRaisesRegex(ValueError, 'unknown IDs'):
            enrich(catalog(), self.legacy, fixes)

    def test_pronunciation_fix_preserves_legacy_progress_key(self):
        w = next(w for w in self.enriched()['7'] if w['s'] == '定为')
        self.assertEqual(w['id'], '定为|ding4wei4')
        self.assertEqual(w['n'], 'ding4 wei2')
        self.assertEqual(w['p'], 'dìng wéi')

    def test_audio_cannot_escape_asset_directory(self):
        with self.assertRaises(ValueError):
            audio_path(ROOT, {'id': 'bad', 'a': '../{voice}/test.mp3'}, 'f')

    def test_audio_override_changes_only_affected_word_address(self):
        word = {'id':'fixture', 's':'胡', 'n':'hu2'}
        other = {'id':'other', 's':'湖', 'n':'hu2'}
        before = audio_template(word), audio_template(other)
        with patch('content.audio_overrides', return_value={'fixture':{'f':{'voice':'zf_006','carrier':'listen'}}}):
            self.assertNotEqual(audio_template(word), before[0])
            self.assertEqual(audio_template(other), before[1])
            selected = audio_template(word)
        with patch('content.audio_overrides', return_value={'fixture':{'f':{'voice':'zf_006','carrier':'listen','reason':'Clarified review note'}}}):
            self.assertEqual(audio_template(word), selected)

    def test_unknown_audio_override_does_not_silently_do_nothing(self):
        with patch('content.audio_overrides', return_value={'nonexistent':{'f':{'voice':'zf_006','carrier':'listen'}}}):
            with self.assertRaisesRegex(ValueError, 'Audio override references unknown IDs'):
                enrich(catalog(), self.legacy, self.fixes)

    def test_import_never_cuts_a_definition_in_the_middle(self):
        with self.assertRaisesRegex(ValueError, 'do not truncate'):
            short_gloss('Một lời giải thích rất dài ' * 6)
        self.assertEqual(short_gloss('nghĩa ngắn; ' + 'nghĩa bổ sung ' * 8), 'nghĩa ngắn')
        self.assertEqual(short_gloss('mô tả dài ' * 15, approved='nghĩa đã biên tập'), 'nghĩa đã biên tập')

    def test_displayed_pinyin_and_traditional_form_follow_the_taught_sense(self):
        self.assertEqual(tone_marks('lüe4'), 'lüè')
        self.assertEqual(tone_marks('ng4'), 'ǹg')
        self.assertEqual(tone_marks('Ao4 yun4 hui4'), 'Ào yùn huì')
        word = next(w for w in self.enriched()['1'] if w['s'] == '干')
        self.assertEqual((word['id'], word['n'], word['t']), ('干|gan1', 'gan4', '幹'))

    def test_cross_reference_check_allows_a_real_vietnamese_definition(self):
        data = self.enriched()
        data['1'][0]['v'] = 'biến thể'
        validate(data, self.legacy)
        data['1'][0]['v'] = 'biến thể của 名牌'
        with self.assertRaisesRegex(ValueError, 'cross-reference-only'):
            validate(data, self.legacy)


class CurriculumContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.module = runpy.run_path(str(ROOT / 'tools/build-curricula.py'))
        cls.build = staticmethod(cls.module['build'])

    def test_tracked_inputs_reproduce_both_editions(self):
        extra, curricula = self.build()
        self.assertEqual(extra, read_json(ROOT / 'data/hsk-extra.json'))
        self.assertEqual(curricula, read_json(ROOT / 'data/curricula.json'))

    def fail_with_input(self, name, mutate, message):
        def altered(path):
            data = read_json(path)
            if path.name == name:
                mutate(data)
            return data
        with patch.dict(self.build.__globals__, {'read_json':altered}):
            with self.assertRaisesRegex(ValueError, message):
                self.build()

    def test_missing_official_row_is_rejected(self):
        self.fail_with_input('cti-syllabus-2025.json', lambda d:d['rows'].pop(), 'Incomplete official source')

    def test_unreviewed_source_edition_is_rejected(self):
        self.fail_with_input('cti-syllabus-2025.json', lambda d:d.update(sha256='other'), 'Source edition drift')

    def test_wrong_polyphone_cannot_pass_by_updating_both_join_readings(self):
        def wrong(d):
            row = next(r for r in d['rows'] if r['cards'][0]['n'] == 'dei3')
            row['cards'][0].update(n='de5', cardReading='de5', id='得|de5')
        self.fail_with_input('cti-joins-2026-10-26.json', wrong, 'Source pronunciation coverage drift')

    def test_matching_syllabus_text_cannot_hide_wrong_card_reading(self):
        def wrong(d):
            row = next(r for r in d['rows'] if r['cards'][0]['n'] == 'dei3')
            row['cards'][0].update(cardReading='de5', id='得|de5')
        self.fail_with_input('cti-joins-2026-10-26.json', wrong, 'Incompatible polyphonic card')


if __name__ == '__main__':
    unittest.main()
