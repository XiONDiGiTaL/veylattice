# Implementation TODO

Read with ROADMAP.md and AI_HANDOFF.md. Status values: TODO, IN_PROGRESS, BLOCKED, DONE, DEFERRED. Only tasks whose acceptance criteria were met and whose checks actually ran are marked DONE. Split large tasks into stable child IDs when work starts; preserve parent scope and history.

## Completed documentation

- DOC-001 | DONE | Expanded specifications and 18 unique visual briefs. Evidence: commit b42c38ada7eae2177d8e98cfd69ce16ed70b9670; documentation completion only.
- DOC-002 | DONE | Supplied transcript and visual identity reconciliation. Evidence: commit 33c4b4885cebcd2c5b70135a1a1c64cdb8170931; documentation completion only.
- TRACK-001 | DONE | Define changelog, TODO and handoff files and require them in AI_INSTRUCTIONS.md. Evidence: the containing documentation change; no runtime behavior changed or tested.
- DOC-003 | DONE | Reference research and adaptation matrix required by the session directive. Evidence: docs/REFERENCE_RESEARCH.md, docs/MECHANIC_ADAPTATION_MATRIX.md, docs/IMPLEMENTATION_LOG.md. Recording REA's provider timeout is an observed limitation, not a completed analysis of the reference bundle.

## M1 - Working offline core (P0)

### M1-001 | DONE | Audit and establish test harness
Dependencies: none. Paths: src/game/, tests/, package.json.
Acceptance met: current behavior versus GAME_RULES.md recorded; Node built-in test harness runnable (`node --test "tests/*.test.js"`); static HTTP startup verified at repository root and under `/Veylattice/`.
Evidence: docs/IMPLEMENTATION_LOG.md session S-M1-A; 37/37 tests pass; browser smoke checks recorded. No gameplay tests existed before this session.

### M1-002 | DONE | Extract deterministic command/state engine
Depends on M1-001. Paths: src/game/engine.js, src/game/content.js, src/game/constants.js, src/main.js.
Acceptance met: DOM-free reducer, frozen card definitions, injected RNG and clock, validated ownership/targets/costs/versions, structured error codes; tests prove rejected commands return the unmodified state (including reference equality on representative paths).
Evidence: `stale, unknown and illegally-shaped commands never mutate state`; `catalog definitions are never mutated by play`.

### M1-003 | DONE | Movement, combat and victory
Depends on M1-002. Paths: src/game/engine.js, src/game/elemental-rules.js, tests/.
Acceptance met: legal orthogonal pathing with occupied-cell blocking; persistent Guard; eligible simultaneous retaliation; defeat/discard; Nexus direct attacks with home-row and undefended gates; fatigue, win, surrender and simultaneous-lethal draw; all 25 element pairs tested.
Evidence: 37/37 tests pass, including `combat removes Guard persistently instead of using a threshold`, `elemental advantage applies to attack and retaliation independently`, `Nexus direct attacks require the enemy home row and an empty enemy board`.

### M1-004 | DONE | Turns, draw, Flux, summon and mulligan
Depends on M1-002. Paths: src/game/engine.js, tests/.
Acceptance met: opening five cards plus first-turn draw; Flux 1→10 with refill and expiry; one normal summon, four-Vessel cap, deployment rows, unready entry; zero-cost cards still require one available Flux; once-per-turn one-Flux mulligan with atomic rejection paths.
Evidence: engine tests listed in docs/IMPLEMENTATION_LOG.md.

### M1-005 | DONE | HUD, 120-second deadline and full match
Depends on M1-003, M1-004. Paths: index.html, styles.css, src/main.js, tests/.
Acceptance met: visible deadline timer synchronized to `deadlineAt`; legal summon/move/attack highlighting; below-unit Attack and current/maximum Guard strip; selection panel with card and Vessel details; deadline auto-pass preserves committed actions (engine tests); complete match reachable (integration test); browser smoke at root and `/Veylattice/`.
Evidence: browser session in docs/IMPLEMENTATION_LOG.md (summon, move, attack with retaliation, defeat/discard, mulligan; no console errors). Real-time expiry was not waited out in the browser — covered by `commands at or after the deadline are rejected and the turn is passed`.

### M1-006 | DONE | Hot-seat AI replacement
Depends on M2-003. Paths: src/game/ai.js, src/main.js, index.html.
Acceptance met: Seat 2 is played by the tactical AI; the human only ever controls Seat 1; board interactions are disabled while the AI acts; the human hand is the only hand rendered.
Evidence: browser play at `/Veylattice/` (AI summoned, moved, attacked, traded and ended turns across six rounds); headless CDP session recorded 5 units on board with both Nexuses at 30; `preview_logs`/`Runtime.exceptionThrown` produced no console errors.

