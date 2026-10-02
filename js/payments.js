// Paid unlock integration for Abacus Buddy.
// Business model: Free, Starter (₹99 / 30 days), Lifetime (₹499).
//
// Offline paid entitlement isolation:
//   - A cached entitlement { paid: true, tier, expiresAt, uid, cachedAt } in localStorage ('abacus-entitlement-v1')
//     is ONLY trusted when cached.uid strictly matches the currently authenticated Firebase user.
//   - If the cached UID does not match the current user, or if no user is signed in,
//     the cache is invalidated/cleared and paid is set to false.
//   - On auth-user change or sign-out, entitlement is immediately revoked and cache cleared.
//   - Authenticated API endpoints (especially /api/user-status) are never cached by the Service Worker,
//     preventing any cross-user response exposure on shared devices.

import { initFirebase, getAuthInstance, onAuthChange } from "../firebase/auth.js";
import { pingVisit } from "./store.js";
import { resolveTier, TIERS, TIER_CONFIG, getGameLimit as tierGameLimit } from "./tiers.js";

const CACHE_KEY = 'abacus-entitlement-v1';

let paid = false;
let checked = false;
let currentUid = null;
let currentEntitlementObj = null;

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : null;
  } catch { return null; }
}

function writeCache(uid, data) {
  try {
    if (!uid) return;
    const isPaidBool = typeof data === 'boolean' ? data : (data?.paid === true);
    const tierVal = typeof data === 'object' && data?.tier ? data.tier : (isPaidBool ? TIERS.LIFETIME : TIERS.FREE);
    const expiresAtVal = typeof data === 'object' ? (data?.expiresAt || null) : null;
    const maxLevelVal = typeof data === 'object' && data?.maxLevel ? data.maxLevel : (isPaidBool ? 15 : 1);
    const gamesVal = typeof data === 'object' && data?.games ? data.games : null;

    const payload = {
      paid: isPaidBool,
      tier: tierVal,
      expiresAt: expiresAtVal,
      maxLevel: maxLevelVal,
      games: gamesVal,
      uid,
      cachedAt: new Date().toISOString(),
    };
    currentEntitlementObj = payload;
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {}
}

export function clearCache() {
  paid = false;
  currentEntitlementObj = null;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}

export const isPaid = () => paid;
export const currentTier = () => resolveTier(currentEntitlementObj).id;
export const currentEntitlement = () => currentEntitlementObj;
export const getGameLimit = () => tierGameLimit(resolveTier(currentEntitlementObj));
export const entitlementChecked = () => checked;

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
        paid = false;
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
        if (cache && cache.uid === newUid && cache.paid === true) {
          const resolved = resolveTier(cache);
          paid = resolved.id !== TIERS.FREE;
          currentEntitlementObj = cache;
        } else {
          // User changed: never use another user's cached entitlement
          paid = false;
          clearCache();
        }
      }
    }
  });
} catch {}

/**
 * Safely parses a response into a JSON object.
 * Checks HTTP status, validates Content-Type / text, and guards against
 * empty bodies and syntax errors.
 * Never throws raw `"undefined" is not valid JSON` or SyntaxError.
 */
export async function parseJsonResponse(res, fallbackErrMsg) {
  let text = "";
  try {
    text = await res.text();
  } catch {
    throw new Error(fallbackErrMsg || "Network error. Please check your connection and try again.");
  }

  let data = null;
  if (typeof text === "string" && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    let msg = "";
    if (data && typeof data === "object" && typeof data.error === "string") {
      msg = data.error.trim();
    }
    // Filter out internal/syntax error strings
    if (msg.includes("is not valid JSON") || msg.includes("Unexpected token") || msg === "undefined" || msg === '"undefined"') {
      msg = "";
    }
    if (!msg) {
      if (res.status === 401 || res.status === 403) {
        msg = "Authentication required. Please sign in first.";
      } else if (res.status >= 500) {
        msg = "Payment service is temporarily unavailable. Please try again shortly.";
      } else {
        msg = fallbackErrMsg || "Unable to complete request. Please try again.";
      }
    }
    throw new Error(msg);
  }

  if (!data || typeof data !== "object") {
    throw new Error(fallbackErrMsg || "Invalid response from server. Please try again.");
  }

  return data;
}

