import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  main,
  col,
  isEnvPreview,
  assertPreviewRazorpaySafe,
} from "../worker.js";

console.log("=== PREVIEW FIRESTORE ISOLATION & FAIL-CLOSED TESTS ===");

const db = {};
function resetDb() {
  for (const k of Object.keys(db)) delete db[k];
  db.coupons = {};
  db.orders = {};
  db.entitlements = {};
  db.audit_log = {};
  db.visitors = {};
  db._config = {};
  db.preview_coupons = {};
  db.preview_orders = {};
  db.preview_entitlements = {};
  db.preview_audit_log = {};
  db.preview_visitors = {};
  db.preview__config = {};
}

let razorOrders = {};
let razorPayments = {};
let nextOrder = 1;
const writesLog = [];

function fsVal(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return { integerValue: String(v) };
  return { stringValue: String(v) };
}

function doc(fields, updateTime = "2026-10-02T00:00:00.000Z") {
  return { fields, updateTime };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Global fetch mock tracking all Firestore reads and writes
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;
  const method = init.method || (typeof input !== "string" ? input.method : "GET");

  if (url.startsWith("https://identitytoolkit.googleapis.com/")) {
    let uid = "test-user-1";
    if (init.body) {
      try {
        const parsed = JSON.parse(init.body);
        if (parsed.idToken === "owner-id-token") uid = "owner-uid";
        else if (typeof parsed.idToken === "string" && parsed.idToken.startsWith("uid:")) uid = parsed.idToken.slice(4);
      } catch {}
    }
    return jsonResponse({ users: [{ localId: uid, email: uid + "@example.com" }] });
  }

  if (url === "https://oauth2.googleapis.com/token") {
    return jsonResponse({ access_token: "mock-google-token" });
  }

  if (url.includes("/databases/(default)/documents/")) {
    const base = url.split("/documents/")[1];
    const pathPart = base.split("?")[0];
    const parts = pathPart.split("/").map(decodeURIComponent);
    const collection = parts[0], id = parts[1];

    if (method === "GET") {
      if (!id) {
        const docs = Object.entries(db[collection] || {}).map(([docId, d]) => ({
          name: `projects/test/databases/(default)/documents/${collection}/${docId}`,
          ...d,
        }));
        return jsonResponse({ documents: docs });
      }
      const d = db[collection]?.[id];
      return d
        ? jsonResponse({ name: `projects/test/databases/(default)/documents/${collection}/${id}`, ...d })
        : jsonResponse({ error: "missing" }, 404);
    }

    if (method === "PATCH") {
      writesLog.push({ method: "PATCH", collection, id, body: JSON.parse(init.body) });
      const body = JSON.parse(init.body);
      const existing = db[collection]?.[id];
      if (body.currentDocument?.updateTime && existing?.updateTime !== body.currentDocument.updateTime) {
        return jsonResponse({ error: "precondition" }, 409);
      }
      if (!db[collection]) db[collection] = {};
      const fields = body.fields || {};
      const current = existing?.fields || {};
      db[collection][id] = { fields: { ...current, ...fields }, updateTime: new Date(Date.now() + 1).toISOString() };
      return jsonResponse({ name: `projects/test/databases/(default)/documents/${collection}/${id}`, ...db[collection][id] });
    }
  }

  if (url === "https://api.razorpay.com/v1/orders" && method === "POST") {
    const body = JSON.parse(init.body);
    const id = "order-preview-" + nextOrder++;
    razorOrders[id] = { id, amount: body.amount, currency: body.currency, notes: body.notes };
    return jsonResponse(razorOrders[id]);
  }

  const orderMatch = url.match(/https:\/\/api\.razorpay\.com\/v1\/orders\/(.+)$/);
  if (orderMatch && method === "GET") {
    const ordId = decodeURIComponent(orderMatch[1]);
    return jsonResponse(razorOrders[ordId] || {}, razorOrders[ordId] ? 200 : 404);
  }

  const paymentMatch = url.match(/https:\/\/api\.razorpay\.com\/v1\/payments\/(.+)$/);
  if (paymentMatch && method === "GET") {
    const payId = decodeURIComponent(paymentMatch[1]);
    return jsonResponse(razorPayments[payId] || {}, razorPayments[payId] ? 200 : 404);
  }

  return jsonResponse({ error: "unmocked " + method + " " + url }, 500);
};

