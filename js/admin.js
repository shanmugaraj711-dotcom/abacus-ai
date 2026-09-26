// Owner console (#/admin) — for you (the owner), not for children.
//
// AUTHORIZATION: #/admin requires your Firebase owner account (Google sign-in).
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
    return { ok: false, reason: 'Firebase not configured: ' + e.message };
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
  if (!user) return { ok: false, reason: 'not-signed-in' };
  try {
    const token = await user.getIdToken(true);
    const res = await fetch('/api/admin/entitlements?limit=1', {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (res.status === 403) return { ok: false, reason: 'not-owner' };
    if (res.status === 401) return { ok: false, reason: 'not-signed-in' };
    if (!res.ok) return { ok: false, reason: 'server-error:' + res.status };
    _ownerToken = token;
    _ownerUser = user;
    return { ok: true, user, token };
  } catch (e) {
    if (_ownerUser && e.message?.includes('fetch')) {
      return { ok: true, user: _ownerUser, token: null, offline: true };
    }
    return { ok: false, reason: 'network-error: ' + e.message };
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
  shell({ title: 'Owner Console', back: '#/parents', cls: 'admin', body: `
    <section class="card intro">
      <div class="lv-big">🔐</div>
      <p class="muted">Checking owner account…</p>
    </section>` });

  const auth = await ensureOwnerAuth();

  if (!auth.ok) {
    return showAuthGate(auth.reason);
  }

  renderConsole(auth);
}

function showAuthGate(reason) {
  const isNotOwner = reason === 'not-owner';
  const msg = isNotOwner
    ? 'This account is not the owner account. Only the single owner Firebase account may access this console.'
    : reason === 'not-signed-in'
    ? 'Sign in with your owner Google account to open the console.'
    : `Could not verify owner account. (${reason})`;

  shell({ title: 'Owner Console', back: '#/parents', body: `
    <section class="card intro">
      <div class="lv-big">🔐</div>
      <h2 class="display">Owner console</h2>
      <p class="lead">${esc(msg)}</p>
      ${isNotOwner ? '' : `<button class="btn primary wide" id="ownerSignIn">Sign in with Google</button>`}
      <p class="muted tiny" id="authMsg"></p>
    </section>` });

  const btn = $('#ownerSignIn');
  if (btn) {
    btn.onclick = async () => {
      btn.disabled = true; btn.textContent = 'Signing in…';
      try {
        initFirebase();
        const credential = await signInWithGoogle();
        const verified = await ensureOwnerAuth(credential?.user || null);
        if (!verified.ok) return showAuthGate(verified.reason);
        renderConsole(verified);
      } catch (e) {
        const m = $('#authMsg');
        if (m) m.textContent = 'Sign-in failed: ' + e.message;
        btn.disabled = false; btn.textContent = 'Sign in with Google';
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

  shell({ title: 'Owner Console', back: '#/parents', cls: 'admin', body: `
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
      <p class="eyebrow">Who's Using Abacus</p>
      <p class="muted tiny">All people using Abacus Buddy: registered/paid learners and anonymous free visitors. No IP or invasive tracking.</p>
      <div class="row">
        <button class="btn${offline ? ' disabled" disabled' : '"'} id="loadUsers">👥 Who's Using Abacus</button>
        <button class="btn${offline ? ' disabled" disabled' : '"'} id="loadPayments">💳 Payments</button>
        <button class="btn${offline ? ' disabled" disabled' : '"'} id="loadEntitlements">🔑 Entitlements</button>
        <button class="btn${offline ? ' disabled" disabled' : '"'} id="loadAudit">📋 Audit Log</button>
      </div>
      <div id="adminDataOut" class="admin-data-out"><p class="muted tiny">No data loaded yet.</p></div>
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
    go('#/home');
  };

  function formatDuplicateReason(reasons) {
    if (!Array.isArray(reasons) || !reasons.length) return '';
    const hasPhone = reasons.includes('phone');
    const hasEmail = reasons.includes('email');
    if (hasPhone && hasEmail) return 'Email + phone match';
    if (hasPhone) return 'Phone match';
    if (hasEmail) return 'Email match';
    return reasons.join(', ');
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch {
      return String(iso);
    }
  }

  function renderUsersView(data, out) {
    const allUsers = data.users || [];
    const total = data.total ?? allUsers.length;
    const paidCount = data.paidCount ?? allUsers.filter(u => u.paid).length;
    const registeredFreeCount = data.registeredFreeCount ?? allUsers.filter(u => !u.isAnonymous && !u.paid).length;
    const anonymousCount = data.anonymousCount ?? allUsers.filter(u => u.isAnonymous).length;
    const possibleDuplicateCount = data.possibleDuplicateCount ?? allUsers.filter(u => u.possibleDuplicate).length;

    let filter = 'all'; // 'all' | 'paid' | 'registered' | 'anonymous' | 'duplicates'
    let query = '';

    function redraw() {
      const q = query.trim().toLowerCase();
      const filtered = allUsers.filter(u => {
        if (filter === 'paid' && !u.paid) return false;
        if (filter === 'registered' && (u.isAnonymous || u.paid)) return false;
        if (filter === 'anonymous' && !u.isAnonymous) return false;
        if (filter === 'duplicates' && !u.possibleDuplicate) return false;
        if (!q) return true;
        const haystack = `${u.email || ''} ${u.phone || ''} ${u.uid || ''} ${u.visitorId || ''} ${u.visitorStatus || ''}`.toLowerCase();
        return haystack.includes(q);
      });

      out.innerHTML = `
        <div class="admin-users-mgmt">
          <div class="admin-notice">
            ℹ️ <b>Who's Using Abacus:</b> Real-time visibility into all learners using Abacus Buddy, including anonymous free visitors who never sign in, registered free accounts, and ₹499 paid accounts. Privacy-first: no IP, no device fingerprinting, no location tracking.
          </div>

          <div class="admin-stats-grid">
            <div class="admin-stat-card">
              <span class="admin-stat-num">${total}</span>
              <span class="admin-stat-label">Total People</span>
            </div>
            <div class="admin-stat-card stat-paid">
              <span class="admin-stat-num">${paidCount}</span>
              <span class="admin-stat-label">Paid (₹499)</span>
            </div>
            <div class="admin-stat-card stat-reg-free">
              <span class="admin-stat-num">${registeredFreeCount}</span>
              <span class="admin-stat-label">Registered Free</span>
            </div>
            <div class="admin-stat-card stat-anon">
              <span class="admin-stat-num">${anonymousCount}</span>
              <span class="admin-stat-label">Anonymous Free</span>
            </div>
          </div>

          <div class="admin-filter-bar">
            <label class="admin-filter-label">
              <span>Filter:</span>
              <select id="adminUserFilter" class="admin-select">
                <option value="all"${filter === 'all' ? ' selected' : ''}>All users (${allUsers.length})</option>
                <option value="paid"${filter === 'paid' ? ' selected' : ''}>Paid users (${paidCount})</option>
                <option value="registered"${filter === 'registered' ? ' selected' : ''}>Registered free (${registeredFreeCount})</option>
                <option value="anonymous"${filter === 'anonymous' ? ' selected' : ''}>Anonymous visitors (${anonymousCount})</option>
                <option value="duplicates"${filter === 'duplicates' ? ' selected' : ''}>Possible duplicates (${possibleDuplicateCount})</option>
              </select>
            </label>
            <input id="adminUserSearch" class="admin-search-input" placeholder="Search email, phone, UID or visitor ID..." value="${esc(query)}">
          </div>

          <div class="admin-users-list">
            ${filtered.length === 0 ? `
              <div class="admin-empty-state">
                <p class="muted center">No ${filter === 'duplicates' ? 'possible duplicate ' : (filter !== 'all' ? filter + ' ' : '')}learners found.</p>
              </div>
            ` : filtered.map(u => {
              const reason = formatDuplicateReason(u.duplicateReasons);
              const isAnon = !!u.isAnonymous;
              const displayName = isAnon ? '👤 Anonymous Visitor' : (u.email || u.phone || u.uid);
              const subId = isAnon ? `Visitor ID: ${u.visitorId || u.uid}` : `UID: ${u.uid}`;
              const status = u.visitorStatus || (isAnon ? 'New visitor' : (u.paid ? 'Paid learner' : 'Registered'));

              return `
                <div class="admin-user-card${u.possibleDuplicate ? ' duplicate-flagged' : ''}${isAnon ? ' visitor-card' : ''}">
                  <div class="admin-user-header">
                    <div class="admin-user-identity">
                      <b class="admin-user-name">${esc(displayName)}</b>
                      <span class="admin-user-uid"><code>${esc(subId)}</code></span>
                    </div>
                    <div class="admin-user-badges">
                      ${u.possibleDuplicate ? `
                        <span class="badge-duplicate" title="Potential duplicate detected server-side">
                          ⚠️ Possible duplicate
                          <small class="badge-reason">${esc(reason)}</small>
                        </span>
                      ` : ''}
                      ${u.paid
                        ? `<span class="badge-paid">Paid (₹499)</span>`
                        : (isAnon
                          ? `<span class="badge-visitor">Anonymous Free (1–3)</span>`
                          : `<span class="badge-registered-free">Registered Free (1–3)</span>`)}
                      <span class="badge-status status-${esc(String(status).toLowerCase().replace(/\s+/g, '-'))}">${esc(status)}</span>
                    </div>
                  </div>
                  <div class="admin-user-details">
                    ${!isAnon && u.phone ? `<span class="admin-user-field">📞 ${esc(u.phone)}</span>` : ''}
                    ${!isAnon && u.email && u.phone ? `<span class="admin-user-field">✉️ ${esc(u.email)}</span>` : ''}
                    <span class="admin-user-field" title="First seen timestamp">🕒 First seen: ${esc(formatDateTime(u.firstSeen))}</span>
                    <span class="admin-user-field" title="Last seen timestamp">⏱️ Last seen: ${esc(formatDateTime(u.lastSeen))}</span>
                    <span class="admin-user-field" title="Total visit count">🔄 Visits: <b>${u.visitCount || 1}</b></span>
                    ${u.paidAt ? `<span class="admin-user-field muted">💳 Paid: ${new Date(u.paidAt).toLocaleDateString()}</span>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <details class="admin-raw-details">
            <summary class="muted tiny">View raw JSON</summary>
            <pre class="admin-json">${esc(JSON.stringify(data, null, 2))}</pre>
          </details>
        </div>
      `;

      const filterSelect = $('#adminUserFilter');
      if (filterSelect) {
        filterSelect.onchange = e => {
          filter = e.target.value;
          redraw();
        };
      }

      const searchInput = $('#adminUserSearch');
      if (searchInput) {
        searchInput.oninput = e => {
          query = e.target.value;
          redraw();
        };
      }
    }

    redraw();
  }

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
      if (endpoint === 'users') {
        renderUsersView(data, out);
      } else {
        out.innerHTML = `<pre class="admin-json">${esc(JSON.stringify(data, null, 2))}</pre>`;
      }
    } catch (e) {
      out.innerHTML = `<p class="muted tiny">Failed: ${esc(e.message)}</p>`;
    }
  }

  if (!offline) {
    $('#loadUsers')?.addEventListener('click', () => adminFetch('users', 'users'));
    $('#loadPayments')?.addEventListener('click', () => adminFetch('payments', 'payments'));
    $('#loadEntitlements')?.addEventListener('click', () => adminFetch('entitlements', 'entitlements'));
    $('#loadAudit')?.addEventListener('click', () => adminFetch('audit-log', 'audit log'));
  }
}
