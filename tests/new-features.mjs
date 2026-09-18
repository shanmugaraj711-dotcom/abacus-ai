// Robot playthrough of the new parts: games (3 difficulties each), tests, exams, certificates, owner console.
// Run:  node tests/new-features.mjs      (needs: npm i playwright, and a server on :8765)
import { chromium } from 'playwright';
const BASE = 'http://localhost:8765/';
const problems = [];
const log = (...a) => console.log(...a);

const helpers = () => {
  window.__fire = (el, type, y = 0) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerType: 'touch', pointerId: 1, clientY: y }));
  window.__tap = el => { __fire(el, 'pointerdown', 100); __fire(el, 'pointerup', 100); };
  window.__swipe = (el, dy) => { __fire(el, 'pointerdown', 100); __fire(el, 'pointerup', 100 + dy); };
  window.__set = n => {
    document.querySelectorAll('.abacus .ab-rod').forEach(r => {
      const i = +r.dataset.rod, d = Math.floor(n / 10 ** i) % 10;
      const up = r.querySelector('[data-upper]');
      if (up.classList.contains('on') !== d >= 5) __tap(up);
      const want = d % 5, have = r.querySelectorAll('[data-bead].on').length;
      if (want > have) __swipe(r.querySelector('[data-bead="' + (want - 1) + '"]'), -40);
      else if (want < have) __swipe(r.querySelector('[data-bead="' + want + '"]'), 40);
    });
  };
  window.__val = () => { let v = 0; document.querySelectorAll('.abacus .ab-rod').forEach(r => { v += ((r.querySelector('[data-upper]').classList.contains('on') ? 5 : 0) + r.querySelectorAll('[data-bead].on').length) * 10 ** +r.dataset.rod; }); return v; };
  window.__eq = () => { const m = (document.querySelector('[data-eq]')?.textContent || '').match(/(\d+)\s*([+−])\s*(\d+)/); return m ? (m[2] === '+' ? +m[1] + +m[3] : +m[1] - +m[3]) : null; };
};