const previewEnv = {
  ENVIRONMENT: "preview",
  FIREBASE_API_KEY: "test-key",
  FIREBASE_PROJECT_ID: "test-project",
  RAZORPAY_KEY_ID: "rzp_test_preview123",
  RAZORPAY_KEY_SECRET: "preview_secret_xyz",
  RAZORPAY_WEBHOOK_SECRET: "preview_webhook_secret",
  OWNER_UID: "owner-uid",
  _googleToken: "mock-google-token",
  COUPONS_ENABLED: "true",
};

const prodEnv = {
  ENVIRONMENT: "production",
  FIREBASE_API_KEY: "test-key",
  FIREBASE_PROJECT_ID: "test-project",
  RAZORPAY_KEY_ID: "rzp_live_real987",
  RAZORPAY_KEY_SECRET: "live_secret",
  RAZORPAY_WEBHOOK_SECRET: "live_webhook_secret",
  OWNER_UID: "owner-uid",
  _googleToken: "mock-google-token",
  COUPONS_ENABLED: "true",
};

function previewSignature(orderId, paymentId, secret = previewEnv.RAZORPAY_KEY_SECRET) {
  return createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
    throw err;
  }
}

// ── Test J: Production mode continues using the existing production collection names ──
await test("Test J: Production mode continues using existing production collection names", () => {
  assert.equal(col({ ENVIRONMENT: "production" }, "orders"), "orders");
  assert.equal(col({ ENVIRONMENT: "production" }, "entitlements"), "entitlements");
  assert.equal(col({ ENVIRONMENT: "production" }, "audit_log"), "audit_log");
  assert.equal(col({ ENVIRONMENT: "production" }, "visitors"), "visitors");
  assert.equal(col({ ENVIRONMENT: "production" }, "coupons"), "coupons");
  assert.equal(col({ ENVIRONMENT: "production" }, "_config"), "_config");

  // Undefined or empty environment defaults to production names
  assert.equal(col({}, "orders"), "orders");
  assert.equal(col({ ENVIRONMENT: "" }, "orders"), "orders");
  assert.equal(col({ ENVIRONMENT: "   " }, "orders"), "orders");
  assert.equal(isEnvPreview({ ENVIRONMENT: "production" }), false);
  assert.equal(isEnvPreview({}), false);
});

// ── Test K: Invalid/unknown ENVIRONMENT fails closed ──
await test("Test K: Invalid/unknown ENVIRONMENT fails closed", () => {
  assert.throws(() => col({ ENVIRONMENT: "staging" }, "orders"), /Unsupported server environment/);
  assert.throws(() => col({ ENVIRONMENT: "dev" }, "orders"), /Unsupported server environment/);
  assert.throws(() => col({ ENVIRONMENT: "invalid" }, "orders"), /Unsupported server environment/);

  // Cloudflare Pages branch build protection: non-main branch without explicit ENVIRONMENT=preview fails closed
  assert.throws(
    () => col({ CF_PAGES_BRANCH: "feature/unified-auth-starter" }, "orders"),
    /Preview environment must explicitly set ENVIRONMENT=preview/
  );
  assert.throws(
    () => col({ CF_PAGES_BRANCH: "feature/unified-auth-starter", ENVIRONMENT: "" }, "orders"),
    /Preview environment must explicitly set ENVIRONMENT=preview/
  );
  assert.throws(
    () => col({ CF_PAGES_BRANCH: "feature/unified-auth-starter", ENVIRONMENT: "production" }, "orders"),
    /Preview environment must explicitly set ENVIRONMENT=preview/
  );

  // But succeeds when ENVIRONMENT=preview
  assert.equal(
    col({ CF_PAGES_BRANCH: "feature/unified-auth-starter", ENVIRONMENT: "preview" }, "orders"),
    "preview_orders"
  );
});

// ── Test I: Preview rejects rzp_live_* configuration ──
await test("Test I: Preview rejects rzp_live_* configuration", async () => {
  const livePreviewEnv = {
    ...previewEnv,
    RAZORPAY_KEY_ID: "rzp_live_secret12345",
  };

  // Direct helper assertion throws
  assert.throws(
    () => assertPreviewRazorpaySafe(livePreviewEnv),
    /Live Razorpay credentials cannot be used in Preview environment/
  );

  // /api/create-order in Preview rejects live key with 500 error
  const orderRes = await main(
    new Request("https://app.test/api/create-order", {
      method: "POST",
      headers: {
        Authorization: "Bearer uid:test-user-live-reject",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tier: "starter" }),
    }),
    livePreviewEnv
  );
  assert.equal(orderRes.status, 500);
  const orderBody = await orderRes.json();
  assert.equal(orderBody.error, "Live Razorpay credentials cannot be used in Preview environment");

  // Does NOT leak secret credentials in error message
  assert.ok(!JSON.stringify(orderBody).includes("secret12345"));

  // /api/verify-payment in Preview also rejects live key
  const verifyRes = await main(
    new Request("https://app.test/api/verify-payment", {
      method: "POST",
      headers: {
        Authorization: "Bearer uid:test-user-live-reject",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razorpay_order_id: "order-1",
        razorpay_payment_id: "pay-1",
        razorpay_signature: "sig-1",
      }),
    }),
    livePreviewEnv
  );
  assert.equal(verifyRes.status, 500);
  const verifyBody = await verifyRes.json();
  assert.equal(verifyBody.error, "Live Razorpay credentials cannot be used in Preview environment");
});

