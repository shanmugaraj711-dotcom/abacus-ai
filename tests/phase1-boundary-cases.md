# Phase 1 boundary cases

1. Level 1 + two wrong: remains Level 1 and explicitly explains the floor.
2. Level 2 + two wrong: becomes Level 1.
3. Three correct at Level 1: becomes Level 2.
4. Three correct at Level 15: remains Level 15.
5. A correct answer resets consecutive wrong count.
6. A wrong answer resets the correct streak.
7. Refresh after one wrong preserves the pending wrong count on staging.
8. Rule counters and per-level counters persist locally.
9. Negative subtraction is never generated.
10. Mixed levels use only their permitted rule families.