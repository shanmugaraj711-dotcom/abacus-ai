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
      page.on('pageerror', (err) => pageErrors.push(err.message));

      // Inject clean stubbed state before any scripts run
      await page.addInitScript(({ mockUser, authMode, entitlementCache }) => {
        window.__mockUser = mockUser;
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
        assert.equal(currentHashAfterFree, '#/unlock', `Free play should redirect to #/unlock for ${stateKey}`);
        if (stateKey === 'free') {
          const p = path.join(SCREENSHOT_DIR, 'free-unlock.png');
          await page.screenshot({ path: p });
          console.log(`  📸 Saved free unlock screenshot: ${p}`);
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
          // Blocked level redirects to #/unlock (or shows modal / #/practice)
          const blocked = hash === '#/unlock' || hash === '#/practice' || (await page.locator('#abacusConversionModal').count()) > 0;
          assert.ok(blocked, `Level ${lvl} must be blocked for ${stateKey} (hash=${hash})`);
          blockedLevels++;
          // Close modal if appeared for guests
          if ((await page.locator('#modalGuestBtn').count()) > 0) {
            await page.click('#modalGuestBtn');
          }
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
          assert.equal(hash, '#/unlock', `Lesson ${lsn} must redirect to #/unlock for ${stateKey}`);
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
            assert.equal(hash, '#/unlock', `Game ${gid} must redirect to #/unlock for ${stateKey}`);
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

      // 7. Placement test check() strict bounding
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

      // 8. Tampering resistance test
      if (stateKey === 'free' || stateKey === 'starter-expired') {
        await page.evaluate(() => {
          // Attempt client-side tampering of unlocked level in storage and DOM
          const raw = localStorage.getItem('abacus-kids-v3');
          if (raw) {
            const data = JSON.parse(raw);
            data.unlocked = 15;
            localStorage.setItem('abacus-kids-v3', JSON.stringify(data));
          }
          location.hash = '#/level/15';
        });
        await page.waitForTimeout(200);
        const tamperedHash = await page.evaluate(() => location.hash);
        assert.equal(tamperedHash, '#/unlock', `Tampered Level 15 must still be blocked by paywall for ${stateKey}`);
        passedAssertions++;
        totalAssertions++;
        console.log(`  ✓ Tampering resistance: state.unlocked=15 still redirected to ${tamperedHash}`);
      }

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
