/**
 * tests/starter-tier.test.mjs
 * Comprehensive tests for Starter Tier (₹99, 30 days), Free, and Lifetime tier access boundaries,
 * direct-route protection, bypass prevention, server authority, and multi-viewport rendering.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Unit test imports
import {
  TIERS,
  TIER_CONFIG,
  resolveTier,
  canAccessLevel,
  canAccessLesson,
  canAccessGame,
  canAccessFreePlay,
  getGameLimit,
} from '../js/tiers.js';
import { sa, PRODUCT_STARTER, STARTER_PRICE_RUPEES } from '../worker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// ── Static & Mock Server ───────────────────────────────────────────────────
function createTestServer() {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
  };

  let mockEntitlement = null;
  let customCreateOrderHandler = null;
  let customVerifyPaymentHandler = null;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    let reqPath = decodeURI(url.pathname);

    // Mock API endpoints
    if (reqPath === '/api/user-status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      const ent = mockEntitlement || { paid: false, tier: 'free' };
      return res.end(JSON.stringify({
        paid: !!ent.paid,
        tier: ent.tier || 'free',
        expiresAt: ent.expiresAt || null,
        uid: 'test_user_uid_123',
      }));
    }

    if (reqPath === '/api/create-order' && req.method === 'POST') {
      if (customCreateOrderHandler) {
        return customCreateOrderHandler(req, res);
      }
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let b = {};
        try { b = JSON.parse(body); } catch {}
        const tier = (b.tier || 'lifetime').toLowerCase();
        const isStarter = tier === 'starter';
        const expectedPrice = isStarter ? 9900 : 49900;
        const prod = isStarter ? 'abacus-buddy-starter' : 'abacus-buddy';

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          orderId: `order_${tier}_123`,
          amount: expectedPrice,
          displayAmount: isStarter ? 99 : 499,
          basePrice: isStarter ? 99 : 499,
          discountApplied: 0,
          tier,
          product: prod,
          currency: 'INR',
          keyId: 'rzp_test_mock_key',
        }));
      });
      return;
    }

    if (reqPath === '/api/verify-payment' && req.method === 'POST') {
      if (customVerifyPaymentHandler) {
        return customVerifyPaymentHandler(req, res);
      }
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let b = {};
        try { b = JSON.parse(body); } catch {}
        const tier = (b.tier || 'starter').toLowerCase();
        mockEntitlement = {
          paid: true,
          tier,
          expiresAt: tier === 'starter' ? new Date(Date.now() + 30 * 86400000).toISOString() : null,
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ paid: true, tier }));
      });
      return;
    }

    // Static file serving
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
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

  server.setMockEntitlement = ent => { mockEntitlement = ent; };
  server.setCreateOrderHandler = fn => { customCreateOrderHandler = fn; };
  server.setVerifyPaymentHandler = fn => { customVerifyPaymentHandler = fn; };
  server.resetHandlers = () => {
    customCreateOrderHandler = null;
    customVerifyPaymentHandler = null;
  };
  return server;
}

const server = createTestServer();
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const BASE_URL = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({ headless: true });

async function setupPage(browserInstance, { profileState = {}, entitlement = null, viewport = null, isAuth = true } = {}) {
  server.setMockEntitlement(entitlement);
  const page = await browserInstance.newPage(viewport ? { viewport } : {});
  await page.addInitScript(({ state, ent, auth }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('abacus-kids-v3', JSON.stringify({
      v: 3,
      profile: { name: 'Diya', avatar: '🦊', experience: 'new', lang: 'en', voiceLang: 'en' },
      settings: { sound: false, voice: false },
      lessonsDone: [1],
      levels: { 1: { stars: 3 } },
      unlocked: 2,
      games: { race: 5 },
      stats: { days: ['2026-10-01'], answered: 10, firstTry: 9, seconds: 120, byRule: { direct: [10, 10], small: [0, 0], big: [0, 0] }, mistakes: [] },
      ...state,
    }));
    if (auth) {
      window._abacusAuthUid = 'test_user_uid_123';
      window.__mockUser = {
        uid: 'test_user_uid_123',
        getIdToken: async () => 'test_bearer_token',
      };
    }
    if (ent && auth) {
      localStorage.setItem('abacus-entitlement-v1', JSON.stringify({
        paid: ent.paid,
        tier: ent.tier,
        expiresAt: ent.expiresAt || null,
        uid: 'test_user_uid_123',
        cachedAt: new Date().toISOString(),
      }));
    }
  }, { state: profileState, ent: entitlement, auth: isAuth });
  return page;
}

try {
  // ── GROUP 1: Unit Tests on Tier Predicates ──────────────────────────────────
  console.log('\n--- GROUP 1: Tier Access Predicates (Unit Tests) ---');

  await test('1.1 Free Tier access boundary predicates', () => {
    const freeTier = TIER_CONFIG.free;
    assert.equal(freeTier.price, 0);
    assert.equal(freeTier.maxLevel, 1);
    assert.equal(freeTier.maxLesson, 6);
    assert.deepEqual(freeTier.games, ['race']);
    assert.equal(freeTier.freePlay, false);

    // Levels
    assert.equal(canAccessLevel(1, 'free'), true, 'Free can access Level 1');
    assert.equal(canAccessLevel(2, 'free'), false, 'Free CANNOT access Level 2');
    assert.equal(canAccessLevel(15, 'free'), false, 'Free CANNOT access Level 15');

    // Lessons
    assert.equal(canAccessLesson(1, 'free'), true);
    assert.equal(canAccessLesson(6, 'free'), true);
    assert.equal(canAccessLesson(7, 'free'), false, 'Free CANNOT access Lesson 7');
    assert.equal(canAccessLesson(11, 'free'), false, 'Free CANNOT access Lesson 11');

    // Games
    assert.equal(canAccessGame('race', 'free'), true);
    assert.equal(canAccessGame('mystery', 'free'), false);
    assert.equal(canAccessGame('match', 'free'), false);
    assert.equal(canAccessGame('ladder', 'free'), false);

    // Free Play
    assert.equal(canAccessFreePlay('free'), false);
    assert.equal(getGameLimit('free'), 1);
  });

  await test('1.2 Starter Tier access boundary predicates (₹99 / 30 days)', () => {
    const starterTier = TIER_CONFIG.starter;
    assert.equal(starterTier.price, 99);
    assert.equal(starterTier.pricePaise, 9900);
    assert.equal(starterTier.durationDays, 30);
    assert.equal(starterTier.maxLevel, 3);
    assert.equal(starterTier.maxLesson, 7);
    assert.deepEqual(starterTier.games, ['race', 'mystery', 'match']);
    assert.equal(starterTier.freePlay, true);

    // Levels
    assert.equal(canAccessLevel(1, 'starter'), true);
    assert.equal(canAccessLevel(2, 'starter'), true);
    assert.equal(canAccessLevel(3, 'starter'), true);
    assert.equal(canAccessLevel(4, 'starter'), false, 'Starter CANNOT access Level 4');

    // Lessons
    assert.equal(canAccessLesson(1, 'starter'), true);
    assert.equal(canAccessLesson(7, 'starter'), true, 'Starter CAN access Lesson 7');
    assert.equal(canAccessLesson(8, 'starter'), false, 'Starter CANNOT access Lesson 8');

    // Games
    assert.equal(canAccessGame('race', 'starter'), true);
    assert.equal(canAccessGame('mystery', 'starter'), true);
    assert.equal(canAccessGame('match', 'starter'), true);
    assert.equal(canAccessGame('flash', 'starter'), false, 'Starter CANNOT access Flash');
    assert.equal(canAccessGame('ladder', 'starter'), false, 'Starter CANNOT access Ladder');

    // Free Play
    assert.equal(canAccessFreePlay('starter'), true);
    assert.equal(getGameLimit('starter'), 3);
  });

  await test('1.3 Lifetime Tier access boundary predicates (₹499)', () => {
    const lifetimeTier = TIER_CONFIG.lifetime;
    assert.equal(lifetimeTier.price, 499);
    assert.equal(lifetimeTier.pricePaise, 49900);
    assert.equal(lifetimeTier.maxLevel, 15);
    assert.equal(lifetimeTier.maxLesson, 11);
    assert.equal(lifetimeTier.freePlay, true);

    for (let lv = 1; lv <= 15; lv++) {
      assert.equal(canAccessLevel(lv, 'lifetime'), true);
    }
    for (let ls = 1; ls <= 11; ls++) {
      assert.equal(canAccessLesson(ls, 'lifetime'), true);
    }
    ['race', 'mystery', 'match', 'flash', 'speedRead', 'friendDash', 'ladder'].forEach(g => {
      assert.equal(canAccessGame(g, 'lifetime'), true);
    });
    assert.equal(canAccessFreePlay('lifetime'), true);
    assert.equal(getGameLimit('lifetime'), 7);
  });

  await test('1.4 Starter tier expiration safely reverts to Free tier', () => {
    const expiredStarter = {
      paid: true,
      tier: 'starter',
      expiresAt: new Date(Date.now() - 1000).toISOString(), // expired 1s ago
    };
    const resolved = resolveTier(expiredStarter);
    assert.equal(resolved.id, 'free', 'Expired starter must drop to free tier');
    assert.equal(canAccessLevel(3, expiredStarter), false, 'Expired starter cannot access level 3');
    assert.equal(canAccessLesson(7, expiredStarter), false, 'Expired starter cannot access lesson 7');
    assert.equal(canAccessFreePlay(expiredStarter), false, 'Expired starter cannot access Free Play');

    const activeStarter = {
      paid: true,
      tier: 'starter',
      expiresAt: new Date(Date.now() + 86400000).toISOString(), // active for 1 day
    };
    const activeResolved = resolveTier(activeStarter);
    assert.equal(activeResolved.id, 'starter', 'Active starter resolves to starter tier');
    assert.equal(canAccessLevel(3, activeStarter), true);
    assert.equal(canAccessFreePlay(activeStarter), true);
  });

  await test('1.5 Backward compatibility: legacy paid customer without explicit tier resolves to Lifetime', () => {
    const legacyPaid = { paid: true };
    const resolved = resolveTier(legacyPaid);
    assert.equal(resolved.id, 'lifetime', 'Legacy paid customer must receive lifetime access');
    assert.equal(canAccessLevel(15, legacyPaid), true);
    assert.equal(canAccessLesson(11, legacyPaid), true);
  });

  // ── GROUP 2: Direct-Route Protection (Browser Integration) ──────────────────
  console.log('\n--- GROUP 2: Direct-Route Protection in Browser ---');

  await test('2.1 Free user navigating directly to #/level/2 redirects to #/unlock', async () => {
    const page = await setupPage(browser, { entitlement: { paid: false, tier: 'free' } });
    await page.goto(`${BASE_URL}/#/level/2`);
    await page.waitForTimeout(500);

    const hash = await page.evaluate(() => window.location.hash);
    assert.equal(hash, '#/unlock', 'Direct navigation to Level 2 must redirect Free user to #/unlock');
    await page.close();
  });

  await test('2.2 Free user navigating directly to #/lesson/7 redirects to #/unlock', async () => {
    const page = await setupPage(browser, { entitlement: { paid: false, tier: 'free' } });
    await page.goto(`${BASE_URL}/#/lesson/7`);
    await page.waitForTimeout(500);

    const hash = await page.evaluate(() => window.location.hash);
    assert.equal(hash, '#/unlock', 'Direct navigation to Lesson 7 must redirect Free user to #/unlock');
    await page.close();
  });

  await test('2.3 Free user navigating directly to #/game/mystery redirects to #/unlock', async () => {
    const page = await setupPage(browser, { entitlement: { paid: false, tier: 'free' } });
    await page.goto(`${BASE_URL}/#/game/mystery`);
    await page.waitForTimeout(500);

    const hash = await page.evaluate(() => window.location.hash);
    assert.equal(hash, '#/unlock', 'Direct navigation to Mystery Game must redirect Free user to #/unlock');
    await page.close();
  });

  await test('2.4 Free user navigating directly to #/free redirects to #/unlock', async () => {
    const page = await setupPage(browser, { entitlement: { paid: false, tier: 'free' } });
    await page.goto(`${BASE_URL}/#/free`);
    await page.waitForTimeout(500);

    const hash = await page.evaluate(() => window.location.hash);
    assert.equal(hash, '#/unlock', 'Direct navigation to Free Play must redirect Free user to #/unlock');
    await page.close();
  });

  await test('2.5 Starter user can access Level 3 and Free Play, but #/level/4 redirects to #/unlock', async () => {
    const page = await setupPage(browser, {
      entitlement: {
        paid: true,
        tier: 'starter',
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
      profileState: { unlocked: 3 },
    });

    // Access Level 3 directly -> should succeed
    await page.goto(`${BASE_URL}/#/level/3`);
    await page.waitForTimeout(400);
    let hash = await page.evaluate(() => window.location.hash);
    assert.equal(hash, '#/level/3', 'Starter user can access Level 3');

    // Access Free Play directly -> should succeed
    await page.goto(`${BASE_URL}/#/free`);
    await page.waitForTimeout(400);
    hash = await page.evaluate(() => window.location.hash);
    assert.equal(hash, '#/free', 'Starter user can access Free Play');

    // Access Level 4 directly -> should redirect to #/unlock
    await page.goto(`${BASE_URL}/#/level/4`);
    await page.waitForTimeout(400);
    hash = await page.evaluate(() => window.location.hash);
    assert.equal(hash, '#/unlock', 'Starter user attempting Level 4 redirects to #/unlock');

    await page.close();
  });

  await test('2.6 Starter user can access Lesson 7, but #/lesson/8 redirects to #/unlock', async () => {
    const page = await setupPage(browser, {
      entitlement: {
        paid: true,
        tier: 'starter',
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
    });

    await page.goto(`${BASE_URL}/#/lesson/7`);
    await page.waitForTimeout(400);
    let hash = await page.evaluate(() => window.location.hash);
    assert.equal(hash, '#/lesson/7', 'Starter user can access Lesson 7');

    await page.goto(`${BASE_URL}/#/lesson/8`);
    await page.waitForTimeout(400);
    hash = await page.evaluate(() => window.location.hash);
    assert.equal(hash, '#/unlock', 'Starter user attempting Lesson 8 redirects to #/unlock');

    await page.close();
  });

  // ── GROUP 3: Bypass Prevention ──────────────────────────────────────────────
  console.log('\n--- GROUP 3: Bypass Prevention (Anti-Tamper) ---');

  await test('3.1 "I know it" experience setting does NOT unlock Lessons 7–11 for Free users', async () => {
    const page = await setupPage(browser, {
      profileState: {
        profile: { name: 'Aarav', avatar: '🐼', experience: 'known', lang: 'en', voiceLang: 'en' },
      },
      entitlement: { paid: false, tier: 'free' },
    });

    await page.goto(`${BASE_URL}/#/learn`);
    await page.waitForSelector('.path');

    // Lesson 7 stone should be locked with link to #/unlock
    const lesson7Link = page.locator('.path li.stone').nth(6).locator('a');
    const href = await lesson7Link.getAttribute('href');
    assert.equal(href, '#/unlock', 'Lesson 7 must link to #/unlock despite "I know it" profile');

    await page.close();
  });

  await test('3.2 localStorage.seeded=1 does NOT bypass entitlement checks', async () => {
    const page = await setupPage(browser, {
      entitlement: { paid: false, tier: 'free' },
    });

    await page.goto(`${BASE_URL}/#/practice`);
    await page.evaluate(() => {
      localStorage.setItem('seeded', '1');
    });

    await page.goto(`${BASE_URL}/#/free`);
    await page.waitForTimeout(400);
    const hash = await page.evaluate(() => window.location.hash);
    assert.equal(hash, '#/unlock', 'seeded=1 must NOT grant Free Play access');

    await page.close();
  });

  // ── GROUP 4: Public #/starter Page & Multi-Viewport ─────────────────────────
  console.log('\n--- GROUP 4: Public #/starter Page & Multi-Viewport Rendering ---');

  await test('4.1 #/starter renders comparison table (Free vs Starter ₹99 vs Lifetime ₹499)', async () => {
    const page = await setupPage(browser, { isAuth: false });
    await page.goto(`${BASE_URL}/#/starter`);
    await page.waitForSelector('.tier-comparison');

    const tableText = await page.textContent('.tier-comparison');
    assert.ok(tableText.includes('Starter (₹99)'), 'Table includes Starter ₹99');
    assert.ok(tableText.includes('Lifetime (₹499)'), 'Table includes Lifetime ₹499');
    assert.ok(tableText.includes('30 Days'), 'Table includes 30 Days term');
    assert.ok(tableText.includes('Levels 1–3'), 'Table shows Levels 1-3 for Starter');
    assert.ok(tableText.includes('Lessons 1–7'), 'Table shows Lessons 1-7 for Starter');

    const signinBtn = page.locator('#signin-starter-btn');
    assert.ok(await signinBtn.isVisible(), 'Sign-in CTA visible when unauthenticated');
    const href = await signinBtn.getAttribute('href');
    assert.ok(href.includes('return=../#starter'), 'Must return to #starter after sign-in');

    await page.close();
  });

  await test('4.2 Responsive layout at 1280x800 (Desktop) and 390x844 (Mobile Android)', async () => {
    // Desktop Viewport
    const desktopPage = await setupPage(browser, { viewport: { width: 1280, height: 800 } });
    await desktopPage.goto(`${BASE_URL}/#/starter`);
    await desktopPage.waitForSelector('.tier-comparison');

    let scrollWidth = await desktopPage.evaluate(() => document.documentElement.scrollWidth);
    let clientWidth = await desktopPage.evaluate(() => document.documentElement.clientWidth);
    assert.ok(scrollWidth <= clientWidth + 2, `No desktop horizontal overflow: ${scrollWidth} <= ${clientWidth}`);
    await desktopPage.close();

    // Mobile Viewport (390x844)
    const mobilePage = await setupPage(browser, { viewport: { width: 390, height: 844 }, isAuth: false });
    await mobilePage.goto(`${BASE_URL}/#/starter`);
    await mobilePage.waitForSelector('.tier-comparison');

    scrollWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
    clientWidth = await mobilePage.evaluate(() => document.documentElement.clientWidth);
    assert.ok(scrollWidth <= clientWidth + 2, `No mobile horizontal overflow: ${scrollWidth} <= ${clientWidth}`);

    // Check auth page at mobile
    await mobilePage.goto(`${BASE_URL}/auth-ui/sign-in.html`);
    await mobilePage.waitForSelector('#phase1-google-btn');
    scrollWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
    clientWidth = await mobilePage.evaluate(() => document.documentElement.clientWidth);
    assert.ok(scrollWidth <= clientWidth + 2, `No mobile auth horizontal overflow: ${scrollWidth} <= ${clientWidth}`);

    await mobilePage.close();
  });

  // ── GROUP 5: Safe Payment Flow, Error Handling, and Regression Tests ────────
  console.log('\n--- GROUP 5: Safe Payment Flow & Regression Tests ---');

  await test('5.1 sa(env) safely handles missing/undefined FIREBASE_SERVICE_ACCOUNT_JSON without throwing "undefined" is not valid JSON', async () => {
    await assert.rejects(
      async () => await sa({}),
      { message: 'Firebase service account credentials are not configured on server' }
    );
    await assert.rejects(
      async () => await sa({ FIREBASE_SERVICE_ACCOUNT_JSON: undefined }),
      { message: 'Firebase service account credentials are not configured on server' }
    );
    await assert.rejects(
      async () => await sa({ FIREBASE_SERVICE_ACCOUNT_JSON: '' }),
      { message: 'Firebase service account credentials are not configured on server' }
    );
  });

  await test('5.2 sa(env) safely throws on malformed JSON without raw syntax error', async () => {
    await assert.rejects(
      async () => await sa({ FIREBASE_SERVICE_ACCOUNT_JSON: '{invalid-json' }),
      { message: 'Firebase service account credentials are malformed on server' }
    );
  });

  await test('5.3 sa(env) successfully parses valid JSON service account', async () => {
    const parsed = await sa({
      FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'test@abacus.iam.gserviceaccount.com' })
    });
    assert.equal(parsed.client_email, 'test@abacus.iam.gserviceaccount.com');
  });

  await test('5.4 parseJsonResponse handles 200 JSON, 500 error, 502 HTML, and sanitizes "undefined" is not valid JSON', async () => {
    const page = await setupPage(browser, { isAuth: true });
    await page.goto(`${BASE_URL}/#/starter`);
    const results = await page.evaluate(async () => {
      const { parseJsonResponse } = await import('/js/payments.js');
      const out = {};

      // 200 valid JSON
      const res200 = new Response(JSON.stringify({ orderId: 'ord_123', amount: 9900 }));
      const d200 = await parseJsonResponse(res200);
      out.ok200 = d200.orderId === 'ord_123';

      // 500 with undefined JSON error
      try {
        const res500 = new Response(JSON.stringify({ error: '"undefined" is not valid JSON' }), { status: 500 });
        await parseJsonResponse(res500);
        out.err500 = null;
      } catch (e) {
        out.err500 = e.message;
      }

      // 502 with HTML
      try {
        const res502 = new Response('<html>502 Bad Gateway</html>', { status: 502, headers: { 'Content-Type': 'text/html' } });
        await parseJsonResponse(res502);
        out.err502 = null;
      } catch (e) {
        out.err502 = e.message;
      }

      // 500 empty body
      try {
        const resEmpty = new Response('', { status: 500 });
        await parseJsonResponse(resEmpty);
        out.errEmpty = null;
      } catch (e) {
        out.errEmpty = e.message;
      }

      return out;
    });

    assert.equal(results.ok200, true);
    assert.ok(!results.err500.includes('not valid JSON'), 'err500 must not contain syntax error');
    assert.ok(results.err500.includes('Payment service is temporarily unavailable'), 'err500 must show friendly message');
    assert.ok(!results.err502.includes('not valid JSON'), 'err502 must not contain syntax error');
    assert.ok(results.err502.includes('Payment service is temporarily unavailable'), 'err502 must show friendly message');
    assert.ok(!results.errEmpty.includes('not valid JSON'), 'errEmpty must not contain syntax error');
    assert.ok(results.errEmpty.includes('Payment service is temporarily unavailable'), 'errEmpty must show friendly message');

    await page.close();
  });

  await test('5.5 Real Android QA Scenario: /api/create-order returns 500 error ("\"undefined\" is not valid JSON") -> UI displays friendly error, never raw SyntaxError, and button re-enables', async () => {
    server.resetHandlers();
    server.setCreateOrderHandler((req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '"undefined" is not valid JSON' }));
    });

    const page = await setupPage(browser, { viewport: { width: 390, height: 844 }, isAuth: true });
    await page.goto(`${BASE_URL}/#/starter`);
    await page.waitForSelector('#buy-starter');

    const buyBtn = page.locator('#buy-starter');
    await buyBtn.click();

    await page.waitForFunction(() => {
      const el = document.getElementById('starter-status');
      const btn = document.getElementById('buy-starter');
      return el && el.textContent.length > 0 && btn && !btn.disabled;
    });

    const statusText = await page.textContent('#starter-status');
    assert.ok(!statusText.includes('"undefined" is not valid JSON'), 'UI must NOT display raw undefined is not valid JSON');
    assert.ok(!statusText.includes('SyntaxError'), 'UI must NOT display raw SyntaxError');
    assert.ok(statusText.includes('Payment service is temporarily unavailable'), 'UI must display user-friendly error');

    // Confirm button is re-enabled so user is not stuck
    const isDisabled = await buyBtn.isDisabled();
    assert.equal(isDisabled, false, 'Button must be re-enabled after error');

    server.resetHandlers();
    await page.close();
  });

  await test('5.6 /api/create-order returns 502 HTML error -> UI displays friendly error without crashing', async () => {
    server.resetHandlers();
    server.setCreateOrderHandler((req, res) => {
      res.writeHead(502, { 'Content-Type': 'text/html' });
      res.end('<html><body>502 Bad Gateway: Cloudflare Worker Error</body></html>');
    });

    const page = await setupPage(browser, { viewport: { width: 390, height: 844 }, isAuth: true });
    await page.goto(`${BASE_URL}/#/starter`);
    await page.waitForSelector('#buy-starter');

    const buyBtn = page.locator('#buy-starter');
    await buyBtn.click();

    await page.waitForFunction(() => {
      const el = document.getElementById('starter-status');
      const btn = document.getElementById('buy-starter');
      return el && el.textContent.length > 0 && btn && !btn.disabled;
    });

    const statusText = await page.textContent('#starter-status');
    assert.ok(!statusText.includes('not valid JSON'));
    assert.ok(!statusText.includes('<html>'));
    assert.ok(statusText.includes('Payment service is temporarily unavailable'));

    server.resetHandlers();
    await page.close();
  });

  await test('5.7 Incomplete or invalid order payload from server prevents Razorpay checkout and displays clean error', async () => {
    server.resetHandlers();
    server.setCreateOrderHandler((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      // Missing keyId and orderId
      res.end(JSON.stringify({ amount: 9900, currency: 'INR' }));
    });

    const page = await setupPage(browser, { viewport: { width: 390, height: 844 }, isAuth: true });
    await page.addInitScript(() => {
      window.__razorpayOpened = false;
      window.Razorpay = function() {
        return {
          open: () => { window.__razorpayOpened = true; },
          on: () => {},
        };
      };
    });

    await page.goto(`${BASE_URL}/#/starter`);
    await page.waitForSelector('#buy-starter');

    await page.locator('#buy-starter').click();

    await page.waitForFunction(() => {
      const el = document.getElementById('starter-status');
      const btn = document.getElementById('buy-starter');
      return el && el.textContent.length > 0 && btn && !btn.disabled;
    });

    const razorpayOpened = await page.evaluate(() => window.__razorpayOpened);
    assert.equal(razorpayOpened, false, 'Razorpay must not open with invalid order payload');

    const statusText = await page.textContent('#starter-status');
    assert.ok(statusText.includes('invalid order details'));

    server.resetHandlers();
    await page.close();
  });

  await test('5.8 Successful Starter payment: opens Razorpay for 9900 paise, verifies, and activates Starter tier', async () => {
    server.resetHandlers();

    const page = await setupPage(browser, { viewport: { width: 390, height: 844 }, isAuth: true });
    await page.addInitScript(() => {
      window.Razorpay = function(options) {
        window.__capturedRazorpayOptions = options;
        return {
          open: () => {
            // Simulate Razorpay payment completion callback
            setTimeout(() => {
              options.handler({
                razorpay_order_id: options.order_id,
                razorpay_payment_id: 'pay_starter_mock_999',
                razorpay_signature: 'valid_mock_sig',
              });
            }, 50);
          },
          on: () => {},
        };
      };
    });

    await page.goto(`${BASE_URL}/#/starter`);
    await page.waitForSelector('#buy-starter');

    await page.locator('#buy-starter').click();

    await page.waitForFunction(() => {
      const el = document.getElementById('starter-status');
      return el && el.textContent.includes('Payment verified');
    });

    const options = await page.evaluate(() => window.__capturedRazorpayOptions);
    assert.equal(options.amount, 9900, 'Razorpay must be opened for ₹99 (9900 paise)');
    assert.equal(options.currency, 'INR');
    assert.equal(options.order_id, 'order_starter_123');
    assert.ok(options.description.includes('Starter Tier'));

    // Check localStorage cached entitlement
    const cachedEnt = await page.evaluate(() => JSON.parse(localStorage.getItem('abacus-entitlement-v1')));
    assert.equal(cachedEnt.paid, true);
    assert.equal(cachedEnt.tier, 'starter');

    server.resetHandlers();
    await page.close();
  });

  console.log('\n========================================');
  console.log('All Starter Tier and Access tests PASSED successfully!');
  console.log('========================================\n');

} finally {
  await browser.close();
  await new Promise(r => server.close(r));
}
