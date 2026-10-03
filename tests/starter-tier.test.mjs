import assert from 'node:assert';
import fs from 'node:fs';
import {
  main, firestoreGet, firestorePut,
  PRICE_LIFETIME, PRICE_STARTER, PRODUCT, hmac, eq
} from '../worker.js';
import {
  TIERS, getTierConfig, isGameAllowedForTier, isLessonAllowedForTier, isFreePlayAllowedForTier, ALL_GAMES
} from '../js/tiers.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ ${name}:`, err.message);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ ${name}:`, err.message);
    failed++;
  }
}

console.log('=== Starter Tier & Lifetime Entitlement Test Suite ===\n');

// ----------------------------------------------------
// 1. Client Level & Game Access Logic Tests
// ----------------------------------------------------

function clientPlayableMax(tier) {
  const cfg = getTierConfig(tier);
  return cfg.maxLevel;
}

function clientLevelAllowed(id, tier) {
  const max = clientPlayableMax(tier);
  return id >= 1 && id <= max;
}

function clientGameAllowed(id, tier) {
  const cfg = getTierConfig(tier);
  return isGameAllowedForTier(id, cfg);
}

function clientLessonAllowed(id, tier) {
  const cfg = getTierConfig(tier);
  return isLessonAllowedForTier(id, cfg);
}

function clientFreePlayAllowed(tier) {
  const cfg = getTierConfig(tier);
  return isFreePlayAllowedForTier(cfg);
}

test('1. Legacy paid:true resolves to Lifetime (maxLevel 15, expiresAt null)', () => {
  const legacyDoc = {
    fields: {
      paid: { booleanValue: true },
      orderId: { stringValue: 'order_legacy_123' },
      paidAt: { stringValue: '2026-01-01T00:00:00.000Z' }
    }
  };
  const rawTier = legacyDoc.fields.tier?.stringValue;
  assert.strictEqual(rawTier, undefined);
  const cfg = TIERS.lifetime;
  const parsed = (!rawTier || rawTier === 'lifetime') ? {
    paid: true,
    tier: 'lifetime',
    maxLevel: cfg.maxLevel,
    games: cfg.games,
    expiresAt: null,
    orderId: legacyDoc.fields.orderId.stringValue
  } : null;

  assert.strictEqual(parsed.paid, true);
  assert.strictEqual(parsed.tier, 'lifetime');
  assert.strictEqual(parsed.maxLevel, 15);
  assert.strictEqual(parsed.expiresAt, null);
  assert.strictEqual(clientLevelAllowed(15, parsed.tier), true);
  assert.strictEqual(clientGameAllowed('ladder', parsed.tier), true);
  assert.strictEqual(clientLessonAllowed(11, parsed.tier), true);
  assert.strictEqual(clientFreePlayAllowed(parsed.tier), true);
});

test('2. Explicit lifetime entitlement allows Level 15 and all games', () => {
  const tier = 'lifetime';
  assert.strictEqual(clientPlayableMax(tier), 15);
  for (let i = 1; i <= 15; i++) {
    assert.strictEqual(clientLevelAllowed(i, tier), true, `Level ${i} should be allowed`);
  }
  assert.strictEqual(clientLevelAllowed(16, tier), false, 'Level 16 should be blocked');
  for (const g of ALL_GAMES) {
    assert.strictEqual(clientGameAllowed(g, tier), true, `Game ${g} should be allowed`);
  }
  assert.strictEqual(clientLessonAllowed(1, tier), true, 'Lesson 1 allowed');
  assert.strictEqual(clientLessonAllowed(11, tier), true, 'Lesson 11 allowed');
  assert.strictEqual(clientLessonAllowed(12, tier), false, 'Lesson 12 blocked');
  assert.strictEqual(clientFreePlayAllowed(tier), true, 'Free Play allowed');
});

test('3. Starter entitlement allows Levels 1-3 and blocks Level 4', () => {
  const tier = 'starter';
  assert.strictEqual(clientPlayableMax(tier), 3);
  assert.strictEqual(clientLevelAllowed(1, tier), true, 'Level 1 allowed');
  assert.strictEqual(clientLevelAllowed(2, tier), true, 'Level 2 allowed');
  assert.strictEqual(clientLevelAllowed(3, tier), true, 'Level 3 allowed');
  assert.strictEqual(clientLevelAllowed(4, tier), false, 'Level 4 blocked');
  assert.strictEqual(clientLevelAllowed(15, tier), false, 'Level 15 blocked');

  assert.strictEqual(clientLessonAllowed(1, tier), true, 'Lesson 1 allowed');
  assert.strictEqual(clientLessonAllowed(7, tier), true, 'Lesson 7 allowed');
  assert.strictEqual(clientLessonAllowed(8, tier), false, 'Lesson 8 blocked');
  assert.strictEqual(clientFreePlayAllowed(tier), true, 'Free Play allowed');
});

