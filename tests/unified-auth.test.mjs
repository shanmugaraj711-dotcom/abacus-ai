/**
 * tests/unified-auth.test.mjs
 * Comprehensive tests for Unified Auth (Google + Email/Password) and retirement of Phone/OTP.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function createStaticServer() {
  return http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0].replace(/\/+$/, '');
    if (!reqPath || reqPath === '') reqPath = '/index.html';
    const filePath = path.join(ROOT_DIR, reqPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.mjs': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });
}

const server = createStaticServer();
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const BASE_URL = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({ headless: true });

try {
  console.log('\n=== UNIFIED AUTHENTICATION TESTS ===');

  await test('Auth UI DOM contains Google Sign-In and Email/Password, but NO Phone/OTP elements', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/auth-ui/sign-in.html`);

    // Required Google Sign-in elements
    assert.ok(await page.isVisible('#phase1-google-btn'), 'Google button must be visible');
    const googleText = await page.textContent('#phase1-google-btn');
    assert.ok(googleText.includes('Sign in with Google'), 'Google button text correct');

    // Required Email/Password elements
    assert.ok(await page.isVisible('#phase1-email'), 'Email input must be visible');
    assert.ok(await page.isVisible('#phase1-password'), 'Password input must be visible');
    assert.ok(await page.isVisible('#phase1-submit-btn'), 'Submit button must be visible');
    assert.ok(await page.isVisible('#phase1-forgot-btn'), 'Forgot password button must be visible');
    assert.ok(await page.isVisible('#phase1-toggle-btn'), 'Toggle new account button must be visible');

    // STRICT: Phone/OTP elements MUST be absent
    const phoneInput = await page.$('#phase1-phone');
    const countrySelect = await page.$('#phase1-country');
    const sendOtpBtn = await page.$('#phase1-send-btn');
    const verifyOtpBtn = await page.$('#phase1-verify-btn');
    const otpSection = await page.$('#phase1-otp-section');
    const recaptcha = await page.$('#phase1-recaptcha');

    assert.equal(phoneInput, null, 'Phone input must NOT exist');
    assert.equal(countrySelect, null, 'Country select must NOT exist');
    assert.equal(sendOtpBtn, null, 'Send OTP button must NOT exist');
    assert.equal(verifyOtpBtn, null, 'Verify OTP button must NOT exist');
    assert.equal(otpSection, null, 'OTP section must NOT exist');
    assert.equal(recaptcha, null, 'Recaptcha container must NOT exist');

    await page.close();
  });

  await test('Toggle between Sign In and Create Account modes updates UI state and fields', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/auth-ui/sign-in.html`);

    assert.equal(await page.isVisible('#phase1-confirm-field'), false, 'Confirm password hidden initially');
    assert.equal((await page.textContent('#phase1-submit-btn')).trim(), 'Sign in');

    // Toggle to Create Account
    await page.click('#phase1-toggle-btn');
    assert.equal(await page.isVisible('#phase1-confirm-field'), true, 'Confirm password visible in register mode');
    assert.equal((await page.textContent('#phase1-submit-btn')).trim(), 'Create account');

    // Toggle back to Sign In
    await page.click('#phase1-toggle-btn');
    assert.equal(await page.isVisible('#phase1-confirm-field'), false, 'Confirm password hidden again');
    assert.equal((await page.textContent('#phase1-submit-btn')).trim(), 'Sign in');

    await page.close();
  });

  await test('Direct access and return URL handling: ?return=../#starter preserves #starter', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/auth-ui/sign-in.html?return=../#starter`);

    await page.evaluate(() => {
      // Mock user display in signed-in panel
      document.getElementById('phase1-user-display-name').textContent = 'Test Parent';
      document.getElementById('phase1-user-phone').textContent = 'parent@test.com';
      document.getElementById('phase1-user-uid').textContent = 'uid_test_123';
      document.getElementById('phase1-signin-section').hidden = true;
      document.getElementById('phase1-signedin-section').hidden = false;
    });

    const contBtn = page.locator('#phase1-continue-btn');
    const href = await contBtn.getAttribute('href');
    assert.ok(href.includes('#starter'), `Continue button must link back to #starter, got: ${href}`);

    await page.close();
  });

  await test('Direct access and return URL handling: encoded ?return=..%2F%23unlock decodes and preserves #unlock', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/auth-ui/sign-in.html?return=..%2F%23unlock`);

    const contBtn = page.locator('#phase1-continue-btn');
    const href = await contBtn.getAttribute('href');
    assert.ok(href.includes('#unlock'), `Continue button must decode and preserve #unlock, got: ${href}`);

    await page.close();
  });

  await test('Open-redirect protection: external URLs in ?return are sanitized to default safe route', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/auth-ui/sign-in.html?return=https://malicious-site.com/steal-tokens`);

    const contBtn = page.locator('#phase1-continue-btn');
    const href = await contBtn.getAttribute('href');
    assert.ok(!href.includes('malicious-site.com'), 'Must block external open redirect');
    assert.ok(href.startsWith('../') || href.startsWith('./'), 'Must fall back to safe internal route');

    await page.close();
  });

  await test('Email validation gives clear user-facing error when email is empty or invalid', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/auth-ui/sign-in.html`);

    await page.click('#phase1-submit-btn');
    assert.ok(await page.isVisible('#phase1-auth-error'), 'Error alert must be visible');
    const errText = await page.textContent('#phase1-auth-error');
    assert.match(errText, /valid email/i);

    await page.close();
  });

  await test('Password validation requires at least 6 characters', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/auth-ui/sign-in.html`);

    await page.fill('#phase1-email', 'valid@example.com');
    await page.fill('#phase1-password', '123');
    await page.click('#phase1-submit-btn');

    assert.ok(await page.isVisible('#phase1-auth-error'), 'Error alert must be visible');
    const errText = await page.textContent('#phase1-auth-error');
    assert.match(errText, /at least 6 characters/i);

    await page.close();
  });

  console.log('All Unified Authentication tests PASSED!\n');
} finally {
  await browser.close();
  await new Promise(r => server.close(r));
}
