// Tests, exams and competitions — the serious side of the app.
// Rules here are different from Practice on purpose: one answer per question, a clock, no hints,
// no "watch Babi". A pass earns a printable certificate.
import { LEVELS, MAX_LEVEL, makeSession, sign } from './engine.js';
import { state, save, saveNow, markDay } from './store.js';
import { sfx } from './sound.js';
import { createAbacus } from './abacusView.js';
import { babi } from './babi.js';
import { cfg, isOn, brand } from './config.js';
import { $, $$, shell, bubble, setBubble, confetti, say, T, wait, alive, currentToken, newToken, every, clearTimers, esc, mmss, lvName, kidName, go, stars } from './ui.js';

const rnd = n => Math.floor(Math.random() * n);
const passedLevels = () => LEVELS.slice(1).filter(L => (state.levels[L.id]?.stars || 0) >= 1).map(L => L.id);
const bestFor = id => state.exams.filter(r => r.id === id).reduce((b, r) => Math.max(b, r.pct), 0);
const everPassed = id => state.exams.some(r => r.id === id && r.passed);

/** What the child is allowed to sit right now. */
export function examList() {
  const done = passedLevels();
  const out = [];
  if (isOn('tests')) {
    LEVELS.slice(1).forEach(L => {
      if (!done.includes(L.id)) return;
      out.push({ id: `test${L.id}`, kind: 'abacus', level: L.id, emoji: '📝', title: `Level ${L.id} Test`, sub: lvName(L),
        questions: cfg().test.questions, minutes: cfg().test.minutes, passMark: cfg().test.passMark, group: 'test' });
    });
  }
  if (isOn('exams')) {
    const ready = done.length >= 4;
    out.push({ id: 'grand', kind: 'abacus', levels: done.length ? done : [1], emoji: '🎓', title: 'Grand Exam', sub: 'Everything you have learned',
      questions: cfg().exam.questions, minutes: cfg().exam.minutes, passMark: cfg().exam.passMark, group: 'exam', locked: !ready, need: 'Pass 4 levels first' });
    out.push({ id: 'mental', kind: 'mental', levels: done.length ? done : [1], emoji: '🧠', title: 'Mental Maths Exam', sub: 'No abacus — answer in your head',
      questions: 15, minutes: 5, passMark: 60, group: 'exam', locked: done.length < 2, need: 'Pass 2 levels first' });
    out.push({ id: 'contest', kind: 'abacus', levels: done.length ? done : [1], emoji: '🏆', title: 'Competition', sub: 'Speed round — beat your own score',
      questions: 25, minutes: 6, passMark: 0, group: 'contest', locked: done.length < 3, need: 'Pass 3 levels first' });
  }
  return out;
}

export function testCentre() {
  const items = examList();
  if (!items.length) {
    shell({ title: 'Test Centre', back: '#/home', body: `${bubble('Tests open after you pass your first practice level. Keep going!', 'happy')}<a class="btn primary wide" href="#/practice">Go to practice →</a>` });
    return;
  }
  const card = e => `<a class="exam ${e.group} ${e.locked ? 'locked' : ''}" ${e.locked ? 'aria-disabled="true"' : `href="#/exam/${e.id}"`}>
      <span class="exam-emoji">${e.locked ? '🔒' : e.emoji}</span>
      <span class="exam-body"><b>${esc(e.title)}</b><small>${esc(e.locked ? e.need : e.sub)}</small>
        <em>${e.questions} questions · ${e.minutes} min${e.passMark ? ` · pass ${e.passMark}%` : ' · score race'}</em></span>
      <span class="exam-best">${bestFor(e.id) ? `${bestFor(e.id)}%` : ''}${everPassed(e.id) ? '<i>🏅</i>' : ''}</span>
    </a>`;
  const certs = state.exams.filter(r => r.passed).length;
  shell({ title: 'Test Centre', back: '#/home', body: `
    ${bubble('Ready for a real test? No hints, one answer each, and a clock. Good luck!', 'happy')}
    <h3 class="sec">Level tests</h3>
    <div class="exams">${items.filter(e => e.group === 'test').map(card).join('') || '<p class="muted">Pass a practice level to open its test.</p>'}</div>
    <h3 class="sec">Exams & competition</h3>
    <div class="exams">${items.filter(e => e.group !== 'test').map(card).join('')}</div>
    ${isOn('certificates') ? `<a class="sticker-link" href="#/certificates"><span>🏅</span><b>My Certificates</b><em>${certs}</em></a>` : ''}` });
  say('Ready for a real test?');
}