test('4. Starter game entitlement uses explicit game IDs [race, mystery, match] and blocks others', () => {
  const tier = 'starter';
  const cfg = getTierConfig(tier);
  assert.deepStrictEqual(cfg.games, ['race', 'mystery', 'match']);

  // Explicit ID check, independent of array ordering
  assert.strictEqual(clientGameAllowed('race', tier), true, 'Bead Race allowed');
  assert.strictEqual(clientGameAllowed('mystery', tier), true, 'Mystery Number allowed');
  assert.strictEqual(clientGameAllowed('match', tier), true, 'Bead Match allowed');
  assert.strictEqual(clientGameAllowed('flash', tier), false, 'Flash Maths blocked');
  assert.strictEqual(clientGameAllowed('speed', tier), false, 'Blink Beads blocked');
  assert.strictEqual(clientGameAllowed('friend', tier), false, 'Friend Dash blocked');
  assert.strictEqual(clientGameAllowed('ladder', tier), false, 'Bead Ladder blocked');
});

test('5. Free user allows Level 1 only and only 1 game (race)', () => {
  const tier = 'free';
  const cfg = getTierConfig(tier);
  assert.strictEqual(clientPlayableMax(tier), 1);
  assert.strictEqual(clientLevelAllowed(1, tier), true, 'Level 1 allowed');
  assert.strictEqual(clientLevelAllowed(2, tier), false, 'Level 2 blocked');
  assert.strictEqual(clientLevelAllowed(3, tier), false, 'Level 3 blocked');
  assert.strictEqual(clientLevelAllowed(4, tier), false, 'Level 4 blocked');

  assert.deepStrictEqual(cfg.games, ['race']);
  assert.strictEqual(clientGameAllowed('race', tier), true, 'Bead Race allowed');
  assert.strictEqual(clientGameAllowed('mystery', tier), false, 'Mystery Number blocked');
  assert.strictEqual(clientGameAllowed('match', tier), false, 'Bead Match blocked');

  assert.strictEqual(clientLessonAllowed(1, tier), true, 'Lesson 1 allowed');
  assert.strictEqual(clientLessonAllowed(6, tier), true, 'Lesson 6 allowed');
  assert.strictEqual(clientLessonAllowed(7, tier), false, 'Lesson 7 blocked');
  assert.strictEqual(clientFreePlayAllowed(tier), false, 'Free Play blocked');
});

test('6. Expired Starter falls back to Free (Level 1 allowed, Level 2 blocked, 1 game)', () => {
  const expiredDate = new Date(Date.now() - 10000).toISOString();
  const isExpired = Date.parse(expiredDate) <= Date.now();
  assert.strictEqual(isExpired, true);

  const fallback = isExpired ? {
    paid: false,
    tier: 'free',
    maxLevel: TIERS.free.maxLevel,
    games: TIERS.free.games,
    expired: true
  } : null;

  assert.strictEqual(fallback.paid, false);
  assert.strictEqual(fallback.tier, 'free');
  assert.strictEqual(clientLevelAllowed(1, fallback.tier), true);
  assert.strictEqual(clientLevelAllowed(2, fallback.tier), false);
  assert.strictEqual(clientGameAllowed('race', fallback.tier), true);
  assert.strictEqual(clientGameAllowed('mystery', fallback.tier), false);
});

test('7. Lifetime games allows all 7 existing games', () => {
  assert.strictEqual(ALL_GAMES.length, 7);
  for (const g of ALL_GAMES) {
    assert.strictEqual(clientGameAllowed(g, 'lifetime'), true, `${g} allowed`);
  }
});

test('8. ₹99 server pricing is driven by configuration (9900 paise)', () => {
  assert.strictEqual(TIERS.starter.pricePaise, 9900);
  assert.strictEqual(PRICE_STARTER, TIERS.starter.pricePaise);
});

test('9. ₹499 server pricing is driven by configuration (49900 paise)', () => {
  assert.strictEqual(TIERS.lifetime.pricePaise, 49900);
  assert.strictEqual(PRICE_LIFETIME, TIERS.lifetime.pricePaise);
});

// ----------------------------------------------------
// 2. Server API and Security Validation Tests
// ----------------------------------------------------

