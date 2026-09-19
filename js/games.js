// The playroom. Every game trains a real abacus skill, and every game has three levels of challenge:
// Kid (gentle), Star (school age) and Master (hard enough for grown-ups).
import { makeSession, problemPool, sign, makeAbacus, valueOf, LEVELS, MAX_LEVEL } from './engine.js';
import { state, save, saveNow, markDay } from './store.js';
import { sfx } from './sound.js';
import { createAbacus, miniAbacus } from './abacusView.js';
import { babi } from './babi.js';
import { isOn } from './config.js';
import { $, $$, shell, bubble, setBubble, confetti, say, T, V, wait, alive, currentToken, newToken, every, clearTimers, esc, lang, voiceLang, go } from './ui.js';

const rnd = n => Math.floor(Math.random() * n);
const pickOne = a => a[rnd(a.length)];
const MODES = [
  { id: 'kid', nameKey: 'modeKid', emoji: '🐣' },
  { id: 'star', nameKey: 'modeStar', emoji: '⭐' },
  { id: 'master', nameKey: 'modeMaster', emoji: '🔥' },
];
const modeName = m => T(m.nameKey);

export const GAMES = [
  { id: 'race', flag: 'gameRace', emoji: '🏁', name: 'Bead Race', desc: 'Solve as many sums as you can in 60 seconds', best: 'sums', cls: 'race' },
  { id: 'mystery', flag: 'gameMystery', emoji: '🔍', name: 'Mystery Number', desc: "Read Babi's beads", best: '/10', cls: 'mystery' },
  { id: 'match', flag: 'gameMatch', emoji: '🃏', name: 'Bead Match', desc: 'Match numbers to bead pictures', best: 'moves', cls: 'match' },
  { id: 'flash', flag: 'gameFlash', emoji: '⚡', name: 'Flash Maths', desc: 'Numbers flash — add them in your head', best: '/8', cls: 'flash' },
  { id: 'speed', flag: 'gameSpeedRead', emoji: '👀', name: 'Blink Beads', desc: 'Beads appear for a blink. What was the number?', best: '/10', cls: 'speed' },
  { id: 'friend', flag: 'gameFriendDash', emoji: '🤝', name: 'Friend Dash', desc: 'Tap the friend that completes 5 or 10', best: 'pairs', cls: 'friend' },
  { id: 'ladder', flag: 'gameLadder', emoji: '🪜', name: 'Bead Ladder', desc: 'Climb as high as you can — it keeps getting harder', best: 'rungs', cls: 'ladder' },
];

const bestOf = (id, mode) => state.games[`${id}_${mode}`] ?? (mode === 'star' ? state.games[id] : undefined) ?? 0;
function saveBest(id, mode, value, lower = false) {
  const key = `${id}_${mode}`, old = state.games[key];
  const better = old == null || old === 0 || (lower ? value < old : value > old);
  if (better) { state.games[key] = value; if (mode === 'star') state.games[id] = value; }
  markDay(); saveNow();
  return better;
}

export function playRoom() {
  const games = GAMES.filter(g => isOn(g.flag));
  shell({ title: 'Play', back: '#/home', body: `
    ${bubble(T('pickGame'), 'happy')}
    <div class="games">${games.map(g => `<a class="game ${g.cls}" href="#/game/${g.id}"><span>${g.emoji}</span><b>${esc(g.name)}</b><small>${esc(g.desc)}</small><em>Best: ${bestOf(g.id, 'star') || '—'} ${g.best}</em></a>`).join('')}</div>
    ${games.length ? '' : '<p class="muted center">Games are switched off right now.</p>'}` });
}

/** Every game starts here: pick how hard you want it. */
function modePicker(game, start) {
  shell({ title: game.name, back: '#/play', body: `
    ${bubble(`${game.desc}. How hard do you want it?`, 'happy')}
    <div class="modes">${MODES.map(m => `<button class="mode" data-mode="${m.id}"><span>${m.emoji}</span><b>${modeName(m)}</b><em>Best: ${bestOf(game.id, m.id) || '—'}</em></button>`).join('')}</div>` });
  $$('[data-mode]').forEach(b => b.onclick = () => { sfx.tap(); start(b.dataset.mode); });
}

