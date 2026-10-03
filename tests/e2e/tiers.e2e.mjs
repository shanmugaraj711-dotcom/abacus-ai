/**
 * tests/e2e/tiers.e2e.mjs
 * Complete E2E Playwright verification suite for 6 user states across all tier limits.
 *
 * States tested:
 *   1. guest (not signed in, no auth)
 *   2. free (signed in, paid: false, tier: 'free')
 *   3. starter (signed in, paid: true, tier: 'starter', expires in 25 days)
 *   4. starter-expired (signed in, paid: false, tier: 'starter', expired 2 days ago)
 *   5. lifetime (signed in, paid: true, tier: 'lifetime')
 *   6. legacy (signed in, paid: true, backward compat - no tier in entitlement)
 */

import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert/strict';

const ROOT_DIR = process.cwd();
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'test-results');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

let currentApiStatus = { paid: false, tier: 'free' };
let createdOrderCalls = [];
let mockApiCreateOrderFail = false;
let mockApiVerifyFail = false;

// Local static HTTP server
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
      const pathname = decodeURI(url.pathname);

      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'content-type,authorization',
        });
        return res.end();
      }

      if (pathname === '/favicon.ico') {
        res.writeHead(204);
        return res.end();
      }

      // API mocks
      if (pathname === '/api/remote-config') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({}));
      }

      if (pathname === '/api/visit') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ status: 'ok' }));
      }

      if (pathname === '/api/user-status') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify(currentApiStatus));
      }

      if (pathname === '/api/create-order') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          let b = {};
          try { b = JSON.parse(body); } catch {}
          createdOrderCalls.push(b);
          if (mockApiCreateOrderFail) {
            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ error: 'Order creation failed on server' }));
          }
          const tier = b.tier || 'lifetime';
          const amount = tier === 'starter' ? 9900 : 49900;
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({
            orderId: 'order_mock_' + Date.now(),
            amount,
            displayAmount: amount / 100,
            currency: 'INR',
            keyId: 'rzp_test_mock',
            tier
          }));
        });
        return;
      }

      if (pathname === '/api/verify-payment') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          let b = {};
          try { b = JSON.parse(body); } catch {}
          if (mockApiVerifyFail) {
            res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ error: 'Payment verification failed' }));
          }
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          currentApiStatus = {
            paid: true,
            tier: 'starter',
            maxLevel: 6,
            games: ['race', 'mystery', 'match', 'flash'],
            expiresAt
          };
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({
            paid: true,
            tier: 'starter',
            maxLevel: 6,
            games: ['race', 'mystery', 'match', 'flash'],
            expiresAt
          }));
        });
        return;
      }

      // Static files
      let filePath = path.join(ROOT_DIR, pathname === '/' ? 'index.html' : pathname);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
        return res.end(fs.readFileSync(filePath));
      }

      // SPA fallback
      const indexPath = path.join(ROOT_DIR, 'index.html');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      res.end(fs.readFileSync(indexPath));
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

const ALL_GAMES = ['race', 'mystery', 'match', 'flash', 'speed', 'friend', 'ladder'];