const mockEnv = {
  RAZORPAY_KEY_ID: 'rzp_test_mockKey',
  RAZORPAY_KEY_SECRET: 'test_secret_12345678',
  RAZORPAY_WEBHOOK_SECRET: 'webhook_secret_87654321',
  FIREBASE_PROJECT_ID: 'abacus-buddy-test',
  FIREBASE_API_KEY: 'test_firebase_api_key',
  FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    client_email: 'test-sa@abacus-buddy-test.iam.gserviceaccount.com',
    private_key: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDucbeM4Abnb9fO
WDszgWes+pf8Ib3CO5ggL4MOSiF8q//gNH/0reKopQZNdylL6/NK7QUUBLPSBUob
tp6KywL7hy9X+VhqPMStcsXwKqBf1qL19wSsmoOOUKHLBaoJ4XEE+KGQpsmrKM2+
zPzRWQH6mj2ImSz8fWDw7j3Q35dSpFe4QQZ4IMMShJP1moTtczCtswksHXNrhhKT
mzofB+h6uoZFu0ufCRfpdXhsWA6k9TYnv8eOalAL7ON2YW9KmyLmfpV+wn767A4R
F9QXWQb2bkE74EeC7m70BezLZc8zPTD0Percrp1uksEm+QkkVsoNF38Lr6c1D42T
PCxxdkLrAgMBAAECggEAdkl8jIrQcfyWWtuDVuxBwdq5Dg+xAsusjn7zbWHSFfZ/
o7p3paqjcBUZuNE979d35LoLVGB20l/kYTYplWHbs2rfTi24sk8+JGt1DU0gLRsd
0ZY+v9+RFsciVESVk3w+pIAxKkDLd7jwxFANtU8J/8eHch3G5uTN9AfEK7vX5lsC
opDziJtt5BpF/07AloL2R9GPmUYFbJL7DALXYXog6ajQIPloC6e0RNIayAmlZP3b
ODLrtKZZ/nfg+RsCyBqQpAUicdGNvJOc9o71ZEKaNizEssMFYn0G6rQ7L2znti3c
Bq5qqu/8NsgfwEEmomL2Sw6cpw3LzlCTY6FlZrepGQKBgQD9MGoCEc3e92wAZoRM
9c4loCoqPoGty8auJsgfcEDNO8aaMJWkOLIlznvolTEz04OCK+0x/tx2keahz0oC
hMq4rTptQYzU6bs1Tan4WstvVkHFRvGtImYqJAFCv7TNIqzYKJIZzexOYF/d1K3D
hIXHjpIW8fpv3Gd2h7awziOUKQKBgQDxF2WEwm2If3VdTDCqK/jNUEDi18jMdUBs
wIcPg8LjAq+zzMmU2w5VwJu6mo+U0OQXybXiPRFw4st18utoy51YZV79E8+1piOg
MLgFc7Wh6z72POlnquV2waONqoIUwNh04uFw0TGh1YuvMhTq7P13OGQP3I3FlXcu
oV8y2z+g8wKBgEDGpSh4Y6JazM/hapHCBYbMzlzWdxj+3IrrsyGP95RKacpDCdXl
B3byt/LOULNAtxGTqXC0ErVnKIlXXkj8rlzHPP582coTLmk5wHWgzRFkERmmx+gS
t+6qHYR1RY2CBJSc9JwTehSnRX+cjQRLoGpoyGmEaR07V2EU4aGka6fZAoGBAK05
EkgBKpIYgks2owCh93INZ5GVWUEOPevlqSUMlspk87lMOsopWnNioIHC68cRD9HH
rFeRaSaizW1BzMLPCY6px0YvJd5uMMq4NoA0Uxyz2dkyisFhmN1q5Ai1qiEfLmdN
XI2iwPZ2aJbIdR8WiEdQzRRYc8SzT57Bc5Um0uDhAoGBALCEPI3rUM8QyCrTUAoR
vLZgoFhpcqb6RVvBCjRFIBgPIopj5AW/t52jtkAPVPUS0xtKzPGnxDcuSQsYwMUl
1efJtRy0G7+h4iiIb+0zN6GLYwvMAHaoOeGc7lME9cmlg2N6e9WiDTq1ERIONPxz
4DNy0haFe2Z4lT8yWDRcqw2K
-----END PRIVATE KEY-----`
  })
};

function createMockToken(uid) {
  return 'mock_token_' + uid;
}

const originalFetch = globalThis.fetch;

function setupMockFetch(options = {}) {
  globalThis.fetch = async (url, init = {}) => {
    const urlStr = String(url);

    if (urlStr.includes('identitytoolkit.googleapis.com')) {
      const body = JSON.parse(init.body || '{}');
      const uid = body.idToken?.replace('mock_token_', '') || 'user_123';
      return new Response(JSON.stringify({ users: [{ localId: uid, phoneNumber: '+919999999999' }] }), { status: 200 });
    }

    if (urlStr.includes('oauth2.googleapis.com/token')) {
      return new Response(JSON.stringify({ access_token: 'mock_sa_token' }), { status: 200 });
    }

    if (urlStr.includes('firestore.googleapis.com')) {
      if (init.method === 'PATCH') {
        options.lastFirestoreWrite = JSON.parse(init.body || '{}');
        if (!options.firestoreWrites) options.firestoreWrites = [];
        options.firestoreWrites.push({ url: urlStr, body: options.lastFirestoreWrite });
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (options.firestoreDoc) {
        if (typeof options.firestoreDoc === 'function') {
          const doc = options.firestoreDoc(urlStr);
          if (doc) return new Response(JSON.stringify(doc), { status: 200 });
          return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
        }
        return new Response(JSON.stringify(options.firestoreDoc), { status: 200 });
      }
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
    }

    if (urlStr.includes('api.razorpay.com')) {
      if (urlStr.includes('/orders') && init.method === 'POST') {
        const body = JSON.parse(init.body || '{}');
        return new Response(JSON.stringify({
          id: 'order_test_' + Date.now(),
          amount: body.amount,
          currency: body.currency,
          notes: body.notes
        }), { status: 200 });
      }
      if (urlStr.includes('/orders/') && (!init.method || init.method === 'GET')) {
        const orderId = urlStr.split('/orders/')[1];
        if (options.mockOrder) return new Response(JSON.stringify(options.mockOrder), { status: 200 });
        return new Response(JSON.stringify({
          id: orderId,
          amount: options.orderAmount ?? PRICE_STARTER,
          currency: options.orderCurrency ?? 'INR',
          notes: options.orderNotes ?? { uid: 'user_123', product: PRODUCT, tier: 'starter' }
        }), { status: 200 });
      }
      if (urlStr.includes('/payments/') && (!init.method || init.method === 'GET')) {
        const paymentId = urlStr.split('/payments/')[1];
        if (options.mockPayment) return new Response(JSON.stringify(options.mockPayment), { status: 200 });
        return new Response(JSON.stringify({
          id: paymentId,
          order_id: options.paymentOrderId ?? 'order_test_123',
          amount: options.paymentAmount ?? PRICE_STARTER,
          currency: options.paymentCurrency ?? 'INR',
          status: options.paymentStatus ?? 'captured'
        }), { status: 200 });
      }
    }

    return new Response(JSON.stringify({ error: 'unhandled mock url' }), { status: 500 });
  };
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

await testAsync('10. Cross-price rejection — ₹99 payment cannot create lifetime entitlement', async () => {
  const orderId = 'order_cross_10';
  const paymentId = 'pay_cross_10';
  const payload = `${orderId}|${paymentId}`;
  const sig = await hmac(mockEnv.RAZORPAY_KEY_SECRET, payload);

  setupMockFetch({
    orderAmount: 9900,
    orderCurrency: 'INR',
    orderNotes: { uid: 'user_cross_10', product: PRODUCT, tier: 'lifetime' },
    paymentOrderId: orderId,
    paymentAmount: 9900,
    paymentCurrency: 'INR',
    paymentStatus: 'captured'
  });
  try {
    const req = new Request('https://abacus-buddy.com/api/verify-payment', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + createMockToken('user_cross_10'),
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: sig
      })
    });
    const res = await main(req, mockEnv);
    assert.strictEqual(res.status, 400, 'Cross-price 9900 for lifetime must be rejected');
  } finally {
    restoreFetch();
  }
});

await testAsync('11. Cross-price rejection — ₹499 payment cannot be treated as Starter', async () => {
  const orderId = 'order_cross_11';
  const paymentId = 'pay_cross_11';
  const payload = `${orderId}|${paymentId}`;
  const sig = await hmac(mockEnv.RAZORPAY_KEY_SECRET, payload);

  setupMockFetch({
    orderAmount: 49900,
    orderCurrency: 'INR',
    orderNotes: { uid: 'user_cross_11', product: PRODUCT, tier: 'starter' },
    paymentOrderId: orderId,
    paymentAmount: 49900,
    paymentCurrency: 'INR',
    paymentStatus: 'captured'
  });
  try {
    const req = new Request('https://abacus-buddy.com/api/verify-payment', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + createMockToken('user_cross_11'),
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: sig
      })
    });
    const res = await main(req, mockEnv);
    assert.strictEqual(res.status, 400, 'Cross-price 49900 for starter must be rejected');
  } finally {
    restoreFetch();
  }
});

await testAsync('12. Browser amount override is ignored / rejected on server', async () => {
  setupMockFetch();
  try {
    const req = new Request('https://abacus-buddy.com/api/create-order', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + createMockToken('user_hacker'),
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        tier: 'starter',
        amount: 100 // Malicious override attempt
      })
    });
    const res = await main(req, mockEnv);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.amount, TIERS.starter.pricePaise, 'Server must enforce configured price regardless of client input');
  } finally {
    restoreFetch();
  }
});

await testAsync('13. Invalid product/tier is rejected with 400', async () => {
  setupMockFetch();
  try {
    const req = new Request('https://abacus-buddy.com/api/create-order', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + createMockToken('user_test'),
        'content-type': 'application/json'
      },
      body: JSON.stringify({ tier: 'enterprise_vip_free' })
    });
    const res = await main(req, mockEnv);
    assert.strictEqual(res.status, 400, 'Unknown tier must return 400');
    const data = await res.json();
    assert.strictEqual(data.error, 'Invalid tier');
  } finally {
    restoreFetch();
  }
});

await testAsync('14. Invalid Razorpay signature is rejected with 400', async () => {
  setupMockFetch();
  try {
    const req = new Request('https://abacus-buddy.com/api/verify-payment', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + createMockToken('user_test'),
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'invalid_forged_signature_hex'
      })
    });
    const res = await main(req, mockEnv);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'Invalid payment signature');
  } finally {
    restoreFetch();
  }
});

await testAsync('15. Wrong amount in payment is rejected with 400', async () => {
  setupMockFetch();
  try {
    const orderId = 'order_amt_mismatch';
    const paymentId = 'pay_amt_mismatch';
    const sig = await hmac(mockEnv.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`);

    setupMockFetch({
      orderAmount: 9900,
      paymentAmount: 5000, // mismatch
      paymentOrderId: orderId,
      orderNotes: { uid: 'user_amt', product: PRODUCT, tier: 'starter' },
      paymentStatus: 'captured'
    });

    const req = new Request('https://abacus-buddy.com/api/verify-payment', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + createMockToken('user_amt'),
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: sig
      })
    });
    const res = await main(req, mockEnv);
    assert.strictEqual(res.status, 400);
  } finally {
    restoreFetch();
  }
});

