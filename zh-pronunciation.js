'use strict';
(function (root) {
  const target = n => {
    const base = String(n).toLowerCase().replace(/[1-5]$/, '').replace(/u:|ü/g, 'v');
    // V6 merges u/ü after n and l; it cannot distinguish either side reliably.
    return /^[a-z]+[1-5]$/i.test(String(n)) && !/^(lv|nv|lu|nu)$/.test(base) ? base : null;
  };
  const probability = x => Number.isFinite(x) && x >= 0 && x <= 1;
  const confident = (values, minimum, margin) => {
    const sorted = [...values].sort((a, b) => b - a);
    return sorted[0] >= minimum && sorted[0] - (sorted[1] || 0) >= margin;
  };
  function feedback({syllables, expected, underlying, erhua = false}, output) {
    return syllables.map((n, k) => {
      const base = target(n), x = output?.syl?.[k];
      const item = {expected: expected[k], underlying: underlying[k], state: 'unclear', segOk: null, match: null, got: null, heard: null};
      if (!base || erhua || x?.known === false) return {...item, state: 'unsupported'};
      if (!x || x.known !== true || !Array.isArray(x.top) || x.top.length < 2 ||
          !x.top.every(p => Array.isArray(p) && typeof p[0] === 'string' && probability(p[1])) ||
          !probability(x.pTarget) || !Array.isArray(x.tone) || x.tone.length !== 5 || !x.tone.every(probability) ||
          Math.abs(x.tone.reduce((a, b) => a + b, 0) - 1) > .03) return item;
      const top = [...x.top].sort((a, b) => b[1] - a[1]);
      if (!top[0][0] || !confident(top.map(p => p[1]), .65, .25)) return item;
      item.heard = top[0][0];
      item.segOk = top[0][0] === base;
      if (!item.segOk) return {...item, state: 'compare'};
      // Neutral tone varies with context. Recognition of the syllable is not tone assessment.
      if (expected[k] === 5) return {...item, state: 'syllable'};
      if (!confident(x.tone, .65, .20)) return item;
      item.got = x.tone.indexOf(Math.max(...x.tone)) + 1;
      item.match = item.got === expected[k];
      return {...item, state: item.match ? 'matched' : 'compare'};
    });
  }
  const api = {target, feedback};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ZhPron = api;
})(globalThis);
