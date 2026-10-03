import { LEVELS, MAX_LEVEL, makeSession, planMoves, starsFor, sign, problemPool } from './engine.js';
import { state, save, saveNow, markDay, streak, totalStars, recordAnswer, recordMistake, resetAll, pingVisit } from './store.js';
import { sfx, hasVoice, stopTalking } from './sound.js';
import { t } from './i18n.js';
import { createAbacus } from './abacusView.js';
import { babi } from './babi.js';
import { LESSONS, LESSON_FOR_LEVEL } from './lessons.js';
import { loadConfig, cfg, isOn, brand } from './config.js';
import { refreshEntitlement, isPaid, buyUnlock, startCheckout, getTier, getMaxLevel, getEntitlement, getMaxLesson, canAccessFreePlay, getGames } from './payments.js';
import { TIERS, getTierConfig } from './tiers.js';
import { starterScreen, getPlanDescription, getPlanActionsHtml } from './starter.js';
import { getAuthInstance, signInWithGoogle, signOut } from '../firebase/auth.js';
import {
  isGuestUser,
  canAccessLevel,
  canAccessGame,
  canAccessLesson,
  canAccessFreePlayMode,
  canGuestAccessLevel,
  canGuestAccessGame,
  canGuestAccessFeature,
  getAuthMode,
  setAuthMode,
  showConversionPrompt,
  renderEmailAuthView,
  GUEST_GAME_ID,
} from './access.js';
import {
  app, esc, $, $$, wait, newToken, currentToken, alive, every, clearTimers, setRouter, go,
  lang, T, V, say, voiceLang, lessonTitle, lvName, lvTip, kidName, lessonDone, AVATARS, stars, mmss,
  shell, bubble, setBubble, confetti, playDemo,
} from './ui.js';
import { playRoom, openGame, GAMES } from './games.js';
import { testCentre, runExam, certificates, certificate, examList } from './exams.js';


// ---------- stickers (earned from progress; nothing extra to save except which ones were shown) ----------
const STICKERS = [
  { id: 'lesson1', e: '🧮', name: 'First Lesson', how: 'Finish lesson 1', ok: () => lessonDone(1) },
  { id: 'tens', e: '🏠', name: 'Tens Explorer', how: 'Finish The Tens Rod', ok: () => lessonDone(5) },
  { id: 'little', e: '🐰', name: 'Little Friends', how: 'Learn Little Friends', ok: () => lessonDone(8) },
  { id: 'big', e: '🦁', name: 'Big Friends', how: 'Learn Big Friends', ok: () => lessonDone(10) },
  { id: 'grad', e: '🎓', name: 'Super Learner', how: 'Finish all lessons', ok: () => LESSONS.every(l => lessonDone(l.id)) },
  { id: 'practice', e: '🎯', name: 'First Practice', how: 'Finish any level', ok: () => Object.keys(state.levels).length > 0 },
  { id: 'three', e: '🌟', name: 'Perfect!', how: 'Get 3 stars on a level', ok: () => Object.values(state.levels).some(l => l.stars === 3) },
  { id: 'lv6', e: '🚀', name: 'Rocket', how: 'Open Level 6', ok: () => state.unlocked >= 6 },
  { id: 'champ', e: '👑', name: 'Champion', how: 'Pass Level 12', ok: () => (state.levels[12]?.stars || 0) >= 1 },
  { id: 'race', e: '🏁', name: 'Speedy Beads', how: 'Solve 10 in Bead Race', ok: () => state.games.race >= 10 },
  { id: 'match', e: '🃏', name: 'Memory Star', how: 'Bead Match in 10 moves', ok: () => state.games.match > 0 && state.games.match <= 10 },
  { id: 'days', e: '🔥', name: 'Three Days', how: 'Play on 3 different days', ok: () => state.stats.days.length >= 3 },
  { id: 'exam', e: '📝', name: 'Test Passed', how: 'Pass any test or exam', ok: () => state.exams.some(r => r.passed) },
];
const earned = () => STICKERS.filter(x => x.ok());
export const freeMax = () => TIERS.free.maxLevel;
export const playableMax = () => (isGuestUser() ? 1 : getMaxLevel());
export const levelAllowed = id => id >= 1 && canAccessLevel(id);
export const maxLessonAllowed = () => (isGuestUser() ? 1 : getMaxLesson());
export const lessonAllowed = id => canAccessLesson(id);

function pay() {
  const tier = getTier();
  if (tier === 'lifetime' || (isPaid() && tier !== 'starter')) {
    go('#/home', { replace: true });
    return;
  }
  const signedIn = (() => { try { return getAuthInstance().currentUser; } catch { return null; } })();
  const isTa = lang() === 'ta';
  const ctaText = isTa ? 'Google மூலம் தொடங்க உள்நுழையவும்' : 'Sign in to unlock with Google';
  shell({ title: isTa ? 'லெவல்கள் 2–15 திறக்கவும்' : 'Unlock Levels 2–15', back: '#/starter', body: `
    <section class="card intro">
      ${babi('happy', 'big bob')}
      <p class="eyebrow">${isTa ? 'அபாகஸ் பட்டி ஒரே முறை கட்டணம்' : 'Abacus Buddy One-time payment'}</p>
      <h2 class="display">${isTa ? 'லெவல்கள் 2–15, பாடங்கள், சுய பயிற்சி & விளையாட்டுகள்' : 'Levels 2–15, All Lessons, Free Play & All Games'}</h2>
      <p class="lead">${isTa ? 'ஒரே முறை கட்டணம் <span id="unlock-base-price"></span><b id="unlock-final-price">₹499</b> <span id="unlock-discount-label"></span>மட்டும்.' : '<span id="unlock-base-price"></span><b id="unlock-final-price">₹499</b> <span id="unlock-discount-label"></span>'}</p>
      <p class="muted">${isTa ? 'ஒரே முறை செலுத்துங்கள். அனைத்து லெவல்கள், பாடங்கள், விளையாட்டுகள் மற்றும் Free Play திறக்கப்படும். சந்தா இல்லை.' : 'Pay once. Unlocks all levels, lessons, games and Free Play. No subscription.'}</p>
      <ul class="muted">
        <li>${isTa ? 'லெவல் 1, பாடம் 1 மற்றும் 1 அறிமுக விளையாட்டு எப்போதும் இலவசம்.' : 'Level 1, Lesson 1, and 1 starter game stay free.'}</li>
        <li>${isTa ? 'இந்த கணக்கிற்கு லெவல்கள் 2–15, அனைத்து பாடங்கள், சுய பயிற்சி மற்றும் அனைத்து விளையாட்டுகளும் நிரந்தரமாக திறக்கப்படும்.' : 'Levels 2–15, all lessons, Free Play and all games unlock permanently for this account.'}</li>
        <li>${isTa ? 'Razorpay மூலம் பாதுகாப்பாக பணம் செலுத்தலாம்.' : 'Payment is processed securely by Razorpay.'}</li>
      </ul>
      ${signedIn ? `
        <div class="stack">
          <label for="couponCode"><b>${isTa ? 'கூப்பன் குறியீடு' : 'Coupon code'}</b></label>
          <div class="row">
            <input id="couponCode" maxlength="40" autocomplete="off" placeholder="COUPON" style="flex:1;">
            <button class="btn" id="applyCoupon" type="button">Apply</button>
          </div>
          <button class="btn primary wide" id="buy">Pay ₹499 & Unlock</button>
        </div>` : `
        <div class="stack"><a class="btn primary wide" id="signin-btn" href="./auth-ui/sign-in.html?return=../#/pay">${ctaText}</a></div>`}
      <p class="muted tiny center" id="coupon-status"></p>
      <p class="muted tiny center" id="pay-status"></p>
      <a class="btn ghost wide" href="#/starter">${isTa ? '← அனைத்து திட்டங்களையும் காண்க' : '← View all plans'}</a>
      <a class="btn ghost wide" href="#/home">${isTa ? 'இப்போது வேண்டாம்' : 'Not now'}</a>
    </section>` });

  const signinBtn = $('#signin-btn');
  if (signinBtn) signinBtn.onclick = async (e) => {
    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
      try {
        signinBtn.textContent = isTa ? 'Google உள்நுழைகிறது…' : 'Connecting to Google…';
        const cred = await signInWithGoogle();
        if (cred?.user) { e.preventDefault(); pingVisit(cred.user.uid).catch(() => {}); pay(); return; }
      } catch (err) { console.warn('[Unlock] Popup sign-in fallback:', err); }
    }
  };

  const buy = $('#buy'), apply = $('#applyCoupon'), couponInput = $('#couponCode');
  const finalPriceEl = $('#unlock-final-price'), basePriceEl = $('#unlock-base-price'), discountEl = $('#unlock-discount-label');
  let appliedCoupon = '';

  const setPrice = (base, final, discount) => {
    if(basePriceEl) basePriceEl.innerHTML = final < base ? `<s>₹${base}</s> ` : '';
    if(finalPriceEl) finalPriceEl.textContent = `₹${final}`;
    if(discountEl) discountEl.textContent = discount > 0 ? `(${isTa ? 'தள்ளுபடி' : 'Save'} ₹${discount})` : '';
    if(buy) buy.textContent = isTa ? `₹${final} செலுத்தி திறக்கவும்` : `Pay ₹${final} & Unlock`;
  };
  setPrice(499,499,0);

  if (apply) apply.onclick = async () => {
    const code = couponInput?.value.trim().toUpperCase() || '';
    const msg = $('#coupon-status');
    if(!code){ appliedCoupon=''; setPrice(499,499,0); if(msg)msg.textContent='Enter a coupon code.'; return; }
    apply.disabled=true; apply.textContent='Checking…';
    try{
      const { validateCoupon } = await import('./payments.js');
      const data=await validateCoupon(code);
      appliedCoupon=data.couponCode;
      setPrice(data.basePrice,data.finalPrice,data.discountApplied);
      if(msg)msg.textContent=`Coupon applied ✓ You save ₹${data.discountApplied}.`;
    }catch(e){
      appliedCoupon='';
      setPrice(499,499,0);
      if(msg)msg.textContent=e.message;
    }
    apply.disabled=false; apply.textContent='Apply';
  };

  if (buy) buy.onclick = async () => {
    buy.disabled=true;
    const msg=$('#pay-status');
    try{
      await buyUnlock({
        couponCode: appliedCoupon,
        onSuccess: () => { if(msg)msg.textContent=isTa?'கட்டணம் சரிபார்க்கப்பட்டது ✓ லெவல்கள் 2–15 திறக்கப்பட்டன.':'Payment verified ✓ Levels 2–15 are unlocked.'; },
        onError: e => { if(msg)msg.textContent=e.message; },
      });
      if(isPaid()) setTimeout(()=>go('#/practice'),700);
    }catch(e){
      if(msg)msg.textContent=e.message;
      buy.disabled=false;
      const final=Number(finalPriceEl?.textContent?.replace(/[^0-9]/g,''))||499;
      buy.textContent=isTa?`₹${final} செலுத்தி திறக்கவும்`:`Pay ₹${final} & Unlock`;
    }
  };
}


