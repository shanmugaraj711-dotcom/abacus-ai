import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { LESSONS } from '../js/lessons.js';
import { t } from '../js/i18n.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

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

test('Audio & Tamil verification suite', async (tSuite) => {
  await tSuite.test('i18n strings: Hooray is replaced with Awesome job', () => {
    const enLessonDone = t('en', 'lessonDone', 'Sam');
    assert.match(enLessonDone, /Awesome job, Sam! Lesson done!/);
    assert.doesNotMatch(enLessonDone, /Hooray/i, 'No Hooray in lessonDone');
  });

  await tSuite.test('i18n strings: Tamil strings use பாபி instead of Latin Babi', () => {
    const keysToCheck = ['babiPut', 'watchTogether', 'likeBabi'];
    for (const k of keysToCheck) {
      const taStr = t('ta', k, 2, 'add', 3);
      assert.doesNotMatch(taStr, /\bBabi\b/, `Tamil string for ${k} should not contain Latin Babi`);
      assert.match(taStr, /பாபி/, `Tamil string for ${k} should contain Tamil பாபி`);
    }
  });

  await tSuite.test('i18n strings: Tamil friends strings have clean suffixes without glued vowels', () => {
    const friendQ = t('ta', 'friendQ', 'little', 4);
    assert.doesNotMatch(friendQ, /\d+ஓட/, 'Should not glue ஓட directly to digit');
    assert.match(friendQ, /4 உடைய/, 'Should use clean suffix "4 உடைய"');

    const friendRight = t('ta', 'friendRight', 1, 4, 5);
    assert.doesNotMatch(friendRight, /\d+ம்/, 'Should not glue ம் directly to digit');
    assert.match(friendRight, /1 மற்றும் 4/, 'Should use "1 மற்றும் 4"');

    const friendHint = t('ta', 'friendHint', 4, 5);
    assert.doesNotMatch(friendHint, /\d+ஓட/, 'Should not glue ஓட directly to digit');
    assert.match(friendHint, /4 உடன்/, 'Should use "4 உடன்"');
  });

  await tSuite.test('lessons.js: All Tamil lesson texts use பாபி and avoid glued suffixes', () => {
    for (const lesson of LESSONS) {
      for (const step of lesson.steps) {
        if (step.ta) {
          assert.doesNotMatch(
            step.ta,
            /\bBabi\b/,
            `Lesson ${lesson.id} step should not contain Latin "Babi": "${step.ta}"`
          );
          assert.doesNotMatch(
            step.ta,
            /\d+ஓட/,
            `Lesson ${lesson.id} step should not contain digit glued with ஓட: "${step.ta}"`
          );
          assert.doesNotMatch(
            step.ta,
            /\d+ம்\s+\d+ம்/,
            `Lesson ${lesson.id} step should not contain digits glued with ம்: "${step.ta}"`
          );
        }
      }
    }
  });

  await tSuite.test('sound.js: say() returns Promise and resolves upon speech end with phonetic numbers', async () => {
    globalThis.window = globalThis;
    let spokeUtterance = null;
    let cancelCount = 0;

    globalThis.speechSynthesis = {
      speaking: false,
      pending: false,
      cancel() {
        cancelCount++;
        this.speaking = false;
      },
      speak(u) {
        spokeUtterance = u;
        this.speaking = true;
        setTimeout(() => {
          this.speaking = false;
          if (u.onend) u.onend();
        }, 15);
      },
      getVoices() {
        return [{ lang: 'en-US', name: 'Alex' }, { lang: 'ta-IN', name: 'Valluvar' }];
      }
    };

    globalThis.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
        this.lang = 'en';
        this.onend = null;
        this.onerror = null;
      }
    };

    const { state } = await import('../js/store.js');
    state.settings.voice = true;
    const { say } = await import('../js/sound.js');

    const resPromise = say('Hello abacus', 'en');
    assert(resPromise instanceof Promise, 'say() must return a Promise');
    await resPromise;
    assert.equal(spokeUtterance.text, 'Hello abacus');

    // Test Tamil phonetic replacement
    await say('4 உடைய லிட்டில் ஃபிரெண்ட்', 'ta');
    assert.match(spokeUtterance.text, /ஃபோர் உடைய லிட்டில் ஃபிரெண்ட்/, 'Replaces 4 with phonetic word smoothly without phoneme collapse');

    // Test speech cancellation / race handling
    const p1 = say('First sentence', 'en');
    const p2 = say('Second sentence', 'en');
    assert(p1 instanceof Promise);
    assert(p2 instanceof Promise);
    await Promise.all([p1, p2]);
    assert.equal(spokeUtterance.text, 'Second sentence');
  });

  await tSuite.test('Browser E2E: Tamil UI localization across screens', async () => {
    const server = createTestServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();

    try {
      // 1. Initialize localStorage with Tamil profile before scripts execute
      await page.addInitScript(() => {
        if (!localStorage.getItem('abacus-kids-v3')) {
          localStorage.setItem(
            'abacus-kids-v3',
            JSON.stringify({
              v: 3,
              profile: { name: 'கவின்', avatar: '🦁', experience: 'new', lang: 'ta', voiceLang: 'ta' },
              settings: { sound: false, voice: false },
              lessonsDone: [1, 2, 3],
              levels: { 1: { stars: 3, best: 8, plays: 1 }, 2: { stars: 3, best: 8, plays: 1 }, 3: { stars: 3, best: 8, plays: 1 } },
              unlocked: 3,
              stats: { days: [], answered: 0, firstTry: 0, seconds: 0, byRule: { direct: [0, 0], small: [0, 0], big: [0, 0] }, mistakes: [] },
              games: { race: 0, mystery: 0, match: 0 },
              exams: [],
              recent: [],
              stickersSeen: []
            })
          );
        }
      });

      // 2. Test Home Screen in Tamil
      await page.goto(`${baseUrl}/#/home`);
      await page.waitForSelector('.hello');
      const homeText = await page.locator('#app').textContent();
      assert.match(homeText, /மீண்டும் வருக/, 'Home eyebrow in Tamil');
      assert.match(homeText, /Hi, கவின்!/, 'Greeting with kid name');
      assert.match(homeText, /பாபி அடுத்ததா இதை பண்ண சொல்றாரு/, 'Babi mission prompt in Tamil');
      assert.match(homeText, /கற்றல்/, 'Learn tile label');
      assert.match(homeText, /பயிற்சி/, 'Practice tile label');
      assert.match(homeText, /விளையாட்டு/, 'Play tile label');
      assert.match(homeText, /சுய பயிற்சி/, 'Free play tile label');
      assert.match(homeText, /பெற்றோருக்கான பகுதி/, 'Grown-ups corner link in Tamil');

      // 3. Test Unlock Screen in Tamil
      await page.goto(`${baseUrl}/#/unlock`);
      await page.waitForSelector('.card.intro');
      const unlockText = await page.locator('.card.intro').textContent();
      assert.match(unlockText, /அபாகஸ் பட்டி வாழ்நாள் முழுமைக்கும்/, 'Unlock eyebrow in Tamil');
      assert.match(unlockText, /லெவல்கள் 4–15/, 'Unlock display header in Tamil');
      assert.match(unlockText, /ஒரே முறை கட்டணம் ₹499 மட்டும்/, 'Unlock lead in Tamil');
      assert.match(unlockText, /லெவல்கள் 1–3 எப்போதும் இலவசம்/, 'Unlock bullet 1 in Tamil');
      assert.match(unlockText, /இந்த கணக்கிற்கு லெவல்கள் 4–15 நிரந்தரமாக திறக்கப்படும்/, 'Unlock bullet 2 in Tamil');
      assert.match(unlockText, /Razorpay மூலம் பாதுகாப்பாக பணம் செலுத்தலாம்/, 'Unlock bullet 3 in Tamil');
      assert.match(unlockText, /தொடங்க உள்நுழையவும்/, 'Sign-in CTA button in Tamil');
      assert.match(unlockText, /இப்போது வேண்டாம்/, 'Not now button in Tamil');

      // 4. Test Practice Map in Tamil
      await page.goto(`${baseUrl}/#/practice`);
      await page.waitForSelector('.levels');
      const practiceText = await page.locator('#app').textContent();
      assert.match(practiceText, /லெவல் 1/, 'Level 1 card in Tamil');
      assert.match(practiceText, /₹499 செலுத்தி திற/, 'Paywalled level indicator in Tamil');

      // 5. Test Level Intro in Tamil
      await page.goto(`${baseUrl}/#/level/1`);
      await page.waitForSelector('.intro.card');
      const levelIntroText = await page.locator('.intro.card').textContent();
      assert.match(levelIntroText, /8 கணக்குகள் · மணிகளால் பதிலை உருவாக்கவும்/, '8 sums muted note in Tamil');
      assert.match(levelIntroText, /தயார் — ஆரம்பிக்கலாம்|ஆரம்பி ▶/, 'Start button in Tamil');
      assert.match(levelIntroText, /முதலில் வித்தையை கற்றுக்கொள்/, 'Learn trick button in Tamil');

      // 6. Test Practice Screen Controls in Tamil
      await page.locator('button[data-start]').click();
      await page.waitForSelector('.practice .row');
      const btnReset = await page.locator('button[data-reset]').textContent();
      const btnHelp = await page.locator('button[data-help]').textContent();
      const btnCheck = await page.locator('button[data-check]').textContent();
      assert.match(btnReset, /மீட்டமை/, 'Reset button in Tamil');
      assert.match(btnHelp, /உதவி/, 'Help button in Tamil');
      assert.match(btnCheck, /சரிபார்/, 'Check button in Tamil');

      // Click Help and verify Watch Babi button in Tamil
      await page.locator('button[data-help]').click();
      const watchBtnText = await page.locator('button[data-watch]').textContent();
      assert.match(watchBtnText, /பாபி பண்றத பாரு/, 'Watch Babi button uses Tamil பாபி');
      assert.doesNotMatch(watchBtnText, /\bBabi\b/, 'Does not contain Latin Babi');

      // 7. Verify English mode remains intact
      await page.evaluate(async () => {
        const d = JSON.parse(localStorage.getItem('abacus-kids-v3'));
        d.profile.lang = 'en';
        d.profile.voiceLang = 'en';
        d.profile.name = 'Leo';
        localStorage.setItem('abacus-kids-v3', JSON.stringify(d));
        const { state } = await import('./js/store.js');
        state.profile = d.profile;
      });
      await page.goto(`${baseUrl}/#/home`);
      await page.waitForSelector('.hello');
      const enHomeText = await page.locator('#app').textContent();
      assert.match(enHomeText, /Welcome back/, 'English welcome back eyebrow');
      assert.match(enHomeText, /Hi, Leo!/, 'English greeting');
      assert.match(enHomeText, /Babi says do this next/, 'English Babi prompt');
      assert.match(enHomeText, /Learn/, 'English Learn tile');
      assert.match(enHomeText, /Practise/, 'English Practise tile');
      assert.match(enHomeText, /Grown-ups corner/, 'English Grown-ups corner');

    } finally {
      await browser.close();
      await new Promise(resolve => server.close(resolve));
    }
  });
});
