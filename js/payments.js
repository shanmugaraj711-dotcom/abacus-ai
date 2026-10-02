// Paid unlock integration for Abacus Buddy.
// Business model: free levels 1 (1 game), ₹99 30-day starter for levels 1-3 (3 games), one-time ₹499 lifetime for levels 1-15 (all games).

import { initFirebase, getAuthInstance, onAuthChange } from "../firebase/auth.js";

let entitlement = {
  paid: false,
  tier: 'free',
  maxLevel: 1,
  expiresAt: null,
  gameLimit: 1,
  expired: false,
};
let checked = false;

const isSeeded = () => {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem('seeded') === '1'; } catch { return false; }
};

export const isPaid = () => entitlement.paid === true || isSeeded();
export const getEntitlement = () => (isSeeded() ? { paid: true, tier: 'lifetime', maxLevel: 15, expiresAt: null, gameLimit: null, expired: false } : ({ ...entitlement }));
export const getTier = () => (isSeeded() ? 'lifetime' : entitlement.tier);
export const getMaxLevel = () => (isSeeded() ? 15 : entitlement.maxLevel);
export const getGameLimit = () => (isSeeded() ? null : entitlement.gameLimit);

export async function refreshEntitlement() {
  try {
    initFirebase();
    const user = await new Promise(resolve => {
      let settled = false;
      let unsubscribe = () => {};
      unsubscribe = onAuthChange(u => { if (!settled) { settled = true; unsubscribe(); resolve(u); } });
    });
    if (!user) {
      entitlement = { paid: false, tier: 'free', maxLevel: 1, expiresAt: null, gameLimit: 1, expired: false };
      checked = true;
      return false;
    }
    const token = await user.getIdToken();
    const res = await fetch("/api/user-status", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Unable to check purchase status");
    const data = await res.json();
    if (data.paid === true) {
      if (data.tier === 'starter') {
        const isExpired = data.expiresAt ? (Date.parse(data.expiresAt) <= Date.now()) : false;
        if (isExpired) {
          entitlement = { paid: false, tier: 'free', maxLevel: 1, expiresAt: data.expiresAt, gameLimit: 1, expired: true };
        } else {
          entitlement = { paid: true, tier: 'starter', maxLevel: data.maxLevel || 3, expiresAt: data.expiresAt, gameLimit: data.gameLimit || 3, expired: false };
        }
      } else {
        entitlement = { paid: true, tier: 'lifetime', maxLevel: 15, expiresAt: null, gameLimit: null, expired: false };
      }
    } else {
      entitlement = { paid: false, tier: 'free', maxLevel: 1, expiresAt: data.expiresAt || null, gameLimit: 1, expired: !!data.expired };
    }
  } catch (err) {
    console.warn("[Abacus payment] entitlement check skipped:", err);
    entitlement = { paid: false, tier: 'free', maxLevel: 1, expiresAt: null, gameLimit: 1, expired: false };
  }
  checked = true;
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

export async function buyUnlock({ tier = 'lifetime', onSuccess, onError } = {}) {
  try {
    initFirebase();
    const user = getAuthInstance().currentUser;
    if (!user) throw new Error("Please sign in first.");
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
    if (!orderRes.ok) throw new Error(order.error || "Could not create payment order.");
    if (order.paid) {
      if (tier === 'starter') {
        entitlement = { paid: true, tier: 'starter', maxLevel: 3, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), gameLimit: 3, expired: false };
      } else {
        entitlement = { paid: true, tier: 'lifetime', maxLevel: 15, expiresAt: null, gameLimit: null, expired: false };
      }
      onSuccess?.();
      return true;
    }

    await loadRazorpay();
    return await new Promise((resolve, reject) => {
      const description = tier === 'starter'
        ? "Abacus Buddy Starter — Levels 1–3 (30 days)"
        : "Lifetime unlock — Levels 4–15";

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Abacus Buddy",
        description,
        order_id: order.orderId,
        prefill: { contact: user.phoneNumber || "" },
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
              maxLevel: verify.maxLevel || (tier === 'starter' ? 3 : 15),
              expiresAt: verify.expiresAt || (tier === 'starter' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null),
              gameLimit: verify.gameLimit ?? (tier === 'starter' ? 3 : null),
              expired: false,
            };
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

export const entitlementChecked = () => checked;