function gameOver({ game, mode, title, line, best, again }) {
  sfx.star(); if (best) confetti();
  $('.view').innerHTML = `<section class="done-card">${babi('cheer', 'big bob')}
    <h2 class="display">${esc(title)}</h2>
    <p class="lead">${line}${best ? ' <b>New best! 🏆</b>' : ''}</p>
    <div class="stack">
      <button class="btn primary wide" data-again>Play again</button>
      <button class="btn wide" data-modes>Change difficulty</button>
      <a class="btn ghost wide" href="#/play">Other games</a>
    </div></section>`;
  $('[data-again]').onclick = () => { newToken(); clearTimers(); again(mode); };
  $('[data-modes]').onclick = () => { newToken(); clearTimers(); modePicker(game, again); };
  say(voiceLang() === 'ta' ? V('gameDone') : title);
}

const G = id => GAMES.find(g => g.id === id);

/* ---------------- 1. Bead Race ---------------- */
export const race = (mode) => mode ? runRace(mode) : modePicker(G('race'), runRace);
function runRace(mode) {
  const tok = currentToken();
  const top = mode === 'kid' ? Math.min(4, state.unlocked) : mode === 'star' ? Math.min(10, Math.max(3, state.unlocked)) : MAX_LEVEL;
  const pool = problemPool(top).concat(problemPool(Math.max(1, top - 1)));
  let score = 0, time = 60, running = false, p = null;
  shell({ title: 'Bead Race', back: '#/play', cls: 'practice', body: `
    <div class="race-bar"><span class="chip">⏱ <b data-time>60</b>s</span><div class="track"><i data-track></i></div><span class="chip gold">★ <b data-score>0</b></span></div>
    <div class="equation big" data-eq>Ready?</div>
    <div data-abacus></div>
    <div class="row center" data-controls><button class="btn primary wide" data-go>Start the race! 🏁</button></div>
    <p class="muted center">No Check button — a sum counts the moment your beads are right.</p>` });
  const v = createAbacus($('[data-abacus]'), { rods: top > 7 ? 2 : 2, interactive: false, onChange: n => {
    if (!running || !p || n !== p.answer) return;
    score++; sfx.good(); v.celebrate(); $('[data-score]').textContent = score; newQ();
  } });
  const newQ = () => { p = pickOne(pool); $('[data-eq]').innerHTML = `${p.a} ${sign(p.op)} ${p.b} = <b>?</b>`; v.set(p.a); };
  $('[data-go]').onclick = () => {
    running = true; v.lock(false); newQ();
    $('[data-controls]').innerHTML = `<button class="btn" data-skipq>Skip ⏭</button>`;
    $('[data-skipq]').onclick = () => { sfx.tap(); newQ(); };
    every(() => {
      if (!alive(tok)) return clearTimers();
      time--; $('[data-time]').textContent = time; $('[data-track]').style.width = `${((60 - time) / 60) * 100}%`;
      if (time > 0) return;
      running = false; clearTimers(); v.lock();
      const best = saveBest('race', mode, score);
      gameOver({ game: G('race'), mode, title: "Time's up!", line: `You solved <b>${score}</b> sum${score === 1 ? '' : 's'}.`, best, again: runRace });
    }, 1000);
  };
}

