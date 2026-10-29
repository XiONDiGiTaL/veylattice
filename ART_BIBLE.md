# Art Bible

## Identity
Stylized handcrafted voxel 3D creatures on a tactical grid, paired with a crisp 2D interface. Favor distinct silhouettes, restrained effects, controlled palettes, strong material differentiation, simple expressive animations, consistent scale and readable board states.

Read docs/VOXEL_ART_BIBLE.md for production standards and docs/UNIT_VISUAL_DESIGNS.md for the 18 bespoke Vessel briefs. Read docs/TRANSCRIPT_RECONCILIATION.md for the subsequently supplied conversation requirements.

## Reference interpretation
The user supplied a visual-reference screenshot showing a block-built armored knight, a golden voxel dragon and a forest creature ensemble. These communicate desired voxel craftsmanship, contrasting creature proportions and atmospheric presentation. They are reference material only, not reusable or commissioned assets; their ownership/license has not been established. Do not trace, extract, recolor or closely reproduce pictured characters.
A Dragon must have its own anatomy and silhouette, not be a Warrior with wings. A Construct must visibly express assembled/engineered structure, not be a Beast recolored gray. Every creature family needs its own design language and each named Vessel its own identifying shape. Verify silhouette readability at the tactical camera, not only in a close-up hero render.

## Element motifs
- Wood: bark, roots, growth rings, living fibers.
- Fire: ember cores, angular flame shapes, charred surfaces.
- Earth: stone strata, clay, mineral facets, weighty forms.
- Metal: forged plates, rivets, polished edges, mechanical precision.
- Water: glassy surfaces, fluid shapes, droplets, mist.

Do not rely on color alone to communicate element. Contrast and accessibility take precedence. Elemental effects must remain legible on a crowded battlefield and never conceal tile boundaries, stat strips or targets.

## Asset pipeline
Establish scale and camera, block out silhouettes, test them on the actual board, export glTF/GLB when ready, optimize for browser performance, and record asset provenance/licenses. Shared rigs and animation families are allowed where anatomy supports them, but each Vessel requires appropriate summon, idle, move, attack, hit and defeat behavior. Shared clips must be adapted where they conflict with a unit's design; recolored duplicate models are not distinct units.

Do not trace or closely imitate commercial-game models, card frames, UI, iconography, creatures or effects. Build a coherent original Veylattice visual language. Art briefs and screenshots are not finished game assets.

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
