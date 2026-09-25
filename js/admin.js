// Owner console (/owner.html) — for you (the owner), not for children.
//
// AUTHORIZATION: /owner.html requires your Firebase owner account (Google sign-in).
// There is NO PIN bypass. If you are not signed in as the owner Firebase account,
// the console shows a sign-in prompt. The server additionally enforces OWNER_UID
// on all /api/admin/* calls — a non-owner token is rejected with 403.
//
// There is no second admin. There is no add-admin feature.
//
// ₹499 price: fixed in code. No UI control can change the payment amount.
// freeLevels (always 3 for the free tier) is display-only and cannot be pushed
// to remote config from this console — the server strips it from any push.
//
// Sections:
//   1. Release switches — feature on/off (affects child app via remote config push)
//   2. Games — enable/disable individual games
//   3. Test rules — questions, minutes, pass mark
//   4. Branding — app name, centre name
//   5. Publish — push to remote config (propagated to ALL child devices)
//   6. This device — local state view / unlock helper
//   7. Users & Payments — live data from Firestore (owner auth required)
//   8. Audit log — recent audit events with action/target/before/after
//
// Rewards: Sticker rewards are controlled by the "Sticker book" feature switch (section 1).
// Toggling "Sticker book" OFF removes stickers from children and is recorded in audit log.
// The separate rewards-config endpoint propagates this to all devices via remote config.
//
// Coupon foundation: scaffold present in server, permanently disabled, not surfaced here.

import { cfg, setOverrides, clearOverrides, exportJson } from './config.js';
import { state, saveNow } from './store.js';
import { sfx } from './sound.js';
import { $, $$, shell, esc, go } from './ui.js';
import { GAMES } from './games.js';
import { initFirebase, getAuthInstance, onAuthChange, signInWithGoogle } from '../firebase/auth.js';

// ── Owner auth check ─────────────────────────────────────────────────────────
// We verify owner identity by calling a server admin endpoint with the user's token.
// The server rejects any token that doesn't match OWNER_UID (403).
// There is no local session cache for auth — every admin() call re-checks.

let _ownerToken = null; // cached id token (expires after 1h)
let _ownerUser = null;

