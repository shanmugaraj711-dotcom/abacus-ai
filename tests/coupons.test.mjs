import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { main, couponFinalPrice, normalizeCouponCode, validateCouponDoc } from "../worker.js";

const db = { coupons: {}, orders: {}, entitlements: {} };
let razorOrders = {};
let razorPayments = {};
let nextOrder = 1;

const env = {
  FIREBASE_API_KEY: "test-key",
  FIREBASE_PROJECT_ID: "test-project",
  RAZORPAY_KEY_ID: "rzp_test",
  RAZORPAY_KEY_SECRET: "secret",
  RAZORPAY_WEBHOOK_SECRET: "webhook-secret",
  OWNER_UID: "owner-uid",
  _googleToken: "mock-google-token",
};

function fs(v){
  if(v === null || v === undefined) return { nullValue: null };
  if(typeof v === "boolean") return { booleanValue:v };
  if(typeof v === "number") return { integerValue:String(v) };
  return { stringValue:String(v) };
}
function doc(fields, updateTime="2026-09-27T00:00:00.000Z"){ return { fields, updateTime }; }

db.coupons.EARLYBIRD = doc({
  code: fs("EARLYBIRD"), discountType: fs("flat"), discountValue: fs(100),
  basePrice: fs(499), finalPrice: fs(399), active: {booleanValue:true},
  maxRedemptions: {nullValue:null}, redemptionCount: fs(0),
});

function jsonResponse(data,status=200){ return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json"}}); }

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init={}) => {
  const url = typeof input === "string" ? input : input.url;
  const method = init.method || (typeof input !== "string" ? input.method : "GET");

  if(url.startsWith("https://identitytoolkit.googleapis.com/")){
    let uid = "user-1";
    if (init.body) {
      try {
        const parsed = JSON.parse(init.body);
        if (parsed.idToken === "owner-id-token") uid = "owner-uid";
        else if (typeof parsed.idToken === "string" && parsed.idToken.startsWith("uid:")) uid = parsed.idToken.slice(4);
      } catch {}
    }
    return jsonResponse({users:[{localId:uid,email:uid+"@example.com"}]});
  }
  if(url === "https://oauth2.googleapis.com/token") return jsonResponse({access_token:"mock-google-token"});

  if(url.includes("/databases/(default)/documents/")){
    const base = url.split("/documents/")[1];
    const pathPart = base.split("?")[0];
    const parts = pathPart.split("/").map(decodeURIComponent);
    const collection = parts[0], id = parts[1];
    if(method === "GET"){
      if(!id){
        const docs = Object.entries(db[collection] || {}).map(([docId, d]) => ({
          name: "projects/test/databases/(default)/documents/" + collection + "/" + docId,
          ...d
        }));
        return jsonResponse({ documents: docs });
      }
      const d = db[collection]?.[id];
      return d ? jsonResponse({name:"projects/test/databases/(default)/documents/"+collection+"/"+id,...d}) : jsonResponse({error:"missing"},404);
    }
    if(method === "PATCH"){
      const body=JSON.parse(init.body);
      const existing=db[collection]?.[id];
      if(body.currentDocument?.updateTime && existing?.updateTime !== body.currentDocument.updateTime) return jsonResponse({error:"precondition"},409);
      if(!db[collection]) db[collection]={};
      const fields=body.fields||{};
      const current=existing?.fields||{};
      db[collection][id]={fields:{...current,...fields},updateTime:new Date(Date.now()+1).toISOString()};
      return jsonResponse({name:"projects/test/databases/(default)/documents/"+collection+"/"+id,...db[collection][id]});
    }
  }

  if(url === "https://api.razorpay.com/v1/orders" && method === "POST"){
    const body=JSON.parse(init.body);
    const id="order-"+nextOrder++;
    razorOrders[id]={id,amount:body.amount,currency:body.currency,notes:body.notes};
    return jsonResponse(razorOrders[id]);
  }
  const orderMatch=url.match(/https:\/\/api\.razorpay\.com\/v1\/orders\/(.+)$/);
  if(orderMatch && method === "GET") return jsonResponse(razorOrders[decodeURIComponent(orderMatch[1])]||{}, razorOrders[decodeURIComponent(orderMatch[1])] ? 200 : 404);
  const paymentMatch=url.match(/https:\/\/api\.razorpay\.com\/v1\/payments\/(.+)$/);
  if(paymentMatch && method === "GET") return jsonResponse(razorPayments[decodeURIComponent(paymentMatch[1])]||{}, razorPayments[decodeURIComponent(paymentMatch[1])] ? 200 : 404);

  return jsonResponse({error:"unmocked "+method+" "+url},500);
};

