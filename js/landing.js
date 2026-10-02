/**
 * js/landing.js
 * Parent-Facing Public Home for Abacus Buddy.
 *
 * Core Concept:
 *   "Build Faster Mental-Math Skills — 10 Minutes at a Time."
 *
 * CTAs:
 *   - Primary: Try the Free Challenge
 *   - Secondary: Sign In
 *
 * Fully integrated with the existing authentication architecture:
 *   - Google Sign-In & Email/Password
 *   - Preserves canonical DOM elements (#authGateGoogleBtn, #authGateEmailBtn, #welcomeProfileStep)
 *   - Zero duplicate auth systems, strict Firebase UID canonical identity.
 */

import { trackFunnelEvent, FUNNEL_EVENTS } from './events.js';

export function renderPublicLandingHtml({ showGate = true, isTa = false } = {}) {
  // Funnel event: landing_view
  trackFunnelEvent(FUNNEL_EVENTS.LANDING_VIEW, { lang: isTa ? 'ta' : 'en' });

  return `
  <div class="landing-page" style="width:100%;max-width:100%;box-sizing:border-box;margin:0 auto;padding:0 0 4rem 0;font-family:inherit;color:#1f2937;">
    <!-- Public Header / Navigation -->
    <header style="display:flex;justify-content:space-between;align-items:center;padding:1rem 0;border-bottom:1px solid #f3f4f6;margin-bottom:1.5rem;">
      <a href="#/home" style="display:flex;align-items:center;gap:8px;text-decoration:none;color:#111827;font-weight:900;font-size:1.25rem;">
        <span style="font-size:1.75rem;">🧮</span>
        <span>Abacus Buddy</span>
      </a>
      <nav style="display:flex;align-items:center;gap:12px;">
        <a href="#auth-section" class="btn ghost" id="navSignInBtn" style="font-weight:700;font-size:0.9rem;padding:8px 14px;border:1px solid #d1d5db;border-radius:10px;text-decoration:none;color:#374151;">
          Sign In
        </a>
        <a href="#/challenge" class="btn primary" id="navChallengeBtn" style="font-weight:800;font-size:0.9rem;padding:8px 16px;background:#ffc53d;border:none;border-radius:10px;text-decoration:none;color:#1f2937;">
          Free Challenge
        </a>
      </nav>
    </header>

    <!-- Hero Section -->
    <section class="hero-section" style="text-align:center;padding:2rem 0 2.5rem 0;">
      <div style="display:inline-block;padding:6px 16px;background:#eef2ff;color:#4f46e5;border-radius:20px;font-size:0.85rem;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:1rem;">
        Parent-Approved Mental Math Routine
      </div>
      <h1 class="display" style="font-size:clamp(2rem, 5vw, 3rem);font-weight:900;line-height:1.2;color:#111827;margin:0 0 1rem 0;font-family:'Baloo 2',sans-serif;">
        Build Faster Mental-Math Skills — 10 Minutes at a Time.
      </h1>
      <p class="lead" style="font-size:1.15rem;color:#4b5563;max-width:620px;margin:0 auto 2rem auto;line-height:1.6;">
        A gentle, ad-free abacus learning companion for children aged 5–10. We turn finger-counting into spatial bead memory, building real calculation speed step-by-step.
      </p>

      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:14px;margin-bottom:1.5rem;">
        <a href="#/challenge" class="btn primary" id="heroChallengeCta" style="font-size:1.15rem;font-weight:800;padding:14px 28px;background:#ffc53d;color:#1f2937;border-radius:12px;text-decoration:none;box-shadow:0 4px 14px rgba(255,197,61,0.4);">
          🎯 Try the Free Challenge
        </a>
        <a href="#auth-section" class="btn" id="heroSignInCta" style="font-size:1.1rem;font-weight:700;padding:14px 24px;border:2px solid #e5e7eb;border-radius:12px;text-decoration:none;color:#374151;background:#fff;">
          Sign In
        </a>
      </div>
      <p style="font-size:0.85rem;color:#6b7280;margin:0;">No credit card required • Instant 10-question evaluation</p>
    </section>

    <!-- Value Grid: What, Who, How, 10 Minutes -->
    <section class="info-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(250px, 1fr));gap:20px;margin:2.5rem 0;">
      <!-- What It Is -->
      <div class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1.5rem;box-shadow:0 2px 8px rgba(0,0,0,0.03);">
        <div style="font-size:2rem;margin-bottom:0.75rem;">🧮</div>
        <h3 style="font-size:1.15rem;font-weight:800;margin:0 0 0.5rem 0;color:#111827;">What Abacus Buddy Is</h3>
        <p style="font-size:0.9rem;color:#4b5563;line-height:1.5;margin:0;">
          A digital soroban abacus designed specifically for kids. It pairs interactive bead mechanics with voice-guided lessons to help young learners visualize numbers as concrete quantities.
        </p>
      </div>

      <!-- Who It Is For -->
      <div class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1.5rem;box-shadow:0 2px 8px rgba(0,0,0,0.03);">
        <div style="font-size:2rem;margin-bottom:0.75rem;">👧👦</div>
        <h3 style="font-size:1.15rem;font-weight:800;margin:0 0 0.5rem 0;color:#111827;">Who It Is For</h3>
        <p style="font-size:0.9rem;color:#4b5563;line-height:1.5;margin:0;">
          Kids aged 5–10 who are starting arithmetic or looking to overcome calculation hesitation. Perfect for homeschoolers and parents seeking calm, structured math practice.
        </p>
      </div>

      <!-- How Children Learn -->
      <div class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1.5rem;box-shadow:0 2px 8px rgba(0,0,0,0.03);">
        <div style="font-size:2rem;margin-bottom:0.75rem;">💡</div>
        <h3 style="font-size:1.15rem;font-weight:800;margin:0 0 0.5rem 0;color:#111827;">How Children Learn</h3>
        <p style="font-size:0.9rem;color:#4b5563;line-height:1.5;margin:0;">
          We move in 3 natural stages: <b>1. Touch & Move</b> (bead handling), <b>2. Rules & Formulas</b> (friends of 5 and 10), and <b>3. Mind Abacus</b> (projecting beads mentally).
        </p>
      </div>

      <!-- Why 10 Minutes Matters -->
      <div class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1.5rem;box-shadow:0 2px 8px rgba(0,0,0,0.03);">
        <div style="font-size:2rem;margin-bottom:0.75rem;">⏱️</div>
        <h3 style="font-size:1.15rem;font-weight:800;margin:0 0 0.5rem 0;color:#111827;">Why 10 Minutes Matters</h3>
        <p style="font-size:0.9rem;color:#4b5563;line-height:1.5;margin:0;">
          Consistent daily practice develops enduring cognitive reflexes without fatigue or burnout. 10 focused minutes every day is far more effective than long, stressful weekend cram sessions.
        </p>
      </div>
    </section>

    <!-- Curriculum Highlights: Practice Levels, Lessons, Games -->
    <section class="curriculum-section" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:16px;padding:2rem 1.5rem;margin:3rem 0;">
      <div style="text-align:center;max-width:580px;margin:0 auto 1.5rem auto;">
        <h2 style="font-size:1.6rem;font-weight:800;margin:0 0 0.5rem 0;color:#111827;">Complete Learning Architecture</h2>
        <p style="font-size:0.95rem;color:#6b7280;margin:0;">Step-by-step progression from simple bead identification to multi-digit mental arithmetic.</p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;">
        <div style="background:#fff;border-radius:12px;padding:1.25rem;border:1px solid #e5e7eb;">
          <b style="font-size:1rem;color:#1f2937;">🎯 15 Practice Levels</b>
          <p style="font-size:0.85rem;color:#4b5563;margin:0.5rem 0 0 0;line-height:1.4;">
            Adaptive problem generation covering single-digit operations up to 4-row 2-digit calculations.
          </p>
        </div>
        <div style="background:#fff;border-radius:12px;padding:1.25rem;border:1px solid #e5e7eb;">
          <b style="font-size:1rem;color:#1f2937;">📘 11 Guided Lessons</b>
          <p style="font-size:0.85rem;color:#4b5563;margin:0.5rem 0 0 0;line-height:1.4;">
            Interactive story-driven lessons with Babi teaching bead values, small-friend, and big-friend formulas.
          </p>
        </div>
        <div style="background:#fff;border-radius:12px;padding:1.25rem;border:1px solid #e5e7eb;">
          <b style="font-size:1rem;color:#1f2937;">🎮 7 Arcade Bead Games</b>
          <p style="font-size:0.85rem;color:#4b5563;margin:0.5rem 0 0 0;line-height:1.4;">
            Race, Mystery, Match, Flash, Speed Read, Friend Dash, and Ladder keep daily math rewarding.
          </p>
        </div>
      </div>
    </section>

    <!-- Transparent Pricing Table -->
    <section class="pricing-section" id="pricing-section" style="margin:3.5rem 0;">
      <div style="text-align:center;max-width:580px;margin:0 auto 2rem auto;">
        <div style="display:inline-block;padding:4px 12px;background:#fef3c7;color:#92400e;border-radius:12px;font-size:0.8rem;font-weight:800;text-transform:uppercase;margin-bottom:0.5rem;">Transparent Plans</div>
        <h2 style="font-size:1.8rem;font-weight:800;margin:0 0 0.5rem 0;color:#111827;">Simple, Family-Friendly Pricing</h2>
        <p style="font-size:0.95rem;color:#6b7280;margin:0;">Start free anytime. Upgrade to Starter or Lifetime when your child is ready for more.</p>
      </div>

      <div style="border:1px solid #e5e7eb;border-radius:16px;overflow-x:auto;width:100%;box-sizing:border-box;-webkit-overflow-scrolling:touch;box-shadow:0 4px 14px rgba(0,0,0,0.04);background:#fff;">
        <table style="width:100%;min-width:360px;border-collapse:collapse;text-align:left;font-size:0.85rem;">
          <thead>
            <tr style="background:#f8fafc;border-bottom:1px solid #e5e7eb;">
              <th style="padding:14px;font-weight:800;color:#374151;">Plan Feature</th>
              <th style="padding:14px;font-weight:800;text-align:center;color:#374151;">Free</th>
              <th style="padding:14px;font-weight:800;text-align:center;background:#f0fdf4;color:#166534;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
                Starter (₹99)
              </th>
              <th style="padding:14px;font-weight:800;text-align:center;color:#374151;">Lifetime (₹499)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:12px 14px;font-weight:700;">Practice Levels</td>
              <td style="padding:12px 14px;text-align:center;color:#6b7280;">Level 1 only</td>
              <td style="padding:12px 14px;text-align:center;background:#f0fdf4;font-weight:800;color:#166534;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">Levels 1–3</td>
              <td style="padding:12px 14px;text-align:center;font-weight:800;color:#111827;">Levels 1–15</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:12px 14px;font-weight:700;">Guided Lessons</td>
              <td style="padding:12px 14px;text-align:center;color:#6b7280;">Lessons 1–6</td>
              <td style="padding:12px 14px;text-align:center;background:#f0fdf4;font-weight:800;color:#166534;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">Lessons 1–7</td>
              <td style="padding:12px 14px;text-align:center;font-weight:800;color:#111827;">Lessons 1–11</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:12px 14px;font-weight:700;">Bead Arcade Games</td>
              <td style="padding:12px 14px;text-align:center;color:#6b7280;">1 Game (Race)</td>
              <td style="padding:12px 14px;text-align:center;background:#f0fdf4;font-weight:800;color:#166534;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">3 Games (Race, Mystery, Match)</td>
              <td style="padding:12px 14px;text-align:center;font-weight:800;color:#111827;">All 7 Games</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:12px 14px;font-weight:700;">Free Play Abacus</td>
              <td style="padding:12px 14px;text-align:center;color:#ef4444;">🔒 Locked</td>
              <td style="padding:12px 14px;text-align:center;background:#f0fdf4;font-weight:800;color:#166534;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">✓ Unlocked</td>
              <td style="padding:12px 14px;text-align:center;font-weight:800;color:#111827;">✓ Unlocked</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:12px 14px;font-weight:700;">Access Period</td>
              <td style="padding:12px 14px;text-align:center;color:#6b7280;">Always Free</td>
              <td style="padding:12px 14px;text-align:center;background:#f0fdf4;font-weight:800;color:#166534;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">30 Days</td>
              <td style="padding:12px 14px;text-align:center;font-weight:800;color:#111827;">Permanent Lifetime</td>
            </tr>
            <tr>
              <td style="padding:14px;"></td>
              <td style="padding:14px;text-align:center;">
                <a href="#/challenge" class="btn wide" style="padding:8px 12px;font-size:0.85rem;border:1px solid #d1d5db;border-radius:8px;text-decoration:none;color:#374151;font-weight:700;display:inline-block;">Start Free</a>
              </td>
              <td style="padding:14px;text-align:center;background:#f0fdf4;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
                <a href="#/starter" class="btn primary wide" id="pricingStarterBtn" style="padding:8px 12px;font-size:0.85rem;background:#10b981;color:#fff;border-radius:8px;text-decoration:none;font-weight:800;display:inline-block;">Get Starter — ₹99</a>
              </td>
              <td style="padding:14px;text-align:center;">
                <a href="#/unlock" class="btn primary wide" id="pricingLifetimeBtn" style="padding:8px 12px;font-size:0.85rem;background:#ffc53d;color:#1f2937;border-radius:8px;text-decoration:none;font-weight:800;display:inline-block;">Get Lifetime — ₹499</a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Parent FAQ -->
    <section class="faq-section" style="margin:3.5rem 0;">
      <div style="text-align:center;max-width:580px;margin:0 auto 1.5rem auto;">
        <h2 style="font-size:1.6rem;font-weight:800;margin:0 0 0.5rem 0;color:#111827;">Frequently Asked Questions</h2>
        <p style="font-size:0.95rem;color:#6b7280;margin:0;">Clear answers to common questions from parents.</p>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px;">
        <details style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1rem;cursor:pointer;">
          <summary style="font-weight:800;color:#1f2937;">Does my child need a physical abacus to start?</summary>
          <p style="font-size:0.9rem;color:#4b5563;line-height:1.5;margin:0.75rem 0 0 0;">
            No. Abacus Buddy features an interactive, high-fidelity digital abacus with tactile sound and bead movement that teaches the exact same mechanics. If you already have a physical abacus, your child can practice alongside it.
          </p>
        </details>

        <details style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1rem;cursor:pointer;">
          <summary style="font-weight:800;color:#1f2937;">Why is 10 minutes a day recommended?</summary>
          <p style="font-size:0.9rem;color:#4b5563;line-height:1.5;margin:0.75rem 0 0 0;">
            Mental math relies on muscle memory and spatial visualization. Short, daily 10-minute sessions create sustained neural pathways without exhausting a child's attention span or turning math into a chore.
          </p>
        </details>

        <details style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1rem;cursor:pointer;">
          <summary style="font-weight:800;color:#1f2937;">Is Abacus Buddy completely ad-free and safe?</summary>
          <p style="font-size:0.9rem;color:#4b5563;line-height:1.5;margin:0.75rem 0 0 0;">
            Yes, 100%. Abacus Buddy contains zero ads, zero third-party behavioral trackers, and no external links accessible to children.
          </p>
        </details>

        <details style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1rem;cursor:pointer;">
          <summary style="font-weight:800;color:#1f2937;">What happens after the Starter tier 30-day period?</summary>
          <p style="font-size:0.9rem;color:#4b5563;line-height:1.5;margin:0.75rem 0 0 0;">
            If you choose not to upgrade to Lifetime, your account simply reverts to the Free tier (Level 1, Lessons 1–6). Your earned stickers, stars, and progress history are always safely preserved.
          </p>
        </details>
      </div>
    </section>

    <!-- Canonical Auth Section (Integrated Welcome & Gate) -->
    <section class="auth-section" id="auth-section" style="margin-top:3.5rem;padding-top:2rem;border-top:2px dashed #e5e7eb;">
      <div style="text-align:center;max-width:540px;margin:0 auto 1.5rem auto;">
        <span style="font-size:2.5rem;display:block;margin-bottom:0.5rem;">🔑</span>
        <h2 style="font-size:1.6rem;font-weight:800;margin:0 0 0.5rem 0;color:#111827;">Sign In / Start Learning</h2>
        <p style="font-size:0.9rem;color:#6b7280;margin:0;">Create a free parent account to save your child's progress across devices.</p>
      </div>

      <div id="authGateStep" class="auth-gate" ${showGate ? '' : 'style="display:none;"'}>
        <section class="card auth-gate-card" style="max-width:440px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:1.5rem;box-shadow:0 4px 16px rgba(0,0,0,0.05);text-align:center;">
          <div class="auth-actions">
            <button type="button" class="btn wide auth-btn-google" id="authGateGoogleBtn" style="display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.95rem;padding:12px;border:1px solid #d1d5db;border-radius:10px;background:#fff;cursor:pointer;width:100%;">
              <svg style="width:20px;height:20px;margin-right:8px;vertical-align:middle;" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
              Continue with Google
            </button>
            <button type="button" class="btn wide auth-btn-email" id="authGateEmailBtn" style="margin-top:10px;font-weight:700;font-size:0.95rem;padding:12px;border:1px solid #d1d5db;border-radius:10px;background:#f9fafb;cursor:pointer;width:100%;">
              ✉️ Login with Email & Password
            </button>
            <div id="authGateError" class="auth-error" style="display:none;margin-top:12px;padding:10px 12px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:8px;font-size:13px;text-align:left;" role="alert"></div>
          </div>
        </section>
      </div>

      <div id="emailAuthStep" style="display:none;padding:18px 16px;max-width:440px;margin:0 auto;"></div>

      <div id="welcomeProfileStep" style="max-width:480px;margin:0 auto;">
        <section class="card form" style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:1.5rem;box-shadow:0 4px 16px rgba(0,0,0,0.05);">
          <label for="kidName" style="font-weight:800;display:block;margin-bottom:6px;">What's your child's name?</label>
          <input id="kidName" maxlength="18" autocomplete="off" placeholder="Type name" value="" style="width:100%;box-sizing:border-box;padding:10px 12px;font-size:1rem;border:1px solid #d1d5db;border-radius:8px;margin-bottom:14px;">
          <label style="font-weight:800;display:block;margin-bottom:6px;">Pick an animal buddy</label>
          <div class="avatars" style="display:flex;gap:8px;margin-bottom:14px;">
            <button type="button" class="avatar on" data-avatar="🦁" aria-label="Avatar 🦁">🦁</button>
            <button type="button" class="avatar" data-avatar="🐼" aria-label="Avatar 🐼">🐼</button>
            <button type="button" class="avatar" data-avatar="🦊" aria-label="Avatar 🦊">🦊</button>
            <button type="button" class="avatar" data-avatar="🐨" aria-label="Avatar 🐨">🐨</button>
            <button type="button" class="avatar" data-avatar="🦄" aria-label="Avatar 🦄">🦄</button>
          </div>
          <label style="font-weight:800;display:block;margin-bottom:6px;">Used an abacus before?</label>
          <div class="two" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
            <button type="button" class="choice" data-exp="new" style="text-align:left;padding:10px;border:1px solid #d1d5db;border-radius:8px;background:#f9fafb;"><b>🌱 New</b><br><small style="color:#6b7280;">From the start</small></button>
            <button type="button" class="choice" data-exp="known" style="text-align:left;padding:10px;border:1px solid #d1d5db;border-radius:8px;background:#f9fafb;"><b>🚀 Experienced</b><br><small style="color:#6b7280;">Quick check</small></button>
          </div>
          <div class="two" style="display:none;">
            <button type="button" class="choice on" data-voice-lang="en"><b>English audio</b></button>
            <button type="button" class="choice" data-voice-lang="ta"><b>Tamil audio</b></button>
          </div>
          <div class="two" style="display:none;">
            <button type="button" class="choice on" data-content-lang="en"><b>English content</b></button>
            <button type="button" class="choice" data-content-lang="ta"><b>Tamil content</b></button>
          </div>
          <p class="muted tiny" id="langNote" hidden>This phone has no Tamil voice, so Babi will stay quiet until a Tamil voice is available.</p>
          <button class="btn primary wide" id="start" disabled style="padding:12px;font-size:1rem;font-weight:800;border-radius:10px;background:#ffc53d;border:none;width:100%;cursor:pointer;">Let's go! →</button>
        </section>
      </div>
    </section>
  </div>
  `;
}