function stickers() {
  const got = new Set(earned().map(x => x.id));
  shell({ title: 'My Stickers', back: '#/home', body: `
    ${bubble(T('stickerCount', got.size, STICKERS.length), 'happy')}
    <div class="stickers">${STICKERS.map(x => `<div class="sticker ${got.has(x.id) ? 'got' : ''}"><span>${got.has(x.id) ? x.e : '❔'}</span><b>${x.name}</b><small>${got.has(x.id) ? 'Got it!' : x.how}</small></div>`).join('')}</div>` });
  state.stickersSeen = [...got]; save();
  say(V('stickerCount', got.size, STICKERS.length));
}

// ---------- screens ----------
function welcome() {
  const authMode = getAuthMode();
  const showGate = !authMode && !state.profile?.name;
  const draft = { name: state.profile?.name || '', avatar: '🦁', lang: 'en', voiceLang: 'en' };
  app.innerHTML = `
  <main class="view welcome">
    <div id="authGateStep" class="auth-gate" ${showGate ? '' : 'style="display:none;"'}>
      <div class="hero">
        <div style="font-size:48px;margin-bottom:8px;">🧮</div>
        <div>
          <p class="eyebrow">Abacus Buddy</p>
          <h1 class="display">Welcome!</h1>
          <p class="lead">Let's start learning.</p>
        </div>
      </div>
      <section class="card auth-gate-card">
        <div class="auth-actions">
          <button type="button" class="btn wide auth-btn-google" id="authGateGoogleBtn">
            <svg style="width:20px;height:20px;margin-right:6px;vertical-align:middle;" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
            Continue with Google
          </button>
          <button type="button" class="btn wide auth-btn-email" id="authGateEmailBtn">
            ✉️ Login with Email & Password
          </button>
          <div class="auth-divider">─── or ───</div>
          <button type="button" class="btn wide auth-btn-guest" id="authGateGuestBtn">
            🎮 Continue as Guest
          </button>
        </div>
      </section>
    </div>

    <div id="emailAuthStep" style="display:none;padding:18px 16px;"></div>

    <div id="welcomeProfileStep">
      <section class="card form">
        <label for="kidName">What's your name?</label>
        <input id="kidName" maxlength="18" autocomplete="off" placeholder="Type your name" value="${esc(draft.name)}">
        <label>Pick your animal buddy</label>
        <div class="avatars">${AVATARS.map(a => `<button type="button" class="avatar ${a === draft.avatar ? 'on' : ''}" data-avatar="${a}" aria-label="Avatar ${a}">${a}</button>`).join('')}</div>
        <label>Have you used an abacus before?</label>
        <div class="two">
          <button type="button" class="choice" data-exp="new"><b>🌱 I'm new</b><small>Teach me from the start</small></button>
          <button type="button" class="choice" data-exp="known"><b>🚀 I know it</b><small>Quick check, then skip ahead</small></button>
        </div>
        <label ${isOn('tamil') ? '' : 'hidden'}>What should Babi speak?</label>
        <div class="two" ${isOn('tamil') ? '' : 'hidden'}>
          <button type="button" class="choice on" data-voice-lang="en"><b>English audio</b></button>
          <button type="button" class="choice" data-voice-lang="ta"><b>Tamil audio</b></button>
        </div>
        <label ${isOn('tamil') ? '' : 'hidden'}>What should the screen show?</label>
        <div class="two" ${isOn('tamil') ? '' : 'hidden'}>
          <button type="button" class="choice on" data-content-lang="en"><b>English content</b></button>
          <button type="button" class="choice" data-content-lang="ta"><b>Tamil content</b></button>
        </div>
        <p class="muted tiny" id="langNote" hidden>This phone has no Tamil voice, so Babi will stay quiet until a Tamil voice is available.</p>
        <button class="btn primary wide" id="start" disabled>Let's go! →</button>
      </section>
    </div>
  </main>`;

  const authGateStep = $('#authGateStep');
  const emailAuthStep = $('#emailAuthStep');
  const profileStep = $('#welcomeProfileStep');
  const authGoogleBtn = $('#authGateGoogleBtn');
  const authEmailBtn = $('#authGateEmailBtn');
  const authGuestBtn = $('#authGateGuestBtn');

  const proceedToProfile = () => {
    if (authGateStep) authGateStep.style.display = 'none';
    if (emailAuthStep) emailAuthStep.style.display = 'none';
    if (profileStep) profileStep.style.display = 'block';
    const nameEl = $('#kidName');
    if (nameEl) nameEl.focus();
  };

  if (authGuestBtn) {
    authGuestBtn.onclick = () => {
      setAuthMode('guest');
      pingVisit().catch(() => {});
      proceedToProfile();
    };
  }

  if (authGoogleBtn) {
    authGoogleBtn.onclick = async () => {
      authGoogleBtn.disabled = true;
      authGoogleBtn.textContent = 'Connecting to Google…';
      try {
        const cred = await signInWithGoogle();
        if (cred?.user) {
          setAuthMode('registered');
          pingVisit(cred.user.uid).catch(() => {});
          proceedToProfile();
        }
      } catch (err) {
        authGoogleBtn.disabled = false;
        authGoogleBtn.innerHTML = 'Continue with Google';
        alert(err.message || 'Google sign-in error');
      }
    };
  }

  if (authEmailBtn) {
    authEmailBtn.onclick = () => {
      if (authGateStep) authGateStep.style.display = 'none';
      if (emailAuthStep) {
        emailAuthStep.style.display = 'block';
        renderEmailAuthView({
          container: emailAuthStep,
          initialMode: 'login',
          onSuccess: (user) => {
            setAuthMode('registered');
            if (user?.uid) pingVisit(user.uid).catch(() => {});
            proceedToProfile();
          },
          onBack: () => {
            emailAuthStep.style.display = 'none';
            if (authGateStep) authGateStep.style.display = 'block';
          },
        });
      }
    };
  }

  let exp = '';
  const ready = () => { $('#start').disabled = !($('#kidName').value.trim() && exp); };
  $('#kidName').addEventListener('input', ready);
  $$('[data-avatar]').forEach(b => b.onclick = () => { draft.avatar = b.dataset.avatar; $$('[data-avatar]').forEach(x => x.classList.toggle('on', x === b)); sfx.tap(); });
  $$('[data-exp]').forEach(b => b.onclick = () => { exp = b.dataset.exp; $$('[data-exp]').forEach(x => x.classList.toggle('on', x === b)); sfx.tap(); ready(); });
  $$('[data-voice-lang]').forEach(b => b.onclick = () => {
    draft.voiceLang = b.dataset.voiceLang; $$('[data-voice-lang]').forEach(x => x.classList.toggle('on', x === b));
    state.profile = { ...(state.profile || {}), lang: draft.lang, voiceLang: draft.voiceLang }; sfx.tap();
    const note = $('#langNote'); if (note) note.hidden = !(draft.voiceLang === 'ta' && !hasVoice('ta'));
    say(t(draft.voiceLang || draft.lang, 'welcomeKid', $('#kidName').value.trim() || (draft.lang === 'ta' ? 'நண்பா' : 'friend')));
  });
  $$('[data-content-lang]').forEach(b => b.onclick = () => {
    draft.lang = b.dataset.contentLang; $$('[data-content-lang]').forEach(x => x.classList.toggle('on', x === b));
    state.profile = { ...(state.profile || {}), lang: draft.lang, voiceLang: draft.voiceLang }; sfx.tap();
    const note = $('#langNote'); if (note) note.hidden = !(draft.voiceLang === 'ta' && !hasVoice('ta'));
    say(t(draft.voiceLang || draft.lang, 'welcomeKid', $('#kidName').value.trim() || (draft.lang === 'ta' ? 'நண்பா' : 'friend')));
  });
  $('#start').onclick = () => {
    if (!getAuthMode()) {
      setAuthMode('guest');
      pingVisit().catch(() => {});
    }
    state.profile = { name: $('#kidName').value.trim().slice(0, 18), avatar: draft.avatar, experience: exp, lang: draft.lang, voiceLang: draft.voiceLang };
    saveNow(); sfx.good(); say(V('welcomeKid', state.profile.name));
    go(exp === 'known' ? '#/check' : '#/home');
  };
}