## M2 - Cards, decks and Practice (P1)

### M2-001 | IN_PROGRESS | Typed effects and Actions/Relics
Depends on M1-003, M1-004. Paths: src/cards/actions-relics.json, src/game/content.js, src/game/engine.js, tests/cards.test.js.
Acceptance: allowlisted effect vocabulary with no executable card code; damage/heal/draw/buff effects; relic auras; tested rejections; remaining families still outstanding.

#### M2-001a | DONE | Action and Relic slice
Acceptance met: closed `EFFECT_KINDS` vocabulary with per-kind scope and numeric ranges validated at catalog build and frozen; 8 Actions (`damage`, `damageAll`, `heal`, `buff`, `draw`, `nexusDamage`) and 4 Relics (`attackAura`, `armorAura`, `mendAura`, `guardAura`); `playAction`/`playRelic` commands behind the same `applyCommand` validator; targets enumerated by `actionTargetsFor` and shared by HUD and AI; two-Relic cap; aura aggregation in one `relicAuras` helper used by attacks, Nexus damage, turn start and summons.
Evidence: 69/69 tests, including elemental Action damage, heal capping, permanent buffs, sweep packets, armour reduction, wrong-side/missing targets, Relic cap, and aura timing on existing and future Vessels.
Outstanding for full M2-001: effect **queue** with explicit ordering and a resolution limit; revive/return/death-trigger effects; temporary buff expiry; loop protection; tested simultaneous-death ordering.

### M2-002 | IN_PROGRESS | Canonical deck validation and prebuilt decks
Depends on M2-001. Paths: src/cards/, src/game/content.js, tests/content.test.js.
Acceptance: `createMatch` uses `DECK_RULES` (20-40 cards, ≥10 Vessels, ≥5 Actions, ≤3 copies) with the practice exception deleted; at least three validated archetypes; ownership-aware validation remains a backend concern.

#### M2-002a | DONE | Canonical rules enforced, exception removed
Acceptance met: `PRACTICE_DECK_RULES` deleted from constants, engine and tests; `createMatch` defaults to `DECK_RULES`; the practice deck is 38 cards (18 Vessels + 16 Actions + 4 Relics) and validates under the canonical rules; a vessel-only deck is rejected with `Deck needs at least 5 Actions`.
Outstanding: three named, validated prebuilt deck archetypes and a deck-building UI.

### M2-003 | DONE | Legal tactical AI
Depends on M1-005. Paths: src/game/ai.js, src/game/engine.js (`attacksFromCell`, `lineOfSightOnBoard`, `canStrikeNexusFrom`), src/main.js, tests/ai.test.js.
Acceptance met: candidates come only from engine legal-action enumeration; the decision function receives a filtered observation (own hand + public board + opponent counts) and no match state; per-difficulty time budget with best-so-far retention and `truncated` reporting; four difficulties and three weighted archetypes; AI-vs-AI matches complete with zero rejected commands; no rewards are granted.
Evidence: `node --test "tests/*.test.js"` -> 53/53 pass, including `the observation never contains opponent hand or deck contents`, `changing hidden opponent cards cannot change the AI's plan`, `decisions respect the time budget and report truncation`, `an AI-versus-AI match only ever submits accepted commands`, `a veteran finds a lethal move-then-strike line that a novice cannot`.
Not claimed: the AI is not proven balanced; its win rate against humans is unmeasured.

### M2-004 | DONE | Player profile, avatar upload and cloud persistence
Depends on M1-005. Paths: src/net/config.js, src/net/profile.js, src/main.js, index.html, styles.css, supabase/migrations/0001_profiles.sql, tests/profile.test.js.
Acceptance met: editable display name, image avatar (centre-crop, 128 px, WebP/JPEG, SVG rejected), difficulty/archetype selection, motion and coordinate preferences, match record; local-first persistence with best-effort cloud sync and an honest sync state; all restored data re-sanitised; database denies direct table access and requires a per-profile edit token.
Evidence: 53/53 tests; live RPC verification (insert 200, read 200, wrong token 401, correct-token update 200, direct table select 401); avatar upload in a real browser produced a 2.4 KB WebP that was confirmed in the database (`avatar_chars = 2415`).
Not claimed: not an authentication system. No cross-device sign-in, recovery or ownership transfer; no abuse rate limiting (see M2-005).

