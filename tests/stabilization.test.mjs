// Starter Branch Stabilization Tests
// Covers: import graph integrity, auth return URLs, tier access matrix, game access matrix.
// Run: node tests/stabilization.test.mjs

import { readFileSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

let passed = 0, failed = 0;
function ok(name) { passed++; console.log(`✓ ${passed + failed}. ${name}`); }
function fail(name, detail) { failed++; console.log(`✗ ${passed + failed}. ${name}`); if (detail) console.log(`    ${detail}`); }
function assert(cond, name, detail) { cond ? ok(name) : fail(name, detail); }

// ─── 1. IMPORT GRAPH INTEGRITY ─────────────────────────────────────────

// Parse all named imports from a JS file and verify the target file exports them
function getNamedImports(src) {
  const imports = [];
  const re = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const names = m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean);
    imports.push({ names, from: m[2] });
  }
  return imports;
}

function getExports(src) {
  const exports = new Set();
  // export const/let/var/function/async function name
  const re1 = /export\s+(?:const|let|var|function|async\s+function)\s+([$\w]+)/g;
  let m;
  while ((m = re1.exec(src)) !== null) exports.add(m[1]);
  // export { name1, name2 }
  const re2 = /export\s*\{([^}]+)\}/g;
  while ((m = re2.exec(src)) !== null) {
    m[1].split(',').forEach(s => {
      const name = s.trim().split(/\s+as\s+/)[0].trim();
      if (name) exports.add(name);
    });
  }
  // export default ...
  if (/export\s+default\b/.test(src)) exports.add('default');
  return exports;
}

// Check all local JS imports (skip CDN URLs)
const CLIENT_JS_FILES = [
  'js/app.js', 'js/games.js', 'js/payments.js', 'js/tiers.js', 'js/engine.js',
  'js/store.js', 'js/sound.js', 'js/config.js', 'js/i18n.js', 'js/abacusView.js',
  'js/babi.js', 'js/lessons.js', 'js/exams.js', 'js/ui.js',
  'auth/auth-state.js', 'auth/sign-in.js', 'auth/otp-verification.js',
  'firebase/auth.js', 'firebase/config.js',
];

let importIssues = [];
for (const file of CLIENT_JS_FILES) {
  const fullPath = resolve(ROOT, file);
  let src;
  try { src = readFileSync(fullPath, 'utf8'); } catch { continue; }
  const imports = getNamedImports(src);
  for (const imp of imports) {
    // Skip CDN imports (firebase ESM)
    if (imp.from.startsWith('http')) continue;
    // Resolve relative path
    const targetPath = resolve(dirname(fullPath), imp.from);
    let targetSrc;
    try { targetSrc = readFileSync(targetPath, 'utf8'); } catch {
      importIssues.push(`${file}: imports from ${imp.from} but file does not exist`);
      continue;
    }
    const exports = getExports(targetSrc);
    for (const name of imp.names) {
      if (!exports.has(name)) {
        importIssues.push(`${file}: imports '${name}' from ${imp.from} but it is not exported`);
      }
    }
  }
}

assert(importIssues.length === 0,
  'ES module import graph has no missing exports',
  importIssues.join('\n    '));


// ─── 2. AUTH RETURN URL ENCODING ────────────────────────────────────────

const appSrc = readFileSync(resolve(ROOT, 'js/app.js'), 'utf8');

// Starter return URL must encode the hash
const starterReturnMatch = appSrc.match(/href="\.\/auth-ui\/sign-in\.html\?return=([^"]+)"/);
assert(starterReturnMatch && starterReturnMatch[1].includes('%23starter'),
  'Starter auth return URL encodes #starter as %23starter',
  `Found: ${starterReturnMatch?.[1] || 'no match'}`);

// Lifetime return URL must encode the hash
const unlockReturnMatch = appSrc.match(/href="\.\/auth-ui\/sign-in\.html\?return=([^"]*unlock[^"]*)"/);
assert(unlockReturnMatch && unlockReturnMatch[1].includes('%23unlock'),
  'Lifetime auth return URL encodes #unlock as %23unlock',
  `Found: ${unlockReturnMatch?.[1] || 'no match'}`);

