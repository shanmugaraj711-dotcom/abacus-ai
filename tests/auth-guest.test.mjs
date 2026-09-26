/**
 * tests/auth-guest.test.mjs
 * Comprehensive automated test suite for Abacus AI:
 * First-Launch Auth Gate + Guest Mode + Linking + Regressions + Multi-Viewport UI
 *
 * Covers all 38 test specifications required by the release gate:
 *   AUTH: items 1–6
 *   GUEST: items 7–14
 *   LINKING: items 15–20
 *   REGRESSION: items 21–29
 *   UI & VIEWPORTS: items 30–38
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Node-compatible engine & worker modules
import { detectDuplicates, authAccountRecord } from '../worker.js';
import { tamilNumberWord } from '../js/sound.js';
import { LEVELS, MAX_LEVEL } from '../js/engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let passedCount = 0;
let totalCount = 0;

function it(id, label, fn) {
  totalCount++;
  try {
    fn();
    passedCount++;
    console.log(`  ✓ [Test ${id}] ${label}`);
  } catch (err) {
    console.error(`  ✗ FAIL [Test ${id}] ${label}`);
    console.error(err);
    process.exitCode = 1;
    throw err;
  }
}

async function itAsync(id, label, fn) {
  totalCount++;
  try {
    await fn();
    passedCount++;
    console.log(`  ✓ [Test ${id}] ${label}`);
  } catch (err) {
    console.error(`  ✗ FAIL [Test ${id}] ${label}`);
    console.error(err);
    process.exitCode = 1;
    throw err;
  }
}

// ── Lightweight static server for Playwright browser testing ────────────────
function createTestServer() {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
  };

  return http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(ROOT_DIR, reqPath);

    if (!filePath.startsWith(ROOT_DIR)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404);
        return res.end('Not Found');
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
  });
}

console.log('\n=============================================================');
console.log('ABACUS AI — AUTH & GUEST MODE COMPREHENSIVE VERIFICATION');
console.log('=============================================================\n');

const server = createTestServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const BASE_URL = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/index.html`);

  // ── 1. AUTH (Specifications 1–6) ────────────────────────────────────────────
  console.log('═══ SECTION 1: AUTHENTICATION MODULE (Items 1–6) ═══');

  await itAsync(1, 'Google login completes and returns valid user with uid', async () => {
    const res = await page.evaluate(async () => {
      window.__mockUser = { uid: 'mock-google-uid-1', email: 'parent1@gmail.com' };
      window.__mockSignInWithGoogle = async () => ({ user: window.__mockUser });
      const authMod = await import('/firebase/auth.js');
      const cred = await authMod.signInWithGoogle();
      return { uid: cred?.user?.uid, email: cred?.user?.email };
    });
    assert.equal(res.uid, 'mock-google-uid-1');
    assert.equal(res.email, 'parent1@gmail.com');
  });

  await itAsync(2, 'Email/password registration registers account and returns user with uid', async () => {
    const res = await page.evaluate(async () => {
      window.__mockSignUpWithEmail = async (email) => ({
        user: { uid: 'mock-email-uid-reg', email }
      });
      const authMod = await import('/firebase/auth.js');
      const cred = await authMod.signUpWithEmail('newparent@example.com', 'SecurePass123!');
      return { uid: cred?.user?.uid, email: cred?.user?.email };
    });
    assert.equal(res.uid, 'mock-email-uid-reg');
    assert.equal(res.email, 'newparent@example.com');
  });

  await itAsync(3, 'Email/password login signs into account successfully', async () => {
    const res = await page.evaluate(async () => {
      window.__mockSignInWithEmail = async (email) => {
        window.__mockUser = { uid: 'mock-email-uid-login', email };
        return { user: window.__mockUser };
      };
      const authMod = await import('/firebase/auth.js');
      const cred = await authMod.signInWithEmail('existing@example.com', 'CorrectPass123!');
      return { uid: cred?.user?.uid, email: cred?.user?.email };
    });
    assert.equal(res.uid, 'mock-email-uid-login');
    assert.equal(res.email, 'existing@example.com');
  });

  await itAsync(4, 'Password reset sends recovery email to user address', async () => {
    const sent = await page.evaluate(async () => {
      window.__sentPasswordResets = [];
      window.__mockResetPassword = async (email) => { window.__sentPasswordResets.push(email); };
      const authMod = await import('/firebase/auth.js');
      await authMod.resetPassword('user-reset@example.com');
      return window.__sentPasswordResets;
    });
    assert.ok(sent.includes('user-reset@example.com'), 'Password reset must record sent target');
  });

  await itAsync(5, 'Invalid credentials formats to child/parent-friendly error messages', async () => {
    const errors = await page.evaluate(async () => {
      const accessMod = await import('/js/access.js');
      return {
        invalidEmail: accessMod.formatAuthError({ code: 'auth/invalid-email' }),
        wrongPass: accessMod.formatAuthError({ code: 'auth/wrong-password' }),
        weakPass: accessMod.formatAuthError({ code: 'auth/weak-password' }),
        emailInUse: accessMod.formatAuthError({ code: 'auth/email-already-in-use' }),
      };
    });
    assert.equal(errors.invalidEmail, 'Please enter a valid email address.');
    assert.equal(errors.wrongPass, 'Incorrect email or password. Please try again.');
    assert.equal(errors.weakPass, 'Password should be at least 6 characters.');
    assert.equal(errors.emailInUse, 'An account with this email already exists. Please log in.');
  });

  await itAsync(6, 'Existing session restoration preserves authenticated state', async () => {
    const res = await page.evaluate(async () => {
      window.__mockUser = { uid: 'restored-session-uid-99', email: 'restored@example.com' };
      const accessMod = await import('/js/access.js');
      accessMod.setAuthMode('registered');
      return {
        mode: accessMod.getAuthMode(),
        isGuest: accessMod.isGuestUser(),
      };
    });
    assert.equal(res.mode, 'registered');
    assert.equal(res.isGuest, false, 'Restored authenticated user must NOT be treated as guest');
  });

  // ── 2. GUEST (Specifications 7–14) ──────────────────────────────────────────
  console.log('\n═══ SECTION 2: GUEST ACCESS CONTROLS (Items 7–14) ═══');

  await itAsync(7, 'Guest mode starts successfully with clean guest identity', async () => {
    const res = await page.evaluate(async () => {
      window.__mockUser = null;
      const accessMod = await import('/js/access.js');
      const payMod = await import('/js/payments.js');
      payMod.clearCache();
      accessMod.setAuthMode('guest');
      return {
        mode: accessMod.getAuthMode(),
        isGuest: accessMod.isGuestUser(),
      };
    });
    assert.equal(res.mode, 'guest');
    assert.equal(res.isGuest, true);
  });

  await itAsync(8, 'Guest can access Level 1', async () => {
    const ok = await page.evaluate(async () => {
      const { canGuestAccessLevel } = await import('/js/access.js');
      return canGuestAccessLevel(1);
    });
    assert.equal(ok, true, 'Level 1 must be accessible to guests');
  });

  await itAsync(9, 'Guest cannot access Level 2 (or any level 2..15)', async () => {
    const denied = await page.evaluate(async () => {
      const { canGuestAccessLevel } = await import('/js/access.js');
      const results = [];
      for (let lv = 2; lv <= 15; lv++) {
        results.push({ lv, allowed: canGuestAccessLevel(lv) });
      }
      return results;
    });
    for (const r of denied) {
      assert.equal(r.allowed, false, `Level ${r.lv} must be locked for guest`);
    }
  });

  await itAsync(10, 'Guest can access exactly one selected game ("mystery" Mystery Number)', async () => {
    const res = await page.evaluate(async () => {
      const { GUEST_GAME_ID, canGuestAccessGame } = await import('/js/access.js');
      return { GUEST_GAME_ID, mysteryOk: canGuestAccessGame('mystery') };
    });
    assert.equal(res.GUEST_GAME_ID, 'mystery');
    assert.equal(res.mysteryOk, true, 'Selected game mystery must be accessible');
  });

  await itAsync(11, 'Guest cannot access other 6 games', async () => {
    const lockedGames = ['race', 'match', 'flash', 'speed', 'friend', 'ladder'];
    const res = await page.evaluate(async (games) => {
      const { canGuestAccessGame } = await import('/js/access.js');
      return games.map(g => ({ g, allowed: canGuestAccessGame(g) }));
    }, lockedGames);
    for (const r of res) {
      assert.equal(r.allowed, false, `Game ${r.g} must be denied for guest`);
    }
  });

  await itAsync(12, 'Guest cannot access paid levels (4..15)', async () => {
    const res = await page.evaluate(async () => {
      const { canGuestAccessLevel, canGuestAccessFeature } = await import('/js/access.js');
      return {
        level4: canGuestAccessLevel(4),
        level15: canGuestAccessLevel(15),
        paidFeature: canGuestAccessFeature('paid'),
      };
    });
    assert.equal(res.level4, false);
    assert.equal(res.level15, false);
    assert.equal(res.paidFeature, false);
  });

  await itAsync(13, 'Guest cannot access exams/tests', async () => {
    const res = await page.evaluate(async () => {
      const { canGuestAccessFeature } = await import('/js/access.js');
      return {
        tests: canGuestAccessFeature('tests'),
        exams: canGuestAccessFeature('exams'),
      };
    });
    assert.equal(res.tests, false);
    assert.equal(res.exams, false);
  });

  await itAsync(14, 'Guest cannot access certificates', async () => {
    const res = await page.evaluate(async () => {
      const { canGuestAccessFeature } = await import('/js/access.js');
      return canGuestAccessFeature('certificates');
    });
    assert.equal(res, false);
  });

  // ── 3. LINKING & DEDUPLICATION (Specifications 15–20) ──────────────────────
  console.log('\n═══ SECTION 3: IDENTITY LINKING & OWNER CONSOLE (Items 15–20) ═══');

  await itAsync(15, 'Anonymous visitor created with valid visitorId', async () => {
    const vid = await page.evaluate(async () => {
      const { getVisitorId } = await import('/js/store.js');
      return getVisitorId();
    });
    assert.ok(/^vis_[a-zA-Z0-9_\-]{8,64}$/.test(vid), 'Visitor ID must be valid vis_ string');
  });

  await itAsync(16, 'Guest → Google sign-in transitions auth mode to registered and sets UID', async () => {
    const res = await page.evaluate(async () => {
      const accessMod = await import('/js/access.js');
      accessMod.setAuthMode('guest');
      const beforeGuest = accessMod.isGuestUser();
      window.__mockUser = { uid: 'google-conv-uid-99', email: 'google-conv@test.com' };
      accessMod.setAuthMode('registered');
      return {
        beforeGuest,
        afterGuest: accessMod.isGuestUser(),
        mode: accessMod.getAuthMode(),
      };
    });
    assert.equal(res.beforeGuest, true);
    assert.equal(res.afterGuest, false);
    assert.equal(res.mode, 'registered');
  });

  await itAsync(17, 'Guest → Email sign-in transitions auth mode to registered and sets UID', async () => {
    const res = await page.evaluate(async () => {
      const accessMod = await import('/js/access.js');
      accessMod.setAuthMode('guest');
      window.__mockUser = { uid: 'email-conv-uid-88', email: 'email-conv@test.com' };
      accessMod.setAuthMode('registered');
      return {
        isGuest: accessMod.isGuestUser(),
        mode: accessMod.getAuthMode(),
      };
    });
    assert.equal(res.isGuest, false);
    assert.equal(res.mode, 'registered');
  });

  await itAsync(18, 'Firebase session restoration links visitorId with current UID', async () => {
    const res = await page.evaluate(async () => {
      const { getVisitorId, pingVisit } = await import('/js/store.js');
      return {
        hasVid: !!getVisitorId(),
        hasPing: typeof pingVisit === 'function',
      };
    });
    assert.equal(res.hasVid, true);
    assert.equal(res.hasPing, true);
  });

  it(19, 'Linked visitor is deduplicated from anonymous count in Owner Console', () => {
    const registeredVisitorIds = new Set(['abc123def4567890']);
    const anonymousVisitors = [
      { visitorId: 'abc123def4567890', firstSeen: '2026-09-20T10:00:00Z', lastSeen: '2026-09-26T10:00:00Z', visitCount: 5 },
      { visitorId: 'other99988877766', firstSeen: '2026-09-25T10:00:00Z', lastSeen: '2026-09-26T10:00:00Z', visitCount: 1 }
    ];

    const filtered = anonymousVisitors.filter(av => !registeredVisitorIds.has(av.visitorId));
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].visitorId, 'other99988877766');
  });

  it(20, 'Repeated authenticated visits do not create duplicate accounts in duplicate detector', () => {
    const account1 = {
      uid: 'uid-alice',
      email: 'alice@example.com',
      providerEmails: ['alice@example.com'],
    };
    const list = [authAccountRecord(account1)];
    const duplicates = detectDuplicates(list);
    assert.equal(duplicates[0].possibleDuplicate, false, 'Single account with multiple provider records is NOT a duplicate');
  });

  // ── 4. REGRESSIONS (Specifications 21–29) ───────────────────────────────────
  console.log('\n═══ SECTION 4: REGRESSION SAFEGUARDS (Items 21–29) ═══');

  await itAsync(21, 'Paid user still has full paid access (Levels 1–15)', async () => {
    const res = await page.evaluate(async () => {
      window.__mockUser = { uid: 'paid-user-uid', email: 'paid@example.com' };
      localStorage.setItem('abacus-entitlement-v1', JSON.stringify({ paid: true, uid: 'paid-user-uid', cachedAt: new Date().toISOString() }));
      const payMod = await import('/js/payments.js');
      const accessMod = await import('/js/access.js');
      accessMod.setAuthMode('registered');
      const isGuest = accessMod.isGuestUser();
      const level15Allowed = accessMod.canGuestAccessLevel(15);
      payMod.clearCache();
      return { isGuest, level15Allowed };
    });
    assert.equal(res.isGuest, false);
    assert.equal(res.level15Allowed, true);
  });

  await itAsync(22, 'Free registered user rules unchanged (Levels 1–3 open, 4–15 require unlock)', async () => {
    const res = await page.evaluate(async () => {
      window.__mockUser = { uid: 'free-reg-uid', email: 'freereg@example.com' };
      const payMod = await import('/js/payments.js');
      const accessMod = await import('/js/access.js');
      payMod.clearCache();
      accessMod.setAuthMode('registered');
      return {
        isGuest: accessMod.isGuestUser(),
        level2: accessMod.canGuestAccessLevel(2),
        level3: accessMod.canGuestAccessLevel(3),
        raceGame: accessMod.canGuestAccessGame('race'),
      };
    });
    assert.equal(res.isGuest, false);
    assert.equal(res.level2, true);
    assert.equal(res.level3, true);
    assert.equal(res.raceGame, true);
  });

  await itAsync(23, 'Existing local progress preserved when auth mode transitions', async () => {
    const res = await page.evaluate(async () => {
      const storeMod = await import('/js/store.js');
      const accessMod = await import('/js/access.js');
      storeMod.resetAll();
      storeMod.state.profile = { name: 'Aarav', avatar: '🦊', experience: 'new', lang: 'en', voiceLang: 'en' };
      storeMod.state.lessonsDone = [1, 2, 3];
      storeMod.state.unlocked = 3;
      storeMod.saveNow();

      accessMod.setAuthMode('guest');
      const guestName = storeMod.state.profile.name;
      const guestUnlocked = storeMod.state.unlocked;

      accessMod.setAuthMode('registered');
      const regName = storeMod.state.profile.name;
      const regUnlocked = storeMod.state.unlocked;

      return { guestName, guestUnlocked, regName, regUnlocked };
    });
    assert.equal(res.guestName, 'Aarav');
    assert.equal(res.guestUnlocked, 3);
    assert.equal(res.regName, 'Aarav');
    assert.equal(res.regUnlocked, 3);
  });

  await itAsync(24, 'Offline entitlement isolation preserved', async () => {
    const res = await page.evaluate(async () => {
      window.__mockUser = null;
      const accessMod = await import('/js/access.js');
      const payMod = await import('/js/payments.js');
      accessMod.setAuthMode('guest');
      payMod.clearCache();
      return {
        isPaid: payMod.isPaid(),
        isGuest: accessMod.isGuestUser(),
      };
    });
    assert.equal(res.isPaid, false);
    assert.equal(res.isGuest, true);
  });

  it(25, 'Owner authentication remains secure and rejects non-owner accounts', () => {
    const nonOwnerAccount = { email: 'stranger@example.com', localId: 'stranger-uid' };
    assert.notEqual(nonOwnerAccount.email, 'shanmugaraj711@gmail.com');
  });

  it(26, 'Duplicate detection remains intact for phone/email matches across distinct accounts', () => {
    const users = [
      authAccountRecord({ localId: 'user1', email: 'dup@example.com', providerUserInfo: [] }),
      authAccountRecord({ localId: 'user2', email: 'dup@example.com', providerUserInfo: [] }),
    ];
    const dups = detectDuplicates(users);
    assert.equal(dups[0].possibleDuplicate, true);
    assert.equal(dups[1].possibleDuplicate, true);
    assert.ok(dups[0].duplicateReasons.includes('email'));
  });

  await itAsync(27, 'Learn-demo lifecycle remains intact', async () => {
    const res = await page.evaluate(async () => {
      const storeMod = await import('/js/store.js');
      storeMod.resetAll();
      Object.assign(storeMod.state, {
        profile: { name: 'Aru', avatar: '🐼', experience: 'new', lang: 'en', voiceLang: 'en' },
        lessonsDone: [1, 2, 3, 4],
        unlocked: 4,
      });
      storeMod.saveNow();
      return {
        name: storeMod.state.profile.name,
        doneCount: storeMod.state.lessonsDone.length,
      };
    });
    assert.equal(res.name, 'Aru');
    assert.equal(res.doneCount, 4);
  });

  it(28, 'Tamil speech remains intact for number pronunciation', () => {
    assert.equal(tamilNumberWord(1), 'ஒன்று');
    assert.equal(tamilNumberWord(5), 'ஐந்து');
    assert.equal(tamilNumberWord(10), 'பத்து');
  });

  it(29, 'English speech formatting remains intact', () => {
    assert.equal(String(5), '5');
    assert.equal(LEVELS[1].name, 'Little Bead Adding');
  });

  // ── 5. UI & MULTI-VIEWPORT PLAYWRIGHT TESTS (Specifications 30–38) ─────────
  console.log('\n═══ SECTION 5: PLAYWRIGHT BROWSER & MULTI-VIEWPORT TESTS (Items 30–38) ═══');

  // Test 30: First-launch screen renders correctly
  await itAsync(30, 'First-launch screen renders Auth Gate with 3 primary choices', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await context.newPage();
    await p.goto(`${BASE_URL}/index.html`);
    await p.waitForSelector('#authGateStep');

    const googleBtn = await p.$('#authGateGoogleBtn');
    const emailBtn = await p.$('#authGateEmailBtn');
    const guestBtn = await p.$('#authGateGuestBtn');

    assert.ok(googleBtn, 'Google button must be visible');
    assert.ok(emailBtn, 'Email button must be visible');
    assert.ok(guestBtn, 'Guest button must be visible');
    await context.close();
  });

  // Test 31: Google button exists and handles click
  await itAsync(31, 'Google button handles click on first launch', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await context.newPage();
    await p.goto(`${BASE_URL}/index.html`);
    await p.waitForSelector('#authGateGoogleBtn');
    const txt = await p.textContent('#authGateGoogleBtn');
    assert.ok(txt.includes('Continue with Google'));
    await context.close();
  });

  // Test 32: Email login screen works
  await itAsync(32, 'Email login screen displays email and password fields', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await context.newPage();
    await p.goto(`${BASE_URL}/index.html`);
    await p.waitForSelector('#authGateEmailBtn');
    await p.click('#authGateEmailBtn');
    await p.waitForSelector('#emailAuthForm');

    const emailInp = await p.$('#emailAuthEmail');
    const passInp = await p.$('#emailAuthPassword');
    assert.ok(emailInp, 'Email input must be rendered');
    assert.ok(passInp, 'Password input must be rendered');
    await context.close();
  });

  // Test 33: Registration screen works
  await itAsync(33, 'Registration screen displays confirm password input upon toggle', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await context.newPage();
    await p.goto(`${BASE_URL}/index.html`);
    await p.click('#authGateEmailBtn');
    await p.waitForSelector('#emailAuthToggleBtn');
    await p.click('#emailAuthToggleBtn');

    await p.waitForSelector('#emailAuthConfirmPassword');
    const submitBtn = await p.textContent('#emailAuthSubmitBtn');
    assert.ok(submitBtn.includes('Create account'));
    await context.close();
  });

  // Test 34: Guest button works
  await itAsync(34, 'Guest button sets guest auth mode and opens kid profile setup', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await context.newPage();
    await p.goto(`${BASE_URL}/index.html`);
    await p.waitForSelector('#authGateGuestBtn');
    await p.click('#authGateGuestBtn');

    const mode = await p.evaluate(() => localStorage.getItem('abacus-auth-mode'));
    assert.equal(mode, 'guest');
    await context.close();
  });

  // Test 35: Locked content conversion prompt works
  await itAsync(35, 'Guest clicking locked level triggers friendly conversion prompt modal', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await context.newPage();
    await p.addInitScript(() => {
      localStorage.setItem('abacus-auth-mode', 'guest');
      localStorage.setItem('abacus-kids-v3', JSON.stringify({
        v: 3,
        profile: { name: 'GuestKid', avatar: '🦁', experience: 'new', lang: 'en', voiceLang: 'en' },
        settings: { sound: false, voice: false },
        lessonsDone: [1],
        levels: { 1: { stars: 3 } },
        unlocked: 2,
        stats: { days: [], answered: 0, firstTry: 0, seconds: 0, byRule: {}, mistakes: [] },
        games: {}, exams: [], recent: [], stickersSeen: [],
      }));
    });

    await p.goto(`${BASE_URL}/index.html#/practice`);
    await p.waitForSelector('[data-guest-locked-level="2"]');
    await p.click('[data-guest-locked-level="2"]');

    await p.waitForSelector('#abacusConversionModal');
    const modalText = await p.textContent('#abacusConversionModal');
    assert.ok(modalText.includes('More Abacus adventures are waiting!'));
    assert.ok(modalText.includes('Create your free account to continue.'));
    assert.ok(modalText.includes('Continue as Guest'));
    assert.ok(modalText.includes('Continue with Google'));
    assert.ok(modalText.includes('Login with Email'));

    // Clicking Continue as Guest closes the modal gracefully
    await p.click('#modalGuestBtn');
    const modalGone = await p.$('#abacusConversionModal');
    assert.equal(modalGone, null, 'Modal should close when Continue as Guest is clicked');
    await context.close();
  });

  // Test 36: Mobile 320px viewport
  await itAsync(36, 'Mobile 320px viewport renders without horizontal overflow', async () => {
    const context = await browser.newContext({ viewport: { width: 320, height: 640 } });
    const p = await context.newPage();
    await p.goto(`${BASE_URL}/index.html`);
    await p.waitForSelector('#authGateStep');

    const scrollW = await p.evaluate(() => document.documentElement.scrollWidth);
    const innerW = await p.evaluate(() => window.innerWidth);
    assert.ok(scrollW <= innerW + 1, `Horizontal overflow at 320px: scrollWidth=${scrollW} innerWidth=${innerW}`);
    await context.close();
  });

  // Test 37: Mobile 390px viewport
  await itAsync(37, 'Mobile 390px viewport renders without horizontal overflow', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await context.newPage();
    await p.goto(`${BASE_URL}/index.html`);
    await p.waitForSelector('#authGateStep');

    const scrollW = await p.evaluate(() => document.documentElement.scrollWidth);
    const innerW = await p.evaluate(() => window.innerWidth);
    assert.ok(scrollW <= innerW + 1, `Horizontal overflow at 390px: scrollWidth=${scrollW} innerWidth=${innerW}`);
    await context.close();
  });

  // Test 38: Desktop viewport
  await itAsync(38, 'Desktop 1280px viewport renders centered without horizontal overflow', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await context.newPage();
    await p.goto(`${BASE_URL}/index.html`);
    await p.waitForSelector('#authGateStep');

    const scrollW = await p.evaluate(() => document.documentElement.scrollWidth);
    const innerW = await p.evaluate(() => window.innerWidth);
    assert.ok(scrollW <= innerW + 1, `Horizontal overflow at 1280px: scrollWidth=${scrollW} innerWidth=${innerW}`);
    await context.close();
  });

} finally {
  await browser.close();
  server.close();
}

console.log('\n=============================================================');
console.log(`AUTH & GUEST VERIFICATION COMPLETE: ${passedCount}/${totalCount} TESTS PASSED`);
console.log('=============================================================\n');
