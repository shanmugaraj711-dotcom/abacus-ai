import { LEVELS, MAX_LEVEL, makeSession, planMoves, starsFor, sign, makeAbacus, valueOf, problemPool } from './engine.js';
import { state, save, saveNow, markDay, streak, totalStars, recordAnswer, recordMistake, resetAll } from './store.js';
import { sfx, say, cheer, stopTalking } from './sound.js';
import { createAbacus, miniAbacus } from './abacusView.js';
import { babi } from './babi.js';
import { LESSONS, LESSON_FOR_LEVEL } from './lessons.js';

// ---------- tiny helpers ----------
const app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = app) => root.querySelector(sel);
const $$ = (sel, root = app) => [...root.querySelectorAll(sel)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let token = 0;             // bumps on every screen change; async work checks it so nothing leaks between screens
const timers = new Set();
const alive = t => t === token;
function every(fn, ms) { const id = setInterval(fn, ms); timers.add(id); return id; }
function clearTimers() { timers.forEach(clearInterval); timers.clear(); }
const go = hash => { if (location.hash === hash) route(); else location.hash = hash; };
const AVATARS = ['🦁', '🐼', '🐰', '🦊', '🐬', '🦄', '🐯', '🐸'];
const stars = n => `<span class="stars" aria-label="${n} of 3 stars">${[0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}">★</i>`).join('')}</span>`;
const lessonDone = id => state.lessonsDone.includes(id);
const kidName = () => esc(state.profile?.name || 'friend');

function shell({ title = '', back = '', body = '', cls = '' }) {
  app.innerHTML = `
    <header class="top">
      ${back ? `<button class="round" data-back="${back}" aria-label="Go back">←</button>` : `<span class="brand">🧮 <b>Abacus</b> Buddy</span>`}
      <h1 class="top-title">${esc(title)}</h1>
      <span class="chip gold" title="Stars">★ ${totalStars()}</span>
      <button class="round" data-sound aria-label="Sound on or off">${state.settings.sound ? '🔊' : '🔈'}</button>
    </header>
    <main class="view ${cls}">${body}</main>`;
  $('[data-back]')?.addEventListener('click', () => { sfx.tap(); go($('[data-back]').dataset.back); });
  $('[data-sound]').addEventListener('click', e => {
    state.settings.sound = !state.settings.sound; state.settings.voice = state.settings.sound; save();
    e.currentTarget.textContent = state.settings.sound ? '🔊' : '🔈'; if (!state.settings.sound) stopTalking(); else sfx.tap();
  });
}

function bubble(text, mood = 'talk') {
  return `<div class="talk"><div class="talk-babi">${babi(mood)}</div><p class="talk-text" data-say>${esc(text)}</p><button class="round small" data-replay aria-label="Hear it again">🔊</button></div>`;
}
function setBubble(text, mood = 'talk', speak = true) {
  const t = $('[data-say]'); if (t) t.textContent = text;
  const b = $('.talk-babi'); if (b) b.innerHTML = babi(mood);
  if (speak) say(text);
}
// One global listener replays whatever Babi last said.
app.addEventListener('click', e => { if (e.target.closest('[data-replay]')) say($('[data-say]')?.textContent); });

function confetti() {
  if (reduceMotion) return;
  const box = document.createElement('div'); box.className = 'confetti';
  const colors = ['#FF6B4A', '#FFC53D', '#3DA5F4', '#2FBF8F', '#B57BFF'];
  for (let i = 0; i < 46; i++) {
    const p = document.createElement('i');
    p.style.cssText = `left:${Math.random() * 100}%;background:${colors[i % 5]};animation-delay:${Math.random() * .4}s;animation-duration:${1.4 + Math.random()}s;transform:rotate(${Math.random() * 360}deg)`;
    box.appendChild(p);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 2600);
}

// Animate Babi doing the real finger moves for a ± b.
async function playDemo(view, a, b, op, textEl, t, speed = 1500) {
  const plan = planMoves(a, b, op);
  view.lock(true); view.set(a);
  const say1 = `${a} ${sign(op)} ${b}. Start with ${a}.`;
  textEl.textContent = say1; say(say1);
  await wait(speed); if (!alive(t)) return false;
  for (const st of plan.steps) {
    view.highlight(st.rod); view.set(st.value); if (st.value !== undefined) sfx.bead();
    textEl.textContent = st.say; say(st.say);
    await wait(Math.max(speed, st.say.length * 55)); if (!alive(t)) return false;
  }
  view.highlight(null);
  const end = `${a} ${sign(op)} ${b} = ${plan.answer}!`;
  textEl.textContent = end; say(end); view.celebrate();
  return true;
}

// ---------- stickers (earned from progress; nothing extra to save except which ones were shown) ----------
const STICKERS = [
  { id: 'lesson1', e: '🧮', name: 'First Lesson', how: 'Finish lesson 1', ok: () => lessonDone(1) },
  { id: 'tens', e: '🏠', name: 'Tens Explorer', how: 'Finish The Tens Rod', ok: () => lessonDone(5) },
  { id: 'little', e: '🐰', name: 'Little Friends', how: 'Learn Little Friends', ok: () => lessonDone(8) },
  { id: 'big', e: '🦁', name: 'Big Friends', how: 'Learn Big Friends', ok: () => lessonDone(10) },
  { id: 'grad', e: '🎓', name: 'Super Learner', how: 'Finish all lessons', ok: () => LESSONS.every(l => lessonDone(l.id)) },
  { id: 'practice', e: '🎯', name: 'First Practice', how: 'Finish any level', ok: () => Object.keys(state.levels).length > 0 },
  { id: 'three', e: '🌟', name: 'Perfect!', how: 'Get 3 stars on a level', ok: () => Object.values(state.levels).some(l => l.stars === 3) },
  { id: 'lv6', e: '🚀', name: 'Rocket', how: 'Open Level 6', ok: () => state.unlocked >= 6 },
  { id: 'champ', e: '👑', name: 'Champion', how: 'Pass Level 12', ok: () => (state.levels[12]?.stars || 0) >= 1 },
  { id: 'race', e: '🏁', name: 'Speedy Beads', how: 'Solve 10 in Bead Race', ok: () => state.games.race >= 10 },
  { id: 'match', e: '🃏', name: 'Memory Star', how: 'Bead Match in 10 moves', ok: () => state.games.match > 0 && state.games.match <= 10 },
  { id: 'days', e: '🔥', name: 'Three Days', how: 'Play on 3 different days', ok: () => state.stats.days.length >= 3 },
];
const earned = () => STICKERS.filter(x => x.ok());

function stickers() {
  const got = new Set(earned().map(x => x.id));
  shell({ title: 'My Stickers', back: '#/home', body: `
    ${bubble(`You have ${got.size} of ${STICKERS.length} stickers. Keep going!`, 'happy')}
    <div class="stickers">${STICKERS.map(x => `<div class="sticker ${got.has(x.id) ? 'got' : ''}"><span>${got.has(x.id) ? x.e : '❔'}</span><b>${x.name}</b><small>${got.has(x.id) ? 'Got it!' : x.how}</small></div>`).join('')}</div>` });
  state.stickersSeen = [...got]; save();
  say(`You have ${got.size} stickers!`);
}

// ---------- screens ----------
function welcome() {
  const draft = { name: state.profile?.name || '', avatar: '🦁', lang: 'en' };
  app.innerHTML = `
  <main class="view welcome">
    <div class="hero">
      ${babi('cheer', 'big bob')}
      <div>
        <p class="eyebrow">Abacus Buddy</p>
        <h1 class="display">Hi! I'm Babi.</h1>
        <p class="lead">I'll teach you to count and add with beads — one little step at a time.</p>
      </div>
    </div>
    <section class="card form">
      <label for="kidName">What's your name?</label>
      <input id="kidName" maxlength="18" autocomplete="off" placeholder="Type your name" value="${esc(draft.name)}">
      <label>Pick your animal buddy</label>
      <div class="avatars">${AVATARS.map(a => `<button type="button" class="avatar ${a === draft.avatar ? 'on' : ''}" data-avatar="${a}" aria-label="Avatar ${a}">${a}</button>`).join('')}</div>
      <label>Have you used an abacus before?</label>
      <div class="two">
        <button type="button" class="choice" data-exp="new"><b>🌱 I'm new</b><small>Teach me from the start</small></button>
        <button type="button" class="choice" data-exp="known"><b>🚀 I know it</b><small>Quick check, then skip ahead</small></button>
      </div>
      <label>Babi's cheers</label>
      <div class="two">
        <button type="button" class="choice on" data-lang="en"><b>English</b></button>
        <button type="button" class="choice" data-lang="ta"><b>தமிழ் Tamil</b></button>
      </div>
      <button class="btn primary wide" id="start" disabled>Let's go! →</button>
    </section>
    <button class="linkish" id="demo">👀 Grown-up? Open a demo with sample progress</button>
  </main>`;
  let exp = '';
  const ready = () => { $('#start').disabled = !($('#kidName').value.trim() && exp); };
  $('#kidName').addEventListener('input', ready);
  $$('[data-avatar]').forEach(b => b.onclick = () => { draft.avatar = b.dataset.avatar; $$('[data-avatar]').forEach(x => x.classList.toggle('on', x === b)); sfx.tap(); });
  $$('[data-exp]').forEach(b => b.onclick = () => { exp = b.dataset.exp; $$('[data-exp]').forEach(x => x.classList.toggle('on', x === b)); sfx.tap(); ready(); });
  $$('[data-lang]').forEach(b => b.onclick = () => { draft.lang = b.dataset.lang; $$('[data-lang]').forEach(x => x.classList.toggle('on', x === b)); state.profile = { ...(state.profile || {}), lang: draft.lang }; cheer('good'); });
  $('#start').onclick = () => {
    state.profile = { name: $('#kidName').value.trim().slice(0, 18), avatar: draft.avatar, experience: exp, lang: draft.lang };
    saveNow(); sfx.good(); say(`Hi ${state.profile.name}! Let's play with the abacus.`);
    go(exp === 'known' ? '#/check' : '#/home');
  };
  $('#demo').onclick = () => {
    Object.assign(state, {
      profile: { name: 'Aru', avatar: '🐼', experience: 'new', lang: 'en' },
      lessonsDone: [1, 2, 3, 4, 5, 6, 7, 8], unlocked: 5,
      levels: { 1: { stars: 3, best: 8, plays: 3 }, 2: { stars: 3, best: 8, plays: 2 }, 3: { stars: 2, best: 6, plays: 2 }, 4: { stars: 1, best: 5, plays: 2 } },
      games: { race: 11, mystery: 8, match: 16 },
    });
    const d = new Date(); state.stats.days = [];
    [0, 1, 2, 4, 5].forEach(k => { const x = new Date(d); x.setDate(d.getDate() - k); state.stats.days.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`); });
    Object.assign(state.stats, { answered: 74, firstTry: 58, seconds: 2460, byRule: { direct: [49, 56], small: [9, 18], big: [0, 0] },
      mistakes: [{ q: '4 + 3', answer: 7, given: 11, rule: 'small' }, { q: '8 − 6', answer: 2, given: 3, rule: 'direct' }, { q: '3 + 4', answer: 7, given: 8, rule: 'small' }] });
    saveNow(); go('#/home');
  };
}

function nextMission() {
  const lvl = Math.min(state.unlocked, MAX_LEVEL);
  const need = LESSON_FOR_LEVEL[lvl] || 11;
  const lesson = LESSONS.find(l => l.id <= need && !lessonDone(l.id));
  if (lesson && state.profile.experience !== 'known') return { href: `#/lesson/${lesson.id}`, emoji: lesson.emoji, label: `Learn: ${lesson.title}`, say: `Next, let's learn ${lesson.title}.` };
  const L = LEVELS[lvl];
  return { href: `#/level/${lvl}`, emoji: L.emoji, label: `Practise Level ${lvl}: ${L.name}`, say: `Ready to practise ${L.name}?` };
}

function home() {
  const m = nextMission(), sk = streak();
  shell({ body: `
    <section class="hello">
      <div class="kid-avatar">${esc(state.profile.avatar)}</div>
      <div><p class="eyebrow">Welcome back</p><h2 class="display">Hi, ${kidName()}!</h2></div>
      <span class="chip ${sk ? 'fire' : ''}">🔥 ${sk} day${sk === 1 ? '' : 's'}</span>
    </section>
    <a class="mission" href="${m.href}">
      <div class="mission-babi">${babi('happy', 'bob')}</div>
      <div><p class="eyebrow">Babi says do this next</p><b>${m.emoji} ${esc(m.label)}</b></div>
      <span class="go">▶</span>
    </a>
    ${(() => { const fresh = earned().filter(x => !state.stickersSeen.includes(x.id)); return fresh.length ? `<a class="new-sticker" href="#/stickers"><span>${fresh[0].e}</span><div><b>New sticker!</b><small>${esc(fresh[0].name)} — tap to see</small></div></a>` : ''; })()}
    <nav class="tiles">
      <a class="tile learn" href="#/learn"><span>📘</span><b>Learn</b><small>${state.lessonsDone.length} of ${LESSONS.length} lessons</small></a>
      <a class="tile practice" href="#/practice"><span>🎯</span><b>Practise</b><small>Level ${Math.min(state.unlocked, MAX_LEVEL)} open</small></a>
      <a class="tile play" href="#/play"><span>🎮</span><b>Play</b><small>3 bead games</small></a>
      <a class="tile free" href="#/free"><span>✋</span><b>Free Play</b><small>Just move beads</small></a>
    </nav>
    <a class="sticker-link" href="#/stickers"><span>🏅</span><b>My Stickers</b><em>${earned().length}/${STICKERS.length}</em></a>
    <a class="grownups" href="#/parents">👨‍👩‍👧 Grown-ups corner</a>` });
  setTimeout(() => say(`Hi ${state.profile.name}! ${m.say}`), 250);
}

function free() {
  shell({ title: 'Free Play', back: '#/home', body: `
    ${bubble('Move any bead you like. I will tell you the number!', 'happy')}
    <div data-abacus></div>
    <div class="row center"><button class="btn" id="clear">↺ Clear</button><button class="btn" id="rods">Use 3 rods</button></div>` });

  let rods = 2;
  const build = () => {
    const v = createAbacus($('[data-abacus]'), { rods, onChange: n => { $('[data-say]').textContent = `That's ${n}!`; clearTimeout(free.t); free.t = setTimeout(() => say(String(n)), 350); } });
    $('#clear').onclick = () => { v.set(0); $('[data-say]').textContent = 'All clear. That is 0.'; };
  };
  build();
  $('#rods').onclick = e => { rods = rods === 2 ? 3 : 2; e.currentTarget.textContent = rods === 2 ? 'Use 3 rods' : 'Use 2 rods'; build(); };
}

// ---------- Learn ----------
function learnMap() {
  const known = state.profile.experience === 'known';
  shell({ title: 'Learn', back: '#/home', body: `
    ${bubble('Pick a lesson. Each one is short — just a few taps!', 'happy')}
    <ol class="path">${LESSONS.map((l, i) => {
      const done = lessonDone(l.id), open = known || i === 0 || lessonDone(LESSONS[i - 1].id);
      const next = open && !done;
      return `<li class="stone ${done ? 'done' : ''} ${next ? 'next' : ''} ${open ? '' : 'locked'}">
        <a ${open ? `href="#/lesson/${l.id}"` : 'aria-disabled="true"'}>
          <span class="stone-emoji">${open ? l.emoji : '🔒'}</span>
          <span><small>Lesson ${l.id}</small><b>${esc(l.title)}</b></span>
          <span class="stone-end">${done ? '✅' : next ? '▶' : ''}</span>
        </a></li>`;
    }).join('')}</ol>` });

}

function lesson(id) {
  const L = LESSONS.find(l => l.id === id); if (!L) return go('#/learn');
  let i = 0; const t = token;
  shell({ title: L.title, back: '#/learn', body: `<div class="progress"><i style="width:0"></i></div><div data-step></div>`, cls: 'lesson' });


  function finish() {
    const first = !lessonDone(id);
    if (first) { state.lessonsDone.push(id); L.unlocks.forEach(lv => { state.unlocked = Math.max(state.unlocked, lv); }); markDay(); save(); }
    sfx.star(); confetti();
    const nextL = LESSONS.find(l => l.id === id + 1);
    const lv = L.unlocks[0];
    $('.progress i').style.width = '100%';
    $('[data-step]').innerHTML = `
      <section class="done-card">
        ${babi('cheer', 'big bob')}
        <h2 class="display">Lesson done!</h2>
        <p class="lead">You learned <b>${esc(L.title)}</b>. ${first ? 'You earned a star ★' : ''}</p>
        ${lv ? `<p class="unlock">🎯 Practice Level ${lv} is open!</p>` : ''}
        <div class="stack">
          ${lv ? `<a class="btn primary wide" href="#/level/${lv}">Practise it now →</a>` : ''}
          ${nextL ? `<a class="btn ${lv ? '' : 'primary'} wide" href="#/lesson/${nextL.id}">Next lesson: ${esc(nextL.title)}</a>` : ''}
          <a class="btn ghost wide" href="#/home">Home</a>
        </div>
      </section>`;
    say(`Hooray ${state.profile.name}! Lesson done!`);
  }

  function step() {
    if (!alive(t)) return;
    if (i >= L.steps.length) return finish();
    const s = L.steps[i];
    $('.progress i').style.width = `${(i / L.steps.length) * 100}%`;
    const box = $('[data-step]');
    const nextBtn = (label = 'Next →', hidden = false) => `<button class="btn primary wide" data-next ${hidden ? 'hidden' : ''}>${label}</button>`;
    const bindNext = () => { const b = $('[data-next]'); if (b) b.onclick = () => { sfx.tap(); stopTalking(); i++; step(); }; };
    const showNext = () => { const b = $('[data-next]'); if (b) { b.hidden = false; b.focus({ preventScroll: true }); } };

    if (s.t === 'talk') {
      box.innerHTML = `${bubble(s.say)}<div data-abacus></div>${nextBtn()}`;
      const v = createAbacus($('[data-abacus]'), { rods: s.rods, value: s.value, interactive: false });
      v.showParts(!!s.parts); if (s.highlight != null) v.highlight(s.highlight);
      bindNext(); say(s.say);
    }

    if (s.t === 'build') {
      box.innerHTML = `${bubble(s.say)}<div class="goal">Make <b>${s.target}</b></div><div data-abacus></div>
        <div class="row center"><button class="btn" data-help>🙋 Show me</button></div>${nextBtn('Next →', true)}`;
      let done = false;
      const v = createAbacus($('[data-abacus]'), { rods: s.rods, onChange: n => {
        if (done) return;
        if (n === s.target) { done = true; v.lock(); $('[data-help]').hidden = true; v.celebrate(); sfx.good(); setBubble(`${cheer('good')} That is ${s.target}!`, 'cheer', false); showNext(); }
      } });
      $('[data-help]').onclick = async () => {
        if (done) return; v.lock(); v.set(s.target); v.celebrate(); setBubble(`Look! This is ${s.target}. Now you try.`, 'talk');
        await wait(2200); if (!alive(t) || done) return; v.set(0); v.lock(false);
      };
      bindNext(); say(s.say);
    }

    if (s.t === 'read') {
      box.innerHTML = `${bubble(s.say, 'think')}<div data-abacus></div>
        <div class="options">${s.options.map(o => `<button class="opt" data-opt="${o}">${o}</button>`).join('')}</div>${nextBtn('Next →', true)}`;
      const v = createAbacus($('[data-abacus]'), { rods: s.rods, value: s.value, interactive: false, readout: false, digits: false });
      $$('[data-opt]').forEach(b => b.onclick = () => {
        if (+b.dataset.opt === s.value) { $$('[data-opt]').forEach(x => x.disabled = true); b.classList.add('right'); sfx.good(); v.celebrate(); setBubble(`${cheer('good')} It is ${s.value}.`, 'cheer', false); showNext(); }
        else { b.classList.add('wrong'); b.disabled = true; sfx.oops(); setBubble('Not that one. Count the beads touching the bar again!', 'think'); }
      });
      bindNext(); say(s.say);
    }

    if (s.t === 'demo') {
      box.innerHTML = `${bubble(s.say)}<div class="equation">${s.a} ${sign(s.op)} ${s.b}</div><div data-abacus></div>
        <div class="row center"><button class="btn primary" data-play>▶ Watch Babi</button></div>${nextBtn('Next →', true)}`;
      const v = createAbacus($('[data-abacus]'), { rods: 2, value: s.a, interactive: false });
      $('[data-play]').onclick = async e => {
        const btn = e.currentTarget; btn.disabled = true;
        const ok = await playDemo(v, s.a, s.b, s.op, $('[data-say]'), t);
        if (!ok) return; btn.disabled = false; btn.textContent = '↺ Watch again'; showNext();
      };
      bindNext(); say(s.say);
    }

    if (s.t === 'solve') {
      const answer = s.op === 'add' ? s.a + s.b : s.a - s.b;
      box.innerHTML = `${bubble(s.say)}<div class="equation">${s.a} ${sign(s.op)} ${s.b} = <b>?</b></div><div data-abacus></div>
        <div class="row center"><button class="btn" data-reset>↺ Reset</button><button class="btn" data-show>🙋 Show me</button><button class="btn primary" data-check>✓ Check</button></div>${nextBtn('Next →', true)}`;
      let tries = 0;
      const v = createAbacus($('[data-abacus]'), { rods: 2, value: s.a });
      $('[data-reset]').onclick = () => { v.set(s.a); sfx.tap(); };
      $('[data-show]').onclick = async () => {
        $$('.row button').forEach(b => b.disabled = true);
        const ok = await playDemo(v, s.a, s.b, s.op, $('[data-say]'), t, 1300);
        if (!ok) return; await wait(1400); if (!alive(t)) return;
        v.set(s.a); v.lock(false); $$('.row button').forEach(b => b.disabled = false); setBubble('Now you do it, just like Babi!', 'happy');
      };
      $('[data-check]').onclick = () => {
        if (v.value === answer) {
          v.lock(); v.celebrate(); sfx.good(); $$('.row button').forEach(b => b.disabled = true);
          setBubble(`${cheer('good')} ${s.a} ${sign(s.op)} ${s.b} = ${answer}`, 'cheer', false); showNext();
        } else {
          tries++; v.shake(); sfx.oops();
          const hint = planMoves(s.a, s.b, s.op).steps[0].say;
          setBubble(tries === 1 ? `The abacus says ${v.value}. Let's try again!` : `Here's a clue: ${hint}`, 'think');
          if (tries >= 1) $('[data-show]').classList.add('pulse');
        }
      };
      bindNext(); say(s.say);
    }

    if (s.t === 'friends') {
      const big = s.kind === 'big', total = big ? 10 : 5;
      const pairs = big ? [[1, 9], [2, 8], [3, 7], [4, 6], [5, 5]] : [[1, 4], [2, 3]];
      const qs = big ? [7, 4, 2] : [3, 1];
      let q = 0;
      box.innerHTML = `${bubble(s.say, 'happy')}
        <div class="friends ${big ? 'big' : ''}">${pairs.map(([x, y]) => `<div class="pair"><span class="dots">${'●'.repeat(x)}</span><b>${x}</b><em>+</em><b>${y}</b><span class="dots b">${'●'.repeat(y)}</span><strong>= ${total}</strong></div>`).join('')}</div>
        <div class="quiz"><p data-q></p><div class="options" data-opts></div></div>${nextBtn('Next →', true)}`;
      const ask = () => {
        const n = qs[q], right = total - n;
        const opts = [...new Set([right, (right % (total - 1)) + 1, total - right === right ? right + 1 : total - right])].slice(0, 3).sort(() => Math.random() - .5);
        while (opts.length < 3) { const r = 1 + Math.floor(Math.random() * (total - 1)); if (!opts.includes(r)) opts.push(r); }
        $('[data-q]').textContent = `${big ? 'Big' : 'Little'} Friend of ${n} is…?`;
        $('[data-opts]').innerHTML = opts.map(o => `<button class="opt" data-opt="${o}">${o}</button>`).join('');
        $$('[data-opt]').forEach(b => b.onclick = () => {
          if (+b.dataset.opt === right) {
            b.classList.add('right'); sfx.good(); $$('[data-opt]').forEach(x => x.disabled = true);
            setBubble(`${cheer('good')} ${n} and ${right} make ${total}.`, 'cheer', false);
            q++; if (q < qs.length) setTimeout(() => alive(t) && ask(), 1100); else showNext();
          } else { b.classList.add('wrong'); b.disabled = true; sfx.oops(); setBubble(`Look at the pairs above. What goes with ${n} to make ${total}?`, 'think'); }
        });
      };
      ask(); bindNext(); say(s.say);
    }
  }
  step();
}

// ---------- Practice ----------
function practiceMap() {
  shell({ title: 'Practise', back: '#/home', body: `
    ${bubble('Pick a level. Get stars to open the next one!', 'happy')}
    <div class="levels">${LEVELS.slice(1).map(L => {
      const open = L.id <= state.unlocked, rec = state.levels[L.id];
      return `<a class="level ${open ? '' : 'locked'} ${L.id === state.unlocked ? 'current' : ''}" ${open ? `href="#/level/${L.id}"` : 'aria-disabled="true"'}>
        <span class="lv-emoji">${open ? L.emoji : '🔒'}</span>
        <span class="lv-body"><small>Level ${L.id}</small><b>${esc(L.name)}</b><em>${esc(L.tip)}</em></span>
        ${stars(rec?.stars || 0)}
      </a>`;
    }).join('')}</div>` });

}

function levelIntro(id) {
  const L = LEVELS[id]; if (!L || id > state.unlocked) return go('#/practice');
  const needLesson = LESSON_FOR_LEVEL[id], lessonNeeded = needLesson && !lessonDone(needLesson);
  const LL = LESSONS.find(l => l.id === needLesson);
  shell({ title: `Level ${id}`, back: '#/practice', body: `
    <section class="intro card">
      <div class="lv-big">${L.emoji}</div>
      <p class="eyebrow">Level ${id}</p>
      <h2 class="display">${esc(L.name)}</h2>
      <p class="lead">${esc(L.tip)}</p>
      <p class="muted">8 sums · build each answer with beads</p>
      ${lessonNeeded ? `<div class="notice">${babi('think')}<p>This uses a new trick! Babi can teach <b>${esc(LL.title)}</b> first.</p></div>
        <a class="btn primary wide" href="#/lesson/${needLesson}">📘 Learn the trick first</a>
        <button class="btn wide" data-start>I'm ready — start</button>`
      : `<button class="btn primary wide" data-start>Start ▶</button>`}
    </section>` });
  $('[data-start]').onclick = () => practice(id);
  say(`Level ${id}. ${L.name}. ${L.tip}`);
}

function practice(id) {
  const L = LEVELS[id], t = ++token; clearTimers();
  const session = makeSession(id, 8, Math.random, state.recent);
  let idx = 0, firstTry = 0, tries = 0, helped = false;
  const started = Date.now(); const results = [];
  markDay();
  shell({ title: L.name, back: `#/practice`, cls: 'practice', body: `
    <div class="dots" data-dots>${session.map(() => '<i></i>').join('')}</div>
    <div class="equation big" data-eq></div>
    <p class="muted center" data-start-note></p>
    <div data-abacus></div>
    <div class="row center">
      <button class="btn" data-reset>↺ Reset</button>
      <button class="btn" data-help>💡 Help</button>
      <button class="btn primary" data-check>✓ Check</button>
    </div>
    ${bubble('Build the answer with beads, then press Check.', 'happy')}
    <ol class="plan" data-plan hidden></ol>` });

  const v = createAbacus($('[data-abacus]'), { rods: 2 });
  const buttons = () => $$('.row button');

  function show() {
    const p = session[idx]; tries = 0; helped = false;
    $('[data-eq]').innerHTML = `${p.a} ${sign(p.op)} ${p.b} = <b>?</b>`;
    $('[data-start-note]').textContent = `Babi put ${p.a} on the abacus. Now ${p.op === 'add' ? 'add' : 'take away'} ${p.b}.`;
    $('[data-plan]').hidden = true;
    v.set(p.a); v.lock(false); v.highlight(null);
    buttons().forEach(b => { b.disabled = false; b.classList.remove('pulse'); });
    $$('[data-dots] i').forEach((d, k) => d.classList.toggle('now', k === idx));
    setBubble(`${p.a} ${sign(p.op)} ${p.b}`, 'talk');
  }

  async function watch() {
    const p = session[idx]; helped = true;
    buttons().forEach(b => b.disabled = true);
    const ok = await playDemo(v, p.a, p.b, p.op, $('[data-say]'), t, 1300);
    if (!ok) return; await wait(1500); if (!alive(t)) return;
    v.set(p.a); v.lock(false); buttons().forEach(b => b.disabled = false);
    setBubble('Your turn! Do the same moves.', 'happy');
  }

  $('[data-reset]').onclick = () => { v.set(session[idx].a); sfx.tap(); };
  $('[data-help]').onclick = () => {
    const p = session[idx]; helped = true;
    const plan = planMoves(p.a, p.b, p.op);
    const list = $('[data-plan]');
    list.innerHTML = plan.steps.map(s => `<li>${esc(s.say)}</li>`).join('') + `<li class="watch"><button class="btn small" data-watch>▶ Watch Babi do it</button></li>`;
    list.hidden = false; $('[data-watch]').onclick = watch;
    setBubble(plan.steps[0].say, 'talk');
  };
  $('[data-check]').onclick = async () => {
    const p = session[idx];
    if (v.value === p.answer) {
      const clean = tries === 0 && !helped; if (clean) firstTry++;
      results.push(clean); recordAnswer(p, clean);
      $$('[data-dots] i')[idx].classList.add(clean ? 'gold' : 'ok');
      v.lock(); v.celebrate(); sfx.good(); buttons().forEach(b => b.disabled = true);
      setBubble(`${cheer('good')} ${p.a} ${sign(p.op)} ${p.b} = ${p.answer}`, 'cheer', false);
      await wait(1300); if (!alive(t)) return;
      idx++; if (idx < session.length) show(); else end();
    } else {
      tries++; v.shake(); sfx.oops();
      if (tries === 1) { recordMistake(p, v.value); setBubble(`The abacus says ${v.value}. We need ${p.a} ${sign(p.op)} ${p.b}. Try again!`, 'think'); }
      else if (tries === 2) { setBubble(`Clue: ${planMoves(p.a, p.b, p.op).steps[0].say}`, 'think'); $('[data-help]').classList.add('pulse'); }
      else { setBubble("Let's watch Babi do this one together.", 'happy'); watch(); }
    }
  };
  show();

  function end() {
    const s = starsFor(firstTry, session.length);
    const rec = state.levels[id] || { stars: 0, best: 0, plays: 0 };
    rec.plays++; rec.stars = Math.max(rec.stars, s); rec.best = Math.max(rec.best, firstTry); state.levels[id] = rec;
    state.stats.seconds += Math.min(1800, Math.round((Date.now() - started) / 1000));
    let unlockedNew = false;
    if (s >= 1 && id === state.unlocked && id < MAX_LEVEL) { state.unlocked = id + 1; unlockedNew = true; }
    const canNext = id < MAX_LEVEL && id + 1 <= state.unlocked;
    saveNow();
    if (s >= 2) { sfx.star(); confetti(); } else sfx.good();
    const msg = s === 3 ? 'Perfect beads!' : s === 2 ? 'Great work!' : s === 1 ? 'Good job — keep going!' : 'You worked hard! Practise again to get a star.';
    $('.view').innerHTML = `
      <section class="done-card">
        ${babi(s ? 'cheer' : 'happy', 'big bob')}
        <h2 class="display">${msg}</h2>
        <div class="big-stars">${stars(s)}</div>
        <p class="lead"><b>${firstTry}</b> of ${session.length} right on the first try</p>
        ${unlockedNew ? `<p class="unlock">🎉 Level ${id + 1}: ${esc(LEVELS[id + 1].name)} is open!</p>` : ''}
        <div class="stack">
          ${canNext ? `<a class="btn primary wide" href="#/level/${id + 1}">Next level →</a>` : ''}
          <button class="btn ${canNext ? '' : 'primary'} wide" data-again>↺ Play this level again</button>
          <a class="btn ghost wide" href="#/home">Home</a>
        </div>
      </section>`;
    $('[data-again]').onclick = () => practice(id);
    say(msg);
  }
}

// Quick check for kids who already know the abacus.
function check() {
  const t = ++token; clearTimers();
  const probe = [1, 3, 5, 6, 8, 9];
  const qs = probe.map(l => ({ l, ...makeSession(l, 1)[0] }));
  let idx = 0; let passedUntil = 0; let failed = false;
  shell({ title: 'Quick Check', back: '#/home', body: `
    ${bubble("Let's see what you already know. 6 quick sums!", 'happy')}
    <div class="dots" data-dots>${qs.map(() => '<i></i>').join('')}</div>
    <div class="equation big" data-eq></div>
    <div data-abacus></div>
    <div class="row center"><button class="btn" data-reset>↺ Reset</button><button class="btn" data-skip>I don't know</button><button class="btn primary" data-check>✓ Check</button></div>` });

  const v = createAbacus($('[data-abacus]'), { rods: 2 });
  const show = () => { const p = qs[idx]; $('[data-eq]').innerHTML = `${p.a} ${sign(p.op)} ${p.b} = <b>?</b>`; v.set(p.a); $$('[data-dots] i').forEach((d, k) => d.classList.toggle('now', k === idx)); say(`${p.a} ${sign(p.op)} ${p.b}`); };
  const next = ok => {
    $$('[data-dots] i')[idx].classList.add(ok ? 'gold' : 'miss');
    if (ok && !failed) passedUntil = qs[idx].l; else failed = true;
    idx++;
    if (idx < qs.length && !failed) return show();
    const lvl = Math.max(1, Math.min(MAX_LEVEL, passedUntil ? passedUntil + 1 : 1));
    state.unlocked = Math.max(state.unlocked, lvl);
    // lessons before that level count as known
    LESSONS.forEach(l => { if (l.unlocks.length && Math.max(...l.unlocks) < lvl + 0 && !lessonDone(l.id)) state.lessonsDone.push(l.id); });
    if (lvl > 1) [1, 2, 3, 4, 5].forEach(k => { if (!lessonDone(k)) state.lessonsDone.push(k); });
    markDay(); saveNow(); sfx.star(); confetti();
    $('.view').innerHTML = `<section class="done-card">${babi('cheer', 'big bob')}<h2 class="display">Nice, ${kidName()}!</h2>
      <p class="lead">You can start at <b>Level ${lvl}: ${esc(LEVELS[lvl].name)}</b>.</p>
      <div class="stack"><a class="btn primary wide" href="#/level/${lvl}">Start Level ${lvl} →</a><a class="btn ghost wide" href="#/home">Home</a></div></section>`;
    say(`Great! You can start at level ${lvl}.`);
  };
  $('[data-reset]').onclick = () => v.set(qs[idx].a);
  $('[data-skip]').onclick = () => next(false);
  $('[data-check]').onclick = () => { const ok = v.value === qs[idx].answer; ok ? sfx.good() : sfx.oops(); next(ok); };
  show();
}

// ---------- Play ----------
function play() {
  shell({ title: 'Play', back: '#/home', body: `
    ${bubble('Pick a game! They use the same bead skills you learn.', 'happy')}
    <div class="games">
      <a class="game race" href="#/game/race"><span>🏁</span><b>Bead Race</b><small>Solve as many as you can in 60 seconds</small><em>Best: ${state.games.race}</em></a>
      <a class="game mystery" href="#/game/mystery"><span>🔍</span><b>Mystery Number</b><small>Read Babi's beads</small><em>Best: ${state.games.mystery}/10</em></a>
      <a class="game match" href="#/game/match"><span>🃏</span><b>Bead Match</b><small>Match numbers to bead pictures</small><em>Best: ${state.games.match ? state.games.match + ' moves' : '—'}</em></a>
    </div>` });

}

function race() {
  const t = token; let score = 0, time = 60, running = false, p;
  const lvl = Math.max(1, Math.min(state.unlocked, 10));
  const pool = problemPool(lvl).concat(lvl > 2 ? problemPool(lvl - 1) : []);
  const pick = () => pool[Math.floor(Math.random() * pool.length)];
  shell({ title: 'Bead Race', back: '#/play', cls: 'practice', body: `
    <div class="race-bar"><span class="chip">⏱ <b data-time>60</b>s</span><div class="track"><i data-track></i></div><span class="chip gold">★ <b data-score>0</b></span></div>
    <div class="equation big" data-eq>Ready?</div>
    <div data-abacus></div>
    <div class="row center" data-controls><button class="btn primary wide" data-go>Start the race! 🏁</button></div>
    <p class="muted center">No Check button — the answer counts the moment your beads are right!</p>` });
  const v = createAbacus($('[data-abacus]'), { rods: 2, interactive: false, onChange: n => {
    if (!running || n !== p.answer) return;
    score++; sfx.good(); v.celebrate(); $('[data-score]').textContent = score;
    newQ();
  } });
  const newQ = () => { p = pick(); $('[data-eq]').innerHTML = `${p.a} ${sign(p.op)} ${p.b} = <b>?</b>`; v.set(p.a); };
  $('[data-go]').onclick = () => {
    running = true; v.lock(false); newQ();
    $('[data-controls]').innerHTML = `<button class="btn" data-skipq>Skip ⏭</button>`;
    $('[data-skipq]').onclick = () => { sfx.tap(); newQ(); };
    every(() => {
      if (!alive(t)) return clearTimers();
      time--; $('[data-time]').textContent = time; $('[data-track]').style.width = `${((60 - time) / 60) * 100}%`;
      if (time <= 0) {
        running = false; clearTimers(); v.lock();
        const best = score > state.games.race; if (best) { state.games.race = score; saveNow(); }
        markDay(); sfx.star(); if (score) confetti();
        $('.view').innerHTML = `<section class="done-card">${babi('cheer', 'big bob')}<h2 class="display">Time's up!</h2>
          <p class="lead">You solved <b>${score}</b> sum${score === 1 ? '' : 's'}.${best ? ' New best! 🏆' : ''}</p>
          <div class="stack"><button class="btn primary wide" data-again>Race again 🏁</button><a class="btn ghost wide" href="#/play">Other games</a></div></section>`;
        $('[data-again]').onclick = () => { token++; race(); };
        say(`Time's up! You solved ${score}.`);
      }
    }, 1000);
  };
}

function mystery() {
  const t = token; let round = 0, score = 0, target;
  shell({ title: 'Mystery Number', back: '#/play', body: `
    <div class="dots" data-dots>${Array.from({ length: 10 }, () => '<i></i>').join('')}</div>
    ${bubble('What number are the beads showing?', 'think')}
    <div data-abacus></div>
    <div class="options" data-opts></div>` });

  const v = createAbacus($('[data-abacus]'), { rods: 2, interactive: false, readout: false, digits: false });
  const ask = () => {
    const max = round < 4 ? 9 : 99;
    target = 1 + Math.floor(Math.random() * max); v.set(target);
    const opts = new Set([target]);
    // tricky wrong answers: swapped digits, ±1, ±5
    [Number(String(target).split('').reverse().join('')), target + 1, target - 1, target + 5, target - 5, target + 10].forEach(n => { if (opts.size < 3 && n > 0 && n <= 99 && n !== target) opts.add(n); });
    const list = [...opts].sort(() => Math.random() - .5);
    let firstGo = true;
    $$('[data-dots] i').forEach((d, k) => d.classList.toggle('now', k === round));
    $('[data-opts]').innerHTML = list.map(o => `<button class="opt" data-opt="${o}">${o}</button>`).join('');
    $$('[data-opt]').forEach(b => b.onclick = async () => {
      if (+b.dataset.opt === target) {
        if (firstGo) score++;
        $$('[data-dots] i')[round].classList.add(firstGo ? 'gold' : 'ok');
        b.classList.add('right'); $$('[data-opt]').forEach(x => x.disabled = true); sfx.good(); v.celebrate();
        setBubble(`${cheer('good')} It's ${target}.`, 'cheer', false);
        await wait(1100); if (!alive(t)) return;
        round++; if (round < 10) { setBubble('What number is this?', 'think', false); ask(); } else finish();
      } else { firstGo = false; b.classList.add('wrong'); b.disabled = true; sfx.oops(); setBubble('Look again: top bead is 5, little beads are 1. Tens on the left!', 'think'); }
    });
  };
  const finish = () => {
    const best = score > state.games.mystery; if (best) state.games.mystery = score; markDay(); saveNow(); sfx.star(); confetti();
    $('.view').innerHTML = `<section class="done-card">${babi('cheer', 'big bob')}<h2 class="display">${score}/10!</h2><p class="lead">${best ? 'New best score! 🏆' : 'Great bead reading!'}</p>
      <div class="stack"><button class="btn primary wide" data-again>Play again</button><a class="btn ghost wide" href="#/play">Other games</a></div></section>`;
    $('[data-again]').onclick = () => { token++; mystery(); };
  };
  ask(); say('What number are the beads showing?');
}

function match() {
  const t = token; let open = [], moves = 0, locked = false;
  const nums = [...new Set(Array.from({ length: 20 }, () => 1 + Math.floor(Math.random() * (state.unlocked >= 3 ? 40 : 9))))].slice(0, 6);
  while (nums.length < 6) { const n = 1 + Math.floor(Math.random() * 9); if (!nums.includes(n)) nums.push(n); }
  const cards = nums.flatMap(n => [{ id: 'n' + n, n, kind: 'num' }, { id: 'b' + n, n, kind: 'beads' }]).sort(() => Math.random() - .5);
  const matched = new Set();
  shell({ title: 'Bead Match', back: '#/play', body: `
    <div class="race-bar"><span class="chip">Pairs <b data-pairs>0</b>/6</span><span class="chip">Moves <b data-moves>0</b></span></div>
    <p class="muted center">Flip two cards. Find a number and its bead picture!</p>
    <div class="memory">${cards.map(c => `<button class="mcard" data-card="${c.id}" aria-label="Hidden card"><span class="back">?</span><span class="face">${c.kind === 'num' ? `<b>${c.n}</b>` : miniAbacus(c.n)}</span></button>`).join('')}</div>` });
  $$('[data-card]').forEach(btn => btn.onclick = async () => {
    const c = cards.find(x => x.id === btn.dataset.card);
    if (locked || matched.has(c.n) || open.some(o => o.id === c.id)) return;
    btn.classList.add('flip'); sfx.tap(); open.push(c);
    if (open.length < 2) return;
    moves++; $('[data-moves]').textContent = moves;
    const [x, y] = open;
    if (x.n === y.n) {
      matched.add(x.n); sfx.good(); open = [];
      $$(`[data-card="n${x.n}"], [data-card="b${x.n}"]`).forEach(el => el.classList.add('matched'));
      $('[data-pairs]').textContent = matched.size;
      if (matched.size === 6) {
        await wait(700); if (!alive(t)) return;
        const best = !state.games.match || moves < state.games.match; if (best) state.games.match = moves; markDay(); saveNow(); sfx.star(); confetti();
        $('.view').innerHTML = `<section class="done-card">${babi('cheer', 'big bob')}<h2 class="display">All matched!</h2><p class="lead"><b>${moves}</b> moves${best ? ' — new best! 🏆' : ''}</p>
          <div class="stack"><button class="btn primary wide" data-again>Play again</button><a class="btn ghost wide" href="#/play">Other games</a></div></section>`;
        $('[data-again]').onclick = () => { token++; match(); };
      }
    } else {
      locked = true; await wait(900); if (!alive(t)) return;
      $$(`[data-card="${x.id}"], [data-card="${y.id}"]`).forEach(el => el.classList.remove('flip'));
      open = []; locked = false;
    }
  });
}

// ---------- Grown-ups ----------
function parents() {
  const a = 3 + Math.floor(Math.random() * 6), b = 4 + Math.floor(Math.random() * 5), ans = a * b;
  const opts = [ans, ans + a, ans - b].sort(() => Math.random() - .5);
  shell({ title: 'Grown-ups', back: '#/home', body: `
    <section class="card intro">
      <p class="eyebrow">For parents & teachers</p>
      <h2 class="display">Quick grown-up check</h2>
      <p class="lead">What is ${a} × ${b}?</p>
      <div class="options">${opts.map(o => `<button class="opt" data-gate="${o}">${o}</button>`).join('')}</div>
    </section>` });
  $$('[data-gate]').forEach(btn => btn.onclick = () => +btn.dataset.gate === ans ? dashboard() : (btn.classList.add('wrong'), btn.disabled = true));
}

function dashboard() {
  const st = state.stats;
  const acc = st.answered ? Math.round((st.firstTry / st.answered) * 100) : 0;
  const ruleName = { direct: 'Simple beads', small: 'Little Friends (5)', big: 'Big Friends (10)' };
  const rules = Object.entries(st.byRule).map(([k, [c, n]]) => ({ k, c, n, pct: n ? Math.round((c / n) * 100) : null }));
  const weak = rules.filter(r => r.n >= 4).sort((x, y) => x.pct - y.pct)[0];
  const week = Array.from({ length: 7 }, (_, k) => { const d = new Date(); d.setDate(d.getDate() - (6 - k)); const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; return { on: st.days.includes(key), label: d.toLocaleDateString('en', { weekday: 'narrow' }) }; });
  const mins = Math.round(st.seconds / 60);
  let tip = 'Start with the Learn path — lessons are 2–3 minutes each.';
  if (st.answered >= 8) tip = weak && weak.pct < 70 ? `Focus on ${ruleName[weak.k]}: ${weak.pct}% first-try. Ask ${esc(state.profile.name)} to say the friend pair out loud before moving beads.` : `Doing well! Try Bead Race for speed, then move to Level ${Math.min(state.unlocked, MAX_LEVEL)}.`;

  shell({ title: 'Grown-ups', back: '#/home', cls: 'parents', body: `
    <section class="card">
      <p class="eyebrow">Progress for ${esc(state.profile.avatar)} ${kidName()}</p>
      <div class="kpis">
        <div><b>${state.lessonsDone.length}/${LESSONS.length}</b><small>lessons</small></div>
        <div><b>${Math.min(state.unlocked, MAX_LEVEL)}</b><small>current level</small></div>
        <div><b>${acc}%</b><small>first-try right</small></div>
        <div><b>${mins}</b><small>minutes practised</small></div>
      </div>
      <p class="tip">💡 ${tip}</p>
    </section>
    <section class="card">
      <h3>This week</h3>
      <div class="week">${week.map(d => `<span class="${d.on ? 'on' : ''}"><i></i>${d.label}</span>`).join('')}</div>
    </section>
    <section class="card">
      <h3>Tricks</h3>
      ${rules.map(r => `<div class="bar-row"><span>${ruleName[r.k]}</span><div class="bar"><i style="width:${r.pct ?? 0}%"></i></div><b>${r.pct == null ? '—' : r.pct + '%'}</b></div><p class="muted tiny">${r.n} sums tried</p>`).join('')}
    </section>
    <section class="card">
      <h3>Levels</h3>
      <div class="lv-table">${LEVELS.slice(1).map(L => `<div class="${L.id > state.unlocked ? 'dim' : ''}"><span>${L.id}. ${esc(L.name)}</span>${stars(state.levels[L.id]?.stars || 0)}</div>`).join('')}</div>
    </section>
    <section class="card">
      <h3>Recent mix-ups</h3>
      ${st.mistakes.length ? `<ul class="mistakes">${st.mistakes.slice(0, 6).map(m => `<li><b>${esc(m.q)} = ${m.answer}</b><span>built ${m.given}</span><em>${ruleName[m.rule] || ''}</em></li>`).join('')}</ul>` : '<p class="muted">No mix-ups yet.</p>'}
    </section>
    <section class="card settings">
      <h3>Settings</h3>
      <label class="switch"><input type="checkbox" id="setSound" ${state.settings.sound ? 'checked' : ''}> Sound effects</label>
      <label class="switch"><input type="checkbox" id="setVoice" ${state.settings.voice ? 'checked' : ''}> Babi talks out loud</label>
      <label class="switch"><input type="checkbox" id="setTamil" ${state.profile.lang === 'ta' ? 'checked' : ''}> Cheers in Tamil (needs a Tamil voice on the device)</label>
      <label for="setName">Child's name</label><input id="setName" maxlength="18" value="${esc(state.profile.name)}">
      <div class="row"><button class="btn" id="unlockAll">Unlock all levels</button><button class="btn danger" id="reset">Reset all progress</button></div>
    </section>
    <p class="muted center tiny">Everything is saved only on this device. No accounts, no ads.</p>` });
  $('#setSound').onchange = e => { state.settings.sound = e.target.checked; save(); };
  $('#setVoice').onchange = e => { state.settings.voice = e.target.checked; if (!e.target.checked) stopTalking(); save(); };
  $('#setTamil').onchange = e => { state.profile.lang = e.target.checked ? 'ta' : 'en'; save(); cheer('good'); };
  $('#setName').onchange = e => { const n = e.target.value.trim(); if (n) { state.profile.name = n.slice(0, 18); save(); } };
  $('#unlockAll').onclick = e => { state.unlocked = MAX_LEVEL; save(); e.currentTarget.textContent = 'All levels open ✓'; e.currentTarget.disabled = true; };
  $('#reset').onclick = e => {
    const b = e.currentTarget;
    if (b.dataset.sure) { resetAll(); go('#/'); return; }
    b.dataset.sure = '1'; b.textContent = 'Tap again to erase everything'; setTimeout(() => { b.textContent = 'Reset all progress'; delete b.dataset.sure; }, 4000);
  };
}

// ---------- router ----------
function route() {
  token++; clearTimers(); stopTalking(); document.querySelectorAll('.confetti').forEach(c => c.remove());
  const hash = location.hash.replace(/^#\/?/, '');
  const [page, arg] = hash.split('/');
  if (!state.profile?.name) return welcome();
  const n = Number(arg);
  const pages = {
    '': home, home, free, stickers, learn: learnMap, practice: practiceMap, play, parents, check,
    lesson: () => lesson(n), level: () => levelIntro(n),
    game: () => ({ race, mystery, match }[arg] || play)(),
  };
  (pages[page] || home)();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.__NO_SW__) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
