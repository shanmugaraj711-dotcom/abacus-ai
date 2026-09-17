// Abacus engine — pure, deterministic, no DOM. Soroban with 1 upper (5) bead and 4 lower (1) beads per rod.
// Rods are stored ones-first: rods[0] = ones, rods[1] = tens, ...

export const RULES = { direct: 1, small: 2, big: 3 };
const RULE_NAME = ['', 'direct', 'small', 'big'];

export function makeAbacus(rodCount = 2, value = 0) {
  return setValue({ rods: Array.from({ length: rodCount }, () => ({ upper: false, lower: 0 })) }, value);
}

export function digitOf(rod) { return (rod.upper ? 5 : 0) + rod.lower; }

export function valueOf(ab) {
  return ab.rods.reduce((sum, rod, i) => sum + digitOf(rod) * 10 ** i, 0);
}

export function setValue(ab, value) {
  let n = Math.max(0, Math.floor(Number(value) || 0));
  const max = 10 ** ab.rods.length - 1;
  n = Math.min(n, max);
  ab.rods.forEach((rod, i) => {
    const d = Math.floor(n / 10 ** i) % 10;
    rod.upper = d >= 5;
    rod.lower = d % 5;
  });
  return ab;
}

export function cloneAbacus(ab) { return { rods: ab.rods.map(r => ({ ...r })) }; }

// Tap logic for a lower bead. Beads are indexed 0 (closest to the bar) .. 3 (farthest).
export function tapLower(ab, rodIndex, beadIndex) {
  const rod = ab.rods[rodIndex];
  rod.lower = beadIndex < rod.lower ? beadIndex : beadIndex + 1;
  return ab;
}
export function tapUpper(ab, rodIndex) { ab.rods[rodIndex].upper = !ab.rods[rodIndex].upper; return ab; }

const s = n => (n === 1 ? '' : 's');
const PLACE = ['ones', 'tens', 'hundreds', 'thousands'];

/**
 * Plan the real soroban finger moves for a ± b.
 * Returns { steps:[{value, rod, say}], rule:'direct'|'small'|'big', answer }.
 * Every step is one physical move with a kid-friendly sentence.
 */
export function planMoves(a, b, op, rodCount = 2) {
  const ab = makeAbacus(rodCount, a);
  const steps = [];
  let rule = RULES.direct;
  const push = (rod, say) => steps.push({ value: valueOf(ab), rod, say });
  const need = (i) => { if (i >= ab.rods.length || i < 0) throw new Error('Needs more rods'); return ab.rods[i]; };

  function add(i, n) {
    if (n === 0) return;
    const rod = need(i), p = PLACE[i];
    if (n < 5) {
      if (rod.lower + n <= 4) { rod.lower += n; push(i, `Push up ${n} little bead${s(n)} on the ${p} rod.`); return; }
      if (!rod.upper && digitOf(rod) + n <= 9) {
        rule = Math.max(rule, RULES.small);
        rod.upper = true; push(i, `Not enough little beads! Use Little Friends: ${n} + ${5 - n} = 5. Bring down the 5 bead.`);
        rod.lower -= 5 - n; push(i, `Now take away ${5 - n} little bead${s(5 - n)} (the Little Friend of ${n}).`);
        return;
      }
    } else if (n === 5 && !rod.upper) { rod.upper = true; push(i, `Bring down the 5 bead on the ${p} rod.`); return; }
    else if (n > 5 && !rod.upper && rod.lower + (n - 5) <= 4) {
      rod.upper = true; rod.lower += n - 5;
      push(i, `Bring down the 5 bead and push up ${n - 5} little bead${s(n - 5)}. That is ${n}!`); return;
    }
    // Big Friends: +n = −(10−n) here, +1 on the next rod
    rule = Math.max(rule, RULES.big);
    push(i, `No room! Use Big Friends: ${n} + ${10 - n} = 10. Take away ${10 - n}, then add 1 ten.`);
    sub(i, 10 - n, true);
    add(i + 1, 1);
  }

  function sub(i, n, silentIntro = false) {
    if (n === 0) return;
    const rod = need(i), p = PLACE[i];
    if (n < 5) {
      if (rod.lower >= n) { rod.lower -= n; push(i, `Take away ${n} little bead${s(n)} on the ${p} rod.`); return; }
      if (rod.upper) {
        rule = Math.max(rule, RULES.small);
        rod.lower += 5 - n; push(i, `Not enough little beads! Little Friends: ${n} + ${5 - n} = 5. Push up ${5 - n} little bead${s(5 - n)}.`);
        rod.upper = false; push(i, `Now lift away the 5 bead.`);
        return;
      }
    } else if (n === 5 && rod.upper) { rod.upper = false; push(i, `Lift away the 5 bead on the ${p} rod.`); return; }
    else if (n > 5 && rod.upper && rod.lower >= n - 5) {
      rod.upper = false; rod.lower -= n - 5;
      push(i, `Lift away the 5 bead and take away ${n - 5} little bead${s(n - 5)}.`); return;
    }
    rule = Math.max(rule, RULES.big);
    if (!silentIntro) push(i, `Not enough here! Big Friends: ${n} + ${10 - n} = 10. Take away 1 ten, then add ${10 - n}.`);
    sub(i + 1, 1);
    add(i, 10 - n);
  }

  if (op === 'add') add(0, b); else sub(0, b);
  const answer = op === 'add' ? a + b : a - b;
  if (valueOf(ab) !== answer) throw new Error(`Plan mismatch for ${a}${op}${b}`);
  return { steps, rule: RULE_NAME[rule], answer };
}

