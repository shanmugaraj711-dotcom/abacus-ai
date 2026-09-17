// Tiny sound effects (WebAudio, no files) + Babi's voice (speech synthesis). Both fail silently.
import { state } from './store.js';

let ctx = null;
function audio() {
  if (!state.settings.sound) return null;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}
function tone(freq, start, dur, type = 'sine', vol = 0.18) {
  const c = audio(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + start;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
export const sfx = {
  bead: () => tone(820 + Math.random() * 80, 0, 0.07, 'triangle', 0.12),
  good: () => [660, 880, 1175].forEach((f, i) => tone(f, i * 0.09, 0.22, 'sine', 0.16)),
  oops: () => { tone(330, 0, 0.16, 'sine', 0.12); tone(262, 0.12, 0.22, 'sine', 0.1); },
  star: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.14)),
  tap: () => tone(520, 0, 0.05, 'sine', 0.08),
};

const CHEERS = {
  en: { good: ['Super!', 'You did it!', 'Amazing!', 'Great job!', 'Wow, well done!'], oops: ['Almost! Try again.', 'Nearly there!', "That's okay, let's try again."] },
  ta: { good: ['சூப்பர்!', 'செம்ம!', 'நல்லா பண்ணீங்க!', 'அருமை!'], oops: ['பரவாயில்லை, மறுபடி முயற்சி பண்ணுங்க!', 'கிட்ட வந்துட்டீங்க!'] },
};
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function voiceFor(lang) {
  try {
    const vs = speechSynthesis.getVoices();
    return vs.find(v => v.lang === lang) || vs.find(v => v.lang?.startsWith(lang.slice(0, 2))) || null;
  } catch { return null; }
}
try { speechSynthesis?.getVoices(); speechSynthesis.onvoiceschanged = () => {}; } catch {}

export function say(text, { lang = 'en-IN', interrupt = true } = {}) {
  if (!state.settings.voice || !('speechSynthesis' in window) || !text) return;
  try {
    if (interrupt) speechSynthesis.cancel();
    const clean = String(text).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/−/g, ' minus ').replace(/\+/g, ' plus ');
    const u = new SpeechSynthesisUtterance(clean);
    const v = voiceFor(lang) || (lang !== 'en-IN' ? null : voiceFor('en-GB'));
    if (v) u.voice = v;
    u.lang = lang; u.rate = 0.95; u.pitch = 1.15;
    speechSynthesis.speak(u);
  } catch {}
}
export function stopTalking() { try { speechSynthesis.cancel(); } catch {} }

export function cheer(kind = 'good') {
  const lang = state.profile?.lang === 'ta' && voiceFor('ta-IN') ? 'ta' : 'en';
  const line = pick(CHEERS[lang][kind]);
  say(line, { lang: lang === 'ta' ? 'ta-IN' : 'en-IN' });
  return pick(CHEERS.en[kind]);
}
