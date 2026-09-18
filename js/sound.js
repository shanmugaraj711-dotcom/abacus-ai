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

const VOICE_LANG = { en: 'en-IN', ta: 'ta-IN' };

function voiceFor(tag) {
  try {
    const vs = speechSynthesis.getVoices();
    return vs.find(v => v.lang?.replace('_', '-') === tag) || vs.find(v => v.lang?.startsWith(tag.slice(0, 2))) || null;
  } catch { return null; }
}
try { speechSynthesis?.getVoices(); speechSynthesis.addEventListener('voiceschanged', () => {}); } catch {}

/** Does this device have a voice for this language? (Tamil is missing on many phones.) */
export function hasVoice(lang) {
  if (!('speechSynthesis' in window)) return false;
  return !!voiceFor(VOICE_LANG[lang] || VOICE_LANG.en);
}

let last = { text: '', at: 0 };
/** Speak one line. Same line twice in a row is ignored, so Babi never repeats himself. */
export function say(text, lang = 'en') {
  if (!state.settings.voice || !('speechSynthesis' in window) || !text) return;
  const now = Date.now();
  if (text === last.text && now - last.at < 2500) return;
  last = { text, at: now };
  const tag = VOICE_LANG[lang] || VOICE_LANG.en;
  const v = voiceFor(tag);
  if (lang === 'ta' && !v) return; // no Tamil voice on this device: show the Tamil words, stay quiet
  try {
    speechSynthesis.cancel();
    const clean = String(text).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/−/g, lang === 'ta' ? ' கழித்தல் ' : ' minus ').replace(/\+/g, lang === 'ta' ? ' கூட்டல் ' : ' plus ');
    const u = new SpeechSynthesisUtterance(clean);
    if (v) u.voice = v;
    u.lang = tag; u.rate = lang === 'ta' ? 0.92 : 0.95; u.pitch = 1.15;
    speechSynthesis.speak(u);
  } catch {}
}
export function stopTalking() { try { speechSynthesis.cancel(); last = { text: '', at: 0 }; } catch {} }