/* ---------------- 2. Mystery Number ---------------- */
export const mystery = (mode) => mode ? runMystery(mode) : modePicker(G('mystery'), runMystery);
function runMystery(mode) {
  const tok = currentToken();
  const rods = mode === 'master' ? 3 : 2;
  const max = mode === 'kid' ? 9 : mode === 'star' ? 99 : 999;
  let round = 0, score = 0, target = 1;
  shell({ title: 'Mystery Number', back: '#/play', body: `
    <div class="dots" data-dots>${Array.from({ length: 10 }, () => '<i></i>').join('')}</div>
    ${bubble(T('mysteryQ'), 'think')}
    <div data-abacus></div>
    <div class="options" data-opts></div>` });
  const v = createAbacus($('[data-abacus]'), { rods, interactive: false, readout: false, digits: false });
  const ask = () => {
    target = 1 + rnd(max); v.set(target);
    const opts = new Set([target]);
    [Number(String(target).split('').reverse().join('')), target + 1, target - 1, target + 5, target + 10, target - 10].forEach(n => { if (opts.size < 3 && n > 0 && n <= max && n !== target) opts.add(n); });
    while (opts.size < 3) { const n = 1 + rnd(max); if (n !== target) opts.add(n); }
    let clean = true;
    $$('[data-dots] i').forEach((d, k) => d.classList.toggle('now', k === round));
    $('[data-opts]').innerHTML = [...opts].sort(() => Math.random() - .5).map(o => `<button class="opt" data-opt="${o}">${o}</button>`).join('');
    $$('[data-opt]').forEach(b => b.onclick = async () => {
      if (+b.dataset.opt === target) {
        if (clean) score++;
        $$('[data-dots] i')[round].classList.add(clean ? 'gold' : 'ok');
        b.classList.add('right'); $$('[data-opt]').forEach(x => x.disabled = true); sfx.good(); v.celebrate();
        setBubble(`${T('praise')} ${T('itIs', target)}`, 'cheer', true, `${V('praise')} ${V('itIs', target)}`);
        await wait(1000); if (!alive(tok)) return;
        round++;
        if (round < 10) { setBubble(T('mysteryQ'), 'think', false, V('mysteryQ')); ask(); }
        else gameOver({ game: G('mystery'), mode, title: `${score}/10!`, line: 'Great bead reading.', best: saveBest('mystery', mode, score), again: runMystery });
      } else { clean = false; b.classList.add('wrong'); b.disabled = true; sfx.oops(); setBubble(T('mysteryHint'), 'think', true, V('mysteryHint')); }
    });
  };
  ask(); say(V('mysteryQ'));
}

/* ---------------- 3. Bead Match ---------------- */
export const match = (mode) => mode ? runMatch(mode) : modePicker(G('match'), runMatch);
function runMatch(mode) {
  const tok = currentToken();
  const pairs = mode === 'kid' ? 4 : 6;
  const max = mode === 'kid' ? 9 : mode === 'star' ? 40 : 99;
  const nums = []; while (nums.length < pairs) { const n = 1 + rnd(max); if (!nums.includes(n)) nums.push(n); }
  const cards = nums.flatMap(n => [{ id: 'n' + n, n, kind: 'num' }, { id: 'b' + n, n, kind: 'beads' }]).sort(() => Math.random() - .5);
  const done = new Set(); let open = [], moves = 0, locked = false;
  shell({ title: 'Bead Match', back: '#/play', body: `
    <div class="race-bar"><span class="chip">Pairs <b data-pairs>0</b>/${pairs}</span><span class="chip">Moves <b data-moves>0</b></span></div>
    <p class="muted center">Flip two cards. Find a number and its bead picture.</p>
    <div class="memory">${cards.map(c => `<button class="mcard" data-card="${c.id}" aria-label="Hidden card"><span class="back">?</span><span class="face">${c.kind === 'num' ? `<b>${c.n}</b>` : miniAbacus(c.n, c.n > 99 ? 3 : 2)}</span></button>`).join('')}</div>` });
  $$('[data-card]').forEach(btn => btn.onclick = async () => {
    const c = cards.find(x => x.id === btn.dataset.card);
    if (locked || done.has(c.n) || open.some(o => o.id === c.id)) return;
    btn.classList.add('flip'); sfx.tap(); open.push(c);
    if (open.length < 2) return;
    moves++; $('[data-moves]').textContent = moves;
    const [x, y] = open;
    if (x.n === y.n) {
      done.add(x.n); sfx.good(); open = [];
      $$(`[data-card="n${x.n}"], [data-card="b${x.n}"]`).forEach(el => el.classList.add('matched'));
      $('[data-pairs]').textContent = done.size;
      if (done.size === pairs) {
        await wait(700); if (!alive(tok)) return;
        gameOver({ game: G('match'), mode, title: 'All matched!', line: `<b>${moves}</b> moves.`, best: saveBest('match', mode, moves, true), again: runMatch });
      }
    } else {
      locked = true; await wait(850); if (!alive(tok)) return;
      $$(`[data-card="${x.id}"], [data-card="${y.id}"]`).forEach(el => el.classList.remove('flip'));
      open = []; locked = false;
    }
  });
}

