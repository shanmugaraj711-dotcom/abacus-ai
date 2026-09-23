// Paid unlock integration for Abacus Buddy.
// Business model: free levels 1-3, one-time ₹499 unlock for levels 4-15.

import { initFirebase, getAuthInstance, onAuthChange } from "../firebase/auth.js";

let paid = false;
let checked = false;

export const isPaid = () => paid;

export async function refreshEntitlement() {
  try {
    initFirebase();
    const user = await new Promise(resolve => {
      let settled = false;
      let unsubscribe = () => {};
      unsubscribe = onAuthChange(u => { if (!settled) { settled = true; unsubscribe(); resolve(u); } });
    });
    if (!user) { paid = false; checked = true; return false; }
    const token = await user.getIdToken();
    const res = await fetch("/api/user-status", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Unable to check purchase status");
    const data = await res.json();
    paid = data.paid === true;
  } catch (err) {
    console.warn("[Abacus payment] entitlement check skipped:", err);
    paid = false;
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

export async function buyUnlock({ onSuccess, onError } = {}) {
  try {
    initFirebase();
    const user = getAuthInstance().currentUser;
    if (!user) throw new Error("Please sign in first.");
    const token = await user.getIdToken(true);
    const orderRes = await fetch("/api/create-order", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const order = await orderRes.json();
    if (!orderRes.ok) throw new Error(order.error || "Could not create payment order.");
    if (order.paid) {
      paid = true;
      onSuccess?.();
      return true;
    }

    await loadRazorpay();
    return await new Promise((resolve, reject) => {
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Abacus Buddy",
        description: "Lifetime unlock — Levels 4–15",
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
            paid = true;
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
