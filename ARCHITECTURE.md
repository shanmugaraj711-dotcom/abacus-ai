# Abacus AI — Product Architecture

## North-star
Abacus AI is a child-first abacus learning world, not a quiz page. The product journey is:

**Discover → Learn → Practise → Play → Master → Test → Exam → Competition**

The first release may keep Test, Exam and Competition locked, but the product architecture treats them as real future destinations rather than dead-end placeholders.

## Architecture decision

### Keep the learning core local and deterministic
- Vanilla HTML/CSS/JavaScript PWA remains the V1 foundation.
- Abacus mathematics stays in `abacusEngine.js` and is deterministic.
- Progress/profile remain local-first so practice works without a network.
- No live AI request is allowed to block a child from learning.

### Separate product layers
1. **Experience layer** — screens, animations, Babi, sound, navigation.
2. **Learning layer** — lessons, guided practice, adaptive progression and mastery.
3. **Math engine** — bead representation, problem generation and answer validation.
4. **Personalisation layer** — child name, age band, experience, strengths, weaknesses and recent mistakes.
5. **Assessment layer** — quick-start assessment now; formal tests/exams later.
6. **Game layer** — games must exercise the same underlying math skills, never unrelated fake scoring.
7. **Parent layer** — protected progress/accuracy/struggle reporting, introduced without exposing child-facing controls.
8. **AI layer** — Babi/Tiny AI is an optional helper. It must be grounded in current learning context and must never become a dependency for correctness.
9. **Persistence layer** — local storage now; a versioned sync/backend model can be added later without rewriting the learning engine.

## Child experience rules

- A child who has never touched an abacus must be able to start from zero.
- A child who already knows abacus must be able to skip basics through a quick assessment.
- Every important screen should answer: **What do I do next?**
- Every mistake should produce a useful next step, not shame.
- Hints reveal one reasoning step at a time.
- Babi should feel like a companion, not a decoration.
- Rewards celebrate effort, progress and mastery, not just speed.
- Age changes framing, pacing and challenge presentation; the math engine remains shared unless evidence justifies separate curricula.

## Learning progression

Levels 1–6 are the free mastery experience. Levels 7–15 are the premium progression described by the product specification:

- 1–2: direct addition
- 3–4: direct subtraction
- 5–6: small-friend addition
- 7–8: small-friend subtraction
- 9–10: big-friend addition/carry
- 11–12: big-friend subtraction/borrow
- 13: mixed direct + small
- 14: mixed small + big
- 15: full mixed mastery

Adaptive rule: three consecutive correct answers advance; two wrong answers drop one level and repeat until the child rebuilds confidence.

## Personalisation roadmap

### Now
- Name and age band.
- New-to-abacus vs already-knows-abacus.
- Starting level from assessment.
- Current level and streak.

### Next
- Per-rule accuracy.
- Recent mistake type.
- Time/attempt patterns.
- Preferred challenge intensity.
- Daily mission generated from actual progress.

### Later
- Parent-visible learning summary.
- Tiny AI tutor grounded in structured learning data.
- Optional cloud sync across devices/accounts.

## Babi voice decision

Browser speech synthesis is acceptable as a temporary accessibility/prototype layer, but it cannot guarantee the same recognizable voice on every Android device. The production-quality voice system should therefore be designed around **original owned Babi voice assets** (Tamil and English) for key scripted moments, with device TTS as fallback for dynamic text. We must not imitate a specific copyrighted cartoon character voice.

## Reliability rules

- A network failure must never turn into an "AI unavailable" dead end for core learning.
- The app must remain usable after the first successful load with no network.
- Service-worker cache versions must be bumped when boot-critical assets change.
- Local progress must survive reloads and normal PWA reopening.
- Startup failures must show a child-friendly recovery action rather than a blank screen.
- No customer-facing button may be a fake interactive feature. Future destinations must be clearly labelled as upcoming.

## Quality gate before charging money

1. Fresh child onboarding works.
2. Returning child resumes their progression.
3. New learner can complete the foundation journey.
4. Experienced learner can complete the quick assessment.
5. Levels 1–6 have real, validated math problems.
6. Hints are contextual and stepwise.
7. All live games use real abacus/math logic.
8. Babi works consistently across World, Learn, Practice and Play.
9. Core flows survive offline operation after initial load.
10. Parent value is visible through measurable progress, not marketing claims.
11. Formal Test/Exam/Competition are only opened when their real implementations are ready.
12. Physical Android testing is required before calling the offline/mobile gate passed.

## Technology expansion policy

Do **not** add a backend, AI provider, payment gateway, APK wrapper, or external orchestration service merely because it sounds sophisticated. Add each only when it solves a demonstrated product problem.

When the evidence requires expansion:
- Node + SQLite is the preferred lightweight application backend.
- A small API should sit behind a stable client-side learning contract.
- AI must be isolated behind a non-blocking helper interface.
- Payment/unlock should be a separate entitlement system, never mixed into the math engine.
- Mobile packaging should happen after the PWA is validated with real families.

The goal is not maximum technology. The goal is **maximum child learning quality and parent trust with minimum failure surface**.