### M2-005 | TODO | Cloud write abuse guard
Depends on M2-004, M2-006. Paths: supabase/migrations/, src/net/profile.js, src/net/account.js.
Acceptance: bounded profile and account creation per IP/window, plus a load attempt limit for recovery codes, or a captcha-equivalent gate; documented retention/cleanup for abandoned rows; a test or documented manual check demonstrating the guard. Blocker: requires a trusted edge/server component; a browser cannot enforce this.

### M2-006 | DONE | Portable accounts and cross-device progress
Depends on M2-004. Paths: src/net/account.js, src/net/rpc.js, src/net/profile.js, src/main.js, index.html, supabase/migrations/0002_accounts.sql, docs/ACCOUNTS.md.
Acceptance met: server-minted 100-bit recovery code stored only as a SHA-256 digest; create/load/save/rotate RPCs behind RLS with no table grants; signed-in saves replace device saves; signing out leaves the account intact; the UI shows the code, supports copy, rotation and sign-out, and states the provider limitation instead of rendering dead buttons.
Evidence: live database flow verified (direct read 401, wrong code null, wrong-code save 401, correct save ok, rotation invalidates the old code); browser round trip — create, rename to *Lattice Adept*, sign out, rename guest to *Guest Only*, sign back in, *Lattice Adept* restored. Test rows deleted.
Not claimed: no Google/Discord sign-in (providers disabled and credentials unavailable — see docs/ACCOUNTS.md); no throttling on load attempts (see M2-005).

### M2-007 | DONE | Voxel combat presentation
Depends on M1-005, M2-001a. Paths: src/main.js (`playEvents`), styles.css.
Acceptance met: CSS voxel cubes per unit; attack lunges driven by pre-command snapshots; impact flash and shake; floating damage numbers with advantage/retaliation variants; Guard values counted down rather than swapped; lethal hits leave a crumbling ghost chip; Nexus strikes shake the board; Action casts, heals, buffs and summons have distinct feedback; reduced-motion and the in-game toggle skip everything.
Evidence: browser checks confirmed `.fx-lunge`, `.fx-hit`, `.dmg-float`, `.dmg-float.retaliation`, `.fx-ghost`, `.fx-spawn`, `.fx-cast-hit`, `.fx-shake` appearing during real engine events, and a Guard value animating `5/8 → 2/8` mid-tick.
Not claimed: no sprite or GLB models; units are CSS cubes on a tile, and no animation frame was captured as a screenshot (transient effects outlive the capture latency).

### M3-001 | TODO | Stash, deck builder, shop, Singles and recycling UI
Depends on M2-002. Paths: UI, collection modules, tests/.
Acceptance: clearly labeled demo-only balances until trusted integration; six-card pack presentation, permanent discovery concepts, protected quantities and explicit confirmations; no local data presented as server currency.

### M3-002 | TODO | Versioned schemas and expansion validation
Depends on M2-001. Paths: content manifests, validators, tests/.
Acceptance: stable IDs, valid references/effects/pools, exactly five Commons plus one Rare-or-better, disclosed odds; supported new cards load without engine edits; invalid content fails safely.

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
Acceptance: 18 original identifiable silhouettes, appropriate animation states, legible elemental/rarity frames, actual tactical-camera review, measured mobile performance, reduced-motion support and asset provenance. Before model production starts, add docs/VOXEL_PIPELINE.md (construction, export, material and validation pipeline); docs/VOXEL_ART_BIBLE.md and docs/UNIT_VISUAL_DESIGNS.md already exist, docs/CARD_FRAMES.md covers frame direction.

### M7-005 | TODO | Keyboard and assistive control pass
Depends on M1-005. Acceptance: arrow-key grid traversal, focus return after commands, screen-reader announcements for combat results, no hue-only signalling (element abbreviations already present).

## Decisions and blockers to preserve
- Prices, pack odds, promotion wins, mulligan cost and Tag dimensions are proposed defaults, not proven balance.
- Deployment project, quotas, production configuration and migrations require separate approval; this does not block offline M1/M2.
- New transcript excerpts may add context; do not revert canonical newer rules silently.
- The practice deck exception is temporary and must be removed in M2-002, not relabeled as a rule.
- Attack line of sight requires orthogonal alignment (provisional default; review after playtest).
- Player profiles are device identities, not accounts. The edit token is a write capability, not authentication; do not describe saved profiles as secure accounts.
- Cloud data lives in a Supabase project (`jjtfnduodxtulxvviasf`) created only for Veylattice. Do not add Veylattice tables, policies or functions to the Sohbet project or any other app's project.
- The publishable/anon key in `src/net/config.js` is intentionally public. The `service_role` key must never enter the repository or the browser bundle.
