/**
 * js/landing.js
 * Parent-Facing Public Home for Abacus Buddy.
 *
 * Core Concept:
 *   "Build Faster Mental-Math Skills — 10 Minutes at a Time."
 *
 * Primary CTA:
 *   - Try the Free Challenge (routes to #/challenge)
 * Secondary CTA:
 *   - Sign In (hands off directly to existing auth/onboarding at #/signin)
 *
 * Natural Parent Search Intent Covered:
 *   - abacus classes for kids
 *   - abacus practice for kids
 *   - mental math for kids
 *   - mental arithmetic for children
 *   - mental math games for kids
 *   - abacus learning for beginners
 *   - abacus practice at home
 *   - kids math practice
 *   - 10-minute math practice
 *   - abacus worksheets
 *   - mental math practice
 *   - calculation practice for children
 */

import { trackFunnelEvent, FUNNEL_EVENTS } from './events.js';

export function renderPublicLandingHtml({ isTa = false } = {}) {
  // Funnel event: landing_view
  trackFunnelEvent(FUNNEL_EVENTS.LANDING_VIEW, { lang: isTa ? 'ta' : 'en' });

  return `
  <div class="landing-page" style="width:100%;max-width:100%;box-sizing:border-box;margin:0 auto;padding:0 0 4rem 0;font-family:inherit;color:#1f2937;">
    <!-- Public Header / Navigation -->
    <header style="display:flex;justify-content:space-between;align-items:center;padding:1rem 0;border-bottom:1px solid #f3f4f6;margin-bottom:1.5rem;">
      <a href="#/" style="display:flex;align-items:center;gap:8px;text-decoration:none;color:#111827;font-weight:900;font-size:1.25rem;">
        <span style="font-size:1.75rem;">🧮</span>
        <span>Abacus Buddy</span>
      </a>
      <nav style="display:flex;align-items:center;gap:12px;">
        <a href="#/home" class="btn ghost" id="navSignInBtn" style="font-weight:700;font-size:0.9rem;padding:8px 14px;border:1px solid #d1d5db;border-radius:10px;text-decoration:none;color:#374151;">
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
      <p class="lead" style="font-size:1.15rem;color:#4b5563;max-width:640px;margin:0 auto 2rem auto;line-height:1.6;">
        A gentle, ad-free abacus practice companion for kids aged 5–10. We turn finger-counting into spatial bead memory, building real calculation practice for children step-by-step.
      </p>

      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:14px;margin-bottom:1.5rem;">
        <a href="#/challenge" class="btn primary" id="heroChallengeCta" style="font-size:1.15rem;font-weight:800;padding:14px 28px;background:#ffc53d;color:#1f2937;border-radius:12px;text-decoration:none;box-shadow:0 4px 14px rgba(255,197,61,0.4);">
          🎯 Try the Free Challenge
        </a>
        <a href="#/home" class="btn" id="heroSignInCta" style="font-size:1.1rem;font-weight:700;padding:14px 24px;border:2px solid #e5e7eb;border-radius:12px;text-decoration:none;color:#374151;background:#fff;">
          Sign In
        </a>
      </div>
      <p style="font-size:0.85rem;color:#6b7280;margin:0;">No credit card required • Instant 10-question evaluation • Works on phone, tablet & desktop</p>
    </section>

    <!-- Value Grid: What, Who, How, 10 Minutes -->
    <section class="info-grid-section" style="margin:2.5rem 0;">
      <div style="text-align:center;max-width:600px;margin:0 auto 1.75rem auto;">
        <h2 style="font-size:1.6rem;font-weight:800;margin:0 0 0.5rem 0;color:#111827;">Why Daily Abacus Practice at Home Works</h2>
        <p style="font-size:0.95rem;color:#6b7280;margin:0;">Visual beads give children an intuitive mental model for calculation practice.</p>
      </div>

      <div class="info-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(250px, 1fr));gap:20px;">
        <!-- What It Is -->
        <div class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1.5rem;box-shadow:0 2px 8px rgba(0,0,0,0.03);">
          <div style="font-size:2rem;margin-bottom:0.75rem;">🧮</div>
          <h3 style="font-size:1.15rem;font-weight:800;margin:0 0 0.5rem 0;color:#111827;">What Abacus Buddy Is</h3>
          <p style="font-size:0.9rem;color:#4b5563;line-height:1.5;margin:0;">
            A digital soroban designed for abacus practice for kids. Pairs interactive bead movements with gentle voice guidance, turning abstract numbers into tangible quantities that make mental math for kids clear and natural.
          </p>
        </div>

        <!-- Who It Is For -->
        <div class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1.5rem;box-shadow:0 2px 8px rgba(0,0,0,0.03);">
          <div style="font-size:2rem;margin-bottom:0.75rem;">👧👦</div>
          <h3 style="font-size:1.15rem;font-weight:800;margin:0 0 0.5rem 0;color:#111827;">Who It Is For</h3>
          <p style="font-size:0.9rem;color:#4b5563;line-height:1.5;margin:0;">
            Ideal for children aged 5–10 starting abacus learning for beginners or overcoming math hesitation. Whether supplementing local abacus classes for kids or doing independent abacus practice at home, it delivers focused kids math practice.
          </p>
        </div>

        <!-- How Children Learn -->
        <div class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1.5rem;box-shadow:0 2px 8px rgba(0,0,0,0.03);">
          <div style="font-size:2rem;margin-bottom:0.75rem;">💡</div>
          <h3 style="font-size:1.15rem;font-weight:800;margin:0 0 0.5rem 0;color:#111827;">How Children Learn</h3>
          <p style="font-size:0.9rem;color:#4b5563;line-height:1.5;margin:0;">
            Children master mental arithmetic for children through 3 progressive stages: <b>1. Touch & Move</b> (physical bead familiarity), <b>2. Rules & Friends</b> (Little Friends of 5 and Big Friends of 10), and <b>3. Mind Abacus</b> (internal visualization for rapid calculation).
          </p>
        </div>

        <!-- Why 10 Minutes Matters -->
        <div class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1.5rem;box-shadow:0 2px 8px rgba(0,0,0,0.03);">
          <div style="font-size:2rem;margin-bottom:0.75rem;">⏱️</div>
          <h3 style="font-size:1.15rem;font-weight:800;margin:0 0 0.5rem 0;color:#111827;">Why 10 Minutes Matters</h3>
          <p style="font-size:0.9rem;color:#4b5563;line-height:1.5;margin:0;">
            Consistent 10-minute math practice builds enduring neural patterns without stress. Short daily sessions keep enthusiasm high, making mental math practice a welcome daily routine rather than a dreaded chore.
          </p>
        </div>
      </div>
    </section>

    <!-- Complete Learning Architecture -->
    <section class="curriculum-section" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:16px;padding:2rem 1.5rem;margin:3rem 0;">
      <div style="text-align:center;max-width:600px;margin:0 auto 1.5rem auto;">
        <h2 style="font-size:1.6rem;font-weight:800;margin:0 0 0.5rem 0;color:#111827;">Complete Mental Math & Abacus Curriculum</h2>
        <p style="font-size:0.95rem;color:#6b7280;margin:0;">From absolute beginners to multi-row calculation practice for children.</p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;">
        <div style="background:#fff;border-radius:12px;padding:1.25rem;border:1px solid #e5e7eb;">
          <b style="font-size:1rem;color:#1f2937;">🎯 15 Practice Levels</b>
          <p style="font-size:0.85rem;color:#4b5563;margin:0.5rem 0 0 0;line-height:1.4;">
            Adaptive calculation practice for children ranging from single-digit addition to 4-row double-digit mental arithmetic sums.
          </p>
        </div>
        <div style="background:#fff;border-radius:12px;padding:1.25rem;border:1px solid #e5e7eb;">
          <b style="font-size:1rem;color:#1f2937;">📘 11 Guided Lessons</b>
          <p style="font-size:0.85rem;color:#4b5563;margin:0.5rem 0 0 0;line-height:1.4;">
            Step-by-step abacus learning for beginners taught by Babi, explaining bead anatomy, Little Friends, and Big Friends formulas.
          </p>
        </div>
        <div style="background:#fff;border-radius:12px;padding:1.25rem;border:1px solid #e5e7eb;">
          <b style="font-size:1rem;color:#1f2937;">🎮 7 Arcade Bead Games</b>
          <p style="font-size:0.85rem;color:#4b5563;margin:0.5rem 0 0 0;line-height:1.4;">
            Delightful mental math games for kids (Race, Mystery Number, Bead Match, Flash, Speed Read, Friend Dash, Ladder) that gamify speed.
          </p>
        </div>
        <div style="background:#fff;border-radius:12px;padding:1.25rem;border:1px solid #e5e7eb;">
          <b style="font-size:1rem;color:#1f2937;">📝 Worksheets & Diagnostics</b>
          <p style="font-size:0.85rem;color:#4b5563;margin:0.5rem 0 0 0;line-height:1.4;">
            Free diagnostic evaluation challenge plus foundation for printable abacus worksheets and calculation speed tests.
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
        <h2 style="font-size:1.6rem;font-weight:800;margin:0 0 0.5rem 0;color:#111827;">Frequently Asked Questions About Kids Math Practice</h2>
        <p style="font-size:0.95rem;color:#6b7280;margin:0;">Clear answers to common questions about abacus learning for beginners and home practice.</p>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px;">
        <details style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1rem;cursor:pointer;">
          <summary style="font-weight:800;color:#1f2937;">Can Abacus Buddy support or replace traditional abacus classes for kids?</summary>
          <p style="font-size:0.9rem;color:#4b5563;line-height:1.5;margin:0.75rem 0 0 0;">
            Yes. Abacus Buddy is designed both as a standalone self-paced curriculum and as an ideal daily practice tool alongside physical abacus classes for kids. Many students attending weekly classes use Abacus Buddy for their daily 10-minute abacus practice at home to maintain momentum between sessions.
          </p>
        </details>

        <details style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1rem;cursor:pointer;">
          <summary style="font-weight:800;color:#1f2937;">How does mental arithmetic for children differ from standard calculation practice?</summary>
          <p style="font-size:0.9rem;color:#4b5563;line-height:1.5;margin:0.75rem 0 0 0;">
            Standard school calculation practice often relies on rote rules and column carries on paper. Mental arithmetic for children using the soroban teaches children to see numbers as bead quantities. By visualizing bead shifts mentally, calculation becomes fast, intuitive, and concrete.
          </p>
        </details>

        <details style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1rem;cursor:pointer;">
          <summary style="font-weight:800;color:#1f2937;">Does my child need a physical abacus to start abacus learning for beginners?</summary>
          <p style="font-size:0.9rem;color:#4b5563;line-height:1.5;margin:0.75rem 0 0 0;">
            No. Abacus Buddy features an interactive, high-fidelity digital abacus with responsive bead movement and audio feedback. Beginners can start immediately without buying hardware, though physical abacus users can also follow along seamlessly.
          </p>
        </details>

        <details style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1rem;cursor:pointer;">
          <summary style="font-weight:800;color:#1f2937;">Why is 10-minute math practice better than longer weekend study sessions?</summary>
          <p style="font-size:0.9rem;color:#4b5563;line-height:1.5;margin:0.75rem 0 0 0;">
            Cognitive research shows that mental math skills and bead visualization require frequent, short reinforcement. 10 minutes of daily math practice keeps focus sharp, prevents mental exhaustion, and builds lasting confidence.
          </p>
        </details>

        <details style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1rem;cursor:pointer;">
          <summary style="font-weight:800;color:#1f2937;">Are abacus worksheets and speed tests available for extra practice?</summary>
          <p style="font-size:0.9rem;color:#4b5563;line-height:1.5;margin:0.75rem 0 0 0;">
            Yes. Beyond the interactive levels and mental math games for kids, our platform includes the Free Mental Math Challenge and an expanding library of structured calculation practice worksheets for home study.
          </p>
        </details>

        <details style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1rem;cursor:pointer;">
          <summary style="font-weight:800;color:#1f2937;">Is Abacus Buddy safe, private, and ad-free?</summary>
          <p style="font-size:0.9rem;color:#4b5563;line-height:1.5;margin:0.75rem 0 0 0;">
            100% yes. Abacus Buddy contains zero ads, zero behavioral trackers, and no external popups. Student progress is stored safely and parent accounts use secure Google or Email authentication.
          </p>
        </details>
      </div>
    </section>

    <!-- Bottom Call-To-Action (No duplicate auth UI!) -->
    <section class="bottom-cta-section" style="text-align:center;margin-top:3.5rem;padding:3rem 1.5rem;background:#fefce8;border:2px dashed #fef08a;border-radius:20px;">
      <span style="font-size:2.5rem;display:block;margin-bottom:0.75rem;">🌟</span>
      <h2 style="font-size:1.8rem;font-weight:900;color:#111827;margin:0 0 0.75rem 0;">Ready to Start 10-Minute Daily Math Practice?</h2>
      <p style="font-size:1.05rem;color:#4b5563;max-width:540px;margin:0 auto 1.75rem auto;line-height:1.5;">
        Take the free 10-question evaluation to see where your child shines, or sign in to continue your child's personalized learning journey.
      </p>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:14px;">
        <a href="#/challenge" class="btn primary" id="bottomChallengeCta" style="font-size:1.1rem;font-weight:800;padding:12px 24px;background:#ffc53d;color:#1f2937;border-radius:12px;text-decoration:none;box-shadow:0 4px 12px rgba(255,197,61,0.35);">
          🎯 Try the Free Challenge
        </a>
        <a href="#/home" class="btn" id="bottomSignInCta" style="font-size:1.05rem;font-weight:700;padding:12px 22px;border:2px solid #d1d5db;border-radius:12px;text-decoration:none;color:#374151;background:#fff;">
          Parent Sign In
        </a>
      </div>
    </section>
  </div>
  `;
}