const GAME_COUNT = () => ['gameRace', 'gameMystery', 'gameMatch', 'gameFlash', 'gameSpeedRead', 'gameFriendDash', 'gameLadder'].filter(isOn).length;
const examsOpen = () => (isOn('tests') || isOn('exams')) && examList().length > 0;
const testLine = () => {
  const isTa = lang() === 'ta';
  const passed = state.exams.filter(r => r.passed).length;
  if (isTa) return passed ? `${passed} சான்றிதழ் வென்றீர்கள்` : 'தேர்வை முயற்சி செய்';
  return passed ? `${passed} certificate${passed === 1 ? '' : 's'} earned` : 'Try a real test';
};

function nextMission() {
  if (state.unlocked > playableMax() && !isPaid()) {
    const nextLv = playableMax() + 1;
    return {
      href: isGuestUser() ? '#/practice' : '#/starter',
      emoji: '🔐',
      label: lang() === 'ta' ? `லெவல் ${nextLv} திற` : `Unlock Level ${nextLv}–${MAX_LEVEL}`,
      say: lang() === 'ta' ? `லெவல் ${nextLv} திறக்கலாம்!` : `Ready to unlock Level ${nextLv}?`,
      kind: 'unlock',
      voiceTitle: lang() === 'ta' ? `லெவல் ${nextLv} திற` : `Unlock Level ${nextLv}`,
    };
  }
  const lvl = Math.min(state.unlocked, playableMax());
  const need = LESSON_FOR_LEVEL[lvl] || 11;
  const lesson = LESSONS.find(l => l.id <= need && !lessonDone(l.id));
  if (lesson && state.profile.experience !== 'known') return { href: `#/lesson/${lesson.id}`, emoji: lesson.emoji, label: `${lang() === 'ta' ? 'கற்றல்' : 'Learn'}: ${lessonTitle(lesson)}`, say: T('missionLearn', lessonTitle(lesson)), kind: 'lesson', voiceTitle: voiceLang() === 'ta' ? (lesson.titleTa || lesson.title) : lesson.title };
  const L = LEVELS[lvl];
  return { href: `#/level/${lvl}`, emoji: L.emoji, label: `${lang() === 'ta' ? 'பயிற்சி' : 'Practise'} — ${lvl}: ${lvName(L)}`, say: T('missionPractise', lvName(L)), kind: 'level', voiceTitle: voiceLang() === 'ta' ? (L.nameTa || L.name) : L.name };
}

function home() {
  const isTa = lang() === 'ta';
  const m = nextMission(), sk = streak();
  const guest = isGuestUser();
    const freePlayOpen = !guest && canAccessFreePlay();
    const availableLessons = maxLessonAllowed();
    const doneLessonsCount = state.lessonsDone.filter(id => lessonAllowed(id)).length;
    const availableGames = guest ? 1 : (getGames() || ['race']).filter(id => { const g = GAMES.find(x => x.id === id); return g && isOn(g.flag); }).length;
    shell({ body: `
    ${guest ? `
      <section class="card guest-home-banner" style="background:#eef2ff;border:1px solid #c7d2fe;margin-bottom:12px;padding:12px 14px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <div>
          <b style="color:#3730a3;font-size:14px;display:block;">🎮 ${isTa ? 'விருந்தினர் பயன்முறை' : 'Guest Mode'}</b>
          <span style="font-size:12px;color:#4338ca;">${isTa ? 'லெவல் 1 மற்றும் புதிர் எண் திறக்கப்பட்டுள்ளது.' : 'Level 1 and Mystery Number unlocked. Save your progress!'}</span>
        </div>
        <button type="button" class="btn primary small" id="guestUpgradeBtn" style="white-space:nowrap;padding:6px 12px;font-size:13px;">${isTa ? 'கணக்கு உருவாக்கு' : 'Save Progress'}</button>
      </section>
    ` : ''}
    <section class="hello">
      <div class="kid-avatar">${esc(state.profile.avatar)}</div>
      <div><p class="eyebrow">${isTa ? 'மீண்டும் வருக' : 'Welcome back'}</p><h2 class="display">Hi, ${kidName()}!</h2></div>
      <span class="chip ${sk ? 'fire' : ''}">🔥 ${sk} ${isTa ? 'நாள்' : `day${sk === 1 ? '' : 's'}`}</span>
    </section>
    <a class="mission" href="${m.href}">
      <div class="mission-babi">${babi('happy', 'bob')}</div>
      <div><p class="eyebrow">${isTa ? 'பாபி அடுத்ததா இதை பண்ண சொல்றாரு' : 'Babi says do this next'}</p><b>${m.emoji} ${esc(m.label)}</b></div>
      <span class="go">▶</span>
    </a>
    ${(() => { const fresh = earned().filter(x => !state.stickersSeen.includes(x.id)); return fresh.length ? `<a class="new-sticker" href="#/stickers"><span>${fresh[0].e}</span><div><b>${isTa ? 'புதிய ஸ்டிக்கர்!' : 'New sticker!'}</b><small>${esc(fresh[0].name)} — ${isTa ? 'பார்க்க தொடவும்' : 'tap to see'}</small></div></a>` : ''; })()}
    <nav class="tiles">
      ${isOn('learn') ? `<a class="tile learn" href="#/learn"><span>📘</span><b>${isTa ? 'கற்றல்' : 'Learn'}</b><small>${isTa ? `${doneLessonsCount}/${availableLessons} பாடங்கள்` : `${doneLessonsCount} of ${availableLessons} lesson${availableLessons === 1 ? '' : 's'}`}</small></a>` : ''}
      ${isOn('practice') ? `<a class="tile practice" href="#/practice"><span>🎯</span><b>${isTa ? 'பயிற்சி' : 'Practise'}</b><small>${isTa ? `லெவல் ${Math.min(state.unlocked, playableMax())} தயார்` : `Level ${Math.min(state.unlocked, playableMax())} open`}</small></a>` : ''}
      ${isOn('play') ? `<a class="tile play" href="#/play"><span>🎮</span><b>${isTa ? 'விளையாட்டு' : 'Play'}</b><small>${isTa ? `${availableGames} மணி விளையாட்டு${availableGames === 1 ? '' : 'கள்'}` : `${availableGames} bead game${availableGames === 1 ? '' : 's'}`}</small></a>` : ''}
      ${examsOpen() ? `<a class="tile tests" href="#/tests"><span>📝</span><b>${isTa ? 'தேர்வுகள்' : 'Tests'}</b><small>${testLine()}</small></a>` : ''}
      ${isOn('freePlay') ? `<a class="tile free ${freePlayOpen ? '' : 'locked'}" href="#/free"><span>${freePlayOpen ? '✋' : '🔒'}</span><b>${isTa ? 'சுய பயிற்சி' : 'Free Play'}</b><small>${freePlayOpen ? (isTa ? 'மணிகளை நகர்த்தி பழகு' : 'Just move beads') : (isTa ? 'பூட்டப்பட்டுள்ளது' : 'Locked')}</small></a>` : ''}
    </nav>
    ${isOn('stickers') ? `<a class="sticker-link" href="#/stickers"><span>🏅</span><b>${isTa ? 'என் ஸ்டிக்கர்கள்' : 'My Stickers'}</b><em>${earned().length}/${STICKERS.length}</em></a>` : ''}
    <a class="grownups" href="#/parents">👨‍👩‍👧 ${isTa ? 'பெற்றோருக்கான பகுதி' : 'Grown-ups corner'}</a>` });
  const guestBtn = $('#guestUpgradeBtn');
  if (guestBtn) {
    guestBtn.onclick = () => showConversionPrompt({ onSuccessAuth: () => route() });
  }
  setTimeout(() => say(voiceLang() === 'ta'
    ? (m.kind === 'lesson' ? V('missionLearn', m.voiceTitle) : V('missionPractise', m.voiceTitle))
    : V('hello', state.profile.name, m.say)), 250);
}