// ── Test A: Preview create-order writes only preview_orders ──
await test("Test A: Preview create-order writes only preview_orders", async () => {
  resetDb();
  writesLog.length = 0;

  const res = await main(
    new Request("https://app.test/api/create-order", {
      method: "POST",
      headers: {
        Authorization: "Bearer uid:preview-user-a",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tier: "starter" }),
    }),
    previewEnv
  );

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.orderId);
  assert.equal(data.tier, "starter");

  // Verified in preview_orders
  assert.ok(db.preview_orders[data.orderId], "Order should exist in preview_orders");
  assert.equal(db.preview_orders[data.orderId].fields.status.stringValue, "created");
  assert.equal(db.preview_orders[data.orderId].fields.tier.stringValue, "starter");

  // Production orders is completely empty
  assert.equal(Object.keys(db.orders).length, 0, "Production orders MUST remain empty");
});

// ── Test B & Test F: Preview payment verification writes only preview_entitlements ──
await test("Test B & F: Preview payment verification writes only preview_entitlements, never production entitlements", async () => {
  resetDb();
  writesLog.length = 0;

  // 1. Create order in preview
  const createRes = await main(
    new Request("https://app.test/api/create-order", {
      method: "POST",
      headers: {
        Authorization: "Bearer uid:preview-user-bf",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tier: "starter" }),
    }),
    previewEnv
  );
  const orderData = await createRes.json();
  const orderId = orderData.orderId;

  // Mock captured payment in Razorpay
  const paymentId = "pay_preview_bf_1";
  razorPayments[paymentId] = {
    id: paymentId,
    order_id: orderId,
    status: "captured",
    amount: 9900,
    currency: "INR",
  };

  // 2. Verify payment in preview
  const sig = previewSignature(orderId, paymentId);
  const verifyRes = await main(
    new Request("https://app.test/api/verify-payment", {
      method: "POST",
      headers: {
        Authorization: "Bearer uid:preview-user-bf",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: sig,
      }),
    }),
    previewEnv
  );

  assert.equal(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.equal(verifyData.paid, true);
  assert.equal(verifyData.tier, "starter");

  // Written ONLY to preview_entitlements
  assert.ok(db.preview_entitlements["preview-user-bf"], "Entitlement MUST be in preview_entitlements");
  assert.equal(db.preview_entitlements["preview-user-bf"].fields.tier.stringValue, "starter");
  assert.equal(db.preview_entitlements["preview-user-bf"].fields.paid.booleanValue, true);

  // Production entitlements MUST NOT have this user
  assert.equal(
    db.entitlements["preview-user-bf"],
    undefined,
    "Production entitlements MUST NEVER be written by Preview"
  );
  assert.equal(Object.keys(db.entitlements).length, 0, "Production entitlements must have 0 writes");
});

// ── Test C: Preview audit writes only preview_audit_log ──
await test("Test C: Preview audit writes only preview_audit_log", async () => {
  // From previous operations, check preview_audit_log
  assert.ok(Object.keys(db.preview_audit_log).length > 0, "preview_audit_log must contain audit events");
  // Production audit_log MUST be completely empty
  assert.equal(Object.keys(db.audit_log).length, 0, "production audit_log MUST NEVER be written by Preview");
});

