# Copy-ready AI Implementation Prompt

You are the implementation engineer and original voxel art director for Veylattice in XiONDiGiTaL/Veylattice. Implement working milestones, not another concept-only rewrite. Inspect the current repository first and preserve working behavior.

Read AI_INSTRUCTIONS.md, GAME_RULES.md, PROJECT_BRIEF.md, TECHNICAL_ARCHITECTURE.md, ROADMAP.md, docs/MODES_AND_LOBBIES.md, docs/PROGRESSION_AND_CONTENT.md, docs/UNIT_VISUAL_DESIGNS.md and docs/VOXEL_ART_BIBLE.md. Also read relevant existing world/arena/element/synergy/Forge/frame/catalog/testing files and src/cards/starter-set.json. New canonical rules override old two-copy decks, all-or-nothing Guard combat and opening-only mulligan proposals. Preserve all 18 official IDs and authored lore; do not confuse Otherworldly subtype with an element.

FIRST deliver M1 as a working offline vertical slice. Extract DOM-free rules and immutable content from src/main.js. Implement 5x5 play, 30 Vitality, opening five cards, mandatory draw each turn, first-turn one Flux rising to ten, one normal summon, four-Vessel/four-Relic caps, movement/path validation, one move/attack per ready unit, persistent Guard damage, simultaneous eligible retaliation, deterministic defeat/discard, legal Nexus direct attacks, 120-second deadline/auto-pass and once-per-turn one-Flux mulligan. Use GAME_RULES.md's proposed defaults openly rather than silently inventing missing rules. Implement one playable prebuilt match and honest end states. Do not fake autonomous AI or earnable rewards in this slice; add AI in M2 unless the tested slice can include it without compromising correctness.

Add automated tests before integrating the new rules into the current HUD: all 25 element pairs under the adapted damage rule, persistent damage, lethal trades, out-of-range retaliation, illegal/stale commands, summon limits, zero-Flux card restriction, draw/Flux opening sequencing, mulligan atomicity, revive readiness, timeout at boundary, direct attacks and simultaneous lethal/fatigue. Report only tests you actually run. Distinguish M1 acceptance tests from later-milestone tests.

THEN proceed through ROADMAP.md one tested milestone at a time: typed Actions/Relics and death triggers; valid 20-40-card decks with minimum 10 Vessels/five Actions and max three canonical copies; several prebuilt tactical AI archetypes; no-reward Practice; Stash/shop/Singles/recycling; authenticated server-trusted progression; four-seat human/AI tag lobbies; monthly AI-ranked series; rotations/offers; world systems and original 3D presentation.

For collection, implement exactly five Common cards plus one Rare-or-better per six-card pack, server cryptographic RNG, disclosed per-card odds, permanent discovery for Singles, unlimited owned quantities, and protected recycling. Lattice Shards is the proposed shared currency. Treat numerical prices, rank rates and promotion thresholds as configurable proposed defaults. Never let browser-reported outcomes or balances mint currency. Pin rules/content/offer versions and make purchases/results idempotent.

For online play, use the inspected reference experience of room codes, invite links, ready states, visible connection failures and reconnects. Do not port two-client limits or host-trusted progression. Design server-validated four-seat state with private hands, persisted deadlines, ordered commands and server AI. Prepare Supabase migrations/RLS/config examples; request approval before applying schemas, selecting production projects, deploying or incurring costs. Never import credentials from another repository. Static Pages frontend must keep working at /Veylattice/; backend unavailable means practice still works and progression is clearly disabled.

For art, produce individual designs for all 65 Vessels (the original 18 plus the expansion roster) following docs/UNIT_VISUAL_DESIGNS.md. Every model needs unique silhouette/anatomy, material palette, signature prop, original portrait and summon/idle/move/attack/hit/defeat animations. No recolored duplicate models; shared rigs only where appropriate. Keep a single-tile readable footprint, below-unit Attack/current-maximum Guard strip, full selected card mat details, accessible elemental icons and distinct Rare+ frames. Art briefs are not finished assets: deliver actual blockouts/models and verify tactical-camera readability when that milestone starts. Add equally specific briefs for every new token, leader/Nexus, Relic and hazard. Do not copy protected code/art/UI/text or put comparison-game titles in README.md.

Keep new cards/sets/packs/AI decks in validated versioned manifests. Existing typed effects should support new cards without core engine edits; genuinely new mechanics require reviewed handlers and tests. Do not expand to a huge card pool before the core loop works. Preserve custom origin exclusion from official bonds and competitive rewards.