export async function refreshEntitlement() {
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
        unsubscribe = onAuthChange(u => {
          if (!settled) {
            settled = true;
            try { unsubscribe(); } catch {}
            resolve(u);
          }
        });
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
    paid = false;
    clearCache();
    checked = true;
    return false;
  }

  // 3. User is authenticated. Check cache ONLY for this specific user UID
  const cache = readCache();
  if (cache && cache.uid === user.uid && cache.paid === true) {
    const resolved = resolveTier(cache);
    paid = resolved.id !== TIERS.FREE;
    currentEntitlementObj = cache;
  } else {
    if (cache && cache.uid !== user.uid) {
      clearCache();
    }
    paid = false;
    currentEntitlementObj = null;
  }

  // 4. Verify against backend API over network
  try {
    const token = await user.getIdToken();
    const res = await fetch("/api/user-status", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await parseJsonResponse(res, `Unable to check purchase status (${res.status})`);
    const resolved = resolveTier(data);
    paid = resolved.id !== TIERS.FREE;
    currentEntitlementObj = { ...data, uid: user.uid };
    writeCache(user.uid, data);
  } catch (err) {
    console.warn("[Abacus payment] entitlement check skipped:", err);
    // Offline fallback: ONLY trust cached value if cached.uid strictly matches current user
    const c = readCache();
    if (c && c.uid === user.uid && c.paid === true) {
      const resolved = resolveTier(c);
      paid = resolved.id !== TIERS.FREE;
      currentEntitlementObj = c;
    } else {
      paid = false;
      currentEntitlementObj = null;
    }
  }

  checked = true;
  return paid;
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

export async function validateCoupon(couponCode, tier = 'lifetime') {
  initFirebase();
  const user = getAuthInstance().currentUser;
  if (!user) throw new Error("Please sign in first.");
  const token = await user.getIdToken(true);
  const res = await fetch("/api/validate-coupon", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      couponCode: String(couponCode || "").trim().toUpperCase(),
      tier: String(tier || 'lifetime').toLowerCase(),
    }),
  });
  return await parseJsonResponse(res, "Invalid coupon.");
}

export async function buyUnlock({ tier = 'lifetime', couponCode = "", onSuccess, onError } = {}) {
  try {
    initFirebase();
    const user = getAuthInstance().currentUser;
    if (!user) throw new Error("Please sign in first.");
    const token = await user.getIdToken(true);
    const normalizedTier = String(tier || 'lifetime').toLowerCase() === 'starter' ? 'starter' : 'lifetime';

    const orderRes = await fetch("/api/create-order", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        tier: normalizedTier,
        couponCode: String(couponCode || "").trim().toUpperCase(),
      }),
    });
    const order = await parseJsonResponse(orderRes, "Could not create payment order. Please try again.");
    if (order.paid) {
      paid = true;
      currentUid = user.uid;
      writeCache(user.uid, { paid: true, tier: normalizedTier });
      onSuccess?.();
      return true;
    }

    if (!order.keyId || typeof order.keyId !== "string" ||
        !order.orderId || typeof order.orderId !== "string" ||
        !Number.isFinite(order.amount) || order.amount <= 0 ||
        order.currency !== "INR") {
      throw new Error("Unable to start payment checkout: invalid order details received. Please try again.");
    }

    await loadRazorpay();
    return await new Promise((resolve, reject) => {
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Abacus Buddy",
        description: normalizedTier === 'starter'
          ? "Starter Tier — Levels 1–3, 30 days"
          : "Lifetime unlock — Levels 4–15",
        order_id: order.orderId,
        prefill: {
          contact: user.phoneNumber || "",
          email: user.email || "",
          name: user.displayName || "",
        },
        theme: { color: "#FFC53D" },
        handler: async (response) => {
          try {
            if (!response || !response.razorpay_order_id || !response.razorpay_payment_id || !response.razorpay_signature) {
              throw new Error("Payment response is incomplete. Please contact support if your account was charged.");
            }
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(response),
            });
            const verify = await parseJsonResponse(verifyRes, "Payment verification failed. Please contact support if your account was charged.");
            if (verify.paid !== true) throw new Error(verify.error || "Payment verification failed.");
            paid = true;
            currentUid = user.uid;
            writeCache(user.uid, {
              paid: true,
              tier: verify.tier || normalizedTier,
              expiresAt: verify.expiresAt || null,
              maxLevel: verify.maxLevel || (normalizedTier === 'starter' ? 3 : 15),
              games: verify.games || (normalizedTier === 'starter' ? ['race', 'mystery', 'match'] : null),
            });
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
        const failureErr = new Error(msg);
        onError?.(failureErr);
        reject(failureErr);
      });
      checkout.open();
    });
  } catch (err) {
    onError?.(err);
    throw err;
  }
}

export async function buyStarter({ couponCode = "", onSuccess, onError } = {}) {
  return buyUnlock({ tier: 'starter', couponCode, onSuccess, onError });
}