/* ---------------- the exam runner ---------------- */
export function runExam(id) {
  const meta = examList().find(e => e.id === id);
  if (!meta || meta.locked) return go('#/tests');
  const tok = newToken(); clearTimers();
  const levels = meta.level ? [meta.level] : meta.levels;
  const questions = Array.from({ length: meta.questions }, (_, i) => {
    const lv = levels[i % levels.length];
    return meta.kind === 'mental' ? mentalQuestion(lv) : makeSession(lv, 1)[0];
  });
  let idx = 0, correct = 0, left = meta.minutes * 60;
  const started = Date.now();
  markDay();

  shell({ title: meta.title, back: '#/tests', cls: 'exam-run', body: `
    <div class="race-bar">
      <span class="chip">Q <b data-qn>1</b>/${meta.questions}</span>
      <div class="track"><i data-track></i></div>
      <span class="chip" data-clock>${mmss(left)}</span>
    </div>
    <div class="equation big" data-eq></div>
    <div data-stage class="flash-stage" hidden></div>
    <div data-abacus ${meta.kind === 'mental' ? 'hidden' : ''}></div>
    <div class="options" data-opts hidden></div>
    <div class="row center" data-controls>
      <button class="btn" data-skip>Skip ⏭</button>
      <button class="btn primary" data-lock>Lock answer ✓</button>
    </div>
    <p class="muted center">No hints in a test. Take your time — the clock is running.</p>` });

  const v = meta.kind === 'mental' ? null : createAbacus($('[data-abacus]'), { rods: 2 });

  const finish = () => {
    clearTimers();
    const seconds = Math.round((Date.now() - started) / 1000);
    const pct = Math.round((correct / meta.questions) * 100);
    const passed = meta.passMark ? pct >= meta.passMark : correct > 0;
    const result = { id, title: meta.title, score: correct, total: meta.questions, pct, seconds, passed, at: Date.now(), name: state.profile?.name || '' };
    state.exams.unshift(result); state.exams = state.exams.slice(0, 40); saveNow();
    const isBest = pct >= bestFor(id);
    if (passed) { sfx.star(); confetti(); } else sfx.good();
    $('.view').innerHTML = `<section class="done-card">
      ${babi(passed ? 'cheer' : 'happy', 'big bob')}
      <h2 class="display">${passed ? (meta.group === 'contest' ? 'Great run!' : 'You passed! 🎉') : 'Good effort!'}</h2>
      <div class="score-ring ${passed ? 'pass' : ''}"><b>${pct}%</b><small>${correct} of ${meta.questions}</small></div>
      <p class="lead">Time taken: <b>${mmss(seconds)}</b>${meta.passMark ? ` · pass mark ${meta.passMark}%` : ''}${isBest ? ' · your best yet 🏆' : ''}</p>
      ${!passed && meta.passMark ? `<p class="muted">Practise Level ${levels[0]} once more, then try again — you were ${meta.passMark - pct}% away.</p>` : ''}
      <div class="stack">
        ${passed && isOn('certificates') ? `<a class="btn primary wide" href="#/certificate/0">🏅 See certificate</a>` : ''}
        <button class="btn wide" data-again>Try again</button>
        <a class="btn ghost wide" href="#/tests">Back to Test Centre</a>
      </div></section>`;
    $('[data-again]').onclick = () => runExam(id);
    say(passed ? 'Well done! You passed.' : 'Good effort. Try once more.');
  };

  const show = async () => {
    if (!alive(tok)) return;
    const q = questions[idx];
    $('[data-qn]').textContent = idx + 1;
    $('[data-track]').style.width = `${(idx / meta.questions) * 100}%`;
    $$('[data-controls] button').forEach(b => b.disabled = false);
    if (meta.kind === 'mental') {
      $('[data-eq]').textContent = '';
      $('[data-opts]').hidden = true; $('[data-stage]').hidden = false;
      for (const n of q.nums) {
        $('[data-stage]').textContent = (n > 0 ? '+' : '−') + Math.abs(n);
        $('[data-stage]').className = `flash-stage show ${n > 0 ? 'plus' : 'minus'}`; sfx.tap();
        await wait(700); if (!alive(tok)) return;
        $('[data-stage]').className = 'flash-stage'; await wait(250); if (!alive(tok)) return;
      }
      $('[data-stage]').textContent = '= ?';
      $('[data-opts]').hidden = false;
      $('[data-opts]').innerHTML = q.options.map(o => `<button class="opt" data-opt="${o}">${o}</button>`).join('');
      $$('[data-opt]').forEach(b => b.onclick = () => answer(+b.dataset.opt, b));
    } else {
      $('[data-eq]').innerHTML = `${q.a} ${sign(q.op)} ${q.b} = <b>?</b>`;
      v.set(q.a); v.lock(false);
    }
  };

  const answer = async (given, btn) => {
    const q = questions[idx];
    const right = given === q.answer;
    if (right) correct++;
    sfx[right ? 'good' : 'oops']();
    if (btn) { $$('[data-opt]').forEach(x => x.disabled = true); btn.classList.add(right ? 'right' : 'wrong'); }
    else { right ? v.celebrate() : v.shake(); v.lock(true); }
    await wait(650); if (!alive(tok)) return;
    idx++;
    if (idx >= meta.questions) finish(); else show();
  };

  $('[data-skip]').onclick = () => { idx++; if (idx >= meta.questions) finish(); else show(); };
  $('[data-lock]').onclick = () => { if (meta.kind !== 'mental') answer(v.value, null); };
  if (meta.kind === 'mental') { $('[data-lock]').hidden = true; }

  show();
  every(() => {
    if (!alive(tok)) return clearTimers();
    left--; $('[data-clock]').textContent = mmss(Math.max(0, left));
    if (left === 30) $('[data-clock]').classList.add('urgent');
    if (left <= 0) { clearTimers(); finish(); }
  }, 1000);
}

