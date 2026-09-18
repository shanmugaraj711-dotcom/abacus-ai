// Single source of truth for saved data. Every read/write is guarded (private mode, full storage…).
const KEY = 'abacus-kids-v3';
const OLD_PROFILE = 'abacus-ai-profile-v2';

const fresh = () => ({
  v: 3,
  profile: null, // {name, avatar, experience, lang, voiceLang}
  settings: { sound: true, voice: true },
  lessonsDone: [],
  levels: {},     // id -> {stars, best, plays}
  unlocked: 1,
  stats: { days: [], answered: 0, firstTry: 0, seconds: 0, byRule: { direct: [0, 0], small: [0, 0], big: [0, 0] }, mistakes: [] },
  games: { race: 0, mystery: 0, match: 0 },
  exams: [],   // {id, title, score, total, pct, seconds, passed, at, name}
  recent: [],
  stickersSeen: [],
});

function load() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { data = null; }
  const base = fresh();
  if (!data || data.v !== 3) {
    // Migrate the child's name from the old app so nobody has to start over.
    try {
      const old = JSON.parse(localStorage.getItem(OLD_PROFILE) || 'null');
      if (old && old.name) base.profile = { name: String(old.name).slice(0, 18), avatar: '🦁', experience: old.experience === 'known' ? 'known' : 'new', lang: localStorage.getItem('abacus-ai-language') === 'ta' ? 'ta' : 'en', voiceLang: localStorage.getItem('abacus-ai-language') === 'ta' ? 'ta' : 'en' };
    } catch {}
    return base;
  }
  // Deep-merge so new fields added later never crash old saves.
  const profile = data.profile ? { ...data.profile, voiceLang: data.profile.voiceLang === 'ta' ? 'ta' : (data.profile.voiceLang === 'en' ? 'en' : (data.profile.lang === 'ta' ? 'ta' : 'en')) } : null;
  return { ...base, ...data, profile, settings: { ...base.settings, ...data.settings }, stats: { ...base.stats, ...data.stats, byRule: { ...base.stats.byRule, ...(data.stats?.byRule || {}) } }, games: { ...base.games, ...data.games }, exams: Array.isArray(data.exams) ? data.exams : [], stickersSeen: Array.isArray(data.stickersSeen) ? data.stickersSeen : [] };
}

export const state = load();

let saveTimer = 0;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }, 60);
}
export function saveNow() { clearTimeout(saveTimer); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }

export function resetAll() {
  const keepSettings = state.settings;
  Object.keys(state).forEach(k => delete state[k]);
  Object.assign(state, fresh(), { settings: keepSettings });
  saveNow();
}

export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export function markDay() {
  const t = today();
  if (!state.stats.days.includes(t)) { state.stats.days.push(t); state.stats.days = state.stats.days.slice(-60); save(); }
}

export function streak() {
  const days = new Set(state.stats.days);
  let n = 0; const d = new Date();
  if (!days.has(today())) d.setDate(d.getDate() - 1); // streak still alive until tonight
  for (;;) {
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!days.has(k)) break; n++; d.setDate(d.getDate() - 1);
  }
  return n;
}

export const totalStars = () => Object.values(state.levels).reduce((s, l) => s + (l.stars || 0), 0) + state.lessonsDone.length;

// Called once per finished sum.
export function recordAnswer(problem, firstTry) {
  const st = state.stats;
  st.answered++; if (firstTry) st.firstTry++;
  const r = st.byRule[problem.rule] || (st.byRule[problem.rule] = [0, 0]);
  r[1]++; if (firstTry) r[0]++;
  state.recent = [problem.key, ...state.recent.filter(k => k !== problem.key)].slice(0, 24);
  save();
}
// Called on the first wrong try of a sum (for the grown-ups "mix-ups" list).
export function recordMistake(problem, given) {
  const st = state.stats;
  st.mistakes.unshift({ q: `${problem.a} ${problem.op === 'add' ? '+' : '−'} ${problem.b}`, answer: problem.answer, given, rule: problem.rule, at: Date.now() });
  st.mistakes = st.mistakes.slice(0, 12);
  save();
}

// Never lose progress when the app is closed or hidden.
try {
  addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });
} catch {}