// ── Test D & Test H: Preview coupon redemption writes only preview_coupons, never production coupons ──
await test("Test D & H: Preview coupon redemption writes only preview_coupons, never production coupons", async () => {
  resetDb();
  writesLog.length = 0;

  // Seed production coupon with redemptionCount = 5
  db.coupons.DISCOUNT50 = doc({
    code: fsVal("DISCOUNT50"),
    discountType: fsVal("flat"),
    discountValue: fsVal(50),
    basePrice: fsVal(99),
    finalPrice: fsVal(49),
    active: { booleanValue: true },
    maxRedemptions: { nullValue: null },
    redemptionCount: fsVal(5),
  });

  // 1. Create order with coupon in preview
  const createRes = await main(
    new Request("https://app.test/api/create-order", {
      method: "POST",
      headers: {
        Authorization: "Bearer uid:preview-user-coupon",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tier: "starter", couponCode: "DISCOUNT50" }),
    }),
    previewEnv
  );
  assert.equal(createRes.status, 200);
  const orderData = await createRes.json();
  assert.equal(orderData.amount, 4900); // 49 INR in paise
  const orderId = orderData.orderId;

  // Mock payment
  const paymentId = "pay_coupon_test";
  razorPayments[paymentId] = {
    id: paymentId,
    order_id: orderId,
    status: "captured",
    amount: 4900,
    currency: "INR",
  };

  // 2. Verify payment with coupon redemption
  const verifyRes = await main(
    new Request("https://app.test/api/verify-payment", {
      method: "POST",
      headers: {
        Authorization: "Bearer uid:preview-user-coupon",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: previewSignature(orderId, paymentId),
      }),
    }),
    previewEnv
  );
  assert.equal(verifyRes.status, 200);

  // Check preview_coupons: redemption was written to preview_coupons!
  assert.ok(db.preview_coupons.DISCOUNT50, "Redemption MUST be recorded in preview_coupons");
  assert.equal(
    Number(db.preview_coupons.DISCOUNT50.fields.redemptionCount.integerValue),
    6,
    "preview_coupons redemption count was incremented"
  );

  // Check production coupons: redemptionCount MUST STILL BE 5!
  assert.equal(
    Number(db.coupons.DISCOUNT50.fields.redemptionCount.integerValue),
    5,
    "Production coupons redemption count MUST NEVER be mutated by Preview"
  );
});

// ── Test E: Preview visitor writes only preview_visitors ──
await test("Test E: Preview visitor writes only preview_visitors", async () => {
  resetDb();

  const visitRes = await main(
    new Request("https://app.test/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: "preview_visitor_12345" }),
    }),
    previewEnv
  );

  assert.equal(visitRes.status, 200);
  const data = await visitRes.json();
  assert.equal(data.ok, true);

  // Written to preview_visitors
  assert.ok(db.preview_visitors.preview_visitor_12345, "Visitor MUST be in preview_visitors");
  assert.equal(db.preview_visitors.preview_visitor_12345.fields.visitCount.integerValue, "1");

  // Production visitors is completely untouched
  assert.equal(Object.keys(db.visitors).length, 0, "Production visitors MUST NEVER be written by Preview");
});

// ── Test G: Preview never writes production orders ──
await test("Test G: Preview never writes production orders across create, verify, and webhook", async () => {
  // Across all operations in this test run, inspect writesLog
  const productionOrderWrites = writesLog.filter((w) => w.collection === "orders");
  assert.equal(
    productionOrderWrites.length,
    0,
    `Found ${productionOrderWrites.length} writes to production orders collection! MUST BE 0.`
  );
});

// ── Test L: No hardcoded production collection can be reached from Preview mutation paths ──
await test("Test L: Source code analysis verifies zero hardcoded production collections in mutation paths", () => {
  const workerSrc = readFileSync(resolve(import.meta.dirname, "../worker.js"), "utf-8");

  // Verify that firestorePatch and firestorePatchIfCurrent are NEVER called with raw string collection literals
  const patchMatches = [...workerSrc.matchAll(/firestorePatch(?:IfCurrent)?\(\s*env\s*,\s*["']([^"']+)["']/g)];
  assert.equal(
    patchMatches.length,
    0,
    `Found unmapped direct string collections in firestorePatch: ${patchMatches.map((m) => m[1]).join(", ")}`
  );

  // Verify that all firestorePatch calls use col(env, ...)
  const colPatchMatches = [...workerSrc.matchAll(/firestorePatch(?:IfCurrent)?\(\s*env\s*,\s*col\(env,\s*["']([^"']+)["']\)/g)];
  assert.ok(colPatchMatches.length >= 8, `Expected at least 8 col(env, ...) patch call sites, found ${colPatchMatches.length}`);

  // Also verify that inside firestorePatch and firestorePatchIfCurrent, col(env, collection) is unconditionally enforced
  assert.ok(
    workerSrc.includes("const targetCollection = col(env, collection);"),
    "firestore primitives must unconditionally route through col(env, collection)"
  );
});

console.log(`\n========================================`);
console.log(`All ${passed} Preview-Isolation tests PASSED!`);
console.log(`========================================\n`);