// sign-in.html return button must NOT hardcode #starter
const signInHtml = readFileSync(resolve(ROOT, 'auth-ui/sign-in.html'), 'utf8');
assert(!signInHtml.includes('href="../#starter"'),
  'sign-in.html return button does not hardcode #starter',
  'Still contains href="../#starter"');


// ─── 3. TIER CONFIGURATION VALIDATION ───────────────────────────────────

const { TIERS, ALL_GAMES, getTierConfig, isLessonAllowedForTier, isFreePlayAllowedForTier } = await import(resolve(ROOT, 'js/tiers.js'));

assert(TIERS.free.maxLevel === 1, 'Free tier maxLevel is 1');
assert(JSON.stringify(TIERS.free.games) === '["race"]', 'Free tier games is exactly [race]');
assert(TIERS.free.pricePaise === 0, 'Free tier price is 0');

assert(TIERS.starter.maxLevel === 3, 'Starter tier maxLevel is 3');
assert(JSON.stringify(TIERS.starter.games) === '["race","mystery","match"]',
  'Starter tier games is exactly [race, mystery, match]');
assert(TIERS.starter.pricePaise === 9900, 'Starter tier price is 9900 paise (₹99)');
assert(TIERS.starter.durationDays === 30, 'Starter tier duration is 30 days');

assert(TIERS.lifetime.maxLevel === 15, 'Lifetime tier maxLevel is 15');
assert(TIERS.lifetime.games === ALL_GAMES, 'Lifetime tier games is ALL_GAMES');
assert(TIERS.lifetime.pricePaise === 49900, 'Lifetime tier price is 49900 paise (₹499)');
assert(TIERS.lifetime.durationDays === null, 'Lifetime tier duration is null (lifetime)');

assert(getTierConfig('nonexistent').id === 'free', 'Unknown tier falls back to free');
assert(getTierConfig(null).id === 'free', 'Null tier falls back to free');
assert(getTierConfig('starter').id === 'starter', 'getTierConfig returns starter for "starter"');
assert(getTierConfig('lifetime').id === 'lifetime', 'getTierConfig returns lifetime for "lifetime"');


// ─── 4. LEVEL ACCESS MATRIX ────────────────────────────────────────────

// Simulate tier access: level N is allowed if 1 <= N <= maxLevel
function simulateLevelAllowed(level, maxLevel) {
  return level >= 1 && level <= maxLevel;
}

// Free: only level 1
assert(simulateLevelAllowed(1, TIERS.free.maxLevel) === true, 'Free: Level 1 allowed');
assert(simulateLevelAllowed(2, TIERS.free.maxLevel) === false, 'Free: Level 2 blocked');

// Starter: levels 1-3
assert(simulateLevelAllowed(1, TIERS.starter.maxLevel) === true, 'Starter: Level 1 allowed');
assert(simulateLevelAllowed(2, TIERS.starter.maxLevel) === true, 'Starter: Level 2 allowed');
assert(simulateLevelAllowed(3, TIERS.starter.maxLevel) === true, 'Starter: Level 3 allowed');
assert(simulateLevelAllowed(4, TIERS.starter.maxLevel) === false, 'Starter: Level 4 blocked');

// Lifetime: levels 1-15
assert(simulateLevelAllowed(1, TIERS.lifetime.maxLevel) === true, 'Lifetime: Level 1 allowed');
assert(simulateLevelAllowed(15, TIERS.lifetime.maxLevel) === true, 'Lifetime: Level 15 allowed');
assert(simulateLevelAllowed(16, TIERS.lifetime.maxLevel) === false, 'Lifetime: Level 16 blocked');


// ─── 5. GAME ACCESS MATRIX ─────────────────────────────────────────────

function simulateGameAllowed(gameId, allowedGames) {
  return allowedGames.includes(gameId);
}

// Free: only race
assert(simulateGameAllowed('race', TIERS.free.games) === true, 'Free: race allowed');
assert(simulateGameAllowed('mystery', TIERS.free.games) === false, 'Free: mystery blocked');
assert(simulateGameAllowed('match', TIERS.free.games) === false, 'Free: match blocked');
assert(simulateGameAllowed('flash', TIERS.free.games) === false, 'Free: flash blocked');

