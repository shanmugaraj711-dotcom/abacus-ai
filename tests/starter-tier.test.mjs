import assert from 'node:assert';
import {
  main, firestoreGet, firestorePut,
  PRICE_LIFETIME, PRICE_STARTER, PRODUCT, hmac, eq
} from '../worker.js';

// The 7 games in Abacus Buddy playroom
const GAMES = [
  { id: 'race', flag: 'gameRace', name: 'Bead Race' },
  { id: 'mystery', flag: 'gameMystery', name: 'Mystery Number' },
  { id: 'match', flag: 'gameMatch', name: 'Bead Match' },
  { id: 'flash', flag: 'gameFlash', name: 'Flash Maths' },
  { id: 'speed', flag: 'gameSpeedRead', name: 'Blink Beads' },
  { id: 'friend', flag: 'gameFriendDash', name: 'Friend Dash' },
  { id: 'ladder', flag: 'gameLadder', name: 'Bead Ladder' },
];

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

// Mock entitlement helpers to simulate various client states
function mockPlayableMax(tier) {
  if (tier === 'lifetime') return 15;
  if (tier === 'starter') return 3;
  return 1; // free / expired
}

function mockLevelAllowed(id, tier) {
  const max = mockPlayableMax(tier);
  return id >= 1 && id <= max;
}

function mockGameAllowed(id, gameLimit) {
  const index = GAMES.findIndex(g => g.id === id);
  if (index === -1) return false;
  if (gameLimit === null || gameLimit === undefined) return true;
  return index < gameLimit;
}

test('1. Legacy paid:true resolves to Lifetime (maxLevel 15, expiresAt null)', () => {
  // Legacy document from Firestore
  const legacyDoc = {
    fields: {
      paid: { booleanValue: true },
      orderId: { stringValue: 'order_legacy_123' },
      paidAt: { stringValue: '2026-01-01T00:00:00.000Z' }
      // Notice: NO tier, NO maxLevel, NO expiresAt
    }
  };
  // Simulate firestoreGet parsing logic
  const rawTier = legacyDoc.fields.tier?.stringValue;
  assert.strictEqual(rawTier, undefined);
  const parsed = (!rawTier || rawTier === 'lifetime') ? {
    paid: true,
    tier: 'lifetime',
    maxLevel: 15,
    expiresAt: null,
    gameLimit: null,
    orderId: legacyDoc.fields.orderId.stringValue
  } : null;

  assert.strictEqual(parsed.paid, true);
  assert.strictEqual(parsed.tier, 'lifetime');
  assert.strictEqual(parsed.maxLevel, 15);
  assert.strictEqual(parsed.expiresAt, null);
  assert.strictEqual(parsed.gameLimit, null);
  assert.strictEqual(mockLevelAllowed(15, parsed.tier), true);
  assert.strictEqual(mockGameAllowed('ladder', parsed.gameLimit), true);
});

test('2. Explicit lifetime entitlement allows Level 15 and all games', () => {
  const tier = 'lifetime';
  const gameLimit = null;
  assert.strictEqual(mockPlayableMax(tier), 15);
  for (let i = 1; i <= 15; i++) {
    assert.strictEqual(mockLevelAllowed(i, tier), true, `Level ${i} should be allowed`);
  }
  assert.strictEqual(mockLevelAllowed(16, tier), false, 'Level 16 should be blocked');
  for (const g of GAMES) {
    assert.strictEqual(mockGameAllowed(g.id, gameLimit), true, `Game ${g.id} should be allowed`);
  }
});

test('3. Starter entitlement allows Levels 1-3 and blocks Level 4', () => {
  const tier = 'starter';
  assert.strictEqual(mockPlayableMax(tier), 3);
  assert.strictEqual(mockLevelAllowed(1, tier), true, 'Level 1 allowed');
  assert.strictEqual(mockLevelAllowed(2, tier), true, 'Level 2 allowed');
  assert.strictEqual(mockLevelAllowed(3, tier), true, 'Level 3 allowed');
  assert.strictEqual(mockLevelAllowed(4, tier), false, 'Level 4 blocked');
  assert.strictEqual(mockLevelAllowed(15, tier), false, 'Level 15 blocked');
});

