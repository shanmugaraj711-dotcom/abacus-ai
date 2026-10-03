// Paid unlock integration for Abacus Buddy.
// Business model: free levels 1–2, one-time ₹499 base lifetime unlock for levels 3–15.
//
// Offline paid entitlement isolation:
//   - A cached entitlement { paid: true, uid, cachedAt } in localStorage ('abacus-entitlement-v1')
//     is ONLY trusted when cached.uid strictly matches the currently authenticated Firebase user.
//   - If the cached UID does not match the current user, or if no user is signed in,
//     the cache is invalidated/cleared and paid is set to false.
//   - On auth-user change or sign-out, entitlement is immediately revoked and cache cleared.
//   - Authenticated API endpoints (especially /api/user-status) are never cached by the Service Worker,
//     preventing any cross-user response exposure on shared devices.

import { initFirebase, getAuthInstance, onAuthChange } from "../firebase/auth.js";
import { pingVisit } from "./store.js";
import { TIERS, getTierConfig, isFreePlayAllowedForTier } from "./tiers.js";

const CACHE_KEY = 'abacus-entitlement-v1';

let entitlement = {
  paid: false,
  tier: 'free',
  maxLevel: TIERS.free.maxLevel,
  games: TIERS.free.games,
  maxLesson: TIERS.free.maxLesson,
  freePlay: TIERS.free.freePlay,
  expiresAt: null,
  expired: false,
};
let checked = false;
let currentUid = null;
let starterEnabled = false;

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : null;
  } catch { return null; }
}

function writeCache(uid, entOrPaid) {
  try {
    if (!uid) return;
    const isPaidVal = typeof entOrPaid === 'object' && entOrPaid !== null ? entOrPaid.paid === true : entOrPaid === true;
    const tierVal = typeof entOrPaid === 'object' && entOrPaid !== null ? (entOrPaid.tier || (isPaidVal ? 'lifetime' : 'free')) : (isPaidVal ? 'lifetime' : 'free');
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      paid: isPaidVal,
      tier: tierVal,
      entitlement: typeof entOrPaid === 'object' && entOrPaid !== null ? entOrPaid : null,
      uid,
      cachedAt: new Date().toISOString()
    }));
  } catch {}
}

export function clearCache() {
  const freeCfg = TIERS.free;
  entitlement = {
    paid: false,
    tier: 'free',
    maxLevel: freeCfg.maxLevel,
    games: freeCfg.games,
    maxLesson: freeCfg.maxLesson,
    freePlay: freeCfg.freePlay,
    expiresAt: null,
    expired: false
  };
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}

export const isPaid = () => entitlement.paid === true;
export const entitlementChecked = () => checked;
export const getEntitlement = () => ({ ...entitlement });
export const getTier = () => entitlement.tier;
export const getMaxLevel = () => entitlement.maxLevel;
export const getGames = () => (entitlement.games || getTierConfig(entitlement.tier).games);
export const getMaxLesson = () => getTierConfig(entitlement.tier).maxLesson;
export const canAccessFreePlay = () => isFreePlayAllowedForTier(getTierConfig(entitlement.tier));
export const isStarterEnabled = () => starterEnabled;

export function hasCachedEntitlementForUser(uid) {
  if (!uid) return false;
  const c = readCache();
  return Boolean(c && c.uid === uid && (c.paid || c.tier));
}

export function isPendingEntitlement() {
  if (checked) return false;
  const authMode = typeof localStorage !== 'undefined' ? localStorage.getItem('abacus-auth-mode') : null;
  const effectiveUid = currentUid || (typeof window !== 'undefined' && (window._abacusAuthUid || window.__mockUser?.uid));
  const hasUser = Boolean(effectiveUid || (typeof window !== 'undefined' && window.__mockUser) || authMode === 'registered');
  if (!hasUser) return false;
  if (effectiveUid && hasCachedEntitlementForUser(effectiveUid)) return false;
  return true;
}