const browser = await chromium.launch();
async function newPage(clock = true) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p.on('pageerror', e => problems.push('JS ERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts|Failed to load resource/.test(m.text())) problems.push('console: ' + m.text()); });
  await p.addInitScript(helpers);
  if (clock) await p.clock.install();
  return { ctx, p };
}
const tick = (p, ms = 400) => p.clock.runFor(ms);
const has = async (p, s) => (await p.locator(s).count()) > 0;
async function overflow(p, label) {
  const [w, inner] = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  if (w > inner + 1) problems.push(`horizontal scroll on ${label}: ${w}px`);
}
// Give the child a full profile so tests and exams are unlocked.
// It is seeded before the app boots, because the app saves its own state when a page unloads.
const SEED = () => {
  try {
    if (localStorage.getItem('seeded')) return;
    const levels = {}; for (let i = 1; i <= 12; i++) levels[i] = { stars: 3, best: 8, plays: 2 };
    localStorage.setItem('abacus-kids-v3', JSON.stringify({
      v: 3, profile: { name: 'Robo', avatar: '\u{1F98A}', experience: 'new', lang: 'en' },
      settings: { sound: false, voice: false }, lessonsDone: [1,2,3,4,5,6,7,8,9,10,11], levels, unlocked: 12,
      stats: { days: [], answered: 20, firstTry: 18, seconds: 600, byRule: { direct: [9,10], small: [5,6], big: [4,4] }, mistakes: [] },
      games: {}, exams: [], recent: [], stickersSeen: [],
    }));
    localStorage.setItem('seeded', '1');
  } catch {}
};

/* ---------- games ---------- */
const { ctx, p } = await newPage();
await p.addInitScript(SEED);
await p.goto(BASE); await p.waitForSelector('header.top'); await tick(p, 300);
await p.goto(BASE + '#/play'); await tick(p, 300); await overflow(p, 'playroom');
const gameCards = await p.locator('.game').count();
if (gameCards !== 7) problems.push(`playroom shows ${gameCards} games, expected 7`);

for (const game of ['race', 'mystery', 'match', 'flash', 'speed', 'friend', 'ladder']) {
  for (const mode of ['kid', 'star', 'master']) {
    await p.goto(BASE + '#/play'); await p.goto(BASE + '#/game/' + game); await tick(p, 300);
    if (!(await has(p, `[data-mode="${mode}"]`))) { problems.push(`${game}: no ${mode} difficulty`); continue; }
    await p.click(`[data-mode="${mode}"]`); await tick(p, 300);
    await overflow(p, `${game} ${mode}`);
    if (game === 'race') {
      await p.click('[data-go]');
      for (let i = 0; i < 4; i++) { const a = await p.evaluate(() => __eq()); await p.evaluate(n => __set(n), a); await tick(p, 100); }
      await tick(p, 61000);
      if (!(await has(p, '.done-card'))) problems.push(`${game} ${mode}: no end screen`);
    } else if (game === 'mystery') {
      for (let r = 0; r < 10; r++) { const v = await p.evaluate(() => __val()); await p.click(`[data-opt="${v}"]`); await tick(p, 1200); }
      if (!(await has(p, '.done-card'))) problems.push(`${game} ${mode}: did not finish 10 rounds`);
    } else if (game === 'match') {
      const ids = await p.$$eval('[data-card]', els => els.map(e => e.dataset.card));
      for (const n of [...new Set(ids.map(x => x.slice(1)))]) { await p.click(`[data-card="n${n}"]`); await p.click(`[data-card="b${n}"]`); await tick(p, 200); }
      await tick(p, 900);
      if (!(await has(p, '.done-card'))) problems.push(`${game} ${mode}: pairs did not finish`);
    } else if (game === 'flash' || game === 'speed') {
      await p.click('[data-go]');
      for (let r = 0; r < 10; r++) {
        await tick(p, 12000);
        if (await has(p, '.done-card')) break;
        const opts = await p.locator('[data-opt]:not([disabled])').count();
        if (!opts) { problems.push(`${game} ${mode}: no answers offered at round ${r}`); break; }
        await p.locator('[data-opt]:not([disabled])').first().click(); await tick(p, 2500);
      }
      if (!(await has(p, '.done-card'))) problems.push(`${game} ${mode}: no end screen`);
    } else if (game === 'friend') {
      const q = await p.textContent('[data-q]');
      if (!/\d/.test(q)) problems.push(`${game} ${mode}: no question shown`);
      for (let i = 0; i < 5; i++) {
        const [n, total] = (await p.textContent('[data-q]')).match(/\d+/g).map(Number);
        const want = total - n;
        if (await has(p, `[data-opt="${want}"]`)) await p.click(`[data-opt="${want}"]`);
        else { problems.push(`${game} ${mode}: right answer ${want} not offered for ${n}+?=${total}`); break; }
        await tick(p, 200);
      }
      const score = +(await p.textContent('[data-score]'));
      if (score !== 5) problems.push(`${game} ${mode}: score ${score} after 5 correct`);
      await tick(p, 61000);
      if (!(await has(p, '.done-card'))) problems.push(`${game} ${mode}: clock did not end the game`);
    } else if (game === 'ladder') {
      for (let i = 0; i < 4; i++) { const a = await p.evaluate(() => __eq()); await p.evaluate(n => __set(n), a); await p.click('[data-check]'); await tick(p, 300); }
      const rung = +(await p.textContent('[data-rung]'));
      if (rung !== 5) problems.push(`${game} ${mode}: rung ${rung} after 4 correct`);
      await tick(p, 40000); // run out the clock 3 times
      if (!(await has(p, '.done-card'))) problems.push(`${game} ${mode}: lives never ran out`);
    }
  }
}
log('games checked:', gameCards);

/* ---------- tests, exams, certificate ---------- */
await p.goto(BASE + '#/tests'); await tick(p, 400); await overflow(p, 'test centre');
const examCards = await p.locator('.exam').count();
if (examCards < 13) problems.push(`test centre shows ${examCards} items, expected 12 level tests + 3 exams`);

// level test: answer everything right -> pass -> certificate
await p.goto(BASE + '#/exam/test1'); await tick(p, 400);
for (let i = 0; i < 20; i++) { const a = await p.evaluate(() => __eq()); await p.evaluate(n => __set(n), a); await p.click('[data-lock]'); await tick(p, 900); }
if (!(await has(p, '.done-card'))) problems.push('level test did not finish');
const pctText = await p.textContent('.score-ring b').catch(() => '');
if (pctText !== '100%') problems.push(`level test score was ${pctText}, expected 100%`);
await overflow(p, 'test result');
if (!(await has(p, 'a[href="#/certificate/0"]'))) problems.push('passing a test gave no certificate');
await p.goto(BASE + '#/certificate/0'); await tick(p, 400); await overflow(p, 'certificate');
const certName = await p.textContent('.cert-name').catch(() => '');
if (certName.trim() !== 'Robo') problems.push(`certificate shows "${certName}" instead of the child's name`);

// exam clock must end the exam
await p.goto(BASE + '#/exam/grand'); await tick(p, 400);
await tick(p, 8 * 60 * 1000 + 2000);
if (!(await has(p, '.done-card'))) problems.push('grand exam clock did not end the exam');

// mental maths exam runs with no abacus
await p.goto(BASE + '#/exam/mental'); await tick(p, 600);
await tick(p, 6000);
if (!(await has(p, '[data-opt]'))) problems.push('mental exam offered no answers');
if (await p.locator('[data-abacus] .abacus').isVisible()) problems.push('mental exam is showing the abacus');

// results reach the grown-ups page
await p.goto(BASE + '#/parents'); await tick(p, 300);
const [x, y] = (await p.textContent('.lead')).match(/\d+/g).map(Number);
await p.click(`[data-gate="${x * y}"]`); await tick(p, 300);
if (!(await p.locator('.card', { hasText: 'Tests & exams' }).count())) problems.push('exam results missing from grown-ups page');
await overflow(p, 'grown-ups');

/* ---------- owner console ---------- */
await p.goto(BASE + '#/admin'); await tick(p, 400);
await p.fill('#pin', '1111'); await p.click('#pinGo'); await tick(p, 200);
if (await has(p, '[data-feature]')) problems.push('owner console opened with the wrong PIN');
await p.fill('#pin', '2580'); await p.click('#pinGo'); await tick(p, 400);
if (!(await has(p, '[data-feature="tests"]'))) problems.push('owner console did not open with the right PIN');
await overflow(p, 'owner console');
// pause a game and an area, then check children cannot see or reach them
await p.uncheck('[data-feature="gameLadder"]'); await tick(p, 200);
await p.uncheck('[data-feature="tests"]'); await p.uncheck('[data-feature="exams"]'); await tick(p, 200);
await p.uncheck('[data-feature="freePlay"]'); await tick(p, 200);
await p.goto(BASE + '#/play'); await tick(p, 400);
if ((await p.locator('.game').count()) !== 6) problems.push('paused game still shows in the playroom');
await p.goto(BASE + '#/game/ladder'); await tick(p, 300);
if (await has(p, '[data-mode]')) problems.push('paused game can still be opened by its link');
await p.goto(BASE + '#/home'); await tick(p, 300);
if (await has(p, '.tile.tests')) problems.push('paused Test Centre still shows on home');
if (await has(p, '.tile.free')) problems.push('paused Free Play still shows on home');
await p.goto(BASE + '#/tests'); await tick(p, 300);
if (await has(p, '.exams')) problems.push('paused Test Centre still opens by its link');
// switch it all back on
await p.goto(BASE + '#/admin'); await tick(p, 400);
await p.check('[data-feature="gameLadder"]'); await p.check('[data-feature="tests"]'); await p.check('[data-feature="exams"]'); await p.check('[data-feature="freePlay"]'); await tick(p, 200);
const json = await p.inputValue('#cfgJson');
try { const parsed = JSON.parse(json); if (parsed.features.gameLadder !== true) problems.push('config.json text does not match the switches'); }
catch { problems.push('config.json text is not valid JSON'); }
await p.goto(BASE + '#/home'); await tick(p, 300);
if (!(await has(p, '.tile.tests'))) problems.push('switching Test Centre back on did not restore it');

await ctx.close();
await browser.close();
console.log('\n' + (problems.length ? 'PROBLEMS:\n' + [...new Set(problems)].join('\n') : 'NO PROBLEMS FOUND'));