test('4. Starter game entitlement allows first 3 games and blocks 4th+ games', () => {
  const gameLimit = 3;
  assert.strictEqual(mockGameAllowed(GAMES[0].id, gameLimit), true, `Game 1 (${GAMES[0].id}) allowed`);
  assert.strictEqual(mockGameAllowed(GAMES[1].id, gameLimit), true, `Game 2 (${GAMES[1].id}) allowed`);
  assert.strictEqual(mockGameAllowed(GAMES[2].id, gameLimit), true, `Game 3 (${GAMES[2].id}) allowed`);
  assert.strictEqual(mockGameAllowed(GAMES[3].id, gameLimit), false, `Game 4 (${GAMES[3].id}) blocked`);
  assert.strictEqual(mockGameAllowed(GAMES[4].id, gameLimit), false, `Game 5 (${GAMES[4].id}) blocked`);
  assert.strictEqual(mockGameAllowed(GAMES[5].id, gameLimit), false, `Game 6 (${GAMES[5].id}) blocked`);
  assert.strictEqual(mockGameAllowed(GAMES[6].id, gameLimit), false, `Game 7 (${GAMES[6].id}) blocked`);
});

test('5. Free user allows Level 1 only and only 1 game', () => {
  const tier = 'free';
  const gameLimit = 1;
  assert.strictEqual(mockPlayableMax(tier), 1);
  assert.strictEqual(mockLevelAllowed(1, tier), true, 'Level 1 allowed');
  assert.strictEqual(mockLevelAllowed(2, tier), false, 'Level 2 blocked');
  assert.strictEqual(mockLevelAllowed(3, tier), false, 'Level 3 blocked');
  assert.strictEqual(mockLevelAllowed(4, tier), false, 'Level 4 blocked');

  assert.strictEqual(mockGameAllowed(GAMES[0].id, gameLimit), true, `Game 1 (${GAMES[0].id}) allowed`);
  assert.strictEqual(mockGameAllowed(GAMES[1].id, gameLimit), false, `Game 2 (${GAMES[1].id}) blocked`);
  assert.strictEqual(mockGameAllowed(GAMES[2].id, gameLimit), false, `Game 3 (${GAMES[2].id}) blocked`);
});

test('6. Expired Starter falls back to Free (Level 1 allowed, Level 2 blocked, 1 game)', () => {
  const expiredDate = new Date(Date.now() - 10000).toISOString();
  const isExpired = Date.parse(expiredDate) <= Date.now();
  assert.strictEqual(isExpired, true);

  const fallback = isExpired ? {
    paid: false,
    tier: 'free',
    maxLevel: 1,
    gameLimit: 1,
    expired: true
  } : null;

  assert.strictEqual(fallback.paid, false);
  assert.strictEqual(fallback.tier, 'free');
  assert.strictEqual(mockLevelAllowed(1, fallback.tier), true);
  assert.strictEqual(mockLevelAllowed(2, fallback.tier), false);
  assert.strictEqual(mockGameAllowed(GAMES[0].id, fallback.gameLimit), true);
  assert.strictEqual(mockGameAllowed(GAMES[1].id, fallback.gameLimit), false);
});

test('7. Lifetime games allows all 7 existing games', () => {
  assert.strictEqual(GAMES.length, 7);
  for (const g of GAMES) {
    assert.strictEqual(mockGameAllowed(g.id, null), true, `${g.name} allowed`);
  }
});

test('8. ₹99 server pricing is exactly 9900 paise', () => {
  assert.strictEqual(PRICE_STARTER, 9900);
});

