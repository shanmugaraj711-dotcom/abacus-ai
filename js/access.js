/**
 * js/access.js
 * Centralized authorization, guest mode predicates, auth gate & conversion prompts.
 *
 * Rules:
 *   - Guest: Level 1 allowed; Mystery Number ('mystery') allowed; all others locked
 *   - Free registered: Level 1 allowed; Game 'race' allowed; Lesson 1 allowed; Free Play locked
 *   - Starter registered: Levels 1-6 allowed; 4 games allowed; Lessons 1-6 allowed; Free Play open (₹99/30d)
 *   - Paid registered: Levels 1-15 allowed; all games allowed; all lessons allowed; Free Play open (₹499 lifetime unlock)
 */

import {
  getAuthInstance,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
} from '../firebase/auth.js';
import { isPaid, getMaxLevel, getGames, getMaxLesson, canAccessFreePlay } from './payments.js';
import { pingVisit } from './store.js';
import { TIERS } from './tiers.js';

export const GUEST_GAME_ID = 'mystery'; // Mystery Number — introductory bead reading game
export const FREE_LEVELS = [TIERS.free.maxLevel];
export const FREE_GAMES = TIERS.free.games;
export const AUTH_MODE_KEY = 'abacus-auth-mode';

const GOOGLE_SVG = `<svg style="width:20px;height:20px;margin-right:6px;vertical-align:middle;" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>`;

/**
 * Returns current auth mode: 'registered' | 'guest' | null (if not yet chosen)
 */
export function getAuthMode() {
  try {
    const user = getAuthInstance()?.currentUser;
    if (user && user.uid) return 'registered';
  } catch {}
  try {
    const mode = localStorage.getItem(AUTH_MODE_KEY);
    if (mode === 'registered' || mode === 'guest') return mode;
  } catch {}
  return null;
}

/**
 * Explicitly save the chosen auth mode ('guest' | 'registered')
 */
export function setAuthMode(mode) {
  try {
    if (mode) localStorage.setItem(AUTH_MODE_KEY, mode);
    else localStorage.removeItem(AUTH_MODE_KEY);
  } catch {}
}

export function isGuestUser() {
  try {
    const user = getAuthInstance()?.currentUser;
    if (user && user.uid) return false;
  } catch {}
  if (isPaid()) return false;
  try {
    const mode = localStorage.getItem(AUTH_MODE_KEY);
    if (mode === 'registered') return false;
    if (mode === 'guest') return true;
  } catch {}
  return false;
}

/**
 * Authoritative level access check:
 * - Guest: only Level 1 is allowed
 * - Tiered user: bounded by getMaxLevel() (Free: 1, Starter: 6, Lifetime: 15)
 */
export function canAccessLevel(level) {
  const n = Number(level);
  if (isNaN(n) || n < 1) return false;
  if (isGuestUser()) return n === 1;
  return n <= getMaxLevel();
}

/**
 * Backward compatibility helper for guest checks
 */
export function canGuestAccessLevel(level) {
  return canAccessLevel(level);
}

/**
 * Authoritative game access check:
 * - Guest: only GUEST_GAME_ID ('mystery') allowed
 * - Tiered user: checked against getGames() (Free: ['race'], Starter: 4 games, Lifetime: all 7)
 */
export function canAccessGame(gameId) {
  if (isGuestUser()) {
    return String(gameId) === GUEST_GAME_ID;
  }
  const allowed = getGames();
  return Array.isArray(allowed) && allowed.includes(String(gameId));
}

/**
 * Backward compatibility helper for guest checks
 */
export function canGuestAccessGame(gameId) {
  return canAccessGame(gameId);
}

/**
 * Authoritative lesson access check:
 * - Guest: only Lesson 1 allowed
 * - Tiered user: bounded by getMaxLesson() (Free: 1, Starter: 6, Lifetime: 11)
 */
export function canAccessLesson(lessonId) {
  const n = Number(lessonId);
  if (isNaN(n) || n < 1) return false;
  if (isGuestUser()) return n === 1;
  return n <= getMaxLesson();
}

/**
 * Authoritative Free Play access check:
 * - Guest: locked
 * - Tiered user: checked against canAccessFreePlay() (Free: locked, Starter: open, Lifetime: open)
 */
export function canAccessFreePlayMode() {
  if (isGuestUser()) return false;
  return canAccessFreePlay();
}

/**
 * Feature access check:
 * Exams, tests, and certificates are denied for guests.
 */
