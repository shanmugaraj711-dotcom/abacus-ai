// Abacus Buddy payment/licensing Worker.
// Required secrets: RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, FIREBASE_SERVICE_ACCOUNT_JSON, OWNER_UID
// Public vars: RAZORPAY_KEY_ID, FIREBASE_PROJECT_ID, FIREBASE_API_KEY, PRODUCT_PRICE_PAISE=49900
//
// Endpoints:
//   POST /api/create-order        — authenticated user: create Razorpay order (idempotent: returns {paid:true} if already paid)
//   POST /api/verify-payment      — authenticated user: verify + record payment (idempotent)
//   GET  /api/user-status         — authenticated user: check entitlement
//   POST /api/razorpay-webhook    — Razorpay webhook (signature-verified)
//   GET  /api/remote-config       — public: fetch deployed remote config
//   GET  /api/admin/users         — OWNER ONLY: list users from Firestore
//   GET  /api/admin/payments      — OWNER ONLY: list payments / entitlements
//   GET  /api/admin/entitlements  — OWNER ONLY: list entitlements
//   GET  /api/admin/audit-log     — OWNER ONLY: list audit log entries
//   POST /api/admin/remote-config — OWNER ONLY: update remote config in Firestore
//   GET  /api/admin/rewards-config — OWNER ONLY: get rewards config
//   POST /api/admin/rewards-config — OWNER ONLY: update rewards config
// Coupon foundation: scaffolded but disabled. DO NOT enable without explicit owner decision.

