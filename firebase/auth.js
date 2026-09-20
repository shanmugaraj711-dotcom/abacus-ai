/**
 * firebase/auth.js
 * Phase 1 — Firebase Phone Auth initialisation and helpers.
 *
 * Exports:
 *   initFirebase()              → initialises app + auth once
 *   getAuthInstance()           → returns the Firebase Auth instance
 *   setupRecaptcha(containerId) → creates invisible reCAPTCHA verifier
 *   sendOtp(phone, verifier)    → wraps signInWithPhoneNumber
 *   verifyOtp(confirmationResult, otp) → wraps confirmationResult.confirm
 *   signOut()                   → signs the user out
 *   onAuthChange(callback)      → onAuthStateChanged listener
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import FIREBASE_CONFIG, { isConfigured } from "./config.js";

// Module-level singletons
let _app  = null;
let _auth = null;

/**
 * Initialise Firebase once.  Safe to call multiple times.
 * Throws a descriptive error if the config is still placeholder.
 */
export function initFirebase() {
  if (!isConfigured()) {
    throw new Error(
      "[Phase 1] Firebase is not configured. " +
        "Open firebase/config.js and replace every REPLACE_ME value " +
        "with your real Firebase project credentials."
    );
  }

  if (getApps().length === 0) {
    _app = initializeApp(FIREBASE_CONFIG);
  } else {
    _app = getApps()[0];
  }

  _auth = getAuth(_app);

  // Firebase uses the current browser origin for Phone Auth verification.
  return { app: _app, auth: _auth };
}

/** Returns the cached Auth instance (call initFirebase first). */
export function getAuthInstance() {
  if (!_auth) throw new Error("[Phase 1] Call initFirebase() before getAuthInstance().");
  return _auth;
}

/**
 * Create (or reuse) an invisible reCAPTCHA verifier.
 * @param {string} elementId — id of the button that starts sign-in
 * @returns {RecaptchaVerifier}
 */
export function setupRecaptcha(containerId) {
  const auth = getAuthInstance();

  // Reuse the same verifier for the whole page lifetime.
  // Recreating it on every click can make Firebase throw
  // "reCAPTCHA has already been rendered in this element".
  if (window._abacusRecaptchaVerifier) {
    return window._abacusRecaptchaVerifier;
  }

  const verifier = new RecaptchaVerifier(auth, elementId, {
    size: "invisible",
    callback: () => {
      // reCAPTCHA solved — signInWithPhoneNumber will proceed
    },
    "expired-callback": () => {
      // reCAPTCHA expired — the UI will handle this via error state
      window.dispatchEvent(new CustomEvent("abacus:recaptcha-expired"));
    },
  });

  window._abacusRecaptchaVerifier = verifier;
  return verifier;
}

/**
 * Send an OTP to the given phone number.
 * @param {string} phone       — E.164 format, e.g. "+919876543210"
 * @param {RecaptchaVerifier} verifier
 * @returns {Promise<ConfirmationResult>}
 */
export async function sendOtp(phone, verifier) {
  const auth = getAuthInstance();
  return signInWithPhoneNumber(auth, phone, verifier);
}

/**
 * Verify the OTP entered by the user.
 * @param {ConfirmationResult} confirmationResult — from sendOtp()
 * @param {string} otp — 6-digit code
 * @returns {Promise<UserCredential>}
 */
export async function verifyOtp(confirmationResult, otp) {
  return confirmationResult.confirm(otp.trim());
}

/**
 * Sign the current user out.
 * @returns {Promise<void>}
 */
export async function signOut() {
  const auth = getAuthInstance();
  return firebaseSignOut(auth);
}

/**
 * Subscribe to auth state changes.
 * @param {function(User|null): void} callback
 * @returns {Unsubscribe}
 */
export function onAuthChange(callback) {
  const auth = getAuthInstance();
  return onAuthStateChanged(auth, callback);
}
