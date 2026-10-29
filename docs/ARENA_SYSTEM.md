# Arena System Specification

**Status:** Design proposal for terrain/hazard arenas. The *geometry* half is implemented: the shipped
arena is a 5x5 grid (25 tiles) with two deployment rows per seat and one contested row, and every rule,
tint and terrain map derives from `BOARD_SIZE`/`DEPLOYMENT_ROWS` in `src/game/constants.js`. The shipped
arena's ground is decorative (`src/render/terrain.js`), so nothing below about passives, hazards or
affinity is implemented yet.

## Arena data contract
Each arena should be data-driven and include:
- `id`, `name`, `region`, `loreSummary`
- `affinityElement` or `null`
- `passiveEffect` with explicit target, stat, amount, duration, and stacking policy
- `terrainMap` or seeded terrain layout, using stable terrain IDs
- `hazards` with affected cells, trigger timing, damage/effect, warning state, and counterplay
- `visualTheme`, `cardFrameAccent`, and optional sound/effect references

Do not embed arena-specific conditional branches throughout the combat engine. Resolve effects through a generic effect pipeline.

## Starter arena concepts
| ID | Arena | Affinity | Initial passive proposal | Terrain concept |
|---|---|---|---|---|
| `emberfall_caldera` | Emberfall Caldera | Fire | Fire Vessels +1 Attack | Lava channels deal 1 damage when a Vessel ends its turn on a marked tile. |
| `drowned_reliquary` | Drowned Reliquary | Water | Water Vessels +1 Guard | Flooded cells restrict grounded movement; aquatic traits may ignore this. |
| `verdant_crucible` | Verdant Crucible | Wood | Wood Vessels +1 Guard | Living cover gives a clearly defined defensive benefit. |
| `ironwake_foundry` | Ironwake Foundry | Metal | Metal Vessels +1 Attack | Machinery creates marked obstructions or temporary lanes. |
| `shattered_crownlands` | Shattered Crownlands | Earth | Earth Vessels +1 Guard | Stone formations create cover and choke points. |
| `astral_breach` | Astral Breach | None | No permanent affinity | Marked cells change on a visible, predictable schedule. |
| `confluence_garden` | Confluence Garden | Multiple zones | No global affinity bonus | Separate elemental zones reward flexible decks. |

## Rules and balance constraints
- Arena effects apply symmetrically to both players.
- Start with a modest +1 to one stat, not +2 to multiple stats.
- The 1-10 printed Attack/Guard range remains intact. If temporary effective stats may exceed 10, document this explicitly and show both printed and modified values; preferred initial rule is to allow effective stats to exceed 10 only if balance testing supports it.
- A unit standing on a hazard tile should not be surprised by an untelegraphed effect. Show current and next hazard states.
- Define whether hazards trigger on entering, leaving, ending a turn, or on a round timer. Never rely on vague wording like "periodically."
- Define immunity, flight, aquatic, and terrain-crossing traits before cards depend on them.
- Terrain must not make a spawn area permanently unreachable or create unavoidable first-turn damage.
- The same named effect should resolve in the same order in every arena.

## Recommended resolution order
1. Validate the move/action.
2. Apply movement and update occupancy.
3. Resolve on-enter terrain effects.
4. Recalculate continuous arena and synergy effects.
5. At end of turn, resolve end-of-turn hazards in a stable tile order.
6. Recalculate derived stats and display feedback.

The final ordering must be reconciled with the canonical combat rules before implementation.

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
