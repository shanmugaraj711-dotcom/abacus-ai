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
  // Steps are language-free codes; js/i18n.js turns them into words.
  const push = (rod, k, n) => steps.push({ value: valueOf(ab), rod, k, n });
  const need = (i) => { if (i >= ab.rods.length || i < 0) throw new Error('Needs more rods'); return ab.rods[i]; };

  function add(i, n) {
    if (n === 0) return;
    const rod = need(i);
    if (n < 5) {
      if (rod.lower + n <= 4) { rod.lower += n; push(i, 'pushUp', n); return; }
      if (!rod.upper && digitOf(rod) + n <= 9) {
        rule = Math.max(rule, RULES.small);
        rod.upper = true; push(i, 'lfAddIntro', n);
        rod.lower -= 5 - n; push(i, 'lfAddTake', n);
        return;
      }
    } else if (n === 5 && !rod.upper) { rod.upper = true; push(i, 'fiveDown', n); return; }
    else if (n > 5 && !rod.upper && rod.lower + (n - 5) <= 4) {
      rod.upper = true; rod.lower += n - 5; push(i, 'fiveAndPush', n); return;
    }
    // Big Friends: +n = −(10−n) here, +1 on the next rod
    rule = Math.max(rule, RULES.big);
    push(i, 'bfAddIntro', n);
    sub(i, 10 - n, true);
    add(i + 1, 1);
  }

  function sub(i, n, silentIntro = false) {
    if (n === 0) return;
    const rod = need(i);
    if (n < 5) {
      if (rod.lower >= n) { rod.lower -= n; push(i, 'takeAway', n); return; }
      if (rod.upper) {
        rule = Math.max(rule, RULES.small);
        rod.lower += 5 - n; push(i, 'lfSubPush', n);
        rod.upper = false; push(i, 'lfSubLift', n);
        return;
      }
    } else if (n === 5 && rod.upper) { rod.upper = false; push(i, 'fiveLift', n); return; }
    else if (n > 5 && rod.upper && rod.lower >= n - 5) {
      rod.upper = false; rod.lower -= n - 5; push(i, 'fiveAndTake', n); return;
    }
    rule = Math.max(rule, RULES.big);
    if (!silentIntro) push(i, 'bfSubIntro', n);
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
  { id: 1, name: 'Little Bead Adding', emoji: '🐣', ops: ['add'], rules: ['direct'], a: [0, 9], b: [1, 4], tip: 'Just push up little beads.', nameTa: 'சின்ன மணி கூட்டல்', tipTa: 'சின்ன மணிகளை மேல தள்ளினா போதும்.' },
  { id: 2, name: 'Five Bead Adding', emoji: '🐥', ops: ['add'], rules: ['direct'], a: [0, 9], b: [1, 9], tip: 'Use the 5 bead too.', nameTa: '5 மணி கூட்டல்', tipTa: '5 மணியையும் சேர்த்து பயன்படுத்து.' },
  { id: 3, name: 'Little Bead Take Away', emoji: '🐢', ops: ['sub'], rules: ['direct'], a: [1, 9], b: [1, 4], tip: 'Take little beads away.', nameTa: 'சின்ன மணி கழித்தல்', tipTa: 'சின்ன மணிகளை கீழ இறக்கு.' },
  { id: 4, name: 'Five Bead Take Away', emoji: '🦊', ops: ['sub'], rules: ['direct'], a: [5, 9], b: [1, 9], tip: 'Lift the 5 bead away too.', nameTa: '5 மணி கழித்தல்', tipTa: '5 மணியையும் தூக்கி எடு.' },
  { id: 5, name: 'Little Friends +', emoji: '🐰', ops: ['add'], rules: ['small'], a: [1, 8], b: [1, 4], tip: 'Pairs that make 5: 1+4, 2+3.', nameTa: 'லிட்டில் ஃபிரெண்ட்ஸ் +', tipTa: '5 ஆக்குற ஜோடி: 1+4, 2+3.' },
  { id: 6, name: 'Little Friends −', emoji: '🐼', ops: ['sub'], rules: ['small'], a: [5, 9], b: [1, 4], tip: 'Pairs that make 5 help you take away.', nameTa: 'லிட்டில் ஃபிரெண்ட்ஸ் −', tipTa: '5 ஆக்குற ஜோடி கழிக்கவும் உதவும்.' },
  { id: 7, name: 'Little Friends Mix', emoji: '🦋', ops: ['add', 'sub'], rules: ['direct', 'small'], a: [0, 9], b: [1, 9], tip: 'Add and take away with Little Friends.', nameTa: 'லிட்டில் ஃபிரெண்ட்ஸ் கலவை', tipTa: 'கூட்டலும் கழித்தலும் சேர்ந்து.' },
  { id: 8, name: 'Big Friends +', emoji: '🦁', ops: ['add'], rules: ['big'], a: [1, 9], b: [1, 9], tip: 'Pairs that make 10: 1+9, 2+8, 3+7…', nameTa: 'பிக் ஃபிரெண்ட்ஸ் +', tipTa: '10 ஆக்குற ஜோடி: 1+9, 2+8, 3+7…' },
  { id: 9, name: 'Big Friends −', emoji: '🐘', ops: ['sub'], rules: ['big'], a: [10, 18], b: [1, 9], tip: 'Take a ten, give back the Big Friend.', nameTa: 'பிக் ஃபிரெண்ட்ஸ் −', tipTa: 'ஒரு டென் எடுத்து, பிக் ஃபிரெண்ட்ட திருப்பி கொடு.' },
  { id: 10, name: 'Big Friends Mix', emoji: '🐬', ops: ['add', 'sub'], rules: ['big'], a: [1, 18], b: [1, 9], tip: 'Carry and borrow like a pro.', nameTa: 'பிக் ஃபிரெண்ட்ஸ் கலவை', tipTa: 'கேரியும் பாரோவும் நல்லா வரும்.' },
  { id: 11, name: 'Two-Digit Adding', emoji: '🚀', ops: ['add'], rules: ['direct', 'small', 'big'], a: [10, 60], b: [1, 9], tip: 'Bigger numbers, same friends.', nameTa: 'இரண்டு இலக்க கூட்டல்', tipTa: 'பெரிய எண், அதே ஃபிரெண்ட்ஸ்.' },
  { id: 12, name: 'Abacus Champion', emoji: '👑', ops: ['add', 'sub'], rules: ['direct', 'small', 'big'], a: [10, 89], b: [2, 9], tip: 'Everything you know!', nameTa: 'அபாகஸ் சாம்பியன்', tipTa: 'நீ கத்துக்கிட்ட எல்லாமே!' },
  { id: 13, name: 'Mixed Direct & Small Friends', emoji: '🎯', ops: ['add', 'sub'], rules: ['direct', 'small'], a: [10, 89], b: [1, 9], tip: 'Direct moves mixed with Little Friends.', nameTa: 'நேரடி & லிட்டில் ஃபிரெண்ட்ஸ் கலவை', tipTa: 'நேரடி நகர்வுகளும் லிட்டில் ஃபிரெண்ட்ஸும் கலந்த பயிற்சி.' },
  { id: 14, name: 'Mixed Small & Big Friends', emoji: '⚡', ops: ['add', 'sub'], rules: ['small', 'big'], a: [10, 89], b: [1, 9], tip: 'Switch smoothly between Little and Big Friends.', nameTa: 'லிட்டில் & பிக் ஃபிரெண்ட்ஸ் கலவை', tipTa: 'லிட்டில் மற்றும் பிக் ஃபிரெண்ட்ஸ் இரண்டும் கலந்த பயிற்சி.' },
  { id: 15, name: 'Full Mixed Mastery', emoji: '🏆', ops: ['add', 'sub'], rules: ['direct', 'small', 'big'], a: [10, 89], b: [1, 9], tip: 'Master all soroban rules with complete confidence!', nameTa: 'முழுமையான கலவை தேர்ச்சி', tipTa: 'அனைத்து சூத்திரங்களிலும் முழுமையான தேர்ச்சி!' },
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
export const placeName = i => PLACE[i];
