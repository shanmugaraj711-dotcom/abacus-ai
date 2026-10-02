/**
 * js/challenge.js
 * Lightweight public 10-question mental-math challenge.
 *
 * Growth Engine Flow:
 *   visitor -> start challenge -> 10 questions -> score/result -> parent-facing result -> Starter CTA
 *
 * CRITICAL SECURITY & ENTITLEMENT GUARANTEES:
 *   - The challenge NEVER writes paid entitlement to localStorage or Firestore.
 *   - The challenge NEVER sets paid = true or demo entitlement.
 *   - Access control and Firebase authorization remain 100% strict.
 */

import { trackFunnelEvent, FUNNEL_EVENTS } from './events.js';

// Curated 10-question mental math sequence suitable for kids 5-10
export const CHALLENGE_QUESTIONS = Object.freeze([
  { id: 1, a: 2, op: '+', b: 1, ans: 3, choices: [2, 3, 4, 5], hint: 'Start with 2 beads, push 1 up' },
  { id: 2, a: 3, op: '+', b: 1, ans: 4, choices: [3, 4, 5, 6], hint: 'Move 1 lower bead towards beam' },
  { id: 3, a: 5, op: '+', b: 2, ans: 7, choices: [6, 7, 8, 9], hint: 'Upper 5 bead plus two lower 1 beads' },
  { id: 4, a: 4, op: '-', b: 2, ans: 2, choices: [1, 2, 3, 4], hint: 'Take away 2 lower beads' },
  { id: 5, a: 5, op: '+', b: 3, ans: 8, choices: [7, 8, 9, 10], hint: '5 at the top, 3 at the bottom' },
  { id: 6, a: 7, op: '-', b: 2, ans: 5, choices: [3, 4, 5, 6], hint: 'Clear 2 lower beads, leaves 5' },
  { id: 7, a: 6, op: '+', b: 3, ans: 9, choices: [8, 9, 10, 7], hint: 'Combine 5 + 1 and add 3' },
  { id: 8, a: 8, op: '-', b: 5, ans: 3, choices: [2, 3, 4, 5], hint: 'Lift the top 5 bead away' },
  { id: 9, a: 4, op: '+', b: 5, ans: 9, choices: [7, 8, 9, 10], hint: 'Bring the top 5 bead down' },
  { id: 10, a: 9, op: '-', b: 4, ans: 5, choices: [4, 5, 6, 7], hint: 'Clear all 4 lower beads' },
]);