async function req(path,method="GET",body=null,token="test-id-token"){
  const headers={};
  if(token) headers["Authorization"]="Bearer "+token;
  if(body!==null)headers["Content-Type"]="application/json";
  return main(new Request("https://app.test"+path,{method,headers,body:body===null?undefined:JSON.stringify(body)}),env);
}

function webhookReq(payload, secret=env.RAZORPAY_WEBHOOK_SECRET){
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
  const sig = createHmac("sha256", secret).update(raw).digest("hex");
  return main(new Request("https://app.test/api/razorpay-webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": sig,
    },
    body: raw,
  }), env);
}

function signature(orderId,paymentId){
  return createHmac("sha256",env.RAZORPAY_KEY_SECRET).update(orderId+"|"+paymentId).digest("hex");
}

try {
  // ── 1. Unit & helper tests ──
  assert.equal(normalizeCouponCode("  earlybird "), "EARLYBIRD");
  assert.deepEqual(couponFinalPrice({discountType:"flat",discountValue:100}),{basePrice:499,discountApplied:100,finalPrice:399});
  assert.deepEqual(couponFinalPrice({discountType:"percent",discountValue:20}),{basePrice:499,discountApplied:99,finalPrice:400});
  assert.throws(()=>couponFinalPrice({discountType:"flat",discountValue:499}),/positive payable/);
  assert.throws(()=>validateCouponDoc(doc({code:fs("BAD"),discountType:fs("flat"),discountValue:fs(100),active:{booleanValue:false},redemptionCount:fs(0),maxRedemptions:{nullValue:null}})),/inactive/);

  // ── 2. Validation & order creation ──
  const preview=await req("/api/validate-coupon","POST",{couponCode:" earlybird "});
  assert.equal(preview.status,200);
  const previewData=await preview.json();
  assert.deepEqual({basePrice:previewData.basePrice,discountApplied:previewData.discountApplied,finalPrice:previewData.finalPrice},{basePrice:499,discountApplied:100,finalPrice:399});
  const badPreview=await req("/api/validate-coupon","POST",{couponCode:"NOPE"});
  assert.equal(badPreview.status,400);

  const noCoupon=await req("/api/create-order","POST",{amount:1});
  assert.equal(noCoupon.status,200);
  const noCouponData=await noCoupon.json();
  assert.equal(noCouponData.amount,49900,"no coupon must remain ₹499");
  assert.equal(razorOrders[noCouponData.orderId].amount,49900,"Razorpay order must be ₹499");
  assert.equal(db.orders[noCouponData.orderId].fields.amount.integerValue,"49900");

  const discounted=await req("/api/create-order","POST",{amount:1,couponCode:" earlybird "});
  assert.equal(discounted.status,200);
  const discountedData=await discounted.json();
  assert.equal(discountedData.amount,39900,"EARLYBIRD must make ₹499 become ₹399");
  assert.equal(razorOrders[discountedData.orderId].amount,39900,"Razorpay must receive the server-computed ₹399");
  assert.equal(db.orders[discountedData.orderId].fields.couponCode.stringValue,"EARLYBIRD");
  assert.equal(db.orders[discountedData.orderId].fields.amount.integerValue,"39900");

  const invalid=await req("/api/create-order","POST",{couponCode:"NOTREAL"});
  assert.equal(invalid.status,400,"unknown coupon must be rejected");

  // ── 3. Payment verification & tampered amount rejection ──
  razorPayments.pay1={id:"pay1",order_id:discountedData.orderId,status:"captured",amount:39900,currency:"INR"};
  const verified=await main(new Request("https://app.test/api/verify-payment",{method:"POST",headers:{"Authorization":"Bearer test-id-token","Content-Type":"application/json"},body:JSON.stringify({razorpay_order_id:discountedData.orderId,razorpay_payment_id:"pay1",razorpay_signature:signature(discountedData.orderId,"pay1")})}),env);
  assert.equal(verified.status,200);
  assert.equal((await verified.json()).paid,true);
  assert.equal(db.entitlements["user-1"].fields.paid.booleanValue,true);
  assert.equal(db.orders[discountedData.orderId].fields.status.stringValue,"paid");
  assert.equal(db.coupons.EARLYBIRD.fields.redemptionCount.integerValue,"1");

  delete db.entitlements["user-1"];
  const mismatchOrder=await req("/api/create-order","POST",{couponCode:"EARLYBIRD"});
  const mismatchData=await mismatchOrder.json();
  razorPayments.pay2={id:"pay2",order_id:mismatchData.orderId,status:"captured",amount:39800,currency:"INR"};
  const mismatch=await main(new Request("https://app.test/api/verify-payment",{method:"POST",headers:{"Authorization":"Bearer test-id-token","Content-Type":"application/json"},body:JSON.stringify({razorpay_order_id:mismatchData.orderId,razorpay_payment_id:"pay2",razorpay_signature:signature(mismatchData.orderId,"pay2")})}),env);
  assert.equal(mismatch.status,400,"payment amount different from recorded order must be rejected");

  // ── 4. Missing Test: discounted payment.captured webhook ──
  const discWebhookOrder = await req("/api/create-order", "POST", { couponCode: "EARLYBIRD" }, "uid:user-webhook-disc");
  const discWebhookData = await discWebhookOrder.json();
  assert.equal(discWebhookData.amount, 39900);
  const redBeforeWebhook = Number(db.coupons.EARLYBIRD.fields.redemptionCount.integerValue);

  const webhookRes = await webhookReq({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_webhook_disc",
          order_id: discWebhookData.orderId,
          amount: 39900,
          currency: "INR",
          status: "captured",
          notes: { uid: "user-webhook-disc", product: "abacus-buddy", couponCode: "EARLYBIRD" }
        }
      }
    }
  });
  assert.equal(webhookRes.status, 200, "discounted payment.captured webhook must return 200");
  assert.equal((await webhookRes.json()).ok, true);
  assert.equal(db.entitlements["user-webhook-disc"]?.fields.paid.booleanValue, true, "webhook must grant entitlement");
  assert.equal(db.orders[discWebhookData.orderId].fields.status.stringValue, "paid", "order must be marked paid");
  assert.equal(
    Number(db.coupons.EARLYBIRD.fields.redemptionCount.integerValue),
    redBeforeWebhook + 1,
    "discounted webhook must increment redemptionCount"
  );

  // ── 5. Missing Test: duplicate webhook does not increment redemptionCount twice ──
  const dupWebhookRes = await webhookReq({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_webhook_disc",
          order_id: discWebhookData.orderId,
          amount: 39900,
          currency: "INR",
          status: "captured",
          notes: { uid: "user-webhook-disc", product: "abacus-buddy", couponCode: "EARLYBIRD" }
        }
      }
    }
  });
  assert.equal(dupWebhookRes.status, 200);
  assert.equal((await dupWebhookRes.json()).ok, true);
  assert.equal(
    Number(db.coupons.EARLYBIRD.fields.redemptionCount.integerValue),
    redBeforeWebhook + 1,
    "duplicate webhook must not increment redemptionCount twice"
  );

  // ── 6. Missing Test: verify-payment followed by webhook does not increment twice ──
  const vThenWOrder = await req("/api/create-order", "POST", { couponCode: "EARLYBIRD" }, "uid:user-v-then-w");
  const vThenWData = await vThenWOrder.json();
  razorPayments.pay_v_then_w = { id: "pay_v_then_w", order_id: vThenWData.orderId, status: "captured", amount: 39900, currency: "INR" };
  const redBeforeVThenW = Number(db.coupons.EARLYBIRD.fields.redemptionCount.integerValue);

  const vRes = await req("/api/verify-payment", "POST", {
    razorpay_order_id: vThenWData.orderId,
    razorpay_payment_id: "pay_v_then_w",
    razorpay_signature: signature(vThenWData.orderId, "pay_v_then_w")
  }, "uid:user-v-then-w");
  assert.equal(vRes.status, 200);
  assert.equal(
    Number(db.coupons.EARLYBIRD.fields.redemptionCount.integerValue),
    redBeforeVThenW + 1,
    "verify-payment must increment redemptionCount"
  );

  const wAfterVRes = await webhookReq({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_v_then_w",
          order_id: vThenWData.orderId,
          amount: 39900,
          currency: "INR",
          status: "captured",
          notes: { uid: "user-v-then-w", product: "abacus-buddy", couponCode: "EARLYBIRD" }
        }
      }
    }
  });
  assert.equal(wAfterVRes.status, 200);
  assert.equal((await wAfterVRes.json()).ok, true);
  assert.equal(
    Number(db.coupons.EARLYBIRD.fields.redemptionCount.integerValue),
    redBeforeVThenW + 1,
    "webhook following verify-payment must not increment redemptionCount a second time"
  );

  // ── 7. Missing Test: normal ₹499 webhook regression ──
  const normOrder = await req("/api/create-order", "POST", {}, "uid:user-norm-499");
  const normData = await normOrder.json();
  assert.equal(normData.amount, 49900, "normal order must be 49900 paise");
  const redBeforeNorm = Number(db.coupons.EARLYBIRD.fields.redemptionCount.integerValue);

  const normWebhookRes = await webhookReq({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_norm_499",
          order_id: normData.orderId,
          amount: 49900,
          currency: "INR",
          status: "captured",
          notes: { uid: "user-norm-499", product: "abacus-buddy" }
        }
      }
    }
  });
  assert.equal(normWebhookRes.status, 200, "normal webhook must return 200");
  assert.equal((await normWebhookRes.json()).ok, true);
  assert.equal(db.entitlements["user-norm-499"]?.fields.paid.booleanValue, true, "normal webhook must grant entitlement");
  assert.equal(db.orders[normData.orderId].fields.status.stringValue, "paid", "normal order status must be paid");
  assert.equal(
    Number(db.coupons.EARLYBIRD.fields.redemptionCount.integerValue),
    redBeforeNorm,
    "normal ₹499 webhook must not alter coupon redemptions"
  );

  // ── 8. Missing Test: admin coupon create/read verification ──
  const createAdminRes = await req("/api/admin/coupons", "POST", {
    code: "SUMMER50",
    discountType: "percent",
    discountValue: 50,
    active: true
  }, "owner-id-token");
  assert.equal(createAdminRes.status, 200, "owner can create coupon via admin POST");
  const createAdminData = await createAdminRes.json();
  assert.equal(createAdminData.ok, true);
  assert.equal(createAdminData.coupon.code, "SUMMER50");
  assert.equal(createAdminData.coupon.finalPrice, 250);
  assert.equal(createAdminData.coupon.active, true);

  const listAdminRes = await req("/api/admin/coupons", "GET", null, "owner-id-token");
  assert.equal(listAdminRes.status, 200, "owner can list coupons via admin GET");
  const listAdminData = await listAdminRes.json();
  assert.ok(listAdminData.coupons.some(c => c.code === "SUMMER50"), "admin list must contain newly created coupon");
  assert.ok(listAdminData.coupons.some(c => c.code === "EARLYBIRD"), "admin list must contain existing coupon");

  const nonOwnerGet = await req("/api/admin/coupons", "GET", null, "uid:user-1");
  assert.equal(nonOwnerGet.status, 403, "non-owner must be forbidden from admin coupons GET");
  const nonOwnerPost = await req("/api/admin/coupons", "POST", { code: "HACK", discountType: "flat", discountValue: 10 }, "uid:user-1");
  assert.equal(nonOwnerPost.status, 403, "non-owner must be forbidden from admin coupons POST");
  const unauthGet = await req("/api/admin/coupons", "GET", null, "");
  assert.equal(unauthGet.status, 401, "unauthenticated request to admin coupons must be 401");

  // ── 9. Missing Test: inactive coupon created through admin cannot be redeemed ──
  const createInactiveRes = await req("/api/admin/coupons", "POST", {
    code: "WINTEROFF",
    discountType: "flat",
    discountValue: 150,
    active: false
  }, "owner-id-token");
  assert.equal(createInactiveRes.status, 200);

  const validateInactiveRes = await req("/api/validate-coupon", "POST", { couponCode: "WINTEROFF" }, "uid:user-1");
  assert.equal(validateInactiveRes.status, 400, "validate-coupon must reject inactive coupon");
  const validateInactiveData = await validateInactiveRes.json();
  assert.match(validateInactiveData.error, /inactive/i);

  const orderInactiveRes = await req("/api/create-order", "POST", { couponCode: "WINTEROFF" }, "uid:user-1");
  assert.equal(orderInactiveRes.status, 400, "create-order must reject inactive coupon");
  const orderInactiveData = await orderInactiveRes.json();
  assert.match(orderInactiveData.error, /inactive/i);
  assert.equal(Number(db.coupons.WINTEROFF.fields.redemptionCount.integerValue), 0, "inactive coupon must have 0 redemptions");

  // ── 10. Concurrent created → paid conditional-update simulation ──
  // Simulate two payment finalizations racing against the exact same order document.
  // Both attempts initially read the same 'created' order updateTime.
  // The first CAS update succeeds and marks the order 'paid' and increments the coupon.
  // The second CAS update fails with 409 precondition, detects the order is already 'paid',
  // and safely completes without double-incrementing redemptionCount.
  const concOrder = await req("/api/create-order", "POST", { couponCode: "EARLYBIRD" }, "uid:user-concurrent");
  const concData = await concOrder.json();
  razorPayments.pay_conc = { id: "pay_conc", order_id: concData.orderId, status: "captured", amount: 39900, currency: "INR" };

  const redBeforeConc = Number(db.coupons.EARLYBIRD.fields.redemptionCount.integerValue);

  // Attempt A: verify-payment
  const attemptA = req("/api/verify-payment", "POST", {
    razorpay_order_id: concData.orderId,
    razorpay_payment_id: "pay_conc",
    razorpay_signature: signature(concData.orderId, "pay_conc")
  }, "uid:user-concurrent");

  // Attempt B: concurrent payment.captured webhook for the exact same order
  const attemptB = webhookReq({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_conc",
          order_id: concData.orderId,
          amount: 39900,
          currency: "INR",
          status: "captured",
          notes: { uid: "user-concurrent", product: "abacus-buddy", couponCode: "EARLYBIRD" }
        }
      }
    }
  });

  const [resA, resB] = await Promise.all([attemptA, attemptB]);
  assert.equal(resA.status, 200, "Attempt A must succeed");
  assert.equal(resB.status, 200, "Attempt B must succeed");
  assert.equal(db.entitlements["user-concurrent"]?.fields.paid.booleanValue, true, "Entitlement must be granted");
  assert.equal(db.orders[concData.orderId].fields.status.stringValue, "paid", "Order must be marked paid");
  assert.equal(
    Number(db.coupons.EARLYBIRD.fields.redemptionCount.integerValue),
    redBeforeConc + 1,
    "Concurrent finalizations against the same order must increment redemptionCount exactly once"
  );

  // Also simulate two concurrent verify-payment client calls for another order
  const concOrder2 = await req("/api/create-order", "POST", { couponCode: "EARLYBIRD" }, "uid:user-concurrent-2");
  const concData2 = await concOrder2.json();
  razorPayments.pay_conc2 = { id: "pay_conc2", order_id: concData2.orderId, status: "captured", amount: 39900, currency: "INR" };
  const redBeforeConc2 = Number(db.coupons.EARLYBIRD.fields.redemptionCount.integerValue);

  const vCall1 = req("/api/verify-payment", "POST", {
    razorpay_order_id: concData2.orderId,
    razorpay_payment_id: "pay_conc2",
    razorpay_signature: signature(concData2.orderId, "pay_conc2")
  }, "uid:user-concurrent-2");

  const vCall2 = req("/api/verify-payment", "POST", {
    razorpay_order_id: concData2.orderId,
    razorpay_payment_id: "pay_conc2",
    razorpay_signature: signature(concData2.orderId, "pay_conc2")
  }, "uid:user-concurrent-2");

  const [vRes1, vRes2] = await Promise.all([vCall1, vCall2]);
  assert.equal(vRes1.status, 200, "Racing client verify 1 must succeed");
  assert.equal(vRes2.status, 200, "Racing client verify 2 must succeed");
  assert.equal(
    Number(db.coupons.EARLYBIRD.fields.redemptionCount.integerValue),
    redBeforeConc2 + 1,
    "Racing verify-payment calls must increment redemptionCount only once"
  );

  console.log("Coupon/payment tests: PASS (all 10 test suites + concurrent conditional-update tests passed)");
} finally {
  globalThis.fetch=originalFetch;
}
