/**
 * auth/otp-verification.js
 * Phase 1 — OTP entry, verification, and resend wiring.
 *
 * Responsibilities:
 *   - Listen for "abacus:otp-sent" and show the OTP section.
 *   - Validate the OTP format before calling Firebase.
 *   - Call verifyOtp() and emit "abacus:signed-in" on success.
 *   - Handle invalid/expired OTP gracefully with friendly messages.
 *   - Expose resetToSignIn() to go back to the phone step.
 */

import { verifyOtp } from "../firebase/auth.js";

// ── State ─────────────────────────────────────────────────────────────────────
let _confirmationResult = null;
let _phone              = null;

// ── Exported entry point ──────────────────────────────────────────────────────

/**
 * Initialise OTP verification.
 * Call once after the OTP section is present in the DOM.
 *
 * @param {Object} opts
 * @param {string} opts.otpSectionId   — id of the OTP section wrapper
 * @param {string} opts.otpInputId     — id of the OTP <input>
 * @param {string} opts.verifyBtnId    — id of the Verify <button>
 * @param {string} opts.otpErrorId     — id of the error <p>
 * @param {string} opts.phoneDisplayId — id of element showing the phone number
 * @param {string} opts.backBtnId      — id of the "Back / change number" button
 * @param {Function} opts.onSignedIn   — called with UserCredential on success
 * @param {Function} opts.onBack       — called when user wants to go back
 */
export function initOtpVerification({
  otpSectionId,
  otpInputId,
  verifyBtnId,
  otpErrorId,
  phoneDisplayId,
  backBtnId,
  onSignedIn,
  onBack,
}) {
  const otpSection   = document.getElementById(otpSectionId);
  const otpInput     = document.getElementById(otpInputId);
  const verifyBtn    = document.getElementById(verifyBtnId);
  const errorEl      = document.getElementById(otpErrorId);
  const phoneDisplay = document.getElementById(phoneDisplayId);
  const backBtn      = document.getElementById(backBtnId);

  if (!otpSection || !otpInput || !verifyBtn) {
    console.error("[Phase 1 otp] Required DOM elements not found.");
    return;
  }

  // Show OTP section when OTP has been sent
  window.addEventListener("abacus:otp-sent", (e) => {
    _confirmationResult = e.detail.confirmationResult;
    _phone              = e.detail.phone;

    if (phoneDisplay) phoneDisplay.textContent = _phone;

    otpSection.hidden = false;
    otpSection.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => otpInput.focus(), 200);
  });

  // Verify button
  verifyBtn.addEventListener("click", () =>
    handleVerify({ otpInput, verifyBtn, errorEl, onSignedIn })
  );

  // Enter key in OTP field
  otpInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleVerify({ otpInput, verifyBtn, errorEl, onSignedIn });
    }
  });

  // Auto-format: only allow digits, max 6
  otpInput.addEventListener("input", () => {
    otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6);
    clearError(errorEl);
  });

  // Back / change number
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      resetState(otpSection, otpInput, errorEl);
      if (onBack) onBack();
    });
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function handleVerify({ otpInput, verifyBtn, errorEl, onSignedIn }) {
  clearError(errorEl);

  const otp = otpInput.value.trim();

  if (!/^\d{6}$/.test(otp)) {
    setError(errorEl, "Please enter the 6-digit OTP.");
    return;
  }

  if (!_confirmationResult) {
    setError(errorEl, "Session expired. Please go back and request a new OTP.");
    return;
  }

  setButtonState(verifyBtn, true, "Verifying…");

  try {
    const credential = await verifyOtp(_confirmationResult, otp);
    setButtonState(verifyBtn, false, "Verify OTP");

    if (onSignedIn) onSignedIn(credential);
  } catch (err) {
    setButtonState(verifyBtn, false, "Verify OTP");
    setError(errorEl, friendlyError(err));
    console.error("[Phase 1 otp] verifyOtp error:", err);

    // On expired session, clear stored result so user knows to resend
    if (err?.code === "auth/session-expired" || err?.code === "auth/code-expired") {
      _confirmationResult = null;
    }
  }
}

function resetState(otpSection, otpInput, errorEl) {
  _confirmationResult = null;
  _phone              = null;
  otpInput.value      = "";
  otpSection.hidden   = true;
  clearError(errorEl);
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
    "auth/invalid-verification-code": "That OTP is incorrect. Please check and try again.",
    "auth/code-expired":              "The OTP has expired. Please go back and request a new one.",
    "auth/session-expired":           "Your session expired. Please go back and request a new OTP.",
    "auth/missing-verification-code": "Please enter the OTP.",
    "auth/network-request-failed":    "Network error. Check your connection and try again.",
    "auth/too-many-requests":         "Too many attempts. Please wait before trying again.",
  };
  return map[code] ?? `Verification failed: ${err?.message ?? "Unknown error."}`;
}
