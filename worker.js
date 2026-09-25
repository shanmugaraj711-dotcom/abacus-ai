// Abacus Buddy payment/licensing Worker.
// Required secrets: RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, FIREBASE_SERVICE_ACCOUNT_JSON, OWNER_UID
// Public vars: RAZORPAY_KEY_ID, FIREBASE_PROJECT_ID, FIREBASE_API_KEY, PRODUCT_PRICE_PAISE=49900
//
// Authorization model:
//   - User endpoints: any valid Firebase ID token
//   - Admin endpoints: Firebase ID token whose UID === OWNER_UID secret (single owner, no other admin)
//
// Payment: ₹499 (49900 paise) is fixed in code. It cannot be changed from any admin UI.
//
// Coupon foundation: scaffolded but disabled. COUPONS_ENABLED = false. Do NOT route.

const PRICE = 49900; // ₹499 — fixed, immutable via any admin UI
const PRODUCT = "abacus-buddy";
const COUPONS_ENABLED = false;

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","access-control-allow-origin":"*","access-control-allow-headers":"content-type,authorization","access-control-allow-methods":"GET,POST,OPTIONS"}})}
function b64u(a){return btoa(String.fromCharCode(...new Uint8Array(a))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function ub64(s){s=s.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function hmac(secret,msg){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const a=new Uint8Array(await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(msg)));return [...a].map(x=>x.toString(16).padStart(2,"0")).join("")}
function eq(a,b){if(!a||!b||a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}

async function firebaseUser(env,token){
  const r=await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key="+encodeURIComponent(env.FIREBASE_API_KEY),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({idToken:token})});
  if(!r.ok)throw Error("invalid Firebase ID token");
  const d=await r.json(), u=d.users?.[0]; if(!u?.localId)throw Error("invalid Firebase user");
  return {uid:u.localId,phone:u.phoneNumber||"",email:u.email||""};
}
async function bearer(req,env){const h=req.headers.get("authorization")||"";if(!h.startsWith("Bearer "))throw Error("missing authorization");return firebaseUser(env,h.slice(7))}
async function ownerBearer(req,env){
  const user=await bearer(req,env);
  const ownerUid=String(env.OWNER_UID||env.Owner_UID||"").trim();
  if(!ownerUid)throw Error("OWNER_UID not configured on server");
  if(user.uid!==ownerUid)throw Error("Forbidden: owner access only");
  return user;
}

async function sa(env){return JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON)}
async function googleToken(env){
  const s=await sa(env), now=Math.floor(Date.now()/1000);
  const head=b64u(new TextEncoder().encode(JSON.stringify({alg:"RS256",typ:"JWT"})));
  const claim=b64u(new TextEncoder().encode(JSON.stringify({iss:s.client_email,scope:"https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/identitytoolkit",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600})));
  const key=await crypto.subtle.importKey("pkcs8",ub64(s.private_key.replace("-----BEGIN PRIVATE KEY-----","").replace("-----END PRIVATE KEY-----","").replace(/\s/g,"")),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
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
  const d=await r.json();return d.documents||[];
}

// Bounded batch lookup by localId using project-scoped Identity Platform endpoint
async function lookupAuthAccountsByUids(env, uids) {
  if (!Array.isArray(uids) || !uids.length) return {};
  const projectId = String(env.FIREBASE_PROJECT_ID || "abacus-buddy").trim();
  const map = {};
  try {
    const tok = await googleToken(env);
    for (let i = 0; i < uids.length; i += 100) {
      const chunk = uids.slice(i, i + 100);
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/accounts:lookup`, {
        method: "POST",
        headers: {
          authorization: "Bearer " + tok,
          "content-type": "application/json",
        },
        body: JSON.stringify({ localId: chunk }),
      });
      if (res.ok) {
        const data = await res.json();
        for (const u of (data.users || [])) {
          if (u.localId) {
            map[u.localId] = {
              email: u.email || "",
              phone: u.phoneNumber || "",
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn("[admin users] auth lookup skipped:", err?.message || err);
  }
  return map;
}

// List existing Firebase Auth accounts using project-scoped Identity Platform endpoint (maxResults bounded)
async function fetchAuthAccounts(env, maxResults = 100) {
  const projectId = String(env.FIREBASE_PROJECT_ID || "abacus-buddy").trim();
  try {
    const tok = await googleToken(env);
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/accounts?maxResults=${maxResults}`, {
      headers: {
        authorization: "Bearer " + tok,
      },
    });
    if (res.ok) {
      const data = await res.json();
      return (data.users || []).map(u => ({
        uid: u.localId || "",
        email: u.email || "",
        phone: u.phoneNumber || "",
      }));
    }
  } catch (err) {
    console.warn("[admin users] auth list skipped:", err?.message || err);
  }
  return [];
}

// ── Duplicate user detection (manual review only) ───────────────────────────
// Signal 1: Phone match across different UIDs (strong) — IMPLEMENTED
// Signal 2: Email match across different UIDs (strong) — IMPLEMENTED
// Signal 3: Razorpay payment token: DEFERRED — NOT CURRENTLY STORED
// Signal 4: Child name: DEFERRED — no server-side child-name record exists (local device state only)
// Self-match: never flags
// Auto-blocking: NEVER (manual founder review only)

function normalizePhone(raw) {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length < 7) return "";
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

function normalizeEmail(raw) {
  if (!raw) return "";
  const s = String(raw).trim().toLowerCase();
  return s.includes("@") && s.includes(".") ? s : "";
}

function detectDuplicates(users) {
  if (!Array.isArray(users) || users.length <= 1) {
    return (users || []).map(u => ({ ...u, possibleDuplicate: false, duplicateReasons: [] }));
  }
  const normalized = users.map(u => ({
    uid: String(u.uid || ""),
    phone: normalizePhone(u.phone),
    email: normalizeEmail(u.email),
  }));

  return users.map((u, i) => {
    const curr = normalized[i];
    if (!curr.uid) return { ...u, possibleDuplicate: false, duplicateReasons: [] };

    let phoneMatched = false;
    let emailMatched = false;

    for (let j = 0; j < users.length; j++) {
      if (i === j) continue; // never match against self
      const other = normalized[j];
      if (!other.uid || other.uid === curr.uid) continue;

      const pMatch = !!(curr.phone && other.phone && curr.phone === other.phone);
      const eMatch = !!(curr.email && other.email && curr.email === other.email);

      if (pMatch) phoneMatched = true;
      if (eMatch) emailMatched = true;
    }

    const possibleDuplicate = phoneMatched || emailMatched;
    const duplicateReasons = [];
    if (phoneMatched) duplicateReasons.push("phone");
    if (emailMatched) duplicateReasons.push("email");

    return {
      ...u,
      possibleDuplicate,
      duplicateReasons,
    };
  });
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

// ── Entitlements ─────────────────────────────────────────────────────────────
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

// ── Audit log — rich records with action, target, before, after, timestamp ──
async function writeAudit(env,{action,target,before=null,after=null,uid="system",extra={}}){
  try{
    const id=`${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const fields={
      action:fsField(action),
      target:fsField(String(target||"")),
      before:fsField(before!==null?JSON.stringify(before):null),
      after:fsField(after!==null?JSON.stringify(after):null),
      uid:fsField(String(uid)),
      timestamp:fsField(new Date().toISOString()),
      ...Object.fromEntries(Object.entries(extra).map(([k,v])=>[k,fsField(String(v))])),
    };
    await firestorePatch(env,"audit_log",id,fields);
  }catch(e){console.error("[audit] write failed:",e.message);}
}

// ── Remote config: serialized as JSON string in Firestore ────────────────────
// FIX: store as JSON string in `configJson` field; parse it back on read.
// This avoids Firestore nested-map depth limitations and round-trip issues.
async function getRemoteConfig(env){
  const doc=await firestoreGet(env,"_config","remote");
  if(!doc||!doc.fields)return null;
  const raw=fsVal(doc.fields.configJson);
  if(!raw)return null;
  try{return JSON.parse(raw);}catch{return null;}
}
async function putRemoteConfig(env,cfg,uid){
  const fields={
    configJson:fsField(JSON.stringify(cfg)),
    updatedAt:fsField(new Date().toISOString()),
    updatedBy:fsField(uid),
  };
  await firestorePatch(env,"_config","remote",fields);
}

// ── Razorpay helpers ─────────────────────────────────────────────────────────
async function razor(env,path,opts={}){
  const keyId=String(env.RAZORPAY_KEY_ID||"").trim(), keySecret=String(env.RAZORPAY_KEY_SECRET||"").trim();
  const auth=btoa(keyId+":"+keySecret);
  const r=await fetch("https://api.razorpay.com/v1"+path,{...opts,headers:{authorization:"Basic "+auth,"content-type":"application/json",...(opts.headers||{})}});
  const d=await r.json();if(!r.ok)throw Error(d.error?.description||"Razorpay request failed");return d;
}

// ── Main request handler ─────────────────────────────────────────────────────
async function main(req,env){
  if(req.method==="OPTIONS")return json({});
  const u=new URL(req.url), path=u.pathname;

  // ── /api/remote-config (public GET) — returns parsed JSON, never raw Firestore doc ──
  if(path==="/api/remote-config"&&req.method==="GET"){
    try{
      const cfg=await getRemoteConfig(env);
      return json(cfg||{},200);
    }catch(e){
      return json({error:e.message||"Failed to retrieve remote config"},502);
    }
  }

  // ── /api/create-order ────────────────────────────────────────────────────────
  if(path==="/api/create-order"&&req.method==="POST"){
    const user=await bearer(req,env);
    const existing=await getEntitlement(env,user.uid);
    if(existing?.paid){
      await writeAudit(env,{action:"create_order_skipped",target:`entitlement/${user.uid}`,after:{paid:true},uid:user.uid});
      return json({paid:true});
    }
    const order=await razor(env,"/orders",{method:"POST",body:JSON.stringify({amount:PRICE,currency:"INR",receipt:"abacus_"+user.uid+"_"+Date.now(),notes:{uid:user.uid,product:PRODUCT}})});
    await writeAudit(env,{action:"order_created",target:`razorpay/order/${order.id}`,after:{orderId:order.id,amount:PRICE,uid:user.uid},uid:user.uid});
    return json({orderId:order.id,amount:PRICE,currency:"INR",keyId:env.RAZORPAY_KEY_ID});
  }

  // ── /api/verify-payment ──────────────────────────────────────────────────────
  if(path==="/api/verify-payment"&&req.method==="POST"){
    const user=await bearer(req,env), b=await req.json();
    const existing=await getEntitlement(env,user.uid);
    if(existing?.paid){return json({paid:true});} // idempotent
    const payload=String(b.razorpay_order_id)+"|"+String(b.razorpay_payment_id);
    const keySecret=String(env.RAZORPAY_KEY_SECRET||"").trim();
    const sig=(await hmac(keySecret,payload)).toLowerCase(), gotSig=String(b.razorpay_signature||"").trim().toLowerCase();
    if(!eq(sig,gotSig)){
      await writeAudit(env,{action:"payment_sig_invalid",target:`payment/${b.razorpay_payment_id}`,before:{orderId:b.razorpay_order_id},uid:user.uid});
      return json({error:"Invalid payment signature"},400);
    }
    const order=await razor(env,"/orders/"+encodeURIComponent(b.razorpay_order_id));
    if(Number(order.amount)!==PRICE||order.currency!=="INR"||order.notes?.uid!==user.uid||order.notes?.product!==PRODUCT){
      await writeAudit(env,{action:"payment_order_mismatch",target:`razorpay/order/${b.razorpay_order_id}`,before:{expectedAmount:PRICE,expectedUid:user.uid},after:{actualAmount:order.amount,actualUid:order.notes?.uid},uid:user.uid});
      return json({error:"Order validation failed"},400);
    }
    const payment=await razor(env,"/payments/"+encodeURIComponent(b.razorpay_payment_id));
    if(payment.order_id!==b.razorpay_order_id||payment.status!=="captured"||Number(payment.amount)!==PRICE||payment.currency!=="INR"){
      await writeAudit(env,{action:"payment_capture_invalid",target:`razorpay/payment/${b.razorpay_payment_id}`,before:{expectedStatus:"captured",expectedAmount:PRICE},after:{actualStatus:payment.status,actualAmount:payment.amount},uid:user.uid});
      return json({error:"Payment is not captured or does not match the order"},400);
    }
    await putEntitlement(env,user.uid,{orderId:b.razorpay_order_id,paymentId:b.razorpay_payment_id});
    await writeAudit(env,{action:"payment_verified",target:`entitlement/${user.uid}`,before:{paid:false},after:{paid:true,orderId:b.razorpay_order_id,paymentId:b.razorpay_payment_id,amount:PRICE},uid:user.uid});
    return json({paid:true});
  }

  // ── /api/user-status ─────────────────────────────────────────────────────────
  if(path==="/api/user-status"&&req.method==="GET"){
    const user=await bearer(req,env);
    const ent=await getEntitlement(env,user.uid);
    return json({paid:!!ent,uid:user.uid,paidAt:ent?.paidAt||null});
  }

  // ── /api/razorpay-webhook ────────────────────────────────────────────────────
  if(path==="/api/razorpay-webhook"&&req.method==="POST"){
    const raw=await req.text(), got=String(req.headers.get("x-razorpay-signature")||"").trim().toLowerCase();
    const sec=String(env.RAZORPAY_WEBHOOK_SECRET||"").trim();
    const want=(await hmac(sec,raw)).toLowerCase();
    if(!sec||!eq(got,want)){return json({error:"Invalid webhook signature"},400);}
    const e=JSON.parse(raw), p=e.payload?.payment?.entity, o=e.payload?.order?.entity, pay=p||null, ord=o||null;
    if(e.event==="payment.captured"||e.event==="order.paid"){
      const amount=Number(pay?.amount??ord?.amount),currency=pay?.currency??ord?.currency,uid=pay?.notes?.uid??ord?.notes?.uid,product=pay?.notes?.product??ord?.notes?.product;
      if(amount===PRICE&&currency==="INR"&&uid&&product===PRODUCT){
        const existing=await getEntitlement(env,uid);
        if(!existing?.paid){
          await putEntitlement(env,uid,{orderId:pay?.order_id||ord?.id,paymentId:pay?.id||""});
          await writeAudit(env,{action:"webhook_payment_recorded",target:`entitlement/${uid}`,before:{paid:false},after:{paid:true,orderId:pay?.order_id||ord?.id,event:e.event,amount},uid});
        }
      }
    }
    return json({ok:true});
  }

  // ── ADMIN ENDPOINTS (owner Firebase UID only) ────────────────────────────────
  if(path.startsWith("/api/admin/")){
    let user;
    try{user=await ownerBearer(req,env);}
    catch(e){return json({error:e.message},e.message.includes("Forbidden")?403:401);}

    // GET /api/admin/users
    // Lists Firebase Auth accounts (including free-tier users) joined with payment entitlements,
    // with server-side duplicate detection across phones and emails for manual founder review only.
    if(path==="/api/admin/users"&&req.method==="GET"){
      // 1. Fetch existing Firebase Auth accounts (includes free-tier and paying accounts)
      const authUsers = await fetchAuthAccounts(env, 100);

      // 2. Fetch existing Firestore entitlements
      let docs = [];
      try { docs = await firestoreList(env, "entitlements"); } catch(e) {}

      const entMap = {};
      const entUids = [];
      for (const d of docs) {
        const f = d.fields || {};
        const uid = fsVal(f.uid) || d.name.split("/").pop();
        if (uid) {
          entUids.push(uid);
          entMap[uid] = {
            paid: f.paid?.booleanValue === true,
            paidAt: fsVal(f.paidAt) || null,
            email: fsVal(f.email) || "",
            phone: fsVal(f.phone) || fsVal(f.phoneNumber) || "",
          };
        }
      }

      // Merge population: all Auth accounts
      const userMap = {};
      for (const a of authUsers) {
        if (!a.uid) continue;
        const ent = entMap[a.uid];
        userMap[a.uid] = {
          uid: a.uid,
          email: a.email || ent?.email || "",
          phone: a.phone || ent?.phone || "",
          paid: ent?.paid === true,
          paidAt: ent?.paidAt || null,
        };
      }

      // Ensure any paying users in entitlements not captured in authUsers batch are included
      const missingUids = entUids.filter(uid => !userMap[uid]);
      if (missingUids.length) {
        const lookupMap = await lookupAuthAccountsByUids(env, missingUids);
        for (const uid of missingUids) {
          const ent = entMap[uid];
          const auth = lookupMap[uid] || {};
          userMap[uid] = {
            uid,
            email: auth.email || ent?.email || "",
            phone: auth.phone || ent?.phone || "",
            paid: ent?.paid === true,
            paidAt: ent?.paidAt || null,
          };
        }
      }

      const mergedUsers = Object.values(userMap);
      const users = detectDuplicates(mergedUsers);
      const possibleDuplicateCount = users.filter(u => u.possibleDuplicate).length;
      return json({
        users,
        total: users.length,
        possibleDuplicateCount,
        note: "Lists Firebase Auth users joined with payment entitlements. Duplicate detection is for manual review only.",
      });
    }

    // GET /api/admin/payments
    if(path==="/api/admin/payments"&&req.method==="GET"){
      const docs=await firestoreList(env,"entitlements");
      const payments=docs.filter(d=>d.fields?.paid?.booleanValue===true).map(d=>{
        const f=d.fields||{};
        return{uid:fsVal(f.uid)||d.name.split("/").pop(),paid:true,orderId:fsVal(f.orderId)||null,paymentId:fsVal(f.paymentId)||null,paidAt:fsVal(f.paidAt)||null,product:fsVal(f.product)||null};
      });
      return json({payments,total:payments.length});
    }

    // GET /api/admin/entitlements
    if(path==="/api/admin/entitlements"&&req.method==="GET"){
      const docs=await firestoreList(env,"entitlements");
      const ents=docs.map(d=>{
        const f=d.fields||{};
        return{uid:fsVal(f.uid)||d.name.split("/").pop(),paid:f.paid?.booleanValue===true,paidAt:fsVal(f.paidAt)||null,product:fsVal(f.product)||null};
      });
      return json({entitlements:ents,total:ents.length});
    }

    // GET /api/admin/audit-log
    if(path==="/api/admin/audit-log"&&req.method==="GET"){
      const docs=await firestoreList(env,"audit_log",100);
      const entries=docs.map(d=>{
        const f=d.fields||{};
        return Object.fromEntries(Object.entries(f).map(([k,v])=>[k,fsVal(v)]));
      }).sort((a,b)=>(b.timestamp||"").localeCompare(a.timestamp||""));
      return json({entries,total:entries.length});
    }

    // GET /api/admin/remote-config
    if(path==="/api/admin/remote-config"&&req.method==="GET"){
      try{
        const cfg=await getRemoteConfig(env);
        return json({config:cfg||{}});
      }catch(e){return json({error:e.message},500);}
    }

    // POST /api/admin/remote-config
    if(path==="/api/admin/remote-config"&&req.method==="POST"){
      const newCfg=await req.json();
      // Read before for audit
      let oldCfg=null;
      try{oldCfg=await getRemoteConfig(env);}catch{}
      // SECURITY: price (freeLevels) can only be 3 (fixed payment model: levels 1-3 free, 4-15 paid).
      // The ₹499 price is enforced in code; freeLevels is a display only parameter.
      // We strip freeLevels from remote config pushes to prevent confusion — price is fixed.
      const {freeLevels:_stripped,...safeCfg}=newCfg;
      await putRemoteConfig(env,safeCfg,user.uid);
      await writeAudit(env,{action:"remote_config_updated",target:"_config/remote",before:oldCfg,after:safeCfg,uid:user.uid});
      return json({ok:true,note:"freeLevels is fixed at 3 (price model: 1-3 free, 4-15 paid at ₹499). It was stripped from this push."});
    }

    // GET /api/admin/rewards-config
    if(path==="/api/admin/rewards-config"&&req.method==="GET"){
      try{
        const doc=await firestoreGet(env,"_config","rewards");
        if(!doc||!doc.fields)return json({rewards:{}});
        const raw=fsVal(doc.fields.configJson);
        return json({rewards:raw?JSON.parse(raw):{}});
      }catch(e){return json({error:e.message},500);}
    }

    // POST /api/admin/rewards-config
    // NOTE: rewards config (stickersEnabled) is surfaced back through /api/remote-config
    // so that the child app can read it via config.js layer 3.
    if(path==="/api/admin/rewards-config"&&req.method==="POST"){
      const newRewards=await req.json();
      let oldRewards=null;
      try{
        const doc=await firestoreGet(env,"_config","rewards");
        if(doc?.fields?.configJson)oldRewards=JSON.parse(fsVal(doc.fields.configJson));
      }catch{}
      const fields={configJson:fsField(JSON.stringify(newRewards)),updatedAt:fsField(new Date().toISOString()),updatedBy:fsField(user.uid)};
      await firestorePatch(env,"_config","rewards",fields);
      // Merge stickersEnabled into the remote config so the child app picks it up
      const currentRemote=await getRemoteConfig(env)||{};
      const mergedRemote={...currentRemote,features:{...(currentRemote.features||{}),stickers:newRewards.stickersEnabled!==false}};
      await putRemoteConfig(env,mergedRemote,user.uid);
      await writeAudit(env,{action:"rewards_config_updated",target:"_config/rewards",before:oldRewards,after:newRewards,uid:user.uid,extra:{sideEffect:"merged stickersEnabled into remote config features.stickers"}});
      return json({ok:true,note:"stickersEnabled has been propagated to remote config features.stickers so children pick it up on next load."});
    }

    return json({error:"Admin endpoint not found"},404);
  }

  // Coupons: intentionally not routed. COUPONS_ENABLED = false.
  return json({error:"Not found"},404);
}

export { main, detectDuplicates, normalizePhone, normalizeEmail, lookupAuthAccountsByUids, fetchAuthAccounts };
export default {fetch(req,env){return main(req,env).catch(e=>json({error:e.message||"Server error"},500))}};
