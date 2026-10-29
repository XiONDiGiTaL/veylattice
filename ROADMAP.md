# Implementation Roadmap

All entries below are planned, not completed. Preserve current prototype while replacing its rules with a tested engine.

## M1: Complete offline match
Pure command reducer; legal summon/move/attack; persistent Guard and simultaneous eligible retaliation; elemental damage adaptation; direct Nexus attacks; draw/Flux/mulligan; 120-second timer; discard/fatigue/win/draw; DOM integration. Gate: deterministic unit tests for rules, all 25 elemental pairs, timeout boundaries and a full playable match.

## M2: Effects, decks and practice AI
At least three valid prebuilt archetypes using Actions/Relics; typed effect queue, revival/return/death growth; 20-40-card and ownership-aware validators; legal bounded AI; Practice gives zero progression. Gate: automated complete AI matches and no hidden-info access.

## M3: Collection and content UI — IMPLEMENTED locally (2026-10-29); cloud sync still planned
Stash, deck builder, six-card pack interface, Singles/recycling confirmations and schema/version tooling. Balances are local-only and labelled as such, separate from future server collection. Gate: pack, deck, discovery, quantity and odds tests — covered by tests/decks.test.js and tests/economy.test.js (149/149 total).

## M4: Trusted online persistence
Prepare reviewed Supabase migrations, RLS tests, authenticated profile/collection/decks, trusted command processor, server AI, idempotent wallet/pack/reward settlement and timeout worker. Apply/deploy only after approval. Gate: cross-user denial, tamper/concurrency tests and authenticated reload recovery.

## M5: Lobbies and tag — PEER-VALIDATED PREVIEW implemented (2026-10-29); server-authoritative still planned
Two-player room code/invite, deck selection, readiness/locking and synchronized turns over Supabase Realtime, with every remote command re-validated by the receiving engine. Four-seat Tag, team turns, reconnect/AI takeover and trusted validation remain planned and BLOCKED on owner approval + migrations. Gate: all seat combinations, no hand leakage, duplicate start/command handling and /Veylattice/ link tests — the preview covers two-player lifecycle/validation tests; end-to-end two-browser verification is outstanding.

## M6: Seasons and shop schedule
Three-match promotion series, monthly reset, persistent emblems, rank reward/odds profiles, weekly stock and occasional Friday half-price offer. Gate: UTC boundaries, concurrent settlement, economy simulations and no reward farming via custom rooms.

## M7: World systems and unique 3D production — 3D ARENA implemented (2026-10-29); world systems still planned
Symmetric arena data/hazards, official Lore Bonds, Codex and restricted Forge; bespoke 18-unit blockouts and production models, elemental/rarity frames and responsive HUD. The 3D battlefield itself is implemented (Three.js primary, CSS-3D fallback, integrated card fields and discard piles). Gate: silhouette/readability review, mobile performance measurement, reduced-motion behavior and original asset provenance.

## UI-002: Premium main menu, Play dialog and lobby — IMPLEMENTED (2026-10-29)
Canonical design: docs/UI_DESIGN_SYSTEM.md. The Decks/Shop/Library/Settings layouts and the battle HUD inherit the tokens only; their deeper redesign is planned (UI-003).

## Every milestone report
State implemented versus specified features, exact files changed, commands/tests actually run, migration/deployment requirements and known limitations. Do not report the whole game finished after a documentation change.