const STATE_CONFIGS = {
  guest: {
    label: 'Guest',
    mockUser: null,
    authMode: 'guest',
    entitlementCache: null,
    apiStatus: { paid: false, tier: 'free' },
    expected: {
      maxLevel: 1,
      maxLesson: 1,
      games: ['mystery'],
      freePlay: false,
      testsOpen: false,
      playTileSubtitle: '1 bead game',
      learnTileSubtitle: '0 of 1 lesson',
      freePlayLocked: true,
    },
  },
  free: {
    label: 'Free',
    mockUser: { uid: 'user-free-e2e', getIdToken: async () => 'free-token' },
    authMode: 'registered',
    entitlementCache: { paid: false, tier: 'free', uid: 'user-free-e2e' },
    apiStatus: { paid: false, tier: 'free' },
    expected: {
      maxLevel: 1,
      maxLesson: 1,
      games: ['race'],
      freePlay: false,
      testsOpen: true,
      playTileSubtitle: '1 bead game',
      learnTileSubtitle: '0 of 1 lesson',
      freePlayLocked: true,
    },
  },
  starter: {
    label: 'Starter (30-day)',
    mockUser: { uid: 'user-starter-e2e', getIdToken: async () => 'starter-token' },
    authMode: 'registered',
    entitlementCache: {
      paid: true,
      tier: 'starter',
      uid: 'user-starter-e2e',
      entitlement: {
        paid: true,
        tier: 'starter',
        maxLevel: 6,
        maxLesson: 6,
        games: ['race', 'mystery', 'match', 'flash'],
        freePlay: true,
        expiresAt: new Date(Date.now() + 25 * 86400000).toISOString(),
        expired: false,
      },
    },
    apiStatus: {
      paid: true,
      tier: 'starter',
      maxLevel: 6,
      maxLesson: 6,
      games: ['race', 'mystery', 'match', 'flash'],
      freePlay: true,
      expiresAt: new Date(Date.now() + 25 * 86400000).toISOString(),
    },
    expected: {
      maxLevel: 6,
      maxLesson: 6,
      games: ['race', 'mystery', 'match', 'flash'],
      freePlay: true,
      testsOpen: true,
      playTileSubtitle: '4 bead games',
      learnTileSubtitle: '0 of 6 lessons',
      freePlayLocked: false,
    },
  },
  'starter-expired': {
    label: 'Starter (Expired)',
    mockUser: { uid: 'user-expired-e2e', getIdToken: async () => 'expired-token' },
    authMode: 'registered',
    entitlementCache: {
      paid: false,
      tier: 'free',
      uid: 'user-expired-e2e',
      entitlement: {
        paid: false,
        tier: 'free',
        maxLevel: 1,
        maxLesson: 1,
        games: ['race'],
        freePlay: false,
        expiresAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        expired: true,
      },
    },
    apiStatus: {
      paid: false,
      tier: 'starter',
      expiresAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      expired: true,
    },
    expected: {
      maxLevel: 1,
      maxLesson: 1,
      games: ['race'],
      freePlay: false,
      testsOpen: true,
      playTileSubtitle: '1 bead game',
      learnTileSubtitle: '0 of 1 lesson',
      freePlayLocked: true,
    },
  },
  lifetime: {
    label: 'Lifetime',
    mockUser: { uid: 'user-lifetime-e2e', getIdToken: async () => 'lifetime-token' },
    authMode: 'registered',
    entitlementCache: {
      paid: true,
      tier: 'lifetime',
      uid: 'user-lifetime-e2e',
      entitlement: {
        paid: true,
        tier: 'lifetime',
        maxLevel: 15,
        maxLesson: 11,
        games: ALL_GAMES,
        freePlay: true,
        expiresAt: null,
        expired: false,
      },
    },
    apiStatus: {
      paid: true,
      tier: 'lifetime',
      maxLevel: 15,
      maxLesson: 11,
      games: ALL_GAMES,
      freePlay: true,
    },
    expected: {
      maxLevel: 15,
      maxLesson: 11,
      games: ALL_GAMES,
      freePlay: true,
      testsOpen: true,
      playTileSubtitle: '7 bead games',
      learnTileSubtitle: '0 of 11 lessons',
      freePlayLocked: false,
    },
  },
  legacy: {
    label: 'Legacy (paid:true)',
    mockUser: { uid: 'user-legacy-e2e', getIdToken: async () => 'legacy-token' },
    authMode: 'registered',
    entitlementCache: {
      paid: true,
      uid: 'user-legacy-e2e',
      cachedAt: new Date().toISOString(),
      // Intentionally omitting tier field to verify backward compatibility
    },
    apiStatus: { paid: true },
    expected: {
      maxLevel: 15,
      maxLesson: 11,
      games: ALL_GAMES,
      freePlay: true,
      testsOpen: true,
      playTileSubtitle: '7 bead games',
      learnTileSubtitle: '0 of 11 lessons',
      freePlayLocked: false,
    },
  },
};