await testAsync('16. Wrong UID in order notes is rejected with 400', async () => {
  setupMockFetch();
  try {
    const orderId = 'order_uid_mismatch';
    const paymentId = 'pay_uid_mismatch';
    const sig = await hmac(mockEnv.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`);

    setupMockFetch({
      orderAmount: 9900,
      paymentAmount: 9900,
      paymentOrderId: orderId,
      orderNotes: { uid: 'victim_user_456', product: PRODUCT, tier: 'starter' },
      paymentStatus: 'captured'
    });

    const req = new Request('https://abacus-buddy.com/api/verify-payment', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + createMockToken('user_attacker'),
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: sig
      })
    });
    const res = await main(req, mockEnv);
    assert.strictEqual(res.status, 400);
  } finally {
    restoreFetch();
  }
});

await testAsync('17. Non-captured payment status is rejected with 400', async () => {
  setupMockFetch();
  try {
    const orderId = 'order_uncaptured';
    const paymentId = 'pay_uncaptured';
    const sig = await hmac(mockEnv.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`);

    setupMockFetch({
      orderAmount: 9900,
      paymentAmount: 9900,
      paymentOrderId: orderId,
      orderNotes: { uid: 'user_uncap', product: PRODUCT, tier: 'starter' },
      paymentStatus: 'authorized'
    });

    const req = new Request('https://abacus-buddy.com/api/verify-payment', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + createMockToken('user_uncap'),
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: sig
      })
    });
    const res = await main(req, mockEnv);
    assert.strictEqual(res.status, 400);
  } finally {
    restoreFetch();
  }
});