For each milestone return complete changed files or committed changes, exact run/test commands, test results actually observed, feature status, remaining limitations and any approval-required deployment/migration steps. Avoid disconnected snippets and empty placeholder directories. Begin by auditing current code against M1, then implement M1 rather than merely describing it.

## Source coverage note
These directives incorporate the user's pasted requirements and inspected repository content. The supplied ChatGPT share URL could not be retrieved during preparation; do not claim that unseen transcript was read. Additional transcript requirements must be reconciled explicitly if supplied later.

## Canonical layout and presentation (2026-10-29, reconciled)

This section is the single source of truth for the arena, card fields and
card presentation. Where an older section disagrees, this section wins;
GAME_RULES.md remains authoritative for gameplay balance and rules.

- **Battlefield:** one shared 5x5 grid, 25 playable tiles (`BOARD_SIZE`,
  `deploymentBounds`, `rowOwner` in `src/game/constants.js`). Seat 0 deploys
  on rows 3-4, seat 1 on rows 0-1, row 2 is contested. Engine, renderer and
  AI all use this one logical grid. There is no 7x7 board and no third
  deployment row; older mentions of either are stale errors, fixed 2026-10-29.
- **Card fields, per seat, physically part of the same 3D arena:**
  Vessel row = 4 slots showing deployed Vessels (exactly the 4-Vessel cap;
  a slot is never an extra unit). Relic row = 4 sockets for persistent
  Relics (exactly the 4-Relic cap). Action staging row = 4 slots showing
  the first four Action cards currently in hand; it is a *view of the hand*,
  not a zone — an Action resolves from hand and its card goes to discard,
  it never occupies a field slot. Discard pile = 1 per seat, owned by the
  engine: defeated Vessels and resolved Actions land there, and revive /
  return effects move cards out of it through the engine, never by animation.
- **3D arena:** Three.js (WebGL) is the primary battlefield renderer
  (`src/render/arena3d.js`); the CSS-3D board remains as the fallback when
  WebGL or the Three.js module cannot load, and as the accessible grid.
  Playable Vessels are real voxel geometry built from the same box data as
  their card illustrations — never billboard sprites or flat pictures.
  The opponent field sits beyond the far side, the player field on the near
  side, and the battlefield stays the focal point. Desktop uses an elevated
  three-quarter camera; narrow viewports use a more top-down camera.
- **Card frames:** approved `CardFrames/` overlays are authoritative
  (canvas 214x300, aspect 0.713; per-frame art apertures in
  `frame-manifest.json`). Wood/Fire/Earth/Metal/Water Vessels use their
  element frame, Actions use the Action frame, Relics have NO approved
  dedicated frame yet and are explicitly flagged as pending while using a
  functional neutral presentation. `Cards/EXAMPLE.jpg` is a composition
  reference for finished cards; it is not a dimension source — card slots
  use the 214:300 frame geometry and frames are never stretched.
- **Elements:** Wood > Earth > Water > Fire > Metal > Wood; advantage
  `floor(1.5 x Attack)`, disadvantage `max(1, floor(0.5 x Attack))`,
  neutral = Attack. Otherworldly is a subtype, not a sixth element.
  Matchup feedback uses emblem + colour + text, never colour alone.
- **Abstract design references only** (no copied art, names, layouts or
  exact mechanics): Yu-Gi-Oh! for differentiated zones, targeting and the
  card/field relationship; Pokemon for readable elemental strengths and
  weaknesses; Duelyst for grid positioning, movement and attack ranges;
  Hearthstone for approachable interactions, resource presentation and
  readable combat feedback.
- **Deck Builder / Shop / Online Lobby (2026-10-29):** decks are built
  from the canonical manifest, validated by `validateDeck` plus ownership,
  saved to the local profile and selectable for a match; illegal decks
  cannot start a match. Shop packs cost 300 Lattice Shards and contain
  exactly 5 Common + 1 Rare-or-better card. The online lobby is a
  peer-validated Realtime preview: every remote command is re-validated
  by the receiving client's engine (seat, sequence, command id, legality)
  and online matches grant no rewards or rank. Server-authoritative
  validation via Edge Functions is NOT deployed and is tracked as blocked
  pending owner approval and a database migration — the lobby must never
  be described as server-authoritative until that work is verified.
- **No balance changes in this reconciliation.** Card IDs, stats, effects,
  lore, elements, the 4-Vessel / 4-Relic caps, deck rules (20-40 cards,
  at least 10 Vessels and 5 Actions, at most 3 copies per id) and the
  elemental damage mapping are unchanged.
