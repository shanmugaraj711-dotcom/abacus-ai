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
export const RESEND_COOLDOWN_SEQUENCE_S = [60, 120, 300];

// ── State ────────────────────────────────────────────────────────────────────
let _resendTimer    = null;
let _resendCooldown = 0;
let _resendIndex    = 0;
let _lastPhone      = null;

export function getResendCooldown() {
  return _resendCooldown;
}

export function getResendIndex() {
  return _resendIndex;
}

export function resetResendState() {
  clearInterval(_resendTimer);
  _resendTimer    = null;
  _resendCooldown = 0;
  _resendIndex    = 0;
  _lastPhone      = null;
}

// ── Exported entry point ─────────────────────────────────────────────────────

/**
 * Initialise the sign-in form.
 * Call once after the sign-in section is present in the DOM.
 *
 * @param {Object} opts
 * @param {string} opts.phoneInputId      — id of the <input type="tel">
 * @param {string} [opts.countrySelectId] — id of the country <select>
 * @param {string} [opts.phoneHintId]     — id of the phone hint <span>
 * @param {string} opts.sendBtnId         — id of the Send OTP <button>
 * @param {string} opts.recaptchaId       — id of the button used by invisible reCAPTCHA
 * @param {string} opts.errorId           — id of the error <p>
 * @param {string} opts.resendCountdownId — id of the resend countdown <span>
 */
export function initSignIn({
  phoneInputId,
  countrySelectId = "phase1-country",
  phoneHintId = "phase1-phone-hint",
  sendBtnId,
  recaptchaId,
  errorId,
  resendCountdownId,
}) {
  const phoneInput    = document.getElementById(phoneInputId);
  const countrySelect = document.getElementById(countrySelectId);
  const hintEl        = document.getElementById(phoneHintId);
  const sendBtn       = document.getElementById(sendBtnId);
  const errorEl       = document.getElementById(errorId);
  const countdownEl   = document.getElementById(resendCountdownId);

  if (!phoneInput || !sendBtn) {
    console.error("[sign-in] Required DOM elements not found.");
    return;
  }

  // Autofocus mobile number input if active section is visible
  if (!phoneInput.closest("[hidden]")) {
    phoneInput.focus();
  }

  // Update placeholder and hint when country code changes
  if (countrySelect) {
    countrySelect.addEventListener("change", () => {
      clearError(errorEl);
      const code = countrySelect.value;
      if (code === "+91") {
        phoneInput.placeholder = "98765 43210";
        if (hintEl) hintEl.textContent = "Enter 10-digit mobile number";
      } else if (code === "+1") {
        phoneInput.placeholder = "555 123 4567";
        if (hintEl) hintEl.textContent = "Enter 10-digit mobile number";
      } else {
        phoneInput.placeholder = "Mobile number";
        if (hintEl) hintEl.textContent = `Enter mobile number (${code})`;
      }
      phoneInput.focus();
    });
  }

  // Auto-format Indian numbers while typing (XXXXX XXXXX) and clear errors
  phoneInput.addEventListener("input", () => {
    clearError(errorEl);
    const code = countrySelect ? countrySelect.value : "+91";
    const val = phoneInput.value;
    if (!val.startsWith("+") && code === "+91") {
      const digits = val.replace(/\D/g, "").slice(0, 10);
      if (digits.length > 5) {
        phoneInput.value = `${digits.slice(0, 5)} ${digits.slice(5)}`;
      } else {
        phoneInput.value = digits;
      }
    }
  });

  // Listen for reCAPTCHA expiry so we can reset state
  window.addEventListener("abacus:recaptcha-expired", () => {
    setError(errorEl, "reCAPTCHA expired. Please try again.");
    setButtonState(sendBtn, false, "Send OTP");
  });

  sendBtn.addEventListener("click", () =>
    handleSend({ phoneInput, countrySelect, sendBtn, recaptchaId, errorEl, countdownEl })
  );

  // Allow Enter key in the phone field to trigger send
  phoneInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend({ phoneInput, countrySelect, sendBtn, recaptchaId, errorEl, countdownEl });
    }
  });
}

// ── Internal helpers ─────────────────────────────────────────────────────────

async function handleSend({ phoneInput, countrySelect, sendBtn, recaptchaId, errorEl, countdownEl }) {
  // Block keyboard/automation re-entry while the button is disabled (including cooldown).
  if (sendBtn.disabled) return;
  clearError(errorEl);

  const raw = phoneInput.value;
  const countryCode = countrySelect ? countrySelect.value : "+91";
  const { phone, error } = validateAndFormatPhone(raw, countryCode);

  if (error) {
    setError(errorEl, error);
    phoneInput.focus();
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

    if (_lastPhone !== phone) {
      _lastPhone   = phone;
      _resendIndex = 0;
    }

    const cooldownSec = RESEND_COOLDOWN_SEQUENCE_S[
      Math.min(_resendIndex, RESEND_COOLDOWN_SEQUENCE_S.length - 1)
    ];
    _resendIndex++;

    startResendCooldown(sendBtn, countdownEl, cooldownSec);
  } catch (err) {
    setButtonState(sendBtn, false, _resendIndex > 0 ? "Resend OTP" : "Send OTP");
    setError(errorEl, friendlyError(err));
    console.error("[sign-in] sendOtp error:", err);
  }
}

