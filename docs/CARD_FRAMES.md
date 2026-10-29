# Elemental Card Frames and UI Art Direction

**Status:** Art/UX specification. Frames should be original and readable at small sizes.

## Shared frame structure
Every card frame should preserve the same hierarchy:
1. Cost badge in a fixed, consistent location.
2. Name area with sufficient contrast.
3. Art/model viewport.
4. Element indicator and subtype label.
5. Attack and Guard displayed in separate, unmistakable stat areas.
6. Ability text with readable line spacing.
7. Flavor text in a secondary but legible style.
8. Optional bond/set indicator for official cards only.

Do not rely on color alone. Use a unique emblem, material texture, silhouette language, and accessible text label for every element. Keep text contrast high and avoid ornate borders behind rules text.

## Elemental frame direction
- **Wood:** carved living-wood border, leaf/root corner motifs, jade accent light, warm parchment-like inner panel.
- **Fire:** obsidian border with ember seams, angular flame insignia, restrained copper/brass highlights.
- **Earth:** layered stone frame, mineral inlays, broad grounded corners, ochre/gold insignia.
- **Metal:** brushed steel border, crisp bevels, geometric insignia, cool silver highlights.
- **Water:** deep-blue glass/ceramic border, flowing engraved lines, pearl highlights, wave insignia.

## Rarity and accessibility
Rarity may add small trim details but must not obscure the element's identity or card information. Support reduced motion and a non-glowing/high-contrast mode. Never encode rarity or element solely through hue.

## Custom cards
The Vessel Forge previews the frame for the chosen element. Mark custom cards with a small, clear custom-made indicator. Custom frame decorations must not imply official Lore Bond eligibility. The frame is a UI skin, not a gameplay authority.

## Implementation
Keep frame theme tokens in CSS variables or a data-driven theme map. Avoid five separately duplicated card components. Use one card component with element-specific class/data attributes and shared accessible markup. Add visual regression/manual checks for desktop and narrow mobile widths before considering frames complete.

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
