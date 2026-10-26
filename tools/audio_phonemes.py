"""Explicit dictionary readings for Kokoro v1.1-zh, including basic tone sandhi."""
from pypinyin.contrib.tone_convert import to_initials, to_finals
from misaki.zh_frontend import ZH_MAP


def phonemes(word):
    syllables = word['n'].lower().replace('u:', 'ü').replace('v', 'ü').split()
    tones = [int(s[-1]) for s in syllables]
    hanzi = word['s']
    for i in range(len(tones) - 1):
        char = hanzi[i] if i < len(hanzi) else ''
        if char == '不' and tones[i] == 4 and tones[i + 1] == 4:
            tones[i] = 2
        elif char == '一' and tones[i] == 1 and (i == 0 or hanzi[i - 1] != '第'):
            if tones[i + 1] == 4:
                tones[i] = 2
            elif tones[i + 1] in (1, 2, 3):
                tones[i] = 4
    for i in range(len(tones) - 2, -1, -1):
        if tones[i] == tones[i + 1] == 3:
            tones[i] = 2
    result = []
    for syllable, tone in zip(syllables, tones):
        if syllable == 'ng4' and word['s'] == '嗯':
            result.append('ŋ4')
            continue
        if syllable == 'r5':
            if not result:
                raise ValueError(f"Erhua without preceding syllable: {word['id']}")
            result[-1] = result[-1][:-1] + 'R' + result[-1][-1]
            continue
        initial, final = to_initials(syllable, strict=True), to_finals(syllable, strict=True)
        if final == 'i' and initial in ('z', 'c', 's'):
            final = 'ii'
        elif final == 'i' and initial in ('zh', 'ch', 'sh', 'r'):
            final = 'iii'
        if not final or final not in ZH_MAP or (initial and initial not in ZH_MAP):
            raise ValueError(f"Unsupported syllable {syllable}: {word['id']}")
        result.append(ZH_MAP.get(initial, '') + ZH_MAP[final] + str(tone))
    return ''.join(result)