export function canGuestAccessFeature(feature) {
  if (!isGuestUser()) return true;
  if (feature === 'tests' || feature === 'exams' || feature === 'certificates' || feature === 'paid') {
    return false;
  }
  return true;
}

/**
 * Maps Firebase Auth error codes to helpful, friendly user messages.
 */
export function formatAuthError(err) {
  const code = err?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email. Click Create Account below.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Incorrect email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please log in.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/missing-password':
      return 'Please enter your password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few moments and try again.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in cancelled. Please try again.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups.';
    default:
      return err?.message || 'Authentication error. Please try again.';
  }
}

/**
 * Renders Email & Password form (login or registration) into a target container.
 */
export function renderEmailAuthView({ container, initialMode = 'login', onSuccess, onBack }) {
  let mode = initialMode; // 'login' | 'register'
  let submitting = false;

  function render() {
    const isLogin = mode === 'login';
    container.innerHTML = `
      <div class="auth-form-card">
        <h3 class="auth-form-title">${isLogin ? '🔐 Account Login' : '✨ Create Free Account'}</h3>
        <p class="muted center tiny" style="margin-bottom:14px;">
          ${isLogin ? 'Enter your details to sign in and restore your child’s progress.' : 'Create your free account to save your progress.'}
        </p>

        <div id="emailAuthError" class="auth-error" style="display:none;" role="alert"></div>
        <div id="emailAuthSuccess" class="auth-success" style="display:none;" role="alert"></div>

        <form id="emailAuthForm" novalidate onsubmit="return false;">
          <div class="auth-field">
            <label for="emailAuthEmail">Email Address</label>
            <input type="email" id="emailAuthEmail" placeholder="parent@example.com" autocomplete="email" required>
          </div>

          <div class="auth-field">
            <label for="emailAuthPassword">Password</label>
            <input type="password" id="emailAuthPassword" placeholder="••••••••" autocomplete="${isLogin ? 'current-password' : 'new-password'}" required>
          </div>

          ${!isLogin ? `
            <div class="auth-field">
              <label for="emailAuthConfirmPassword">Confirm Password</label>
              <input type="password" id="emailAuthConfirmPassword" placeholder="••••••••" autocomplete="new-password" required>
            </div>
          ` : ''}

          <div class="stack" style="margin-top:16px;">
            <button type="submit" class="btn primary wide" id="emailAuthSubmitBtn">
              ${isLogin ? 'Login' : 'Create account'}
            </button>
            ${isLogin ? `
              <button type="button" class="btn ghost small wide" id="emailAuthForgotBtn">
                Forgot password?
              </button>
            ` : ''}
            <button type="button" class="btn wide auth-btn-guest" id="emailAuthToggleBtn">
              ${isLogin ? 'New here? Create free account' : 'Already have an account? Login'}
            </button>
            ${onBack ? `
              <button type="button" class="btn ghost small wide" id="emailAuthBackBtn">
                ← Back
              </button>
            ` : ''}
          </div>
        </form>
      </div>
    `;

    const form = container.querySelector('#emailAuthForm');
    const emailInput = container.querySelector('#emailAuthEmail');
    const passInput = container.querySelector('#emailAuthPassword');
    const confirmInput = container.querySelector('#emailAuthConfirmPassword');
    const errorEl = container.querySelector('#emailAuthError');
    const successEl = container.querySelector('#emailAuthSuccess');
    const submitBtn = container.querySelector('#emailAuthSubmitBtn');
    const toggleBtn = container.querySelector('#emailAuthToggleBtn');
    const forgotBtn = container.querySelector('#emailAuthForgotBtn');
    const backBtn = container.querySelector('#emailAuthBackBtn');

    function showError(msg) {
      if (successEl) successEl.style.display = 'none';
      if (errorEl) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
      }
    }

    function showSuccess(msg) {
      if (errorEl) errorEl.style.display = 'none';
      if (successEl) {
        successEl.textContent = msg;
        successEl.style.display = 'block';
      }
    }

    if (toggleBtn) {
      toggleBtn.onclick = () => {
        mode = mode === 'login' ? 'register' : 'login';
        render();
      };
    }

    if (backBtn && onBack) {
      backBtn.onclick = () => onBack();
    }

    if (forgotBtn) {
      forgotBtn.onclick = async () => {
        const email = emailInput?.value?.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return showError('Please enter your email address to reset password.');
        }
        forgotBtn.disabled = true;
        forgotBtn.textContent = 'Sending reset email…';
        try {
          await resetPassword(email);
          showSuccess('Password reset link sent! Please check your email inbox.');
        } catch (err) {
          showError(formatAuthError(err));
        } finally {
          forgotBtn.disabled = false;
          forgotBtn.textContent = 'Forgot password?';
        }
      };
    }

    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        const email = emailInput?.value?.trim() || '';
        const password = passInput?.value || '';

        // Validation
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return showError('Please enter a valid email address.');
        }
        if (!password || password.length < 6) {
          return showError('Password must be at least 6 characters.');
        }
        if (mode === 'register') {
          const confirm = confirmInput?.value || '';
          if (password !== confirm) {
            return showError('Passwords do not match. Please verify.');
          }
        }

        submitting = true;
        submitBtn.disabled = true;
        submitBtn.textContent = mode === 'login' ? 'Signing in…' : 'Creating account…';
        errorEl.style.display = 'none';

        try {
          let cred;
          if (mode === 'login') {
            cred = await signInWithEmail(email, password);
          } else {
            cred = await signUpWithEmail(email, password);
          }

          setAuthMode('registered');
          if (cred?.user?.uid) {
            pingVisit(cred.user.uid).catch(() => {});
          }

          if (onSuccess) {
            onSuccess(cred?.user);
          }
        } catch (err) {
          submitting = false;
          submitBtn.disabled = false;
          submitBtn.textContent = mode === 'login' ? 'Login' : 'Create account';
          showError(formatAuthError(err));
        }
      };
    }
  }

  render();
}

