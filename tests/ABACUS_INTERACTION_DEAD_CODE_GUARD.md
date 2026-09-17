# Abacus Interaction Dead-Code Guard

The shared abacus interaction path must not contain the retired dual-bookkeeping helpers `refreshLowerMotion()` or `demoBeads()`.

Required invariant:
- `refreshLowerMotion` must not exist anywhere in the active source tree.
- `demoBeads` must not exist anywhere in the active source tree.
- Bead movement must remain derived from count/state through the shared render path.

This guard exists to prevent a future patch from reintroducing the retired animation/state path.