export function renderChallenge({ container, onComplete, onExit } = {}) {
  const target = container || document.getElementById('app');
  if (!target) return;

  let currentIdx = 0;
  let score = 0;
  let startTime = Date.now();
  let answers = [];

  // Track start event
  trackFunnelEvent(FUNNEL_EVENTS.CHALLENGE_START, { total: CHALLENGE_QUESTIONS.length });

  function renderQuestion() {
    const q = CHALLENGE_QUESTIONS[currentIdx];
    const progressPct = Math.round(((currentIdx) / CHALLENGE_QUESTIONS.length) * 100);

    target.innerHTML = `
      <main class="view challenge-view" style="max-width:540px;margin:0 auto;padding:1.5rem 1rem;">
        <!-- Header -->
        <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
          <a href="#/home" id="challengeExitBtn" style="font-size:0.9rem;color:var(--text-muted,#666);text-decoration:none;font-weight:700;">✕ Exit</a>
          <span style="font-size:0.85rem;font-weight:800;background:var(--card-subtle,#eef2ff);padding:4px 10px;border-radius:12px;color:var(--primary,#4f46e5);">
            Question ${currentIdx + 1} of ${CHALLENGE_QUESTIONS.length}
          </span>
          <span style="font-size:0.85rem;font-weight:700;color:var(--text-muted,#666);">Score: ${score}</span>
        </header>

        <!-- Progress bar -->
        <div style="background:#e5e7eb;height:8px;border-radius:4px;overflow:hidden;margin-bottom:1.5rem;">
          <div style="background:linear-gradient(90deg, #4f46e5, #06b6d4);width:${progressPct}%;height:100%;transition:width 0.3s ease;"></div>
        </div>

        <!-- Question Card -->
        <section class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:2rem 1.5rem;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
          <p style="font-size:0.85rem;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;margin:0 0 0.5rem 0;font-weight:800;">Mental Math Challenge</p>
          <div style="font-size:3.5rem;font-weight:900;color:#1f2937;margin:1rem 0;font-family:'Baloo 2',sans-serif;line-height:1.1;">
            ${q.a} ${q.op === '+' ? '+' : '−'} ${q.b} = <span style="color:#4f46e5;">?</span>
          </div>
          <p style="font-size:0.9rem;color:#6b7280;margin:0 0 1.5rem 0;">Visualize the beads moving on your abacus beam</p>

          <!-- Choices Grid -->
          <div id="challengeChoices" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:1rem;">
            ${q.choices.map((c, i) => `
              <button type="button" class="btn challenge-choice-btn" data-choice="${c}" style="font-size:1.5rem;font-weight:800;padding:16px 8px;background:#f9fafb;border:2px solid #e5e7eb;border-radius:12px;cursor:pointer;transition:all 0.15s ease;">
                ${c}
              </button>
            `).join('')}
          </div>

          <div id="choiceFeedback" style="min-height:24px;margin-top:1rem;font-size:0.95rem;font-weight:700;"></div>
        </section>
      </main>
    `;

    const exitBtn = document.getElementById('challengeExitBtn');
    if (exitBtn) {
      exitBtn.onclick = (e) => {
        if (onExit) {
          e.preventDefault();
          onExit();
        }
      };
    }

    const choiceBtns = document.querySelectorAll('.challenge-choice-btn');
    choiceBtns.forEach(btn => {
      btn.onclick = () => {
        const chosen = Number(btn.dataset.choice);
        const correct = chosen === q.ans;
        answers.push({ qId: q.id, chosen, correct });

        choiceBtns.forEach(b => {
          b.disabled = true;
          const val = Number(b.dataset.choice);
          if (val === q.ans) {
            b.style.background = '#d1fae5';
            b.style.borderColor = '#10b981';
            b.style.color = '#065f46';
          } else if (val === chosen && !correct) {
            b.style.background = '#fee2e2';
            b.style.borderColor = '#ef4444';
            b.style.color = '#991b1b';
          }
        });

        const feedback = document.getElementById('choiceFeedback');
        if (correct) {
          score++;
          if (feedback) {
            feedback.textContent = '✓ Correct! Fast mental visual!';
            feedback.style.color = '#059669';
          }
        } else {
          if (feedback) {
            feedback.textContent = `Correct answer was ${q.ans}`;
            feedback.style.color = '#dc2626';
          }
        }

        setTimeout(() => {
          currentIdx++;
          if (currentIdx < CHALLENGE_QUESTIONS.length) {
            renderQuestion();
          } else {
            renderResult();
          }
        }, 700);
      };
    });
  }

  function renderResult() {
    const timeSpentSec = Math.round((Date.now() - startTime) / 1000);
    const pct = Math.round((score / CHALLENGE_QUESTIONS.length) * 100);

    // Track funnel event: challenge_complete
    trackFunnelEvent(FUNNEL_EVENTS.CHALLENGE_COMPLETE, {
      score,
      total: CHALLENGE_QUESTIONS.length,
      pct,
      timeSpentSec,
    });

    let ratingTitle = 'Great Foundation!';
    let assessmentText = 'Your child demonstrates natural number sense. With structured daily abacus practice, mental calculation transforms from counting into instant visual reflexes.';
    if (score >= 9) {
      ratingTitle = 'Outstanding Mental Agility! 🌟';
      assessmentText = 'Fast number intuition! Structured 10-minute daily practice will help advance into multi-digit operations and speed recall effortlessly.';
    } else if (score >= 6) {
      ratingTitle = 'Solid Starting Rhythm! 🎯';
      assessmentText = 'Good basic calculation ability. Daily practice with Abacus Buddy will solidify bead visualization so hesitation disappears.';
    }

    target.innerHTML = `
      <main class="view challenge-result-view" style="max-width:540px;margin:0 auto;padding:1.5rem 1rem;">
        <section class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:2rem 1.5rem;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
          <div style="font-size:3rem;margin-bottom:0.5rem;">🧮</div>
          <span style="display:inline-block;padding:4px 12px;background:#e0e7ff;color:#4338ca;border-radius:12px;font-size:0.8rem;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">
            Assessment Result
          </span>
          <h2 style="font-size:1.8rem;font-weight:800;margin:0.75rem 0 0.25rem 0;color:#111827;">${ratingTitle}</h2>
          <div style="font-size:3rem;font-weight:900;color:#4f46e5;margin:0.5rem 0;font-family:'Baloo 2',sans-serif;">
            ${score} / ${CHALLENGE_QUESTIONS.length}
          </div>
          <p style="font-size:0.95rem;color:#4b5563;line-height:1.5;margin-bottom:1.5rem;">${assessmentText}</p>

          <!-- Parent Diagnostic Card -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:1rem;margin-bottom:1.5rem;text-align:left;font-size:0.85rem;color:#334155;">
            <p style="font-weight:800;margin:0 0 0.5rem 0;color:#0f172a;">📊 Why 10 Minutes a Day Matters:</p>
            <ul style="padding-left:1.2rem;margin:0;line-height:1.5;">
              <li>Transforms finger-counting into spatial bead memory</li>
              <li>Builds speed through spaced daily repetition</li>
              <li>Calm, ad-free environment without screen frustration</li>
            </ul>
          </div>

          <!-- Starter CTA -->
          <div style="margin-top:1.5rem;" class="stack">
            <a class="btn primary wide" id="challengeStarterCta" href="#/starter" style="display:block;text-align:center;font-size:1.1rem;padding:14px;background:#ffc53d;color:#1f2937;font-weight:800;border-radius:12px;text-decoration:none;box-shadow:0 4px 12px rgba(255,197,61,0.35);">
              Continue with Starter — ₹99
            </a>
            <a class="btn wide" href="#/unlock" style="display:block;text-align:center;font-size:0.95rem;padding:10px;margin-top:8px;border:1px solid #d1d5db;border-radius:12px;text-decoration:none;color:#374151;font-weight:700;">
              Or View Lifetime Family Plan (₹499)
            </a>
            <button type="button" class="btn ghost wide" id="challengeRetryBtn" style="margin-top:8px;background:none;border:none;color:#6b7280;cursor:pointer;font-size:0.9rem;font-weight:700;">
              ↺ Try Challenge Again
            </button>
          </div>
        </section>
      </main>
    `;

    const retryBtn = document.getElementById('challengeRetryBtn');
    if (retryBtn) {
      retryBtn.onclick = () => {
        currentIdx = 0;
        score = 0;
        startTime = Date.now();
        answers = [];
        renderQuestion();
      };
    }

    if (onComplete) {
      onComplete({ score, total: CHALLENGE_QUESTIONS.length, timeSpentSec });
    }
  }

  // Kick off first question
  renderQuestion();
}