function applyCachedEntitlement(c) {
  if (!c) return;
  const rawEnt = c.entitlement;
  const tier = rawEnt?.tier || c.tier || (c.paid ? 'lifetime' : 'free');
  if (tier === 'starter') {
    const expiresAt = rawEnt?.expiresAt || c.expiresAt;
    const isExpired = expiresAt ? (Date.parse(expiresAt) <= Date.now()) : false;
    if (isExpired) {
      const freeCfg = TIERS.free;
      entitlement = {
        paid: false,
        tier: 'free',
        maxLevel: freeCfg.maxLevel,
        games: freeCfg.games,
        maxLesson: freeCfg.maxLesson,
        freePlay: freeCfg.freePlay,
        expiresAt: expiresAt || null,
        expired: true
      };
      return;
    }
  }

  if (c.paid === true) {
    if (rawEnt) {
      entitlement = { ...rawEnt };
    } else {
      const cfg = getTierConfig(tier);
      entitlement = {
        paid: true,
        tier,
        maxLevel: cfg.maxLevel,
        games: cfg.games,
        maxLesson: cfg.maxLesson,
        freePlay: cfg.freePlay,
        expiresAt: rawEnt?.expiresAt || c.expiresAt || null,
        expired: false
      };
    }
  } else if (rawEnt) {
    entitlement = { ...rawEnt };
  } else {
    const freeCfg = TIERS.free;
    entitlement = {
      paid: false,
      tier: 'free',
      maxLevel: freeCfg.maxLevel,
      games: freeCfg.games,
      maxLesson: freeCfg.maxLesson,
      freePlay: freeCfg.freePlay,
      expiresAt: null,
      expired: false
    };
  }
}

// Continuously listen to auth state changes to enforce entitlement isolation:
// If the user signs out or a different user signs in, invalidate cached entitlement immediately.
try {
  initFirebase();
  onAuthChange(user => {
    const newUid = user ? user.uid : null;
    if (newUid !== currentUid) {
      currentUid = newUid;
      if (typeof window !== 'undefined') {
        window._abacusAuthUid = newUid;
      }
      const cache = readCache();
      if (!newUid) {
        // Signed out: immediately revoke paid state and clear cache
        clearCache();
        try {
          if (localStorage.getItem('abacus-auth-mode') === 'registered') {
            localStorage.setItem('abacus-auth-mode', 'guest');
          }
        } catch {}
      } else {
        try {
          localStorage.setItem('abacus-auth-mode', 'registered');
        } catch {}
        pingVisit(newUid).catch(() => {});
        if (cache && cache.uid === newUid) {
          applyCachedEntitlement(cache);
        } else {
          // User changed: never use another user's cached entitlement
          clearCache();
        }
        refreshEntitlement().catch(() => {});
      }
    }
  });
} catch {}

let refreshPromise = null;

