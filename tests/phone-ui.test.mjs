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
    if (reqPath === '/') reqPath = '/auth-ui/sign-in.html';
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

await new Promise((resolve) => {
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    console.log(`Test server running on http://127.0.0.1:${port}`);
    resolve();
  });
});

const BASE_URL = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(`${BASE_URL}/auth-ui/sign-in.html`);

  // ── GROUP 1: validateAndFormatPhone Unit Tests ──────────────────────────────
  console.log('\n--- GROUP 1: validateAndFormatPhone Unit Tests ---');

  await test('1.1 Normal 10-digit India number formats to +91 E.164', async () => {
    const result = await page.evaluate(async () => {
      const { validateAndFormatPhone } = await import('/auth/sign-in.js');
      return validateAndFormatPhone('9876543210', '+91');
    });
    assert.equal(result.phone, '+919876543210');
    assert.equal(result.error, null);
  });

  await test('1.2 Spaced 10-digit India number formats properly', async () => {
    const result = await page.evaluate(async () => {
      const { validateAndFormatPhone } = await import('/auth/sign-in.js');
      return validateAndFormatPhone('98765 43210', '+91');
    });
    assert.equal(result.phone, '+919876543210');
    assert.equal(result.error, null);
  });

  await test('1.3 11-digit India number with leading 0 strips 0', async () => {
    const result = await page.evaluate(async () => {
      const { validateAndFormatPhone } = await import('/auth/sign-in.js');
      return validateAndFormatPhone('09876543210', '+91');
    });
    assert.equal(result.phone, '+919876543210');
    assert.equal(result.error, null);
  });

  await test('1.4 12-digit India number starting with 91 strips 91', async () => {
    const result = await page.evaluate(async () => {
      const { validateAndFormatPhone } = await import('/auth/sign-in.js');
      return validateAndFormatPhone('919876543210', '+91');
    });
    assert.equal(result.phone, '+919876543210');
    assert.equal(result.error, null);
  });

  await test('1.5 Full E.164 string with +91 is validated successfully', async () => {
    const result = await page.evaluate(async () => {
      const { validateAndFormatPhone } = await import('/auth/sign-in.js');
      return validateAndFormatPhone('+919876543210', '+91');
    });
    assert.equal(result.phone, '+919876543210');
    assert.equal(result.error, null);
  });

  await test('1.6 Full formatted E.164 string with spaces is validated successfully', async () => {
    const result = await page.evaluate(async () => {
      const { validateAndFormatPhone } = await import('/auth/sign-in.js');
      return validateAndFormatPhone('+91 98765 43210', '+91');
    });
    assert.equal(result.phone, '+919876543210');
    assert.equal(result.error, null);
  });

  await test('1.7 Invalid lengths return clear 10-digit validation error', async () => {
    const resultShort = await page.evaluate(async () => {
      const { validateAndFormatPhone } = await import('/auth/sign-in.js');
      return validateAndFormatPhone('98765', '+91');
    });
    assert.equal(resultShort.phone, null);
    assert.equal(resultShort.error, 'Please enter a valid 10-digit mobile number.');

    const resultLong = await page.evaluate(async () => {
      const { validateAndFormatPhone } = await import('/auth/sign-in.js');
      return validateAndFormatPhone('9876543210123', '+91');
    });
    assert.equal(resultLong.phone, null);
    assert.equal(resultLong.error, 'Please enter a valid 10-digit mobile number.');
  });

  await test('1.8 Empty or whitespace returns prompt to enter mobile number', async () => {
    const result = await page.evaluate(async () => {
      const { validateAndFormatPhone } = await import('/auth/sign-in.js');
      return validateAndFormatPhone('   ', '+91');
    });
    assert.equal(result.phone, null);
    assert.equal(result.error, 'Please enter your mobile number.');
  });

  await test('1.9 International countries like US (+1) and UK (+44) validate properly', async () => {
    const resultUS = await page.evaluate(async () => {
      const { validateAndFormatPhone } = await import('/auth/sign-in.js');
      return validateAndFormatPhone('4155552671', '+1');
    });
    assert.equal(resultUS.phone, '+14155552671');
    assert.equal(resultUS.error, null);

    const resultUK = await page.evaluate(async () => {
      const { validateAndFormatPhone } = await import('/auth/sign-in.js');
      return validateAndFormatPhone('7911123456', '+44');
    });
    assert.equal(resultUK.phone, '+447911123456');
    assert.equal(resultUK.error, null);
  });

  // ── GROUP 2: DOM & UI Integration on sign-in.html ────────────────────────────
  console.log('\n--- GROUP 2: DOM & UI Integration on sign-in.html ---');

  await test('2.1 Country selector defaults to India (+91) with clean UI elements', async () => {
    await page.goto(`${BASE_URL}/auth-ui/sign-in.html`);
    await page.waitForSelector('#phase1-signin-section');

    const countryVal = await page.$eval('#phase1-country', (el) => el.value);
    assert.equal(countryVal, '+91', 'Default country must be +91');

    const selectedText = await page.$eval('#phase1-country option:checked', (el) => el.textContent.trim());
    assert.ok(selectedText.includes('+91') && selectedText.includes('India'), 'Must display India (+91)');

    const phonePlaceholder = await page.$eval('#phase1-phone', (el) => el.placeholder);
    assert.equal(phonePlaceholder, '98765 43210', 'Placeholder must be 98765 43210');

    const hintText = await page.$eval('#phase1-phone-hint', (el) => el.textContent.trim());
    assert.equal(hintText, 'Enter 10-digit mobile number');
  });

  await test('2.2 Mobile number input has autofocus on load', async () => {
    await page.goto(`${BASE_URL}/auth-ui/sign-in.html`);
    await page.waitForSelector('#phase1-phone');

    const isFocused = await page.evaluate(() => {
      return document.activeElement === document.getElementById('phase1-phone');
    });
    assert.equal(isFocused, true, 'Phone input must have focus on load');
  });

  await test('2.3 Input auto-formats 10 digits as XXXXX XXXXX', async () => {
    await page.goto(`${BASE_URL}/auth-ui/sign-in.html`);
    await page.waitForSelector('#phase1-phone');

    await page.fill('#phase1-phone', '9876543210');
    const formatted = await page.$eval('#phase1-phone', (el) => el.value);
    assert.equal(formatted, '98765 43210', 'Digits must format as 98765 43210');
  });

  await test('2.4 Invalid phone triggers inline error and refocuses input', async () => {
    await page.goto(`${BASE_URL}/auth-ui/sign-in.html`);
    await page.waitForSelector('#phase1-phone');

    await page.fill('#phase1-phone', '12345');
    await page.click('#phase1-send-btn');

    const isErrVisible = await page.isVisible('#phase1-phone-error');
    assert.equal(isErrVisible, true, 'Error must be displayed');

    const errText = await page.textContent('#phase1-phone-error');
    assert.equal(errText, 'Please enter a valid 10-digit mobile number.');

    const isFocused = await page.evaluate(() => {
      return document.activeElement === document.getElementById('phase1-phone');
    });
    assert.equal(isFocused, true, 'Input must be refocused after error');
  });

  await test('2.5 Changing country updates placeholder, hint, and refocuses input', async () => {
    await page.goto(`${BASE_URL}/auth-ui/sign-in.html`);
    await page.waitForSelector('#phase1-country');

    await page.selectOption('#phase1-country', '+1');
    assert.equal(await page.$eval('#phase1-phone', (el) => el.placeholder), '555 123 4567');

    const isFocused = await page.evaluate(() => {
      return document.activeElement === document.getElementById('phase1-phone');
    });
    assert.equal(isFocused, true, 'Input must be refocused after country change');

    // Switch back to +91
    await page.selectOption('#phase1-country', '+91');
    assert.equal(await page.$eval('#phase1-phone', (el) => el.placeholder), '98765 43210');
    assert.equal(await page.$eval('#phase1-phone-hint', (el) => el.textContent.trim()), 'Enter 10-digit mobile number');
  });

  // ── GROUP 3: Developer / Test Wording Audit ──────────────────────────────────
  console.log('\n--- GROUP 3: Developer / Test Wording Audit ---');

  await test('3.1 Title is "Sign In · Abacus Buddy"', async () => {
    await page.goto(`${BASE_URL}/auth-ui/sign-in.html`);
    const title = await page.title();
    assert.equal(title, 'Sign In · Abacus Buddy');
  });

  await test('3.2 Badge and subtitle have no developer/test wording', async () => {
    await page.goto(`${BASE_URL}/auth-ui/sign-in.html`);
    const badgeText = await page.textContent('.phase1-badge');
    const subtitleText = await page.textContent('.phase1-subtitle');
    const footerText = await page.textContent('.phase1-footer');

    assert.equal(badgeText.trim(), 'Parent Access');
    assert.ok(!badgeText.includes('Phase 1') && !badgeText.includes('Test'));

    assert.equal(subtitleText.trim(), 'Enter your mobile number to unlock Levels 4–15');
    assert.ok(!subtitleText.includes('test surface') && !subtitleText.includes('isolated'));

    assert.ok(!footerText.includes('Test Surface') && !footerText.includes('Phase 1'));
  });

  await test('3.3 Entire rendered page contains zero forbidden phrases', async () => {
    await page.goto(`${BASE_URL}/auth-ui/sign-in.html`);
    const bodyText = await page.evaluate(() => document.body.innerText);

    const forbidden = [
      'PHASE 1',
      'Phase 1',
      'AUTH TEST',
      'Auth Test',
      'isolated test surface',
      'test surface',
    ];

    for (const phrase of forbidden) {
      assert.ok(
        !bodyText.includes(phrase),
        `Visible page body must NOT contain forbidden phrase: "${phrase}"`
      );
    }
  });

  await test('3.4 Returning from OTP screen via Back button refocuses phone input', async () => {
    await page.goto(`${BASE_URL}/auth-ui/sign-in.html`);
    await page.waitForSelector('#phase1-signin-section');

    // Simulate transition to OTP screen
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('abacus:otp-sent', {
        detail: {
          confirmationResult: { confirm: async () => {} },
          phone: '+91 98765 43210'
        }
      }));
    });

    await page.waitForSelector('#phase1-otp-section:not([hidden])');
    assert.ok(await page.isVisible('#phase1-otp-section'));

    // Click back button
    await page.click('#phase1-back-btn');
    await page.waitForSelector('#phase1-signin-section:not([hidden])');

    const isFocused = await page.evaluate(() => {
      return document.activeElement === document.getElementById('phase1-phone');
    });
    assert.equal(isFocused, true, 'Phone input must be refocused when returning via back button');
  });

  console.log(`\n========================================`);
  console.log(`All ${testsPassed} Fix #3 automated tests PASSED successfully!`);
  console.log(`========================================\n`);

} finally {
  await browser.close();
  server.close();
}
