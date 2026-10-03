import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// ── Test Server with Mock Backend API Endpoints ──────────────────────────────
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

  let mockEntitled = false;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    let reqPath = decodeURI(url.pathname);

    // Mock API endpoints for payment/entitlement flow
    if (reqPath === '/api/user-status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ paid: mockEntitled, uid: 'google_test_uid_456' }));
    }

    if (reqPath === '/api/create-order' && req.method === 'POST') {
      const authHeader = req.headers['authorization'] || '';
      if (!authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Missing or invalid token' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        orderId: 'order_mock_google_789',
        amount: 49900,
        currency: 'INR',
        keyId: 'rzp_test_mock_key',
        paid: mockEntitled,
      }));
    }

    if (reqPath === '/api/verify-payment' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        mockEntitled = true;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ paid: true, orderId: 'order_mock_google_789' }));
      });
      return;
    }

    // Static file serving
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

  server.resetMock = () => { mockEntitled = false; };
  return server;
}

// ── Test Runner ─────────────────────────────────────────────────────────────
let testsPassed = 0;
async function test(name, fn) {
  try {
    await fn();
    testsPassed++;
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
    throw err;
  }
}

// ── Main Test Suite ─────────────────────────────────────────────────────────
const server = createTestServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const BASE_URL = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({ headless: true });

async function setupAppPage(browserInstance, { profileState = {}, mockUser = null } = {}) {
  const page = await browserInstance.newPage();
  await page.addInitScript(({ state, user }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('abacus-kids-v3', JSON.stringify({
      v: 3,
      profile: { name: 'Aarav', avatar: '🦊', experience: 'new', lang: 'en', voiceLang: 'en' },
      settings: { sound: false, voice: false },
      lessonsDone: [1, 2, 3],
      levels: { 1: { stars: 3 }, 2: { stars: 3 }, 3: { stars: 3 } },
      unlocked: 4,
      ...state,
    }));
    if (user) {
      window.__mockUser = {
        ...user,
        getIdToken: async () => 'valid_bearer_token_123',
      };
    }
  }, { state: profileState, user: mockUser });
  return page;
}

