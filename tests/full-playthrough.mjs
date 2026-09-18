import { chromium } from 'playwright';
const BASE = 'http://localhost:8765/';
const browser = await chromium.launch();
const problems = [];
const log = (...a) => console.log(...a);
const ONLY = process.argv[2]; // optional: 'main390' | 'extra'

const helpers = () => {
  window.__fire = (el, type, y = 0) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerType: 'touch', pointerId: 1, clientY: y }));
  window.__tap = el => { __fire(el, 'pointerdown', 100); __fire(el, 'pointerup', 100); };
  window.__swipe = (el, dy) => { __fire(el, 'pointerdown', 100); __fire(el, 'pointerup', 100 + dy); };
  window.__set = n => {
    const ab = document.querySelector('.abacus');
    ab.querySelectorAll('.ab-rod').forEach(r => {
      const i = +r.dataset.rod, d = Math.floor(n / 10 ** i) % 10;
      const up = r.querySelector('[data-upper]');
      if (up.classList.contains('on') !== d >= 5) __tap(up);
      const want = d % 5, have = r.querySelectorAll('[data-bead].on').length;
      if (want > have) __swipe(r.querySelector('[data-bead="' + (want - 1) + '"]'), -40);
      else if (want < have) __swipe(r.querySelector('[data-bead="' + want + '"]'), 40);
    });
  };
  window.__val = () => { let v = 0; document.querySelectorAll('.abacus .ab-rod').forEach(r => { v += ((r.querySelector('[data-upper]').classList.contains('on') ? 5 : 0) + r.querySelectorAll('[data-bead].on').length) * 10 ** +r.dataset.rod; }); return v; };
  window.__eq = () => { const m = (document.querySelector('[data-eq], .equation')?.textContent || '').match(/(\d+)\s*([+−])\s*(\d+)/); return m ? (m[2] === '+' ? +m[1] + +m[3] : +m[1] - +m[3]) : null; };
};

