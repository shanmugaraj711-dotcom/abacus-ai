/**
 * tests/unified-auth.test.mjs
 * Canonical Google + Email authentication and onboarding regression suite.
 * The public SEO landing page hands Sign In directly to #/home, which renders
 * the existing in-app auth gate and child onboarding. No standalone auth page.
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

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  let reqPath = url.pathname.replace(/^\\/+/, '') || 'index.html';
  const filePath = path.join(ROOT_DIR, reqPath);
  if (!filePath.startsWith(ROOT_DIR) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404); return res.end('Not found');
  }
  const ext = path.extname(filePath);
  const mime = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'}[ext] || 'application/octet-stream';
  res.writeHead(200, {'Content-Type':mime}); fs.createReadStream(filePath).pipe(res);
});
await new Promise(r => server.listen(0,'127.0.0.1',r));
const BASE_URL = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({headless:true});

try {
  await test('1. Canonical #/home auth gate has Google + Email and no Guest/Phone/OTP', async () => {
    const page=await browser.newPage();
    await page.addInitScript(()=>{localStorage.clear();sessionStorage.clear();});
    await page.goto(`${BASE_URL}/index.html#/home`);
    await page.waitForSelector('#authGateGoogleBtn');
    assert.ok(await page.isVisible('#authGateGoogleBtn'));
    assert.ok(await page.isVisible('#authGateEmailBtn'));
    assert.equal(await page.$('#authGateGuestBtn'),null);
    assert.equal(await page.$('#authGatePhoneBtn'),null);
    assert.equal(await page.$('#phase1-phone'),null);
    assert.equal(fs.existsSync(path.join(ROOT_DIR,'auth-ui','sign-in.html')),false);
    await page.close();
  });

  await test('2. Google auth success advances to existing profile onboarding', async () => {
    const page=await browser.newPage();
    await page.addInitScript(()=>{
      localStorage.clear();sessionStorage.clear();
      window.__mockSignInWithGoogle=()=>Promise.resolve({user:{uid:'u-google',email:'parent@example.com',displayName:'Parent'}});
    });
    await page.goto(`${BASE_URL}/index.html#/home`);
    await page.waitForSelector('#authGateGoogleBtn');
    await page.click('#authGateGoogleBtn');
    await page.waitForSelector('#kidName');
    assert.ok(await page.isVisible('#start'));
    await page.close();
  });

  await test('3. Google auth failure is surfaced and button is retryable', async () => {
    const page=await browser.newPage();
    await page.addInitScript(()=>{
      localStorage.clear();sessionStorage.clear();
      window.__mockSignInWithGoogle=()=>{const e=new Error('The current domain is not authorized for OAuth operations.');e.code='auth/unauthorized-domain';return Promise.reject(e);};
    });
    await page.goto(`${BASE_URL}/index.html#/home`);
    await page.waitForSelector('#authGateGoogleBtn');
    await page.click('#authGateGoogleBtn');
    assert.ok(await page.isVisible('#authGateError'));
    assert.equal(await page.isEnabled('#authGateGoogleBtn'),true);
    await page.close();
  });

  await test('4. Email auth opens the existing in-app login/register view', async () => {
    const page=await browser.newPage();
    await page.addInitScript(()=>{localStorage.clear();sessionStorage.clear();});
    await page.goto(`${BASE_URL}/index.html#/home`);
    await page.waitForSelector('#authGateEmailBtn');
    await page.click('#authGateEmailBtn');
    assert.ok(await page.isVisible('#emailAuthStep'));
    assert.ok(await page.isVisible('#emailAuthEmail'));
    assert.ok(await page.isVisible('#emailAuthPassword'));
    assert.ok(await page.isVisible('#emailAuthSubmitBtn'));
    await page.click('#emailAuthToggleBtn');
    assert.ok(await page.isVisible('#emailAuthConfirmPassword'));
    await page.click('#emailAuthBackBtn');
    assert.ok(await page.isVisible('#authGateGoogleBtn'));
    await page.close();
  });

  await test('5. Landing Sign In is a single navigation to #/home and renders existing welcome', async () => {
    const page=await browser.newPage();
    await page.addInitScript(()=>{localStorage.clear();sessionStorage.clear();});
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForSelector('#heroSignInCta');
    assert.equal(await page.getAttribute('#heroSignInCta','href'),'#/home');
    await page.click('#heroSignInCta');
    await page.waitForURL(/#\\/home$/);
    await page.waitForSelector('.view.welcome');
    assert.ok(await page.isVisible('#authGateGoogleBtn'));
    assert.ok(!page.url().includes('auth-ui/sign-in.html'));
    await page.close();
  });

  await test('6. No Hindi onboarding option and old Hindi state normalizes to English', async () => {
    const page=await browser.newPage();
    await page.addInitScript(()=>{
      localStorage.setItem('abacus-kids-v3',JSON.stringify({v:3,profile:{name:'Child',lang:'hi',voiceLang:'hi'},settings:{sound:false,voice:false}}));
    });
    await page.goto(`${BASE_URL}/index.html#/home`);
    const langs=await page.locator('[data-lang-choice]').allTextContents();
    assert.deepEqual(langs.map(x=>x.trim()),['English','தமிழ்']);
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('abacus-kids-v3')).profile);
    assert.equal(stored.lang,'en');
    assert.equal(stored.voiceLang,'en');
    await page.close();
  });

  await test('7. Duplicate standalone sign-in page is absent from the product', async () => {
    assert.equal(fs.existsSync(path.join(ROOT_DIR,'auth-ui','sign-in.html')),false);
  });

  console.log('All Unified Authentication tests PASSED!\\n');
} finally {
  await browser.close();
  await new Promise(r=>server.close(r));
}
