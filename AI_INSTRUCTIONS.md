# AI Build Instructions

Build Veylattice, an original HTML-first tactical card battler. Read README.md, PROJECT_BRIEF.md, GAME_RULES.md, TECHNICAL_ARCHITECTURE.md, and the relevant files under docs/ before substantial changes. Inspect current code first; preserve working behavior. Implement one coherent milestone at a time. Keep deterministic rules separate from DOM/rendering code. Add tests for rules changes and report only tests actually run. Do not add services, secrets, accounts, or a backend without approval. Do not create empty files to imitate a directory tree.

## Vocabulary
- Vessel: creature/unit
- Action: one-shot effect
- Relic: persistent card
- Flux: resource
- Vitality: player life
- Guard: defensive stat
- Elements: wood, fire, earth, metal, water
- Vessel subtypes currently targeted: warrior, beast, mystic, construct, demon, dragon, ancient, spirit, otherworldly

## Core constraints
- Board target 7x7; max 4 Vessels per player; printed Attack and Guard 1-10.
- Use docs/ELEMENTAL_SYSTEM.md as the canonical elemental rules source.
- Unresolved rules and new concepts are provisional, not finalized.
- Validate all player actions in the rules engine. Keep randomness injectable for tests.
- Start with HTML, CSS, and vanilla JS modules. Add Three.js after the core loop is stable.
- Use safe DOM APIs, keep dependencies minimal, and create original expressive content.
- Do not copy proprietary code, art, models, card text, lore, UI, or distinctive presentation from other games.
- Definition of done: behavior works, relevant tests run, docs match code, run steps are documented, limitations are stated.

## World, arena, and synergy directives
- Read docs/WORLD_BIBLE.md, docs/ARENA_SYSTEM.md, docs/SYNERGY_SYSTEM.md, and docs/UNIT_CATALOG.md before adding lore, arenas, or relationships.
- Treat those documents and new arena/bond data as concepts until explicitly approved; keep rules data-driven and avoid arena- or card-name-specific branches in the engine.
- Arena modifiers affect both players symmetrically. Telecast hazards clearly and specify their trigger timing and counterplay. Do not implement a hazard whose resolution order conflicts with canonical combat rules.
- Lore Bonds apply only to listed official Vessel IDs and only while their conditions are true. Recalculate after all relevant board-state changes. Default adjacency is orthogonal; diagonal adjacency does not count unless a specific future rule says so.
- Duplicate instances of the same Lore Bond do not stack by default. Document and test all stacking.
- Custom Vessels must carry origin="custom", unique custom IDs, and must never gain official Lore Bond or named-set bonuses. Enforce this in the rules engine, not just in the UI. They may still receive normal arena effects unless the ruleset says otherwise.
- Bestiary/Codex should show official Vessels, stats, descriptions, abilities, lore, authored bond sets, and activation conditions. Do not claim authored pairings are objectively optimal.
- Vessel Forge must use a transparent, deterministic point budget and an allowlisted ability catalog. No arbitrary scripts or executable user content. Render names/flavor text safely as text.
- Name/flavor generators should be local template-based in v1; no external AI service without approval.
- Elemental card frames share one accessible component with data-driven element themes. Do not rely on hue alone to communicate element.

## Content data directives
- src/cards/starter-set.json is the current machine-readable baseline Vessel catalog. Keep stable unique IDs, schema consistency, and docs synchronized.
- Baseline subtype target is two official Vessels each for warrior, beast, mystic, construct, demon, dragon, ancient, spirit, and otherworldly.
- Balance cost against stats, range, movement, and ability complexity. Catalog stats are prototype seeds and must be playtested.
- Do not expand the card pool substantially before the core loop and automated rules tests are reliable.

## Required next implementation sequence
1. Stabilize movement, combat, turn flow, and win conditions.
2. Add rule-engine tests and deterministic board-state updates.
3. Introduce arena data loading and one simple affinity modifier.
4. Add terrain and telegraphed hazard resolution.
5. Implement generic Lore Bond evaluation and custom-card exclusion, with tests.
6. Add Bestiary/Codex UI driven by card and bond data.
7. Implement Vessel Forge, validation, persistence, and deck integration.
8. Add element-specific card frames and later voxel model previews.

Do not claim a milestone is complete until implemented and tested. Update the relevant docs whenever behavior changes.