async function newPage(vp, { blockStorage = false } = {}) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p.on('pageerror', e => problems.push(`[${vp.width}] JS ERROR: ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts|Failed to load resource/.test(m.text())) problems.push(`[${vp.width}] console: ${m.text()}`); });
  if (blockStorage) await p.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await p.addInitScript(helpers);
  await p.clock.install();
  return { ctx, p };
}
const tick = (p, ms = 400) => p.clock.runFor(ms);
async function overflow(p, label) {
  const w = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  if (w[0] > w[1] + 1) problems.push(`[${w[1]}] horizontal scroll on ${label}: ${w[0]}px`);
}
async function visible(p, sel, max = 40) { for (let i = 0; i < max; i++) { if (await p.locator(sel).first().isVisible()) return true; await tick(p, 700); } return false; }

async function onboard(p, exp = 'new') {
  await p.goto(BASE); await tick(p, 300);
  await p.fill('#kidName', 'Test Kid'); await p.click('[data-avatar="🦊"]'); await p.click(`[data-exp="${exp}"]`); await p.click('#start'); await p.waitForSelector('header.top'); await tick(p, 300);
}
const has = async (p, s) => (await p.locator(s).count()) > 0;

async function playLesson(p, id, vp) {
  await p.goto(BASE + '#/lesson/' + id); await tick(p, 300);
  for (let guard = 0; guard < 20; guard++) {
    if (await p.locator('.done-card').isVisible()) return true;
    await overflow(p, 'lesson ' + id);
    if (await has(p, '.goal')) { const t = +(await p.textContent('.goal b')); await p.evaluate(n => __set(n), t); }
    else if (await has(p, '[data-play]')) { await p.click('[data-play]'); }
    else if (await has(p, '[data-check]')) { const a = await p.evaluate(() => __eq()); await p.evaluate(n => __set(n), a); await p.click('[data-check]'); }
    else if (await has(p, '[data-q]')) {
      for (let q = 0; q < 3; q++) {
        const txt = await p.textContent('[data-q]'); const m = txt.match(/(Big|Little) Friend of (\d+)/); if (!m) break;
        const right = (m[1] === 'Big' ? 10 : 5) - +m[2];
        const btn = p.locator(`[data-opt="${right}"]:not([disabled])`);
        if (!(await btn.count())) { problems.push(`lesson ${id}: right answer ${right} missing from options`); break; }
        await btn.click(); await tick(p, 1300);
        if (await p.locator('[data-next]').isVisible()) break;
      }
    } else if (await has(p, '[data-opt]')) {
      const v = await p.evaluate(() => __val()); await p.click(`[data-opt="${v}"]`);
    }
    if (!(await visible(p, '[data-next]'))) { problems.push(`[${vp.width}] lesson ${id}: step ${guard} never showed Next`); await p.screenshot({ path: `./stuck-l${id}.png` }); return false; }
    await p.click('[data-next]'); await tick(p, 300);
  }
  return false;
}

async function playLevel(p, id, vp, mistakes = false) {
  await p.goto(BASE + '#/level/' + id); await tick(p, 300);
  if (!(await has(p, '[data-start]'))) { problems.push(`[${vp.width}] level ${id} not startable`); return; }
  await p.click('[data-start]'); await tick(p, 300);
  for (let k = 0; k < 8; k++) {
    if (k === 0) await overflow(p, 'level ' + id);
    const a = await p.evaluate(() => __eq());
    if (mistakes && k < 2) {
      for (let w = 0; w < 3; w++) { await p.evaluate(n => __set(n), a === 0 ? 1 : a - 1); await p.click('[data-check]'); await tick(p, 200); }
      for (let i = 0; i < 40 && await p.locator('[data-check]').isDisabled(); i++) await tick(p, 800);
    }
    await p.evaluate(n => __set(n), a);
    const shown = await p.evaluate(() => __val());
    if (shown !== a) problems.push(`[${vp.width}] level ${id}: bead setting failed want ${a} got ${shown}`);
    await p.click('[data-check]'); await tick(p, 1500);
  }
  if (!(await p.locator('.done-card').isVisible())) problems.push(`[${vp.width}] level ${id}: no result screen`);
}

async function mainRun(vp) {
  const { ctx, p } = await newPage(vp);
  await onboard(p); await overflow(p, 'home');
  for (let id = 1; id <= 11; id++) await playLesson(p, id, vp);
  const done = await p.evaluate(() => JSON.parse(localStorage.getItem('abacus-kids-v3')).lessonsDone.length);
  if (done !== 11) problems.push(`[${vp.width}] lessons saved: ${done}/11`);
  for (let id = 1; id <= 12; id++) await playLevel(p, id, vp, id === 5);
  await tick(p, 200);
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('abacus-kids-v3')));
  if (st.unlocked !== 12) problems.push(`[${vp.width}] unlocked=${st.unlocked}`);
  if (st.stats.answered !== 96) problems.push(`[${vp.width}] answered count ${st.stats.answered} (expected 96)`);
  await p.goto(BASE + '#/game/race'); await tick(p, 200); await p.click('[data-go]');
  for (let i = 0; i < 12; i++) { const a = await p.evaluate(() => __eq()); await p.evaluate(n => __set(n), a); }
  await tick(p, 61000); await overflow(p, 'race');
  if (!(await p.locator('.done-card').isVisible())) problems.push(`[${vp.width}] race did not end`);
  await tick(p, 200);
  const race = await p.evaluate(() => JSON.parse(localStorage.getItem('abacus-kids-v3')).games.race); if (race !== 12) problems.push(`[${vp.width}] race score ${race}`);
  await p.goto(BASE + '#/game/mystery'); await tick(p, 200);
  for (let r = 0; r < 10; r++) { const v = await p.evaluate(() => __val()); await p.click(`[data-opt="${v}"]`); await tick(p, 1300); }
  if (!(await p.locator('.done-card').isVisible())) problems.push(`[${vp.width}] mystery did not end`);
  await p.goto(BASE + '#/game/match'); await tick(p, 200); await overflow(p, 'match');
  const ids = await p.$$eval('[data-card]', els => els.map(e => e.dataset.card));
  const nums = [...new Set(ids.map(x => x.slice(1)))];
  for (const n of nums) { await p.click(`[data-card="n${n}"]`); await p.click(`[data-card="b${n}"]`); await tick(p, 200); }
  await tick(p, 900);
  if (!(await p.locator('.done-card').isVisible())) problems.push(`[${vp.width}] match did not end`);
  await p.goto(BASE + '#/free'); await tick(p, 200); await p.evaluate(() => __set(47)); if (await p.evaluate(() => __val()) !== 47) problems.push('free play set failed');
  await p.click('#rods'); await overflow(p, 'free 3 rods');
  await p.goto(BASE + '#/stickers'); await tick(p, 200); await overflow(p, 'stickers');
  const stickerCount = await p.locator('.sticker.got').count();
  await p.goto(BASE + '#/parents'); await tick(p, 200);
  let [x, y] = (await p.textContent('.lead')).match(/\d+/g).map(Number); await p.click(`[data-gate="${x * y}"]`); await tick(p, 200);
  await overflow(p, 'parents');
  if (vp.width === 390) {
    await p.screenshot({ path: './q-parents.png', fullPage: true });
    await p.goto(BASE + '#/stickers'); await tick(p, 300); await p.screenshot({ path: './q-stickers.png', fullPage: true });
    await p.goto(BASE + '#/parents'); await tick(p, 200); [x, y] = (await p.textContent('.lead')).match(/\d+/g).map(Number); await p.click(`[data-gate="${x * y}"]`);
  }
  await p.click('#reset'); await p.click('#reset'); await tick(p, 300);
  if (!(await has(p, '#kidName'))) problems.push(`[${vp.width}] reset did not return to welcome`);
  log(`viewport ${vp.width}: lessons ${done}/11, levels unlocked ${st.unlocked}, answered ${st.stats.answered}, stickers ${stickerCount}, race ${race}`);
  await ctx.close();
}

if (!ONLY || ONLY === 'main') for (const vp of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 820, height: 1180 }]) await mainRun(vp);

if (!ONLY || ONLY === 'extra') {
  { const { ctx, p } = await newPage({ width: 390, height: 844 });
    await onboard(p, 'known');
    for (let k = 0; k < 6; k++) { if (!(await has(p, '[data-eq]'))) { problems.push('quick check ended early at ' + k + ': ' + (await p.textContent('.view')).slice(0, 120)); break; } const a = await p.evaluate(() => __eq()); await p.evaluate(n => __set(n), a); const v = await p.evaluate(() => __val()); if (v !== a) problems.push('quick check set ' + a + ' got ' + v + ' eq ' + await p.textContent('[data-eq]')); await p.click('[data-check]'); await tick(p, 200); }
    await tick(p, 300); log('quick check result:', (await p.textContent('.done-card')).replace(/\s+/g, ' ').trim().slice(0, 80));
    await p.goto(BASE + '#/home'); await tick(p, 300); await p.screenshot({ path: './q-home.png', fullPage: true });
    await ctx.close(); }
  { const { ctx, p } = await newPage({ width: 390, height: 844 }, { blockStorage: true });
    await onboard(p); await p.goto(BASE + '#/level/1'); await tick(p, 300);
    log('storage blocked -> screen:', await p.textContent('.top-title'));
    await ctx.close(); }
  { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage(); p.on('pageerror', e => problems.push('offline JS ERROR ' + e.message));
    await p.goto(BASE); await p.fill('#kidName', 'Offline Kid'); await p.click('[data-exp="new"]'); await p.click('#start');
    await p.evaluate(() => navigator.serviceWorker.ready);
    await p.waitForTimeout(1500); await p.reload(); await p.waitForTimeout(1500);
    const controlled = await p.evaluate(() => !!navigator.serviceWorker.controller);
    await ctx.setOffline(true);
    let reloadOk = true; await p.reload().catch(e => { reloadOk = false; problems.push('offline reload failed ' + e.message); }); await p.waitForTimeout(1500);
    const hello = await p.locator('.hello').textContent({ timeout: 3000 }).catch(() => 'NOTHING');
    await p.evaluate(() => { location.hash = '#/lesson/2'; }); await p.waitForTimeout(800);
    const lessonOk = await p.locator('.abacus').count();
    log('offline: sw controlling =', controlled, '| reload ok =', reloadOk, '| home shows:', hello.replace(/\s+/g, ' ').trim(), '| lesson works =', lessonOk === 1);
    await p.screenshot({ path: './q-offline.png' });
    await ctx.close(); }
}
await browser.close();
console.log('\n' + (problems.length ? 'PROBLEMS:\n' + [...new Set(problems)].join('\n') : 'NO PROBLEMS FOUND'));
