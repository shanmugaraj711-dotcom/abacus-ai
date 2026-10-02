/**
 * auth/sign-in.js
 * Unified Email/Password authentication handler.
 *
 * Reuses existing Firebase auth helpers from firebase/auth.js:
 *   - signInWithEmail
 *   - signUpWithEmail
 *   - resetPassword
 */

import {
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
} from "../firebase/auth.js";
import { formatAuthError } from "../js/access.js";

/**
 * Initialise the email/password sign-in form.
 *
 * @param {Object} opts
 * @param {string} opts.formId
 * @param {string} opts.emailInputId
 * @param {string} opts.passwordInputId
 * @param {string} opts.confirmFieldId
 * @param {string} opts.confirmPasswordInputId
 * @param {string} opts.submitBtnId
 * @param {string} opts.forgotBtnId
 * @param {string} opts.toggleBtnId
 * @param {string} opts.errorId
 * @param {string} opts.successId
 * @param {function(UserCredential): void} opts.onSignedIn
 */
export function initSignIn({
  formId = "phase1-email-form",
  emailInputId = "phase1-email",
  passwordInputId = "phase1-password",
  confirmFieldId = "phase1-confirm-field",
  confirmPasswordInputId = "phase1-confirm-password",
  submitBtnId = "phase1-submit-btn",
  forgotBtnId = "phase1-forgot-btn",
  toggleBtnId = "phase1-toggle-btn",
  errorId = "phase1-auth-error",
  successId = "phase1-auth-success",
  onSignedIn,
} = {}) {
  const form = document.getElementById(formId);
  const emailInput = document.getElementById(emailInputId);
  const passInput = document.getElementById(passwordInputId);
  const confirmField = document.getElementById(confirmFieldId);
  const confirmInput = document.getElementById(confirmPasswordInputId);
  const submitBtn = document.getElementById(submitBtnId);
  const forgotBtn = document.getElementById(forgotBtnId);
  const toggleBtn = document.getElementById(toggleBtnId);
  const errorEl = document.getElementById(errorId);
  const successEl = document.getElementById(successId);

  if (!form || !emailInput || !passInput || !submitBtn) {
    return;
  }

  let mode = "login"; // 'login' | 'register'
  let isSubmitting = false;

  function clearFeedback() {
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.hidden = true;
    }
    if (successEl) {
      successEl.textContent = "";
      successEl.hidden = true;
    }
  }

  function showError(msg) {
    if (successEl) successEl.hidden = true;
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
    }
  }

  function showSuccess(msg) {
    if (errorEl) errorEl.hidden = true;
    if (successEl) {
      successEl.textContent = msg;
      successEl.hidden = false;
    }
  }

  function updateModeUI() {
    clearFeedback();
    const isLogin = mode === "login";
    if (confirmField) confirmField.hidden = isLogin;
    if (forgotBtn) forgotBtn.hidden = !isLogin;
    if (submitBtn) submitBtn.textContent = isLogin ? "Sign in" : "Create account";
    if (toggleBtn) {
      toggleBtn.textContent = isLogin
        ? "New here? Create free account"
        : "Already have an account? Sign in";
    }
    const subtitle = document.getElementById("phase1-header-subtitle");
    if (subtitle) {
      subtitle.textContent = isLogin
        ? "Sign in with Google or Email to unlock lessons & games"
        : "Create your parent account to track and restore progress";
    }
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      mode = mode === "login" ? "register" : "login";
      updateModeUI();
    });
  }

  if (forgotBtn) {
    forgotBtn.addEventListener("click", async () => {
      clearFeedback();
      const email = emailInput.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return showError("Please enter your email address to reset password.");
      }
      forgotBtn.disabled = true;
      forgotBtn.textContent = "Sending reset email…";
      try {
        await resetPassword(email);
        showSuccess("Password reset link sent! Check your inbox.");
      } catch (err) {
        showError(formatAuthError(err));
      } finally {
        forgotBtn.disabled = false;
        forgotBtn.textContent = "Forgot password?";
      }
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    clearFeedback();
    const email = emailInput.value.trim();
    const password = passInput.value;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return showError("Please enter a valid email address.");
    }
    if (!password || password.length < 6) {
      return showError("Password must be at least 6 characters.");
    }

    if (mode === "register") {
      const confirmPass = confirmInput?.value;
      if (password !== confirmPass) {
        return showError("Passwords do not match. Please verify.");
      }
    }

    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = mode === "login" ? "Signing in…" : "Creating account…";

    try {
      let cred;
      if (mode === "login") {
        cred = await signInWithEmail(email, password);
      } else {
        cred = await signUpWithEmail(email, password);
      }
      if (cred && onSignedIn) {
        onSignedIn(cred);
      }
    } catch (err) {
      showError(formatAuthError(err));
      submitBtn.disabled = false;
      submitBtn.textContent = mode === "login" ? "Sign in" : "Create account";
    } finally {
      isSubmitting = false;
    }
  });

  updateModeUI();
}
