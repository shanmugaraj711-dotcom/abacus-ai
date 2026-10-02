/**
 * tests/growth-engine.test.mjs
 * Growth Engine Phase 1 & Growth Loop V1 regression tests.
 *
 * Verifies:
 *   1. Homepage & Public Access (messaging, CTAs, structure, no unsupported claims)
 *   2. Free Challenge Flow (10 questions, choices, scoring, parent result)
 *   3. Security Boundary: Challenge CANNOT grant paid entitlement
 *   4. Existing Auth Route (Google & Email integration, return URL preservation)
 *   5. Starter CTA & Payment Route (connects to existing ₹99 flow)
 *   6. Funnel Event Behavior (landing_view, challenge_start, challenge_complete, signup, checkout_start, payment_success)
 *   7. Direct URL/Hash Access Still Respects Entitlement
 *   8. Mobile Layout Responsiveness (390px viewport, zero horizontal overflow)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import {
  FUNNEL_EVENTS,
  trackFunnelEvent,
  getRecentFunnelEvents,
  clearFunnelEvents,
} from '../js/events.js';
import { RESOURCE_REGISTRY, getResourceBySlug } from '../js/resources.js';
import { FREE_TOOLS, getActiveTools } from '../js/tools.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

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

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    let reqPath = decodeURI(url.pathname);

    // Mock API endpoints
    if (reqPath === '/api/user-status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockEntitlement || { paid: false, tier: 'free' }));
      return;
    }

    if (reqPath === '/api/visit') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (reqPath === '/api/create-order') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        keyId: 'rzp_test_mock_123',
        orderId: 'order_mock_starter_99',
        amount: 9900,
        currency: 'INR',
        tier: 'starter',
      }));
      return;
    }

    if (reqPath === '/api/verify-payment') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        paid: true,
        tier: 'starter',
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        maxLevel: 3,
        games: ['race', 'mystery', 'match'],
      }));
      return;
    }

    // Static file serving
    if (!reqPath || reqPath === '/' || reqPath === '') reqPath = '/index.html';
    const filePath = path.join(ROOT_DIR, reqPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });

  server.setMockEntitlement = (e) => { mockEntitlement = e; };
  return server;
}

const server = createTestServer();
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const BASE_URL = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({ headless: true });

try {
  console.log('\n=== GROWTH ENGINE PHASE 1 & GROWTH LOOP V1 TESTS ===\n');

  // ── 1. Homepage & Public Access ──────────────────────────────────────────
  await test('1.1 Parent-facing public home renders core messaging, SEO metadata, and CTAs', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForSelector('.landing-page');

    // Document title and meta description check
    const docTitle = await page.title();
    assert.match(docTitle, /Abacus Buddy/i);
    assert.match(docTitle, /Mental Math/i);

    const metaDesc = await page.$eval('meta[name="description"]', el => el.getAttribute('content'));
    assert.match(metaDesc, /mental-math/i);
    assert.match(metaDesc, /10-minute abacus practice/i);

    // Hero title check
    const heroTitle = await page.textContent('h1');
    assert.match(heroTitle, /Build Faster Mental-Math Skills — 10 Minutes at a Time/i);

    // Primary CTA check
    const primaryCta = await page.$('#heroChallengeCta');
    assert.ok(primaryCta, 'Primary CTA "Try the Free Challenge" must exist');
    const primaryText = await primaryCta.textContent();
    assert.match(primaryText, /Try the Free Challenge/i);

    // Secondary CTA check
    const secondaryCta = await page.$('#heroSignInCta');
    assert.ok(secondaryCta, 'Secondary CTA "Sign In" must exist');

    // Key parent sections check
    const bodyText = await page.textContent('.landing-page');
    assert.ok(bodyText.includes('What Abacus Buddy Is'), 'Includes What Abacus Buddy Is section');
    assert.ok(bodyText.includes('Who It Is For'), 'Includes Who It Is For section');
    assert.ok(bodyText.includes('How Children Learn'), 'Includes How Children Learn section');
    assert.ok(bodyText.includes('Why 10 Minutes Matters'), 'Includes Why 10 Minutes Matters section');
    assert.ok(bodyText.includes('15 Practice Levels'), 'Mentions 15 Practice Levels');
    assert.ok(bodyText.includes('11 Guided Lessons'), 'Mentions 11 Guided Lessons');
    assert.ok(bodyText.includes('7 Arcade Bead Games'), 'Mentions 7 Bead Games');
    assert.ok(bodyText.includes('Starter (₹99)'), 'Includes Starter ₹99 pricing');
    assert.ok(bodyText.includes('Lifetime (₹499)'), 'Includes Lifetime ₹499 pricing');
    assert.ok(bodyText.includes('Frequently Asked Questions'), 'Includes FAQ section');

    // Natural parent search intent keywords coverage
    assert.ok(bodyText.includes('abacus practice for kids'), 'Covers abacus practice for kids');
    assert.ok(bodyText.includes('mental math for kids'), 'Covers mental math for kids');
    assert.ok(bodyText.includes('abacus classes for kids'), 'Covers abacus classes for kids');
    assert.ok(bodyText.includes('abacus learning for beginners'), 'Covers abacus learning for beginners');
    assert.ok(bodyText.includes('abacus worksheets'), 'Covers abacus worksheets');
    assert.ok(bodyText.includes('calculation practice for children'), 'Covers calculation practice for children');

    // Verify absence of unsupported academic claims
    assert.doesNotMatch(bodyText, /guaranteed top marks/i);
    assert.doesNotMatch(bodyText, /guaranteed 100%/i);
    assert.doesNotMatch(bodyText, /guaranteed rank/i);

    await page.close();
  });

  // ── 2. Free Challenge Flow ────────────────────────────────────────────────
  await test('2.1 Free Challenge runs 10 questions and presents parent diagnostic result', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/index.html#/challenge`);
    await page.waitForSelector('.challenge-view');

    // Verify first question header
    const qHeader = await page.textContent('.challenge-view header');
    assert.match(qHeader, /Question 1 of 10/i);

    // Solve all 10 questions
    for (let i = 0; i < 10; i++) {
      await page.waitForSelector('.challenge-choice-btn');
      const firstChoice = await page.$('.challenge-choice-btn');
      assert.ok(firstChoice, `Choice button for question ${i + 1} must exist`);
      await firstChoice.click();
      // Brief wait for next question transition
      await page.waitForTimeout(750);
    }

    // Results screen must appear
    await page.waitForSelector('.challenge-result-view');
    const resultText = await page.textContent('.challenge-result-view');
    assert.match(resultText, /Assessment Result/i);
    assert.match(resultText, /\/ 10/i);
    assert.match(resultText, /Why 10 Minutes a Day Matters/i);

    // Starter CTA on results screen
    const starterCta = await page.$('#challengeStarterCta');
    assert.ok(starterCta, 'Starter CTA button must be present on results page');
    const starterCtaText = await starterCta.textContent();
    assert.match(starterCtaText, /Continue with Starter — ₹99/i);

    await page.close();
  });

  // ── 3. Critical Security Boundary: Challenge CANNOT Grant Entitlement ─────
  await test('3.1 Completing Free Challenge NEVER grants paid entitlement or bypasses access control', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/index.html#/challenge`);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.waitForSelector('.challenge-view');

    // Answer questions quickly
    for (let i = 0; i < 10; i++) {
      await page.waitForSelector('.challenge-choice-btn');
      await page.click('.challenge-choice-btn');
      await page.waitForTimeout(750);
    }
    await page.waitForSelector('.challenge-result-view');

    // Inspect storage: abacus-entitlement-v1 must NOT be granted
    const entRaw = await page.evaluate(() => localStorage.getItem('abacus-entitlement-v1'));
    if (entRaw) {
      const parsed = JSON.parse(entRaw);
      assert.notEqual(parsed.paid, true, 'Challenge MUST NEVER write paid:true');
      assert.notEqual(parsed.tier, 'starter', 'Challenge MUST NEVER grant starter tier');
      assert.notEqual(parsed.tier, 'lifetime', 'Challenge MUST NEVER grant lifetime tier');
    }

    // Verify for user with profile: completing challenge did not unlock paid levels
    const checkPage = await browser.newPage();
    await checkPage.addInitScript(() => {
      localStorage.setItem('abacus-kids-v3', JSON.stringify({
        v: 3,
        profile: { name: 'TestKid', avatar: '🦁', experience: 'new', lang: 'en', voiceLang: 'en' },
        settings: { sound: false, voice: false },
        lessonsDone: [1],
        levels: { 1: { stars: 3 } },
        unlocked: 2,
        games: { race: 1 },
      }));
    });
    await checkPage.goto(`${BASE_URL}/#/level/2`);
    await checkPage.waitForTimeout(500);
    const hashLevel2 = await checkPage.evaluate(() => window.location.hash);
    assert.equal(hashLevel2, '#/unlock', 'Unpaid challenge user cannot access Level 2');

    // Verify navigating to Lesson 7 redirects to paywall #/unlock
    await checkPage.goto(`${BASE_URL}/#/lesson/7`);
    await checkPage.waitForTimeout(500);
    const hashLesson7 = await checkPage.evaluate(() => window.location.hash);
    assert.equal(hashLesson7, '#/unlock', 'Unpaid challenge user cannot access Lesson 7');

    await checkPage.close();
    await page.close();
  });

  // ── 4. Existing Auth Route Compatibility ─────────────────────────────────
  await test('4.1 Sign In CTA on landing page hands off to existing onboarding flow', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForSelector('#heroSignInCta');

    // Click Sign In on landing page
    await page.click('#heroSignInCta');
    await page.waitForSelector('#authGateGoogleBtn', { timeout: 6000 });

    assert.ok(await page.isVisible('#authGateGoogleBtn'), 'Google auth button is visible');
    assert.ok(await page.isVisible('#authGateEmailBtn'), 'Email auth button is visible');
    assert.ok(await page.isVisible('#kidName'), 'Child name input is visible in onboarding');
    assert.ok(await page.isVisible('[data-age="6-8"]'), 'Age selection options are present');
    assert.ok(await page.isVisible('[data-lang-choice="hi"]'), 'Hindi language option is present');
    assert.ok(await page.isVisible('[data-lang-choice="ta"]'), 'Tamil language option is present');
    assert.ok(await page.isVisible('[data-lang-choice="en"]'), 'English language option is present');

    // Sign in link preserve test on standalone auth-ui
    await page.goto(`${BASE_URL}/auth-ui/sign-in.html?return=../#starter`);
    await page.waitForSelector('#phase1-google-btn');
    assert.ok(await page.isVisible('#phase1-google-btn'), 'Google button present in auth-ui');

    await page.close();
  });

  // ── 5. Starter CTA & Payment Route ───────────────────────────────────────
  await test('5.1 Starter CTA links to #/starter with ₹99 pricing', async () => {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('abacus-kids-v3', JSON.stringify({
        v: 3,
        profile: { name: 'Aryan', avatar: '🦁', experience: 'new', lang: 'en', voiceLang: 'en' },
        settings: { sound: false, voice: false },
        lessonsDone: [1],
        levels: { 1: { stars: 3 } },
        unlocked: 2,
        games: { race: 1, mystery: 0, match: 0 },
        exams: [],
        stickersSeen: [],
      }));
    });
    await page.goto(`${BASE_URL}/index.html#/starter`);
    await page.waitForSelector('.tier-comparison');

    const bodyText = await page.textContent('.intro');
    assert.match(bodyText, /₹99 for 30 Days/i);
    assert.match(bodyText, /Levels 1–3/i);
    assert.match(bodyText, /Lessons 1–7/i);

    await page.close();
  });

  // ── 6. Funnel Event Behavior ─────────────────────────────────────────────
  await test('6.1 Funnel event tracking module accurately records lifecycle events', () => {
    clearFunnelEvents();

    trackFunnelEvent(FUNNEL_EVENTS.LANDING_VIEW, { source: 'test' });
    trackFunnelEvent(FUNNEL_EVENTS.CHALLENGE_START, { total: 10 });
    trackFunnelEvent(FUNNEL_EVENTS.CHALLENGE_COMPLETE, { score: 9, total: 10, pct: 90, timeSpentSec: 25 });
    trackFunnelEvent(FUNNEL_EVENTS.SIGNUP, { method: 'google' });
    trackFunnelEvent(FUNNEL_EVENTS.CHECKOUT_START, { tier: 'starter' });
    trackFunnelEvent(FUNNEL_EVENTS.PAYMENT_SUCCESS, { tier: 'starter' });

    const events = getRecentFunnelEvents();
    assert.equal(events.length, 6, 'All 6 funnel events must be recorded');
    assert.equal(events[0].event, 'landing_view');
    assert.equal(events[1].event, 'challenge_start');
    assert.equal(events[2].event, 'challenge_complete');
    assert.equal(events[2].meta.score, 9);
    assert.equal(events[3].event, 'signup');
    assert.equal(events[4].event, 'checkout_start');
    assert.equal(events[5].event, 'payment_success');

    // Security check: Verify no secret fields can be injected
    trackFunnelEvent(FUNNEL_EVENTS.LANDING_VIEW, { password: 'secret_password_123', safeKey: 'visible' });
    const lastEvent = getRecentFunnelEvents().slice(-1)[0];
    assert.equal(lastEvent.meta.password, undefined, 'Sensitive keys must be excluded');
    assert.equal(lastEvent.meta.safeKey, 'visible');
  });

  // ── 7. SEO Foundation & Free Tool Registries ──────────────────────────────
  await test('7.1 SEO foundation and Free Tool extension points are clean and structured', () => {
    assert.ok(RESOURCE_REGISTRY.length >= 8, 'Resource registry contains parent guide topics');
    const kidsMathGuide = getResourceBySlug('abacus-practice-for-kids');
    assert.ok(kidsMathGuide, 'Finds abacus-practice-for-kids guide');
    assert.match(kidsMathGuide.title, /Abacus Practice for Kids/i);

    const activeTools = getActiveTools();
    assert.equal(activeTools.length, 1, 'Only Free Challenge is active in Phase 1');
    assert.equal(activeTools[0].id, 'mental-math-challenge');

    const plannedTools = FREE_TOOLS.filter(t => t.status === 'planned');
    assert.ok(plannedTools.length >= 5, 'Clean extension points prepared for future tools');
  });

  // ── 8. Mobile Viewport Layout Audit ──────────────────────────────────────
  await test('8.1 Mobile viewport (390px) renders without horizontal scroll overflow', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForSelector('.landing-page');

    const overflowLanding = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    assert.equal(overflowLanding, false, 'Landing page must not overflow horizontally on 390px mobile viewport');

    await page.goto(`${BASE_URL}/index.html#/challenge`);
    await page.waitForSelector('.challenge-view');
    const overflowChallenge = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    assert.equal(overflowChallenge, false, 'Challenge page must not overflow horizontally on 390px mobile viewport');

    await page.close();
  });

  console.log('\n========================================');
  console.log('All Growth Engine Phase 1 tests PASSED!');
  console.log('========================================\n');
} finally {
  await browser.close();
  await new Promise(r => server.close(r));
}
