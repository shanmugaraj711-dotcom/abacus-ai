/**
 * auth/auth-state.js
 * Phase 1 — Auth state observer and signed-in/signed-out UI management.
 *
 * Responsibilities:
 *   - Call initFirebase() on load (catches unconfigured state gracefully).
 *   - Watch onAuthStateChanged and update the UI accordingly.
 *   - Show the signed-in panel when a user is authenticated.
 *   - Show the sign-in form when no user is present.
 *   - Wire the sign-out button.
 */

import { initFirebase, onAuthChange, signOut, signInWithGoogle, getGoogleRedirectResult } from "../firebase/auth.js";
import { isConfigured } from "../firebase/config.js";
import { initSignIn } from "./sign-in.js";
import { initOtpVerification } from "./otp-verification.js";

/** Entry point — call this from sign-in.html's <script type="module">. */
export function initAuthUI() {
  // ── Guard: config not filled in ─────────────────────────────────────────
  if (!isConfigured()) {
    showConfigBlocker();
    return;
  }

  // ── Initialise Firebase ──────────────────────────────────────────────────
  try {
    initFirebase();
  } catch (err) {
    showConfigBlocker(err.message);
    return;
  }

  // ── Check if returning from a Google redirect ────────────────────────────
  try {
    getGoogleRedirectResult()
      .then((result) => {
        if (result && result.user) {
          handleSignedIn(result);
        }
      })
      .catch((err) => {
        console.error("[Google Auth] Redirect result error:", err);
      });
  } catch (err) {
    console.warn("[Google Auth] getGoogleRedirectResult check failed:", err);
  }

  // ── Google Sign-In Button ────────────────────────────────────────────────
  const googleBtn = document.getElementById("phase1-google-btn");
  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      googleBtn.disabled = true;
      const originalHtml = googleBtn.innerHTML;
      googleBtn.innerHTML = `
        <svg class="phase1-google-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        <span>Connecting to Google…</span>
      `;
      const errEl = document.getElementById("phase1-phone-error");
      if (errEl) errEl.hidden = true;

      try {
        const cred = await signInWithGoogle();
        handleSignedIn(cred);
      } catch (err) {
        console.error("[Google Auth] Error:", err);
        googleBtn.disabled = false;
        googleBtn.innerHTML = originalHtml;
        if (errEl) {
          if (err.code === "auth/popup-closed-by-user") {
            errEl.textContent = "Sign-in cancelled. Please try again.";
          } else if (err.code === "auth/popup-blocked") {
            errEl.textContent = "Popup blocked by browser. Please allow popups or use phone sign-in.";
          } else {
            errEl.textContent = `Google Sign-In failed: ${err.message || err.code || err}`;
          }
          errEl.hidden = false;
        }
      }
    });
  }

  // ── Initialise sub-modules ───────────────────────────────────────────────
  initSignIn({
    phoneInputId:      "phase1-phone",
    countrySelectId:   "phase1-country",
    phoneHintId:       "phase1-phone-hint",
    sendBtnId:         "phase1-send-btn",
    recaptchaId:       "phase1-send-btn",
    errorId:           "phase1-phone-error",
    resendCountdownId: "phase1-resend-countdown",
  });

  initOtpVerification({
    otpSectionId:   "phase1-otp-section",
    otpInputId:     "phase1-otp",
    verifyBtnId:    "phase1-verify-btn",
    otpErrorId:     "phase1-otp-error",
    phoneDisplayId: "phase1-phone-display",
    backBtnId:      "phase1-back-btn",
    onSignedIn:     handleSignedIn,
    onBack:         showSignInForm,
  });

  // ── Auth state listener ──────────────────────────────────────────────────
  onAuthChange((user) => {
    if (user) {
      showSignedInPanel(user);
    } else {
      showSignInForm();
    }
  });

  // ── Sign-out button ──────────────────────────────────────────────────────
  const signOutBtn = document.getElementById("phase1-signout-btn");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", async () => {
      signOutBtn.disabled    = true;
      signOutBtn.textContent = "Signing out…";
      try {
        await signOut();
      } catch (err) {
        console.error("[Phase 1] Sign-out error:", err);
        signOutBtn.disabled    = false;
        signOutBtn.textContent = "Sign out";
      }
    });
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Called by otp-verification when Firebase confirms the credential. */
function handleSignedIn(credential) {
  showSignedInPanel(credential.user);
}

function showSignedInPanel(user) {
  hide("phase1-signin-section");
  hide("phase1-otp-section");
  show("phase1-signedin-section");

  const dNameEl  = document.getElementById("phase1-user-display-name");
  const nameEl   = document.getElementById("phase1-user-phone");
  const uidEl    = document.getElementById("phase1-user-uid");
  const tokenEl  = document.getElementById("phase1-token-status");
  const contBtn  = document.getElementById("phase1-continue-btn");

  if (dNameEl) dNameEl.textContent = user.displayName || (user.email ? user.email.split("@")[0] : "(Google Account)");
  if (nameEl)  nameEl.textContent  = user.email || user.phoneNumber || "(no email/phone)";
  if (uidEl)   uidEl.textContent   = user.uid;
  if (tokenEl) tokenEl.textContent = "Signed in ✓";

  const params = new URLSearchParams(window.location.search);
  let returnUrl = params.get("return") || "../#unlock";
  if (window.location.hash && !returnUrl.includes("#")) {
    returnUrl += window.location.hash;
  }
  if (contBtn) {
    contBtn.href = returnUrl;
  }

  // Retrieve the ID token and display its claim count as a smoke test
  user.getIdToken().then((token) => {
    if (tokenEl) {
      tokenEl.textContent = `ID token obtained ✓ (${token.length} chars)`;
    }
  }).catch((err) => {
    if (tokenEl) tokenEl.textContent = `Token error: ${err.message}`;
  });
}

function showSignInForm() {
  show("phase1-signin-section");
  hide("phase1-otp-section");
  hide("phase1-signedin-section");
  hide("phase1-config-error");
  const googleBtn = document.getElementById("phase1-google-btn");
  if (googleBtn) {
    googleBtn.disabled = false;
    googleBtn.innerHTML = `
      <svg class="phase1-google-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
      <span>Sign in with Google</span>
    `;
  }
  const phoneInput = document.getElementById("phase1-phone");
  if (phoneInput) {
    phoneInput.focus();
  }
}

function showConfigBlocker(detail) {
  hide("phase1-signin-section");
  hide("phase1-otp-section");
  hide("phase1-signedin-section");

  const el = document.getElementById("phase1-config-error");
  if (el) {
    const msg = document.getElementById("phase1-config-msg");
    if (msg) {
      msg.textContent = detail
        ? `Detail: ${detail}`
        : "Open firebase/config.js and replace every REPLACE_ME value with your real Firebase project credentials.";
    }
    el.hidden = false;
  }
}

function show(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = false;
}

function hide(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = true;
}