await testAsync('18. Existing ₹499 flow verification regression succeeds cleanly', async () => {
  const options = {
    orderAmount: 49900,
    paymentAmount: 49900,
    paymentOrderId: 'order_lifetime_test',
    orderNotes: { uid: 'user_lifetime', product: PRODUCT, tier: 'lifetime' },
    paymentStatus: 'captured'
  };
  setupMockFetch(options);
  try {
    const orderId = 'order_lifetime_test';
    const paymentId = 'pay_lifetime_test';
    const sig = await hmac(mockEnv.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`);

    const req = new Request('https://abacus-buddy.com/api/verify-payment', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + createMockToken('user_lifetime'),
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: sig
      })
    });
    const res = await main(req, mockEnv);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.paid, true);
    assert.strictEqual(data.tier, 'lifetime');
    assert.strictEqual(data.maxLevel, 15);
    assert.strictEqual(data.expiresAt, null);
    assert.deepStrictEqual(data.games, ALL_GAMES);

    const written = options.lastFirestoreWrite?.fields;
    assert.ok(written);
    assert.strictEqual(written.paid?.booleanValue, true);
    assert.strictEqual(written.tier?.stringValue, 'lifetime');
    assert.strictEqual(written.maxLevel?.integerValue, '15');
    assert.strictEqual(written.expiresAt?.nullValue, null);
  } finally {
    restoreFetch();
  }
});

await testAsync('19. Webhook handler provisions Starter on 9900 and Lifetime on 49900 with strict metadata validation', async () => {
  const options = {};
  setupMockFetch(options);
  try {
    // 19a. Starter webhook with valid metadata
    const starterPayload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_wh_starter',
            order_id: 'ord_wh_starter',
            amount: 9900,
            currency: 'INR',
            notes: { uid: 'user_wh_s', product: PRODUCT, tier: 'starter' }
          }
        }
      }
    });
    const sigStarter = await hmac(mockEnv.RAZORPAY_WEBHOOK_SECRET, starterPayload);
    const reqS = new Request('https://abacus-buddy.com/api/razorpay-webhook', {
      method: 'POST',
      headers: {
        'x-razorpay-signature': sigStarter,
        'content-type': 'application/json'
      },
      body: starterPayload
    });
    const resS = await main(reqS, mockEnv);
    assert.strictEqual(resS.status, 200);
    const writtenS = options.lastFirestoreWrite?.fields;
    assert.strictEqual(writtenS.tier?.stringValue, 'starter');
    assert.strictEqual(writtenS.maxLevel?.integerValue, '3');
    const writtenGamesS = writtenS.games?.arrayValue?.values?.map(v => v.stringValue);
    assert.deepStrictEqual(writtenGamesS, ['race', 'mystery', 'match']);
    assert.ok(writtenS.expiresAt?.stringValue);

    // 19b. Lifetime webhook with valid metadata
    const lifetimePayload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_wh_lifetime',
            order_id: 'ord_wh_lifetime',
            amount: 49900,
            currency: 'INR',
            notes: { uid: 'user_wh_l', product: PRODUCT, tier: 'lifetime' }
          }
        }
      }
    });
    const sigLifetime = await hmac(mockEnv.RAZORPAY_WEBHOOK_SECRET, lifetimePayload);
    const reqL = new Request('https://abacus-buddy.com/api/razorpay-webhook', {
      method: 'POST',
      headers: {
        'x-razorpay-signature': sigLifetime,
        'content-type': 'application/json'
      },
      body: lifetimePayload
    });
    const resL = await main(reqL, mockEnv);
    assert.strictEqual(resL.status, 200);
    const writtenL = options.lastFirestoreWrite?.fields;
    assert.strictEqual(writtenL.tier?.stringValue, 'lifetime');
    assert.strictEqual(writtenL.maxLevel?.integerValue, '15');
    assert.strictEqual(writtenL.expiresAt?.nullValue, null);

    // 19c. Webhook does NOT provision solely from amount without valid tier/product/uid
    const badTierPayload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_wh_bad',
            order_id: 'ord_wh_bad',
            amount: 9900,
            currency: 'INR',
            notes: { uid: 'user_wh_bad', product: PRODUCT, tier: 'lifetime' } // amount 9900 but tier lifetime -> mismatch
          }
        }
      }
    });
    options.lastFirestoreWrite = null;
    const sigBad = await hmac(mockEnv.RAZORPAY_WEBHOOK_SECRET, badTierPayload);
    const reqBad = new Request('https://abacus-buddy.com/api/razorpay-webhook', {
      method: 'POST',
      headers: {
        'x-razorpay-signature': sigBad,
        'content-type': 'application/json'
      },
      body: badTierPayload
    });
    await main(reqBad, mockEnv);
    assert.strictEqual(options.lastFirestoreWrite, null, 'Webhook must NOT write entitlement when amount and tier mismatch');
  } finally {
    restoreFetch();
  }
});

await testAsync('20. Successful Starter payment verification writes 30-day entitlement with explicit game IDs', async () => {
  const options = {
    orderAmount: 9900,
    paymentAmount: 9900,
    paymentOrderId: 'order_starter_99',
    orderNotes: { uid: 'user_starter_success', product: PRODUCT, tier: 'starter' },
    paymentStatus: 'captured'
  };
  setupMockFetch(options);
  try {
    const orderId = 'order_starter_99';
    const paymentId = 'pay_starter_99';
    const sig = await hmac(mockEnv.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`);

    const before = Date.now();
    const req = new Request('https://abacus-buddy.com/api/verify-payment', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + createMockToken('user_starter_success'),
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: sig
      })
    });
    const res = await main(req, mockEnv);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.paid, true);
    assert.strictEqual(data.tier, 'starter');
    assert.strictEqual(data.maxLevel, 3);
    assert.deepStrictEqual(data.games, ['race', 'mystery', 'match']);
    assert.ok(data.expiresAt);

    const exp = Date.parse(data.expiresAt);
    const days30 = 30 * 24 * 60 * 60 * 1000;
    assert.ok(exp >= before + days30 - 5000);
    assert.ok(exp <= before + days30 + 5000);

    const written = options.lastFirestoreWrite?.fields;
    assert.strictEqual(written.tier?.stringValue, 'starter');
    assert.strictEqual(written.maxLevel?.integerValue, '3');
    const writtenGames = written.games?.arrayValue?.values?.map(v => v.stringValue);
    assert.deepStrictEqual(writtenGames, ['race', 'mystery', 'match']);
  } finally {
    restoreFetch();
  }
});