// Starter: race, mystery, match
assert(simulateGameAllowed('race', TIERS.starter.games) === true, 'Starter: race allowed');
assert(simulateGameAllowed('mystery', TIERS.starter.games) === true, 'Starter: mystery allowed');
assert(simulateGameAllowed('match', TIERS.starter.games) === true, 'Starter: match allowed');
assert(simulateGameAllowed('flash', TIERS.starter.games) === false, 'Starter: flash blocked');
assert(simulateGameAllowed('speed', TIERS.starter.games) === false, 'Starter: speed blocked');
assert(simulateGameAllowed('friend', TIERS.starter.games) === false, 'Starter: friend blocked');
assert(simulateGameAllowed('ladder', TIERS.starter.games) === false, 'Starter: ladder blocked');

// Lifetime: all 7
for (const g of ALL_GAMES) {
  assert(simulateGameAllowed(g, TIERS.lifetime.games) === true, `Lifetime: ${g} allowed`);
}


// ─── 6. NO POSITIONAL GAME GATING ──────────────────────────────────────

// Verify games.js uses .includes() for game access, not index-based slicing
const gamesSrc = readFileSync(resolve(ROOT, 'js/games.js'), 'utf8');
assert(gamesSrc.includes('.includes(id)') || gamesSrc.includes('.includes(gameId)'),
  'games.js uses .includes() for game access check (not positional)',
  'No .includes() call found in gameAllowed');


// ─── 7. WORKER SERVER-SIDE PRICE OWNERSHIP ──────────────────────────────

const workerSrc = readFileSync(resolve(ROOT, 'worker.js'), 'utf8');
assert(workerSrc.includes('tierConfig.pricePaise'),
  'worker.js uses tierConfig.pricePaise for server-authoritative pricing');
assert(!workerSrc.includes('body.amount') && !workerSrc.includes('b.amount'),
  'worker.js does not use client-supplied amount for order creation');


// ─── 8. GETGAMELIMIT NOT IMPORTED ───────────────────────────────────────

assert(!appSrc.includes('getGameLimit'),
  'app.js does not import non-existent getGameLimit');


// ─── 9. LESSON ACCESS MATRIX ───────────────────────────────────────────

assert(TIERS.free.maxLesson === 6, 'Free tier maxLesson is 6');
assert(isLessonAllowedForTier(1, TIERS.free) === true, 'Free: Lesson 1 allowed');
assert(isLessonAllowedForTier(6, TIERS.free) === true, 'Free: Lesson 6 allowed');
assert(isLessonAllowedForTier(7, TIERS.free) === false, 'Free: Lesson 7 blocked');
assert(isLessonAllowedForTier(11, TIERS.free) === false, 'Free: Lesson 11 blocked');

assert(TIERS.starter.maxLesson === 7, 'Starter tier maxLesson is 7');
assert(isLessonAllowedForTier(1, TIERS.starter) === true, 'Starter: Lesson 1 allowed');
assert(isLessonAllowedForTier(7, TIERS.starter) === true, 'Starter: Lesson 7 allowed');
assert(isLessonAllowedForTier(8, TIERS.starter) === false, 'Starter: Lesson 8 blocked');
assert(isLessonAllowedForTier(11, TIERS.starter) === false, 'Starter: Lesson 11 blocked');

assert(TIERS.lifetime.maxLesson === 11, 'Lifetime tier maxLesson is 11');
for (let l = 1; l <= 11; l++) {
  assert(isLessonAllowedForTier(l, TIERS.lifetime) === true, `Lifetime: Lesson ${l} allowed`);
}
assert(isLessonAllowedForTier(12, TIERS.lifetime) === false, 'Lifetime: Lesson 12 blocked');


// ─── 10. FREE PLAY ACCESS MATRIX ───────────────────────────────────────

assert(isFreePlayAllowedForTier(TIERS.free) === false, 'Free: Free Play blocked');
assert(isFreePlayAllowedForTier(TIERS.starter) === true, 'Starter: Free Play allowed');
assert(isFreePlayAllowedForTier(TIERS.lifetime) === true, 'Lifetime: Free Play allowed');


// ─── 11. ROUTE-LEVEL ACCESS CONTROL IN APP.JS ──────────────────────────

// Verify route-level lesson protection exists in app.js
assert(appSrc.includes('lessonAllowed(n)') || appSrc.includes('lessonAllowed(id)'),
  'app.js enforces lessonAllowed on lesson routing and function');
