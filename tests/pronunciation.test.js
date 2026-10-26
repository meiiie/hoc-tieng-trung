const assert = require('node:assert/strict');
const {target, feedback} = require('../zh-pronunciation.js');
let count = 0;
const test = (name, fn) => {fn(); count++; console.log('ok', name);};
const request = {syllables: ['ma3'], expected: [3], underlying: [3]};
const result = (change = {}) => ({syl: [{known: true, top: [['ma', .88], ['ba', .04]], pTarget: .88, tone: [.02, .03, .90, .03, .02], ...change}]});
test('confident recognition is a match, without a numerical grade', () => {
  const f = feedback(request, result())[0]; assert.equal(f.state, 'matched'); assert.equal(f.match, true); assert.equal(f.score, undefined);
});
test('uncertain recognition never becomes a pass or a failure', () => {
  const f = feedback(request, result({top: [['ma', .5], ['ba', .4]]}))[0]; assert.equal(f.state, 'unclear'); assert.equal(f.segOk, null);
});
test('wrong strong syllable offers comparison, not a tone judgment on the wrong sound', () => {
  const f = feedback(request, result({top: [['ba', .9], ['ma', .04]], pTarget: .04}))[0]; assert.equal(f.state, 'compare'); assert.equal(f.match, null);
});
test('uncertain tone stays inconclusive even with a recognised syllable', () => {
  const f = feedback(request, result({tone: [.1, .35, .4, .1, .05]}))[0]; assert.equal(f.state, 'unclear'); assert.equal(f.match, null);
});
test('neutral tone has no automatic tone verdict', () => {
  const f = feedback({...request, expected: [5]}, result())[0]; assert.equal(f.state, 'syllable'); assert.equal(f.match, null);
});
test('surface tone, not spelling tone, is compared', () => {
  const f = feedback({...request, expected: [2]}, result({tone: [.02, .9, .03, .03, .02]}))[0]; assert.equal(f.state, 'matched'); assert.equal(f.underlying, 3);
});
test('unknown vocabulary and erhua abstain', () => {
  assert.equal(feedback(request, result({known: false}))[0].state, 'unsupported');
  assert.equal(feedback({...request, erhua: true}, result())[0].state, 'unsupported');
});
test('u and ü collisions are not silently normalised', () => {
  for (const n of ['lu4', 'nu3', 'lu:4', 'nü3', 'lv4', 'nv3']) assert.equal(target(n), null);
  assert.equal(target('ju4'), 'ju'); assert.equal(target('er2'), 'er');
});
test('missing, corrupt and blank model results abstain', () => {
  for (const r of [null, {syl: []}, result({pTarget: NaN}), result({tone: [1]}), result({top: [['', .9], ['ma', .01]]}), result({tone: [.9,.9,.9,.9,.9]})]) assert.equal(feedback(request, r)[0].state, 'unclear');
});
console.log(`${count} pronunciation tests passed`);