await testAsync('21. /api/user-status returns Free entitlement for users with no document', async () => {
  setupMockFetch({ firestoreDoc: null });
  try {
    const req = new Request('https://abacus-buddy.com/api/user-status', {
      method: 'GET',
      headers: { authorization: 'Bearer ' + createMockToken('user_free') }
    });
    const res = await main(req, mockEnv);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.paid, false);
    assert.strictEqual(data.tier, 'free');
    assert.strictEqual(data.maxLevel, 1);
    assert.deepStrictEqual(data.games, ['race']);
  } finally {
    restoreFetch();
  }
});

await testAsync('22. /api/user-status returns Lifetime for legacy paid:true Firestore records', async () => {
  setupMockFetch({
    firestoreDoc: {
      fields: {
        paid: { booleanValue: true },
        orderId: { stringValue: 'order_legacy_999' },
        paidAt: { stringValue: '2026-01-01T00:00:00.000Z' }
      }
    }
  });
  try {
    const req = new Request('https://abacus-buddy.com/api/user-status', {
      method: 'GET',
      headers: { authorization: 'Bearer ' + createMockToken('user_legacy') }
    });
    const res = await main(req, mockEnv);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.paid, true);
    assert.strictEqual(data.tier, 'lifetime');
    assert.strictEqual(data.maxLevel, 15);
    assert.strictEqual(data.expiresAt, null);
    assert.deepStrictEqual(data.games, ALL_GAMES);
  } finally {
    restoreFetch();
  }
});

