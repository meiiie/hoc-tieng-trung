const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const sourceDir = process.argv[2];
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const present = value => typeof value === 'string' && value.trim().length > 0;
const meta = read(path.join(root, 'data/meta.json'));
const chars = read(path.join(root, 'data/chars.json'));
const all = [];
const levels = [];
const missingVietnamese = [];
const missingAudio = [];
const requiredFieldIssues = [];
const sourceComparison = [];

for (const level of [1,2,3,4,5,6,7,'-extra']) {
  const file = path.join(root, `data/hsk${level}.json`);
  const words = read(file);
  const audio = { f: 0, m: 0 };
  for (const [index, word] of words.entries()) {
    all.push({ level, index, ...word });
    for (const field of ['id', 's', 't', 'p', 'n']) {
      if (!present(word[field])) requiredFieldIssues.push({ level, id: word.id, field });
    }
    if (!present(word.v)) missingVietnamese.push({ level, id: word.id, simplified: word.s, pinyin: word.p, english: word.m });
    if (word.a) {
      for (const voice of ['f', 'm']) {
        const relative = `audio/${word.a.replace('{voice}', voice)}`;
        if (fs.existsSync(path.join(root, relative))) audio[voice]++;
        else missingAudio.push({ id: word.id, path: relative });
      }
    }
  }
  const identities = words.map(w => w.id);
  levels.push({
    level: level === 7 ? '7-9' : String(level),
    count: words.length,
    metadataCount: level==='-extra'?meta.supplementalCards:meta.levels[level].count,
    vietnamese: words.filter(w => present(w.v)).length,
    partOfSpeech: words.filter(w => present(w.pos)).length,
    hanViet: words.filter(w => present(w.hv)).length,
    hanVietMarkedReference: words.filter(w => w.hvq).length,
    examples: words.filter(w => present(w.ex)).length,
    recordedAudioFiles: audio,
    fileSha256: hash(fs.readFileSync(file)),
    orderedIdsSha256: hash(JSON.stringify(identities)),
    audioMappingSha256: hash(JSON.stringify(words.map(w => [w.id, w.a])))
  });
  if (sourceDir && level!=='-extra') {
    const sourceFile = path.resolve(sourceDir, `${level}.json`);
    const source = read(sourceFile);
    const expected = source.map(w => `${w.simplified}|${w.forms[0].transcriptions.numeric.replace(/ /g, '')}`);
    const existing = new Set(identities);
    const expectedSet = new Set(expected);
    sourceComparison.push({
      level, sourceCount: source.length, shippedCount: words.length,
      sourceSha256: hash(fs.readFileSync(sourceFile)),
      idsAndOrderMatch: JSON.stringify(expected) === JSON.stringify(identities),
      missingIds: expected.filter(id => !existing.has(id)),
      extraIds: identities.filter(id => !expectedSet.has(id))
    });
  }
}

const duplicates = key => {
  const groups = new Map();
  for (const word of all) {
    const value = key(word);
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push({ level: word.level, id: word.id });
  }
  return [...groups].filter(([, entries]) => entries.length > 1).map(([key, entries]) => ({ key, entries }));
};
const usedChars = [...new Set(all.flatMap(w => [...w.s, ...w.t]))].sort();
const missingStrokes = usedChars.filter(c => !fs.existsSync(path.join(root, `data/strokes/${c}.json`)));
const missingCharInfo = usedChars.filter(c => !chars[c]);
const duplicateIds = duplicates(w => w.id);
const numericPinyinReview = all.filter(w => w.n.split(/\s+/).some(s => !/^[a-zü:]+[1-5]$/i.test(s)))
  .map(w => ({ level: w.level, id: w.id, pinyin: w.p, numeric: w.n }));
const report = {
  scope: 'Read-only inventory of shipped data. Optional source comparison is against supplied source JSON files, not an official HSK completeness certification.',
  declaredSource: meta.source,
  totals: {
    words: all.length, uniqueIds: new Set(all.map(w => w.id)).size,
    uniqueSimplified: new Set(all.map(w => w.s)).size,
    vietnamese: all.filter(w => present(w.v)).length,
    missingVietnamese: missingVietnamese.length,
    partOfSpeech: all.filter(w => present(w.pos)).length,
    hanViet: all.filter(w => present(w.hv)).length,
    hanVietMarkedReference: all.filter(w => w.hvq).length,
    examples: all.filter(w => present(w.ex)).length,
    usedCharacters: usedChars.length, charactersWithStrokes: usedChars.length - missingStrokes.length,
    charactersWithInfo: usedChars.length - missingCharInfo.length,
    recordedAudioFiles: levels.reduce((n, l) => n + l.recordedAudioFiles.f + l.recordedAudioFiles.m, 0),
    displayedReadingDiffersFromId: all.filter(w => w.id !== `${w.s}|${w.n.replace(/ /g, '')}`).length,
    numericPinyinNeedsReview: numericPinyinReview.length
  },
  levels, requiredFieldIssues, duplicateIds,
  duplicateSimplified: duplicates(w => w.s),
  duplicateDisplayedReadings: duplicates(w => `${w.s}|${w.n.toLowerCase().replace(/\s/g, '').replace(/u:|ü/g, 'v')}`),
  missingVietnamese, numericPinyinReview, missingAudio, missingStrokes, missingCharInfo,
  sourceComparison
};
console.log(JSON.stringify(report, null, 2));
if (requiredFieldIssues.length || duplicateIds.length || missingAudio.length ||
    levels.some(l => l.count !== l.metadataCount) ||
    sourceComparison.some(l => !l.idsAndOrderMatch)) process.exitCode = 1;
