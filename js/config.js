// Feature switches and branding.
//
// Three layers (applied in order, each one winning over the previous):
//   1. Hardcoded DEFAULTS        → built-in safe fallback, always present
//   2. config.json               → deployed with the site; turns features on/off for everyone
//   3. Remote config (/api/remote-config) → owner pushes live updates from the control centre;
//      propagated to all children on next app load.
//   4. Owner console overrides   → saved locally on this device (for testing before pushing)
//
// Offline behaviour:
//   - If /api/remote-config is unreachable, the last fetched value (cached in
//     sessionStorage as 'abacus-remote-cfg-cache') is used automatically.
//   - If even the cache is missing, layers 1+2+4 are used.
//   - A paid entitlement is separately cached in localStorage under
//     'abacus-entitlement-v1' so offline paid users stay unlocked.
//
// Authorization: #/admin requires Firebase Google sign-in as the owner account.
// There is NO PIN. The ownerPin field is removed.
//
// Price model: Levels 1-3 free, Levels 4-15 at ₹499. freeLevels is fixed at 3.
// The server strips freeLevels from any remote config push to prevent misuse.
//
// Nothing here can break the app: unknown keys are ignored and missing files
// fall back to these defaults.

const DEFAULTS = {
  appName: 'Abacus Buddy',
  centreName: '',          // shown on certificates, e.g. "Sunshine Abacus Academy"
  freeLevels: 3,           // FIXED: levels 1-3 free, 4-15 paid at ₹499. Do not change.
  couponsEnabled: false,   // Coupon foundation: OFF. Do not enable without owner decision.
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
const REMOTE_CACHE_KEY = 'abacus-remote-cfg-cache';

const deepMerge = (base, extra) => {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? deepMerge(base[k] || {}, v) : v;
  }
  return out;
};

let localOverrides = {};
try { localOverrides = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); } catch { localOverrides = {}; }

// Strip any ownerPin that may have been saved from the old PIN-based system
delete localOverrides.ownerPin;

// Start with defaults + local overrides (works fully offline before loadConfig finishes)
let _siteConfig = {};   // from config.json
let _remoteConfig = {}; // from /api/remote-config (or sessionStorage cache)
let current = deepMerge(DEFAULTS, localOverrides);

/** Rebuild current from all layers */
function rebuild() {
  const merged = deepMerge(deepMerge(deepMerge(DEFAULTS, _siteConfig), _remoteConfig), localOverrides);
  // freeLevels is always 3 — enforce fixed price model
  merged.freeLevels = 3;
  // ownerPin is never exposed in current config (auth is Firebase, not PIN)
  delete merged.ownerPin;
  current = merged;
}

/**
 * Load all config layers:
 *   1. config.json (deployed with the site)
 *   2. /api/remote-config (live owner updates; falls back to sessionStorage cache)
 * Then re-apply local overrides.
 */
export async function loadConfig() {
  // Layer 2: config.json
  try {
    const res = await fetch('./config.json', { cache: 'no-cache' });
    if (res.ok) { _siteConfig = await res.json(); }
  } catch {}

  // Layer 3: remote config via Worker API (with offline cache fallback)
  try {
    const res = await fetch('/api/remote-config', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Remote config fetch failed: ${res.status}`);
    const remote = await res.json();
    if (remote && typeof remote === 'object' && !remote.error) {
      _remoteConfig = remote;
      try { sessionStorage.setItem(REMOTE_CACHE_KEY, JSON.stringify(remote)); } catch {}
    }
  } catch {
    // Offline: restore from sessionStorage cache
    try {
      const cached = sessionStorage.getItem(REMOTE_CACHE_KEY);
      if (cached) { _remoteConfig = JSON.parse(cached); }
    } catch {}
  }

  rebuild();
  return current;
}

export const cfg = () => current;
export const isOn = key => current.features?.[key] !== false;
export const brand = () => ({ appName: current.appName || DEFAULTS.appName, centreName: current.centreName || '' });

export function setOverrides(patch) {
  // Never allow overriding freeLevels or ownerPin from local overrides
  const { freeLevels: _fl, ownerPin: _pin, ...safePatch } = patch;
  localOverrides = deepMerge(localOverrides, safePatch);
  rebuild();
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(localOverrides)); } catch {}
  return current;
}
export function clearOverrides() {
  localOverrides = {};
  try { localStorage.removeItem(LOCAL_KEY); } catch {}
  rebuild();
  return current;
}
export const overrides = () => localOverrides;
export const defaults = () => DEFAULTS;
/** The file to put next to index.html so everyone gets these settings (no ownerPin). */
export const exportJson = () => {
  const { ownerPin: _pin, freeLevels: _fl, ...exportable } = current;
  return JSON.stringify(exportable, null, 2);
};