await testAsync('23. /api/user-status returns Free fallback when Starter tier is expired in Firestore', async () => {
  const pastDate = new Date(Date.now() - 3600000).toISOString();
  setupMockFetch({
    firestoreDoc: {
      fields: {
        paid: { booleanValue: true },
        tier: { stringValue: 'starter' },
        maxLevel: { integerValue: '3' },
        games: { arrayValue: { values: [{ stringValue: 'race' }, { stringValue: 'mystery' }, { stringValue: 'match' }] } },
        expiresAt: { stringValue: pastDate },
        orderId: { stringValue: 'order_expired_1' },
        paymentId: { stringValue: 'pay_expired_1' }
      }
    }
  });
  try {
    const req = new Request('https://abacus-buddy.com/api/user-status', {
      method: 'GET',
      headers: { authorization: 'Bearer ' + createMockToken('user_expired') }
    });
    const res = await main(req, mockEnv);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.paid, false);
    assert.strictEqual(data.tier, 'free');
    assert.strictEqual(data.maxLevel, 1);
    assert.deepStrictEqual(data.games, ['race']);
    assert.strictEqual(data.expired, true);
  } finally {
    restoreFetch();
  }
});

await testAsync('24. Active Starter user verifies a valid Lifetime order -> entitlement becomes lifetime', async () => {
  const starterOrderId = 'order_starter_prev';
  const lifetimeOrderId = 'order_lifetime_upgrade';
  const lifetimePaymentId = 'pay_lifetime_upgrade';
  const sig = await hmac(mockEnv.RAZORPAY_KEY_SECRET, `${lifetimeOrderId}|${lifetimePaymentId}`);
  const futureDate = new Date(Date.now() + 20 * 86400000).toISOString();

  const options = {
    orderAmount: 49900,
    paymentAmount: 49900,
    paymentOrderId: lifetimeOrderId,
    orderNotes: { uid: 'user_upgrade', product: PRODUCT, tier: 'lifetime' },
    paymentStatus: 'captured',
    firestoreDoc: (url) => {
      if (url.includes('/documents/entitlements/user_upgrade')) {
        return {
          fields: {
            paid: { booleanValue: true },
            tier: { stringValue: 'starter' },
            maxLevel: { integerValue: '3' },
            games: { arrayValue: { values: [{ stringValue: 'race' }, { stringValue: 'mystery' }, { stringValue: 'match' }] } },
            expiresAt: { stringValue: futureDate },
            orderId: { stringValue: starterOrderId },
            paymentId: { stringValue: 'pay_starter_prev' }
          }
        };
      }
      return null;
    }
  };
  setupMockFetch(options);
  try {
    const req = new Request('https://abacus-buddy.com/api/verify-payment', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + createMockToken('user_upgrade'),
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        razorpay_order_id: lifetimeOrderId,
        razorpay_payment_id: lifetimePaymentId,
        razorpay_signature: sig
      })
    });
    const res = await main(req, mockEnv);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.paid, true);
    assert.strictEqual(data.tier, 'lifetime');
    assert.strictEqual(data.maxLevel, 15);
    assert.strictEqual(data.expiresAt, null);
    assert.deepStrictEqual(data.games, ALL_GAMES);

    const written = options.lastFirestoreWrite?.fields;
    assert.ok(written, 'Firestore entitlement should be updated to lifetime');
    assert.strictEqual(written.tier?.stringValue, 'lifetime');
    assert.strictEqual(written.maxLevel?.integerValue, '15');
    assert.strictEqual(written.orderId?.stringValue, lifetimeOrderId);
    assert.strictEqual(written.paymentId?.stringValue, lifetimePaymentId);
    assert.strictEqual(written.expiresAt?.nullValue, null);
  } finally {
    restoreFetch();
  }
});