function free() {
  const isTa = lang() === 'ta';
  shell({ title: isTa ? 'சுய பயிற்சி' : 'Free Play', back: '#/home', body: `
    ${bubble(T('freePlay'), 'happy')}
    <div data-abacus></div>
    <div class="row center"><button class="btn" id="clear">↺ ${isTa ? 'அழி' : 'Clear'}</button><button class="btn" id="rods">${isTa ? '3 ராடுகள் பயன்படுத்து' : 'Use 3 rods'}</button></div>` });

  let rods = 2;
  const build = () => {
    const v = createAbacus($('[data-abacus]'), { rods, onChange: n => { $('[data-say]').textContent = T('thatIs', n); clearTimeout(free.t); free.t = setTimeout(() => say(String(n)), 350); } });
    $('#clear').onclick = () => { v.set(0); $('[data-say]').textContent = T('allClear'); };
  };
  build();
  $('#rods').onclick = e => {
    rods = rods === 2 ? 3 : 2;
    e.currentTarget.textContent = isTa
      ? (rods === 2 ? '3 ராடுகள் பயன்படுத்து' : '2 ராடுகள் பயன்படுத்து')
      : (rods === 2 ? 'Use 3 rods' : 'Use 2 rods');
    build();
  };
}

// ---------- Learn ----------
function learnMap() {
  const isTa = lang() === 'ta';
  const known = state.profile.experience === 'known';
  const guest = isGuestUser();
  shell({ title: isTa ? 'கற்றல்' : 'Learn', back: '#/home', body: `
    ${bubble(T('pickLesson'), 'happy')}
    <ol class="path">${LESSONS.map((l, i) => {
      const allowed = lessonAllowed(l.id);
      const done = lessonDone(l.id);
      const open = allowed && (known || i === 0 || lessonDone(LESSONS[i - 1].id));
      const next = open && !done;
      const guestLocked = guest && l.id > 1;
      return `<li class="stone ${done ? 'done' : ''} ${next ? 'next' : ''} ${open ? '' : 'locked'}">
        <a ${open ? `href="#/lesson/${l.id}"` : guestLocked ? `data-guest-locked-lesson="${l.id}" href="javascript:void(0)"` : 'href="#/starter"'}>
          <span class="stone-emoji">${open ? l.emoji : '🔒'}</span>
          <span><small>${isTa ? `பாடம் ${l.id}` : `Lesson ${l.id}`}</small><b>${esc(lessonTitle(l))}</b></span>
          <span class="stone-end">${done ? '✅' : next ? '▶' : ''}</span>
        </a></li>`;
    }).join('')}</ol>` });

  $$('[data-guest-locked-lesson]').forEach(el => {
    el.onclick = (e) => {
      e.preventDefault();
      showConversionPrompt({ onContinueGuest: () => go('#/learn'), onSuccessAuth: () => route() });
    };
  });
}

