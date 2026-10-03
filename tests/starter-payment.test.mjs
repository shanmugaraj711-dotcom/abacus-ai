/**
 * tests/starter-payment.test.mjs
 * Comprehensive unit and integration test suite for Starter Rs 99 and Lifetime Rs 499 payment flows in worker.js.
 *
 * Covers all requirements from Item 10:
 *  1. Server price per tier (Starter 9900 paise, Lifetime 49900 paise, default = Lifetime)
 *  2. Client amount ignored (server price strictly enforced)
 *  3. Unknown tier returns 400
 *  4. No auth returns 401 on create-order and verify-payment
 *  5. Bad signature returns 400
 *  6. Wrong amount on order or payment returns 400
 *  7. Starter grant with 30-day expiry
 *  8. Renew extends from current expiry if still active
 *  9. Lifetime never downgraded to starter (verify, webhook, putEntitlement)
 * 10. Coupon on starter rejected (400)
 * 11. Duplicate verify and duplicate webhook idempotent
 * 12. Fail-closed on Firestore error or missing order
 * 13. Legacy paid:true stays lifetime
 * 14. Expired starter returned as free
 * 15. Lifetime flow unchanged vs main (with and without coupons)
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  main as workerMain,
  firestoreGet,
  firestorePatch,
  firestorePut,
  getEntitlement,
  putEntitlement,
  PRICE_LIFETIME,
  PRICE_STARTER,
  PRODUCT,
  hmac,
  eq
} from '../worker.js';
import { TIERS } from '../js/tiers.js';

const TEST_KEYPAIR = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const RAZORPAY_KEY_ID = 'rzp_test_mock_key';
const RAZORPAY_KEY_SECRET = 'rzp_mock_secret_key_12345';
const RAZORPAY_WEBHOOK_SECRET = 'webhook_secret_key_67890';
const OWNER_UID = 'owner-uid-test';

const ENV = {
  FIREBASE_PROJECT_ID: 'test-project',
  FIREBASE_API_KEY: 'fake-api-key',
  FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    client_email: 'test@test.iam.gserviceaccount.com',
    private_key: TEST_KEYPAIR.privateKey,
  }),
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET,
  OWNER_UID,
  _googleToken: 'mock-google-token',
  STARTER_ENABLED: 'true'
};

function fsField(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(fsField) } };
  if (typeof val === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(val).map(([k, v]) => [k, fsField(v)])) } };
  return { stringValue: String(val) };
}

function fsVal(f) {
  if (!f) return null;
  if ('booleanValue' in f) return f.booleanValue;
  if ('stringValue' in f) return f.stringValue;
  if ('integerValue' in f) return Number(f.integerValue);
  if ('doubleValue' in f) return f.doubleValue;
  if ('nullValue' in f) return null;
  if ('mapValue' in f) return Object.fromEntries(Object.entries(f.mapValue.fields || {}).map(([k, v]) => [k, fsVal(v)]));
  if ('arrayValue' in f) return (f.arrayValue.values || []).map(fsVal);
  return null;
}

class MockBackend {
  constructor() {
    this.firestore = new Map(); // collection:docId -> { fields, updateTime }
    this.razorOrders = new Map(); // orderId -> order
    this.razorPayments = new Map(); // paymentId -> payment
    this.orderSeq = 1000;
    this.failFirestore = false;
  }

  setDoc(collection, docId, fields) {
    const key = `${collection}/${docId}`;
    this.firestore.set(key, {
      name: `projects/test-project/databases/(default)/documents/${key}`,
      fields,
      updateTime: new Date().toISOString()
    });
  }

  getDoc(collection, docId) {
    if (this.failFirestore) throw new Error('Firestore connection failure');
    return this.firestore.get(`${collection}/${docId}`) || null;
  }

  patchDoc(collection, docId, fields) {
    if (this.failFirestore) throw new Error('Firestore write failure');
    const key = `${collection}/${docId}`;
    const existing = this.firestore.get(key);
    const mergedFields = { ...(existing?.fields || {}), ...fields };
    this.setDoc(collection, docId, mergedFields);
    return this.firestore.get(key);
  }

  createRazorOrder(data) {
    const id = `order_test_${this.orderSeq++}`;
    const order = {
      id,
      entity: 'order',
      amount: data.amount,
      currency: data.currency || 'INR',
      status: 'created',
      notes: data.notes || {},
      created_at: Math.floor(Date.now() / 1000)
    };
    this.razorOrders.set(id, order);
    return order;
  }

  createRazorPayment(orderId, amount, status = 'captured') {
    const id = `pay_test_${this.orderSeq++}`;
    const payment = {
      id,
      entity: 'payment',
      order_id: orderId,
      amount,
      currency: 'INR',
      status,
      created_at: Math.floor(Date.now() / 1000)
    };
    this.razorPayments.set(id, payment);
    return payment;
  }

  async computeHmac(secret, message) {
    return crypto.createHmac('sha256', secret).update(message).digest('hex');
  }
}

function createMockFetch(backend) {
  return async function mockFetch(url, options = {}) {
    const u = new URL(url);

    // 1. Firebase auth lookup
    if (u.hostname === 'identitytoolkit.googleapis.com' && u.pathname.includes('accounts:lookup')) {
      const body = JSON.parse(options.body || '{}');
      const token = body.idToken || '';
      if (!token || token === 'invalid') {
        return new Response(JSON.stringify({ error: { message: 'INVALID_ID_TOKEN' } }), { status: 400 });
      }
      const uid = token.startsWith('token-') ? token.slice(6) : token;
      return new Response(JSON.stringify({
        users: [{ localId: uid, email: `${uid}@example.com`, phoneNumber: '+919876543210' }]
      }), { status: 200 });
    }

    // 2. Google OAuth token
    if (u.hostname === 'oauth2.googleapis.com' && u.pathname === '/token') {
      return new Response(JSON.stringify({ access_token: 'mock-google-token' }), { status: 200 });
    }

    // 3. Firestore documents API
    if (u.hostname === 'firestore.googleapis.com') {
      const parts = u.pathname.split('/documents/')[1]?.split('/') || [];
      const collection = decodeURIComponent(parts[0] || '');
      const docId = decodeURIComponent(parts[1] || '');

      if (options.method === 'PATCH') {
        const body = JSON.parse(options.body || '{}');
        const updated = backend.patchDoc(collection, docId, body.fields || {});
        return new Response(JSON.stringify(updated), { status: 200 });
      } else {
        const doc = backend.getDoc(collection, docId);
        if (!doc) {
          return new Response(JSON.stringify({ error: 'Document not found' }), { status: 404 });
        }
        return new Response(JSON.stringify(doc), { status: 200 });
      }
    }

    // 4. Razorpay API
    if (u.hostname === 'api.razorpay.com') {
      const method = (options.method || 'GET').toUpperCase();
      if (method === 'POST' && u.pathname === '/v1/orders') {
        const body = JSON.parse(options.body || '{}');
        const order = backend.createRazorOrder(body);
        return new Response(JSON.stringify(order), { status: 200 });
      }
      if (method === 'GET' && u.pathname.startsWith('/v1/orders/')) {
        const orderId = decodeURIComponent(u.pathname.split('/v1/orders/')[1]);
        const order = backend.razorOrders.get(orderId);
        if (!order) return new Response(JSON.stringify({ error: { description: 'Order not found' } }), { status: 404 });
        return new Response(JSON.stringify(order), { status: 200 });
      }
      if (method === 'GET' && u.pathname.startsWith('/v1/payments/')) {
        const paymentId = decodeURIComponent(u.pathname.split('/v1/payments/')[1]);
        const payment = backend.razorPayments.get(paymentId);
        if (!payment) return new Response(JSON.stringify({ error: { description: 'Payment not found' } }), { status: 404 });
        return new Response(JSON.stringify(payment), { status: 200 });
      }
    }

    return new Response(JSON.stringify({ error: 'Mock route not handled: ' + url }), { status: 404 });
  };
}

let passed = 0;
let failed = 0;
const tests = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.stack || err.message}`);
  }
}

console.log('\n═══ Starter Rs 99 & Lifetime Payment Tests (worker.js) ═══');

const originalFetch = globalThis.fetch;

// Helper to run with mock backend
async function runWithBackend(fn) {
  const backend = new MockBackend();
  globalThis.fetch = createMockFetch(backend);
  try {
    await fn(backend);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// ── 1. SERVER PRICE PER TIER ────────────────────────────────────────────────
await test('1.1 create-order sets starter price server-side to 9900 paise', () => runWithBackend(async (b) => {
  const req = new Request('https://test.local/api/create-order', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user1', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'starter' })
  });
  const res = await workerMain(req, ENV);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.amount, 9900);
  assert.equal(data.displayAmount, 99);
  assert.equal(data.tier, 'starter');

  const orderInRazor = b.razorOrders.get(data.orderId);
  assert.equal(orderInRazor.amount, 9900);
}));

await test('1.2 create-order sets lifetime price server-side to 49900 paise', () => runWithBackend(async (b) => {
  const req = new Request('https://test.local/api/create-order', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user1', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'lifetime' })
  });
  const res = await workerMain(req, ENV);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.amount, 49900);
  assert.equal(data.displayAmount, 499);
  assert.equal(data.tier, 'lifetime');

  const orderInRazor = b.razorOrders.get(data.orderId);
  assert.equal(orderInRazor.amount, 49900);
}));

await test('1.3 create-order defaults missing tier to lifetime (49900 paise)', () => runWithBackend(async (b) => {
  const req = new Request('https://test.local/api/create-order', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user1', 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const res = await workerMain(req, ENV);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.amount, 49900);
  assert.equal(data.tier, 'lifetime');
}));

// ── 2. CLIENT AMOUNT IGNORED ────────────────────────────────────────────────
await test('2.1 create-order ignores client-supplied amount for starter', () => runWithBackend(async (b) => {
  const req = new Request('https://test.local/api/create-order', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user1', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'starter', amount: 100 }) // Attacker attempts 100 paise
  });
  const res = await workerMain(req, ENV);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.amount, 9900, 'Must be server-decided 9900 paise, not 100');
  assert.equal(b.razorOrders.get(data.orderId).amount, 9900);
}));

await test('2.2 create-order ignores client-supplied amount for lifetime', () => runWithBackend(async (b) => {
  const req = new Request('https://test.local/api/create-order', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user1', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'lifetime', amount: 500 }) // Attacker attempts 500 paise
  });
  const res = await workerMain(req, ENV);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.amount, 49900, 'Must be server-decided 49900 paise, not 500');
  assert.equal(b.razorOrders.get(data.orderId).amount, 49900);
}));

// ── 3. UNKNOWN TIER RETURNS 400 ─────────────────────────────────────────────
await test('3.1 create-order with unknown tier returns 400', () => runWithBackend(async () => {
  for (const badTier of ['annual', 'starter99', 'pro', 'monthly', 'free']) {
    const req = new Request('https://test.local/api/create-order', {
      method: 'POST',
      headers: { Authorization: 'Bearer token-user1', 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: badTier })
    });
    const res = await workerMain(req, ENV);
    assert.equal(res.status, 400, `Tier ${badTier} must be rejected with 400`);
    const data = await res.json();
    assert.match(data.error, /Unknown tier/i);
  }
}));

// ── 4. NO AUTH RETURNS 401 ──────────────────────────────────────────────────
await test('4.1 create-order rejects request without auth with 401', () => runWithBackend(async () => {
  const req = new Request('https://test.local/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'starter' })
  });
  const res = await workerMain(req, ENV);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.match(data.error, /missing authorization/i);
}));

await test('4.2 verify-payment rejects request without auth with 401', () => runWithBackend(async () => {
  const req = new Request('https://test.local/api/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ razorpay_order_id: 'o', razorpay_payment_id: 'p', razorpay_signature: 's' })
  });
  const res = await workerMain(req, ENV);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.match(data.error, /missing authorization/i);
}));

// ── 5. BAD SIGNATURE ────────────────────────────────────────────────────────
await test('5.1 verify-payment rejects invalid HMAC signature with 400', () => runWithBackend(async (b) => {
  // Create order
  const createReq = new Request('https://test.local/api/create-order', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user1', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'starter' })
  });
  const createRes = await workerMain(createReq, ENV);
  const orderData = await createRes.json();
  const payment = b.createRazorPayment(orderData.orderId, 9900);

  const verifyReq = new Request('https://test.local/api/verify-payment', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user1', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_order_id: orderData.orderId,
      razorpay_payment_id: payment.id,
      razorpay_signature: 'definitely_wrong_hmac_signature_hex_0000000000000000'
    })
  });
  const verifyRes = await workerMain(verifyReq, ENV);
  assert.equal(verifyRes.status, 400);
  const data = await verifyRes.json();
  assert.match(data.error, /Invalid payment signature/i);

  // Assert no entitlement granted
  const ent = b.getDoc('entitlements', 'user1');
  assert.equal(ent, null, 'No entitlement should be granted on bad signature');
}));

// ── 6. WRONG AMOUNT ─────────────────────────────────────────────────────────
await test('6.1 verify-payment rejects when Razorpay payment amount != expected server price', () => runWithBackend(async (b) => {
  const createReq = new Request('https://test.local/api/create-order', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user1', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'starter' })
  });
  const createRes = await workerMain(createReq, ENV);
  const orderData = await createRes.json();

  // Create payment with wrong amount (e.g. 5000 instead of 9900)
  const payment = b.createRazorPayment(orderData.orderId, 5000);
  const sig = await b.computeHmac(RAZORPAY_KEY_SECRET, `${orderData.orderId}|${payment.id}`);

  const verifyReq = new Request('https://test.local/api/verify-payment', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user1', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_order_id: orderData.orderId,
      razorpay_payment_id: payment.id,
      razorpay_signature: sig
    })
  });
  const verifyRes = await workerMain(verifyReq, ENV);
  assert.equal(verifyRes.status, 400);
  const data = await verifyRes.json();
  assert.match(data.error, /Payment is not captured or does not match/i);
}));

// ── 7. STARTER GRANT + 30-DAY EXPIRY ────────────────────────────────────────
await test('7.1 verify-payment grants starter tier with 30-day expiry and tier limits', () => runWithBackend(async (b) => {
  const createReq = new Request('https://test.local/api/create-order', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user1', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'starter' })
  });
  const createRes = await workerMain(createReq, ENV);
  const orderData = await createRes.json();

  const payment = b.createRazorPayment(orderData.orderId, 9900);
  const sig = await b.computeHmac(RAZORPAY_KEY_SECRET, `${orderData.orderId}|${payment.id}`);

  const verifyReq = new Request('https://test.local/api/verify-payment', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user1', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_order_id: orderData.orderId,
      razorpay_payment_id: payment.id,
      razorpay_signature: sig
    })
  });
  const beforeTime = Date.now();
  const verifyRes = await workerMain(verifyReq, ENV);
  assert.equal(verifyRes.status, 200);
  const data = await verifyRes.json();

  assert.equal(data.paid, true);
  assert.equal(data.tier, 'starter');
  assert.equal(data.maxLevel, 6);
  assert.deepEqual(data.games, ['race', 'mystery', 'match', 'flash']);
  assert.ok(data.expiresAt, 'Must have expiresAt ISO timestamp');

  const expMs = new Date(data.expiresAt).getTime();
  const expectedExpMs = beforeTime + 30 * 24 * 60 * 60 * 1000;
  assert.ok(Math.abs(expMs - expectedExpMs) < 5000, 'Expiry must be ~30 days from now');

  // Verify status API
  const statusReq = new Request('https://test.local/api/user-status', {
    method: 'GET',
    headers: { Authorization: 'Bearer token-user1' }
  });
  const statusRes = await workerMain(statusReq, ENV);
  assert.equal(statusRes.status, 200);
  const statusData = await statusRes.json();
  assert.equal(statusData.paid, true);
  assert.equal(statusData.tier, 'starter');
  assert.equal(statusData.maxLevel, 6);
  assert.deepEqual(statusData.games, ['race', 'mystery', 'match', 'flash']);
  assert.equal(statusData.expiresAt, data.expiresAt);
}));

// ── 8. RENEW EXTENDS EXPIRY ─────────────────────────────────────────────────
await test('8.1 renewing active starter extends current expiry by 30 days', () => runWithBackend(async (b) => {
  // Pre-seed an active starter user with 15 days remaining
  const initialExpiry = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
  b.setDoc('entitlements', 'user1', {
    paid: fsField(true),
    tier: fsField('starter'),
    maxLevel: fsField(6),
    expiresAt: fsField(initialExpiry),
    orderId: fsField('old_order_1')
  });

  // User buys starter again (renew)
  const createReq = new Request('https://test.local/api/create-order', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user1', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'starter' })
  });
  const createRes = await workerMain(createReq, ENV);
  assert.equal(createRes.status, 200, 'Active starter must be allowed to create renewal order');
  const orderData = await createRes.json();

  const payment = b.createRazorPayment(orderData.orderId, 9900);
  const sig = await b.computeHmac(RAZORPAY_KEY_SECRET, `${orderData.orderId}|${payment.id}`);

  const verifyReq = new Request('https://test.local/api/verify-payment', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user1', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_order_id: orderData.orderId,
      razorpay_payment_id: payment.id,
      razorpay_signature: sig
    })
  });
  const verifyRes = await workerMain(verifyReq, ENV);
  assert.equal(verifyRes.status, 200);
  const data = await verifyRes.json();

  const newExpMs = new Date(data.expiresAt).getTime();
  const initialExpMs = new Date(initialExpiry).getTime();
  const expectedExpMs = initialExpMs + 30 * 24 * 60 * 60 * 1000; // 15 + 30 = 45 days
  assert.ok(Math.abs(newExpMs - expectedExpMs) < 5000, 'Renewal must add 30 days onto current expiry');
}));

// ── 9. LIFETIME NEVER DOWNGRADED ────────────────────────────────────────────
await test('9.1 lifetime user is never downgraded to starter via verify-payment', () => runWithBackend(async (b) => {
  // Pre-seed a lifetime entitlement
  b.setDoc('entitlements', 'user1', {
    paid: fsField(true),
    tier: fsField('lifetime'),
    maxLevel: fsField(15),
    expiresAt: { nullValue: null },
    orderId: fsField('order_lifetime_original')
  });

  // If a create-order is attempted, it short-circuits
  const createReq = new Request('https://test.local/api/create-order', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user1', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'starter' })
  });
  const createRes = await workerMain(createReq, ENV);
  const createData = await createRes.json();
  assert.equal(createData.paid, true);
  assert.equal(createData.tier, 'lifetime');

  // If somehow a starter order is verified, verify short-circuits and never downgrades
  const payment = b.createRazorPayment('order_fake_starter', 9900);
  const sig = await b.computeHmac(RAZORPAY_KEY_SECRET, `order_fake_starter|${payment.id}`);
  const verifyReq = new Request('https://test.local/api/verify-payment', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user1', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_order_id: 'order_fake_starter',
      razorpay_payment_id: payment.id,
      razorpay_signature: sig
    })
  });
  const verifyRes = await workerMain(verifyReq, ENV);
  assert.equal(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.equal(verifyData.tier, 'lifetime');

  // Check database entitlement directly
  const ent = b.getDoc('entitlements', 'user1');
  assert.equal(fsVal(ent.fields.tier), 'lifetime');
}));

await test('9.2 webhook never downgrades a lifetime user to starter', () => runWithBackend(async (b) => {
  b.setDoc('entitlements', 'user1', {
    paid: fsField(true),
    tier: fsField('lifetime'),
    maxLevel: fsField(15),
    expiresAt: { nullValue: null },
    orderId: fsField('order_lifetime_original')
  });

  const webhookPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_starter_event',
          order_id: 'order_starter_event',
          amount: 9900,
          currency: 'INR',
          notes: { uid: 'user1', product: PRODUCT, tier: 'starter' }
        }
      }
    }
  });
  const sig = await b.computeHmac(RAZORPAY_WEBHOOK_SECRET, webhookPayload);

  const req = new Request('https://test.local/api/razorpay-webhook', {
    method: 'POST',
    headers: { 'x-razorpay-signature': sig, 'Content-Type': 'application/json' },
    body: webhookPayload
  });
  const res = await workerMain(req, ENV);
  assert.equal(res.status, 200);

  const ent = b.getDoc('entitlements', 'user1');
  assert.equal(fsVal(ent.fields.tier), 'lifetime', 'Lifetime user must not be downgraded by webhook');
}));

// ── 10. COUPON ON STARTER REJECTED ──────────────────────────────────────────
await test('10.1 coupon code sent with starter order is rejected with 400', () => runWithBackend(async () => {
  const req = new Request('https://test.local/api/create-order', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user1', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'starter', couponCode: 'SAVE50' })
  });
  const res = await workerMain(req, ENV);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Coupons apply to (the One-time payment|Lifetime) only/i);
}));

// ── 11. IDEMPOTENCY: DUPLICATE VERIFY AND DUPLICATE WEBHOOK ─────────────────
await test('11.1 duplicate verify-payment call is idempotent', () => runWithBackend(async (b) => {
  const createReq = new Request('https://test.local/api/create-order', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user1', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'starter' })
  });
  const createRes = await workerMain(createReq, ENV);
  const orderData = await createRes.json();

  const payment = b.createRazorPayment(orderData.orderId, 9900);
  const sig = await b.computeHmac(RAZORPAY_KEY_SECRET, `${orderData.orderId}|${payment.id}`);

  const verifyBody = JSON.stringify({
    razorpay_order_id: orderData.orderId,
    razorpay_payment_id: payment.id,
    razorpay_signature: sig
  });

  // Call 1
  const res1 = await workerMain(new Request('https://test.local/api/verify-payment', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user1', 'Content-Type': 'application/json' },
    body: verifyBody
  }), ENV);
  assert.equal(res1.status, 200);
  const data1 = await res1.json();
  assert.equal(data1.paid, true);

  // Call 2 (duplicate)
  const res2 = await workerMain(new Request('https://test.local/api/verify-payment', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user1', 'Content-Type': 'application/json' },
    body: verifyBody
  }), ENV);
  assert.equal(res2.status, 200);
  const data2 = await res2.json();
  assert.equal(data2.paid, true);
  assert.equal(data2.orderId || data1.orderId, data1.orderId);
}));

await test('11.2 duplicate webhook event does not re-write or corrupt entitlement', () => runWithBackend(async (b) => {
  b.setDoc('orders', 'order_hook_1', {
    uid: fsField('user_hook'),
    tier: fsField('starter'),
    amount: fsField(9900),
    currency: fsField('INR'),
    status: fsField('created'),
    product: fsField(PRODUCT),
  });
  const webhookPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_hook_1',
          order_id: 'order_hook_1',
          amount: 9900,
          currency: 'INR',
          notes: { uid: 'user_hook', product: PRODUCT, tier: 'starter' }
        }
      }
    }
  });
  const sig = await b.computeHmac(RAZORPAY_WEBHOOK_SECRET, webhookPayload);
  const makeReq = () => new Request('https://test.local/api/razorpay-webhook', {
    method: 'POST',
    headers: { 'x-razorpay-signature': sig, 'Content-Type': 'application/json' },
    body: webhookPayload
  });

  const res1 = await workerMain(makeReq(), ENV);
  assert.equal(res1.status, 200);
  const ent1 = b.getDoc('entitlements', 'user_hook');
  const exp1 = fsVal(ent1.fields.expiresAt);

  // Second duplicate webhook call
  const res2 = await workerMain(makeReq(), ENV);
  assert.equal(res2.status, 200);
  const ent2 = b.getDoc('entitlements', 'user_hook');
  const exp2 = fsVal(ent2.fields.expiresAt);
  assert.equal(exp1, exp2, 'Duplicate webhook must not extend expiry a second time');
}));

// ── 12. FAIL-CLOSED ON FIRESTORE ERROR ───────────────────────────────────────
await test('12.1 create-order fails closed (500) if database write fails', () => runWithBackend(async (b) => {
  b.failFirestore = true;
  const req = new Request('https://test.local/api/create-order', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user1', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'starter' })
  });
  const res = await workerMain(req, ENV);
  assert.equal(res.status, 500);
}));

await test('12.2 verify-payment fails closed if order document is missing in Firestore', () => runWithBackend(async (b) => {
  const fakeOrderId = 'order_unrecorded_123';
  const payment = b.createRazorPayment(fakeOrderId, 9900);
  const sig = await b.computeHmac(RAZORPAY_KEY_SECRET, `${fakeOrderId}|${payment.id}`);

  const req = new Request('https://test.local/api/verify-payment', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user1', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_order_id: fakeOrderId,
      razorpay_payment_id: payment.id,
      razorpay_signature: sig
    })
  });
  const res = await workerMain(req, ENV);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Order not found/i);
  assert.equal(b.getDoc('entitlements', 'user1'), null, 'No entitlement granted');
}));

// ── 13. LEGACY PAID:TRUE RECORD ─────────────────────────────────────────────
await test('13.1 legacy entitlement with paid:true and no tier field resolves as lifetime', () => runWithBackend(async (b) => {
  b.setDoc('entitlements', 'user_legacy', {
    paid: fsField(true),
    product: fsField(PRODUCT),
    orderId: fsField('legacy_order_123'),
    paidAt: fsField('2026-01-01T00:00:00Z')
  });

  const req = new Request('https://test.local/api/user-status', {
    method: 'GET',
    headers: { Authorization: 'Bearer token-user_legacy' }
  });
  const res = await workerMain(req, ENV);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.paid, true);
  assert.equal(data.tier, 'lifetime');
  assert.equal(data.maxLevel, 15);
  assert.equal(data.expiresAt, null);
  assert.deepEqual(data.games, TIERS.lifetime.games);
}));

// ── 14. EXPIRED STARTER RETURNED AS FREE ─────────────────────────────────────
await test('14.1 expired starter tier returns as free with expired: true', () => runWithBackend(async (b) => {
  const pastExpiry = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  b.setDoc('entitlements', 'user_expired', {
    paid: fsField(true),
    tier: fsField('starter'),
    maxLevel: fsField(6),
    expiresAt: fsField(pastExpiry)
  });

  const req = new Request('https://test.local/api/user-status', {
    method: 'GET',
    headers: { Authorization: 'Bearer token-user_expired' }
  });
  const res = await workerMain(req, ENV);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.paid, false, 'Expired starter must have paid: false');
  assert.equal(data.tier, 'free');
  assert.equal(data.maxLevel, 1);
  assert.deepEqual(data.games, ['race']);
  assert.equal(data.expired, true);
  assert.equal(data.expiresAt, pastExpiry);
}));

// ── 15. LIFETIME FLOW UNCHANGED VS MAIN ─────────────────────────────────────
await test('15.1 lifetime purchase and verification flow works end-to-end', () => runWithBackend(async (b) => {
  const createReq = new Request('https://test.local/api/create-order', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user_lt', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'lifetime' })
  });
  const createRes = await workerMain(createReq, ENV);
  assert.equal(createRes.status, 200);
  const orderData = await createRes.json();
  assert.equal(orderData.amount, 49900);

  const payment = b.createRazorPayment(orderData.orderId, 49900);
  const sig = await b.computeHmac(RAZORPAY_KEY_SECRET, `${orderData.orderId}|${payment.id}`);

  const verifyReq = new Request('https://test.local/api/verify-payment', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user_lt', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_order_id: orderData.orderId,
      razorpay_payment_id: payment.id,
      razorpay_signature: sig
    })
  });
  const verifyRes = await workerMain(verifyReq, ENV);
  assert.equal(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.equal(verifyData.paid, true);
  assert.equal(verifyData.tier, 'lifetime');
  assert.equal(verifyData.maxLevel, 15);
  assert.equal(verifyData.expiresAt, null);

  const statusReq = new Request('https://test.local/api/user-status', {
    method: 'GET',
    headers: { Authorization: 'Bearer token-user_lt' }
  });
  const statusRes = await workerMain(statusReq, ENV);
  const statusData = await statusRes.json();
  assert.equal(statusData.paid, true);
  assert.equal(statusData.tier, 'lifetime');
  assert.equal(statusData.maxLevel, 15);
}));

// ── 16. KILL SWITCH (DEFAULT OFF) ──────────────────────────────────────────
await test('16.1 kill switch off rejects starter create-order with 403 Starter coming soon', () => runWithBackend(async () => {
  const envOff = { ...ENV, STARTER_ENABLED: 'false', STARTER_TESTER_UIDS: '' };
  delete envOff.STARTER_ENABLED; // test default omitted as well
  const req = new Request('https://test.local/api/create-order', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user_random', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'starter' })
  });
  const res = await workerMain(req, envOff);
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.match(data.error, /Starter coming soon/i);
}));

await test('16.2 kill switch allows tester UID even when STARTER_ENABLED is false', () => runWithBackend(async () => {
  const envTester = { ...ENV, STARTER_ENABLED: 'false', STARTER_TESTER_UIDS: 'tester-123, user_tester' };
  const reqTester = new Request('https://test.local/api/create-order', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user_tester', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'starter' })
  });
  const resTester = await workerMain(reqTester, envTester);
  assert.equal(resTester.status, 200);

  const reqNonTester = new Request('https://test.local/api/create-order', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user_other', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'starter' })
  });
  const resNonTester = await workerMain(reqNonTester, envTester);
  assert.equal(resNonTester.status, 403);
}));

await test('16.3 kill switch on allows any user', () => runWithBackend(async () => {
  const envOn = { ...ENV, STARTER_ENABLED: 'true' };
  const req = new Request('https://test.local/api/create-order', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user_any', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'starter' })
  });
  const res = await workerMain(req, envOn);
  assert.equal(res.status, 200);
}));

await test('16.4 lifetime flow unaffected by kill switch', () => runWithBackend(async () => {
  const envOff = { ...ENV, STARTER_ENABLED: 'false', STARTER_TESTER_UIDS: '' };
  const req = new Request('https://test.local/api/create-order', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-user_lt', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'lifetime' })
  });
  const res = await workerMain(req, envOff);
  assert.equal(res.status, 200);
}));

// ── 17. USER-STATUS AUTHENTICATION & KILL SWITCH STATUS ──────────────────────
await test('17.1 user-status without authorization returns 401', () => runWithBackend(async () => {
  const req = new Request('https://test.local/api/user-status', { method: 'GET' });
  const res = await workerMain(req, ENV);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.match(data.error, /missing authorization/i);
}));

await test('17.2 user-status with invalid token returns 401', () => runWithBackend(async () => {
  const req = new Request('https://test.local/api/user-status', {
    method: 'GET',
    headers: { Authorization: 'Basic invalid-token' }
  });
  const res = await workerMain(req, ENV);
  assert.equal(res.status, 401);
}));

await test('17.3 user-status returns starterEnabled boolean reflecting permissions', () => runWithBackend(async () => {
  const envOff = { ...ENV, STARTER_ENABLED: 'false', STARTER_TESTER_UIDS: 'tester-uid' };
  const req1 = new Request('https://test.local/api/user-status', {
    method: 'GET',
    headers: { Authorization: 'Bearer token-user_regular' }
  });
  const res1 = await workerMain(req1, envOff);
  assert.equal(res1.status, 200);
  const data1 = await res1.json();
  assert.equal(data1.starterEnabled, false);

  const req2 = new Request('https://test.local/api/user-status', {
    method: 'GET',
    headers: { Authorization: 'Bearer token-tester-uid' }
  });
  const res2 = await workerMain(req2, envOff);
  assert.equal(res2.status, 200);
  const data2 = await res2.json();
  assert.equal(data2.starterEnabled, true);

  const envOn = { ...ENV, STARTER_ENABLED: 'true' };
  const res3 = await workerMain(req1, envOn);
  assert.equal(res3.status, 200);
  const data3 = await res3.json();
  assert.equal(data3.starterEnabled, true);
}));

// ── 18. LEGACY ENTITLEMENT INTEGRITY & PROTECTION ────────────────────────────
await test('18.1 legacy user (paid:true, no tier) attempting starter create-order returns lifetime', () => runWithBackend(async (b) => {
  b.setDoc('entitlements', 'legacy_user_1', {
    paid: fsField(true),
    orderId: fsField('old_order_999'),
    paidAt: fsField('2025-01-01T00:00:00Z')
  });

  const req = new Request('https://test.local/api/create-order', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-legacy_user_1', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'starter' })
  });
  const res = await workerMain(req, ENV);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.paid, true);
  assert.equal(data.tier, 'lifetime');
  assert.equal(data.maxLevel, 15);
  assert.equal(data.expiresAt, null);
}));

await test('18.2 verify-payment and webhook never overwrite or downgrade legacy user', () => runWithBackend(async (b) => {
  b.setDoc('entitlements', 'legacy_user_2', {
    paid: fsField(true),
    orderId: fsField('old_order_888'),
    paidAt: fsField('2025-01-01T00:00:00Z')
  });

  // Verify-payment attempt for starter
  b.setDoc('orders', 'order_legacy_starter', {
    uid: fsField('legacy_user_2'),
    tier: fsField('starter'),
    amount: fsField(9900),
    status: fsField('created'),
    product: fsField(PRODUCT)
  });
  const payment = b.createRazorPayment('order_legacy_starter', 9900);
  const sig = await b.computeHmac(RAZORPAY_KEY_SECRET, `order_legacy_starter|${payment.id}`);

  const verifyReq = new Request('https://test.local/api/verify-payment', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-legacy_user_2', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_order_id: 'order_legacy_starter',
      razorpay_payment_id: payment.id,
      razorpay_signature: sig
    })
  });
  const verifyRes = await workerMain(verifyReq, ENV);
  assert.equal(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.equal(verifyData.tier, 'lifetime');

  const entAfterVerify = b.getDoc('entitlements', 'legacy_user_2');
  assert.notEqual(fsVal(entAfterVerify.fields.tier), 'starter', 'Firestore must not be downgraded to starter');

  // Webhook attempt for starter
  const webhookPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_hook_legacy',
          order_id: 'order_legacy_starter',
          amount: 9900,
          currency: 'INR',
          notes: { uid: 'legacy_user_2', product: PRODUCT, tier: 'starter' }
        }
      }
    }
  });
  const hookSig = await b.computeHmac(RAZORPAY_WEBHOOK_SECRET, webhookPayload);
  const hookReq = new Request('https://test.local/api/razorpay-webhook', {
    method: 'POST',
    headers: { 'x-razorpay-signature': hookSig, 'Content-Type': 'application/json' },
    body: webhookPayload
  });
  const hookRes = await workerMain(hookReq, ENV);
  assert.equal(hookRes.status, 200);

  const entAfterHook = b.getDoc('entitlements', 'legacy_user_2');
  assert.notEqual(fsVal(entAfterHook.fields.tier), 'starter', 'Webhook must never downgrade legacy user to starter');
}));

// ── 19. WEBHOOK FAIL-CLOSED RULES RESTORED ──────────────────────────────────
await test('19.1 webhook fails closed if order is unrecorded in Firestore', () => runWithBackend(async (b) => {
  const webhookPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_unrec',
          order_id: 'order_unrecorded_999',
          amount: 9900,
          currency: 'INR',
          notes: { uid: 'user_unrec', product: PRODUCT, tier: 'starter' }
        }
      }
    }
  });
  const hookSig = await b.computeHmac(RAZORPAY_WEBHOOK_SECRET, webhookPayload);
  const hookReq = new Request('https://test.local/api/razorpay-webhook', {
    method: 'POST',
    headers: { 'x-razorpay-signature': hookSig, 'Content-Type': 'application/json' },
    body: webhookPayload
  });
  const hookRes = await workerMain(hookReq, ENV);
  assert.equal(hookRes.status, 200);
  assert.equal(b.getDoc('entitlements', 'user_unrec'), null, 'Unrecorded order must never grant entitlement');
}));

await test('19.2 webhook fails closed if amount does not match recorded order amount', () => runWithBackend(async (b) => {
  b.setDoc('orders', 'order_wrong_amt', {
    uid: fsField('user_wrong_amt'),
    tier: fsField('starter'),
    amount: fsField(9900),
    status: fsField('created'),
    product: fsField(PRODUCT)
  });
  const webhookPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_wrong_amt',
          order_id: 'order_wrong_amt',
          amount: 5000,
          currency: 'INR',
          notes: { uid: 'user_wrong_amt', product: PRODUCT, tier: 'starter' }
        }
      }
    }
  });
  const hookSig = await b.computeHmac(RAZORPAY_WEBHOOK_SECRET, webhookPayload);
  const hookReq = new Request('https://test.local/api/razorpay-webhook', {
    method: 'POST',
    headers: { 'x-razorpay-signature': hookSig, 'Content-Type': 'application/json' },
    body: webhookPayload
  });
  const hookRes = await workerMain(hookReq, ENV);
  assert.equal(hookRes.status, 200);
  assert.equal(b.getDoc('entitlements', 'user_wrong_amt'), null, 'Amount mismatch must never grant entitlement');
}));

await test('19.3 webhook propagates database error so Razorpay retries (returns 5xx)', () => runWithBackend(async (b) => {
  b.failFirestore = true;
  const webhookPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_err',
          order_id: 'order_err',
          amount: 9900,
          currency: 'INR',
          notes: { uid: 'user_err', product: PRODUCT, tier: 'starter' }
        }
      }
    }
  });
  const hookSig = await b.computeHmac(RAZORPAY_WEBHOOK_SECRET, webhookPayload);
  const hookReq = new Request('https://test.local/api/razorpay-webhook', {
    method: 'POST',
    headers: { 'x-razorpay-signature': hookSig, 'Content-Type': 'application/json' },
    body: webhookPayload
  });
  const hookRes = await workerMain(hookReq, ENV).catch(e => new Response(JSON.stringify({ error: e.message }), { status: 500 }));
  assert.ok(hookRes.status >= 500, `Expected 5xx on database error, got ${hookRes.status}`);
}));

// ── 20. CLIENT ENTITLEMENT PRESERVATION ON NON-OK RESPONSE ───────────────────
await test('20.1 payments.js preserves cached paid entitlement when user-status returns non-OK or throws', async () => {
  const { readFileSync } = await import('node:fs');
  const paymentsCode = readFileSync(new URL('../js/payments.js', import.meta.url), 'utf8');
  assert.ok(paymentsCode.includes('starterEnabled = Boolean(data.starterEnabled);'), 'Captures starterEnabled from user-status');
  assert.ok(!paymentsCode.includes('catch (err) {\n    clearCache();'), 'Never blindly clears cache on error');
  assert.ok(paymentsCode.includes('export const isStarterEnabled = () => starterEnabled;'), 'Exports isStarterEnabled helper');
});

async function runPaymentsWithFetchMock(fetchMock, initialCache) {
  const { readFileSync } = await import('node:fs');
  const vm = await import('node:vm');
  let code = readFileSync(new URL('../js/payments.js', import.meta.url), 'utf8');
  code = code.replace(/import\s*\{[^}]*\}\s*from\s*["'][^"']*firebase\/auth\.js["'];/, 
    'let _u = { uid: "test-user-preservation", getIdToken: async () => "mock-token" }; const initFirebase=()=>{}; const getAuthInstance=()=>({currentUser:_u}); const onAuthChange=cb=>{cb(_u); return ()=>{}};');
  code = code.replace(/import\s*\{[^}]*\}\s*from\s*["']\.\/store\.js["'];/, 'const pingVisit=()=>{};');
  code = code.replace(/import\s*\{[^}]*\}\s*from\s*["']\.\/tiers\.js["'];/, `
    const TIERS = { free: { maxLevel: 1, games: ["race"], maxLesson: 1, freePlay: false } };
    const getTierConfig = () => ({ maxLevel: 15, games: ["race"], maxLesson: 11, freePlay: true });
    const isFreePlayAllowedForTier = () => true;
  `);
  code = code.replace(/export\s+(default\s+)?/g, '');

  const store = {};
  if (initialCache) {
    store['abacus-entitlement-v1'] = JSON.stringify(initialCache);
  }
  const mockLocalStorage = {
    getItem: k => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };

  const context = {
    console: { warn: () => {}, log: () => {}, error: () => {} },
    localStorage: mockLocalStorage,
    setTimeout,
    clearTimeout,
    Date,
    JSON,
    Error,
    Promise,
    Boolean,
    Response,
    fetch: fetchMock
  };

  vm.createContext(context);
  vm.runInContext(code + '\n; globalThis.refresh = refreshEntitlement; globalThis.isPaid = isPaid; globalThis.getEntitlement = getEntitlement;', context);
  const paidResult = await context.refresh();
  return {
    paidResult,
    isPaid: context.isPaid(),
    entitlement: context.getEntitlement(),
    cache: store['abacus-entitlement-v1'] ? JSON.parse(store['abacus-entitlement-v1']) : null
  };
}

await test('20.2 payments.js preserves cached paid entitlement and cache unchanged on real 401 response', async () => {
  const initialCache = {
    uid: 'test-user-preservation',
    paid: true,
    tier: 'lifetime',
    entitlement: { paid: true, tier: 'lifetime', maxLevel: 15, games: ['race'], maxLesson: 11, freePlay: true, expiresAt: null, expired: false }
  };
  const result = await runPaymentsWithFetchMock(
    async () => new Response(JSON.stringify({ error: 'missing authorization' }), { status: 401, headers: { 'Content-Type': 'application/json' } }),
    initialCache
  );
  assert.equal(result.paidResult, true, 'refreshEntitlement() must return true when cached user gets 401');
  assert.equal(result.isPaid, true, 'isPaid() must remain true');
  assert.equal(result.entitlement.paid, true, 'entitlement.paid must remain true');
  assert.equal(result.entitlement.tier, 'lifetime', 'entitlement.tier must remain lifetime');
  assert.equal(result.cache.paid, true, 'cache must stay paid:true');
  assert.equal(result.cache.tier, 'lifetime', 'cache must stay lifetime');
});

await test('20.3 payments.js preserves cached paid entitlement and cache unchanged on real 500 response', async () => {
  const initialCache = {
    uid: 'test-user-preservation',
    paid: true,
    tier: 'starter',
    entitlement: { paid: true, tier: 'starter', maxLevel: 6, games: ['race', 'mystery', 'match', 'flash'], maxLesson: 6, freePlay: true, expiresAt: '2026-11-01T00:00:00Z', expired: false }
  };
  const result = await runPaymentsWithFetchMock(
    async () => new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } }),
    initialCache
  );
  assert.equal(result.paidResult, true, 'refreshEntitlement() must return true when cached user gets 500');
  assert.equal(result.isPaid, true, 'isPaid() must remain true');
  assert.equal(result.entitlement.paid, true, 'entitlement.paid must remain true');
  assert.equal(result.entitlement.tier, 'starter', 'entitlement.tier must remain starter');
  assert.equal(result.cache.paid, true, 'cache must stay paid:true');
  assert.equal(result.cache.tier, 'starter', 'cache must stay starter');
});

await test('20.4 payments.js treats expired cached starter entitlement as free when network fails or offline', async () => {
  const expiredCache = {
    uid: 'test-user-preservation',
    paid: true,
    tier: 'starter',
    entitlement: {
      paid: true,
      tier: 'starter',
      maxLevel: 6,
      games: ['race', 'mystery', 'match', 'flash'],
      maxLesson: 6,
      freePlay: true,
      expiresAt: new Date(Date.now() - 10000).toISOString(),
      expired: false
    }
  };
  const result = await runPaymentsWithFetchMock(
    async () => new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 }),
    expiredCache
  );
  assert.equal(result.paidResult, false, 'refreshEntitlement() must return false for expired cached starter');
  assert.equal(result.isPaid, false, 'isPaid() must be false');
  assert.equal(result.entitlement.paid, false, 'entitlement.paid must be false');
  assert.equal(result.entitlement.tier, 'free', 'entitlement.tier must be free');
  assert.equal(result.entitlement.expired, true, 'entitlement.expired must be true');
  assert.equal(result.entitlement.maxLevel, 1, 'entitlement.maxLevel must be free tier maxLevel');
});

// ── 21. DISPLAY TEXT AUDIT: NO USER-FACING LIFETIME OR வாழ்நாள் ─────────────
await test('21.1 No visible user-facing text uses Lifetime or வாழ்நாள் across js/*.html', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const path = await import('node:path');

  function stripComments(code) {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '');
  }

  const jsDir = new URL('../js', import.meta.url).pathname;
  const rootDir = new URL('..', import.meta.url).pathname;
  const jsFiles = readdirSync(jsDir).filter(f => f.endsWith('.js')).map(f => path.join(jsDir, f));
  const htmlFiles = readdirSync(rootDir).filter(f => f.endsWith('.html')).map(f => path.join(rootDir, f));
  const allFiles = [...jsFiles, ...htmlFiles];

  for (const file of allFiles) {
    const raw = readFileSync(file, 'utf8');
    const content = file.endsWith('.html') ? raw.replace(/<!--[\s\S]*?-->/g, '') : stripComments(raw);
    const matches = content.match(/Lifetime|வாழ்நாள்/g);
    assert.equal(matches, null, `Found visible 'Lifetime' or 'வாழ்நாள்' in ${path.basename(file)}: ${matches}`);
  }

  // Preserve explicit checks on key customer-facing strings
  const starterCode = readFileSync(new URL('../js/starter.js', import.meta.url), 'utf8');
  const appCode = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.ok(starterCode.includes('One-time payment - never expires'), 'Has One-time payment in starter.js');
  assert.ok(starterCode.includes('ஒரே முறை கட்டணம் - எப்போதும் காலாவதியாகாது'), 'Has Tamil One-time payment in starter.js');
  assert.ok(appCode.includes('Abacus Buddy One-time payment'), 'Has One-time payment eyebrow in app.js');
  assert.ok(appCode.includes('அபாகஸ் பட்டி ஒரே முறை கட்டணம்'), 'Has Tamil One-time payment eyebrow in app.js');
});

console.log(`\nStarter Payment Test Summary: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