/**
 * Validate and format phone number for dispatch.
 *
 * Rules:
 * - If raw starts with '+', validates as international E.164.
 *   If it starts with +91, verifies exactly 10 digits follow.
 * - If countryCode is '+91' (default):
 *   - Strips non-digits.
 *   - If 11 digits starting with '0', removes leading 0.
 *   - If 12 digits starting with '91', removes leading 91.
 *   - Verifies exactly 10 digits.
 *   - Formats to '+91' + 10 digits.
 * - If countryCode is '+1':
 *   - Strips non-digits.
 *   - If 11 digits starting with '1', removes leading 1.
 *   - Verifies exactly 10 digits.
 *   - Formats to '+1' + 10 digits.
 * - Other countries:
 *   - Strips non-digits.
 *   - Checks combined `${countryCode}${digits}` matches E.164 (/^\+\d{7,15}$/).
 *
 * @param {string} raw
 * @param {string} [countryCode="+91"]
 * @returns {{ phone: string | null, error: string | null }}
 */
export function validateAndFormatPhone(raw, countryCode = "+91") {
  const trimmed = (raw || "").trim();
  if (!trimmed) {
    return { phone: null, error: "Please enter your mobile number." };
  }

  // International input format (starts with +)
  if (trimmed.startsWith("+")) {
    const clean = trimmed.replace(/[\s\-().]/g, "");
    if (!/^\+\d{7,15}$/.test(clean)) {
      return { phone: null, error: "Please enter a valid phone number." };
    }
    if (clean.startsWith("+91")) {
      const local = clean.slice(3);
      if (local.length !== 10) {
        return { phone: null, error: "Please enter a valid 10-digit mobile number." };
      }
    }
    return { phone: clean, error: null };
  }

  const digits = trimmed.replace(/\D/g, "");
  const code = (countryCode || "+91").trim();

  if (code === "+91") {
    let local = digits;
    if (local.length === 11 && local.startsWith("0")) {
      local = local.slice(1);
    } else if (local.length === 12 && local.startsWith("91")) {
      local = local.slice(2);
    }

    if (local.length !== 10) {
      return { phone: null, error: "Please enter a valid 10-digit mobile number." };
    }

    return { phone: `+91${local}`, error: null };
  }

  if (code === "+1") {
    let local = digits;
    if (local.length === 11 && local.startsWith("1")) {
      local = local.slice(1);
    }
    if (local.length !== 10) {
      return { phone: null, error: "Please enter a valid 10-digit mobile number." };
    }
    return { phone: `+1${local}`, error: null };
  }

  const full = `${code}${digits}`;
  if (!/^\+\d{7,15}$/.test(full) || digits.length < 6) {
    return { phone: null, error: "Please enter a valid mobile number." };
  }

  return { phone: full, error: null };
}

/**
 * Normalise a phone string to E.164.
 * Accepts: +919876543210 or +91 98765 43210.
 * Returns null if the value is not E.164-compatible.
 */
export function normalisePhone(raw) {
  const { phone } = validateAndFormatPhone(raw, "+91");
  return phone;
}

export function startResendCooldown(sendBtn, countdownEl, seconds) {
  setButtonState(sendBtn, true, "Resend OTP");
  _resendCooldown = Number.isFinite(seconds) ? seconds : RESEND_COOLDOWN_SEQUENCE_S[0];

  if (countdownEl) countdownEl.textContent = `(resend in ${_resendCooldown}s)`;

  clearInterval(_resendTimer);
  _resendTimer = setInterval(() => {
    _resendCooldown -= 1;
    if (countdownEl) {
      countdownEl.textContent = _resendCooldown > 0 ? `(resend in ${_resendCooldown}s)` : "";
    }
    if (_resendCooldown <= 0) {
      clearInterval(_resendTimer);
      _resendTimer = null;
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
    "auth/billing-not-enabled":    "SMS service is currently unavailable or pending billing verification. Please try again shortly.",
    "auth/unauthorized-domain":     "This website address is not authorized in Firebase Authentication. Add this domain in Firebase Console → Authentication → Settings → Authorized domains.",
    "auth/missing-app-credential":  "App verification could not be completed. Please refresh the page and try again.",
    "auth/app-check-token-is-invalid":"App verification failed. Please refresh the page and try again.",
  };
  return map[code] ?? `Error: ${err?.message ?? "Unknown error. Please try again."}`;
}
