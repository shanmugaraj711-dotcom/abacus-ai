// Shared screen helpers: the page shell, Babi's speech bubble, timers, confetti and the demo player.
// Every screen module (app, games, exams, admin) builds on these.
import { planMoves, sign } from './engine.js';
import { state, save, totalStars } from './store.js';
import { sfx, say as speakRaw, stopTalking } from './sound.js';
import { t } from './i18n.js';
import { babi } from './babi.js';
import { cfg, brand } from './config.js';

export const app = document.getElementById('app');
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = app) => root.querySelector(sel);
export const $$ = (sel, root = app) => [...root.querySelectorAll(sel)];
export const wait = ms => new Promise(r => setTimeout(r, ms));
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Every screen change bumps the token; async work checks alive() so nothing leaks between screens.
let token = 0;
const timers = new Set();
export const newToken = () => ++token;
export const currentToken = () => token;
export const alive = tok => tok === token;
export function every(fn, ms) { const id = setInterval(fn, ms); timers.add(id); return id; }
export function clearTimers() { timers.forEach(clearInterval); timers.clear(); }

let router = () => {};
export const setRouter = fn => { router = fn; };
export const go = hash => { if (location.hash === hash) router(); else location.hash = hash; };

// Language: Babi's words come from js/i18n.js, so bubble text and voice always match.
export const lang = () => (state.profile?.lang === 'ta' ? 'ta' : 'en');
export const T = (key, ...args) => t(lang(), key, ...args);
export const voiceLang = () => (state.profile?.voiceLang === 'ta' ? 'ta' : 'en');
export const say = text => speakRaw(text, voiceLang());
export const lessonTitle = L => (lang() === 'ta' && L.titleTa) || L.title;
export const lvName = L => (lang() === 'ta' && L.nameTa) || L.name;
export const lvTip = L => (lang() === 'ta' && L.tipTa) || L.tip;
export const kidName = () => esc(state.profile?.name || 'friend');
export const lessonDone = id => state.lessonsDone.includes(id);
export const AVATARS = ['🦁', '🐼', '🐰', '🦊', '🐬', '🦄', '🐯', '🐸'];
export const stars = n => `<span class="stars" aria-label="${n} of 3 stars">${[0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}">★</i>`).join('')}</span>`;
export const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function shell({ title = '', back = '', body = '', cls = '' }) {
  app.innerHTML = `
    <header class="top">
      ${back ? `<button class="round" data-back="${back}" aria-label="Go back">←</button>` : `<span class="brand">🧮 <b>${esc(brand().appName)}</b></span>`}
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

export function bubble(text, mood = 'talk') {
  return `<div class="talk"><div class="talk-babi">${babi(mood)}</div><p class="talk-text" data-say>${esc(text)}</p><button class="round small" data-replay aria-label="Hear it again">🔊</button></div>`;
}
export function setBubble(text, mood = 'talk', speak = true) {
  const el = $('[data-say]'); if (el) el.textContent = text;
  const b = $('.talk-babi'); if (b) b.innerHTML = babi(mood);
  if (speak) say(text);
}
// One global listener replays whatever Babi last said.
app.addEventListener('click', e => { if (e.target.closest('[data-replay]')) say($('[data-say]')?.textContent); });

export function confetti() {
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

// Babi performs the real finger moves for a ± b on the given abacus view.
export async function playDemo(view, a, b, op, textEl, tok, speed = 1500) {
  const plan = planMoves(a, b, op);
  view.lock(true); view.set(a);
  const intro = T('startWith', a, sign(op), b);
  textEl.textContent = intro; say(intro);
  await wait(speed); if (!alive(tok)) return false;
  for (const st of plan.steps) {
    const line = T('step', st);
    view.highlight(st.rod); view.set(st.value); sfx.bead();
    textEl.textContent = line; say(line);
    await wait(Math.max(speed, line.length * 55)); if (!alive(tok)) return false;
  }
  view.highlight(null);
  const end = T('sumIs', a, sign(op), b, plan.answer);
  textEl.textContent = end; say(end); view.celebrate();
  return true;
}

export const cfgRef = cfg;
export const brandRef = brand;
