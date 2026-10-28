# Implementation TODO

Read with ROADMAP.md and AI_HANDOFF.md. Status values: TODO, IN_PROGRESS, BLOCKED, DONE, DEFERRED. All gameplay tasks below are TODO, not implementation claims. Split large tasks into stable child IDs when work starts; preserve parent scope and history.

## Completed documentation
- DOC-001 | DONE | Expanded specifications and 18 unique visual briefs. Evidence: commit b42c38ada7eae2177d8e98cfd69ce16ed70b9670; documentation completion only.
- DOC-002 | DONE | Supplied transcript and visual identity reconciliation. Evidence: commit 33c4b4885cebcd2c5b70135a1a1c64cdb8170931; documentation completion only.
- TRACK-001 | DONE | Define changelog, TODO and handoff files and require them in AI_INSTRUCTIONS.md. Evidence: the containing documentation change; no runtime behavior changed or tested.

## M1 - Working offline core (P0)
### M1-001 | TODO | Audit and establish test harness
Dependencies: none. Paths: src/main.js, src/game/, tests/, minimal tooling if needed.
Acceptance: record actual current behavior and commands; runnable automated test harness; current-versus-target rules gap list; static HTTP startup still works.
### M1-002 | TODO | Extract deterministic command/state engine
Depends on M1-001. Paths: src/game/, src/main.js.
Acceptance: DOM-free reducer, immutable card definitions, injected clock/RNG, legal ownership/targets/costs and structured failures; automated tests prove invalid commands leave state unchanged.
### M1-003 | TODO | Movement, combat and victory
Depends on M1-002. Paths: src/game/, tests/, GAME_RULES.md if clarifications are needed.
Acceptance: legal pathing/range, persistent Guard, eligible simultaneous retaliation, defeat/discard, Nexus direct attacks, fatigue/win/draw, all 25 element pairs; actual passing test results recorded.
### M1-004 | TODO | Turns, draw, Flux, summon and mulligan
Depends on M1-002. Paths: src/game/, tests/.
Acceptance: opening/normal draws, first-turn Flux sequencing, cost validation, summon/readiness limits and atomic documented mulligan; no zero-Flux bypass.
### M1-005 | TODO | HUD, 120-second deadline and full match
Depends on M1-003, M1-004. Paths: index.html, styles.css, src/main.js, UI modules as needed, tests/.
Acceptance: visible timer, legal target feedback, below-unit stats/card details, timeout preserves committed actions, reachable full match end; browser smoke check at root and /Veylattice/ plus deadline tests.

## M2 - Cards, decks and Practice (P1)
### M2-001 | TODO | Typed effects and Actions/Relics
Depends on M1-003, M1-004. Paths: src/game/, src/cards/, tests/.
Acceptance: allowlisted effect queue, revive/return/death growth, explicit ordering/stacking and loop protection; tested simultaneous death, buff expiry and revive readiness.
### M2-002 | TODO | Deck validation and prebuilt decks
Depends on M2-001. Paths: src/cards/, deck modules, tests/.
Acceptance: 20-40 total, minimum 10 Vessels/five Actions, max three canonical copies and ownership checks; at least three playable validated archetypes. Numerical defaults remain tunable.
### M2-003 | TODO | Legal tactical AI and prebuilt Practice
Depends on M1-005, M2-002. Paths: src/ai/, UI, tests/.
Acceptance: varied legal strategies without hidden-hand access, bounded decision time, player-selected prebuilt versus randomized prebuilt, completed automated matches and zero progression rewards.

## M3 - Collection/content UI (P1)
### M3-001 | TODO | Stash, deck builder, shop, Singles and recycling UI
Depends on M2-002. Paths: UI, collection modules, tests/.
Acceptance: clearly labeled demo-only balances until trusted integration; six-card pack presentation, permanent discovery concepts, protected quantities and explicit confirmations; no local data presented as server currency.
### M3-002 | TODO | Versioned schemas and expansion validation
Depends on M2-001. Paths: content manifests, validators, tests/.
Acceptance: stable IDs, valid references/effects/pools, exactly five Commons plus one Rare+, disclosed odds; supported new cards load without engine edits; invalid content fails safely.

## M4 - Trusted backend (P1)
### M4-001 | TODO | Auth, schema and RLS preparation
Depends on M3-002. Paths: backend source, migrations, config example, tests/.
Acceptance: reviewed source/migrations, private user data, denied unauthorized writes and secret-free browser config. Applying/deploying requires owner approval.
### M4-002 | TODO | Authoritative matches, server AI, rewards and economy
Depends on M4-001, M2-003, M3-001.
Acceptance: versioned/idempotent commands, private projections, persisted deadlines/worker, cryptographic pack RNG, atomic wallet/collection/reward settlement; retry/concurrency/tamper tests pass before rewards are enabled.

## M5 - Four-seat lobbies and Tag (P1)
### M5-001 | TODO | Lobby lifecycle, teams and reconnect
Depends on M4-002. Paths: lobby/transport/backend/UI/tests.
Acceptance: all human/AI seat combinations, codes/invites/readiness, team turns, reconnect/AI takeover, no hand leakage or host-trusted rewards, all documented lifecycle tests.

## M6 - Ranked and rotations (P2)
### M6-001 | TODO | AI ladder, seasonal emblems and shop schedule
Depends on M4-002, M3-002.
Acceptance: three-match promotion series, no in-season demotion, monthly reset, retained inventory/emblems, rank rewards/odds, weekly rotation/occasional Friday sale; UTC boundaries and economy/farming checks pass.

## M7 - World systems and 3D (P2)
### M7-001 | TODO | Arena affinity, terrain and hazards
Depends on M1-003, M2-001. Paths: src/arenas/, rules, UI, tests/.
Acceptance: start with one symmetric arena, then terrain/hazards; visible warnings and explicit triggers; Guard bonuses preserve damage and never heal by repeated recalculation.
### M7-002 | TODO | Lore Bonds and free Codex/Bestiary
Depends on M7-001. Paths: bond data/resolver, Codex UI, tests/.
Acceptance: three authored pairings, orthogonal same-controller checks, nonstacking duplicates, custom exclusion, four free Codex sections and linked unit/set views with all stats.
### M7-003 | TODO | Vessel Forge and Custom Practice
Depends on M2-002, M7-002. Paths: creator/validation/persistence/UI/tests.
Acceptance: deterministic paid-for power budget, safe editable/generated text, save/edit/delete/deck integration, no official bonds or reward eligibility; offline custom play separate from prebuilt Practice.
### M7-004 | TODO | Unique voxel models and accessible frames
Depends on M1-005; production integration follows stable rules. Paths: rendering/assets/UI; docs/UNIT_VISUAL_DESIGNS.md.
Acceptance: 18 original identifiable silhouettes, appropriate animation states, legible elemental/rarity frames, actual tactical-camera review, measured mobile performance, reduced-motion support and asset provenance.

## Decisions and blockers to preserve
- Prices, pack odds, promotion wins, mulligan cost and Tag dimensions are proposed defaults, not proven balance.
- Deployment project, quotas, production configuration and migrations require separate approval; this does not block offline M1.
- New transcript excerpts may add context; do not revert canonical newer rules silently.
- This list is a starting execution map, not evidence of implemented tasks.
