"""Reading equivalence allowed when joining a syllabus to historical cards."""
import re
import unicodedata

PDF_SHA = 'ec74ce0439e837bbb15154be13e747ae798903b2fd3a331629df6c3b45504941'


def norm(value):
    return re.sub(r"[\s'’·-]", '', unicodedata.normalize('NFC', value)).lower()


def sandhi(numeric, word):
    syllables = numeric.lower().replace('u:', 'ü').split()
    for i in range(len(syllables)-1):
        if i < len(word) and word[i] == '不' and syllables[i] == 'bu4' and syllables[i+1].endswith('4'):
            syllables[i] = 'bu2'
        elif i < len(word) and word[i] == '一' and syllables[i] == 'yi1' and (i == 0 or word[i-1] != '第'):
            if syllables[i+1].endswith('4'):
                syllables[i] = 'yi2'
            elif syllables[i+1][-1] in '123':
                syllables[i] = 'yi4'
    return ' '.join(syllables)