/**
 * Shows the friendly locked-experience conversion prompt modal for guest users.
 */
export function showConversionPrompt(options = {}) {
  // Remove any existing modal
  const existing = document.getElementById('abacusConversionModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'abacusConversionModal';
  modal.className = 'conversion-modal-overlay';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  function renderPromptContent() {
    modal.innerHTML = `
      <div class="conversion-modal-card">
        <div style="font-size:38px;margin-bottom:6px;">🔒</div>
        <h2 class="conversion-modal-title">More Abacus adventures are waiting!</h2>
        <p class="conversion-modal-desc">Create your free account to save your progress.</p>

        <div class="auth-actions">
          <button type="button" class="btn wide auth-btn-google" id="modalGoogleBtn">
            ${GOOGLE_SVG}
            Continue with Google
          </button>
          <button type="button" class="btn wide auth-btn-email" id="modalEmailBtn">
            ✉️ Login with Email
          </button>
          <button type="button" class="btn ghost wide" id="modalPlansBtn" style="margin-top:4px;min-height:44px;">
            See plans
          </button>
          <div class="auth-divider">─── or ───</div>
          <button type="button" class="btn wide auth-btn-guest" id="modalGuestBtn">
            🎮 Continue as Guest
          </button>
        </div>
      </div>
    `;

    const googleBtn = modal.querySelector('#modalGoogleBtn');
    const emailBtn = modal.querySelector('#modalEmailBtn');
    const guestBtn = modal.querySelector('#modalGuestBtn');
    const plansBtn = modal.querySelector('#modalPlansBtn');

    if (plansBtn) {
      plansBtn.onclick = async () => {
        modal.remove();
        const { go } = await import('./ui.js');
        go('#/starter');
      };
    }

    if (guestBtn) {
      guestBtn.onclick = () => {
        modal.remove();
        if (options.onContinueGuest) options.onContinueGuest();
      };
    }

    if (googleBtn) {
      googleBtn.onclick = async () => {
        googleBtn.disabled = true;
        googleBtn.textContent = 'Connecting to Google…';
        try {
          const cred = await signInWithGoogle();
          if (cred?.user) {
            setAuthMode('registered');
            pingVisit(cred.user.uid).catch(() => {});
            modal.remove();
            if (options.onSuccessAuth) options.onSuccessAuth(cred.user);
            else if (typeof window !== 'undefined' && window.location) {
              window.location.reload();
            }
          }
        } catch (err) {
          googleBtn.disabled = false;
          googleBtn.innerHTML = `${GOOGLE_SVG} Continue with Google`;
          alert(formatAuthError(err));
        }
      };
    }

    if (emailBtn) {
      emailBtn.onclick = () => {
        const card = modal.querySelector('.conversion-modal-card');
        if (card) {
          renderEmailAuthView({
            container: card,
            initialMode: 'login',
            onSuccess: (user) => {
              modal.remove();
              if (options.onSuccessAuth) options.onSuccessAuth(user);
              else if (typeof window !== 'undefined' && window.location) {
                window.location.reload();
              }
            },
            onBack: () => renderPromptContent(),
          });
        }
      };
    }
  }

  renderPromptContent();
  document.body.appendChild(modal);
}
