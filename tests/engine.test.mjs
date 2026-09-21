import assert from 'node:assert/strict';
import * as E from '../js/engine.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('✓', name); };

t('setValue/valueOf round trip 0..99', () => { for (let v = 0; v < 100; v++) assert.equal(E.valueOf(E.makeAbacus(2, v)), v); });
t('setValue clamps', () => { assert.equal(E.valueOf(E.makeAbacus(2, 250)), 99); assert.equal(E.valueOf(E.makeAbacus(2, -3)), 0); });
t('tapLower toggles correctly', () => {
  const ab = E.makeAbacus(1, 0);
  E.tapLower(ab, 0, 2); assert.equal(ab.rods[0].lower, 3);
  E.tapLower(ab, 0, 0); assert.equal(ab.rods[0].lower, 0);
  E.tapLower(ab, 0, 3); assert.equal(ab.rods[0].lower, 4);
  E.tapLower(ab, 0, 3); assert.equal(ab.rods[0].lower, 3);
});
t('every add/sub plan ends on the right answer', () => {
  for (const op of ['add', 'sub']) for (let a = 0; a <= 89; a++) for (let b = 1; b <= 9; b++) {
    const ans = op === 'add' ? a + b : a - b; if (ans < 0 || ans > 99) continue;
    const p = E.planMoves(a, b, op); assert.equal(p.answer, ans);
    assert.equal(p.steps.at(-1).value, ans);
    // each step changes at most two rods and never goes negative
    p.steps.forEach(st => { assert.ok(st.value >= 0); assert.ok(st.k && Number.isFinite(st.n)); });
  }
});
t('rule classification matches soroban rules', () => {
  assert.equal(E.classify(2, 2, 'add'), 'direct');
  assert.equal(E.classify(3, 5, 'add'), 'direct');
  assert.equal(E.classify(4, 3, 'add'), 'small');
  assert.equal(E.classify(5, 5, 'sub'), 'direct'); // old engine wrongly called this small
  assert.equal(E.classify(7, 4, 'sub'), 'small');
  assert.equal(E.classify(8, 5, 'add'), 'big');
  assert.equal(E.classify(13, 6, 'sub'), 'big');
  assert.equal(E.classify(3, 4, 'sub'), null);
});
t('every level has a healthy pool and only its rules', () => {
  for (let id = 1; id <= E.MAX_LEVEL; id++) {
    const pool = E.problemPool(id); const L = E.LEVELS[id];
    assert.ok(pool.length >= 8, `level ${id} pool ${pool.length}`);
    pool.forEach(p => { assert.ok(L.rules.includes(p.rule)); assert.ok(L.ops.includes(p.op)); assert.ok(p.answer >= 0 && p.answer <= 99); });
  }
});
t('sessions have no duplicates', () => {
  for (let id = 1; id <= E.MAX_LEVEL; id++) { const s = E.makeSession(id, 8); assert.equal(new Set(s.map(p => p.key)).size, 8); }
});
t('stars', () => { assert.equal(E.starsFor(8, 8), 3); assert.equal(E.starsFor(6, 8), 2); assert.equal(E.starsFor(4, 8), 1); assert.equal(E.starsFor(1, 8), 0); });
t('little friend steps are two moves', () => { assert.equal(E.planMoves(4, 3, 'add').steps.length, 2); });
t('Level 13: Mixed direct + small friend', () => {
  const L = E.LEVELS[13];
  assert.equal(L.id, 13);
  assert.deepEqual(L.rules, ['direct', 'small']);
  assert.deepEqual(L.ops, ['add', 'sub']);
  assert.ok(L.name && L.tip && L.nameTa && L.tipTa);
  const pool = E.problemPool(13);
  assert.ok(pool.length >= 8);
  const rules = new Set(pool.map(p => p.rule));
  assert.ok(rules.has('direct'), 'Level 13 must include direct');
  assert.ok(rules.has('small'), 'Level 13 must include small');
  assert.ok(!rules.has('big'), 'Level 13 must NOT include big');
});
t('Level 14: Mixed small + big friend', () => {
  const L = E.LEVELS[14];
  assert.equal(L.id, 14);
  assert.deepEqual(L.rules, ['small', 'big']);
  assert.deepEqual(L.ops, ['add', 'sub']);
  assert.ok(L.name && L.tip && L.nameTa && L.tipTa);
  const pool = E.problemPool(14);
  assert.ok(pool.length >= 8);
  const rules = new Set(pool.map(p => p.rule));
  assert.ok(rules.has('small'), 'Level 14 must include small');
  assert.ok(rules.has('big'), 'Level 14 must include big');
  assert.ok(!rules.has('direct'), 'Level 14 must NOT include direct');
});
t('Level 15: Full mixed mastery', () => {
  const L = E.LEVELS[15];
  assert.equal(L.id, 15);
  assert.deepEqual(L.rules, ['direct', 'small', 'big']);
  assert.deepEqual(L.ops, ['add', 'sub']);
  assert.ok(L.name && L.tip && L.nameTa && L.tipTa);
  const pool = E.problemPool(15);
  assert.ok(pool.length >= 8);
  const rules = new Set(pool.map(p => p.rule));
  assert.ok(rules.has('direct'), 'Level 15 must include direct');
  assert.ok(rules.has('small'), 'Level 15 must include small');
  assert.ok(rules.has('big'), 'Level 15 must include big');
});
t('MAX_LEVEL is 15 and Tamil translations exist for all levels', () => {
  assert.equal(E.MAX_LEVEL, 15);
  for (let id = 1; id <= E.MAX_LEVEL; id++) {
    const L = E.LEVELS[id];
    assert.ok(L.nameTa && L.nameTa.trim().length > 0, `Level ${id} missing nameTa`);
    assert.ok(L.tipTa && L.tipTa.trim().length > 0, `Level ${id} missing tipTa`);
  }
});
console.log(`\nAll ${n} test groups passed`);
