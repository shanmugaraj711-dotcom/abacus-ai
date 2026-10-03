# Starter Plan Launch Guide (₹99 / 30-Day Access)

This guide documents the configuration, launch procedure, rollback plan, and verification steps for the ₹99 Starter tier.

---

## 1. Environment Variables

The Starter tier feature gate and kill switch are controlled via Cloudflare Worker environment variables:

| Variable | Type | Allowed Values | Description |
| :--- | :--- | :--- | :--- |
| `STARTER_ENABLED` | String | `"true"` \| `"false"` | Global switch for the ₹99 Starter tier. When `"false"`, Starter orders and checkout are blocked with HTTP 403 ("Starter coming soon") for regular users, and the UI displays **Coming soon** on `#starter-buy-btn`. |
| `STARTER_TESTER_UIDS` | String | Comma-separated UIDs | Allowlist of Firebase user UIDs permitted to test and purchase the Starter tier even when `STARTER_ENABLED="false"`. Example: `tester-uid-1, tester-uid-2`. |

---

## 2. Pre-Launch Testing in Production (Tester UID)

Before turning Starter on globally for all users, test the live end-to-end checkout with a tester account:

1. Obtain the Firebase UID of the test account.
2. In Cloudflare Pages / Workers settings for `abacus-ai`, add the UID to `STARTER_TESTER_UIDS`:
   ```bash
   STARTER_TESTER_UIDS="your-test-firebase-uid"
   STARTER_ENABLED="false"
   ```
3. Deploy or save settings.
4. Sign in as the tester user on `https://abacus-ai.pages.dev/auth-ui/sign-in.html`.
5. Navigate to `#/starter`:
   - Verify `#starter-buy-btn` is enabled and displays **Get Starter - Rs 99**.
   - Open another private browser window as an anonymous/regular user: verify `#starter-buy-btn` is disabled with **Coming soon**.
6. Tap **Get Starter - Rs 99** on the tester account:
   - Complete checkout via Razorpay test mode.
   - Verify `/api/verify-payment` returns `paid: true`, `tier: "starter"`, and `expiresAt` (30 days ahead).
   - Verify user is redirected to `#/home`.
   - In Grown-ups corner (`#/parents`), verify plan line shows:
     `Starter - valid until <Date> (30 days left)`.
   - Verify Levels 1–6 and lessons 1–6 are unlocked. Level 7 remains locked.

---

## 3. How to Turn Starter ON (Public Launch)

To make the Starter tier available to all registered users:

1. Go to the Cloudflare dashboard:
   - Navigate to **Workers & Pages** → `abacus-ai` → **Settings** → **Variables and Secrets**.
2. Update `STARTER_ENABLED`:
   ```bash
   STARTER_ENABLED="true"
   ```
3. Save and redeploy the Worker.
4. Verify from an incognito window with a registered free account:
   - Visit `#/starter`.
   - The button now displays **Get Starter - Rs 99** and is active.
   - User status returns `{ starterEnabled: true }`.

---

## 4. How to Roll Back (Immediate Kill Switch)

If any issue occurs during the launch:

1. In Cloudflare **Variables and Secrets**, immediately set:
   ```bash
   STARTER_ENABLED="false"
   ```
2. Redeploy the Worker.
3. Effects of rollback:
   - Any new `/api/create-order` requests with `{ tier: "starter" }` from non-tester users fail immediately with HTTP 403 `{"error": "Starter coming soon"}`.
   - The client UI switches `#starter-buy-btn` to disabled with label **Coming soon** / **விரைவில் வரும்**.
   - Users who already purchased Starter retain their active access until their 30-day `expiresAt` timestamp without interruption.
   - One-time payment (₹499) purchases and existing entitlements remain 100% operational and unaffected.
