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

// Browser helper injected into page for pointer-event bead interaction
const abacusHelpers = () => {
  window.__fire = (el, type, y = 0) =>
    el.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerType: 'touch', pointerId: 1, clientY: y }));
  window.__tap = el => {
    __fire(el, 'pointerdown', 100);
    __fire(el, 'pointerup', 100);
  };
  window.__swipe = (el, dy) => {
    __fire(el, 'pointerdown', 100);
    __fire(el, 'pointerup', 100 + dy);
  };
  window.__set = n => {
    document.querySelectorAll('.abacus .ab-rod').forEach(r => {
      const i = +r.dataset.rod, d = Math.floor(n / 10 ** i) % 10;
      const up = r.querySelector('[data-upper]');
      if (up && (up.classList.contains('on') !== (d >= 5))) __tap(up);
      const want = d % 5;
      const have = r.querySelectorAll('[data-bead].on').length;
      if (want > have) __swipe(r.querySelector('[data-bead="' + (want - 1) + '"]'), -40);
      else if (want < have) __swipe(r.querySelector('[data-bead="' + want + '"]'), 40);
    });
  };
  window.__val = () => {
    let v = 0;
    document.querySelectorAll('.abacus .ab-rod').forEach(r => {
      v += ((r.querySelector('[data-upper]').classList.contains('on') ? 5 : 0) +
        r.querySelectorAll('[data-bead].on').length) * 10 ** +r.dataset.rod;
    });
    return v;
  };
  window.__eq = () => {
    const m = (document.querySelector('[data-eq], .equation')?.textContent || '').match(/(\d+)\s*([+−])\s*(\d+)/);
    return m ? (m[2] === '+' ? +m[1] + +m[3] : +m[1] - +m[3]) : null;
  };
};

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

const server = createTestServer();
await new Promise((resolve) => {
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    console.log(`Test server running on http://127.0.0.1:${port}`);
    resolve();
  });
});

const port = server.address().port;
const BASE_URL = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ headless: true });

async function createFreshSession(profileState = {}, isPaid = false) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  if (isPaid) {
    await page.route('**/payments.js', async (route) => {
      const resp = await route.fetch();
      let body = await resp.text();
      body = body.replace('export const isPaid = () => paid;', 'export const isPaid = () => true;');
      route.fulfill({ response: resp, body });
    });
  }
  await page.addInitScript(abacusHelpers);
  await page.addInitScript((profileState) => {
    localStorage.clear();
    sessionStorage.clear();
    const st = {
      v: 3,
      profile: { name: 'Aarav', avatar: '🦊', experience: 'new', lang: 'en' },
      settings: { sound: false, voice: false },
      lessonsDone: [1, 2, 3, 4, 5, 6, 7, 8],
      levels: { 1: { stars: 3 }, 2: { stars: 3 } },
      unlocked: 3,
      stats: { days: [], answered: 24, firstTry: 20, seconds: 300, byRule: {}, mistakes: [] },
      games: {}, exams: [], recent: [], stickersSeen: [],
      ...profileState,
    };
    localStorage.setItem('abacus-kids-v3', JSON.stringify(st));
  }, profileState);
  return { context, page };
}

async function playAllSums(p, { makeMistakes = false } = {}) {
  await p.waitForSelector('[data-eq]');
  for (let k = 0; k < 8; k++) {
    const ans = await p.evaluate(() => __eq());
    if (makeMistakes) {
      await p.evaluate(target => __set(target === 0 ? 1 : target - 1), ans);
      await p.click('[data-check]');
      await p.waitForTimeout(200);
    }
    await p.evaluate(target => __set(target), ans);
    await p.click('[data-check]');
    await p.waitForTimeout(1400);
  }
}

