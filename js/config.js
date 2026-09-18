// Feature switches and branding.
//
// Two layers:
//   1. config.json next to index.html  → what every child/centre gets. Edit it (or export it from the
//      owner console) and re-deploy to turn a feature on or off for everyone.
//   2. Owner console changes on this device → saved locally, for trying things before you release them.
//
// Nothing here can break the app: unknown keys are ignored and missing files fall back to these defaults.
const DEFAULTS = {
  appName: 'Abacus Buddy',
  centreName: '',          // shown on certificates, e.g. "Sunshine Abacus Academy"
  ownerPin: '2580',        // opens the owner console at #/admin
  freeLevels: 12,          // levels playable without a code; the rest show "coming soon"
  features: {
    learn: true, practice: true, play: true, freePlay: true, stickers: true,
    tests: true, exams: true, certificates: true,
    tamil: true,
    gameRace: true, gameMystery: true, gameMatch: true,
    gameFlash: true, gameSpeedRead: true, gameFriendDash: true, gameLadder: true,
  },
  test: { questions: 20, minutes: 5, passMark: 80 },
  exam: { questions: 30, minutes: 8, passMark: 75 },
};

const LOCAL_KEY = 'abacus-owner-config-v1';
const deepMerge = (base, extra) => {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? deepMerge(base[k] || {}, v) : v;
  }
  return out;
};

let current = DEFAULTS;
let localOverrides = {};
try { localOverrides = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); } catch { localOverrides = {}; }
current = deepMerge(DEFAULTS, localOverrides);

/** Load config.json shipped with the site (if present), then re-apply this device's own overrides. */
export async function loadConfig() {
  try {
    const res = await fetch('./config.json', { cache: 'no-cache' });
    if (res.ok) {
      const remote = await res.json();
      current = deepMerge(deepMerge(DEFAULTS, remote), localOverrides);
    }
  } catch {}
  return current;
}

export const cfg = () => current;
export const isOn = key => current.features?.[key] !== false;
export const brand = () => ({ appName: current.appName || DEFAULTS.appName, centreName: current.centreName || '' });

export function setOverrides(patch) {
  localOverrides = deepMerge(localOverrides, patch);
  current = deepMerge(current, patch);
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(localOverrides)); } catch {}
  return current;
}
export function clearOverrides() {
  localOverrides = {};
  try { localStorage.removeItem(LOCAL_KEY); } catch {}
  current = deepMerge(DEFAULTS, {});
  return current;
}
export const overrides = () => localOverrides;
export const defaults = () => DEFAULTS;
/** The file to put next to index.html so everyone gets these settings. */
export const exportJson = () => JSON.stringify({ ...current, ownerPin: current.ownerPin }, null, 2);