/* ---------------- 4. Flash Maths (mental maths, no abacus) ---------------- */
export const flash = (mode) => mode ? runFlash(mode) : modePicker(G('flash'), runFlash);
function runFlash(mode) {
  const tok = currentToken();
  const setup = { kid: { count: 3, max: 9, gap: 1300, sub: false }, star: { count: 5, max: 9, gap: 950, sub: true }, master: { count: 7, max: 19, gap: 650, sub: true } }[mode];
  let round = 0, score = 0;
  shell({ title: 'Flash Maths', back: '#/play', cls: 'flashgame', body: `
    <div class="dots" data-dots>${Array.from({ length: 8 }, () => '<i></i>').join('')}</div>
    ${bubble('Watch the numbers and add them in your head. No abacus!', 'think')}
    <div class="flash-stage" data-stage>Ready?</div>
    <div class="options" data-opts hidden></div>
    <div class="row center" data-controls><button class="btn primary wide" data-go>Start ▶</button></div>` });

  const ask = async () => {
    $('[data-opts]').hidden = true; $('[data-controls]').innerHTML = '';
    const nums = [];
    let total = 0;
    for (let i = 0; i < setup.count; i++) {
      let n = 1 + rnd(setup.max);
      if (setup.sub && i > 0 && Math.random() < 0.35 && total - n >= 0) n = -n;
      nums.push(n); total += n;
    }
    for (const n of nums) {
      $('[data-stage]').textContent = (n > 0 ? '+' : '−') + Math.abs(n);
      $('[data-stage]').className = `flash-stage show ${n > 0 ? 'plus' : 'minus'}`;
      sfx.tap();
      await wait(setup.gap * 0.72); if (!alive(tok)) return;
      $('[data-stage]').className = 'flash-stage';
      await wait(setup.gap * 0.28); if (!alive(tok)) return;
    }
    $('[data-stage]').textContent = '= ?';
    const opts = new Set([total]);
    while (opts.size < 4) { const d = pickOne([-10, -5, -2, -1, 1, 2, 5, 10]); if (total + d >= 0) opts.add(total + d); }
    const list = [...opts].sort((a, b) => a - b);
    $('[data-opts]').hidden = false;
    $('[data-opts]').innerHTML = list.map(o => `<button class="opt" data-opt="${o}">${o}</button>`).join('');
    $$('[data-opt]').forEach(b => b.onclick = async () => {
      const right = +b.dataset.opt === total;
      $$('[data-opt]').forEach(x => x.disabled = true);
      b.classList.add(right ? 'right' : 'wrong');
      $$('[data-dots] i')[round].classList.add(right ? 'gold' : 'miss');
      if (right) { score++; sfx.good(); setBubble(T('praise'), 'cheer', true, V('praise')); }
      else { sfx.oops(); setBubble(T('wasNumber', total), 'think', true, V('wasNumber', total)); }
      await wait(1100); if (!alive(tok)) return;
      round++;
      if (round < 8) ask();
      else gameOver({ game: G('flash'), mode, title: `${score}/8 in your head!`, line: 'Mental maths is the real abacus superpower.', best: saveBest('flash', mode, score), again: runFlash });
    });
  };
  $('[data-go]').onclick = ask;
}