function lesson(id) {
  const L = LESSONS.find(l => l.id === id); if (!L) return go('#/learn');
  if (isGuestUser() && id > 1) {
    showConversionPrompt({ onContinueGuest: () => go('#/learn'), onSuccessAuth: () => route() });
    return;
  }
  if (!lessonAllowed(id)) return go('#/starter', { replace: true });
  let i = 0; const t = currentToken();
  shell({ title: lessonTitle(L), back: '#/learn', body: `<div class="progress"><i style="width:0"></i></div><div data-step></div>`, cls: 'lesson' });


  function finish() {
    const isTa = lang() === 'ta';
    const first = !lessonDone(id);
    if (first) { state.lessonsDone.push(id); L.unlocks.forEach(lv => { state.unlocked = Math.max(state.unlocked, lv); }); markDay(); save(); }
    sfx.star(); confetti();
    const maxLsn = maxLessonAllowed();
    const nextL = LESSONS.find(l => l.id === id + 1 && l.id <= maxLsn);
    const lv = L.unlocks[0];
    const canNextLv = lv && levelAllowed(lv);
    $('.progress i').style.width = '100%';
    $('[data-step]').innerHTML = `
      <section class="done-card">
        ${babi('cheer', 'big bob')}
        <h2 class="display">${isTa ? 'பாடம் முடிந்தது!' : 'Lesson done!'}</h2>
        <p class="lead">${isTa ? `<b>${esc(lessonTitle(L))}</b> கற்றுக்கொண்டீர்கள். ${first ? 'ஒரு நட்சத்திரம் கிடைத்தது ★' : ''}` : `You learned <b>${esc(lessonTitle(L))}</b>. ${first ? 'You earned a star ★' : ''}`}</p>
        ${lv ? `<p class="unlock">${isTa ? `🎯 பயிற்சி லெவல் ${lv} திறக்கப்பட்டது!` : `🎯 Practice Level ${lv} is open!`}</p>` : ''}
        <div class="stack">
          ${canNextLv ? `<a class="btn primary wide" href="#/level/${lv}">${isTa ? 'இப்போதே பயிற்சி செய் →' : 'Practise it now →'}</a>` : ''}
          ${nextL ? `<a class="btn ${canNextLv ? '' : 'primary'} wide" href="#/lesson/${nextL.id}">${isTa ? 'அடுத்த பாடம்:' : 'Next lesson:'} ${esc(lessonTitle(nextL))}</a>` : ''}
          <a class="btn ghost wide" href="#/home">${isTa ? 'முகப்பு' : 'Home'}</a>
        </div>
      </section>`;
    say(V('lessonDone', state.profile.name));
  }

  function step() {
    if (!alive(t)) return;
    if (i >= L.steps.length) return finish();
    const s = L.steps[i];
    $('.progress i').style.width = `${(i / L.steps.length) * 100}%`;
    const box = $('[data-step]');
    const nextBtn = (label = 'Next →', hidden = false) => {
      const lbl = (lang() === 'ta' && label === 'Next →') ? 'அடுத்து →' : label;
      return `<button class="btn primary wide" data-next ${hidden ? 'hidden' : ''}>${lbl}</button>`;
    };
    const bindNext = () => { const b = $('[data-next]'); if (b) b.onclick = () => { sfx.tap(); stopTalking(); i++; step(); }; };
    const showNext = () => { const b = $('[data-next]'); if (b) { b.hidden = false; b.focus({ preventScroll: true }); } };

    const line = (lang() === 'ta' && s.ta) || s.say;
    const voiceLine = (voiceLang() === 'ta' && s.ta) || s.say;
    if (s.t === 'talk') {
      box.innerHTML = `${bubble(line)}<div data-abacus></div>${nextBtn()}`;
      const v = createAbacus($('[data-abacus]'), { rods: s.rods, value: s.value, interactive: false });
      v.showParts(!!s.parts); if (s.highlight != null) v.highlight(s.highlight);
      bindNext(); say(voiceLine);
    }

    if (s.t === 'build') {
      box.innerHTML = `${bubble(line)}<div class="goal">${lang() === 'ta' ? `<b>${s.target}</b> உருவாக்கு` : `Make <b>${s.target}</b>`}</div><div data-abacus></div>
        <div class="row center"><button class="btn" data-help>🙋 ${lang() === 'ta' ? 'எனக்கு காட்டு' : 'Show me'}</button></div>${nextBtn('Next →', true)}`;
      let done = false;
      const v = createAbacus($('[data-abacus]'), { rods: s.rods, onChange: n => {
        if (done) return;
        if (n === s.target) { done = true; v.lock(); $('[data-help]').hidden = true; v.celebrate(); sfx.good(); setBubble(`${T('praise')} ${T('thatIs', s.target)}`, 'cheer', true, `${V('praise')} ${V('thatIs', s.target)}`); showNext(); }
      } });
      $('[data-help]').onclick = async () => {
        if (done) return; v.lock(); v.set(s.target); v.celebrate(); setBubble(T('lookThisIs', s.target), 'talk', true, V('lookThisIs', s.target));
        await wait(2200); if (!alive(t) || done) return; v.set(0); v.lock(false);
      };
      bindNext(); say(voiceLine);
    }

    if (s.t === 'read') {
      box.innerHTML = `${bubble(line, 'think')}<div data-abacus></div>
        <div class="options">${s.options.map(o => `<button class="opt" data-opt="${o}">${o}</button>`).join('')}</div>${nextBtn('Next →', true)}`;
      const v = createAbacus($('[data-abacus]'), { rods: s.rods, value: s.value, interactive: false, readout: false, digits: false });
      $$('[data-opt]').forEach(b => b.onclick = () => {
        if (+b.dataset.opt === s.value) { $$('[data-opt]').forEach(x => x.disabled = true); b.classList.add('right'); sfx.good(); v.celebrate(); setBubble(`${T('praise')} ${T('itIs', s.value)}`, 'cheer', true, `${V('praise')} ${V('itIs', s.value)}`); showNext(); }
        else { b.classList.add('wrong'); b.disabled = true; sfx.oops(); setBubble(T('countAgain'), 'think', true, V('countAgain')); }
      });
      bindNext(); say(voiceLine);
    }

    if (s.t === 'demo') {
      box.innerHTML = `${bubble(line)}<div class="equation">${s.a} ${sign(s.op)} ${s.b}</div><div data-abacus></div>
        <div class="row center"><button class="btn primary" data-play>▶ ${lang() === 'ta' ? 'பாபி பண்றத பாரு' : 'Watch Babi'}</button></div>${nextBtn('Next →', true)}`;
      const v = createAbacus($('[data-abacus]'), { rods: 2, value: s.a, interactive: false });
      $('[data-play]').onclick = async e => {
        const btn = e.currentTarget; btn.disabled = true;
        const ok = await playDemo(v, s.a, s.b, s.op, $('[data-say]'), t);
        if (!ok) return; btn.disabled = false; btn.textContent = lang() === 'ta' ? '↺ திரும்ப பாரு' : '↺ Watch again'; showNext();
      };
      bindNext(); say(voiceLine);
    }

    if (s.t === 'solve') {
      const answer = s.op === 'add' ? s.a + s.b : s.a - s.b;
      box.innerHTML = `${bubble(line)}<div class="equation">${s.a} ${sign(s.op)} ${s.b} = <b>?</b></div><div data-abacus></div>
        <div class="row center"><button class="btn" data-reset>↺ ${lang() === 'ta' ? 'மீட்டமை' : 'Reset'}</button><button class="btn" data-show>🙋 ${lang() === 'ta' ? 'எனக்கு காட்டு' : 'Show me'}</button><button class="btn primary" data-check>✓ ${lang() === 'ta' ? 'சரிபார்' : 'Check'}</button></div>${nextBtn('Next →', true)}`;
      let tries = 0;
      const v = createAbacus($('[data-abacus]'), { rods: 2, value: s.a });
      $('[data-reset]').onclick = () => { v.set(s.a); sfx.tap(); };
      $('[data-show]').onclick = async () => {
        $$('.row button').forEach(b => b.disabled = true);
        const ok = await playDemo(v, s.a, s.b, s.op, $('[data-say]'), t, 1300);
        if (!ok) return; await wait(1400); if (!alive(t)) return;
        v.set(s.a); v.lock(false); $$('.row button').forEach(b => b.disabled = false); setBubble(T('likeBabi'), 'happy', true, V('likeBabi'));
      };
      $('[data-check]').onclick = () => {
        if (v.value === answer) {
          v.lock(); v.celebrate(); sfx.good(); $$('.row button').forEach(b => b.disabled = true);
          setBubble(`${T('praise')} ${T('sumIs', s.a, sign(s.op), s.b, answer)}`, 'cheer', true, `${V('praise')} ${V('sumIs', s.a, sign(s.op), s.b, answer)}`); showNext();
        } else {
          tries++; v.shake(); sfx.oops();
          const hint = T('step', planMoves(s.a, s.b, s.op).steps[0]);
          setBubble(tries === 1 ? `${T('tryAgain')} ${T('wrongValue', v.value)}` : T('clue', hint), 'think', true, tries === 1 ? `${V('tryAgain')} ${V('wrongValue', v.value)}` : V('clue', V('step', planMoves(s.a, s.b, s.op).steps[0])));
          if (tries >= 1) $('[data-show]').classList.add('pulse');
        }
      };
      bindNext(); say(voiceLine);
    }

    if (s.t === 'friends') {
      const big = s.kind === 'big', total = big ? 10 : 5;
      const pairs = big ? [[1, 9], [2, 8], [3, 7], [4, 6], [5, 5]] : [[1, 4], [2, 3]];
      const qs = big ? [7, 4, 2] : [3, 1];
      let q = 0;
      box.innerHTML = `${bubble(line, 'happy')}
        <div class="friends ${big ? 'big' : ''}">${pairs.map(([x, y]) => `<div class="pair"><span class="dots">${'●'.repeat(x)}</span><b>${x}</b><em>+</em><b>${y}</b><span class="dots b">${'●'.repeat(y)}</span><strong>= ${total}</strong></div>`).join('')}</div>
        <div class="quiz"><p data-q></p><div class="options" data-opts></div></div>${nextBtn('Next →', true)}`;
      const ask = () => {
        const n = qs[q], right = total - n;
        const opts = [...new Set([right, (right % (total - 1)) + 1, total - right === right ? right + 1 : total - right])].slice(0, 3).sort(() => Math.random() - .5);
        while (opts.length < 3) { const r = 1 + Math.floor(Math.random() * (total - 1)); if (!opts.includes(r)) opts.push(r); }
        $('[data-q]').textContent = T('friendQ', s.kind, n);
        $('[data-opts]').innerHTML = opts.map(o => `<button class="opt" data-opt="${o}">${o}</button>`).join('');
        $$('[data-opt]').forEach(b => b.onclick = () => {
          if (+b.dataset.opt === right) {
            b.classList.add('right'); sfx.good(); $$('[data-opt]').forEach(x => x.disabled = true);
            setBubble(`${T('praise')} ${T('friendRight', n, right, total)}`, 'cheer', true, `${V('praise')} ${V('friendRight', n, right, total)}`);
            q++; if (q < qs.length) setTimeout(() => alive(t) && ask(), 1100); else showNext();
          } else { b.classList.add('wrong'); b.disabled = true; sfx.oops(); setBubble(T('friendHint', n, total), 'think', true, V('friendHint', n, total)); }
        });
      };
      ask(); bindNext(); say(voiceLine);
    }
  }
  step();
}

// ---------- Practice ----------
function practiceMap() {
  const isTa = lang() === 'ta';
  const guest = isGuestUser();
  shell({ title: isTa ? 'பயிற்சி' : 'Practise', back: '#/home', body: `
    ${bubble(T('pickLevel'), 'happy')}
    <div class="levels">${LEVELS.slice(1).map(L => {
      const open = levelAllowed(L.id);
      const guestLocked = guest && L.id > 1;
      const paywall = !guest && !open && L.id > freeMax();
      const rec = state.levels[L.id];
      return `<a class="level ${open ? '' : 'locked'} ${L.id === state.unlocked ? 'current' : ''}" ${
        open ? `href="#/level/${L.id}"` :
        guestLocked ? `data-guest-locked-level="${L.id}" href="javascript:void(0)"` :
        paywall ? 'href="#/starter"' : 'aria-disabled="true"'
      }>
        <span class="lv-emoji">${open ? L.emoji : guestLocked || paywall ? '🔐' : '🔒'}</span>
        <span class="lv-body"><small>${isTa ? `லெவல் ${L.id}` : `Level ${L.id}`}</small><b>${esc(lvName(L))}</b><em>${esc(lvTip(L))}</em></span>
        ${guestLocked || paywall ? `<strong>${isTa ? 'செலுத்தி திற' : 'Pay to unlock'}</strong>` : stars(rec?.stars || 0)}
      </a>`;
    }).join('')}</div>` });

  $$('[data-guest-locked-level]').forEach(el => {
    el.onclick = (e) => {
      e.preventDefault();
      showConversionPrompt({ onSuccessAuth: () => route() });
    };
  });
}

