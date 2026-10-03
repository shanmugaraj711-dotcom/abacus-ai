// Tests for Tier Model and Access Limits (Piece 1 of 3)
// Run: node tests/tiers.test.mjs

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  TIERS,
  DEFAULT_TIER,
  ALL_GAMES,
  STARTER_GAMES,
  getTierConfig,
  isLevelAllowedForTier,
  levelAllowed,
  isGameAllowedForTier,
  gameAllowed,
  isLessonAllowedForTier,
  lessonAllowed,
  isFreePlayAllowedForTier,
  freePlayAllowed
} from '../js/tiers.js';



const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ ${name}:`, err.message);
    failed++;
  }
}

console.log('=== Tier Model & Access Limits Test Suite ===\n');

// ── 1. Tier Configuration Tests ──────────────────────────────────────────────

test('1. Free tier config matches specification (1 level, 1 lesson, 1 game, no free play)', () => {
  const cfg = TIERS.free;
  assert.equal(cfg.id, 'free');
  assert.equal(cfg.pricePaise, 0);
  assert.equal(cfg.maxLevel, 1);
  assert.equal(cfg.maxLesson, 1);
  assert.deepEqual(cfg.games, ['race']);
  assert.equal(cfg.freePlay, false);
  assert.equal(cfg.durationDays, null);
});

test('2. Starter tier config matches specification (6 levels, 6 lessons, 4 games, free play, 30 days)', () => {
  const cfg = TIERS.starter;
  assert.equal(cfg.id, 'starter');
  assert.equal(cfg.pricePaise, 9900);
  assert.equal(cfg.maxLevel, 6);
  assert.equal(cfg.maxLesson, 6);
  assert.deepEqual(cfg.games, ['race', 'mystery', 'match', 'flash']);
  assert.equal(cfg.freePlay, true);
  assert.equal(cfg.durationDays, 30);
});

test('3. Lifetime tier config matches specification (15 levels, 11 lessons, 7 games, free play, lifetime)', () => {
  const cfg = TIERS.lifetime;
  assert.equal(cfg.id, 'lifetime');
  assert.equal(cfg.pricePaise, 49900);
  assert.equal(cfg.maxLevel, 15);
  assert.equal(cfg.maxLesson, 11);
  assert.deepEqual(cfg.games, ALL_GAMES);
  assert.equal(cfg.freePlay, true);
  assert.equal(cfg.durationDays, null);
});

// ── 2. Fallback to Free for Unknown / Null / Empty Tiers ─────────────────────

test('4. Unknown or null tier falls back to free', () => {
  assert.equal(getTierConfig(null), TIERS.free);
  assert.equal(getTierConfig(undefined), TIERS.free);
  assert.equal(getTierConfig(''), TIERS.free);
  assert.equal(getTierConfig('unknown'), TIERS.free);
  assert.equal(getTierConfig('pro'), TIERS.free);
  assert.equal(getTierConfig('enterprise'), TIERS.free);
});

test('5. Valid tier IDs return their respective configs', () => {
  assert.equal(getTierConfig('free'), TIERS.free);
  assert.equal(getTierConfig('starter'), TIERS.starter);
  assert.equal(getTierConfig('lifetime'), TIERS.lifetime);
});

// ── 3. Legacy Entitlement Resolution (paid: true without tier) ──────────────

test('6. Legacy paid:true without explicit tier resolves to Lifetime', () => {
  const legacyRecord = { paid: true };
  const resolvedTier = legacyRecord.tier || 'lifetime';
  const cfg = getTierConfig(resolvedTier);

  assert.equal(resolvedTier, 'lifetime');
  assert.equal(cfg.maxLevel, 15);
  assert.deepEqual(cfg.games, ALL_GAMES);
  assert.equal(cfg.maxLesson, 11);
  assert.equal(cfg.freePlay, true);
  assert.equal(levelAllowed(15, cfg), true);
  assert.equal(gameAllowed('ladder', cfg), true);
  assert.equal(lessonAllowed(11, cfg), true);
  assert.equal(freePlayAllowed(cfg), true);
});

// ── 4. Expired Starter Resolution ───────────────────────────────────────────

test('7. Expired starter resolves to Free access limits', () => {
  const pastDate = new Date(Date.now() - 3600000).toISOString();
  const starterRecord = {
    paid: true,
    tier: 'starter',
    expiresAt: pastDate
  };

  const isExpired = Date.parse(starterRecord.expiresAt) <= Date.now();
  assert.equal(isExpired, true);

  const effectiveTier = isExpired ? 'free' : starterRecord.tier;
  const cfg = getTierConfig(effectiveTier);

  assert.equal(effectiveTier, 'free');
  assert.equal(cfg.maxLevel, 1);
  assert.equal(cfg.maxLesson, 1);
  assert.deepEqual(cfg.games, ['race']);
  assert.equal(cfg.freePlay, false);

  // Level access
  assert.equal(levelAllowed(1, cfg), true);
  assert.equal(levelAllowed(2, cfg), false);
  assert.equal(levelAllowed(3, cfg), false);

  // Game access
  assert.equal(gameAllowed('race', cfg), true);
  assert.equal(gameAllowed('mystery', cfg), false);
  assert.equal(gameAllowed('match', cfg), false);

  // Lesson access
  assert.equal(lessonAllowed(1, cfg), true);
  assert.equal(lessonAllowed(2, cfg), false);

  // Free play
  assert.equal(freePlayAllowed(cfg), false);
});

// ── 5. Level Gating Matrix ──────────────────────────────────────────────────

test('8. Level gating for Free: Level 1 allowed, Levels 2..15 blocked', () => {
  const cfg = TIERS.free;
  assert.equal(levelAllowed(1, cfg), true);
  for (let lv = 2; lv <= 15; lv++) {
    assert.equal(levelAllowed(lv, cfg), false, `Level ${lv} should be blocked for free`);
  }
});

test('9. Level gating for Starter: Levels 1..6 allowed, Levels 7..15 blocked', () => {
  const cfg = TIERS.starter;
  for (let lv = 1; lv <= 6; lv++) {
    assert.equal(levelAllowed(lv, cfg), true, `Level ${lv} should be allowed for starter`);
  }
  for (let lv = 7; lv <= 15; lv++) {
    assert.equal(levelAllowed(lv, cfg), false, `Level ${lv} should be blocked for starter`);
  }
});

test('10. Level gating for Lifetime: Levels 1..15 allowed, Level 16 blocked', () => {
  const cfg = TIERS.lifetime;
  for (let lv = 1; lv <= 15; lv++) {
    assert.equal(levelAllowed(lv, cfg), true, `Level ${lv} should be allowed for lifetime`);
  }
  assert.equal(levelAllowed(16, cfg), false);
});

// ── 6. Game Gating Matrix ───────────────────────────────────────────────────

test('11. Game gating for Free: race allowed; mystery, match, and others blocked', () => {
  const cfg = TIERS.free;
  assert.equal(gameAllowed('race', cfg), true);
  assert.equal(gameAllowed('mystery', cfg), false);
  assert.equal(gameAllowed('match', cfg), false);
  assert.equal(gameAllowed('flash', cfg), false);
  assert.equal(gameAllowed('speed', cfg), false);
  assert.equal(gameAllowed('friend', cfg), false);
  assert.equal(gameAllowed('ladder', cfg), false);
});

test('12. Game gating for Starter: race, mystery, match, flash allowed (4 games); speed, friend, ladder blocked', () => {
  const cfg = TIERS.starter;
  assert.equal(gameAllowed('race', cfg), true);
  assert.equal(gameAllowed('mystery', cfg), true);
  assert.equal(gameAllowed('match', cfg), true);
  assert.equal(gameAllowed('flash', cfg), true);
  assert.equal(gameAllowed('speed', cfg), false);
  assert.equal(gameAllowed('friend', cfg), false);
  assert.equal(gameAllowed('ladder', cfg), false);
});

test('13. Game gating for Lifetime: all 7 games allowed', () => {
  const cfg = TIERS.lifetime;
  for (const game of ALL_GAMES) {
    assert.equal(gameAllowed(game, cfg), true, `Game ${game} should be allowed for lifetime`);
  }
});

// ── 7. Lesson Gating Matrix ─────────────────────────────────────────────────

test('14. Lesson gating for Free: Lesson 1 allowed, Lessons 2..11 blocked', () => {
  const cfg = TIERS.free;
  assert.equal(lessonAllowed(1, cfg), true, 'Lesson 1 should be allowed for free');
  for (let l = 2; l <= 11; l++) {
    assert.equal(lessonAllowed(l, cfg), false, `Lesson ${l} should be blocked for free`);
  }
});

test('15. Lesson gating for Starter: Lessons 1..6 allowed, Lessons 7..11 blocked', () => {
  const cfg = TIERS.starter;
  for (let l = 1; l <= 6; l++) {
    assert.equal(lessonAllowed(l, cfg), true, `Lesson ${l} should be allowed for starter`);
  }
  for (let l = 7; l <= 11; l++) {
    assert.equal(lessonAllowed(l, cfg), false, `Lesson ${l} should be blocked for starter`);
  }
});

test('16. Lesson gating for Lifetime: Lessons 1..11 allowed, Lesson 12 blocked', () => {
  const cfg = TIERS.lifetime;
  for (let l = 1; l <= 11; l++) {
    assert.equal(lessonAllowed(l, cfg), true, `Lesson ${l} should be allowed for lifetime`);
  }
  assert.equal(lessonAllowed(12, cfg), false);
});

// ── 8. Free Play Access ─────────────────────────────────────────────────────

test('17. Free Play gating: blocked for Free, allowed for Starter and Lifetime', () => {
  assert.equal(freePlayAllowed(TIERS.free), false);
  assert.equal(freePlayAllowed(TIERS.starter), true);
  assert.equal(freePlayAllowed(TIERS.lifetime), true);
});

// ── 9. Regression Test against main for Lifetime paid user ──────────────────

test('18. Lifetime tier provides identical unrestricted access to current main paid users', () => {
  const cfg = TIERS.lifetime;
  assert.equal(cfg.maxLevel, 15);
  assert.equal(cfg.maxLesson, 11);
  assert.equal(cfg.freePlay, true);
  assert.equal(cfg.games.length, 7);
  ALL_GAMES.forEach(g => assert.ok(cfg.games.includes(g)));
  for (let lv = 1; lv <= 15; lv++) assert.equal(levelAllowed(lv, cfg), true);
  for (let l = 1; l <= 11; l++) assert.equal(lessonAllowed(l, cfg), true);
  ALL_GAMES.forEach(g => assert.equal(gameAllowed(g, cfg), true));
});

// ── 10. Single Source of Truth Alignment Check ──────────────────────────────

test('19. Single source of truth: js/access.js uses tier definitions', async () => {
  const accessSrc = readFileSync(resolve(ROOT, 'js/access.js'), 'utf8');
  assert.ok(accessSrc.includes("import { TIERS } from './tiers.js'"), 'access.js must import TIERS');
  assert.ok(accessSrc.includes('getMaxLevel'), 'access.js must use getMaxLevel');
  assert.ok(accessSrc.includes('getGames'), 'access.js must use getGames');
});

// ── 11. Service Worker Cache & Shell Check ──────────────────────────────────

test('20. sw.js cache name is bumped to v8 and SHELL contains ./js/tiers.js', () => {
  const swSrc = readFileSync(resolve(ROOT, 'sw.js'), 'utf8');
  assert.ok(swSrc.includes("const CACHE = 'abacus-buddy-v8';"), 'sw.js cache must be abacus-buddy-v8');
  assert.ok(swSrc.includes("'./js/tiers.js'"), 'sw.js SHELL must include ./js/tiers.js');
});

// ── 12. Static Import Graph Integrity Check ─────────────────────────────────

function getNamedImports(src) {
  const imports = [];
  const re = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const names = m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    imports.push({ names, from: m[2] });
  }
  return imports;
}

function getExports(src) {
  const exports = new Set();
  const re1 = /export\s+(?:const|let|var|function|async\s+function)\s+([$\w]+)/g;
  let m;
  while ((m = re1.exec(src)) !== null) exports.add(m[1]);
  const re2 = /export\s*\{([^}]+)\}/g;
  while ((m = re2.exec(src)) !== null) {
    m[1].split(',').forEach(s => {
      const name = s.trim().split(/\s+as\s+/)[0].trim();
      if (name) exports.add(name);
    });
  }
  return exports;
}

test('21. Static import graph integrity check: no missing exports between app, games, payments, tiers, access', () => {
  const files = ['js/app.js', 'js/games.js', 'js/payments.js', 'js/tiers.js', 'js/access.js'];
  const exportsMap = new Map();
  for (const f of files) {
    exportsMap.set(f, getExports(readFileSync(resolve(ROOT, f), 'utf8')));
  }

  for (const f of files) {
    const src = readFileSync(resolve(ROOT, f), 'utf8');
    const imports = getNamedImports(src);
    for (const imp of imports) {
      if (imp.from.startsWith('./') || imp.from.startsWith('../js/')) {
        const target = imp.from.replace(/^\.\//, 'js/').replace(/^\.\.\/js\//, 'js/');
        if (exportsMap.has(target)) {
          const targetExports = exportsMap.get(target);
          for (const name of imp.names) {
            assert.ok(targetExports.has(name), `${f} imports '${name}' from ${target}, but ${target} does not export it!`);
          }
        }
      }
    }
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