const PRICE = 49900; // ₹499 in paise
const PRODUCT = "abacus-buddy";
const COUPONS_ENABLED = false; // INTENTIONALLY OFF — do not enable without owner decision

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","access-control-allow-origin":"*","access-control-allow-headers":"content-type,authorization","access-control-allow-methods":"GET,POST,OPTIONS"}})}
function b64u(a){return btoa(String.fromCharCode(...new Uint8Array(a))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function ub64(s){s=s.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function hmac(secret,msg){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const a=new Uint8Array(await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(msg)));return [...a].map(x=>x.toString(16).padStart(2,"0")).join("")}
function eq(a,b){if(!a||!b||a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
function ub64url(s){s=s.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}

async function firebaseUser(env,token){
  const r=await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key="+encodeURIComponent(env.FIREBASE_API_KEY),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({idToken:token})});
  if(!r.ok)throw Error("invalid Firebase ID token");
  const d=await r.json(), u=d.users?.[0]; if(!u?.localId)throw Error("invalid Firebase user");
  return {uid:u.localId,phone:u.phoneNumber||"",email:u.email||""};
}
async function bearer(req,env){const h=req.headers.get("authorization")||"";if(!h.startsWith("Bearer "))throw Error("missing authorization");return firebaseUser(env,h.slice(7))}

// Owner-only guard — only the single Firebase UID stored in OWNER_UID secret may call admin endpoints.
async function ownerBearer(req,env){
  const user=await bearer(req,env);
  const ownerUid=String(env.OWNER_UID||"").trim();
  if(!ownerUid)throw Error("OWNER_UID not configured");
  if(user.uid!==ownerUid)throw Error("Forbidden: owner access only");
  return user;
}

async function sa(env){return JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON)}
async function googleToken(env){
  const s=await sa(env), now=Math.floor(Date.now()/1000);
  const head=b64u(new TextEncoder().encode(JSON.stringify({alg:"RS256",typ:"JWT"})));
  const claim=b64u(new TextEncoder().encode(JSON.stringify({iss:s.client_email,scope:"https://www.googleapis.com/auth/datastore",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600})));
  const key=await crypto.subtle.importKey("pkcs8",ub64url(s.private_key.replace("-----BEGIN PRIVATE KEY-----","").replace("-----END PRIVATE KEY-----","").replace(/\s/g,"")),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
  const sig=b64u(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(head+"."+claim)));
  const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:"grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion="+head+"."+claim+"."+sig});
  if(!r.ok)throw Error("Firebase service authentication failed");
  return (await r.json()).access_token;
}

const FSBase=(env)=>`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID||"abacus-buddy"}/databases/(default)/documents`;

async function firestoreGet(env,collection,docId){
  const tok=await googleToken(env);
  const r=await fetch(`${FSBase(env)}/${collection}/${encodeURIComponent(docId)}`,{headers:{authorization:"Bearer "+tok}});
  if(r.status===404)return null;if(!r.ok)throw Error(`Firestore read failed: ${r.status}`);
  return await r.json();
}
async function firestorePatch(env,collection,docId,fields){
  const tok=await googleToken(env);
  const r=await fetch(`${FSBase(env)}/${collection}/${encodeURIComponent(docId)}`,{method:"PATCH",headers:{authorization:"Bearer "+tok,"content-type":"application/json"},body:JSON.stringify({fields})});
  if(!r.ok)throw Error(`Firestore write failed: ${r.status}`);
  return await r.json();
}
async function firestoreList(env,collection,pageSize=50){
  const tok=await googleToken(env);
  const r=await fetch(`${FSBase(env)}/${collection}?pageSize=${pageSize}`,{headers:{authorization:"Bearer "+tok}});
  if(!r.ok)throw Error(`Firestore list failed: ${r.status}`);
  const d=await r.json();
  return d.documents||[];
}

function fsField(v){
  if(v===null||v===undefined)return{nullValue:null};
  if(typeof v==="boolean")return{booleanValue:v};
  if(typeof v==="number")return{integerValue:String(v)};
  return{stringValue:String(v)};
}
function fsVal(f){
  if(!f)return null;
  if("booleanValue"in f)return f.booleanValue;
  if("stringValue"in f)return f.stringValue;
  if("integerValue"in f)return Number(f.integerValue);
  if("doubleValue"in f)return f.doubleValue;
  if("nullValue"in f)return null;
  if("mapValue"in f)return Object.fromEntries(Object.entries(f.mapValue.fields||{}).map(([k,v])=>[k,fsVal(v)]));
  return null;
}

async function getEntitlement(env,uid){
  const doc=await firestoreGet(env,"entitlements",uid);
  if(!doc)return null;
  const f=doc.fields||{};
  return f?.paid?.booleanValue===true?{paid:true,orderId:fsVal(f.orderId),paidAt:fsVal(f.paidAt),paymentId:fsVal(f.paymentId)}:null;
}

async function putEntitlement(env,uid,data){
  const fields={
    paid:fsField(true),product:fsField(PRODUCT),
    orderId:fsField(data.orderId||""),paymentId:fsField(data.paymentId||""),
    paidAt:fsField(new Date().toISOString()),uid:fsField(uid),
  };
  await firestorePatch(env,"entitlements",uid,fields);
  return true;
}

async function writeAuditLog(env,event,data){
  try{
    const id=`${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const fields={event:fsField(event),at:fsField(new Date().toISOString()),...Object.fromEntries(Object.entries(data).map(([k,v])=>[k,fsField(v)]))};
    await firestorePatch(env,"audit_log",id,fields);
  }catch(e){console.error("[audit] write failed:",e.message);}
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

  // ── /api/remote-config (public) ─────────────────────────────────────────────
  if(path==="/api/remote-config"&&req.method==="GET"){
    try{
      const doc=await firestoreGet(env,"_config","remote");
      if(!doc||!doc.fields)return json({});
      const cfg=fsVal({mapValue:{fields:doc.fields}});
      return json(cfg||{});
    }catch(e){return json({error:e.message},500);}
  }

  // ── /api/create-order ──────────────────────────────────────────────────────
  if(path==="/api/create-order"&&req.method==="POST"){
    const user=await bearer(req,env);
    const existing=await getEntitlement(env,user.uid);
    if(existing?.paid){await writeAuditLog(env,"create_order_already_paid",{uid:user.uid});return json({paid:true});}
    const order=await razor(env,"/orders",{method:"POST",body:JSON.stringify({amount:PRICE,currency:"INR",receipt:"abacus_"+user.uid+"_"+Date.now(),notes:{uid:user.uid,product:PRODUCT}})});
    await writeAuditLog(env,"order_created",{uid:user.uid,orderId:order.id,amount:PRICE});
    return json({orderId:order.id,amount:PRICE,currency:"INR",keyId:env.RAZORPAY_KEY_ID});
  }

  // ── /api/verify-payment ────────────────────────────────────────────────────
  if(path==="/api/verify-payment"&&req.method==="POST"){
    const user=await bearer(req,env), b=await req.json();
    // Idempotency: if already paid, return success without re-writing
    const existing=await getEntitlement(env,user.uid);
    if(existing?.paid){return json({paid:true});}
    const payload=String(b.razorpay_order_id)+"|"+String(b.razorpay_payment_id);
    const keySecret=String(env.RAZORPAY_KEY_SECRET||"").trim();
    const sig=(await hmac(keySecret,payload)).toLowerCase(), gotSig=String(b.razorpay_signature||"").trim().toLowerCase();
    if(!eq(sig,gotSig)){await writeAuditLog(env,"payment_sig_invalid",{uid:user.uid,orderId:b.razorpay_order_id});return json({error:"Invalid payment signature"},400);}
    // Validate order: amount, currency, UID ownership, product
    const order=await razor(env,"/orders/"+encodeURIComponent(b.razorpay_order_id));
    if(Number(order.amount)!==PRICE||order.currency!=="INR"||order.notes?.uid!==user.uid||order.notes?.product!==PRODUCT){
      await writeAuditLog(env,"payment_order_mismatch",{uid:user.uid,orderId:b.razorpay_order_id,orderUid:order.notes?.uid,amount:order.amount});
      return json({error:"Order validation failed"},400);
    }
    // Validate payment: captured, correct amount
    const payment=await razor(env,"/payments/"+encodeURIComponent(b.razorpay_payment_id));
    if(payment.order_id!==b.razorpay_order_id||payment.status!=="captured"||Number(payment.amount)!==PRICE||payment.currency!=="INR"){
      await writeAuditLog(env,"payment_capture_invalid",{uid:user.uid,paymentId:b.razorpay_payment_id,status:payment.status});
      return json({error:"Payment is not captured or does not match the order"},400);
    }
    await putEntitlement(env,user.uid,{orderId:b.razorpay_order_id,paymentId:b.razorpay_payment_id});
    await writeAuditLog(env,"payment_verified",{uid:user.uid,orderId:b.razorpay_order_id,paymentId:b.razorpay_payment_id,amount:PRICE});
    return json({paid:true});
  }

  // ── /api/user-status ───────────────────────────────────────────────────────
  if(path==="/api/user-status"&&req.method==="GET"){
    const user=await bearer(req,env);
    const ent=await getEntitlement(env,user.uid);
    return json({paid:!!ent,uid:user.uid,paidAt:ent?.paidAt||null});
  }

  // ── /api/razorpay-webhook ─────────────────────────────────────────────────
  if(path==="/api/razorpay-webhook"&&req.method==="POST"){
    const raw=await req.text(), got=String(req.headers.get("x-razorpay-signature")||"").trim().toLowerCase();
    const sec=String(env.RAZORPAY_WEBHOOK_SECRET||"").trim();
    const want=(await hmac(sec,raw)).toLowerCase();
    if(!sec||!eq(got,want)){return json({error:"Invalid webhook signature"},400);}
    const e=JSON.parse(raw), p=e.payload?.payment?.entity, o=e.payload?.order?.entity, pay=p||null, ord=o||null;
    if(e.event==="payment.captured"||e.event==="order.paid"){
      const amount=Number(pay?.amount??ord?.amount),currency=pay?.currency??ord?.currency,uid=pay?.notes?.uid??ord?.notes?.uid,product=pay?.notes?.product??ord?.notes?.product;
      if(amount===PRICE&&currency==="INR"&&uid&&product===PRODUCT){
        // Idempotency: only write if not already recorded
        const existing=await getEntitlement(env,uid);
        if(!existing?.paid){
          await putEntitlement(env,uid,{orderId:pay?.order_id||ord?.id,paymentId:pay?.id||""});
          await writeAuditLog(env,"webhook_payment_recorded",{uid,orderId:pay?.order_id||ord?.id,event:e.event,amount});
        }
      }
    }
    return json({ok:true});
  }

  // ── ADMIN ENDPOINTS (owner UID only) ───────────────────────────────────────
  if(path.startsWith("/api/admin/")){
    let user;
    try{user=await ownerBearer(req,env);}
    catch(e){return json({error:e.message},e.message.includes("Forbidden")?403:401);}

    // GET /api/admin/users — list Firestore entitlements collection (one doc per user)
    if(path==="/api/admin/users"&&req.method==="GET"){
      const docs=await firestoreList(env,"entitlements");
      const users=docs.map(d=>{
        const f=d.fields||{};
        return{uid:fsVal(f.uid)||d.name.split("/").pop(),paid:f.paid?.booleanValue===true,paidAt:fsVal(f.paidAt)||null,orderId:fsVal(f.orderId)||null};
      });
      return json({users,total:users.length});
    }

    // GET /api/admin/payments — alias of users (payment records)
    if(path==="/api/admin/payments"&&req.method==="GET"){
      const docs=await firestoreList(env,"entitlements");
      const payments=docs.filter(d=>d.fields?.paid?.booleanValue===true).map(d=>{
        const f=d.fields||{};
        return{uid:fsVal(f.uid)||d.name.split("/").pop(),paid:true,orderId:fsVal(f.orderId)||null,paymentId:fsVal(f.paymentId)||null,paidAt:fsVal(f.paidAt)||null,product:fsVal(f.product)||null};
      });
      return json({payments,total:payments.length});
    }

    // GET /api/admin/entitlements — same as payments but includes unpaid users
    if(path==="/api/admin/entitlements"&&req.method==="GET"){
      const docs=await firestoreList(env,"entitlements");
      const ents=docs.map(d=>{
        const f=d.fields||{};
        return{uid:fsVal(f.uid)||d.name.split("/").pop(),paid:f.paid?.booleanValue===true,paidAt:fsVal(f.paidAt)||null,product:fsVal(f.product)||null};
      });
      return json({entitlements:ents,total:ents.length});
    }

    // GET /api/admin/audit-log — list audit log entries
    if(path==="/api/admin/audit-log"&&req.method==="GET"){
      const docs=await firestoreList(env,"audit_log",100);
      const entries=docs.map(d=>{
        const f=d.fields||{};
        return Object.fromEntries(Object.entries(f).map(([k,v])=>[k,fsVal(v)]));
      }).sort((a,b)=>b.at?.localeCompare(a.at||""));
      return json({entries,total:entries.length});
    }

    // GET /api/admin/remote-config — read current remote config
    if(path==="/api/admin/remote-config"&&req.method==="GET"){
      try{
        const doc=await firestoreGet(env,"_config","remote");
        if(!doc||!doc.fields)return json({config:{}});
        return json({config:fsVal({mapValue:{fields:doc.fields}})||{}});
      }catch(e){return json({error:e.message},500);}
    }

    // POST /api/admin/remote-config — push new remote config
    if(path==="/api/admin/remote-config"&&req.method==="POST"){
      const body=await req.json();
      // Store as a JSON string in Firestore for simplicity (avoids deep map translation)
      const fields={configJson:fsField(JSON.stringify(body)),updatedAt:fsField(new Date().toISOString()),updatedBy:fsField(user.uid)};
      await firestorePatch(env,"_config","remote",fields);
      await writeAuditLog(env,"remote_config_updated",{uid:user.uid});
      return json({ok:true});
    }

    // GET /api/admin/rewards-config — read rewards config
    if(path==="/api/admin/rewards-config"&&req.method==="GET"){
      try{
        const doc=await firestoreGet(env,"_config","rewards");
        if(!doc||!doc.fields)return json({rewards:{}});
        return json({rewards:fsVal({mapValue:{fields:doc.fields}})||{}});
      }catch(e){return json({error:e.message},500);}
    }

    // POST /api/admin/rewards-config — update rewards config
    if(path==="/api/admin/rewards-config"&&req.method==="POST"){
      const body=await req.json();
      const fields={configJson:fsField(JSON.stringify(body)),updatedAt:fsField(new Date().toISOString()),updatedBy:fsField(user.uid)};
      await firestorePatch(env,"_config","rewards",fields);
      await writeAuditLog(env,"rewards_config_updated",{uid:user.uid});
      return json({ok:true});
    }

    return json({error:"Admin endpoint not found"},404);
  }

  // ── Coupon foundation (DISABLED) ───────────────────────────────────────────
  // Coupon endpoints are intentionally not routed until explicitly enabled.
  // COUPONS_ENABLED = false. Do not add coupon routing without owner decision.

  return json({error:"Not found"},404);
}

export default {fetch(req,env){return main(req,env).catch(e=>json({error:e.message||"Server error"},500))}};
