# Abacus AI — Source of Truth / Engineering Checkpoint

**Status:** ACTIVE — authoritative project checkpoint
**Repository:** `shanmugaraj711-dotcom/abacus-ai`
**Development branch:** `phase5-performance-final`
**Deployment model:** GitHub source → Cloudflare distribution/deployment
**Separate workspace:** Lovable is NOT the Abacus AI source and must never be treated as the Abacus project.

## 1. Non-negotiable source hierarchy

When working on Abacus AI, use this order of authority:
1. The current GitHub repository and the explicitly selected branch.
2. This `SOURCE_OF_TRUTH.md` checkpoint for project architecture, decisions and constraints.
3. `ARCHITECTURE.md` and the approved build specification for product intent.
4. Existing code/tests/assets for implementation reality.
5. User's latest explicit instruction for the next change.

Never substitute another workspace/project for the GitHub repository. Never invent a production URL. If production must be verified, use the exact production URL supplied by the user or an explicitly verified deployment binding.

## 2. Current verified Git state

- Development branch: `phase5-performance-final`
- QA branch checkpoint: `22aeee2c0b97cefa8dcf5dc4ac6772a83ad19148`
- Main release checkpoint: `015b05b81226f7e827071ecc2b2b5d7a458a6c33`
- Latest QA change: removed competing lesson/practice state paths from boot, kept `challengeApp.js` authoritative, and bumped PWA cache to v57.
- Core stabilization commit: `07ff16bc68bc4a3c6fbc7b30d25dcfc2993c323e` (historical stabilization checkpoint)
- `main` and the development branch had diverged before the release merge; the release was promoted with an explicit two-parent merge commit after inspecting the unique main-side changes.

## 3. Product north star

Abacus AI is a child-first abacus learning world, not a quiz page.

**Discover → Learn → Practise → Play → Master → Test → Exam → Competition**

The core experience must work for a child with no previous abacus knowledge. A child who already knows abacus may use the quick assessment to choose an appropriate starting level.

## 4. Current architecture

```text
index.html
   ↓
boot.js
   ↓
challengeApp.js  ← authoritative experience/navigation + lesson/practice state
   ↓
abacusEngine.js ← deterministic math/abacus engine

Optional enhancement layer:
   babiVoice.js
   audioFx.js
   kidUi.js
   sessionSummary.js
   homeBabi.js
   learnPracticeUX.js  ← presentation adapter
   abacusInteractionUX.js ← mobile bead interaction + presentation adapter
   v1ProgressUX.js     ← child local progress presentation adapter
   parentProgressUX.js ← parent read-only progress/value adapter

Offline layer:
   sw.js
   manifest.json
   PWA icons/assets

Persistence:
   localStorage (profile + progress + lightweight session data)
```

Core principles:
- Vanilla HTML/CSS/JavaScript PWA for V1.
- Local-first and offline after first successful load.
- Deterministic mathematics; AI must never be required for correctness or core access.
- Direct bead interaction rather than typed answers.
- Progress survives reloads and normal PWA reopening.
- Future backend, payment, AI, APK and orchestration services are introduced only when a demonstrated product need and validation gate justify them.

## 5. Engineering reference protocol

PromptStudioAI's Reference Coding work is used as an **engineering reference, not a code/visual copy source**.

Reusable principles:
- Keep one authoritative workflow instead of parallel implementations.
- Put presentation around an existing reliable core rather than rewriting the core unnecessarily.
- Validate boundaries and inputs explicitly.
- Fail gracefully and preserve the primary user workflow when optional services/layers fail.
- Keep user-facing states explicit: progress, success, error and next action.
- Make mobile behavior a first-class acceptance condition.
- Ship one coherent, reviewable change at a time and verify the real end-to-end path before declaring it complete.

Abacus adaptation:
- `challengeApp.js` remains the authoritative experience/state/navigation path.
- `abacusEngine.js` remains the authoritative math contract.
- Enhancement modules are thin, optional adapters and may not create competing state machines.
- Offline boot-critical assets must remain independent of network services.

## 6. Current learning gate

The authoritative child flow is:

```text
Onboarding
   ↓
My Abacus World
   ↓
LEARN — Babi teaches/demonstrates the foundation
   ↓
PRACTISE unlocks
   ↓
Complete first practice
   ↓
MASTER unlocks
```

Practice must not bypass Learn.
Master Path must not bypass the first Practice completion.

The current code stores these gates in progress state:
- `state.learn.completed`
- `state.practiceCompleted`

## 7. Learning progression

15-level curriculum:
- Levels 1–2: direct addition
- Levels 3–4: direct subtraction
- Levels 5–6: small-friend addition
- Levels 7–8: small-friend subtraction
- Levels 9–10: big-friend addition/carry
- Levels 11–12: big-friend subtraction/borrow
- Level 13: mixed direct + small friend
- Level 14: mixed small + big friend
- Level 15: full mixed mastery

Product specification currently defines Levels 1–6 as the complete free V1 experience and Levels 7–15 as the paid progression. Any newer pricing decision from the user must be treated as a deliberate product change and reconciled before implementation; do not silently change the curriculum gate.

Adaptive rule:
- 3 correct in a row → advance one level.
- 2 wrong within a level → drop one level, with minimum Level 1.
- Track accuracy by level and rule type.

## 8. Learn is a teaching system, not a menu of drills

For a new learner, Learn must explain the abacus before expecting independent answers.