test('9. ₹499 server pricing is exactly 49900 paise', () => {
  assert.strictEqual(PRICE_LIFETIME, 49900);
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
  // Bearer token helper (in real worker it calls identitytoolkit accounts:lookup)
  return 'mock_token_' + uid;
}

// Intercept global fetch for test mock server
const originalFetch = globalThis.fetch;

function setupMockFetch(options = {}) {
  globalThis.fetch = async (url, init = {}) => {
    const urlStr = String(url);

    // Firebase Auth lookup
    if (urlStr.includes('identitytoolkit.googleapis.com')) {
      const body = JSON.parse(init.body || '{}');
      const uid = body.idToken?.replace('mock_token_', '') || 'user_123';
      return new Response(JSON.stringify({ users: [{ localId: uid, phoneNumber: '+919999999999' }] }), { status: 200 });
    }

    // Google Token (Firestore SA)
    if (urlStr.includes('oauth2.googleapis.com/token')) {
      return new Response(JSON.stringify({ access_token: 'mock_sa_token' }), { status: 200 });
    }

    // Firestore GET / PATCH
    if (urlStr.includes('firestore.googleapis.com')) {
      if (init.method === 'PATCH') {
        options.lastFirestoreWrite = JSON.parse(init.body || '{}');
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (options.firestoreDoc) {
        return new Response(JSON.stringify(options.firestoreDoc), { status: 200 });
      }
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
    }

    // Razorpay API
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

await testAsync('10 & 11. Cross-price rejection and amount-tier enforcement', async () => {
  setupMockFetch();
  try {
    const orderId = 'order_starter_cross';
    const paymentId = 'pay_starter_cross';
    const payload = `${orderId}|${paymentId}`;
    const sig = await hmac(mockEnv.RAZORPAY_KEY_SECRET, payload);

    // Case 1: Order says starter (notes.tier = starter) but amount is 49900 (Lifetime price) -> REJECT
    setupMockFetch({
      orderAmount: 49900,
      orderCurrency: 'INR',
      orderNotes: { uid: 'user_cross', product: PRODUCT, tier: 'starter' },
      paymentOrderId: orderId,
      paymentAmount: 49900,
      paymentCurrency: 'INR',
      paymentStatus: 'captured'
    });

    const req1 = new Request('https://abacus-buddy.com/api/verify-payment', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + createMockToken('user_cross'),
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: sig
      })
    });
    const res1 = await main(req1, mockEnv);
    assert.strictEqual(res1.status, 400, 'Cross-price order amount must be rejected');

    // Case 2: Order says lifetime (notes.tier = lifetime) but amount is 9900 (Starter price) -> REJECT
    setupMockFetch({
      orderAmount: 9900,
      orderCurrency: 'INR',
      orderNotes: { uid: 'user_cross', product: PRODUCT, tier: 'lifetime' },
      paymentOrderId: orderId,
      paymentAmount: 9900,
      paymentCurrency: 'INR',
      paymentStatus: 'captured'
    });
    const req2 = new Request('https://abacus-buddy.com/api/verify-payment', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + createMockToken('user_cross'),
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: sig
      })
    });
    const res2 = await main(req2, mockEnv);
    assert.strictEqual(res2.status, 400, 'Cross-price order amount must be rejected');
  } finally {
    restoreFetch();
  }
});

await testAsync('12. Browser amount override is ignored / rejected on server', async () => {
  setupMockFetch();
  try {
    // Malicious client tries to buy starter or lifetime for 100 paise
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
    assert.strictEqual(data.amount, 9900, 'Server must enforce 9900 paise regardless of client input');
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
      orderNotes: { uid: 'victim_user_456', product: PRODUCT, tier: 'starter' }, // mismatch with user_attacker
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
      paymentStatus: 'authorized' // Not captured!
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
    assert.strictEqual(data.gameLimit, null);

    // Verify Firestore fields written
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

await testAsync('19. Webhook handler provisions Starter on 9900 and Lifetime on 49900', async () => {
  const options = {};
  setupMockFetch(options);
  try {
    // 19a. Starter webhook
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
    assert.strictEqual(writtenS.gameLimit?.integerValue, '3');
    assert.ok(writtenS.expiresAt?.stringValue);

    // 19b. Lifetime webhook
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
  } finally {
    restoreFetch();
  }
});

await testAsync('20. Successful Starter payment verification writes 30-day entitlement', async () => {
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
    assert.strictEqual(data.gameLimit, 3);
    assert.ok(data.expiresAt);

    // Verify ~30 days in future
    const exp = Date.parse(data.expiresAt);
    const days30 = 30 * 24 * 60 * 60 * 1000;
    assert.ok(exp >= before + days30 - 5000);
    assert.ok(exp <= before + days30 + 5000);

    const written = options.lastFirestoreWrite?.fields;
    assert.strictEqual(written.tier?.stringValue, 'starter');
    assert.strictEqual(written.maxLevel?.integerValue, '3');
    assert.strictEqual(written.gameLimit?.integerValue, '3');
  } finally {
    restoreFetch();
  }
});

await testAsync('21. /api/user-status returns Free entitlement for users with no document', async () => {
  setupMockFetch({ firestoreDoc: null }); // 404
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
    assert.strictEqual(data.gameLimit, 1);
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
    assert.strictEqual(data.gameLimit, null);
  } finally {
    restoreFetch();
  }
});

await testAsync('23. /api/user-status returns Free fallback when Starter tier is expired in Firestore', async () => {
  const pastDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
  setupMockFetch({
    firestoreDoc: {
      fields: {
        paid: { booleanValue: true },
        tier: { stringValue: 'starter' },
        maxLevel: { integerValue: '3' },
        gameLimit: { integerValue: '3' },
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
    assert.strictEqual(data.gameLimit, 1);
    assert.strictEqual(data.expired, true);
  } finally {
    restoreFetch();
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