async function ensureOwnerAuth(knownUser = null) {
  try {
    initFirebase();
  } catch (e) {
    return { ok: false, reason: 'unconfigured', message: 'Firebase not configured: ' + e.message };
  }

  // If Google sign-in just returned a credential, use that user directly.
  // Do not re-enter the auth observer here: Firebase persistence can lag the
  // signInWithPopup() promise on mobile, causing a false signed-out result.
  let user = knownUser;
  if (!user) {
    user = await new Promise(resolve => {
      let unsubscribe;
      unsubscribe = onAuthChange(currentUser => {
        try { unsubscribe?.(); } catch {}
        resolve(currentUser || null);
      });
    });
  }
  if (!user) return { ok: false, reason: 'not-signed-in', message: 'Sign in with your owner Google account to open the console.' };
  try {
    const token = await user.getIdToken(true);
    const res = await fetch('/api/admin/entitlements?limit=1', {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (res.status === 403) {
      return { ok: false, reason: 'forbidden', message: 'This Google account is not the owner account.' };
    }
    if (res.status === 401) {
      const data = await res.json().catch(() => ({}));
      return {
        ok: false,
        reason: 'unauthorized',
        message: data.error === 'OWNER_UID not configured on server'
          ? 'Server configuration error: OWNER_UID not configured on server.'
          : 'Please sign in again.'
      };
    }
    if (!res.ok) {
      return { ok: false, reason: 'server-error', message: `Server error: ${res.status}` };
    }
    _ownerToken = token;
    _ownerUser = user;
    return { ok: true, user, token };
  } catch (e) {
    if (_ownerUser && e.message?.includes('fetch')) {
      return { ok: true, user: _ownerUser, token: null, offline: true };
    }
    return { ok: false, reason: 'network-error', message: 'Network error: ' + e.message };
  }
}

const SWITCHES = [
  { key: 'learn', name: 'Learn (lessons)', note: 'The teaching path' },
  { key: 'practice', name: 'Practise (levels)', note: '15 levels of sums' },
  { key: 'play', name: 'Play (games)', note: 'The whole playroom' },
  { key: 'freePlay', name: 'Free Play', note: 'Open abacus, no task' },
  { key: 'stickers', name: 'Sticker book (rewards)', note: 'Sticker rewards screen — OFF removes stickers from children globally when pushed' },
  { key: 'tests', name: 'Level tests', note: 'Timed test after each level' },
  { key: 'exams', name: 'Exams & competition', note: 'Grand exam, mental maths, contest' },
  { key: 'certificates', name: 'Certificates', note: 'Printable certificate after a pass' },
  { key: 'tamil', name: 'Tamil language', note: 'Offer Tamil to children' },
];

export async function admin() {
  // Show loading state while verifying owner identity
  shell({ title: 'Owner Console', back: '/', cls: 'admin', body: `
    <section class="card intro">
      <div class="lv-big">🔐</div>
      <p class="muted">Checking owner account…</p>
    </section>` });

  const auth = await ensureOwnerAuth();

  if (!auth.ok) {
    return showAuthGate(auth.reason, auth.message);
  }

  renderConsole(auth);
}

function showAuthGate(reason, customMessage = null) {
  let msg;
  if (reason === 'forbidden' || reason === 'not-owner') {
    msg = customMessage || 'This Google account is not the owner account.';
  } else if (reason === 'unauthorized') {
    msg = customMessage || 'Please sign in again.';
  } else if (reason === 'not-signed-in') {
    msg = 'Sign in with your owner Google account to open the console.';
  } else {
    msg = customMessage || `Could not verify owner account. (${reason})`;
  }

  const isError = reason === 'forbidden' || reason === 'not-owner' || reason === 'unauthorized' || reason === 'server-error' || reason === 'network-error';
  const buttonText = (reason === 'forbidden' || reason === 'not-owner')
    ? 'Sign in with another Google account'
    : 'Sign in with Google';

  shell({ title: 'Owner Console', back: '/', body: `
    <section class="card intro">
      <div class="lv-big">🔐</div>
      <h2 class="display">Owner console</h2>
      <p class="lead" id="authGateMsg"${isError ? ' style="color:#d32f2f;font-weight:bold"' : ''}>${esc(msg)}</p>
      <button class="btn primary wide" id="ownerSignIn">${esc(buttonText)}</button>
      <p class="muted tiny" id="authMsg"></p>
    </section>` });

  const btn = $('#ownerSignIn');
  if (btn) {
    btn.onclick = async () => {
      btn.disabled = true; btn.textContent = 'Signing in…';
      const m = $('#authMsg');
      if (m) m.textContent = '';
      try {
        initFirebase();
        const credential = await signInWithGoogle();
        const user = credential?.user;
        if (!user) {
          throw new Error('No user returned from Google sign-in');
        }
        const verified = await ensureOwnerAuth(user);
        if (!verified.ok) return showAuthGate(verified.reason, verified.message);
        renderConsole(verified);
      } catch (e) {
        if (m) m.textContent = 'Sign-in failed: ' + e.message;
        btn.disabled = false; btn.textContent = buttonText;
      }
    };
  }
}

function renderConsole({ user, token, offline }) {
  const c = cfg();
  const sw = (key, name, note) => `<label class="admin-row"><span><b>${esc(name)}</b><small>${esc(note)}</small></span>
    <input type="checkbox" data-feature="${key}" ${c.features[key] !== false ? 'checked' : ''}></label>`;
  const num = (path, label, value, min, max) =>
    `<label class="admin-num"><span>${esc(label)}</span><input type="number" data-num="${path}" value="${value}" min="${min}" max="${max}"></label>`;

  shell({ title: 'Owner Console', back: '/', cls: 'admin', body: `
    ${offline ? '<p class="muted tiny" style="background:#fff3cd;padding:8px;border-radius:8px">⚠️ Offline — local changes only. Server operations disabled.</p>' : ''}

    <section class="card">
      <p class="eyebrow">Release switches</p>
      <p class="muted">Off means children don't see it at all. Changes take effect for all children when you <b>Push to remote config</b>.</p>
      ${SWITCHES.map(s => sw(s.key, s.name, s.note)).join('')}
    </section>

    <section class="card">
      <p class="eyebrow">Games</p>
      ${GAMES.map(g => sw(g.flag, `${g.emoji} ${g.name}`, g.desc)).join('')}
    </section>

    <section class="card">
      <p class="eyebrow">Test rules</p>
      <div class="admin-grid">
        ${num('test.questions', 'Level test questions', c.test.questions, 5, 50)}
        ${num('test.minutes', 'Level test minutes', c.test.minutes, 1, 60)}
        ${num('test.passMark', 'Level test pass %', c.test.passMark, 10, 100)}
        ${num('exam.questions', 'Grand exam questions', c.exam.questions, 5, 100)}
        ${num('exam.minutes', 'Grand exam minutes', c.exam.minutes, 1, 90)}
        ${num('exam.passMark', 'Grand exam pass %', c.exam.passMark, 10, 100)}
      </div>
      <p class="muted tiny">Payment: Levels 1–3 free, Levels 4–15 at ₹499 (fixed — not editable here).</p>
    </section>

    <section class="card">
      <p class="eyebrow">Branding</p>
      <label class="admin-num"><span>App name</span><input type="text" data-text="appName" value="${esc(c.appName)}" maxlength="24"></label>
      <label class="admin-num"><span>Centre name on certificates</span><input type="text" data-text="centreName" value="${esc(c.centreName)}" maxlength="40" placeholder="e.g. Sunshine Abacus Academy"></label>
    </section>

    <section class="card">
      <p class="eyebrow">Publish to everyone</p>
      <p class="muted">Changes above are local until you push. <b>Push to remote config</b> makes them live for all children on next app load. config.json remains the static fallback.</p>
      <textarea id="cfgJson" rows="8" readonly>${esc(exportJson())}</textarea>
      <div class="row"><button class="btn" id="copyCfg">📋 Copy config.json</button><button class="btn" id="pasteCfg">📥 Paste settings</button></div>
      <div class="row"><button class="btn${offline ? ' disabled" disabled' : '"'} id="pushRemote">☁️ Push to remote config</button></div>
      <div class="row"><button class="btn danger" id="resetCfg">Undo my device changes</button></div>
      <p class="muted tiny" id="cfgMsg"></p>
    </section>

    <section class="card">
      <p class="eyebrow">This device</p>
      <p class="muted">Signed in as: <b>${esc(user.email || user.uid)}</b><br>
      Child: <b>${esc(state.profile?.name || '—')}</b> · levels open: ${state.unlocked} · exams: ${state.exams.length}</p>
      <div class="row"><button class="btn" id="unlockAllLv">Open all 15 levels (this device)</button><button class="btn" id="lockConsole">Sign out</button></div>
    </section>

    <section class="card" id="admin-users-section">
      <p class="eyebrow">Who's using Abacus</p>
      <p class="muted tiny">Firebase Auth is the source of truth for every user. No IP, device, browser or location tracking is collected.</p>
      ${offline ? '<p class="muted tiny">⚠️ Offline — cannot load users.</p>' : `
      <div id="ownerStats" class="owner-stats"></div>
      <div class="owner-search-row"><input type="search" id="ownerSearch" placeholder="Search users…" aria-label="Search users"></div>
      <div class="owner-filters" id="ownerFilters">
        <button type="button" class="chip filter on" data-filter="all">All Users</button>
        <button type="button" class="chip filter" data-filter="paid">Paid</button>
        <button type="button" class="chip filter" data-filter="free">Free</button>
        <button type="button" class="chip filter" data-filter="dup">Possible Duplicates</button>
      </div>
      <div id="ownerUserList" class="user-list"><p class="muted tiny">Loading users…</p></div>
      <details class="owner-advanced">
        <summary>Advanced / raw data</summary>
        <div class="row">
          <button class="btn small" id="loadPayments">💳 Payments (raw)</button>
          <button class="btn small" id="loadEntitlements">🔑 Entitlements (raw)</button>
          <button class="btn small" id="loadAudit">📋 Audit Log (raw)</button>
        </div>
        <div id="adminDataOut" class="admin-data-out"><p class="muted tiny">No data loaded yet.</p></div>
      </details>`}
    </section>` });

  const touch = msg => { const m = $('#cfgMsg'); if (m) m.textContent = msg; const j = $('#cfgJson'); if (j) j.value = exportJson(); };

  $$('[data-feature]').forEach(input => input.onchange = () => {
    setOverrides({ features: { [input.dataset.feature]: input.checked } });
    sfx.tap(); touch('Saved on this device. Push to remote config to apply to all children.');
  });
  $$('[data-num]').forEach(input => input.onchange = () => {
    const [a, b] = input.dataset.num.split('.');
    const val = Math.max(+input.min, Math.min(+input.max, Number(input.value) || +input.min));
    input.value = val;
    setOverrides(b ? { [a]: { [b]: val } } : { [a]: val });
    touch('Saved on this device.');
  });
  $$('[data-text]').forEach(input => input.onchange = () => {
    setOverrides({ [input.dataset.text]: input.value.trim() });
    touch('Saved on this device.');
  });

  $('#copyCfg').onclick = async () => {
    const text = exportJson();
    try { await navigator.clipboard.writeText(text); touch('Copied.'); }
    catch { $('#cfgJson').select(); touch('Press Ctrl+C to copy — text is selected.'); }
  };
  $('#pasteCfg').onclick = () => {
    const box = $('#cfgJson'); box.readOnly = false; box.value = ''; box.focus();
    touch('Paste settings here, then tap outside the box.');
    box.onblur = () => {
      try { setOverrides(JSON.parse(box.value)); touch('Settings applied to this device.'); renderConsole({ user, token, offline }); }
      catch { touch('Not valid settings text.'); box.value = exportJson(); }
      box.readOnly = true;
    };
  };

  const pushBtn = $('#pushRemote');
  if (pushBtn && !offline) {
    pushBtn.onclick = async () => {
      pushBtn.disabled = true; pushBtn.textContent = '⏳ Pushing…';
      try {
        const auth = getAuthInstance();
        const freshToken = await auth.currentUser.getIdToken(true);
        const payload = JSON.parse(exportJson());
        const res = await fetch('/api/admin/remote-config', {
          method: 'POST',
          headers: { Authorization: `Bearer ${freshToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Push failed');
        touch('✓ Remote config pushed. All children will pick this up on next load.' + (data.note ? ' ' + data.note : ''));
      } catch (e) { touch('Push failed: ' + e.message); }
      pushBtn.disabled = false; pushBtn.textContent = '☁️ Push to remote config';
    };
  }

  $('#resetCfg').onclick = e => {
    const b = e.currentTarget;
    if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Tap again to undo'; setTimeout(() => { b.textContent = 'Undo my device changes'; delete b.dataset.sure; }, 4000); return; }
    clearOverrides(); renderConsole({ user, token, offline });
  };

  $('#unlockAllLv').onclick = e => { state.unlocked = 15; saveNow(); e.currentTarget.textContent = 'All 15 open ✓'; e.currentTarget.disabled = true; };
  $('#lockConsole').onclick = async () => {
    try {
      const { signOut } = await import('../firebase/auth.js');
      await signOut();
    } catch {}
    _ownerToken = null; _ownerUser = null;
    showAuthGate('not-signed-in');
  };

  // Admin data loaders (require network + owner token)
  async function adminFetch(endpoint, label) {
    const out = $('#adminDataOut');
    if (!out) return;
    out.innerHTML = `<p class="muted tiny">Loading ${label}…</p>`;
    try {
      if (offline) { out.innerHTML = `<p class="muted tiny">⚠️ Offline — cannot load ${label}.</p>`; return; }
      const freshToken = await getAuthInstance().currentUser.getIdToken(true);
      const res = await fetch(`/api/admin/${endpoint}`, { headers: { Authorization: `Bearer ${freshToken}` } });
      const data = await res.json();
      if (!res.ok) { out.innerHTML = `<p class="muted tiny">Error: ${esc(data.error || 'Unknown error')}</p>`; return; }
      out.innerHTML = `<pre class="admin-json">${esc(JSON.stringify(data, null, 2))}</pre>`;
    } catch (e) {
      out.innerHTML = `<p class="muted tiny">Failed: ${esc(e.message)}</p>`;
    }
  }

  if (!offline) {
    $('#loadPayments')?.addEventListener('click', () => adminFetch('payments', 'payments'));
    $('#loadEntitlements')?.addEventListener('click', () => adminFetch('entitlements', 'entitlements'));
    $('#loadAudit')?.addEventListener('click', () => adminFetch('audit-log', 'audit log'));
    initOwnerUsersDashboard();
  }
}

// ── Owner "Who's using Abacus" dashboard ─────────────────────────────────────
// Human-readable users list backed by GET /api/admin/users (Firebase Auth +
// entitlement join, server-side duplicate detection). Detect-only: this UI
// never blocks, suspends, merges or deletes anything.
let _ownerUsers = null;
let _ownerFilter = 'all';
let _ownerQuery = '';
let _ownerExpandedUid = null;

function fmtDate(value, epochMs = false) {
  if (!value) return 'Not available';
  const d = epochMs ? new Date(Number(value)) : new Date(value);
  if (Number.isNaN(d.getTime())) return 'Not available';
  return d.toLocaleString();
}

function ownerProviderLabel(providerId) {
  if (!providerId) return 'Not available';
  if (providerId === 'google.com') return 'Google';
  if (providerId === 'password') return 'Email/Password';
  if (providerId === 'phone') return 'Phone';
  return providerId;
}

function ownerUserMatchesFilter(u, filter) {
  if (filter === 'paid') return u.paid === true;
  if (filter === 'free') return u.paid !== true;
  if (filter === 'dup') return u.possibleDuplicate === true;
  return true;
}

function ownerUserMatchesQuery(u, q) {
  if (!q) return true;
  const hay = `${u.email || ''} ${u.phone || ''} ${u.uid || ''}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

function renderOwnerStats(users) {
  const el = $('#ownerStats');
  if (!el) return;
  const total = users.length;
  const paid = users.filter(u => u.paid).length;
  const dup = users.filter(u => u.possibleDuplicate).length;
  const stat = (label, value, warn) => `<div class="owner-stat${warn && value > 0 ? ' warn' : ''}"><b>${value}</b><small>${esc(label)}</small></div>`;
  el.innerHTML = stat('Total Users', total) + stat('Paid Users', paid) + stat('Free Users', total - paid) + stat('Possible Duplicates', dup, true);
}

function renderOwnerUserCard(u) {
  const expanded = _ownerExpandedUid === u.uid;
  const statusBadge = u.paid ? '<span class="status-badge paid">🟢 Paid</span>' : '<span class="status-badge free">🆓 Free</span>';
  const dupBadge = u.possibleDuplicate ? '<span class="status-badge dup">⚠️ Possible duplicate</span>' : '';
  const detail = !expanded ? '' : `<div class="user-detail">
    <div class="user-detail-row"><span>Email</span><span>${esc(u.email || 'Not available')}</span></div>
    <div class="user-detail-row"><span>Provider</span><span>${esc(ownerProviderLabel(u.provider))}</span></div>
    <div class="user-detail-row"><span>Account created</span><span>${esc(fmtDate(u.createdAt, true))}</span></div>
    <div class="user-detail-row"><span>Last login</span><span>${esc(fmtDate(u.lastLoginAt, true))}</span></div>
    <div class="user-detail-row"><span>Free/Paid</span><span>${u.paid ? 'Paid' : 'Free'}</span></div>
    <div class="user-detail-row"><span>Payment date</span><span>${esc(fmtDate(u.paidAt))}</span></div>
    <div class="user-detail-row"><span>Entitlement</span><span>${u.paid ? 'Levels 1–15 unlocked' : 'Levels 1–3 (free)'}</span></div>
    <div class="user-detail-row"><span>Possible duplicate</span><span>${u.possibleDuplicate ? 'Yes' : 'No'}</span></div>
    <div class="user-detail-row"><span>Duplicate reason</span><span>${esc(u.duplicateReasons?.length ? u.duplicateReasons.join(', ') : 'Not available')}</span></div>
    <div class="user-detail-row"><span>UID (debug)</span><span>${esc(u.uid || 'Not available')}</span></div>
  </div>`;
  return `<button type="button" class="user-card" data-uid="${esc(u.uid)}">
    <div class="user-card-head">
      <div class="user-card-id"><b>${esc(u.email || u.phone || 'Unknown user')}</b><small>Last login: ${esc(fmtDate(u.lastLoginAt, true))}</small></div>
      <span class="user-card-badges">${statusBadge}${dupBadge}</span>
    </div>
    ${detail}
  </button>`;
}

function renderOwnerUserList() {
  const el = $('#ownerUserList');
  if (!el) return;
  if (!_ownerUsers) { el.innerHTML = '<p class="muted tiny">Loading users…</p>'; return; }
  if (!_ownerUsers.length) { el.innerHTML = '<p class="owner-empty">No users yet — once someone opens the app, they\'ll show up here.</p>'; return; }
  const filtered = _ownerUsers.filter(u => ownerUserMatchesFilter(u, _ownerFilter) && ownerUserMatchesQuery(u, _ownerQuery));
  if (!filtered.length) { el.innerHTML = '<p class="owner-empty">No users match your search or filter.</p>'; return; }
  el.innerHTML = filtered.map(renderOwnerUserCard).join('');
  $$('.user-card', el).forEach(card => card.onclick = () => {
    const uid = card.dataset.uid;
    _ownerExpandedUid = _ownerExpandedUid === uid ? null : uid;
    renderOwnerUserList();
  });
}

async function loadOwnerUsers() {
  const listEl = $('#ownerUserList');
  if (listEl) listEl.innerHTML = '<p class="muted tiny">Loading users…</p>';
  try {
    const freshToken = await getAuthInstance().currentUser.getIdToken(true);
    const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${freshToken}` } });
    const data = await res.json();
    if (!res.ok) { if (listEl) listEl.innerHTML = `<p class="owner-error">Error: ${esc(data.error || 'Unknown error')}</p>`; return; }
    _ownerUsers = Array.isArray(data.users) ? data.users : [];
    renderOwnerStats(_ownerUsers);
    renderOwnerUserList();
  } catch (e) {
    if (listEl) listEl.innerHTML = `<p class="owner-error">Failed to load users: ${esc(e.message)}</p>`;
  }
}

function initOwnerUsersDashboard() {
  const search = $('#ownerSearch');
  if (search) search.oninput = e => { _ownerQuery = e.target.value; renderOwnerUserList(); };
  $$('.owner-filters .filter').forEach(btn => btn.onclick = () => {
    _ownerFilter = btn.dataset.filter;
    $$('.owner-filters .filter').forEach(b => b.classList.toggle('on', b === btn));
    renderOwnerUserList();
  });
  loadOwnerUsers();
}