/* ---------------- 5. Blink Beads (see it, read it) ---------------- */
export const speed = (mode) => mode ? runSpeed(mode) : modePicker(G('speed'), runSpeed);
function runSpeed(mode) {
  const tok = currentToken();
  const setup = { kid: { rods: 1, max: 9, ms: 1600 }, star: { rods: 2, max: 99, ms: 1100 }, master: { rods: 3, max: 999, ms: 650 } }[mode];
  let round = 0, score = 0, target = 1;
  shell({ title: 'Blink Beads', back: '#/play', body: `
    <div class="dots" data-dots>${Array.from({ length: 10 }, () => '<i></i>').join('')}</div>
    ${bubble('The beads appear for a blink. What number was it?', 'think')}
    <div class="blink" data-wrap><div data-abacus></div><div class="blink-cover" data-cover>👀</div></div>
    <div class="options" data-opts hidden></div>
    <div class="row center" data-controls><button class="btn primary wide" data-go>Show me ▶</button></div>` });
  const v = createAbacus($('[data-abacus]'), { rods: setup.rods, interactive: false, readout: false, digits: false });
  const ask = async () => {
    $('[data-opts]').hidden = true; $('[data-controls]').innerHTML = '';
    target = 1 + rnd(setup.max); v.set(target);
    $$('[data-dots] i').forEach((d, k) => d.classList.toggle('now', k === round));
    $('[data-cover]').hidden = true; sfx.tap();
    await wait(setup.ms); if (!alive(tok)) return;
    $('[data-cover]').hidden = false; v.set(0);
    const opts = new Set([target]);
    // Build a finite option pool. The old random loop could become infinite
    // in Kid mode (max 9), leaving the game with no buttons after a blink.
    const candidates = [];
    for (let n = 1; n <= setup.max; n++) if (n !== target) candidates.push(n);
    candidates.sort((a, b) => Math.abs(a - target) - Math.abs(b - target) || a - b);
    for (const n of candidates) {
      if (opts.size >= 4) break;
      opts.add(n);
    }
    $('[data-opts]').hidden = false;
    $('[data-opts]').innerHTML = [...opts].sort((a, b) => a - b).map(o => `<button class="opt" data-opt="${o}">${o}</button>`).join('');
    $$('[data-opt]').forEach(b => b.onclick = async () => {
      const right = +b.dataset.opt === target;
      $$('[data-opt]').forEach(x => x.disabled = true); b.classList.add(right ? 'right' : 'wrong');
      $$('[data-dots] i')[round].classList.add(right ? 'gold' : 'miss');
      if (right) { score++; sfx.good(); setBubble(T('praise'), 'cheer', true, V('praise')); } else { sfx.oops(); v.set(target); $('[data-cover]').hidden = true; setBubble(T('wasNumberLook', target), 'think', true, V('wasNumberLook', target)); }
      await wait(right ? 900 : 1800); if (!alive(tok)) return;
      round++;
      if (round < 10) ask();
      else gameOver({ game: G('speed'), mode, title: `${score}/10 blinks!`, line: 'Sharp eyes.', best: saveBest('speed', mode, score), again: runSpeed });
    });
  };
  $('[data-go]').onclick = ask;
}

/* ---------------- 6. Friend Dash (complements against the clock) ---------------- */
export const friend = (mode) => mode ? runFriend(mode) : modePicker(G('friend'), runFriend);
function runFriend(mode) {
  const tok = currentToken();
  const kinds = mode === 'kid' ? [5] : mode === 'star' ? [10] : [5, 10, 100];
  let score = 0, time = 60, best = 0, streakNow = 0;
  shell({ title: 'Friend Dash', back: '#/play', body: `
    <div class="race-bar"><span class="chip">⏱ <b data-time>60</b>s</span><span class="chip gold">★ <b data-score>0</b></span><span class="chip">🔥 <b data-streak>0</b></span></div>
    ${bubble('Tap the number that completes the pair!', 'happy')}
    <div class="friend-q" data-q>—</div>
    <div class="options" data-opts></div>` });
  const ask = () => {
    const total = pickOne(kinds);
    const n = total === 100 ? (1 + rnd(9)) * 10 : 1 + rnd(total - 1);
    const right = total - n;
    const opts = new Set([right]);
    while (opts.size < 4) { const d = total === 100 ? pickOne([-30, -20, -10, 10, 20, 30]) : pickOne([-3, -2, -1, 1, 2, 3]); const o = right + d; if (o > 0 && o < total) opts.add(o); }
    $('[data-q]').innerHTML = `<b>${n}</b> + <span>?</span> = <b>${total}</b>`;
    $('[data-opts]').innerHTML = [...opts].sort(() => Math.random() - .5).map(o => `<button class="opt" data-opt="${o}">${o}</button>`).join('');
    $$('[data-opt]').forEach(b => b.onclick = () => {
      if (+b.dataset.opt === right) { score++; streakNow++; best = Math.max(best, streakNow); sfx.good(); $('[data-score]').textContent = score; $('[data-streak]').textContent = streakNow; ask(); }
      else { streakNow = 0; $('[data-streak]').textContent = 0; sfx.oops(); b.classList.add('wrong'); b.disabled = true; }
    });
  };
  ask();
  every(() => {
    if (!alive(tok)) return clearTimers();
    time--; $('[data-time]').textContent = time;
    if (time > 0) return;
    clearTimers();
    gameOver({ game: G('friend'), mode, title: `${score} pairs!`, line: `Best run without a mistake: <b>${best}</b>.`, best: saveBest('friend', mode, score), again: runFriend });
  }, 1000);
}