function levelIntro(id) {
  const isTa = lang() === 'ta';
  const L = LEVELS[id]; if (!L) return go('#/practice');
  if (isGuestUser() && id > 1) {
    showConversionPrompt({ onContinueGuest: () => go('#/practice'), onSuccessAuth: () => route() });
    return;
  }
  if (!levelAllowed(id)) return go('#/starter', { replace: true }); // backward compat: if (!levelAllowed(id)) return go('#/unlock')
  const needLesson = LESSON_FOR_LEVEL[id], lessonNeeded = needLesson && !lessonDone(needLesson);
  const LL = LESSONS.find(l => l.id === needLesson);
  shell({ title: isTa ? `லெவல் ${id}` : `Level ${id}`, back: '#/practice', body: `
    <section class="intro card">
      <div class="lv-big">${L.emoji}</div>
      <p class="eyebrow">${isTa ? `லெவல் ${id}` : `Level ${id}`}</p>
      <h2 class="display">${esc(lvName(L))}</h2>
      <p class="lead">${esc(lvTip(L))}</p>
      <p class="muted">${isTa ? '8 கணக்குகள் · மணிகளால் பதிலை உருவாக்கவும்' : '8 sums · build each answer with beads'}</p>
      ${lessonNeeded ? `<div class="notice">${babi('think')}<p>${isTa ? `இதுல ஒரு புது வித்தை இருக்கு! முதல்ல பாபி <b>${esc(lessonTitle(LL))}</b> கற்றுக்கொடுப்பார்.` : `This uses a new trick! Babi can teach <b>${esc(lessonTitle(LL))}</b> first.`}</p></div>
        <a class="btn primary wide" href="#/lesson/${needLesson}">📘 ${isTa ? 'முதலில் வித்தையை கற்றுக்கொள்' : 'Learn the trick first'}</a>
        <button class="btn wide" data-start>${isTa ? 'தயார் — ஆரம்பிக்கலாம்' : "I'm ready — start"}</button>`
      : `<button class="btn primary wide" data-start>${isTa ? 'ஆரம்பி ▶' : 'Start ▶'}</button>`}
    </section>` });
  $('[data-start]').onclick = (e) => { e.currentTarget.disabled = true; practice(id); };
  say(V('levelIntro', id, voiceLang() === 'ta' ? (L.nameTa || L.name) : L.name, voiceLang() === 'ta' ? (L.tipTa || L.tip) : L.tip));
}

function practice(id) {
  const L = LEVELS[id], t = newToken(); clearTimers();
  const session = makeSession(id, 8, Math.random, state.recent);
  let idx = 0, firstTry = 0, tries = 0, helped = false;
  const started = Date.now(); const results = [];
  markDay();
  shell({ title: lvName(L), back: `#/practice`, cls: 'practice', body: `
    <div class="dots" data-dots>${session.map(() => '<i></i>').join('')}</div>
    <div class="equation big" data-eq></div>
    <p class="muted center" data-start-note></p>
    <div data-abacus></div>
    <div class="row center">
      <button class="btn" data-reset>↺ ${lang() === 'ta' ? 'மீட்டமை' : 'Reset'}</button>
      <button class="btn" data-help>💡 ${lang() === 'ta' ? 'உதவி' : 'Help'}</button>
      <button class="btn primary" data-check>✓ ${lang() === 'ta' ? 'சரிபார்' : 'Check'}</button>
    </div>
    ${bubble(T('buildAnswer'), 'happy')}
    <ol class="plan" data-plan hidden></ol>` });

  const v = createAbacus($('[data-abacus]'), { rods: 2 });
  const buttons = () => $$('.row button');

  function show() {
    const p = session[idx]; tries = 0; helped = false;
    $('[data-eq]').innerHTML = `${p.a} ${sign(p.op)} ${p.b} = <b>?</b>`;
    $('[data-start-note]').textContent = T('babiPut', p.a, p.op, p.b);
    $('[data-plan]').hidden = true;
    v.set(p.a); v.lock(false); v.highlight(null);
    buttons().forEach(b => { b.disabled = false; b.classList.remove('pulse'); });
    $$('[data-dots] i').forEach((d, k) => d.classList.toggle('now', k === idx));
    setBubble(`${p.a} ${sign(p.op)} ${p.b} = ?`, 'talk', true, `${p.a} ${sign(p.op)} ${p.b}`);
  }

  async function watch() {
    const p = session[idx]; helped = true;
    buttons().forEach(b => b.disabled = true);
    const ok = await playDemo(v, p.a, p.b, p.op, $('[data-say]'), t, 1300);
    if (!ok) return; await wait(1500); if (!alive(t)) return;
    v.set(p.a); v.lock(false); buttons().forEach(b => b.disabled = false);
    setBubble(T('yourTurn'), 'happy', true, V('yourTurn'));
  }

  $('[data-reset]').onclick = () => { v.set(session[idx].a); sfx.tap(); };
  $('[data-help]').onclick = () => {
    const p = session[idx]; helped = true;
    const plan = planMoves(p.a, p.b, p.op);
    const list = $('[data-plan]');
    list.innerHTML = plan.steps.map(st => `<li>${esc(T('step', st))}</li>`).join('') + `<li class="watch"><button class="btn small" data-watch>▶ ${lang() === 'ta' ? 'பாபி பண்றத பாரு' : 'Watch Babi do it'}</button></li>`;
    list.hidden = false; $('[data-watch]').onclick = watch;
    setBubble(T('step', plan.steps[0]), 'talk', true, V('step', plan.steps[0]));
  };
  $('[data-check]').onclick = async () => {
    const p = session[idx];
    if (v.value === p.answer) {
      const clean = tries === 0 && !helped; if (clean) firstTry++;
      results.push(clean); recordAnswer(p, clean);
      $$('[data-dots] i')[idx].classList.add(clean ? 'gold' : 'ok');
      v.lock(); v.celebrate(); sfx.good(); buttons().forEach(b => b.disabled = true);
      setBubble(`${T('praise')} ${T('sumIs', p.a, sign(p.op), p.b, p.answer)}`, 'cheer', true, `${V('praise')} ${V('sumIs', p.a, sign(p.op), p.b, p.answer)}`);
      await wait(1300); if (!alive(t)) return;
      idx++; if (idx < session.length) show(); else end();
    } else {
      tries++; v.shake(); sfx.oops();
      if (tries === 1) { recordMistake(p, v.value); setBubble(T('wrongSum', v.value, p.a, sign(p.op), p.b), 'think', true, V('wrongSum', v.value, p.a, sign(p.op), p.b)); }
      else if (tries === 2) { setBubble(T('clue', T('step', planMoves(p.a, p.b, p.op).steps[0])), 'think', true, V('clue', V('step', planMoves(p.a, p.b, p.op).steps[0]))); $('[data-help]').classList.add('pulse'); }
      else { setBubble(T('watchTogether'), 'happy', true, V('watchTogether')); watch(); }
    }
  };
  show();

  function end() {
    const isTa = lang() === 'ta';
    const s = starsFor(firstTry, session.length);
    const rec = state.levels[id] || { stars: 0, best: 0, plays: 0 };
    rec.plays++; rec.stars = Math.max(rec.stars, s); rec.best = Math.max(rec.best, firstTry); state.levels[id] = rec;
    state.stats.seconds += Math.min(1800, Math.round((Date.now() - started) / 1000));
    let unlockedNew = false;
    if (s >= 1 && id === state.unlocked && id < MAX_LEVEL) { state.unlocked = id + 1; unlockedNew = true; }
    const canNext = id < MAX_LEVEL && levelAllowed(id + 1);
    const needsUnlock = s >= 1 && id < MAX_LEVEL && !canNext && (id + 1 > freeMax());
    saveNow();
    if (s >= 2) { sfx.star(); confetti(); } else sfx.good();
    const msg = T('resultMsg', s);
    const continueLabel = lang() === 'ta'
      ? `லெவல் ${id + 1}க்கு தொடரவும் →`
      : `Continue to Level ${id + 1} →`;
    const nextLabel = lang() === 'ta' ? 'அடுத்த லெவல் →' : 'Next level →';
    const unlockNote = lang() === 'ta'
      ? `🌟 லெவல் ${id} முடிச்சாச்சு! லெவல் ${id + 1}க்கு போகலாமா?`
      : `🌟 Level ${id} complete! Ready for Level ${id + 1}?`;

    $('.view').innerHTML = `
      <section class="done-card">
        ${babi(s ? 'cheer' : 'happy', 'big bob')}
        <h2 class="display">${msg}</h2>
        <div class="big-stars">${stars(s)}</div>
        <p class="lead">${isTa ? `முதல் முயற்சியிலேயே ${session.length}ல் <b>${firstTry}</b> சரி` : `<b>${firstTry}</b> of ${session.length} right on the first try`}</p>
        ${unlockedNew && canNext ? `<p class="unlock">${isTa ? `🎉 லெவல் ${id + 1}: ${esc(lvName(LEVELS[id + 1]))} திறக்கப்பட்டது!` : `🎉 Level ${id + 1}: ${esc(lvName(LEVELS[id + 1]))} is open!`}</p>` : ''}
        ${needsUnlock ? `<p class="unlock">${unlockNote}</p>` : ''}
        <div class="stack">
          ${canNext ? `<a class="btn primary wide" href="#/level/${id + 1}">${nextLabel}</a>` : ''}
          ${needsUnlock ? `<a class="btn primary wide" href="#/unlock">${continueLabel}</a>` : ''}
          <button class="btn ${canNext || needsUnlock ? '' : 'primary'} wide" data-again>↺ ${lang() === 'ta' ? 'இந்த லெவலை திரும்ப விளையாடு' : 'Play this level again'}</button>
          <a class="btn ghost wide" href="#/home">${lang() === 'ta' ? 'முகப்பு' : 'Home'}</a>
        </div>
      </section>`;
    $('[data-again]').onclick = () => practice(id);
    say(V('resultMsg', s));
  }
}

