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

const TAMIL_UNITS = {
  0: 'பூஜ்ஜியம்', 1: 'ஒன்று', 2: 'இரண்டு', 3: 'மூன்று', 4: 'நான்கு',
  5: 'ஐந்து', 6: 'ஆறு', 7: 'ஏழு', 8: 'எட்டு', 9: 'ஒன்பது'
};
const TAMIL_TEENS = {
  11: 'பதினொன்று', 12: 'பன்னிரண்டு', 13: 'பதின்மூன்று',
  14: 'பதினான்கு', 15: 'பதினைந்து', 16: 'பதினாறு',
  17: 'பதினேழு', 18: 'பதினெட்டு', 19: 'பத்தொன்பது'
};
const TAMIL_TENS = {
  10: 'பத்து', 20: 'இருபது', 30: 'முப்பது', 40: 'நாற்பது',
  50: 'ஐம்பது', 60: 'அறுபது', 70: 'எழுபது', 80: 'எண்பது', 90: 'தொண்ணூறு'
};
const TAMIL_HUNDREDS = {
  100: 'நூறு', 200: 'இருநூறு', 300: 'முந்நூறு', 400: 'நானூறு',
  500: 'ஐந்நூறு', 600: 'அறுநூறு', 700: 'எழுநூறு', 800: 'எண்ணூறு',
  900: 'தொள்ளாயிரம்'
};

/** Convert 0..999 to real Tamil number words for speech. */
export function tamilNumberWord(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 999) return String(value);
  if (n < 10) return TAMIL_UNITS[n];
  if (n < 20) return n === 10 ? TAMIL_TENS[10] : TAMIL_TEENS[n];
  if (n < 100) {
    const tens = Math.floor(n / 10) * 10;
    const units = n % 10;
    if (!units) return TAMIL_TENS[tens];
    const connector = tens === 90
      ? TAMIL_TENS[tens].replace(/று$/, 'ற்றி')
      : TAMIL_TENS[tens].replace(/து$/, 'த்தி');
    return `${connector} ${TAMIL_UNITS[units]}`;
  }

  const hundreds = Math.floor(n / 100) * 100;
  const remainder = n % 100;
  if (!remainder) return TAMIL_HUNDREDS[hundreds];

  // Compound hundreds use the grammatical connecting form:
  // நூறு -> நூற்று, இருநூறு -> இருநூற்று, தொள்ளாயிரம் -> தொள்ளாயிரத்து.
  const base = TAMIL_HUNDREDS[hundreds];
  const connector = hundreds === 900
    ? base.replace(/ம்$/, 'த்து')
    : base.replace(/று$/, 'ற்று');
  return `${connector} ${tamilNumberWord(remainder)}`;
}

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
/** Speak one line. Returns a Promise that resolves when speech completes or fails. */
export function say(text, lang = 'en') {
  if (!state.settings.voice || !('speechSynthesis' in window) || !text) {
    return Promise.resolve();
  }
  const now = Date.now();
  if (text === last.text && now - last.at < 1200) {
    return Promise.resolve();
  }
  last = { text, at: now };
  const tag = VOICE_LANG[lang] || VOICE_LANG.en;
  const v = voiceFor(tag);
  if (lang === 'ta' && !v) return Promise.resolve(); // no Tamil voice on this device: stay quiet

  return new Promise(resolve => {
    try {
      if (speechSynthesis.speaking || speechSynthesis.pending) {
        speechSynthesis.cancel();
      }
      const clean = String(text)
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
        .replace(/−/g, lang === 'ta' ? ' கழித்தல் ' : ' minus ')
        .replace(/\+/g, lang === 'ta' ? ' கூட்டல் ' : ' plus ');
      const phoneticNumbers = {
        0: 'ஜீரோ', 1: 'ஒன்', 2: 'டூ', 3: 'த்ரீ', 4: 'ஃபோர்',
        5: 'ஃபைவ்', 6: 'சிக்ஸ்', 7: 'செவன்', 8: 'எய்ட்', 9: 'நைன்',
        10: 'டென்', 11: 'இலெவன்', 12: 'டுவெல்வ்', 13: 'தேர்ட்டீன்',
        14: 'ஃபோர்ட்டீன்', 15: 'ஃபிஃப்ட்டீன்', 16: 'சிக்ஸ்ட்டீன்',
        17: 'செவன்ட்டீன்', 18: 'எய்ட்டீன்', 19: 'நைன்ட்டீன்',
        20: 'டுவென்ட்டி', 30: 'தேர்ட்டி', 40: 'ஃபோர்ட்டி',
        50: 'ஃபிஃப்ட்டி', 60: 'சிக்ஸ்ட்டி', 70: 'செவன்ட்டி',
        80: 'எய்ட்டி', 90: 'நைன்ட்டி'
      };
      // Tamil number words used by the voice layer. Keep this separate from
      // the UI's numeric values: 100 must be spoken as "நூறு", not "ஒன் ஜீரோ ஜீரோ".
      const numberWord = value => {
        const n = Number(value);
        if (!Number.isInteger(n) || n < 0) return value;
        if (n <= 999) return tamilNumberWord(n);
        return String(n).split('').map(d => TAMIL_UNITS[Number(d)] ?? d).join(' ');
      };
      const spoken = lang === 'ta'
        ? clean.replace(/\b\d+\b/g, numberWord).replace(/\s+/g, ' ').trim()
        : clean;
      const v = voiceFor(tag);
      const u = new SpeechSynthesisUtterance(spoken);
      if (v) u.voice = v;
      u.lang = tag; u.rate = lang === 'ta' ? 0.92 : 0.95; u.pitch = 1.15;

      let settled = false;
      const done = () => {
        if (!settled) {
          settled = true;
          clearTimeout(fallbackTimer);
          resolve();
        }
      };
      u.onend = done;
      u.onerror = done;
      // Fallback timeout prevents hanging if browser fails to trigger onend
      const fallbackTimer = setTimeout(done, Math.max(1200, spoken.length * 90));
      speechSynthesis.speak(u);
    } catch {
      resolve();
    }
  });
}
export function stopTalking() { try { speechSynthesis.cancel(); last = { text: '', at: 0 }; } catch {} }