export function refreshEntitlement() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      return await _executeRefreshEntitlement();
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function _executeRefreshEntitlement() {
  try {
    initFirebase();
  } catch (err) {
    console.warn("[Abacus payment] Firebase init skipped:", err);
  }

  // 1. Determine currently authenticated user first
  let user = null;
  try {
    const auth = getAuthInstance();
    if (auth?.currentUser) {
      user = auth.currentUser;
    } else {
      user = await new Promise(resolve => {
        let settled = false;
        let unsubscribe = () => {};
        try {
          unsubscribe = onAuthChange(u => {
            if (!settled) {
              settled = true;
              try { unsubscribe(); } catch {}
              resolve(u);
            }
          });
        } catch {
          resolve(null);
        }
        setTimeout(() => {
          if (!settled) {
            settled = true;
            try { unsubscribe(); } catch {}
            resolve(getAuthInstance()?.currentUser || null);
          }
        }, 500);
      });
    }
  } catch {
    user = null;
  }

  currentUid = user ? user.uid : null;

  // 2. If no user is authenticated, unauthenticated access is never entitled
  if (!user || !user.uid) {
    clearCache();
    checked = true;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('abacus:entitlement-updated', { detail: { ...entitlement } }));
    }
    return false;
  }

  // 3. User is authenticated. Check cache ONLY for this specific user UID
  const cache = readCache();
  if (cache && cache.uid === user.uid) {
    applyCachedEntitlement(cache);
  } else {
    if (cache && cache.uid !== user.uid) {
      clearCache();
    }
  }

  // 4. Verify against backend API over network
  try {
    const token = await user.getIdToken();
    const res = await fetch("/api/user-status", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Unable to check purchase status (${res.status})`);
    const data = await res.json();
    starterEnabled = Boolean(data.starterEnabled);
    if (data.paid === true) {
      const tier = data.tier || 'lifetime';
      const cfg = getTierConfig(tier);
      if (tier === 'starter') {
        const isExpired = data.expiresAt ? (Date.parse(data.expiresAt) <= Date.now()) : false;
        if (isExpired) {
          const freeCfg = TIERS.free;
          entitlement = {
            paid: false,
            tier: 'free',
            maxLevel: freeCfg.maxLevel,
            games: freeCfg.games,
            maxLesson: freeCfg.maxLesson,
            freePlay: freeCfg.freePlay,
            expiresAt: data.expiresAt,
            expired: true
          };
        } else {
          entitlement = {
            paid: true,
            tier: 'starter',
            maxLevel: data.maxLevel ?? cfg.maxLevel,
            games: data.games ?? cfg.games,
            maxLesson: cfg.maxLesson,
            freePlay: cfg.freePlay,
            expiresAt: data.expiresAt,
            expired: false
          };
        }
      } else {
        // legacy paid:true without tier -> lifetime
        entitlement = {
          paid: true,
          tier: 'lifetime',
          maxLevel: data.maxLevel ?? cfg.maxLevel,
          games: data.games ?? cfg.games,
          maxLesson: cfg.maxLesson,
          freePlay: cfg.freePlay,
          expiresAt: null,
          expired: false
        };
      }
    } else {
      const freeCfg = TIERS.free;
      entitlement = {
        paid: false,
        tier: 'free',
        maxLevel: freeCfg.maxLevel,
        games: freeCfg.games,
        maxLesson: freeCfg.maxLesson,
        freePlay: freeCfg.freePlay,
        expiresAt: data.expiresAt || null,
        expired: !!data.expired || (data.expiresAt ? Date.parse(data.expiresAt) <= Date.now() : false)
      };
    }
    writeCache(user.uid, entitlement);
  } catch (err) {
    console.warn("[Abacus payment] entitlement check skipped:", err);
    // Offline fallback: ONLY trust cached value if cached.uid strictly matches current user
    const c = readCache();
    if (c && c.uid === user.uid) {
      applyCachedEntitlement(c);
    } else if (c && c.uid !== user.uid) {
      clearCache();
    }
  }

  checked = true;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('abacus:entitlement-updated', { detail: { ...entitlement } }));
  }
  return isPaid();
}

async function loadRazorpay() {
  if (window.Razorpay) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Payment checkout could not load. Check your internet connection."));
    document.head.appendChild(s);
  });
}

export async function validateCoupon(couponCode) {
  initFirebase();
  const user = getAuthInstance().currentUser;
  if (!user) throw new Error("Please sign in first.");
  const token = await user.getIdToken(true);
  const res = await fetch("/api/validate-coupon", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ couponCode: String(couponCode || "").trim().toUpperCase() }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Invalid coupon.");
  return data;
}

export async function buyUnlock({ tier = 'lifetime', couponCode = "", onSuccess, onError } = {}) {
  try {
    initFirebase();
    const user = getAuthInstance().currentUser;
    if (!user) throw new Error("Please sign in first.");
    const token = await user.getIdToken(true);
    const orderRes = await fetch("/api/create-order", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        tier,
        ...(tier === 'lifetime' && couponCode ? { couponCode: String(couponCode).trim().toUpperCase() } : {})
      }),
    });
    const order = await orderRes.json();
    if (!orderRes.ok) throw new Error(order.error || "Could not create payment order.");
    if (order.paid) {
      const cfg = getTierConfig(tier);
      entitlement = {
        paid: true,
        tier: order.tier || tier,
        maxLevel: cfg.maxLevel,
        games: cfg.games,
        maxLesson: cfg.maxLesson,
        freePlay: cfg.freePlay,
        expiresAt: order.expiresAt || null,
        expired: false
      };
      currentUid = user.uid;
      writeCache(user.uid, entitlement);
      onSuccess?.();
      return true;
    }

    await loadRazorpay();
    const cfg = getTierConfig(tier);
    return await new Promise((resolve, reject) => {
      const description = tier === 'starter'
        ? "Abacus Buddy Starter — Levels 1–6 (30 days)"
        : "One-time payment unlock — Levels 2–15";

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Abacus Buddy",
        description,
        order_id: order.orderId,
        prefill: {
          contact: user.phoneNumber || "",
          email: user.email || "",
          name: user.displayName || "",
        },
        theme: { color: "#FFC53D" },
        handler: async (response) => {
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(response),
            });
            const verify = await verifyRes.json();
            if (!verifyRes.ok || verify.paid !== true) throw new Error(verify.error || "Payment verification failed.");
            entitlement = {
              paid: true,
              tier: verify.tier || tier,
              maxLevel: verify.maxLevel ?? cfg.maxLevel,
              games: verify.games ?? cfg.games,
              maxLesson: cfg.maxLesson,
              freePlay: cfg.freePlay,
              expiresAt: verify.expiresAt || null,
              expired: false
            };
            currentUid = user.uid;
            writeCache(user.uid, entitlement);
            onSuccess?.();
            resolve(true);
          } catch (err) {
            onError?.(err);
            reject(err);
          }
        },
        modal: { ondismiss: () => resolve(false) },
      });
      checkout.on("payment.failed", (response) => {
        const msg = response?.error?.description || "Payment failed. No unlock was applied.";
        onError?.(new Error(msg));
        reject(new Error(msg));
      });
      checkout.open();
    });
  } catch (err) {
    onError?.(err);
    throw err;
  }
}

let checkoutInProgress = false;

export async function startCheckout(tier = 'starter') {
  if (checkoutInProgress) {
    return false;
  }
  checkoutInProgress = true;
  try {
    initFirebase();
    const user = getAuthInstance()?.currentUser;
    if (!user) {
      const { showConversionPrompt } = await import('./access.js');
      const { go } = await import('./ui.js');
      showConversionPrompt({
        onContinueGuest: () => { go('#/home'); },
        onSuccessAuth: () => { go('#/starter'); }
      });
      return false;
    }
    const { isGuestUser, showConversionPrompt } = await import('./access.js');
    const { go } = await import('./ui.js');
    if (isGuestUser()) {
      showConversionPrompt({
        onContinueGuest: () => { go('#/home'); },
        onSuccessAuth: () => { go('#/starter'); }
      });
      return false;
    }

    const token = await user.getIdToken(true);
    const orderRes = await fetch("/api/create-order", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tier }),
    });
    const order = await orderRes.json();
    if (!orderRes.ok) {
      throw new Error(order.error || "Could not create payment order.");
    }

    const cfg = getTierConfig(tier);
    if (order.paid) {
      entitlement = {
        paid: true,
        tier: order.tier || tier,
        maxLevel: cfg.maxLevel,
        games: cfg.games,
        maxLesson: cfg.maxLesson,
        freePlay: cfg.freePlay,
        expiresAt: order.expiresAt || null,
        expired: false,
      };
      currentUid = user.uid;
      writeCache(user.uid, entitlement);
      await refreshEntitlement();
      go('#/home');
      return true;
    }

    await loadRazorpay();

    const description = tier === 'starter'
      ? "Abacus Buddy Starter — Levels 1–6 (30 days)"
      : "One-time payment unlock — Levels 2–15";

    const paymentSuccess = await new Promise((resolve, reject) => {
      let settled = false;
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Abacus Buddy",
        description,
        order_id: order.orderId,
        prefill: {
          contact: user.phoneNumber || "",
          email: user.email || "",
          name: user.displayName || "",
        },
        theme: { color: "#FFC53D" },
        handler: async (response) => {
          settled = true;
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(response),
            });
            const verify = await verifyRes.json();
            if (!verifyRes.ok || verify.paid !== true) {
              throw new Error(verify.error || "Payment verification failed.");
            }
            entitlement = {
              paid: true,
              tier: verify.tier || tier,
              maxLevel: verify.maxLevel ?? cfg.maxLevel,
              games: verify.games ?? cfg.games,
              maxLesson: cfg.maxLesson,
              freePlay: cfg.freePlay,
              expiresAt: verify.expiresAt || null,
              expired: false,
            };
            currentUid = user.uid;
            writeCache(user.uid, entitlement);
            await refreshEntitlement();
            go('#/home');
            resolve(true);
          } catch (err) {
            reject(err);
          }
        },
        modal: {
          ondismiss: () => {
            if (!settled) resolve(false);
          },
        },
      });
      checkout.on("payment.failed", (response) => {
        settled = true;
        const msg = response?.error?.description || "Payment failed. No unlock was applied.";
        reject(new Error(msg));
      });
      checkout.open();
    });

    return paymentSuccess;
  } finally {
    checkoutInProgress = false;
  }
}

