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

import { initFirebase, onAuthChange, signOut } from "../firebase/auth.js";
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

  // ── Initialise sub-modules ───────────────────────────────────────────────
  initSignIn({
    phoneInputId:      "phase1-phone",
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

  const nameEl   = document.getElementById("phase1-user-phone");
  const uidEl    = document.getElementById("phase1-user-uid");
  const tokenEl  = document.getElementById("phase1-token-status");

  if (nameEl)  nameEl.textContent  = user.phoneNumber ?? "(no phone)";
  if (uidEl)   uidEl.textContent   = user.uid;
  if (tokenEl) tokenEl.textContent = "Signed in ✓";

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
