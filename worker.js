// Abacus Buddy payment/licensing Worker.
// Required secrets: RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, FIREBASE_SERVICE_ACCOUNT_JSON
// Public vars: RAZORPAY_KEY_ID, FIREBASE_PROJECT_ID, FIREBASE_API_KEY, PRODUCT_PRICE_PAISE=49900

const PRICE_LIFETIME = 49900;
const PRICE_STARTER = 9900;
const PRICE = PRICE_LIFETIME;
const PRODUCT = "abacus-buddy";

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","access-control-allow-origin":"*","access-control-allow-headers":"content-type,authorization","access-control-allow-methods":"GET,POST,OPTIONS"}})}
function b64u(a){return btoa(String.fromCharCode(...new Uint8Array(a))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function ub64(s){s=s.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function sha256(s){return crypto.subtle.digest("SHA-256",new TextEncoder().encode(s))}
async function hmac(secret,msg){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const a=new Uint8Array(await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(msg)));return [...a].map(x=>x.toString(16).padStart(2,"0")).join("")}
function eq(a,b){if(!a||!b||a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
function parseJwt(t){const p=t.split(".");if(p.length!==3)throw Error("invalid token");return {h:JSON.parse(new TextDecoder().decode(ub64(p[0]))),c:JSON.parse(new TextDecoder().decode(ub64(p[1]))),s:p[2]}}
async function firebaseUser(env,token){
  const r=await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key="+encodeURIComponent(env.FIREBASE_API_KEY),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({idToken:token})});
  if(!r.ok)throw Error("invalid Firebase ID token");
  const d=await r.json(), u=d.users?.[0]; if(!u?.localId)throw Error("invalid Firebase user");
  return {uid:u.localId,phone:u.phoneNumber||""};
}
async function bearer(req,env){const h=req.headers.get("authorization")||"";if(!h.startsWith("Bearer "))throw Error("missing authorization");return firebaseUser(env,h.slice(7))}
async function sa(env){return JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON)}
async function googleToken(env){
  const s=await sa(env), now=Math.floor(Date.now()/1000);
  const head=b64u(new TextEncoder().encode(JSON.stringify({alg:"RS256",typ:"JWT"})));
  const claim=b64u(new TextEncoder().encode(JSON.stringify({iss:s.client_email,scope:"https://www.googleapis.com/auth/datastore",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600})));
  const key=await crypto.subtle.importKey("pkcs8",ub64(s.private_key.replace("-----BEGIN PRIVATE KEY-----","").replace("-----END PRIVATE KEY-----","").replace(/\s/g,"")),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
  const sig=b64u(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(head+"."+claim)));
  const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:"grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion="+head+"."+claim+"."+sig});
  if(!r.ok)throw Error("Firebase service authentication failed");
  return (await r.json()).access_token;
}
async function firestoreGet(env,uid){
  const tok=await googleToken(env), p=env.FIREBASE_PROJECT_ID||"abacus-buddy";
  const r=await fetch(`https://firestore.googleapis.com/v1/projects/${p}/databases/(default)/documents/entitlements/${encodeURIComponent(uid)}`,{headers:{authorization:"Bearer "+tok}});
  if(r.status===404)return null;if(!r.ok)throw Error("Firestore read failed");const d=await r.json();
  if(d.fields?.paid?.booleanValue!==true)return null;

  const rawTier = d.fields.tier?.stringValue;
  const rawMaxLevel = d.fields.maxLevel?.integerValue ? Number(d.fields.maxLevel.integerValue) : null;
  const rawExpiresAt = d.fields.expiresAt?.stringValue || null;
  const rawGameLimit = d.fields.gameLimit?.integerValue ? Number(d.fields.gameLimit.integerValue) : null;
  const orderId = d.fields.orderId?.stringValue || null;
  const paymentId = d.fields.paymentId?.stringValue || null;
  const paidAt = d.fields.paidAt?.stringValue || null;

  // Legacy record (paid: true without explicit tier or tier: "lifetime")
  if(!rawTier || rawTier === "lifetime") {
    return {
      paid: true,
      tier: "lifetime",
      maxLevel: 15,
      expiresAt: null,
      gameLimit: null,
      orderId,
      paymentId,
      paidAt
    };
  }

  // Starter tier
  if(rawTier === "starter") {
    const isExpired = rawExpiresAt ? (Date.parse(rawExpiresAt) <= Date.now()) : false;
    if(isExpired) {
      return {
        paid: false,
        tier: "free",
        maxLevel: 1,
        expiresAt: rawExpiresAt,
        gameLimit: 1,
        expired: true,
        orderId,
        paymentId,
        paidAt
      };
    }
    return {
      paid: true,
      tier: "starter",
      maxLevel: rawMaxLevel || 3,
      expiresAt: rawExpiresAt,
      gameLimit: rawGameLimit || 3,
      expired: false,
      orderId,
      paymentId,
      paidAt
    };
  }

  return {
    paid: false,
    tier: "free",
    maxLevel: 1,
    expiresAt: null,
    gameLimit: 1
  };
}
async function firestorePut(env,uid,data){
  const tok=await googleToken(env), p=env.FIREBASE_PROJECT_ID||"abacus-buddy";
  const tier = data.tier || "lifetime";
  const fields={
    paid:{booleanValue:true},
    product:{stringValue:PRODUCT},
    tier:{stringValue:tier},
    maxLevel:{integerValue:String(data.maxLevel ?? (tier === "starter" ? 3 : 15))},
    orderId:{stringValue:String(data.orderId||"")},
    paymentId:{stringValue:String(data.paymentId||"")},
    paidAt:{stringValue:data.paidAt || new Date().toISOString()}
  };
  if(data.expiresAt) fields.expiresAt={stringValue:String(data.expiresAt)};
  else fields.expiresAt={nullValue:null};

  if(data.gameLimit!=null) fields.gameLimit={integerValue:String(data.gameLimit)};
  else fields.gameLimit={nullValue:null};

  const r=await fetch(`https://firestore.googleapis.com/v1/projects/${p}/databases/(default)/documents/entitlements/${encodeURIComponent(uid)}`,{method:"PATCH",headers:{authorization:"Bearer "+tok,"content-type":"application/json"},body:JSON.stringify({fields})});
  if(!r.ok)throw Error("Firestore write failed");
  return true;
}
async function razor(env,path,opts={}){
  const keyId=String(env.RAZORPAY_KEY_ID||"").trim(), keySecret=String(env.RAZORPAY_KEY_SECRET||"").trim();
  const auth=btoa(keyId+":"+keySecret);
  const r=await fetch("https://api.razorpay.com/v1"+path,{...opts,headers:{authorization:"Basic "+auth,"content-type":"application/json",...(opts.headers||{})}});
  const d=await r.json();if(!r.ok)throw Error(d.error?.description||"Razorpay request failed");return d;
}
async function main(req,env){
  if(req.method==="OPTIONS")return json({});
  const u=new URL(req.url), path=u.pathname;
  if(path==="/api/create-order"&&req.method==="POST"){
    const user=await bearer(req,env), existing=await firestoreGet(env,user.uid);
    let body = {};
    try { body = await req.json(); } catch {}
    const requestedTier = body.tier || "lifetime";
    if(requestedTier !== "starter" && requestedTier !== "lifetime") {
      return json({error:"Invalid tier"},400);
    }
    if(existing?.paid) {
      if(existing.tier === "lifetime") return json({paid:true,tier:"lifetime"});
      if(existing.tier === "starter" && requestedTier === "starter") return json({paid:true,tier:"starter"});
    }
    const amount = requestedTier === "starter" ? PRICE_STARTER : PRICE_LIFETIME;
    const order=await razor(env,"/orders",{method:"POST",body:JSON.stringify({amount,currency:"INR",receipt:"abacus_"+user.uid+"_"+Date.now(),notes:{uid:user.uid,product:PRODUCT,tier:requestedTier}})});
    return json({orderId:order.id,amount,currency:"INR",keyId:env.RAZORPAY_KEY_ID,tier:requestedTier});
  }
  if(path==="/api/verify-payment"&&req.method==="POST"){
    const user=await bearer(req,env), b=await req.json(), payload=String(b.razorpay_order_id)+"|"+String(b.razorpay_payment_id);
    const keySecret=String(env.RAZORPAY_KEY_SECRET||"").trim();
    const sig=(await hmac(keySecret,payload)).toLowerCase(), gotSig=String(b.razorpay_signature||"").trim().toLowerCase();if(!eq(sig,gotSig))return json({error:"Invalid payment signature"},400);
    const order=await razor(env,"/orders/"+encodeURIComponent(b.razorpay_order_id));
    if(order.currency!=="INR"||order.notes?.uid!==user.uid||order.notes?.product!==PRODUCT)return json({error:"Order validation failed"},400);

    const orderTier = order.notes?.tier || (Number(order.amount) === PRICE_STARTER ? "starter" : "lifetime");
    if(orderTier === "starter") {
      if(Number(order.amount) !== PRICE_STARTER) return json({error:"Order validation failed"},400);
    } else if(orderTier === "lifetime") {
      if(Number(order.amount) !== PRICE_LIFETIME) return json({error:"Order validation failed"},400);
    } else {
      return json({error:"Order validation failed"},400);
    }

    const payment=await razor(env,"/payments/"+encodeURIComponent(b.razorpay_payment_id));
    if(payment.order_id!==b.razorpay_order_id||payment.status!=="captured"||Number(payment.amount)!==Number(order.amount)||payment.currency!=="INR")return json({error:"Payment is not captured or does not match the order"},400);

    let maxLevel = 15, gameLimit = null, expiresAt = null;
    if(orderTier === "starter") {
      maxLevel = 3;
      gameLimit = 3;
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    await firestorePut(env,user.uid,{tier:orderTier,maxLevel,expiresAt,gameLimit,orderId:b.razorpay_order_id,paymentId:b.razorpay_payment_id});
    return json({paid:true,tier:orderTier,maxLevel,expiresAt,gameLimit});
  }
  if(path==="/api/user-status"&&req.method==="GET"){
    const user=await bearer(req,env);
    const ent=await firestoreGet(env,user.uid);
    if(ent) return json(ent);
    return json({paid:false,tier:"free",maxLevel:1,expiresAt:null,gameLimit:1});
  }
  if(path==="/api/razorpay-webhook"&&req.method==="POST"){
    const raw=await req.text(), got=String(req.headers.get("x-razorpay-signature")||"").trim().toLowerCase();
    const sec=String(env.RAZORPAY_WEBHOOK_SECRET||"").trim();
    const want=(await hmac(sec,raw)).toLowerCase();
    if(!sec||!eq(got,want))return json({error:"Invalid webhook signature"},400);
    const e=JSON.parse(raw), p=e.payload?.payment?.entity, o=e.payload?.order?.entity, pay=p||null, ord=o||null;
    if(e.event==="payment.captured"||e.event==="order.paid"){
      const amount=Number(pay?.amount??ord?.amount),currency=pay?.currency??ord?.currency,uid=pay?.notes?.uid??ord?.notes?.uid,product=pay?.notes?.product??ord?.notes?.product,tier=pay?.notes?.tier??ord?.notes?.tier;
      if(currency==="INR"&&uid&&product===PRODUCT){
        if(amount===PRICE_STARTER && (!tier || tier === "starter")) {
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          await firestorePut(env,uid,{tier:"starter",maxLevel:3,gameLimit:3,expiresAt,orderId:pay?.order_id||ord?.id,paymentId:pay?.id||""});
        } else if(amount===PRICE_LIFETIME && (!tier || tier === "lifetime")) {
          await firestorePut(env,uid,{tier:"lifetime",maxLevel:15,gameLimit:null,expiresAt:null,orderId:pay?.order_id||ord?.id,paymentId:pay?.id||""});
        }
      }
    }
    return json({ok:true});
  }
  return json({error:"Not found"},404);
}
export { main, firestoreGet, firestorePut, PRICE_LIFETIME, PRICE_STARTER, PRODUCT, hmac, eq };
export default {fetch(req,env){return main(req,env).catch(e=>json({error:e.message||"Server error"},500))}};