// A mental-maths question: a short chain of numbers to add in your head.
function mentalQuestion(level) {
  const count = level <= 4 ? 3 : level <= 8 ? 4 : 5;
  const max = level <= 4 ? 9 : level <= 8 ? 9 : 19;
  const nums = []; let total = 0;
  for (let i = 0; i < count; i++) {
    let n = 1 + rnd(max);
    if (i > 0 && Math.random() < 0.35 && total - n >= 0) n = -n;
    nums.push(n); total += n;
  }
  const opts = new Set([total]);
  while (opts.size < 4) { const d = [-10, -5, -2, -1, 1, 2, 5, 10][rnd(8)]; if (total + d >= 0) opts.add(total + d); }
  return { nums, answer: total, options: [...opts].sort((a, b) => a - b), rule: 'mental', key: `m${nums.join('+')}` };
}

/* ---------------- certificates ---------------- */
export function certificates() {
  const list = state.exams.filter(r => r.passed);
  shell({ title: 'My Certificates', back: '#/tests', body: list.length ? `
    ${bubble(`You have earned ${list.length} certificate${list.length === 1 ? '' : 's'}!`, 'cheer')}
    <div class="levels">${list.map((r, i) => `<a class="level" href="#/certificate/${state.exams.indexOf(r)}">
      <span class="lv-emoji">🏅</span><span class="lv-body"><b>${esc(r.title)}</b><em>${r.pct}% · ${new Date(r.at).toLocaleDateString()}</em></span><span>→</span></a>`).join('')}</div>`
    : `${bubble('No certificates yet. Pass a test to earn your first one!', 'happy')}<a class="btn primary wide" href="#/tests">Go to Test Centre →</a>` });
}

export function certificate(index) {
  const r = state.exams[index] || state.exams.find(x => x.passed);
  if (!r) return go('#/tests');
  const centre = brand().centreName;
  shell({ title: 'Certificate', back: '#/certificates', cls: 'cert-screen', body: `
    <div class="cert" id="cert">
      <div class="cert-in">
        <p class="cert-top">${esc(centre || brand().appName)}</p>
        <h2>Certificate of Achievement</h2>
        <p class="cert-sub">This certifies that</p>
        <p class="cert-name">${esc(r.name || state.profile?.name || 'Our young learner')}</p>
        <p class="cert-sub">has successfully completed</p>
        <p class="cert-exam">${esc(r.title)}</p>
        <div class="cert-score"><span><b>${r.pct}%</b>score</span><span><b>${r.score}/${r.total}</b>correct</span><span><b>${mmss(r.seconds)}</b>time</span></div>
        <div class="cert-foot"><span>${new Date(r.at).toLocaleDateString()}</span><span class="cert-seal">🧮</span><span>${esc(centre ? 'Teacher' : 'Babi, your abacus buddy')}</span></div>
      </div>
    </div>
    <div class="row center"><button class="btn primary" data-print>🖨 Print or save as PDF</button></div>
    <p class="muted center tiny">Tip: in the print box choose "Save as PDF" to send it to a grown-up.</p>` });
  $('[data-print]').onclick = () => window.print();
}