/* ---------------- 7. Bead Ladder (endless climb, 3 lives) ---------------- */
export const ladder = (mode) => mode ? runLadder(mode) : modePicker(G('ladder'), runLadder);
function runLadder(mode) {
  const tok = currentToken();
  const startLevel = mode === 'kid' ? 1 : mode === 'star' ? 3 : 8;
  const seconds = mode === 'kid' ? 20 : mode === 'star' ? 14 : 9;
  let rung = 0, lives = 3, p = null, time = seconds, ticking = null;
  shell({ title: 'Bead Ladder', back: '#/play', cls: 'practice', body: `
    <div class="race-bar"><span class="chip">🪜 Rung <b data-rung>1</b></span><span class="chip">⏱ <b data-time>${seconds}</b>s</span><span class="chip" data-lives>❤️❤️❤️</span></div>
    <div class="ladder-bar"><i data-fill></i></div>
    <div class="equation big" data-eq></div>
    <div data-abacus></div>
    <div class="row center"><button class="btn" data-reset>↺ Reset</button><button class="btn primary" data-check>✓ Check</button></div>
    ${bubble('Every 3 rungs it gets harder. How high can you climb?', 'happy')}` });
  const v = createAbacus($('[data-abacus]'), { rods: 2 });
  const levelFor = () => Math.min(MAX_LEVEL, startLevel + Math.floor(rung / 3));
  const next = () => {
    p = makeSession(levelFor(), 1)[0]; time = seconds;
    $('[data-rung]').textContent = rung + 1;
    $('[data-eq]').innerHTML = `${p.a} ${sign(p.op)} ${p.b} = <b>?</b>`;
    $('[data-time]').textContent = time;
    $('[data-fill]').style.height = `${Math.min(100, (rung / 30) * 100)}%`;
    v.set(p.a); v.lock(false);
  };
  const loseLife = () => {
    lives--; sfx.oops(); v.shake();
    $('[data-lives]').textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(3 - Math.max(0, lives));
    if (lives > 0) { setBubble(T('wasNumberClimb', p.answer), 'think', true, V('wasNumberClimb', p.answer)); next(); return; }
    clearTimers();
    gameOver({ game: G('ladder'), mode, title: `You reached rung ${rung}!`, line: `Hardest sums you beat: Level ${levelFor()}.`, best: saveBest('ladder', mode, rung), again: runLadder });
  };
  $('[data-reset]').onclick = () => { v.set(p.a); sfx.tap(); };
  $('[data-check]').onclick = () => {
    if (v.value === p.answer) { rung++; sfx.good(); v.celebrate(); setBubble(T('praise'), 'cheer', true, V('praise')); next(); }
    else loseLife();
  };
  next();
  ticking = every(() => {
    if (!alive(tok)) return clearTimers();
    time--; $('[data-time]').textContent = Math.max(0, time);
    if (time <= 0) loseLife();
  }, 1000);
}

const RUNNERS = { race, mystery, match, flash, speed, friend, ladder };

/** Open a game by id — but only if the owner console has it switched on. */
export function openGame(id) {
  const game = G(id);
  if (!game || !isOn(game.flag) || !RUNNERS[id]) return playRoom();
  RUNNERS[id]();
}