// Quick check for kids who already know the abacus.
function check() {
  const t = newToken(); clearTimers();
  const probe = [1, 3, 5, 6, 8, 9];
  const qs = probe.map(l => ({ l, ...makeSession(l, 1)[0] }));
  let idx = 0; let passedUntil = 0; let failed = false;
  shell({ title: lang() === 'ta' ? 'விரைவு சோதனை' : 'Quick Check', back: '#/home', body: `
    ${bubble(T('quickCheck'), 'happy')}
    <div class="dots" data-dots>${qs.map(() => '<i></i>').join('')}</div>
    <div class="equation big" data-eq></div>
    <div data-abacus></div>
    <div class="row center"><button class="btn" data-reset>↺ ${lang() === 'ta' ? 'மீட்டமை' : 'Reset'}</button><button class="btn" data-skip>${lang() === 'ta' ? 'தெரியவில்லை' : "I don't know"}</button><button class="btn primary" data-check>✓ ${lang() === 'ta' ? 'சரிபார்' : 'Check'}</button></div>` });

  const v = createAbacus($('[data-abacus]'), { rods: 2 });
  const show = () => { const p = qs[idx]; $('[data-eq]').innerHTML = `${p.a} ${sign(p.op)} ${p.b} = <b>?</b>`; v.set(p.a); $$('[data-dots] i').forEach((d, k) => d.classList.toggle('now', k === idx)); say(`${p.a} ${sign(p.op)} ${p.b}`); };
  const next = ok => {
    $$('[data-dots] i')[idx].classList.add(ok ? 'gold' : 'miss');
    if (ok && !failed) passedUntil = qs[idx].l; else failed = true;
    idx++;
    if (idx < qs.length && !failed) return show();
    const maxLvl = playableMax();
    const lvl = Math.max(1, Math.min(maxLvl, passedUntil ? passedUntil + 1 : 1));
    state.unlocked = Math.max(state.unlocked, lvl);
    // lessons before that level count as known, strictly capped by tier limits
    LESSONS.forEach(l => { if (canAccessLesson(l.id) && l.unlocks.length && Math.max(...l.unlocks) < lvl + 0 && !lessonDone(l.id)) state.lessonsDone.push(l.id); });
    if (lvl > 1) [1, 2, 3, 4, 5, 6].filter(k => canAccessLesson(k)).forEach(k => { if (!lessonDone(k)) state.lessonsDone.push(k); });
    markDay(); saveNow(); sfx.star(); confetti();
    const isTa = lang() === 'ta';
    $('.view').innerHTML = `<section class="done-card">${babi('cheer', 'big bob')}<h2 class="display">${isTa ? `அருமை, ${kidName()}!` : `Nice, ${kidName()}!`}</h2>
      <p class="lead">${isTa ? `நீங்க <b>லெவல் ${lvl}: ${esc(lvName(LEVELS[lvl]))}</b>ல ஆரம்பிக்கலாம்.` : `You can start at <b>Level ${lvl}: ${esc(lvName(LEVELS[lvl]))}</b>.`}</p>
      <div class="stack"><a class="btn primary wide" href="#/level/${lvl}">${isTa ? `லெவல் ${lvl} ஆரம்பி →` : `Start Level ${lvl} →`}</a><a class="btn ghost wide" href="#/home">${isTa ? 'முகப்பு' : 'Home'}</a></div></section>`;
    say(V('startAt', lvl));
  };
  $('[data-reset]').onclick = () => v.set(qs[idx].a);
  $('[data-skip]').onclick = () => next(false);
  $('[data-check]').onclick = () => { const ok = v.value === qs[idx].answer; ok ? sfx.good() : sfx.oops(); next(ok); };
  show();
}

// ---------- Grown-ups ----------
function parents() {
  const a = 3 + Math.floor(Math.random() * 6), b = 4 + Math.floor(Math.random() * 5), ans = a * b;
  const opts = [ans, ans + a, ans - b].sort(() => Math.random() - .5);
  shell({ title: 'Grown-ups', back: '#/home', body: `
    <section class="card intro">
      <p class="eyebrow">For parents & teachers</p>
      <h2 class="display">Quick grown-up check</h2>
      <p class="lead">What is ${a} × ${b}?</p>
      <div class="options">${opts.map(o => `<button class="opt" data-gate="${o}">${o}</button>`).join('')}</div>
    </section>` });
  $$('[data-gate]').forEach(btn => btn.onclick = () => +btn.dataset.gate === ans ? (btn.disabled = true, dashboard()) : (btn.classList.add('wrong'), btn.disabled = true));
}