export function classify(a, b, op, rodCount = 2) {
  const answer = op === 'add' ? a + b : a - b;
  if (answer < 0 || answer >= 10 ** rodCount) return null;
  try { return planMoves(a, b, op, rodCount).rule; } catch { return null; }
}

// Curriculum: every level lists what it teaches in kid words.
export const LEVELS = [
  null,
  { id: 1, name: 'Little Bead Adding', emoji: '🐣', ops: ['add'], rules: ['direct'], a: [0, 9], b: [1, 4], tip: 'Just push up little beads.' },
  { id: 2, name: 'Five Bead Adding', emoji: '🐥', ops: ['add'], rules: ['direct'], a: [0, 9], b: [1, 9], tip: 'Use the 5 bead too.' },
  { id: 3, name: 'Little Bead Take Away', emoji: '🐢', ops: ['sub'], rules: ['direct'], a: [1, 9], b: [1, 4], tip: 'Take little beads away.' },
  { id: 4, name: 'Five Bead Take Away', emoji: '🦊', ops: ['sub'], rules: ['direct'], a: [5, 9], b: [1, 9], tip: 'Lift the 5 bead away too.' },
  { id: 5, name: 'Little Friends +', emoji: '🐰', ops: ['add'], rules: ['small'], a: [1, 8], b: [1, 4], tip: 'Pairs that make 5: 1+4, 2+3.' },
  { id: 6, name: 'Little Friends −', emoji: '🐼', ops: ['sub'], rules: ['small'], a: [5, 9], b: [1, 4], tip: 'Pairs that make 5 help you take away.' },
  { id: 7, name: 'Little Friends Mix', emoji: '🦋', ops: ['add', 'sub'], rules: ['direct', 'small'], a: [0, 9], b: [1, 9], tip: 'Add and take away with Little Friends.' },
  { id: 8, name: 'Big Friends +', emoji: '🦁', ops: ['add'], rules: ['big'], a: [1, 9], b: [1, 9], tip: 'Pairs that make 10: 1+9, 2+8, 3+7…' },
  { id: 9, name: 'Big Friends −', emoji: '🐘', ops: ['sub'], rules: ['big'], a: [10, 18], b: [1, 9], tip: 'Take a ten, give back the Big Friend.' },
  { id: 10, name: 'Big Friends Mix', emoji: '🐬', ops: ['add', 'sub'], rules: ['big'], a: [1, 18], b: [1, 9], tip: 'Carry and borrow like a pro.' },
  { id: 11, name: 'Two-Digit Adding', emoji: '🚀', ops: ['add'], rules: ['direct', 'small', 'big'], a: [10, 60], b: [1, 9], tip: 'Bigger numbers, same friends.' },
  { id: 12, name: 'Abacus Champion', emoji: '👑', ops: ['add', 'sub'], rules: ['direct', 'small', 'big'], a: [10, 89], b: [2, 9], tip: 'Everything you know!' },
];
export const MAX_LEVEL = LEVELS.length - 1;

const poolCache = new Map();
export function problemPool(levelId) {
  if (poolCache.has(levelId)) return poolCache.get(levelId);
  const L = LEVELS[levelId];
  if (!L) throw new Error('Unknown level ' + levelId);
  const pool = [];
  for (const op of L.ops) for (let a = L.a[0]; a <= L.a[1]; a++) for (let b = L.b[0]; b <= L.b[1]; b++) {
    const rule = classify(a, b, op, 2);
    if (rule && L.rules.includes(rule)) pool.push({ a, b, op, rule, answer: op === 'add' ? a + b : a - b });
  }
  if (!pool.length) throw new Error('Empty pool for level ' + levelId);
  poolCache.set(levelId, pool);
  return pool;
}

/** Pick `count` varied problems; avoids exact repeats and (when possible) repeats from `recent`. */
export function makeSession(levelId, count = 8, rng = Math.random, recent = []) {
  const pool = problemPool(levelId);
  const key = p => `${p.a}${p.op}${p.b}`;
  const avoid = new Set(recent);
  let candidates = pool.filter(p => !avoid.has(key(p)));
  if (candidates.length < count) candidates = pool.slice();
  const bag = candidates.slice();
  for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
  const out = bag.slice(0, count);
  while (out.length < count) out.push(pool[Math.floor(rng() * pool.length)]);
  // Mixed levels: make sure every rule shows up at least once if possible
  return out.map(p => ({ ...p, key: key(p) }));
}

export function starsFor(firstTryCorrect, total) {
  const pct = firstTryCorrect / total;
  return pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : pct >= 0.4 ? 1 : 0;
}

export const LITTLE_FRIEND = n => 5 - n;
export const BIG_FRIEND = n => 10 - n;
export const sign = op => (op === 'add' ? '+' : '−');