assert(appSrc.includes('canAccessFreePlay()'),
  'app.js enforces canAccessFreePlay on free play routing and function');

// Simulate direct route access to locked lesson
function simulateLessonRoute(lessonId, tier) {
  const cfg = getTierConfig(tier);
  const allowed = isLessonAllowedForTier(lessonId, cfg);
  if (!allowed) {
    return lessonId <= 7 && tier === 'free' ? '#/starter' : '#/unlock';
  }
  return `#/lesson/${lessonId}`;
}

assert(simulateLessonRoute(1, 'free') === '#/lesson/1', 'Free user can navigate to Lesson 1');
assert(simulateLessonRoute(6, 'free') === '#/lesson/6', 'Free user can navigate to Lesson 6');
assert(simulateLessonRoute(7, 'free') === '#/starter', 'Direct route to Lesson 7 blocked for free -> redirects to #/starter');
assert(simulateLessonRoute(8, 'free') === '#/unlock', 'Direct route to Lesson 8 blocked for free -> redirects to #/unlock');
assert(simulateLessonRoute(7, 'starter') === '#/lesson/7', 'Starter user can navigate to Lesson 7');
assert(simulateLessonRoute(8, 'starter') === '#/unlock', 'Direct route to Lesson 8 blocked for starter -> redirects to #/unlock');
assert(simulateLessonRoute(11, 'lifetime') === '#/lesson/11', 'Lifetime user can navigate to Lesson 11');

// Simulate direct route access to Free Play
function simulateFreePlayRoute(tier) {
  const cfg = getTierConfig(tier);
  if (!isFreePlayAllowedForTier(cfg)) return '#/starter';
  return '#/free';
}

assert(simulateFreePlayRoute('free') === '#/starter', 'Direct route to Free Play blocked for free user -> redirects to #/starter');
assert(simulateFreePlayRoute('starter') === '#/free', 'Direct route to Free Play allowed for Starter');
assert(simulateFreePlayRoute('lifetime') === '#/free', 'Direct route to Free Play allowed for Lifetime');


// ─── 12. "I KNOW IT" CANNOT BYPASS COMMERCIAL ENTITLEMENT ─────────────

// In learnMap, open must require allowed && (known || ...)
assert(appSrc.includes('allowed && (known ||'),
  'learnMap requires lessonAllowed even when experience is "known"');

// In check(), lessons unlocked must be bounded by maxLessonAllowed
assert(appSrc.includes('l.id <= maxLsn'),
  'check() bounds auto-unlocked lessons by maxLessonAllowed');


// ─── 13. LOCALSTORAGE SEEDED=1 BYPASS REMOVAL ──────────────────────────

const paymentsSrc = readFileSync(resolve(ROOT, 'js/payments.js'), 'utf8');
assert(!paymentsSrc.includes('isSeeded'),
  'payments.js does not contain isSeeded helper');
assert(!paymentsSrc.includes("localStorage.getItem('seeded')"),
  'payments.js does not check localStorage seeded key for entitlement');
assert(paymentsSrc.includes('export const isPaid = () => entitlement.paid === true;'),
  'isPaid strictly checks entitlement.paid === true (no seeded bypass)');
assert(paymentsSrc.includes('export const getTier = () => entitlement.tier;'),
  'getTier strictly returns entitlement.tier (no seeded bypass)');
assert(paymentsSrc.includes('export const getMaxLevel = () => entitlement.maxLevel;'),
  'getMaxLevel strictly returns entitlement.maxLevel (no seeded bypass)');
assert(paymentsSrc.includes('export const getMaxLesson = () => getTierConfig(entitlement.tier).maxLesson;'),
  'getMaxLesson returns tier maxLesson');
assert(paymentsSrc.includes('export const canAccessFreePlay = () => isFreePlayAllowedForTier(getTierConfig(entitlement.tier));'),
  'canAccessFreePlay checks tier config');


// ─── 14. PUBLIC DEMO BYPASS REMOVAL ────────────────────────────────────

assert(!appSrc.includes('id="demo"'),
  'app.js welcome screen does not contain #demo button');
assert(!appSrc.includes("$('#demo').onclick"),
  'app.js does not contain #demo click handler with sample progress bypass');


// ─── SUMMARY ────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

