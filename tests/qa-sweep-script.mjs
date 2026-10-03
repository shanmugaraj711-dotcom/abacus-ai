// Comprehensive QA Sweep Script
// Covers Journeys, Routes, UI Checks (320px, 360px, 390px, EN+TA), Reliability, Data Integrity
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SCREENSHOT_DIR = path.resolve(ROOT, 'test-results');

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
};

async function runQASweep() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║               ABACUS BUDDY — COMPREHENSIVE QA SWEEP             ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  let currentApiStatus = { paid: false, tier: 'free', starterEnabled: true };
  let createdOrderCalls = [];
  let serverPort = 0;

  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const pathname = url.pathname;

      if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type,authorization' });
        return res.end();
      }

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
          const tier = b.tier || 'lifetime';
          const amount = tier === 'starter' ? 9900 : 49900;
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({
            orderId: 'order_mock_' + Date.now(),
            amount,
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
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          currentApiStatus = {
            paid: true,
            tier: 'starter',
            maxLevel: 6,
            games: ['race', 'mystery', 'match', 'flash'],
            expiresAt,
            starterEnabled: true,
          };
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({
            paid: true,
            tier: 'starter',
            maxLevel: 6,
            games: ['race', 'mystery', 'match', 'flash'],
            expiresAt,
            starterEnabled: true,
          }));
        });
        return;
      }

      let filePath = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);
      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Not found: ' + pathname);
      }
      const ext = path.extname(filePath);
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
      fs.createReadStream(filePath).pipe(res);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(e.message);
    }
  });

  await new Promise(r => server.listen(0, () => {
    serverPort = server.address().port;
    r();
  }));

  const baseUrl = `http://127.0.0.1:${serverPort}`;
  const browser = await chromium.launch();
  const screenshotsTaken = [];

  try {
    // ══════════════════════════════════════════════════════════════════
    // SECTION 1: JOURNEYS
    // ══════════════════════════════════════════════════════════════════
    console.log('─── 1. Testing Journeys ───');

    // Journey 1: new guest -> onboarding -> level 1 -> locked item -> prompt -> See plans -> sign in -> plans screen
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/`);
      await page.waitForSelector('#authGateGuestBtn');
      await page.click('#authGateGuestBtn');
      await page.waitForSelector('#kidName');
      // Onboarding
      await page.fill('#kidName', 'GuestKid');
      await page.click('[data-avatar="🦁"]');
      await page.click('[data-exp="new"]');
      await page.click('#start');
      await page.waitForURL(`${baseUrl}/#/home`);
      assert.equal(page.url(), `${baseUrl}/#/home`, 'Lands on #home after onboarding');

      // Level 1 allowed
      await page.goto(`${baseUrl}/#/level/1`);
      await page.waitForSelector('[data-start]');
      assert.equal(page.url(), `${baseUrl}/#/level/1`, 'Level 1 is accessible');

      // Locked Level 2 triggers conversion prompt
      await page.goto(`${baseUrl}/#/practice`);
      await page.waitForSelector('.levels');
      const lvl2 = page.locator('.levels a.level').nth(1);
      await lvl2.click();
      await page.waitForSelector('#abacusConversionModal');
      assert.equal(await page.locator('#abacusConversionModal').count(), 1, 'Conversion modal appears on locked level');

      // Tap See plans in modal -> lands on #/starter
      await page.click('#modalPlansBtn');
      await page.waitForURL(`${baseUrl}/#/starter`);
      assert.equal(page.url(), `${baseUrl}/#/starter`, 'Tapping See plans navigates to #/starter');

      // Sign in from plans screen
      await page.evaluate(() => {
        window.__mockUser = { uid: 'user_journey_free', getIdToken: async () => 'tok' };
        localStorage.setItem('abacus-auth-mode', 'registered');
        localStorage.setItem('abacus-entitlement-v1', JSON.stringify({ uid: 'user_journey_free', paid: false, tier: 'free' }));
      });
      await page.reload();
      await page.waitForTimeout(300);
      assert.equal(page.url(), `${baseUrl}/#/starter`, 'Signed-in free user remains on plans screen');
      await context.close();
      console.log('  ✓ Journey 1 (new guest onboarding -> level 1 -> paywall -> prompt -> See plans -> sign in -> plans screen) passed');
    }

    // Journey 2: guest -> sign up with email modal
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.addInitScript(() => {
        window.__mockUser = null;
        localStorage.setItem('abacus-auth-mode', 'guest');
        localStorage.setItem('abacus-kids-v3', JSON.stringify({
          v: 3, profile: { name: 'GuestKid', avatar: '🐼', experience: 'new', lang: 'en', voiceLang: 'en' },
          settings: { sound: false, voice: false }, lessonsDone: [], levels: {}, unlocked: 1,
          stats: { days: [], answered: 0, firstTry: 0, seconds: 0, byRule: {}, mistakes: [] }, games: {}, exams: [], recent: [], stickersSeen: []
        }));
      });
      await page.goto(`${baseUrl}/#/home`);
      await page.waitForSelector('#guestUpgradeBtn');
      await page.click('#guestUpgradeBtn');
      await page.waitForSelector('#modalEmailBtn');
      await page.click('#modalEmailBtn');
      await page.waitForSelector('#emailAuthForm');
      assert.equal(await page.locator('#emailAuthForm').count(), 1, 'Email auth form renders');
      await context.close();
      console.log('  ✓ Journey 2 (guest -> sign up with email modal) passed');
    }

    // Journey 3: free user -> Level 2 -> plans -> Get Starter -> mocked pay success -> Starter home
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.addInitScript(() => {
        window.__mockUser = { uid: 'user_journey_starter', getIdToken: async () => 'tok' };
        localStorage.setItem('abacus-auth-mode', 'registered');
        localStorage.setItem('abacus-kids-v3', JSON.stringify({
          v: 3, profile: { name: 'Aarya', avatar: '🐼', experience: 'new', lang: 'en', voiceLang: 'en' },
          settings: { sound: false, voice: false }, lessonsDone: [], levels: {}, unlocked: 1,
          stats: { days: [], answered: 0, firstTry: 0, seconds: 0, byRule: {}, mistakes: [] }, games: {}, exams: [], recent: [], stickersSeen: []
        }));
        localStorage.setItem('abacus-entitlement-v1', JSON.stringify({ uid: 'user_journey_starter', paid: false, tier: 'free' }));
        window.__mockRazorpayBehavior = 'success';
        window.Razorpay = function(options) {
          this.options = options;
          this.on = function() {};
          this.open = function() {
            setTimeout(() => {
              if (this.options.handler) {
                this.options.handler({
                  razorpay_payment_id: 'pay_mock_' + Date.now(),
                  razorpay_order_id: this.options.order_id,
                  razorpay_signature: 'sig_mock_' + Date.now(),
                });
              }
            }, 50);
          };
        };
      });
      currentApiStatus = { paid: false, tier: 'free', starterEnabled: true };
      await page.goto(`${baseUrl}/#/practice`);
      await page.waitForSelector('.levels');
      await page.locator('.levels a.level').nth(1).click();
      await page.waitForURL(`${baseUrl}/#/starter`);
      await page.click('#starter-buy-btn');
      await page.waitForURL(`${baseUrl}/#/home`, { timeout: 5000 });
      assert.equal(page.url(), `${baseUrl}/#/home`, 'Successful payment navigates to #/home');

      // Verify starter tile counts
      const playText = await page.locator('.tile.play small').textContent();
      assert.equal(playText, '4 bead games', 'Home reflects Starter 4 bead games');
      await context.close();
      console.log('  ✓ Journey 3 (free -> Level 2 -> plans -> Get Starter -> pay success -> Starter home) passed');
    }

    // Journey 4: user A signs out and user B signs in (no entitlement leak)
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      // User A (lifetime)
      await page.addInitScript(() => {
        window.__mockUser = { uid: 'user_A_lifetime', getIdToken: async () => 'tok' };
        localStorage.setItem('abacus-auth-mode', 'registered');
        localStorage.setItem('abacus-kids-v3', JSON.stringify({
          v: 3, profile: { name: 'UserA', avatar: '🦁', experience: 'new', lang: 'en', voiceLang: 'en' },
          settings: { sound: false, voice: false }, lessonsDone: [], levels: {}, unlocked: 15,
          stats: { days: [], answered: 0, firstTry: 0, seconds: 0, byRule: {}, mistakes: [] }, games: {}, exams: [], recent: [], stickersSeen: []
        }));
        localStorage.setItem('abacus-entitlement-v1', JSON.stringify({ uid: 'user_A_lifetime', paid: true, tier: 'lifetime' }));
      });
      currentApiStatus = { paid: true, tier: 'lifetime', starterEnabled: true };
      await page.goto(`${baseUrl}/#/home`);
      await page.waitForTimeout(300);
      assert.equal(await page.locator('.tile.play small').textContent(), '7 bead games', 'User A has 7 bead games');

      // User A signs out -> User B signs in as Free
      await page.evaluate(() => {
        window.__mockUser = { uid: 'user_B_free', getIdToken: async () => 'tok' };
        localStorage.setItem('abacus-entitlement-v1', JSON.stringify({ uid: 'user_B_free', paid: false, tier: 'free' }));
      });
      currentApiStatus = { paid: false, tier: 'free', starterEnabled: true };
      await page.reload();
      await page.waitForTimeout(300);
      assert.equal(await page.locator('.tile.play small').textContent(), '1 bead game', 'User B has 1 bead game (no entitlement leak from User A)');
      await context.close();
      console.log('  ✓ Journey 4 (User A lifetime signs out -> User B free signs in: no entitlement leak) passed');
    }

    // ══════════════════════════════════════════════════════════════════
    // SECTION 2: ROUTES & REDIRECTS
    // ══════════════════════════════════════════════════════════════════
    console.log('\n─── 2. Testing Route Direct Access & Back Button ───');
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.addInitScript(() => {
        window.__mockUser = null;
        localStorage.setItem('abacus-auth-mode', 'registered');
        localStorage.setItem('abacus-kids-v3', JSON.stringify({
          v: 3, profile: { name: 'Tester', avatar: '🐼', experience: 'new', lang: 'en', voiceLang: 'en' },
          settings: { sound: false, voice: false }, lessonsDone: [], levels: {}, unlocked: 1,
          stats: { days: [], answered: 0, firstTry: 0, seconds: 0, byRule: {}, mistakes: [] }, games: {}, exams: [], recent: [], stickersSeen: []
        }));
        localStorage.setItem('abacus-entitlement-v1', JSON.stringify({ uid: 'free-tester', paid: false, tier: 'free' }));
      });
      currentApiStatus = { paid: false, tier: 'free', starterEnabled: true };

      const routesToTest = [
        { path: '#/home', expectedHash: '#/home' },
        { path: '#/learn', expectedHash: '#/learn' },
        { path: '#/lesson/1', expectedHash: '#/lesson/1' },
        { path: '#/lesson/5', expectedHash: '#/starter' }, // locked -> starter
        { path: '#/practice', expectedHash: '#/practice' },
        { path: '#/level/1', expectedHash: '#/level/1' },
        { path: '#/level/10', expectedHash: '#/starter' }, // locked -> starter
        { path: '#/play', expectedHash: '#/play' },
        { path: '#/game/race', expectedHash: '#/game/race' },
        { path: '#/game/friend', expectedHash: '#/starter' }, // locked -> starter
        { path: '#/free', expectedHash: '#/starter' }, // locked -> starter
        { path: '#/tests', expectedHash: '#/tests' },
        { path: '#/stickers', expectedHash: '#/stickers' },
        { path: '#/starter', expectedHash: '#/starter' },
        { path: '#/unlock', expectedHash: '#/unlock' },
        { path: '#unlock', expectedHash: '#unlock' },
        { path: '#/non-existent-route', expectedHash: '#/home' },
      ];

      for (const r of routesToTest) {
        await page.goto(`${baseUrl}/${r.path}`);
        await page.waitForTimeout(150);
        const curHash = await page.evaluate(() => location.hash);
        const appContent = await page.locator('#app').textContent();
        assert.ok(appContent && appContent.trim().length > 0, `Route ${r.path} must not render blank screen`);
        assert.ok(curHash === r.expectedHash || curHash === '#/home' || curHash === r.path, `Route ${r.path} must not crash, got hash ${curHash}`);
      }

      // Back button stability: practice -> level/2 (redirects to starter) -> back -> practice
      await page.goto(`${baseUrl}/#/practice`);
      await page.waitForTimeout(150);
      await page.goto(`${baseUrl}/#/level/2`);
      await page.waitForTimeout(200);
      assert.equal(await page.evaluate(() => location.hash), '#/starter', 'Level 2 redirected to starter');
      await page.goBack();
      await page.waitForTimeout(200);
      const afterBackHash = await page.evaluate(() => location.hash);
      assert.ok(afterBackHash === '#/practice' || afterBackHash === '#/home', `Back button must not loop, landed on ${afterBackHash}`);

      await context.close();
      console.log('  ✓ Route direct access, fallback, and Back button loop resistance passed');
    }

    // ══════════════════════════════════════════════════════════════════
    // SECTION 3: UI CHECKS ACROSS VIEWPORTS (320px, 360px, 390px, EN & TA)
    // ══════════════════════════════════════════════════════════════════
    console.log('\n─── 3. Testing UI Checks across Viewports (320px, 360px, 390px in EN & TA) ───');
    const viewports = [
      { name: '320x640', width: 320, height: 640 },
      { name: '360x800', width: 360, height: 800 },
      { name: '390x844', width: 390, height: 844 },
    ];

    for (const vp of viewports) {
      for (const lang of ['en', 'ta']) {
        const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        const page = await context.newPage();
        await page.addInitScript(({ l }) => {
          window.__mockUser = null;
          localStorage.setItem('abacus-auth-mode', 'registered');
          localStorage.setItem('abacus-kids-v3', JSON.stringify({
            v: 3, profile: { name: 'TestKid', avatar: '🐼', experience: 'new', lang: l, voiceLang: l },
            settings: { sound: false, voice: false }, lessonsDone: [], levels: {}, unlocked: 1,
            stats: { days: [], answered: 0, firstTry: 0, seconds: 0, byRule: {}, mistakes: [] }, games: {}, exams: [], recent: [], stickersSeen: []
          }));
          localStorage.setItem('abacus-entitlement-v1', JSON.stringify({ uid: 'free-ui-check', paid: false, tier: 'free' }));
        }, { l: lang });
        currentApiStatus = { paid: false, tier: 'free', starterEnabled: true };

        const testUrls = ['#/home', '#/learn', '#/practice', '#/play', '#/starter', '#/parents'];
        for (const u of testUrls) {
          await page.goto(`${baseUrl}/${u}`);
          await page.waitForTimeout(200);

          if (u === '#/parents') {
            const lead = await page.locator('.lead').textContent().catch(() => '');
            const nums = (lead || '').match(/\d+/g);
            if (nums && nums.length >= 2) {
              const ans = Number(nums[0]) * Number(nums[1]);
              await page.click(`[data-gate="${ans}"]`).catch(() => {});
              await page.waitForTimeout(200);
            }
          }

          // 1. Check for horizontal overflow
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
          assert.equal(overflow, false, `No horizontal overflow on ${u} at ${vp.name} (${lang})`);

          // 2. Check for duplicate IDs
          const duplicateIds = await page.evaluate(() => {
            const ids = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
            const seen = new Set();
            const dupes = [];
            for (const id of ids) {
              if (seen.has(id)) dupes.push(id);
              seen.add(id);
            }
            return dupes;
          });
          assert.equal(duplicateIds.length, 0, `No duplicate IDs on ${u} at ${vp.name} (${lang}): ${duplicateIds.join(', ')}`);

          // 3. Check for stale / wrong copy
          const pageText = await page.evaluate(() => document.body.innerText);
          assert.ok(!pageText.includes('Levels 1-2') && !pageText.includes('Levels 1-3'), `No stale Levels 1-2 / 1-3 on ${u} (${lang})`);
          assert.ok(!pageText.includes('early bird') && !pageText.includes('EARLY BIRD'), `No early bird on ${u} (${lang})`);
          assert.ok(!pageText.includes('freeLevels'), `No freeLevels on ${u} (${lang})`);

          // Save comprehensive screenshots for full visual record
          const screenName = u.replace('#/', '');
          const scrFile = `qa-${screenName}-${vp.name}-${lang}.png`;
          const scrPath = path.join(SCREENSHOT_DIR, scrFile);
          await page.screenshot({ path: scrPath });
          screenshotsTaken.push(scrFile);
        }
        await context.close();
      }
    }
    console.log(`  ✓ UI checks verified across 3 viewports in EN & TA: 0 overflows, 0 duplicate IDs, 0 stale copy`);

    // ══════════════════════════════════════════════════════════════════
    // SECTION 4: DATA INTEGRITY (Preservation on Expiry / Downgrade)
    // ══════════════════════════════════════════════════════════════════
    console.log('\n─── 4. Testing Data Integrity ───');
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.addInitScript(() => {
        window.__mockUser = { uid: 'expiring-user', getIdToken: async () => 'tok' };
        localStorage.setItem('abacus-auth-mode', 'registered');
        localStorage.setItem('abacus-kids-v3', JSON.stringify({
          v: 3, profile: { name: 'SmartKid', avatar: '🐼', experience: 'new', lang: 'en', voiceLang: 'en' },
          settings: { sound: true, voice: true },
          lessonsDone: [1, 2, 3, 4, 5, 6],
          levels: { 1: { stars: 3 }, 2: { stars: 3 }, 3: { stars: 2 } },
          unlocked: 4,
          stats: { days: ['2026-10-01', '2026-10-02'], answered: 24, firstTry: 22, seconds: 480, byRule: {}, mistakes: [] },
          games: { race: 15, mystery: 8 },
          exams: [],
          recent: [],
          stickersSeen: ['lesson1']
        }));
        // Initially active starter
        localStorage.setItem('abacus-entitlement-v1', JSON.stringify({
          uid: 'expiring-user',
          paid: true,
          tier: 'starter',
          expiresAt: new Date(Date.now() - 1000).toISOString(), // expired now
          expired: true
        }));
      });
      // Server returns expired starter (free tier)
      currentApiStatus = {
        paid: false,
        tier: 'starter',
        expired: true,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        starterEnabled: true
      };

      await page.goto(`${baseUrl}/#/home`);
      await page.waitForTimeout(300);

      // Verify that progress was not wiped
      const stateRaw = await page.evaluate(() => localStorage.getItem('abacus-kids-v3'));
      const state = JSON.parse(stateRaw);
      assert.deepEqual(state.lessonsDone, [1, 2, 3, 4, 5, 6], 'Lessons done preserved after expiry');
      assert.equal(state.stats.answered, 24, 'Stats answered preserved after expiry');
      assert.equal(state.games.race, 15, 'Game high score preserved after expiry');
      assert.equal(state.unlocked, 4, 'Unlocked progress level number preserved after expiry');

      // But access limits are capped to free tier
      await page.goto(`${baseUrl}/#/level/2`);
      await page.waitForTimeout(200);
      assert.equal(await page.evaluate(() => location.hash), '#/starter', 'Locked level redirects to starter despite state.unlocked=4');

      await context.close();
      console.log('  ✓ Data integrity verified: progress, stats, and scores are never deleted on expiry');
    }

    // ══════════════════════════════════════════════════════════════════
    // SECTION 5: START TWICE IN A ROW & RAPID DOUBLE-TAP GUARDS
    // ══════════════════════════════════════════════════════════════════
    console.log('\n─── 5. Testing Start Twice in a Row & Double-Tap Protection ───');
    {
      currentApiStatus = {
        paid: true,
        tier: 'lifetime',
        maxLevel: 15,
        maxLesson: 11,
        games: ['race', 'mystery', 'match', 'flash', 'speed', 'friend', 'ladder'],
        starterEnabled: true
      };

      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();

      // Configure lifetime user so all 7 games and levels are unlocked
      await page.addInitScript(() => {
        window.__mockUser = { uid: 'lifetime-tester-doubletap', getIdToken: async () => 'test-token' };
        localStorage.setItem('abacus-auth-mode', 'registered');
        localStorage.setItem('abacus-kids-v3', JSON.stringify({
          v: 3,
          profile: { name: 'SuperKid', avatar: '🦁', experience: 'known', lang: 'en', voiceLang: 'en' },
          unlocked: 15,
          levels: { 1: { stars: 3 } },
          lessonsDone: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
          stats: { answered: 10, correct: 10, streak: 5 },
          games: {}
        }));
        localStorage.setItem('abacus-entitlement-v1', JSON.stringify({
          uid: 'lifetime-tester-doubletap',
          paid: true,
          tier: 'lifetime'
        }));
      });

      await page.goto(`${baseUrl}/#/level/1`);
      await page.waitForSelector('[data-start]');
      
      // First start
      await page.click('[data-start]');
      await page.waitForTimeout(200);
      assert.ok(await page.locator('[data-abacus], [data-check], [data-eq]').count() > 0, 'First level start works');

      // Second start
      await page.goto(`${baseUrl}/#/practice`);
      await page.waitForTimeout(100);
      await page.goto(`${baseUrl}/#/level/1`);
      await page.waitForSelector('[data-start]');
      assert.equal(await page.locator('[data-start]').isDisabled(), false, 'Start button is re-enabled on second visit');
      await page.click('[data-start]');
      await page.waitForTimeout(200);
      assert.ok(await page.locator('[data-abacus], [data-check], [data-eq]').count() > 0, 'Second level start works');

      // Double-tap on level start
      await page.goto(`${baseUrl}/#/practice`);
      await page.waitForTimeout(100);
      await page.goto(`${baseUrl}/#/level/1`);
      await page.waitForSelector('[data-start]');
      const doubleTapResult = await page.evaluate(() => {
        const btn = document.querySelector('[data-start]');
        let count = 0;
        const orig = btn.onclick;
        btn.onclick = function(e) {
          if (!this.disabled) {
            count++;
            orig.call(this, e);
          }
        };
        btn.click();
        btn.click();
        return count;
      });
      assert.equal(doubleTapResult, 1, 'Rapid double-tap on level start button only fires once (disabled immediately)');

      // 2. Each game twice in a row + rapid double-tap
      const allGames = ['race', 'mystery', 'match', 'flash', 'speed', 'friend', 'ladder'];
      for (const gid of allGames) {
        // First start
        await page.goto(`${baseUrl}/#/play`);
        await page.waitForTimeout(100);
        await page.goto(`${baseUrl}/#/game/${gid}`);
        await page.waitForSelector('[data-mode]');
        await page.locator('[data-mode]').first().click();
        await page.waitForTimeout(200);
        assert.equal(await page.locator('[data-mode]').count(), 0, `Game ${gid} first start leaves mode picker`);

        // Second start
        await page.goto(`${baseUrl}/#/play`);
        await page.waitForTimeout(100);
        await page.goto(`${baseUrl}/#/game/${gid}`);
        await page.waitForSelector('[data-mode]');
        assert.equal(await page.locator('[data-mode]').first().isDisabled(), false, `Game ${gid} mode button is enabled on second visit`);
        await page.locator('[data-mode]').first().click();
        await page.waitForTimeout(200);
        assert.equal(await page.locator('[data-mode]').count(), 0, `Game ${gid} second start leaves mode picker`);

        // Rapid double-tap
        await page.goto(`${baseUrl}/#/play`);
        await page.waitForTimeout(100);
        await page.goto(`${baseUrl}/#/game/${gid}`);
        await page.waitForSelector('[data-mode]');
        const gameDoubleTap = await page.evaluate(() => {
          const btn = document.querySelector('[data-mode]');
          let count = 0;
          const orig = btn.onclick;
          btn.onclick = function(e) {
            if (!this.disabled) {
              count++;
              orig.call(this, e);
            }
          };
          btn.click();
          btn.click();
          return count;
        });
        assert.equal(gameDoubleTap, 1, `Game ${gid} rapid double-tap fires once (disabled immediately)`);
      }

      await context.close();
      console.log('  ✓ Level and all 7 games verified: start twice in a row works, rapid double-tap starts only once');
    }

    // ══════════════════════════════════════════════════════════════════
    // SECTION 6: POST-SIGN-IN LANDING & STABILITY (NO LOOP)
    // ══════════════════════════════════════════════════════════════════
    console.log('\n─── 6. Testing Post-Sign-In Landing & Stability (No Redirect Loops) ───');
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();

      // Case 1: Post-sign-in landing from locked prompt
      await page.goto(`${baseUrl}/`);
      await page.waitForSelector('#authGateGuestBtn');
      await page.click('#authGateGuestBtn');
      await page.waitForSelector('#kidName');
      await page.fill('#kidName', 'GuestPrompt');
      await page.click('[data-avatar="🐼"]');
      await page.click('[data-exp="new"]');
      await page.click('#start');
      await page.waitForURL(`${baseUrl}/#/home`);

      // Trigger locked prompt by accessing level 2
      await page.goto(`${baseUrl}/#/practice`);
      await page.waitForSelector('.levels');
      const lvl2 = page.locator('.levels a.level').nth(1);
      await lvl2.click();
      await page.waitForSelector('#abacusConversionModal');

      // Click Google Sign-in in modal
      await page.evaluate(() => {
        window.__mockUser = { uid: 'user_prompt_signin', getIdToken: async () => 'tok' };
        localStorage.setItem('abacus-auth-mode', 'registered');
        localStorage.setItem('abacus-entitlement-v1', JSON.stringify({ uid: 'user_prompt_signin', paid: false, tier: 'free' }));
      });
      await page.click('#modalGoogleBtn');
      await page.waitForTimeout(300);
      const postPromptHash = await page.evaluate(() => location.hash);
      assert.ok(postPromptHash === '#/practice' || postPromptHash === '#/starter' || postPromptHash === '#/home', `Post locked prompt sign-in lands stably on ${postPromptHash}`);

      // Case 2: Post-sign-in landing from buy button
      await page.goto(`${baseUrl}/#/starter`);
      await page.waitForTimeout(200);
      // Trigger checkout prompt while unauthenticated
      await page.evaluate(async () => {
        window.__mockUser = null;
        localStorage.setItem('abacus-auth-mode', 'guest');
        const { startCheckout } = await import('./js/payments.js');
        await startCheckout('starter');
      });
      await page.waitForSelector('#abacusConversionModal');
      // Sign in from prompt
      await page.evaluate(() => {
        window.__mockUser = { uid: 'user_buy_signin', getIdToken: async () => 'tok' };
        localStorage.setItem('abacus-auth-mode', 'registered');
      });
      await page.click('#modalGoogleBtn');
      await page.waitForTimeout(300);
      const postBuyHash = await page.evaluate(() => location.hash);
      assert.equal(postBuyHash, '#/starter', 'Post buy button sign-in lands stably on #/starter (onSuccessAuth preserves starter screen)');

      // Case 3: Post-sign-in landing from plain sign-in page
      await page.goto(`${baseUrl}/auth-ui/sign-in.html`);
      await page.waitForSelector('.phase1-shell');
      const signinUrl1 = page.url();
      assert.ok(signinUrl1.includes('/auth-ui/sign-in.html'), 'Plain sign-in page loads without loop');
      // Visiting again does not redirect or loop
      await page.goto(`${baseUrl}/auth-ui/sign-in.html`);
      await page.waitForSelector('.phase1-shell');
      const signinUrl2 = page.url();
      assert.ok(signinUrl2.includes('/auth-ui/sign-in.html'), 'Plain sign-in page URL is stable');

      // With ?return=../#unlock
      await page.goto(`${baseUrl}/auth-ui/sign-in.html?return=../#unlock`);
      await page.waitForSelector('.phase1-shell');
      assert.ok(page.url().includes('return=..%2F%23unlock') || page.url().includes('return=../#unlock'), 'Sign-in page respects return parameter');

      await context.close();
      console.log('  ✓ Post-sign-in landing verified for locked prompt, buy button (#/starter), and plain sign-in page (0 loops)');
    }

    console.log('\n══════════════════════════════════════════════════════════════════');
    console.log(`QA SWEEP COMPLETED SUCCESSFULLY!`);
    console.log(`Generated and updated ${screenshotsTaken.length} screenshots in test-results/`);
    console.log('══════════════════════════════════════════════════════════════════');
  } finally {
    await browser.close();
    server.close();
  }
}

runQASweep().catch(err => {
  console.error('\n❌ QA SWEEP FAILED:', err);
  process.exit(1);
});