function dashboard() {
  const isTa = lang() === 'ta';
  const st = state.stats;
  const acc = st.answered ? Math.round((st.firstTry / st.answered) * 100) : 0;
  const ruleName = { direct: 'Simple beads', small: 'Little Friends (5)', big: 'Big Friends (10)' };
  const rules = Object.entries(st.byRule).map(([k, [c, n]]) => ({ k, c, n, pct: n ? Math.round((c / n) * 100) : null }));
  const weak = rules.filter(r => r.n >= 4).sort((x, y) => x.pct - y.pct)[0];
  const week = Array.from({ length: 7 }, (_, k) => { const d = new Date(); d.setDate(d.getDate() - (6 - k)); const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; return { on: st.days.includes(key), label: d.toLocaleDateString('en', { weekday: 'narrow' }) }; });
  const mins = Math.round(st.seconds / 60);
  let tip = 'Start with the Learn path — lessons are 2–3 minutes each.';
  if (st.answered >= 8) tip = weak && weak.pct < 70 ? `Focus on ${ruleName[weak.k]}: ${weak.pct}% first-try. Ask ${esc(state.profile.name)} to say the friend pair out loud before moving beads.` : `Doing well! Try Bead Race for speed, then move to Level ${Math.min(state.unlocked, MAX_LEVEL)}.`;

  shell({ title: 'Grown-ups', back: '#/home', cls: 'parents', body: `
    <section class="card">
      <p class="eyebrow">Progress for ${esc(state.profile.avatar)} ${kidName()}</p>
      <div class="kpis">
        <div><b>${state.lessonsDone.length}/${LESSONS.length}</b><small>lessons</small></div>
        <div><b>${Math.min(state.unlocked, MAX_LEVEL)}</b><small>current level</small></div>
        <div><b>${acc}%</b><small>first-try right</small></div>
        <div><b>${mins}</b><small>minutes practised</small></div>
      </div>
      <p class="tip">💡 ${tip}</p>
    </section>
    <section class="card">
      <h3>This week</h3>
      <div class="week">${week.map(d => `<span class="${d.on ? 'on' : ''}"><i></i>${d.label}</span>`).join('')}</div>
    </section>
    <section class="card">
      <h3>Tricks</h3>
      ${rules.map(r => `<div class="bar-row"><span>${ruleName[r.k]}</span><div class="bar"><i style="width:${r.pct ?? 0}%"></i></div><b>${r.pct == null ? '—' : r.pct + '%'}</b></div><p class="muted tiny">${r.n} sums tried</p>`).join('')}
    </section>
    <section class="card">
      <h3>Levels</h3>
      <div class="lv-table">${LEVELS.slice(1).map(L => `<div class="${L.id > state.unlocked ? 'dim' : ''}"><span>${L.id}. ${esc(L.name)}</span>${stars(state.levels[L.id]?.stars || 0)}</div>`).join('')}</div>
    </section>
    ${state.exams.length ? `<section class="card">
      <h3>Tests & exams</h3>
      <div class="lv-table">${state.exams.slice(0, 8).map(r => `<div><span>${esc(r.title)} · ${new Date(r.at).toLocaleDateString()}</span><b>${r.pct}% ${r.passed ? '✅' : ''}</b></div>`).join('')}</div>
    </section>` : ''}
    <section class="card">
      <h3>Recent mix-ups</h3>
      ${st.mistakes.length ? `<ul class="mistakes">${st.mistakes.slice(0, 6).map(m => `<li><b>${esc(m.q)} = ${m.answer}</b><span>built ${m.given}</span><em>${ruleName[m.rule] || ''}</em></li>`).join('')}</ul>` : '<p class="muted">No mix-ups yet.</p>'}
    </section>
    <section class="card settings">
      <h3>Settings</h3>
      <label class="switch"><input type="checkbox" id="setSound" ${state.settings.sound ? 'checked' : ''}> Sound effects</label>
      <label class="switch"><input type="checkbox" id="setVoice" ${state.settings.voice ? 'checked' : ''}> Babi talks out loud</label>
      <label for="setVoiceLang">Babi audio</label>
      <div class="two" id="setVoiceLang">
        <button type="button" class="choice ${state.profile.voiceLang !== 'ta' ? 'on' : ''}" data-setvoice-lang="en"><b>English audio</b></button>
        <button type="button" class="choice ${state.profile.voiceLang === 'ta' ? 'on' : ''}" data-setvoice-lang="ta"><b>Tamil audio</b></button>
      </div>
      <label for="setContentLang">Screen content</label>
      <div class="two" id="setContentLang">
        <button type="button" class="choice ${state.profile.lang !== 'ta' ? 'on' : ''}" data-setcontent-lang="en"><b>English content</b></button>
        <button type="button" class="choice ${state.profile.lang === 'ta' ? 'on' : ''}" data-setcontent-lang="ta"><b>Tamil content</b></button>
      </div>
      <p class="muted tiny">Choose them independently. Example: Tamil audio + English content. ${hasVoice('ta') ? '' : 'This phone has no Tamil voice installed.'}</p>
      <label for="setName">Child's name</label><input id="setName" maxlength="18" value="${esc(state.profile.name)}">
      <div class="row"><button class="btn" id="unlockAll">Unlock all levels</button><button class="btn danger" id="reset">Reset all progress</button></div>
    </section>
    <section class="card auth-status">
      <h3>${isGuestUser() ? (isTa ? '🎮 விருந்தினர் பயன்முறை' : '🎮 Guest Mode') : (isTa ? '👤 கணக்கு நிலை' : '👤 Account Status')}</h3>
      <p class="plan-line" style="margin:6px 0 10px;font-size:15px;"><b>${isTa ? 'உங்கள் திட்டம்' : 'Your plan'}:</b> <span id="parents-user-plan">${getPlanDescription(isTa)}</span></p>
      <div id="parents-plan-actions" style="margin:6px 0 12px;display:flex;gap:8px;flex-wrap:wrap;">${getPlanActionsHtml(isTa)}</div>
      <p class="muted tiny">${isGuestUser() ? (isTa ? 'நீங்கள் விருந்தினராக பயன்படுத்துகிறீர்கள். குழந்தையின் முன்னேற்றத்தை சேமிக்க உள்நுழையவும்.' : 'You are exploring Abacus as a guest. Sign in to save your child’s progress across devices.') : (isTa ? 'முன்னேற்றம் இணைக்கப்பட்ட கணக்கில் உள்நுழைந்துள்ளீர்கள்.' : 'Logged in with linked progress.')}</p>
      ${isGuestUser() ? `<button type="button" class="btn primary small" id="parentsAccountBtn">${isTa ? 'கணக்கு தொடங்கு / உள்நுழை' : 'Create Account / Sign In'}</button>` : ''}
    </section>
    <p class="muted center tiny">Everything is saved only on this device. No accounts, no ads.</p>` });
  const parentsBtn = $('#parentsAccountBtn');
  if (parentsBtn) parentsBtn.onclick = () => showConversionPrompt({ onSuccessAuth: () => dashboard() });
  const renewStarter = $('#renew-starter-btn');
  if (renewStarter) renewStarter.onclick = () => startCheckout('starter');
  $('#setSound').onchange = e => { state.settings.sound = e.target.checked; save(); };
  $('#setVoice').onchange = e => { state.settings.voice = e.target.checked; if (!e.target.checked) stopTalking(); save(); };
  $$('[data-setvoice-lang]').forEach(b => b.onclick = () => {
    state.profile.voiceLang = b.dataset.setvoiceLang; save();
    $$('[data-setvoice-lang]').forEach(x => x.classList.toggle('on', x === b));
    if (state.profile.voiceLang === 'ta' && !hasVoice('ta')) stopTalking(); else say(V('praise'));
  });
  $$('[data-setcontent-lang]').forEach(b => b.onclick = () => {
    state.profile.lang = b.dataset.setcontentLang; save();
    $$('[data-setcontent-lang]').forEach(x => x.classList.toggle('on', x === b));
    say(V('praise'));
  });
  $('#setName').onchange = e => { const n = e.target.value.trim(); if (n) { state.profile.name = n.slice(0, 18); save(); } };
  $('#unlockAll').onclick = e => { state.unlocked = MAX_LEVEL; save(); e.currentTarget.textContent = 'All levels open ✓'; e.currentTarget.disabled = true; };
  $('#reset').onclick = e => {
    const b = e.currentTarget;
    if (b.dataset.sure) { resetAll(); go('#/'); return; }
    b.dataset.sure = '1'; b.textContent = 'Tap again to erase everything'; setTimeout(() => { b.textContent = 'Reset all progress'; delete b.dataset.sure; }, 4000);
  };
}

// ---------- router ----------
function route() {
  newToken(); clearTimers(); stopTalking(); document.querySelectorAll('.confetti').forEach(c => c.remove());
  const hash = location.hash.replace(/^#\/?/, '');
  const [page, arg] = hash.split('/');
  // Owner Console is a separate owner-only page (owner.html); never expose it in the child router.
  if (!state.profile?.name) return welcome();
  const n = Number(arg);
  const pages = {
    '': home, home, stickers, parents, check,
    starter: starterScreen,
    free: () => {
      if (!isOn('freePlay')) return home();
      if (!canAccessFreePlay()) {
        if (isGuestUser()) {
          showConversionPrompt({ onContinueGuest: () => go('#/home'), onSuccessAuth: () => route() });
          return;
        }
        return go('#/starter', { replace: true }); // legacy: if (!canAccessFreePlay()) return go('#/unlock');
      }
      return free();
    },
    learn: () => (isOn('learn') ? learnMap() : home()),
    practice: () => (isOn('practice') ? practiceMap() : home()),
    unlock: starterScreen,
    pay,
    play: () => (isOn('play') ? playRoom() : home()),
    lesson: () => {
      if (isNaN(n) || !lessonAllowed(n)) {
        if (isGuestUser() && n > 1) {
          showConversionPrompt({ onContinueGuest: () => go('#/learn'), onSuccessAuth: () => route() });
          return;
        }
        return go('#/starter', { replace: true });
      }
      return lesson(n);
    },
    level: () => {
      if (isNaN(n) || !levelAllowed(n)) {
        if (isGuestUser() && n > 1) {
          showConversionPrompt({ onContinueGuest: () => go('#/practice'), onSuccessAuth: () => route() });
          return;
        }
        return go('#/starter', { replace: true });
      }
      return levelIntro(n);
    },
    game: () => (isOn('play') ? openGame(arg) : home()),
    tests: () => (isGuestUser() ? showConversionPrompt({ onContinueGuest: () => go('#/home'), onSuccessAuth: () => route() }) : (examsOpen() ? testCentre() : home())),
    exam: () => (isGuestUser() ? showConversionPrompt({ onContinueGuest: () => go('#/home'), onSuccessAuth: () => route() }) : runExam(arg)),
    certificates: () => (isGuestUser() ? showConversionPrompt({ onContinueGuest: () => go('#/home'), onSuccessAuth: () => route() }) : (isOn('certificates') ? certificates() : home())),
    certificate: () => (isGuestUser() ? showConversionPrompt({ onContinueGuest: () => go('#/home'), onSuccessAuth: () => route() }) : (isOn('certificates') ? certificate(n || 0) : home())),
  };
  (pages[page] || home)();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
window.addEventListener('abacus:guest-locked', () => {
  showConversionPrompt({ onSuccessAuth: () => route() });
});
setRouter(route);
// Read config.json (feature switches) first, then show the first screen.
pingVisit().catch(() => {});
loadConfig().then(async () => { await refreshEntitlement(); route(); }, route);

if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.__NO_SW__) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