Current Learn foundation includes:
- Ones rod / place value explanation.
- Lower bead value explanation.
- Five-bead explanation.
- Babi visual demonstration.
- Demo abacus showing Babi building a number.
- Guided lessons for 1–4, 5, 6–9 and a small challenge.

Current mobile interaction gate:
- The foundation demo abacus is a watch-only surface.
- Before the demo is completed, the child is not presented with a “try” interaction on that demo surface.
- After the demo, lesson surfaces provide the actual child bead interaction.
- Mobile tap uses the core button handlers without double-toggling.
- Mobile drag is supported as an interaction enhancement while the core state remains authoritative.
- Foundation lesson screens focus on the ONES rod; the second rod is hidden there to reduce first-lesson noise.

Future changes to Learn must preserve the principle:
**Explain → Demonstrate → Child tries → Check understanding → Unlock Practice**

Do not turn Learn into a screen that merely displays arithmetic questions.

## 9. Babi architecture

Canonical source of truth:
- `assets/mascot/babi.svg`

Approved pose assets:
- `assets/mascot/babi-idle.svg`
- `assets/mascot/babi-pointing.svg`
- `assets/mascot/babi-celebrating.svg`
- `assets/mascot/babi-encouraging.svg`
- `assets/mascot/babi-teaching.svg`

Babi is one recognizable character system. Screens may change pose/expression, but identity, proportions, palette and personality must remain consistent.

Babi is a companion/teacher, not decoration.

## 10. Current supporting product areas

Existing/active product surfaces include:
- Onboarding
- My Abacus World
- Learn
- Lesson/tutorial flow
- Practice
- Master Path
- Playroom/games
- Result feedback
- Level-up feedback
- Locked/future destinations
- Babi Brain lightweight local helper
- Parent Zone
- Settings
- Session summary
- English/Tamil-Tanglish speech selection
- Local Progress Passport on My Abacus World
- Parent-facing Learning Passport with read-only rule/level/session signals

Test / Exam / Competition remain future destinations and must not pretend to be implemented.

## 11. Offline/PWA rules

`sw.js` is responsible for caching the shell and boot-critical assets.

**Current cache version:** `abacus-ai-phase5-shell-v57`.

Whenever a boot-critical asset changes, the service-worker cache/version must be intentionally bumped and verified.

Offline operation is a release gate, not an optional enhancement.

## 12. Quality rules

Before declaring a change complete:
- Inspect the actual current branch.
- Understand the existing implementation before editing.
- Prefer modifying the authoritative existing path over creating a parallel implementation.
- Search for existing functionality before adding a new module.
- Avoid duplicate Babi systems, duplicate navigation, duplicate state machines and duplicate feature implementations.
- Do not delete legacy/experimental modules merely because they look unused; first prove their references and deployment impact.
- Do not rebuild the app from scratch when a targeted correction is possible.
- Preserve interaction performance; bead taps must remain responsive.
- Test fresh onboarding and returning-user flows.
- Test Learn → Practice → Master gating.
- Test local persistence.
- Test offline reopening after first load.
- Test real Android Chrome/PWA behavior before declaring the mobile/offline gate passed.

## 13. Known repository complexity

The branch contains accumulated phase, QA, experimental and legacy modules in addition to the current core. Examples include older Babi, navigation, learning and QA helpers.

This is a known cleanup target, not permission to randomly remove files.

The engineering objective is to converge toward one authoritative implementation path and remove duplicates only after dependency/reference verification.

## 14. Product validation gates

Do not advance technology phases just because they are technically possible.

V1 validation requires real repeated use by known families, observed children using the product, and explicit payment interest before expanding into later infrastructure.

Do not add or make core learning depend on:
- live AI APIs
- Oracle/backend infrastructure
- n8n runtime orchestration
- payment gateways
- APK/Capacitor packaging
- Play Store integration

until the appropriate validation gate is passed.

## 15. Future engineering protocol

For every new Abacus request:
### A. Re-anchor
Verify repository, branch and current files first.
### B. Cross-check
Cross-check the requested change against current implementation, `ARCHITECTURE.md`, approved build specification, tests, existing feature modules, current deployment assumptions, and PromptStudioAI engineering reference patterns where relevant.
### C. Decide the smallest authoritative change
Do not create another competing implementation when the existing architecture can be extended.
### D. Implement
Change only what is required, preserving offline-first behavior and interaction performance.
### E. Verify
Run/review relevant tests and inspect the resulting code path. For user-facing changes, verify the complete flow, not just the changed function.
### F. Checkpoint
Record the final commit/branch and important architectural decision in this file when the change materially changes the product architecture.

## 16. Current work state

The current baseline is **QA-verified stabilized core + guided learning gate + hardened Learn/Practice UX + local child progress passport + parent-facing progress/value layer + hardened mobile bead interaction**.

The QA release also removed two competing loaded implementations (`lessonStateMachine.js` and `practiceEntryUX.js`) from the boot path. They remain in the repository as legacy files and are not loaded by the current app.

Next work should continue toward:
- excellent beginner teaching
- complete Babi/world treatment across important screens
- safe convergence of duplicate/legacy implementations
- parent-facing value/progress polish
- session/result/share/pricing/analytics work according to current product decisions
- real device/offline QA

Do not jump to AI/backend/APK/payment infrastructure before the V1 validation gate.

## 17. Golden rule

**Never lose the project context. Never substitute Lovable for GitHub. Never guess production. Never create duplicate architecture when the existing authoritative path can be improved. Always re-audit the current branch before making a material change.**