try {
  console.log('\n--- GROUP 1: Level 3 Completion Celebration & Transition ---');

  const session1 = await createFreshSession({ unlocked: 3 });

  await test('1.1 Level 3 completion shows celebration, Continue to Level 4 as primary, and demotes Play Again', async () => {
    await session1.page.goto(`${BASE_URL}/#/level/3`);
    await session1.page.waitForSelector('[data-start]');
    await session1.page.click('[data-start]');

    // Solve all 8 problems correctly on first try via actual bead interaction
    await playAllSums(session1.page);

    // Done-card must be visible
    await session1.page.waitForSelector('.done-card');

    // 1. Celebration elements exist
    const starsCount = await session1.page.locator('.big-stars .stars i.on').count();
    assert.ok(starsCount >= 1, `Stars earned should be >= 1, got ${starsCount}`);
    const leadText = await session1.page.textContent('.done-card .lead');
    assert.ok(leadText.includes('right on the first try'), 'First try score must be displayed');

    // 2. Unlock milestone message must celebrate Level 3 and announce Level 4
    const unlockNote = await session1.page.textContent('.done-card .unlock');
    assert.ok(unlockNote.includes('Level 3 complete!'), 'Must show Level 3 complete celebration');
    assert.ok(unlockNote.includes('Ready for Level 4?'), 'Must prompt for Level 4');
    assert.ok(!unlockNote.includes('is open!'), 'Must NOT falsely claim Level 4 is open before payment');

    // 3. Primary action must be Continue to Level 4 -> #/unlock
    const primaryBtn = session1.page.locator('.done-card .stack .btn.primary');
    const primaryHref = await primaryBtn.getAttribute('href');
    const primaryText = await primaryBtn.textContent();
    assert.equal(primaryHref, '#/unlock', 'Primary button must link to #/unlock');
    assert.ok(primaryText.includes('Continue to Level 4'), `Primary text must say Continue to Level 4, got: ${primaryText}`);

    // 4. "Play this level again" must NOT be the primary button
    const againBtn = session1.page.locator('.done-card .stack [data-again]');
    const againClass = await againBtn.getAttribute('class');
    assert.ok(!againClass.includes('primary'), 'Play again button must NOT have primary class');

    // 5. State unlocked must now be 4
    const savedUnlocked = await session1.page.evaluate(() => JSON.parse(localStorage.getItem('abacus-kids-v3')).unlocked);
    assert.equal(savedUnlocked, 4, 'state.unlocked should be 4 after passing Level 3');
  });

  await test('1.2 Clicking Continue to Level 4 navigates to proper Level 4 unlock flow (#/unlock)', async () => {
    // Click the primary continue button on the done-card from test 1.1
    await session1.page.click('.done-card .stack .btn.primary');
    await session1.page.waitForTimeout(300);

    // URL should be #/unlock
    const url = session1.page.url();
    assert.ok(url.endsWith('#/unlock'), `URL should end with #/unlock, got: ${url}`);

    // Verify unlock screen content
    const pageTitle = await session1.page.textContent('.top-title');
    assert.equal(pageTitle, 'Unlock Levels 4–15');

    const heading = await session1.page.textContent('.card.intro .display');
    assert.equal(heading, 'Levels 4–15');

    const lead = await session1.page.textContent('.card.intro .lead');
    assert.ok(lead.includes('₹499'), 'Must show ₹499 price');

    // Sign in to unlock button exists
    const signinBtn = session1.page.locator('.card.intro .stack .btn.primary');
    assert.ok((await signinBtn.textContent()).includes('Sign in to unlock'));

    await session1.context.close();
  });

  console.log('\n--- GROUP 2: Level 3 Replay and Failure Edge Cases ---');

  await test('2.1 Replaying Level 3 after already completing it still provides Continue to Level 4 as primary', async () => {
    const session = await createFreshSession({
      unlocked: 4,
      levels: { 1: { stars: 3 }, 2: { stars: 3 }, 3: { stars: 2, best: 6, plays: 1 } },
    });

    await session.page.goto(`${BASE_URL}/#/level/3`);
    await session.page.waitForSelector('[data-start]');
    await session.page.click('[data-start]');

    await playAllSums(session.page);

    await session.page.waitForSelector('.done-card');

    // Even on replay, primary action must still lead to #/unlock
    const primaryBtn = session.page.locator('.done-card .stack .btn.primary');
    assert.equal(await primaryBtn.getAttribute('href'), '#/unlock');
    assert.ok((await primaryBtn.textContent()).includes('Continue to Level 4'));

    const againBtn = session.page.locator('.done-card .stack [data-again]');
    assert.ok(!(await againBtn.getAttribute('class')).includes('primary'));
    await session.context.close();
  });

  await test('2.2 Level 3 with 0 stars (failed) keeps Play Again as primary', async () => {
    const session = await createFreshSession({
      unlocked: 3,
      levels: { 1: { stars: 3 }, 2: { stars: 3 }, 3: { stars: 0, best: 0, plays: 0 } },
    });

    await session.page.goto(`${BASE_URL}/#/level/3`);
    await session.page.waitForSelector('[data-start]');
    await session.page.click('[data-start]');

    // Deliberately make mistakes so firstTry remains 0 (0 stars)
    await playAllSums(session.page, { makeMistakes: true });

    await session.page.waitForSelector('.done-card');

    // With 0 stars, Continue to Level 4 must NOT be present
    const continueBtn = session.page.locator('.done-card .stack a[href="#/unlock"]');
    assert.equal(await continueBtn.count(), 0, 'Continue to Level 4 must not appear on 0 stars');

    // Play again must be primary
    const primaryBtn = session.page.locator('.done-card .stack .btn.primary');
    assert.ok((await primaryBtn.textContent()).includes('Play this level again'));
    await session.context.close();
  });

  console.log('\n--- GROUP 3: Navigation & Practice Map Integration ---');

  await test('3.1 Home screen mission recommends Unlock Level 4 after Level 3 is completed', async () => {
    const session = await createFreshSession({
      unlocked: 4,
      levels: { 1: { stars: 3 }, 2: { stars: 3 }, 3: { stars: 3 } },
    });

    await session.page.goto(`${BASE_URL}/#/home`);
    await session.page.waitForSelector('.mission');

    const missionHref = await session.page.locator('.mission').getAttribute('href');
    const missionText = await session.page.textContent('.mission');

    assert.equal(missionHref, '#/unlock', 'Mission card must point to #/unlock');
    assert.ok(missionText.includes('Unlock Level 4'), 'Mission text must prompt to Unlock Level 4');
    await session.context.close();
  });

  await test('3.2 Practice map shows Level 4 paywalled with #/unlock link', async () => {
    const session = await createFreshSession({ unlocked: 4 });

    await session.page.goto(`${BASE_URL}/#/practice`);
    await session.page.waitForSelector('.levels');

    const lv4 = session.page.locator('.levels a.level').nth(3); // Level 4 (0-indexed 3)
    const lv4Href = await lv4.getAttribute('href');
    const lv4Text = await lv4.textContent();

    assert.equal(lv4Href, '#/unlock', 'Level 4 in practice map must link to #/unlock');
    assert.ok(lv4Text.includes('₹499 unlock'), 'Level 4 must show ₹499 unlock badge');
    await session.context.close();
  });

  await test('3.3 Direct navigation to #/level/4 redirects to #/unlock when unpaid', async () => {
    const session = await createFreshSession({ unlocked: 4 });

    await session.page.goto(`${BASE_URL}/#/level/4`);
    await session.page.waitForTimeout(300);

    assert.ok(session.page.url().endsWith('#/unlock'), 'Must redirect to #/unlock');
    assert.equal(await session.page.textContent('.top-title'), 'Unlock Levels 4–15');
    await session.context.close();
  });

  await test('3.4 For paid users, Level 3 completion shows Next level -> #/level/4', async () => {
    const session = await createFreshSession({ unlocked: 3 }, true); // isPaid = true

    await session.page.goto(`${BASE_URL}/#/level/3`);
    await session.page.waitForSelector('[data-start]');
    await session.page.click('[data-start]');

    await playAllSums(session.page);

    await session.page.waitForSelector('.done-card');

    // For paid user, primary button is Next level -> #/level/4
    const primaryBtn = session.page.locator('.done-card .stack .btn.primary');
    assert.equal(await primaryBtn.getAttribute('href'), '#/level/4');
    assert.ok((await primaryBtn.textContent()).includes('Next level'));
    await session.context.close();
  });

  console.log(`\n========================================`);
  console.log(`All ${testsPassed} Fix #2 automated tests PASSED successfully!`);
  console.log(`========================================\n`);

} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