try {
  // ── GROUP 1: Google Auth Module & Provider Configuration ─────────────────
  console.log('\n--- GROUP 1: Google Auth Module & Provider Configuration ---');

  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/index.html`);

  await test('1.1 firebase/auth.js exports Google Auth helper functions', async () => {
    const exports = await page.evaluate(async () => {
      const mod = await import('/firebase/auth.js');
      return {
        hasGetGoogleProvider: typeof mod.getGoogleProvider === 'function',
        hasSignInWithGoogle: typeof mod.signInWithGoogle === 'function',
        hasSignInWithGoogleRedirect: typeof mod.signInWithGoogleRedirect === 'function',
        hasGetGoogleRedirectResult: typeof mod.getGoogleRedirectResult === 'function',
      };
    });

    assert.equal(exports.hasGetGoogleProvider, true, 'getGoogleProvider must be exported');
    assert.equal(exports.hasSignInWithGoogle, true, 'signInWithGoogle must be exported');
    assert.equal(exports.hasSignInWithGoogleRedirect, true, 'signInWithGoogleRedirect must be exported');
    assert.equal(exports.hasGetGoogleRedirectResult, true, 'getGoogleRedirectResult must be exported');
  });

  await test('1.2 getGoogleProvider() creates provider with select_account prompt', async () => {
    const providerDetails = await page.evaluate(async () => {
      const { getGoogleProvider } = await import('/firebase/auth.js');
      const provider = getGoogleProvider();
      return {
        providerId: provider.providerId,
        customParams: provider.getCustomParameters ? provider.getCustomParameters() : null,
      };
    });

    assert.equal(providerDetails.providerId, 'google.com', 'Provider ID must be google.com');
    assert.deepEqual(providerDetails.customParams, { prompt: 'select_account' });
  });

  await page.close();

  // ── GROUP 2: Canonical in-app Google Auth & Onboarding ────────────────────
  console.log('\n--- GROUP 2: Canonical in-app Google Auth & Onboarding ---');

  await test('2.1 #/home renders the existing Google + Email auth gate with no duplicate auth page', async () => {
    const page = await setupAppPage(browser, { profileState: { profile: null } });
    await page.goto(`${BASE_URL}/index.html#/home`);
    await page.waitForSelector('#authGateGoogleBtn');
    assert.ok(await page.isVisible('#authGateGoogleBtn'));
    assert.ok(await page.isVisible('#authGateEmailBtn'));
    assert.ok(await page.isVisible('#kidName') === false);
    assert.equal(await page.$('#phase1-google-btn'), null);
    assert.equal(fs.existsSync(path.join(ROOT_DIR, 'auth-ui', 'sign-in.html')), false);
    await page.close();
  });

  await test('2.2 Successful Google auth advances directly to the existing child-profile onboarding screen', async () => {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.clear(); sessionStorage.clear();
      window.__mockSignInWithGoogle = () => Promise.resolve({
        user: { uid: 'google_welcome_uid', email: 'parent@example.com', displayName: 'Parent User' }
      });
    });
    await page.goto(`${BASE_URL}/index.html#/home`);
    await page.waitForSelector('#authGateGoogleBtn');
    await page.click('#authGateGoogleBtn');
    await page.waitForSelector('#kidName');
    assert.ok(await page.isVisible('#kidName'));
    assert.ok(await page.isVisible('#start'));
    await page.close();
  });

  await test('2.3 Welcome onboarding exposes English and Tamil only', async () => {
    const page = await setupAppPage(browser, { profileState: { profile: null } });
    await page.goto(`${BASE_URL}/index.html#/home`);
    await page.waitForSelector('#authGateGoogleBtn');
    await page.evaluate(() => {
      document.getElementById('authGateStep').style.display = 'none';
      document.getElementById('welcomeProfileStep').style.display = 'block';
    });
    const labels = await page.locator('[data-lang-choice]').allTextContents();
    assert.deepEqual(labels.map(x => x.trim()), ['English', 'தமிழ்']);
    await page.close();
  });

  await test('2.4 Payment/auth CTAs use #/home instead of the retired standalone sign-in page', async () => {
    const page = await setupAppPage(browser, { profileState: { profile: null } });
    await page.goto(`${BASE_URL}/index.html#/starter`);
    const starterHref = await page.getAttribute('#signin-starter-btn', 'href');
    assert.equal(starterHref, '#/home');
    await page.goto(`${BASE_URL}/index.html#/unlock`);
    const unlockHref = await page.getAttribute('#signin-btn', 'href');
    assert.equal(unlockHref, '#/home');
    await page.close();
  });

  // ── GROUP 3: In-App #/unlock Google Sign-In & Purchase Journey ────────────
  console.log('\n--- GROUP 3: In-App #/unlock Google Sign-In & Purchase Journey ---');

  await test('3.1 Unauthenticated #/unlock screen displays "Sign in to unlock with Google"', async () => {
    const appPage = await setupAppPage(browser);
    await appPage.goto(`${BASE_URL}/#/unlock`);
    await appPage.waitForSelector('.card.intro');

    const signinBtn = appPage.locator('.card.intro .stack a#signin-btn');
    assert.ok(await signinBtn.isVisible(), 'Sign-in CTA button must be visible');

    const signinText = await signinBtn.textContent();
    assert.ok(signinText.includes('Sign in to unlock with Google'), 'CTA text must be "Sign in to unlock with Google"');

    const href = await signinBtn.getAttribute('href');
    assert.equal(href, '#/home', 'Must link to #/home for canonical in-app auth');
    await appPage.close();
  });

  await test('3.2 In Tamil mode, #/unlock screen displays "Google மூலம் தொடங்க உள்நுழையவும்"', async () => {
    const appPage = await setupAppPage(browser, {
      profileState: {
        profile: { name: 'கவின்', avatar: '🦁', lang: 'ta', voiceLang: 'ta' },
      },
    });

    await appPage.goto(`${BASE_URL}/#/unlock`);
    await appPage.waitForSelector('.card.intro');

    const signinBtn = appPage.locator('.card.intro .stack a#signin-btn');
    const signinText = await signinBtn.textContent();
    assert.ok(signinText.includes('Google மூலம் தொடங்க உள்நுழையவும்'), 'Tamil CTA must contain Google மூலம் தொடங்க உள்நுழையவும்');
    await appPage.close();
  });

  await test('3.3 Authenticated Google user on #/unlock screen displays "Unlock for ₹499"', async () => {
    const mockUser = {
      uid: 'google_parent_auth_888',
      displayName: 'Sundar P',
      email: 'sundar@example.com',
      phoneNumber: null,
      getIdToken: async () => 'test_bearer_token_xyz',
    };

    const appPage = await setupAppPage(browser, { mockUser });
    await appPage.goto(`${BASE_URL}/#/unlock`);
    await appPage.waitForSelector('#buy');

    const buyText = await appPage.textContent('#buy');
    assert.ok(buyText.includes('Unlock for ₹499'), 'Authenticated user sees "Unlock for ₹499"');
    await appPage.close();
  });

  await test('3.4 Full End-to-End Paid Journey: Google Auth -> Order Creation -> Razorpay Prefill -> Verification -> Permanent Unlock', async () => {
    server.resetMock();
    const mockUser = {
      uid: 'google_parent_full_journey_999',
      displayName: 'Ravi Kumar',
      email: 'ravi.kumar@gmail.com',
      phoneNumber: '+919876543210',
      getIdToken: async () => 'valid_bearer_token_123',
    };

    const appPage = await setupAppPage(browser, { mockUser });

    // Inject mock Razorpay checkout before opening payment
    await appPage.addInitScript(() => {
      window.Razorpay = function(options) {
        window.__capturedRazorpayOptions = options;
        return {
          open: () => {},
          on: (evt, cb) => {},
          close: () => {},
        };
      };
    });

    appPage.on('console', msg => console.log('PAGE LOG:', msg.text()));
    appPage.on('pageerror', err => console.error('PAGE ERROR:', err));

    await appPage.goto(`${BASE_URL}/#/unlock`);
    await appPage.waitForSelector('#buy');

    const buyBtn = appPage.locator('#buy');
    assert.ok(await buyBtn.isVisible());

    // Click Unlock button to initiate payment order
    await appPage.click('#buy');

    // Wait for Razorpay initialization
    try {
      await appPage.waitForFunction(() => window.__capturedRazorpayOptions != null, { timeout: 5000 });
    } catch (err) {
      const payStatus = await appPage.textContent('#pay-status');
      console.error('Pay status element text:', payStatus);
      throw err;
    }

    const rzpOptions = await appPage.evaluate(() => window.__capturedRazorpayOptions);
    assert.equal(rzpOptions.name, 'Abacus Buddy');
    assert.equal(rzpOptions.amount, 49900);
    assert.equal(rzpOptions.currency, 'INR');
    assert.equal(rzpOptions.order_id, 'order_mock_google_789');

    // Verify prefill automatically extracted Google user details
    assert.equal(rzpOptions.prefill.name, 'Ravi Kumar', 'Prefill name must match Google display name');
    assert.equal(rzpOptions.prefill.email, 'ravi.kumar@gmail.com', 'Prefill email must match Google email');
    assert.equal(rzpOptions.prefill.contact, '+919876543210', 'Prefill contact must match phone if available');

    // Simulate Razorpay payment success handler
    await appPage.evaluate(async () => {
      const rzp = window.__capturedRazorpayOptions;
      await rzp.handler({
        razorpay_payment_id: 'pay_mock_google_payment_123',
        razorpay_order_id: 'order_mock_google_789',
        razorpay_signature: 'valid_mock_signature',
      });
    });

    // Verify entitlement updated to paid
    const isPaidAfterVerification = await appPage.evaluate(async () => {
      const { isPaid } = await import('/js/payments.js');
      return isPaid();
    });
    assert.equal(isPaidAfterVerification, true, 'isPaid() must return true after payment verification');

    // Verify Level 4 is now unlocked in practice map
    await appPage.evaluate(async () => {
      window.location.hash = '#/practice';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    await appPage.waitForSelector('.levels');
    const lv4Link = appPage.locator('.levels a.level').nth(3);
    const lv4Href = await lv4Link.getAttribute('href');
    assert.equal(lv4Href, '#/level/4', 'Level 4 must link directly to #/level/4 now that user is paid');

    const lv4Text = await lv4Link.textContent();
    assert.ok(!lv4Text.includes('₹499 unlock'), 'Level 4 must no longer show paywall badge');

    await appPage.close();
  });

  console.log(`\n========================================`);
  console.log(`All ${testsPassed} Google Authentication tests PASSED successfully!`);
  console.log(`========================================\n`);

} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
