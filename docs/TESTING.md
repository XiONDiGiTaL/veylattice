# Testing Plan

Rules tests should cover all 25 elemental pairs, stat halving/rounding/minimums, Flux refill/spending, empty deck, capacity limits, deck size/duplicates, board bounds, occupied squares, movement/range, ownership, illegal targets, action-use limits, defeat, direct attacks, turn transitions, and game-over state.

Integration tests should run a match from setup through summon, move, attack, defeat, end turn, and victory. Verify UI cannot bypass rules validation. Inject deterministic randomness. Assert behavior rather than implementation details and add regression tests for discovered bugs.