await testAsync('25. Verifying the same Starter order twice does not change expiresAt', async () => {
  const sameOrderId = 'order_starter_same';
  const samePaymentId = 'pay_starter_same';
  const sig = await hmac(mockEnv.RAZORPAY_KEY_SECRET, `${sameOrderId}|${samePaymentId}`);
  const fixedExpiresAt = '2026-11-01T12:00:00.000Z';

  const options = {
    orderAmount: 9900,
    paymentAmount: 9900,
    paymentOrderId: sameOrderId,
    orderNotes: { uid: 'user_idempotent', product: PRODUCT, tier: 'starter' },
    paymentStatus: 'captured',
    firestoreDoc: (url) => {
      if (url.includes('/documents/entitlements/user_idempotent')) {
        return {
          fields: {
            paid: { booleanValue: true },
            tier: { stringValue: 'starter' },
            maxLevel: { integerValue: '3' },
            games: { arrayValue: { values: [{ stringValue: 'race' }, { stringValue: 'mystery' }, { stringValue: 'match' }] } },
            expiresAt: { stringValue: fixedExpiresAt },
            orderId: { stringValue: sameOrderId },
            paymentId: { stringValue: samePaymentId }
          }
        };
      }
      return null;
    }
  };
  setupMockFetch(options);
  try {
    const req = new Request('https://abacus-buddy.com/api/verify-payment', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + createMockToken('user_idempotent'),
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        razorpay_order_id: sameOrderId,
        razorpay_payment_id: samePaymentId,
        razorpay_signature: sig
      })
    });
    const res = await main(req, mockEnv);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.paid, true);
    assert.strictEqual(data.tier, 'starter');
    assert.strictEqual(data.expiresAt, fixedExpiresAt);
    assert.strictEqual(data.maxLevel, 3);
    assert.deepStrictEqual(data.games, ['race', 'mystery', 'match']);

    assert.strictEqual(options.lastFirestoreWrite, undefined, 'Must not rewrite entitlement on repeat verify');
  } finally {
    restoreFetch();
  }
});

await testAsync('26. Duplicate webhook for the same Starter order does not change expiresAt', async () => {
  const sameOrderId = 'order_starter_webhook_same';
  const samePaymentId = 'pay_starter_webhook_same';
  const fixedExpiresAt = '2026-11-01T12:00:00.000Z';

  const options = {
    firestoreDoc: (url) => {
      if (url.includes('/documents/entitlements/user_webhook_same')) {
        return {
          fields: {
            paid: { booleanValue: true },
            tier: { stringValue: 'starter' },
            maxLevel: { integerValue: '3' },
            games: { arrayValue: { values: [{ stringValue: 'race' }, { stringValue: 'mystery' }, { stringValue: 'match' }] } },
            expiresAt: { stringValue: fixedExpiresAt },
            orderId: { stringValue: sameOrderId },
            paymentId: { stringValue: samePaymentId }
          }
        };
      }
      return null;
    }
  };
  setupMockFetch(options);
  try {
    const payload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: samePaymentId,
            order_id: sameOrderId,
            amount: 9900,
            currency: 'INR',
            notes: { uid: 'user_webhook_same', product: PRODUCT, tier: 'starter' }
          }
        }
      }
    });
    const sig = await hmac(mockEnv.RAZORPAY_WEBHOOK_SECRET, payload);
    const req = new Request('https://abacus-buddy.com/api/razorpay-webhook', {
      method: 'POST',
      headers: {
        'x-razorpay-signature': sig,
        'content-type': 'application/json'
      },
      body: payload
    });
    const res = await main(req, mockEnv);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.ok, true);

    const entitlementWrites = (options.firestoreWrites || []).filter(w => w.url.includes('/documents/entitlements/'));
    assert.strictEqual(entitlementWrites.length, 0, 'Must not rewrite entitlement on duplicate webhook for same order');
  } finally {
    restoreFetch();
  }
});

await testAsync('27. /api/verify-payment with no Authorization returns 401, invalid JSON returns 400', async () => {
  setupMockFetch();
  try {
    // 27a. Missing Authorization header
    const reqNoAuth = new Request('https://abacus-buddy.com/api/verify-payment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ razorpay_order_id: 'ord_1', razorpay_payment_id: 'pay_1' })
    });
    const resNoAuth = await main(reqNoAuth, mockEnv);
    assert.strictEqual(resNoAuth.status, 401);
    const dataNoAuth = await resNoAuth.json();
    assert.strictEqual(dataNoAuth.error, 'missing authorization');

    // 27b. Invalid JSON body
    const reqBadJson = new Request('https://abacus-buddy.com/api/verify-payment', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + createMockToken('user_test'),
        'content-type': 'application/json'
      },
      body: 'invalid-non-json-body'
    });
    const resBadJson = await main(reqBadJson, mockEnv);
    assert.strictEqual(resBadJson.status, 400);
    const dataBadJson = await resBadJson.json();
    assert.strictEqual(dataBadJson.error, 'Invalid request body');
  } finally {
    restoreFetch();
  }
});

test('28. sw.js cache name bumped to v8 and SHELL contains ./js/tiers.js', () => {
  const swContent = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(swContent.includes("const CACHE = 'abacus-buddy-v8';"), 'sw.js must have CACHE abacus-buddy-v8');
  assert.ok(swContent.includes("'./js/tiers.js'"), 'sw.js SHELL must contain ./js/tiers.js');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
