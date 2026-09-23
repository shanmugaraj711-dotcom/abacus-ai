import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// ── Lightweight static server for testing ───────────────────────────────────
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

// ── Helpers ─────────────────────────────────────────────────────────────────
const VIEWPORTS = [
  { name: '320px (iPhone SE / Small Android)', width: 320, height: 640 },
  { name: '390px (iPhone 12/13/14 / Modern Android)', width: 390, height: 844 },
  { name: '820px (iPad / Tablet)', width: 820, height: 1180 },
];

const server = createTestServer();
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE_URL = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ headless: true });

const auditResults = {
  overflows: [],
  touchTargets: [],
  flows: [],
  pwa: {},
};

try {
  console.log(`Mobile Audit Server running at ${BASE_URL}`);

  for (const vp of VIEWPORTS) {
    console.log(`\n========================================`);
    console.log(`AUDITING VIEWPORT: ${vp.name} (${vp.width}x${vp.height})`);
    console.log(`========================================`);

    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: true,
      isMobile: vp.width < 600,
    });
    const page = await ctx.newPage();

    // Helper to check horizontal overflow
    async function checkOverflow(label) {
      const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
      const innerW = await page.evaluate(() => window.innerWidth);
      const diff = scrollW - innerW;
      if (diff > 1) {
        const item = `[${vp.width}px] Overflow on ${label}: scrollWidth=${scrollW}px, innerWidth=${innerW}px (delta +${diff}px)`;
        console.warn('  ⚠️ ' + item);
        auditResults.overflows.push(item);
      } else {
        console.log(`  ✓ No horizontal scroll on ${label} (${scrollW}px <= ${innerW}px)`);
      }
    }

    // ── 1. Onboarding & Welcome Screen ──────────────────────────────────────
    console.log(`\n--- 1. Welcome Screen [${vp.width}px] ---`);
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForSelector('#kidName');
    await checkOverflow('Welcome Screen');

    // Fill onboarding
    await page.fill('#kidName', 'Aadhavan');
    await page.click('[data-avatar="🦁"]');
    await page.click('[data-exp="new"]');
    await page.click('#start');
    await page.waitForSelector('header.top');

    // ── 2. Home Screen ──────────────────────────────────────────────────────
    console.log(`\n--- 2. Home Screen [${vp.width}px] ---`);
    await checkOverflow('Home Screen');

    const missionVisible = await page.isVisible('.mission');
    const tilesCount = await page.locator('.tile').count();
    const babiVisible = await page.isVisible('.talk-babi, .mission-babi');
    console.log(`  Mission card visible: ${missionVisible}`);
    console.log(`  Navigation tiles rendered: ${tilesCount}`);
    console.log(`  Babi mascot visible: ${babiVisible}`);

    // ── 3. Level 1, 2, 3 Practice Views ────────────────────────────────────
    console.log(`\n--- 3. Levels 1–3 Progression & Bead UI [${vp.width}px] ---`);
    for (let lv = 1; lv <= 3; lv++) {
      await page.goto(`${BASE_URL}/index.html#/level/${lv}`);
      await page.waitForSelector('[data-start]');
      await checkOverflow(`Level ${lv} Intro`);
      await page.click('[data-start]');
      await page.waitForSelector('.abacus');
      await checkOverflow(`Level ${lv} Active Practice`);

      // Check bead tap targets
      const beadBox = await page.locator('.bead').first().boundingBox();
      if (beadBox) {
        console.log(`  Level ${lv} Bead height: ${beadBox.height}px, width: ${beadBox.width}px`);
        if (beadBox.height < 28) {
          auditResults.touchTargets.push(`[${vp.width}px] Level ${lv} Bead height is small: ${beadBox.height}px`);
        }
      }

      // Check action buttons in row (.btn)
      const btnHeights = await page.$$eval('.row .btn', btns => btns.map(b => b.offsetHeight));
      console.log(`  Level ${lv} Action buttons height: min ${Math.min(...btnHeights)}px, max ${Math.max(...btnHeights)}px`);
    }

    // ── 4. Level 3 Completion & Transition Screen ────────────────────────────
    console.log(`\n--- 4. Level 3 Completion Celebration [${vp.width}px] ---`);
    await page.goto(`${BASE_URL}/index.html#/practice`);
    await page.waitForSelector('.levels');
    await checkOverflow('Practice Map');

    // Render completion celebration card to test layout and button stack
    await page.evaluate(() => {
      const continueLabel = 'Continue to Level 4 →';
      const unlockNote = '🌟 Level 3 complete! Ready for Level 4?';
      document.querySelector('.view').innerHTML = `
        <section class="done-card">
          <svg class="babi cheer big bob" viewBox="0 0 160 160"></svg>
          <h2 class="display">Super!</h2>
          <div class="big-stars"><span class="stars"><i>★</i><i>★</i><i>★</i></span></div>
          <p class="lead"><b>8</b> of 8 right on the first try</p>
          <p class="unlock">${unlockNote}</p>
          <div class="stack">
            <a class="btn primary wide" href="#/unlock">${continueLabel}</a>
            <button class="btn wide" data-again>↺ Play this level again</button>
            <a class="btn ghost wide" href="#/home">Home</a>
          </div>
        </section>`;
    });
    await checkOverflow('Level 3 Completion Celebration Card');

    // Verify Continue to Level 4 button is visible and fits
    const contBtnBox = await page.locator('.stack a.primary').boundingBox();
    console.log(`  Continue to Level 4 button: width=${contBtnBox.width.toFixed(1)}px, height=${contBtnBox.height.toFixed(1)}px`);
    assert.ok(contBtnBox.height >= 48, 'Button height must be >= 48px');

    // Click Continue to Level 4 to verify navigation to #/unlock
    await page.click('.stack a.primary');
    await page.waitForSelector('.card.intro');
    console.log(`  ✓ Navigated successfully from Level 3 celebration to #/unlock`);

    // ── 5. Unlock Screen (#/unlock) ─────────────────────────────────────────
    console.log(`\n--- 5. Unlock Screen (#/unlock) [${vp.width}px] ---`);
    await page.goto(`${BASE_URL}/index.html#/unlock`);
    await page.waitForSelector('.card.intro');
    await checkOverflow('Unlock Screen');

    const unlockBtnText = await page.textContent('.stack a.primary');
    console.log(`  Primary CTA on Unlock screen: "${unlockBtnText.trim()}"`);
    assert.ok(unlockBtnText.includes('Sign in to unlock'));

    // ── 6. Phone UI (/auth-ui/sign-in.html) ──────────────────────────────────
    console.log(`\n--- 6. Phone UI Screen (/auth-ui/sign-in.html) [${vp.width}px] ---`);
    await page.goto(`${BASE_URL}/auth-ui/sign-in.html?return=../#unlock`);
    await page.waitForSelector('#phase1-signin-section');
    await checkOverflow('Phone Sign-In Screen');

    const countryBox = await page.locator('#phase1-country').boundingBox();
    const phoneBox = await page.locator('#phase1-phone').boundingBox();
    const sendBtnBox = await page.locator('#phase1-send-btn').boundingBox();

    console.log(`  Country select dimensions: ${countryBox.width.toFixed(1)}px × ${countryBox.height.toFixed(1)}px`);
    console.log(`  Phone input dimensions:    ${phoneBox.width.toFixed(1)}px × ${phoneBox.height.toFixed(1)}px`);
    console.log(`  Send OTP button height:    ${sendBtnBox.height.toFixed(1)}px`);

    // Verify input fit: enter 10 digits
    await page.fill('#phase1-phone', '9876543210');
    const inputVal = await page.$eval('#phase1-phone', el => el.value);
    assert.equal(inputVal, '98765 43210');
    await checkOverflow('Phone Input with 10 digits formatted');

    // Test OTP Section layout at this viewport
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('abacus:otp-sent', {
        detail: { confirmationResult: { confirm: async () => {} }, phone: '+91 98765 43210' }
      }));
    });
    await page.waitForSelector('#phase1-otp-section:not([hidden])');
    await checkOverflow('OTP Verification Step');

    const otpInputBox = await page.locator('#phase1-otp').boundingBox();
    console.log(`  OTP input dimensions:      ${otpInputBox.width.toFixed(1)}px × ${otpInputBox.height.toFixed(1)}px`);

    // ── 7. Games Room & Free Play ───────────────────────────────────────────
    console.log(`\n--- 7. Games Room & Free Play [${vp.width}px] ---`);
    await page.goto(`${BASE_URL}/index.html#/play`);
    await page.waitForSelector('.games');
    await checkOverflow('Games Room');

    await page.goto(`${BASE_URL}/index.html#/free`);
    await page.waitForSelector('.abacus');
    await checkOverflow('Free Play');

    await ctx.close();
  }

  // ── 8. PWA & Offline Audit ────────────────────────────────────────────────
  console.log(`\n========================================`);
  console.log(`PWA & OFFLINE MANIFEST AUDIT`);
  console.log(`========================================`);

  const manifestPath = path.join(ROOT_DIR, 'manifest.json');
  const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  console.log(`  ✓ manifest.json exists and is valid JSON`);
  console.log(`    - name: ${manifest.name}`);
  console.log(`    - short_name: ${manifest.short_name}`);
  console.log(`    - start_url: ${manifest.start_url}`);
  console.log(`    - display: ${manifest.display}`);
  console.log(`    - icons: ${manifest.icons.length} icons defined`);

  // Verify icon files exist on disk
  for (const ic of manifest.icons) {
    const iconFile = path.join(ROOT_DIR, ic.src);
    const exists = fs.existsSync(iconFile);
    console.log(`    - icon ${ic.src} (${ic.sizes}): ${exists ? 'EXISTS ✓' : 'MISSING ✗'}`);
    assert.ok(exists, `Icon ${ic.src} must exist`);
  }

  // Verify sw.js exists on disk
  const swPath = path.join(ROOT_DIR, 'sw.js');
  assert.ok(fs.existsSync(swPath), 'sw.js must exist');
  const swCode = fs.readFileSync(swPath, 'utf8');
  console.log(`  ✓ Service worker sw.js exists (${swCode.length} bytes)`);

  console.log(`\n========================================`);
  console.log(`AUDIT SUMMARY`);
  console.log(`========================================`);
  console.log(`Total Viewports Audited: ${VIEWPORTS.length}`);
  console.log(`Horizontal Overflows: ${auditResults.overflows.length === 0 ? 'ZERO (None!) ✓' : auditResults.overflows.length}`);
  if (auditResults.overflows.length > 0) {
    auditResults.overflows.forEach(o => console.warn('  ' + o));
  }
  console.log(`Touch Target Issues: ${auditResults.touchTargets.length === 0 ? 'None ✓' : auditResults.touchTargets.length}`);

} finally {
  await browser.close();
  server.close();
}
