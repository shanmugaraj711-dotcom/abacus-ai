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
    return jsonResponse({users:[{localId:"user-1",email:"user@example.com"}]});
  }
  if(url === "https://oauth2.googleapis.com/token") return jsonResponse({access_token:"mock-google-token"});

  if(url.includes("/databases/(default)/documents/")){
    const base = url.split("/documents/")[1];
    const parts = base.split("/").map(decodeURIComponent);
    const collection = parts[0], id = parts[1];
    if(method === "GET"){
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

async function req(path,method="GET",body=null){
  const headers={"Authorization":"Bearer test-id-token"};
  if(body!==null)headers["Content-Type"]="application/json";
  return main(new Request("https://app.test"+path,{method,headers,body:body===null?undefined:JSON.stringify(body)}),env);
}
function signature(orderId,paymentId){
  return createHmac("sha256",env.RAZORPAY_KEY_SECRET).update(orderId+"|"+paymentId).digest("hex");
}

try {
  assert.equal(normalizeCouponCode("  earlybird "), "EARLYBIRD");
  assert.deepEqual(couponFinalPrice({discountType:"flat",discountValue:100}),{basePrice:499,discountApplied:100,finalPrice:399});
  assert.deepEqual(couponFinalPrice({discountType:"percent",discountValue:20}),{basePrice:499,discountApplied:99,finalPrice:400});
  assert.throws(()=>couponFinalPrice({discountType:"flat",discountValue:499}),/positive payable/);
  assert.throws(()=>validateCouponDoc(doc({code:fs("BAD"),discountType:fs("flat"),discountValue:fs(100),active:{booleanValue:false},redemptionCount:fs(0),maxRedemptions:{nullValue:null}})),/inactive/);

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

  console.log("Coupon/payment tests: PASS");
} finally {
  globalThis.fetch=originalFetch;
}
