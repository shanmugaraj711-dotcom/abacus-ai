// Owner console (#/admin) — for you, not for children.
// Switch features on and off, set test rules and branding, then publish the result as config.json.
import { cfg, setOverrides, clearOverrides, exportJson, defaults, overrides } from './config.js';
import { state, saveNow } from './store.js';
import { sfx } from './sound.js';
import { $, $$, shell, esc, go } from './ui.js';
import { GAMES } from './games.js';

const OK = 'abacus-owner-unlocked';
const unlocked = () => { try { return sessionStorage.getItem(OK) === '1'; } catch { return false; } };

const SWITCHES = [
  { key: 'learn', name: 'Learn (lessons)', note: 'The teaching path' },
  { key: 'practice', name: 'Practise (levels)', note: '12 levels of sums' },
  { key: 'play', name: 'Play (games)', note: 'The whole playroom' },
  { key: 'freePlay', name: 'Free Play', note: 'Open abacus, no task' },
  { key: 'stickers', name: 'Sticker book', note: 'Rewards screen' },
  { key: 'tests', name: 'Level tests', note: 'Timed test after each level' },
  { key: 'exams', name: 'Exams & competition', note: 'Grand exam, mental maths, contest' },
  { key: 'certificates', name: 'Certificates', note: 'Printable certificate after a pass' },
  { key: 'tamil', name: 'Tamil language', note: 'Offer Tamil to children' },
];

export function admin() {
  if (!unlocked()) return gate();
  const c = cfg();
  const sw = (key, name, note) => `<label class="admin-row"><span><b>${esc(name)}</b><small>${esc(note)}</small></span>
    <input type="checkbox" data-feature="${key}" ${c.features[key] !== false ? 'checked' : ''}></label>`;
  const num = (path, label, value, min, max) => `<label class="admin-num"><span>${esc(label)}</span><input type="number" data-num="${path}" value="${value}" min="${min}" max="${max}"></label>`;
  shell({ title: 'Owner Console', back: '#/parents', cls: 'admin', body: `
    <section class="card">
      <p class="eyebrow">Release switches</p>
      <p class="muted">Off means children don't see it at all — no locked icon, no mention.</p>
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
        ${num('freeLevels', 'Levels open without a code', c.freeLevels, 1, 12)}
      </div>
    </section>

    <section class="card">
      <p class="eyebrow">Branding</p>
      <label class="admin-num"><span>App name</span><input type="text" data-text="appName" value="${esc(c.appName)}" maxlength="24"></label>
      <label class="admin-num"><span>Centre name on certificates</span><input type="text" data-text="centreName" value="${esc(c.centreName)}" maxlength="40" placeholder="e.g. Sunshine Abacus Academy"></label>
      <label class="admin-num"><span>Owner PIN</span><input type="text" data-text="ownerPin" value="${esc(c.ownerPin)}" maxlength="8"></label>
    </section>

    <section class="card">
      <p class="eyebrow">Publish to everyone</p>
      <p class="muted">Changes here apply to <b>this device only</b>, so you can try them first. To give them to every child and centre, copy the text below into a file named <b>config.json</b> next to index.html and re-deploy.</p>
      <textarea id="cfgJson" rows="10" readonly>${esc(exportJson())}</textarea>
      <div class="row"><button class="btn" id="copyCfg">📋 Copy config.json</button><button class="btn" id="pasteCfg">📥 Paste settings</button></div>
      <div class="row"><button class="btn danger" id="resetCfg">Undo my device changes</button></div>
      <p class="muted tiny" id="cfgMsg"></p>
    </section>

    <section class="card">
      <p class="eyebrow">This device</p>
      <p class="muted">Child: <b>${esc(state.profile?.name || '—')}</b> · levels open: ${state.unlocked} · exams taken: ${state.exams.length}</p>
      <div class="row"><button class="btn" id="unlockAllLv">Open all 12 levels</button><button class="btn" id="lockConsole">Lock console</button></div>
    </section>` });

  const touch = msg => { const m = $('#cfgMsg'); if (m) m.textContent = msg; $('#cfgJson').value = exportJson(); };
  $$('[data-feature]').forEach(input => input.onchange = () => {
    setOverrides({ features: { [input.dataset.feature]: input.checked } });
    sfx.tap(); touch('Saved on this device.');
  });
  $$('[data-num]').forEach(input => input.onchange = () => {
    const [a, b] = input.dataset.num.split('.');
    const val = Math.max(+input.min, Math.min(+input.max, Number(input.value) || +input.min));
    input.value = val;
    setOverrides(b ? { [a]: { [b]: val } } : { [a]: val });
    touch('Saved on this device.');
  });
  $$('[data-text]').forEach(input => input.onchange = () => { setOverrides({ [input.dataset.text]: input.value.trim() }); touch('Saved on this device.'); });
  $('#copyCfg').onclick = async () => {
    const text = exportJson();
    try { await navigator.clipboard.writeText(text); touch('Copied. Paste it into config.json and re-deploy.'); }
    catch { $('#cfgJson').select(); touch('Press Ctrl+C (or hold to copy) — the text is selected.'); }
  };
  $('#pasteCfg').onclick = () => {
    const box = $('#cfgJson'); box.readOnly = false; box.value = ''; box.focus();
    touch('Paste settings here, then tap outside the box.');
    box.onblur = () => {
      try { setOverrides(JSON.parse(box.value)); touch('Settings applied to this device.'); admin(); }
      catch { touch('That was not valid settings text.'); box.value = exportJson(); }
      box.readOnly = true;
    };
  };
  $('#resetCfg').onclick = e => {
    const b = e.currentTarget;
    if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Tap again to undo'; setTimeout(() => { b.textContent = 'Undo my device changes'; delete b.dataset.sure; }, 4000); return; }
    clearOverrides(); admin();
  };
  $('#unlockAllLv').onclick = e => { state.unlocked = 12; saveNow(); e.currentTarget.textContent = 'All levels open ✓'; e.currentTarget.disabled = true; };
  $('#lockConsole').onclick = () => { try { sessionStorage.removeItem(OK); } catch {} go('#/home'); };
}

function gate() {
  shell({ title: 'Owner Console', back: '#/parents', body: `
    <section class="card intro">
      <div class="lv-big">🔐</div>
      <h2 class="display">Owner console</h2>
      <p class="lead">Enter your PIN to switch features on or off.</p>
      <input id="pin" type="password" inputmode="numeric" maxlength="8" placeholder="PIN" autocomplete="off">
      <button class="btn primary wide" id="pinGo">Open console</button>
      <p class="muted tiny" id="pinMsg">Default PIN is 2580 — change it inside.</p>
    </section>` });
  const tryPin = () => {
    if ($('#pin').value.trim() === String(cfg().ownerPin)) {
      try { sessionStorage.setItem(OK, '1'); } catch {}
      sfx.good(); admin();
    } else { sfx.oops(); $('#pinMsg').textContent = 'Wrong PIN.'; $('#pin').value = ''; }
  };
  $('#pinGo').onclick = tryPin;
  $('#pin').onkeydown = e => { if (e.key === 'Enter') tryPin(); };
}
