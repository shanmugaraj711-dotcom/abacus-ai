/**
 * auth/sign-in.js
 * Phase 1 — Phone-number collection and OTP dispatch.
 *
 * Responsibilities:
 *   - Validate and normalise the phone number input.
 *   - Wire the "Send OTP" button to setupRecaptcha + sendOtp.
 *   - Emit "abacus:otp-sent" with the ConfirmationResult on success.
 *   - Render inline error messages for all expected failure modes.
 *   - Handle resend (after cooldown).
 */

import { setupRecaptcha, sendOtp } from "../firebase/auth.js";

// ── Constants ────────────────────────────────────────────────────────────────
const RESEND_COOLDOWN_MS = 30_000; // 30 s before allowing resend

// ── State ────────────────────────────────────────────────────────────────────
let _resendTimer    = null;
let _resendCooldown = 0;

// ── Exported entry point ─────────────────────────────────────────────────────

/**
 * Initialise the sign-in form.
 * Call once after the sign-in section is present in the DOM.
 *
 * @param {Object} opts
 * @param {string} opts.phoneInputId      — id of the <input type="tel">
 * @param {string} opts.sendBtnId         — id of the Send OTP <button>
 * @param {string} opts.recaptchaId       — id of the button used by invisible reCAPTCHA
 * @param {string} opts.errorId           — id of the error <p>
 * @param {string} opts.resendCountdownId — id of the resend countdown <span>
 */
export function initSignIn({ phoneInputId, sendBtnId, recaptchaId, errorId, resendCountdownId }) {
  const phoneInput  = document.getElementById(phoneInputId);
  const sendBtn     = document.getElementById(sendBtnId);
  const errorEl     = document.getElementById(errorId);
  const countdownEl = document.getElementById(resendCountdownId);

  if (!phoneInput || !sendBtn) {
    console.error("[Phase 1 sign-in] Required DOM elements not found.");
    return;
  }

  // Listen for reCAPTCHA expiry so we can reset state
  window.addEventListener("abacus:recaptcha-expired", () => {
    setError(errorEl, "reCAPTCHA expired. Please try again.");
    setButtonState(sendBtn, false, "Send OTP");
  });

  sendBtn.addEventListener("click", () => handleSend({ phoneInput, sendBtn, recaptchaId, errorEl, countdownEl }));

  // Allow Enter key in the phone field to trigger send
  phoneInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend({ phoneInput, sendBtn, recaptchaId, errorEl, countdownEl });
    }
  });
}

// ── Internal helpers ─────────────────────────────────────────────────────────

async function handleSend({ phoneInput, sendBtn, recaptchaId, errorEl, countdownEl }) {
  // Block keyboard/automation re-entry while the button is disabled (including cooldown).
  if (sendBtn.disabled) return;
  clearError(errorEl);

  const raw   = phoneInput.value.trim();
  const phone = normalisePhone(raw);

  if (!phone) {
    setError(errorEl, "Please enter a valid phone number (include country code, e.g. +91 98765 43210).");
    return;
  }

  setButtonState(sendBtn, true, "Sending…");

  try {
    const verifier           = setupRecaptcha(recaptchaId);
    const confirmationResult = await sendOtp(phone, verifier);

    // Broadcast success so otp-verification.js can take over
    window.dispatchEvent(
      new CustomEvent("abacus:otp-sent", {
        detail: { confirmationResult, phone },
      })
    );

    startResendCooldown(sendBtn, countdownEl);
  } catch (err) {
    setButtonState(sendBtn, false, "Send OTP");
    setError(errorEl, friendlyError(err));
    console.error("[Phase 1 sign-in] sendOtp error:", err);
  }
}

/**
 * Normalise a phone string to E.164.
 * Accepts: +919876543210 or +91 98765 43210.
 * Returns null if the value is not E.164-compatible.
 */
function normalisePhone(raw) {
  // Strip spaces and dashes
  const stripped = raw.replace(/[\s\-().]/g, "");
  if (!stripped) return null;
  // Must start with + and have at least 8 digits total
  if (!/^\+\d{7,15}$/.test(stripped)) return null;
  return stripped;
}

function startResendCooldown(sendBtn, countdownEl) {
  setButtonState(sendBtn, true, "Resend OTP");
  _resendCooldown = RESEND_COOLDOWN_MS / 1000;

  if (countdownEl) countdownEl.textContent = `(resend in ${_resendCooldown}s)`;

  clearInterval(_resendTimer);
  _resendTimer = setInterval(() => {
    _resendCooldown -= 1;
    if (countdownEl) countdownEl.textContent = `(resend in ${_resendCooldown}s)`;
    if (_resendCooldown <= 0) {
      clearInterval(_resendTimer);
      if (countdownEl) countdownEl.textContent = "";
      setButtonState(sendBtn, false, "Resend OTP");
    }
  }, 1000);
}

function setButtonState(btn, disabled, label) {
  btn.disabled    = disabled;
  btn.textContent = label;
  btn.setAttribute("aria-busy", disabled ? "true" : "false");
}

function setError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.hidden      = false;
  el.setAttribute("role", "alert");
}

function clearError(el) {
  if (!el) return;
  el.textContent = "";
  el.hidden      = true;
}

/** Map Firebase error codes to friendly messages. */
function friendlyError(err) {
  const code = err?.code ?? "";
  const map  = {
    "auth/invalid-phone-number":   "That phone number doesn't look right. Include the country code (e.g. +91).",
    "auth/too-many-requests":      "Too many attempts. Please wait a few minutes before trying again.",
    "auth/quota-exceeded":         "SMS quota exceeded for this project. Please try again later.",
    "auth/captcha-check-failed":   "reCAPTCHA check failed. Please refresh and try again.",
    "auth/missing-phone-number":   "Please enter a phone number.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/operation-not-allowed":  "Phone Auth is not enabled for this Firebase project. Enable it in the Firebase Console.",
  };
  return map[code] ?? `Error: ${err?.message ?? "Unknown error. Please try again."}`;
}
