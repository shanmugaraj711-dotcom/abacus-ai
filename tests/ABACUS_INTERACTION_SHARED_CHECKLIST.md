# Abacus Interaction — Shared QA Checklist

## Purpose

Run the **same interaction checklist** against every screen that uses the shared abacus component. Do not create screen-specific interaction criteria.

Screens in this QA pass:
- Learn
- Builder
- Assessment
- Practice

## Preconditions

- Start from a clean/rendered abacus state.
- Confirm the visible number is `0` before the first interaction where applicable.
- For each screen, reset/re-render the abacus before starting the checklist.
- Record both the displayed number and the physical bead position after every action.

## Exact checklist — run unchanged on all four screens

### A. Tap lower beads
- [ ] Tap lower bead 1.
- [ ] Displayed number increments to `1`.
- [ ] Bead 1 visibly moves toward the beam.
- [ ] Tap lower bead 2.
- [ ] Displayed number becomes `2`.
- [ ] Beads 1–2 are visibly active/moved; remaining lower beads stay inactive.
- [ ] Tap lower bead 2 again.
- [ ] Displayed number returns to `1`.
- [ ] Bead 2 visibly returns; bead 1 remains moved.

### B. Tap upper 5-bead
- [ ] Reset/re-render the abacus.
- [ ] Tap the upper 5-bead.
- [ ] Displayed number becomes `5`.
- [ ] Upper bead visibly moves to its active position.
- [ ] Tap the upper 5-bead again.
- [ ] Displayed number returns to `0`.
- [ ] Upper bead visibly returns to its inactive position.

### C. Drag lower beads
- [ ] Reset/re-render the abacus.
- [ ] Drag a lower bead toward the beam.
- [ ] Displayed number changes exactly once.
- [ ] The dragged bead visibly moves to the corresponding active position.
- [ ] Drag/toggle another lower bead.
- [ ] Displayed number and active lower-bead count agree.
- [ ] No bead visually moves without the count changing, and no count changes without the corresponding bead movement.

### D. Drag upper 5-bead
- [ ] Reset/re-render the abacus.
- [ ] Drag the upper 5-bead toward the beam.
- [ ] Displayed number becomes `5` exactly once.
- [ ] Upper bead visibly moves to the active position.
- [ ] Return/toggle the upper bead.
- [ ] Displayed number returns to `0`.
- [ ] Upper bead visibly returns to the inactive position.

### E. Final invariant
- [ ] **Number == visual bead state after every interaction.**
- [ ] No duplicate count update from one physical action.
- [ ] No visual-only movement without state/count change.
- [ ] No state/count change without matching visual movement.

## Execution matrix

| Screen | Tap lower | Tap upper | Drag lower | Drag upper | Number/visual invariant |
|---|---|---|---|---|---|
| Learn | ☐ | ☐ | ☐ | ☐ | ☐ |
| Builder | ☐ | ☐ | ☐ | ☐ | ☐ |
| Assessment | ☐ | ☐ | ☐ | ☐ | ☐ |
| Practice | ☐ | ☐ | ☐ | ☐ | ☐ |

**Rule:** The checklist above is identical for all four screens. Only the screen name changes.
