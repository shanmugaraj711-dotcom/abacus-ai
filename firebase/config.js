/**
 * firebase/config.js
 * Phase 1 — Firebase Web App configuration.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONFIGURATION BLOCKER — DO NOT MOCK OR BYPASS
 * ─────────────────────────────────────────────────────────────────────────────
 * Replace every REPLACE_ME value below with your real Firebase project values.
 * You can find them in:
 *   Firebase Console → Project settings → Your apps → Web app → SDK setup
 *
 * Required values:
 *   apiKey          — e.g. "AIzaSy..."
 *   authDomain      — e.g. "my-project.firebaseapp.com"
 *   projectId       — e.g. "my-project"
 *   storageBucket   — e.g. "my-project.appspot.com"
 *   messagingSenderId — e.g. "123456789012"
 *   appId           — e.g. "1:123456789012:web:abc123..."
 *
 * ALSO required in the Firebase Console:
 *   Authentication → Sign-in method → Phone → Enable
 *   Authentication → Settings → Authorized domains → add your domain
 *
 * For local testing with Phone Auth you must also:
 *   Firebase Console → Authentication → Settings → Phone numbers for testing
 *   Add a test number (e.g. +91 9000000000) with a fixed OTP (e.g. 123456)
 *   This lets you test without real SMS delivery.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── FIREBASE WEB CONFIG — abacus-buddy ──────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyC7geYRyuQ-KP5oHjlPW6GAZGBHumJdh8g",
  authDomain:        "abacus-buddy.firebaseapp.com",
  projectId:         "abacus-buddy",
  storageBucket:     "abacus-buddy.firebasestorage.app",
  messagingSenderId: "1008908134954",
  appId:             "1:1008908134954:web:73243614c17a1c7dfbf153",
};
// ── END FIREBASE CONFIG ──────────────────────────────────────────────────────

/**
 * Returns true when the config has been filled in.
 * The auth UI uses this to gate initialisation and show a clear error
 * instead of a cryptic Firebase exception.
 */
export function isConfigured() {
  return Object.values(FIREBASE_CONFIG).every((v) => v !== "REPLACE_ME" && v !== "");
}

export default FIREBASE_CONFIG;
