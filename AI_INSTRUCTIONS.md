# AI Build Instructions

Build Veylattice, an original HTML-first tactical collectible card battler. Inspect existing code before editing. This is a production specification, not evidence that features are implemented. Preserve working behavior; implement and test one coherent milestone at a time.

## Mandatory work history and cross-model continuity
Before editing, read CHANGELOG.md, TODO.md and AI_HANDOFF.md alongside the design documents. Inspect the current branch, latest commits and working tree; reconcile stale notes with actual code. Also read docs/TRANSCRIPT_RECONCILIATION.md and ART_BIBLE.md for the supplied transcript and visual context.
For every meaningful change or work session, including documentation-only sessions, update these three Markdown files in the same change set:
- CHANGELOG.md: append a dated entry under Unreleased with task/session IDs, what was added/changed/fixed/removed, affected paths, behavior changes, decisions, exact test commands/results, known limitations and migration/deployment impact. State Not run and why when tests were not executed. Never invent test results or imply planned work is implemented. Preserve prior entries; correct errors transparently rather than deleting history.
- TODO.md: maintain stable task IDs, milestone, priority, status, dependencies, affected paths and observable acceptance criteria. Use TODO, IN_PROGRESS, BLOCKED, DONE or DEFERRED. Mark DONE only when implemented and acceptance checks pass; documentation alone never completes gameplay tasks. Record blockers, partial work and concrete next actions. Do not delete unfinished tasks or silently change scope; explain deferrals.
- AI_HANDOFF.md: maintain a concise current snapshot for a fresh AI model: verified branch/base commit, last session scope, files touched, implemented versus specified features, actual tests and failures, unresolved decisions, blockers, approval requirements and the next three executable steps with task IDs. Record uncommitted changes if any. Never fabricate the current commit hash or try to embed a commit's own hash before it exists; use the verified parent/base and refer to the containing commit when appropriate.
Do not include secrets, credentials, private player data or hidden chain-of-thought. Record engineering decisions and evidence, not private deliberation. Logs do not grant deployment approval. A final chat summary does not substitute for committed tracking files. Before ending, reconcile all three files with the actual diff and mention their paths in the final report. If repository writes are unavailable, provide complete proposed tracking updates and clearly state they were not saved.

## Read order and precedence
Read README.md, PROJECT_BRIEF.md, GAME_RULES.md, TECHNICAL_ARCHITECTURE.md, docs/MODES_AND_LOBBIES.md, docs/PROGRESSION_AND_CONTENT.md, docs/UNIT_VISUAL_DESIGNS.md, docs/VOXEL_ART_BIBLE.md, and docs/IMPLEMENTATION_PROMPT.md. Then read relevant existing world, arena, synergy, creator, frame, catalog and testing documents. GAME_RULES.md overrides older combat/deck proposals, including docs/COMBAT_RULES.md and older card-guide examples. docs/PROGRESSION_AND_CONTENT.md governs collection/rarity. Preserve existing lore and stable IDs. User requirements are mandatory; explicitly labeled proposed defaults remain tunable, not user-approved final balance.

## Vocabulary and constraints
Vessel = unit; Action = one-shot card; Relic = persistent card; Flux = pool resource; Vitality = player life; Guard = persistent unit defense; Lattice Shards = proposed earned shop/recycling currency. Five elements: Wood, Fire, Earth, Metal, Water. Otherworldly is a subtype, not a sixth element. Board target 7x7; four Vessels and two Relics per seat; printed Attack/Guard 1-10, runtime bonuses may exceed 10. Decks 20-40 cards, at least 10 Vessels and 5 Actions, up to three copies per canonical card ID. The minimum total and Action minimum are proposed defaults.

## Non-negotiable implementation principles
- Separate pure rules, content, AI, presentation, transport and persistence. Browser UI never decides authoritative legality or economy.
- Start with HTML, CSS and vanilla JS ES modules. Keep static hosting and relative asset paths working under /Veylattice/. Add Three.js after core rules tests pass.
- Validate commands, ownership, costs, timing, targets, copy counts and state versions. Inject time and RNG in tests. Do not mutate printed card definitions.
- Never claim AI, networking, 3D assets or server persistence exists because a document or placeholder exists. Report tests actually run and remaining limitations.
- Prepare Supabase migrations and backend source as milestones; do not apply migrations, provision services, spend money, deploy, or insert secrets without separate approval. Never reuse reference-project credentials.
- Earned currency, pack rolls, rank changes and match results require trusted server validation and atomic/idempotent transactions. Local practice cannot grant online progression.
- Original code/art/lore/card text/UI only. Private conceptual references: Yu-Gi-Oh Master Duel for collection/deck workflows, Duelyst for tactical movement and retaliation, Magic: The Gathering for resource/effect interaction, Pokemon for collectible creature identity. These are abstract references, never templates to copy. Do not put these titles in README.md.

## Preserve existing systems
Read docs/WORLD_BIBLE.md, docs/ARENA_SYSTEM.md, docs/SYNERGY_SYSTEM.md, docs/UNIT_CATALOG.md, docs/CARD_CREATOR.md, docs/CARD_FRAMES.md and docs/ELEMENTAL_SYSTEM.md. Keep symmetric telegraphed arena effects, official-ID Lore Bonds, nonstacking duplicate bonds, and custom-card exclusion from official named bonds. Custom cards use origin=custom and an allowlisted point-budget creator, never executable scripts. Custom cards are casual/practice-only by proposed default and never enter ranked pack pools. Render user text safely. Codex explains stats, abilities, lore and authored synergies without claiming optimality.

## Art/content requirements
The existing 18 official Vessel IDs remain stable. Every Vessel needs a bespoke silhouette, anatomy, materials, prop/focal point, animation identity and card portrait. Read docs/UNIT_VISUAL_DESIGNS.md together with docs/VOXEL_ART_BIBLE.md. Shared rigs are allowed; recolored duplicate models are not. New units, tokens, leaders, Relics and hazards require the same explicit design metadata before completion. Keep content data-driven and versioned. A new card using supported effects must not require engine edits; a genuinely new mechanic requires an explicit handler and tests.

## Delivery sequence
1. Deterministic rules engine, persistent Guard/retaliation, legal movement, direct attacks, timer, turns, draw/mulligan and win states; automated tests.
2. Actions/Relics, effect queue, revive/return, death triggers, deck validation, three prebuilt decks and offline AI practice.
3. Stash/deck/shop UI and validated versioned content pipeline, using clearly marked nonpersistent demo data until server integration.
4. Supabase Auth/Postgres schema, RLS and trusted command/reward endpoints; reward-bearing AI matches.
5. Four-seat room-code lobbies, all human/AI tag combinations, reconnect and privacy tests.
6. Monthly AI-ranked ladder, promotions, rank rewards, shop rotations and Friday offers.
7. Arena/Bond/Codex/Forge integration and unique 3D assets; optimize after measuring mobile performance.

Each milestone must deliver complete files, runnable commands, migrations/config examples when relevant, tests, documentation and an honest status summary. Do not stop at a plan when asked to implement a milestone.
