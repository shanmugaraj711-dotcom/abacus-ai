# Learn + Practice Experience — Product Design

## Goal
Make Learn and Practice the strongest part of Abacus AI for Kids: a child with zero abacus knowledge should understand the idea visually before being asked to solve problems.

## Research-derived patterns
- Abacus Kids - Mental Math: structured Learn → Practice → Quiz phases, beginner bead basics, theory before formulas, fresh practice sets, visible daily streaks, and saved results. Source: Google Play/App Store listings reviewed 2026-09-16.
- KidsUP Soroban: guided lessons, AI/tutor-style instruction, game-based drills, and parent progress tracking.
- Sorokid: adventure-map progression, daily quests, rewards, and a strong mascot/world presentation.
- Practice Abacus: touch-friendly abacus, progressive curriculum, progress/streaks/goals/badges, instant feedback and speed drills.
- Vedaavi/Abacus Child Learning App: step-by-step, final-answer, exam-style practice and visual bead movement cues.

## Our product decision
Do NOT copy another app's visual identity. Borrow proven interaction patterns and build a distinct Babi world.

### Learn
1. Story setup: Babi introduces one concept in a tiny scene.
2. Show: Babi demonstrates the bead movement on a large abacus.
3. Explain: one idea per screen; highlight the exact bead/rod.
4. Guided try: child follows a visible hand/arrow cue.
5. Independent try: child performs the same movement without the cue.
6. Micro-win: sparkle, sound and Babi reaction.
7. Checkpoint: 2–3 tiny tasks prove understanding.
8. Unlock: Practice becomes visually available only after the lesson checkpoint.

### Practice
1. Large abacus remains the hero interaction.
2. One problem at a time; no keyboard answer entry.
3. Babi reacts to every correct/wrong result.
4. Gentle hint after a struggle, not immediately.
5. Progress is visible but never overwhelming.
6. Short 5–10 problem sessions with a clear finish.
7. Correct: bead celebration + sparkle + Babi.
8. Wrong: reset/support + explanation of the relevant movement.
9. Session finish: score, accuracy, streak, next recommended action.
10. Repetition should vary problems while preserving the intended level/rule.

## Visual direction
- Babi is the recognizable guide.
- Warm wooden abacus + colorful beads + playful learning-world environments.
- Character → environment/props → action → UI hierarchy.
- Large touch targets and mobile-first composition.
- Avoid generic dashboard/SaaS appearance.
- Avoid visual overload during calculation: decoration surrounds the learning area, never competes with the beads.

## Architecture rule
Keep Learn/Practice behavior in the current core architecture unless an existing module already owns the responsibility. Search before creating new files. Do not create duplicate Babi, navigation, session, or abacus implementations.

## Acceptance gate
A new child must be able to answer "what do I do with this bead?" from the Learn flow without parent intervention before Practice unlocks. Practice must feel like a game-like abacus activity while preserving mathematical correctness and low-latency bead interaction.