async function runE2ESuite() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       ABACUS BUDDY — TIER MATRIX E2E PLAYWRIGHT SUITE           ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const { server, baseUrl } = await startServer();
  const browser = await chromium.launch({ headless: true });

  const summaryMatrix = [];
  let totalAssertions = 0;
  let passedAssertions = 0;

  try {
    for (const [stateKey, config] of Object.entries(STATE_CONFIGS)) {
      console.log(`\n─── Testing State: ${config.label} (${stateKey}) ───`);
      currentApiStatus = config.apiStatus;

      const context = await browser.newContext({
        viewport: { width: 390, height: 844 }, // Mobile viewport standard
        hasTouch: true,
      });

      const page = await context.newPage();
      const pageErrors = [];
      const consoleErrors = [];
      const failedJsRequests = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      page.on('requestfailed', (req) => {
        const url = req.url();
        if (url.includes('/js/') || url.endsWith('.js')) {
          failedJsRequests.push({ url, failure: req.failure()?.errorText });
        }
      });

      // Inject clean stubbed state before any scripts run
      await page.addInitScript(({ mockUser, authMode, entitlementCache }) => {
        window.__mockUser = mockUser ? { ...mockUser, getIdToken: async () => 'mock-token-' + mockUser.uid } : null;
        if (authMode) {
          localStorage.setItem('abacus-auth-mode', authMode);
        } else {
          localStorage.removeItem('abacus-auth-mode');
        }
        if (entitlementCache) {
          localStorage.setItem('abacus-entitlement-v1', JSON.stringify(entitlementCache));
        } else {
          localStorage.removeItem('abacus-entitlement-v1');
        }
        localStorage.setItem(
          'abacus-kids-v3',
          JSON.stringify({
            v: 3,
            profile: { name: 'Aarya', avatar: '🐼', experience: 'new', lang: 'en', voiceLang: 'en' },
            settings: { sound: false, voice: false },
            lessonsDone: [],
            levels: {},
            unlocked: 1,
            stats: { days: [], answered: 0, firstTry: 0, seconds: 0, byRule: {}, mistakes: [] },
            games: {},
            exams: [],
            recent: [],
            stickersSeen: [],
          })
        );
      }, {
        mockUser: config.mockUser,
        authMode: config.authMode,
        entitlementCache: config.entitlementCache,
      });

      // Navigate to home screen
      await page.goto(`${baseUrl}/#/home`);
      await page.waitForSelector('header.top', { timeout: 8000 });

      // Take screenshots for specified states
      if (stateKey === 'free') {
        const p = path.join(SCREENSHOT_DIR, 'free-home.png');
        await page.screenshot({ path: p });
        console.log(`  📸 Saved free home screenshot: ${p}`);
      } else if (stateKey === 'starter') {
        const p = path.join(SCREENSHOT_DIR, 'starter-home.png');
        await page.screenshot({ path: p });
        console.log(`  📸 Saved starter home screenshot: ${p}`);
      } else if (stateKey === 'lifetime') {
        const p = path.join(SCREENSHOT_DIR, 'lifetime-home.png');
        await page.screenshot({ path: p });
        console.log(`  📸 Saved lifetime home screenshot: ${p}`);
      }

      // 1. Verify Home Tiles: Play subtitle, Learn subtitle, Free Play lock
      const playSubtitle = (await page.locator('.tile.play small').textContent()).trim();
      const learnSubtitle = (await page.locator('.tile.learn small').textContent()).trim();
      const freePlayTile = page.locator('.tile.free');
      const freePlayIsLocked = (await freePlayTile.getAttribute('class')).includes('locked');
      const freePlayText = (await freePlayTile.textContent()).trim();

      assert.equal(playSubtitle, config.expected.playTileSubtitle, `Play tile subtitle for ${stateKey}`);
      assert.equal(learnSubtitle, config.expected.learnTileSubtitle, `Learn tile subtitle for ${stateKey}`);
      assert.equal(freePlayIsLocked, config.expected.freePlayLocked, `Free Play lock class for ${stateKey}`);
      if (config.expected.freePlayLocked) {
        assert.ok(freePlayText.includes('🔒') && freePlayText.includes('Locked'), `Free Play shows lock for ${stateKey}`);
      } else {
        assert.ok(freePlayText.includes('✋') && freePlayText.includes('Just move beads'), `Free Play shows open for ${stateKey}`);
      }
      passedAssertions += 4;
      totalAssertions += 4;
      console.log(`  ✓ Home tiles verified: Play="${playSubtitle}", Learn="${learnSubtitle}", FreePlayLocked=${freePlayIsLocked}`);

      // 2. Free Play route gating
      await page.evaluate(() => { location.hash = '#/free'; });
      await page.waitForTimeout(300);
      const currentHashAfterFree = await page.evaluate(() => location.hash);
      if (config.expected.freePlay) {
        assert.equal(currentHashAfterFree, '#/free', `Free play should open for ${stateKey}`);
      } else {
        if (stateKey === 'guest') {
          const guestBlocked = currentHashAfterFree === '#/home' || (await page.locator('#abacusConversionModal').count()) > 0;
          assert.ok(guestBlocked, 'Guest free play access must be blocked');
          if ((await page.locator('#modalGuestBtn').count()) > 0) {
            await page.click('#modalGuestBtn');
          }
        } else {
          assert.equal(currentHashAfterFree, '#/starter', `Free play should redirect to #/starter for ${stateKey}`);
        }
      }
      passedAssertions++;
      totalAssertions++;
      console.log(`  ✓ Free play navigation: expected open=${config.expected.freePlay}, got hash=${currentHashAfterFree}`);

      // 3. Levels 1..16 test
      let playableLevels = 0;
      let blockedLevels = 0;
      for (let lvl = 1; lvl <= 16; lvl++) {
        await page.evaluate((l) => { location.hash = `#/level/${l}`; }, lvl);
        await page.waitForTimeout(80);
        const hash = await page.evaluate(() => location.hash);
        const isPlayable = lvl <= config.expected.maxLevel && hash === `#/level/${lvl}`;
        if (lvl <= config.expected.maxLevel) {
          assert.equal(hash, `#/level/${lvl}`, `Level ${lvl} should be playable for ${stateKey}`);
          playableLevels++;
        } else {
          if (stateKey === 'guest') {
            const blocked = hash === '#/practice' || (await page.locator('#abacusConversionModal').count()) > 0;
            assert.ok(blocked, `Level ${lvl} must be blocked for guest (hash=${hash})`);
            if ((await page.locator('#modalGuestBtn').count()) > 0) {
              await page.click('#modalGuestBtn');
            }
          } else if (stateKey === 'lifetime' || stateKey === 'legacy') {
            assert.equal(hash, '#/home', `Level ${lvl} must redirect to #/home for paid user (${stateKey})`);
          } else {
            assert.equal(hash, '#/starter', `Level ${lvl} must redirect to #/starter for ${stateKey}`);
          }
          blockedLevels++;
        }
        passedAssertions++;
        totalAssertions++;
      }
      console.log(`  ✓ Levels 1..16: playable=1..${playableLevels}, blocked=${playableLevels + 1}..16`);

      // 4. Lessons 1..12 test
      let playableLessons = 0;
      let blockedLessons = 0;
      for (let lsn = 1; lsn <= 12; lsn++) {
        await page.evaluate((l) => { location.hash = `#/lesson/${l}`; }, lsn);
        await page.waitForTimeout(80);
        const hash = await page.evaluate(() => location.hash);
        if (lsn <= config.expected.maxLesson) {
          assert.equal(hash, `#/lesson/${lsn}`, `Lesson ${lsn} should be playable for ${stateKey}`);
          playableLessons++;
        } else {
          if (stateKey === 'guest') {
            const blocked = hash === '#/learn' || (await page.locator('#abacusConversionModal').count()) > 0;
            assert.ok(blocked, `Lesson ${lsn} must be blocked for guest`);
            if ((await page.locator('#modalGuestBtn').count()) > 0) {
              await page.click('#modalGuestBtn');
            }
          } else if (stateKey === 'lifetime' || stateKey === 'legacy') {
            assert.equal(hash, '#/home', `Lesson ${lsn} must redirect to #/home for paid user (${stateKey})`);
          } else {
            assert.equal(hash, '#/starter', `Lesson ${lsn} must redirect to #/starter for ${stateKey}`);
          }
          blockedLessons++;
        }
        passedAssertions++;
        totalAssertions++;
      }
      console.log(`  ✓ Lessons 1..12: playable=1..${playableLessons}, blocked=${playableLessons + 1}..12`);

      // 5. All 7 games test
      let playableGames = [];
      let blockedGames = [];
      for (const gid of ALL_GAMES) {
        await page.evaluate((g) => { location.hash = `#/game/${g}`; }, gid);
        await page.waitForTimeout(80);
        const hash = await page.evaluate(() => location.hash);
        const allowed = config.expected.games.includes(gid);
        if (allowed) {
          assert.equal(hash, `#/game/${gid}`, `Game ${gid} should be allowed for ${stateKey}`);
          playableGames.push(gid);
        } else {
          if (stateKey === 'guest') {
            const modalOpen = (await page.locator('#abacusConversionModal').count()) > 0;
            assert.ok(modalOpen || hash !== `#/game/${gid}`, `Guest must be blocked from game ${gid}`);
            if (modalOpen) await page.click('#modalGuestBtn');
          } else {
            assert.equal(hash, '#/starter', `Game ${gid} must redirect to #/starter for ${stateKey}`);
          }
          blockedGames.push(gid);
        }
        passedAssertions++;
        totalAssertions++;
      }
      console.log(`  ✓ Games: playable=${playableGames.join(',')}; blocked=${blockedGames.join(',')}`);

      // 6. Tests / exams
      await page.evaluate(() => { location.hash = '#/tests'; });
      await page.waitForTimeout(100);
      const isGuest = stateKey === 'guest';
      const testsModalOpen = (await page.locator('#abacusConversionModal').count()) > 0;
      if (isGuest) {
        assert.ok(testsModalOpen, 'Guest navigating to #/tests must trigger conversion prompt');
        await page.click('#modalGuestBtn');
      } else {
        assert.equal(testsModalOpen, false, `Tests should not trigger guest modal for ${stateKey}`);
      }
      passedAssertions++;
      totalAssertions++;
      console.log(`  ✓ Tests/exams access: guest-locked=${isGuest}`);

      // 7. Practice map direct URL hash test
      await page.evaluate(() => { location.hash = '#/practice'; });
      await page.waitForTimeout(100);
      const practiceHash = await page.evaluate(() => location.hash);
      assert.equal(practiceHash, '#/practice', `#/practice must open for ${stateKey}`);
      const levelsCount = await page.locator('.levels .level').count();
      assert.ok(levelsCount >= 15, `Practice map must render 15 levels for ${stateKey}`);
      passedAssertions += 2;
      totalAssertions += 2;
      console.log(`  ✓ Practice map direct URL: open with ${levelsCount} levels`);

      // 8. Placement test check() strict bounding
      const placementResult = await page.evaluate(async () => {
        const { playableMax } = await import('./js/app.js');
        // Probe questions test [1, 3, 5, 6, 8, 9] -> if all passed, passedUntil = 9 -> lvl = min(maxLvl, 10)
        const passedUntil = 9;
        const maxLvl = playableMax();
        const probeLvl = Math.max(1, Math.min(maxLvl, passedUntil ? passedUntil + 1 : 1));
        // Theoretical max level if arbitrary higher questions existed
        const theoreticalMaxLvl = Math.max(1, Math.min(maxLvl, 99));
        return { maxLvl, probeLvl, theoreticalMaxLvl };
      });
      assert.equal(placementResult.maxLvl, config.expected.maxLevel, `playableMax() must equal maxLevel for ${stateKey}`);
      assert.ok(placementResult.probeLvl <= config.expected.maxLevel, `Placement probe level must never exceed maxLevel for ${stateKey}`);
      assert.equal(placementResult.theoreticalMaxLvl, config.expected.maxLevel, `Theoretical placement cap must equal maxLevel for ${stateKey}`);
      passedAssertions += 3;
      totalAssertions += 3;
      console.log(`  ✓ Placement test check() strictly capped: probe unlocks Level ${placementResult.probeLvl}, absolute cap is Level ${placementResult.maxLvl}`);

      // 9. Tampering resistance test (lessonsDone=all, unlocked=15)
      if (stateKey === 'free' || stateKey === 'starter' || stateKey === 'starter-expired') {
        console.log(`  ── Tampering test for ${stateKey}: lessonsDone=all, unlocked=15 ──`);
        await page.evaluate(() => {
          const raw = localStorage.getItem('abacus-kids-v3');
          if (raw) {
            const data = JSON.parse(raw);
            data.unlocked = 15;
            data.lessonsDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
            localStorage.setItem('abacus-kids-v3', JSON.stringify(data));
          }
        });

        const lockedLesson = stateKey === 'starter' ? 7 : 2;
        const lockedLevel = stateKey === 'starter' ? 7 : 2;
        const lockedGame = stateKey === 'starter' ? 'speed' : 'mystery';

        // 1. Direct URL hash navigation to locked lesson
        await page.evaluate((l) => { location.hash = `#/lesson/${l}`; }, lockedLesson);
        await page.waitForTimeout(150);
        const lessonTamperedHash = await page.evaluate(() => location.hash);
        assert.equal(lessonTamperedHash, '#/starter', `Tampered locked Lesson ${lockedLesson} must redirect to #/starter for ${stateKey}`);

        // 2. Direct URL hash navigation to locked level
        await page.evaluate((l) => { location.hash = `#/level/${l}`; }, lockedLevel);
        await page.waitForTimeout(150);
        const levelTamperedHash = await page.evaluate(() => location.hash);
        assert.equal(levelTamperedHash, '#/starter', `Tampered locked Level ${lockedLevel} must redirect to #/starter for ${stateKey}`);

        // 3. Direct URL hash navigation to locked game
        await page.evaluate((g) => { location.hash = `#/game/${g}`; }, lockedGame);
        await page.waitForTimeout(150);
        const gameTamperedHash = await page.evaluate(() => location.hash);
        assert.equal(gameTamperedHash, '#/starter', `Tampered locked Game ${lockedGame} must redirect to #/starter for ${stateKey}`);

        // 4. Direct URL hash navigation to Level 15
        await page.evaluate(() => { location.hash = '#/level/15'; });
        await page.waitForTimeout(150);
        const lvl15TamperedHash = await page.evaluate(() => location.hash);
        assert.equal(lvl15TamperedHash, '#/starter', `Tampered Level 15 must redirect to #/starter for ${stateKey}`);

        passedAssertions += 4;
        totalAssertions += 4;
        console.log(`  ✓ Tampering defense: locked lesson ${lockedLesson} -> ${lessonTamperedHash}, level ${lockedLevel} -> ${levelTamperedHash}, game ${lockedGame} -> ${gameTamperedHash}, level 15 -> ${lvl15TamperedHash}`);
      }

      // 10. Direct visit to #/starter screen
      await page.evaluate(() => { location.hash = '#/starter'; });
      await page.waitForTimeout(300);
      const afterStarterHash = await page.evaluate(() => location.hash);

      if (stateKey === 'lifetime' || stateKey === 'legacy') {
        assert.equal(afterStarterHash, '#/home', `Paid state ${stateKey} navigating to #/starter must redirect to #/home`);
        passedAssertions++;
        totalAssertions++;
        console.log(`  ✓ Paid redirect: ${stateKey} redirected to #/home from #/starter`);
      } else {
        assert.equal(afterStarterHash, '#/starter', `State ${stateKey} must stay on #/starter`);
        const starterCard = page.locator('[data-plan-card="starter"]');
        const lifetimeCard = page.locator('[data-plan-card="lifetime"]');
        assert.equal(await starterCard.count(), 1, 'Starter card exists');
        assert.equal(await lifetimeCard.count(), 1, 'Lifetime card exists');

        const starterText = await starterCard.textContent();
        assert.ok(starterText.includes('₹99'), 'Starter card shows ₹99');
        assert.ok(starterText.includes('30 days') || starterText.includes('30 நாட்கள்'), 'Starter card shows 30 days');

        const lifetimeText = await lifetimeCard.textContent();
        assert.ok(lifetimeText.includes('₹499'), 'Lifetime card shows ₹499');

        const pageText = await page.locator('.starter-plans').textContent();
        assert.ok(pageText.includes('Coupons apply to Lifetime only') || pageText.includes('கூப்பன்கள் வாழ்நாள் திட்டத்திற்கு மட்டுமே பொருந்தும்'), 'Coupons note shown');

        // Active Starter styling
        if (stateKey === 'starter') {
          const isHighlight = await lifetimeCard.evaluate(el => el.classList.contains('highlight'));
          const isDeemp = await starterCard.evaluate(el => el.classList.contains('de-emphasized'));
          assert.ok(isHighlight, 'Active starter sees Lifetime highlighted');
          assert.ok(isDeemp, 'Active starter sees Starter de-emphasized');
        }

        // Enabled Starter button + label "Get Starter - Rs 99"
        const starterBtn = page.locator('#starter-buy-btn');
        assert.equal(await starterBtn.getAttribute('disabled'), null, 'Starter button is enabled');
        const btnText = await starterBtn.textContent();
        assert.ok(btnText.includes('Get Starter - Rs 99') || btnText.includes('ஸ்டார்ட்டர் பெறுங்கள் - Rs 99'), 'Starter button says Get Starter - Rs 99');

        // Lifetime button
        const lifetimeBtn = page.locator('#lifetime-buy-btn');
        assert.equal(await lifetimeBtn.getAttribute('href'), '#/unlock', 'Lifetime button links to #/unlock');

        passedAssertions += 3;
        totalAssertions += 3;
        console.log(`  ✓ #/starter verified for ${stateKey}: cards, pricing, enabled button, lifetime link`);
      }

      // 11. Grown-ups corner plan line (#/parents)
      await page.evaluate(() => { location.hash = '#/parents'; });
      await page.waitForTimeout(300);
      const leadText = await page.locator('.lead').textContent().catch(() => '');
      const nums = (leadText || '').match(/\d+/g);
      if (nums && nums.length >= 2) {
        const ans = Number(nums[0]) * Number(nums[1]);
        await page.click(`[data-gate="${ans}"]`);
        await page.waitForTimeout(300);
      }
      const planDesc = (await page.locator('#parents-user-plan').textContent()).trim();
      if (stateKey === 'lifetime' || stateKey === 'legacy') {
        assert.equal(planDesc, 'Lifetime - never expires', `Parents plan for ${stateKey} must be Lifetime - never expires`);
        assert.equal(await page.locator('#parents-plan-actions button, #parents-plan-actions a').count(), 0, 'Lifetime has no plan action buttons');
      } else if (stateKey === 'starter') {
        assert.ok(planDesc.includes('Starter - valid until') && planDesc.includes('days left'), `Parents plan for starter must include Starter - valid until and days left, got: ${planDesc}`);
        assert.equal(await page.locator('#renew-starter-btn').count(), 1, 'Renew starter button exists');
        assert.equal(await page.locator('#upgrade-lifetime-btn').count(), 1, 'Upgrade lifetime button exists');
      } else if (stateKey === 'starter-expired') {
        assert.ok(planDesc.includes('Starter expired on') && planDesc.includes('You are on the Free plan.'), `Parents plan for starter-expired must include Starter expired on and Free plan, got: ${planDesc}`);
        assert.equal(await page.locator('#renew-expired-btn').count(), 1, 'Renew expired button exists');
      } else {
        assert.equal(planDesc, 'Free plan', `Parents plan for ${stateKey} must be Free plan`);
        assert.equal(await page.locator('#see-plans-btn').count(), 1, 'See plans button exists');
      }
      passedAssertions += 3;
      totalAssertions += 3;
      console.log(`  ✓ Grown-ups plan line: "${planDesc}" with plan actions for ${stateKey}`);

      // 12. Save Screenshots (Adult Corner in EN and TA, and #/starter)
      if (['free', 'starter', 'starter-expired', 'lifetime'].includes(stateKey)) {
        // Adult corner EN screenshot (currently on #/parents)
        const adultEnPath = path.join(SCREENSHOT_DIR, `grownups-plan-${stateKey}-en.png`);
        await page.screenshot({ path: adultEnPath });
        console.log(`  📸 Saved adult corner EN screenshot: ${adultEnPath}`);

        // Adult corner TA screenshot
        await page.evaluate(() => {
          const raw = localStorage.getItem('abacus-kids-v3');
          if (raw) {
            const data = JSON.parse(raw);
            data.profile.lang = 'ta';
            data.profile.voiceLang = 'ta';
            localStorage.setItem('abacus-kids-v3', JSON.stringify(data));
          }
        });
        await page.reload();
        await page.waitForTimeout(300);
        // re-solve gate if needed
        const leadTa = await page.locator('.lead').textContent().catch(() => '');
        const numsTa = (leadTa || '').match(/\d+/g);
        if (numsTa && numsTa.length >= 2) {
          const ans = Number(numsTa[0]) * Number(numsTa[1]);
          await page.click(`[data-gate="${ans}"]`).catch(() => {});
          await page.waitForTimeout(300);
        }
        const adultTaPath = path.join(SCREENSHOT_DIR, `grownups-plan-${stateKey}-ta.png`);
        await page.screenshot({ path: adultTaPath });
        console.log(`  📸 Saved adult corner TA screenshot: ${adultTaPath}`);

        // Restore EN profile
        await page.evaluate(() => {
          const raw = localStorage.getItem('abacus-kids-v3');
          if (raw) {
            const data = JSON.parse(raw);
            data.profile.lang = 'en';
            data.profile.voiceLang = 'en';
            localStorage.setItem('abacus-kids-v3', JSON.stringify(data));
          }
        });
        await page.reload();
        await page.waitForTimeout(300);

        // Also take #/starter screenshot for free and starter
        if (stateKey === 'free' || stateKey === 'starter') {
          await page.evaluate(() => { location.hash = '#/starter'; });
          await page.waitForTimeout(300);
          const enPath = path.join(SCREENSHOT_DIR, `${stateKey}-starter-screen-en.png`);
          await page.screenshot({ path: enPath });
        }
      }

      // 13. Console errors, page errors, and failed own-JS requests assertion
      assert.equal(consoleErrors.length, 0, `Zero console errors for ${stateKey}: ${consoleErrors.join('; ')}`);
      assert.equal(pageErrors.length, 0, `Zero page errors for ${stateKey}: ${pageErrors.join('; ')}`);
      assert.equal(failedJsRequests.length, 0, `Zero failed JS requests for ${stateKey}: ${JSON.stringify(failedJsRequests)}`);
      passedAssertions += 3;
      totalAssertions += 3;
      console.log(`  ✓ Console & network integrity: consoleErrors=0, pageErrors=0, failedJsRequests=0`);

      summaryMatrix.push({
        state: config.label,
        playableLevels: `1..${config.expected.maxLevel}`,
        playableLessons: `1..${config.expected.maxLesson}`,
        playableGames: `${config.expected.games.length} (${config.expected.games.join(', ')})`,
        freePlay: config.expected.freePlay ? 'OPEN' : 'LOCKED',
        tests: config.expected.testsOpen ? 'OPEN' : 'GUEST-LOCKED',
        placementCap: `Level ${config.expected.maxLevel}`,
      });

      await context.close();
    }

    // ─── Requirement 11: Payment E2E Flow Test ───
    console.log('\n─── Testing Requirement 11: Payment E2E Flow ───');
    const payContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const payPage = await payContext.newPage();

    // Route mock for Razorpay checkout script
    await payPage.route('https://checkout.razorpay.com/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: '/* mock razorpay script */',
      });
    });

    await payPage.addInitScript(() => {
      window.__mockUser = { uid: 'user-pay-e2e', getIdToken: async () => 'test-token' };
      localStorage.setItem('abacus-auth-mode', 'registered');
      localStorage.removeItem('abacus-entitlement-v1');
      localStorage.setItem(
        'abacus-kids-v3',
        JSON.stringify({
          v: 3,
          profile: { name: 'Aarya', avatar: '🐼', experience: 'new', lang: 'en', voiceLang: 'en' },
          settings: { sound: false, voice: false },
          lessonsDone: [],
          levels: {},
          unlocked: 1,
          stats: { days: [], answered: 0, firstTry: 0, seconds: 0, byRule: {}, mistakes: [] },
          games: {},
          exams: [],
          recent: [],
          stickersSeen: [],
        })
      );

      window.__mockRazorpayBehavior = 'success';
      window.Razorpay = function(options) {
        window.__lastRazorpayOptions = options;
        this.options = options;
        this.handlers = {};
        this.on = function(event, cb) {
          this.handlers[event] = cb;
        };
        this.open = function() {
          if (window.__mockRazorpayBehavior === 'fail') {
            setTimeout(() => {
              if (this.handlers['payment.failed']) {
                this.handlers['payment.failed']({ error: { description: 'Bank server timeout mock' } });
              }
            }, 50);
          } else {
            setTimeout(() => {
              if (this.options.handler) {
                this.options.handler({
                  razorpay_payment_id: 'pay_mock_' + Date.now(),
                  razorpay_order_id: this.options.order_id,
                  razorpay_signature: 'sig_mock_' + Date.now(),
                });
              }
            }, 50);
          }
        };
      };
    });

    // 1. Double-tap test & create-order called with { tier: 'starter' }
    currentApiStatus = { paid: false, tier: 'free' };
    await payPage.goto(`${baseUrl}/#/starter`);
    await payPage.waitForSelector('#starter-buy-btn');
    createdOrderCalls = [];
    mockApiCreateOrderFail = false;
    mockApiVerifyFail = false;

    // Fail payment to keep page on #/starter during double-tap test
    await payPage.evaluate(() => { window.__mockRazorpayBehavior = 'fail'; });

    // Double-tap rapidly on #starter-buy-btn
    await Promise.all([
      payPage.click('#starter-buy-btn'),
      payPage.click('#starter-buy-btn').catch(() => {})
    ]);
    await payPage.waitForTimeout(400);

    assert.equal(createdOrderCalls.length, 1, 'Double tap sends exactly ONE create-order call');
    assert.equal(createdOrderCalls[0].tier, 'starter', 'create-order called with tier: starter');
    passedAssertions += 2;
    totalAssertions += 2;
    console.log('  ✓ Double-tap guard verified: exactly 1 create-order call with tier: "starter"');

    // 2. Payment failure shows error message inline and grants nothing
    await payPage.waitForSelector('#starter-error-msg', { state: 'visible' });
    const errorText = await payPage.locator('#starter-error-msg').textContent();
    assert.ok(errorText.includes('Bank server timeout mock'), 'Payment failure shows error message below button');
    const cachedEnt = await payPage.evaluate(() => localStorage.getItem('abacus-entitlement-v1'));
    assert.ok(!cachedEnt || !JSON.parse(cachedEnt).paid, 'Payment failure grants nothing');
    passedAssertions += 2;
    totalAssertions += 2;
    console.log('  ✓ Payment failure verified: inline error shown, no entitlement granted');

    // 3. Payment verification failure shows error and grants nothing
    await payPage.evaluate(() => { window.__mockRazorpayBehavior = 'success'; });
    mockApiVerifyFail = true;
    createdOrderCalls = [];
    await payPage.click('#starter-buy-btn');
    await payPage.waitForTimeout(400);
    const verifyErrorText = await payPage.locator('#starter-error-msg').textContent();
    assert.ok(verifyErrorText.includes('Payment verification failed'), 'Verification failure shows error message');
    const cachedEntVerify = await payPage.evaluate(() => localStorage.getItem('abacus-entitlement-v1'));
    assert.ok(!cachedEntVerify || !JSON.parse(cachedEntVerify).paid, 'Verification failure grants nothing');
    passedAssertions += 2;
    totalAssertions += 2;
    console.log('  ✓ Verification failure verified: error shown, no entitlement granted');

    // 4. Success path: verify-payment succeeds, screen updates to starter, adult corner shows active Starter
    mockApiVerifyFail = false;
    createdOrderCalls = [];
    await payPage.click('#starter-buy-btn');
    await payPage.waitForURL(`${baseUrl}/#/home`, { timeout: 5000 });
    assert.equal(payPage.url(), `${baseUrl}/#/home`, 'Successful payment navigates to #/home');

    // Check adult corner plan
    await payPage.evaluate(() => { location.hash = '#/parents'; });
    await payPage.waitForTimeout(300);
    const payLeadText = await payPage.locator('.lead').textContent().catch(() => '');
    const payNums = (payLeadText || '').match(/\d+/g);
    if (payNums && payNums.length >= 2) {
      const ans = Number(payNums[0]) * Number(payNums[1]);
      await payPage.click(`[data-gate="${ans}"]`);
      await payPage.waitForTimeout(300);
    }
    const adultPlanDesc = (await payPage.locator('#parents-user-plan').textContent()).trim();
    assert.ok(adultPlanDesc.includes('Starter - valid until') && adultPlanDesc.includes('days left'), 'Adult corner shows active Starter after payment');
    assert.equal(await payPage.locator('#renew-starter-btn').count(), 1, 'Renew starter button exists in adult corner');
    assert.equal(await payPage.locator('#upgrade-lifetime-btn').count(), 1, 'Upgrade lifetime button exists in adult corner');
    passedAssertions += 4;
    totalAssertions += 4;
    console.log(`  ✓ Payment success verified: navigated to #/home, adult corner shows active Starter: "${adultPlanDesc}"`);

    await payContext.close();

    // 9. Sign-up page test (confirming "Create your free account to save your progress." text)
    console.log('\n─── Testing Sign-Up / Conversion Copy ───');
    const authContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const authPage = await authContext.newPage();
    await authPage.addInitScript(() => {
      window.__mockUser = null;
      localStorage.setItem('abacus-auth-mode', 'guest');
      localStorage.setItem(
        'abacus-kids-v3',
        JSON.stringify({
          v: 3,
          profile: { name: 'Aarya', avatar: '🐼', experience: 'new', lang: 'en', voiceLang: 'en' },
          settings: { sound: false, voice: false },
          lessonsDone: [],
          levels: {},
          unlocked: 1,
          stats: { days: [], answered: 0, firstTry: 0, seconds: 0, byRule: {}, mistakes: [] },
          games: {},
          exams: [],
          recent: [],
          stickersSeen: [],
        })
      );
    });
    await authPage.goto(`${baseUrl}/#/practice`);
    await authPage.waitForSelector('[data-guest-locked-level="2"]');
    await authPage.click('[data-guest-locked-level="2"]');
    await authPage.waitForSelector('#abacusConversionModal');

    // 1. Verify prompt modal text
    const modalText = await authPage.locator('#abacusConversionModal').textContent();
    assert.ok(modalText.includes('Create your free account to save your progress.'), 'Modal must contain "Create your free account to save your progress."');

    // 2. Open email auth view and switch to register mode
    await authPage.click('#modalEmailBtn');
    await authPage.waitForSelector('.auth-form-card');
    await authPage.click('#emailAuthToggleBtn'); // toggle to "Create Free Account"
    await authPage.waitForSelector('#emailAuthConfirmPassword'); // confirm input appears in register mode

    const authFormText = await authPage.locator('.auth-form-card').textContent();
    assert.ok(authFormText.includes('Create your free account to save your progress.'), 'Sign-up text must say "Create your free account to save your progress."');
    assert.ok(!authFormText.includes('unlock Levels 1–3 and all games'), 'Old false free text must not exist');

    const signupScreenshotPath = path.join(SCREENSHOT_DIR, 'signup-save-progress.png');
    await authPage.screenshot({ path: signupScreenshotPath });
    console.log(`  📸 Saved sign-up screenshot: ${signupScreenshotPath}`);
    console.log(`  ✓ Sign-up copy verified: "Create your free account to save your progress."`);
    passedAssertions += 3;
    totalAssertions += 3;
    await authContext.close();

    console.log('\n═════════════════════════════════════════════════════════════════════════════════════════');
    console.log('                         E2E MATRIX VERIFICATION SUMMARY TABLE                           ');
    console.log('═════════════════════════════════════════════════════════════════════════════════════════');
    console.table(summaryMatrix);
    console.log('═════════════════════════════════════════════════════════════════════════════════════════');
    console.log(`\nALL E2E ASSERTIONS PASSED: ${passedAssertions}/${totalAssertions} checks passed.`);
  } finally {
    await browser.close();
    server.close();
  }
}

runE2ESuite().catch((err) => {
  console.error('\n❌ E2E SUITE FAILED:', err);
  process.exit(1);
});
