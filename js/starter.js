// #/starter plans screen (Starter ₹99 / Lifetime ₹499)
import { TIERS } from './tiers.js';
import { getTier, getEntitlement, isPaid, startCheckout, isStarterEnabled } from './payments.js';
import { shell, lang, go, esc } from './ui.js';
import { babi } from './babi.js';

export function formatPlanDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mmm = months[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${day} ${mmm} ${yyyy}`;
}

export function getPlanDescription(isTa = false) {
  const ent = getEntitlement();
  const tier = getTier();
  if (tier === 'lifetime' || (isPaid() && tier !== 'starter')) {
    return isTa ? 'ஒரே முறை கட்டணம் - எப்போதும் காலாவதியாகாது' : 'One-time payment - never expires';
  }
  if (tier === 'starter' && !ent.expired) {
    let days = 30;
    let dateStr = '';
    if (ent.expiresAt) {
      dateStr = formatPlanDate(ent.expiresAt);
      const ms = new Date(ent.expiresAt).getTime() - Date.now();
      days = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    }
    return isTa
      ? `ஸ்டார்ட்டர் - ${dateStr} வரை செல்லுபடியாகும் (${days} ${days === 1 ? 'நாள்' : 'நாட்கள்'} உள்ளன)`
      : `Starter - valid until ${dateStr} (${days} ${days === 1 ? 'day' : 'days'} left)`;
  }
  if (ent.expired || (ent.expiresAt && tier === 'free')) {
    const dateStr = formatPlanDate(ent.expiresAt);
    return isTa
      ? `ஸ்டார்ட்டர் ${dateStr} அன்று காலாவதியானது. நீங்கள் இலவச திட்டத்தில் உள்ளீர்கள்.`
      : `Starter expired on ${dateStr}. You are on the Free plan.`;
  }
  return isTa ? 'இலவச திட்டம்' : 'Free plan';
}

export function getPlanActionsHtml(isTa = false) {
  const ent = getEntitlement();
  const tier = getTier();
  if (tier === 'lifetime' || (isPaid() && tier !== 'starter')) {
    return '';
  }
  const starterAvail = isStarterEnabled();
  if (tier === 'starter' && !ent.expired) {
    if (starterAvail) {
      return `
        <button type="button" class="btn small" id="renew-starter-btn">${isTa ? 'புதுப்பிக்கவும்' : 'Renew'}</button>
        <a class="btn primary small" href="#/unlock" id="upgrade-lifetime-btn">${isTa ? 'ஒரே முறை கட்டணத்திற்கு மேம்படுத்து' : 'Upgrade to One-time payment'}</a>
      `;
    }
    return `<a class="btn small" href="#/starter" id="see-plans-btn">${isTa ? 'திட்டங்களைக் காண்க' : 'See plans'}</a>`;
  }
  // Free or expired: ONE button "See plans" (goes to the plans screen). No separate Starter button.
  return `<a class="btn small" href="#/starter" id="see-plans-btn">${isTa ? 'திட்டங்களைக் காண்க' : 'See plans'}</a>`;
}

export function starterScreen() {
  const tier = getTier();
  const ent = getEntitlement();

  // Lifetime and legacy paid users never see #/starter (redirect to #/home)
  if (tier === 'lifetime' || (isPaid() && tier !== 'starter')) {
    go('#/home', { replace: true });
    return;
  }

  const isTa = lang() === 'ta';
  const isStarterActive = tier === 'starter' && !ent.expired;

  const starterPrice = Math.round(TIERS.starter.pricePaise / 100);
  const lifetimePrice = Math.round(TIERS.lifetime.pricePaise / 100);

  const starterAvailable = isStarterEnabled();
  const starterBtnLabel = starterAvailable
    ? (isTa ? 'ஸ்டார்ட்டர் பெறுங்கள் - Rs 99' : 'Get Starter - Rs 99')
    : (isTa ? 'விரைவில் வரும்' : 'Coming soon');

  shell({
    title: isTa ? 'திட்டங்கள்' : 'Plans',
    back: '#/home',
    body: `
      <section class="card intro starter-plans">
        ${babi('happy', 'big bob')}
        <p class="eyebrow">${isTa ? 'அபாகஸ் பட்டி திட்டங்கள்' : 'Abacus Buddy Plans'}</p>
        <h2 class="display">${isTa ? 'உங்கள் கற்றல் திட்டத்தை தேர்வு செய்க' : 'Choose Your Plan'}</h2>
        <p class="lead">${isTa ? 'குழந்தைகளுக்கான எளிய கணிதப் பயிற்சி' : 'Everything you need to master the abacus'}</p>

        <div class="plan-cards">
          <!-- STARTER PLAN CARD -->
          <div class="plan-card ${isStarterActive ? 'de-emphasized' : ''}" data-plan-card="starter">
            <div class="plan-card-header">
              <span class="plan-badge">${isStarterActive ? (isTa ? 'தற்போதைய திட்டம்' : 'Current Plan') : (isTa ? 'ஸ்டார்ட்டர்' : 'Starter')}</span>
              <h3 class="plan-title">${isTa ? 'ஸ்டார்ட்டர் திட்டம்' : 'Starter'}</h3>
              <div class="plan-price">
                <b>₹${starterPrice}</b>
                <small>/ ${TIERS.starter.durationDays} ${isTa ? 'நாட்கள்' : 'days'}</small>
              </div>
            </div>
            <ul class="plan-features">
              <li>✓ ${isTa ? 'லெவல்கள் 1–6 (பயிற்சி)' : 'Levels 1–6 (Practice)'}</li>
              <li>✓ ${isTa ? 'பாடங்கள் 1–6 (கற்றல்)' : 'Lessons 1–6 (Learn)'}</li>
              <li>✓ ${isTa ? '4 விளையாட்டுகள் (பந்தயம், புதிர் எண், பொருத்து, ஃபிளாஷ்)' : '4 bead games (Race, Mystery, Match, Flash)'}</li>
              <li>✓ ${isTa ? 'சுய பயிற்சி (Free Play)' : 'Free Play'}</li>
              <li>⏱ ${isTa ? '30 நாட்கள் அணுகல்' : '30 days access'}</li>
            </ul>
            <div class="plan-action">
              <button
                type="button"
                class="btn primary wide"
                aria-label="${starterBtnLabel}"
                data-plan="starter"
                id="starter-buy-btn"
                ${starterAvailable ? '' : 'disabled'}
              >${starterBtnLabel}</button>
            </div>
            <p id="starter-error-msg" class="auth-error center tiny" style="margin-top:8px;display:none;" role="alert"></p>
          </div>

          <!-- ONE-TIME PAYMENT PLAN CARD -->
          <div class="plan-card ${isStarterActive ? 'highlight' : ''}" data-plan-card="lifetime">
            <div class="plan-card-header">
              <span class="plan-badge highlight-badge">${isStarterActive ? (isTa ? 'பரிந்துரைக்கப்படும் மேம்படுத்தல்' : 'Recommended Upgrade') : (isTa ? 'ஒரே முறை கட்டணம்' : 'Best Value')}</span>
              <h3 class="plan-title">${isTa ? 'ஒரே முறை கட்டணம்' : 'One-time payment'}</h3>
              <div class="plan-price">
                <b>₹${lifetimePrice}</b>
                <small>/ ${isTa ? 'ஒரே முறை' : 'one-time'}</small>
              </div>
              <p class="plan-subtitle muted tiny" style="margin-top:6px;line-height:1.4;">${isTa ? 'ஒரே முறை செலுத்துங்கள். அனைத்து லெவல்கள், பாடங்கள், விளையாட்டுகள் மற்றும் Free Play திறக்கப்படும். சந்தா இல்லை.' : 'Pay once. Unlocks all levels, lessons, games and Free Play. No subscription.'}</p>
            </div>
            <ul class="plan-features">
              <li>✓ ${isTa ? 'லெவல்கள் 1–15 (அனைத்து லெவல்கள்)' : 'Levels 1–15 (All levels)'}</li>
              <li>✓ ${isTa ? 'பாடங்கள் 1–11 (அனைத்து பாடங்கள்)' : 'Lessons 1–11 (All lessons)'}</li>
              <li>✓ ${isTa ? 'அனைத்து 7 விளையாட்டுகள்' : 'All 7 bead games'}</li>
              <li>✓ ${isTa ? 'சுய பயிற்சி (Free Play)' : 'Free Play'}</li>
              <li>♾ ${isTa ? 'ஒரே முறை செலுத்துங்கள் · சந்தா இல்லை' : 'Pay once · No subscription'}</li>
            </ul>
            <div class="plan-action">
              <a
                class="btn primary wide"
                href="#/unlock"
                id="lifetime-buy-btn"
                data-plan="lifetime"
              >${isTa ? `₹${lifetimePrice} செலுத்தி திறக்கவும்` : `Pay ₹${lifetimePrice} & Unlock`}</a>
            </div>
          </div>
        </div>

        <p class="plan-note muted tiny">${isTa ? 'கூப்பன்கள் ஒரே முறை கட்டணத்திற்கு மட்டுமே பொருந்தும்.' : 'Coupons apply to the One-time payment only.'}</p>
        <a class="btn ghost wide" href="#/home">${isTa ? 'இப்போது வேண்டாம்' : 'Not now'}</a>
      </section>
    `
  });

  const starterBtn = document.getElementById('starter-buy-btn');
  const errorEl = document.getElementById('starter-error-msg');
  if (starterBtn) {
    starterBtn.onclick = async () => {
      if (!isStarterEnabled()) return;
      starterBtn.disabled = true;
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
      }
      try {
        await startCheckout('starter');
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = err.message || 'Payment failed';
          errorEl.style.display = 'block';
        }
      } finally {
        starterBtn.disabled = false;
      }
    };
  }
}
