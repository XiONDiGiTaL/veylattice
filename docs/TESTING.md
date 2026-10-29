# Testing Plan

## Harness (implemented)

Automated tests use Node's built-in runner; there are no third-party test
dependencies.

```
node --test "tests/*.test.js"
```

| File | Scope |
|---|---|
| `tests/elemental.test.js` | All 25 element pairs, rounding, minimum damage, preview reasons |
| `tests/content.test.js` | 102-card catalog validation through the set manifest, 60/30/12 counts, 12 Vessels per element, frozen effects, keyword and targeting contracts, every effect kind in use, curated 40-card practice deck, canonical deck rules |
| `tests/engine.test.js` | Setup/Flux/draw, summon, movement, combat, retaliation, Nexus, mulligan, deadlines, fatigue, integrity, legal actions |
| `tests/cards.test.js` | Actions and Relics: casts, targeting, heal caps, buffs, sweeps, Nexus armour, Relic limit, auras, AI play, no-op rejection |
| `tests/keywords.test.js` | Stun timing, ready refresh, revive selection and empty discard, Flux cap and the 1-Flux floor, drain healing, Nexus heal cap, ward minimum 1, swift summons, stalwart, deathrattle draw, legal-action enumeration, keyword coverage |
| `tests/match.test.js` | Full scripted match to completion, same-seed replay determinism, board/registry consistency |
| `tests/profile.test.js` | Name/avatar/settings/stats sanitisation, forged identities, record maths |
| `tests/models.test.js` | Voxel roster completeness, unique silhouettes (incl. rotations), ≥30 boxes / ≥4 groups / ≥4 materials, palette + material + pivot validity, footprint bounds, proportion variety, element palettes, explicit placeholder for unknown ids, 25-tile board split 10/5/10, parameterised geometry and invalid-geometry rejection |
| `tests/terrain.test.js` | 25-tile terrain coverage, map/board-size agreement, decorative-only contract, 180° symmetry, prop bounds/validity, no engine or AI import of terrain |
| `tests/tutorial.test.js` | Guided-match step order, event filtering, `endTurn` escape, completion clamping, idempotent skip |
| `tests/illustration.test.js` | Every card produces SVG; Vessel art is a projection of its model (part count, palette shading, declared voxel height); no figure clipped; no two Vessels share art; Action emblems differ by effect; output deterministic, script-free, <40 kB |
| `tests/fields.test.js` | Four Vessel + four Action zones per seat, stable unique slot keys, engine-assigned zones survive movement, inserted units project to one slot each, Relics fill the back row in order, the Relic cap equals the zone count |
| `tests/support.js` | Shared catalog loading from `src/cards/manifest.json` (so tests and the app load the same sets), seeded RNG, controlled hands, positional setup |

Current result: `npm test` → **122 tests, 122 pass, 0 fail** (~0.9 s). `npm run check` adds
`node --check` on the main modules before the suite.

## War-table browser checks (2026-10-28)

Run against the local static server in a fresh incognito context with the real
engine, not a mock:

| Check | Result |
|---|---|
| 1440×950: all four opponent + four player zones render, board fully visible, hand reachable | pass |
| 1024×768: no horizontal overflow, all zones rendered, board capped by height | pass |
| 390×844: board fits width, zones wrap to labelled rows, no horizontal overflow | pass |
| Summon a Vessel (Ashen Crownblade, 3 Flux) | hand −1, Flux −3, next front-row zone fills, unit appears on the chosen tile, `Vessels 1/4` |
| Set a Relic (Ember Lens) through the back row | first Action socket fills, `Relics 1/4`, card leaves hand, effect shown in the zone |
| Relic card selected | only the next free Action socket glows `SET HERE`; the other three dim |
| Select a Vessel by clicking its card zone | the zone and the unit highlight, the board rings reachable tiles, the inspect panel shows the right unit |
| Vessel destroyed by the opponent | stale selection clears instead of describing a dead unit |
| Console / network | no console errors; all modules, card data and the stylesheet returned 200/304 |

Not tested in the browser: a completed Nexus strike through the HUD vitality
bar (the engine path and the button handler are covered by unit tests and the
same `attack` command, but a live undefended Nexus was not reached).

Rules for new tests:

- Inject time (`now`) and RNG; never depend on wall-clock timing.
- Assert rejected commands leave the state identical (`assert.deepEqual` plus
  reference equality where the engine guarantees it).
- Prefer driving public commands over reaching into state; use
  `createUnit`/`insertUnit` only for positional setup that would otherwise take
  many turns.
- Record actual commands and observed results in `CHANGELOG.md` and
  `docs/IMPLEMENTATION_LOG.md`.

## Still required by later milestones

- Effect queue ordering and a resolution limit, revive/return and death-trigger
  effects, temporary buff expiry, loop protection and simultaneous-death
  ordering (M2-001 remainder).
- Three validated prebuilt deck archetypes and ownership-aware validation
  (M2-002 remainder).
- Throttling for profile and account creation, and for recovery-code attempts
  (M2-005).
- Economy, pack composition and odds (M3-002/M4-002).
- Server authority, idempotent settlement, RLS denial and reconnect (M4/M5).

## Model checks

Models are data plus a renderer, so they are testable without a browser:

- every `category: "vessel"` card id has an entry in `VOXEL_MODELS`, and no model
  references a non-Vessel id;
- no two models share a silhouette signature (no recolours);
- every box uses a real palette key, every model has at least two animation
  groups and enough scaled height to read on a tile;
- `modelFor(unknownId)` returns `null` so the UI draws a labelled placeholder;
- the UI's row-to-zone split matches `deploymentBounds` (21 / 7 / 21 tiles).

Visual review is still manual: open **Roster**, confirm 18 distinct silhouettes,
and confirm a summoned Vessel on the board carries the matching `data-model-id`.

## Presentation checks

Animation is not unit-tested; the engine events it consumes are. When changing
`playEvents` or the combat CSS, verify in a browser that these classes appear on
the intended tiles during a real event: `.fx-lunge`, `.fx-hit`, `.fx-cast-hit`,
`.fx-spawn`, `.fx-heal`, `.fx-buff`, `.fx-shake`, `.fx-ghost`, and that
`.dmg-float` carries the right number. Confirm Guard counts down instead of
snapping, and that both `prefers-reduced-motion` and the in-game toggle suppress
every effect.

Voxel art checks (manual, per art change):

- Roster shows 18 cards and each stage contains a `.vox-model` with a unique `data-model-id`;
  box totals match the status table in `docs/UNIT_VISUAL_DESIGNS.md`.
- Drag / arrow-key rotation works on every stage and the model does not clip out of the card.
- On the battlefield, each unit's model reads at tile size next to its stat strip; no model is a
  grey placeholder cube.
- Materials differ in greyscale: metal has a bright top face and dark side, cloth stays matte,
  crystal/ember glow. Checked by eye against the art bible, not by a pixel test.
- Arena: 49 terrain-tinted cells, props only at the back of tiles, units draw above props, legal
  summon / move / attack rings remain the most saturated thing on the board.
- The arena caption states that terrain is decorative; no water or rubble tile implies a rule.

## Browser checks (manual, recorded per session)

Serve over HTTP (ES modules and JSON fetching require it). Verify both the
repository root and a `/veylattice/` subpath. Check the console for errors, then
exercise summon, move, attack (including retaliation preview), mulligan, turn
handoff and the result overlay.

Card checks: cast a targeted Action by clicking a highlighted Vessel, cast a
targetless Action with **Play selected card**, set a Relic and confirm the aura
changes the previews and the Relic panel.

Account checks: create an account, rename the profile, sign out, sign back in
with the recovery code and confirm the account's name returns; rotate the code
and confirm the old one is refused.

Flow checks: a first visit must open **How to Play**, not a match; **Practice
match** must create the board only on click; **Return to match** must appear only
while a match is live; the Battle tab must be disabled before a match exists; the
Vessel Roster must render 60 models; the guided match must advance a step for the
action it asks for, show a hint when that action is currently impossible, and
never block on Skip. Escape and both Cancel buttons must clear a selection.

A 120-second expiry should be confirmed against the engine tests; waiting out a
real deadline in the browser is optional and must be reported honestly if
skipped.

## Card collection checks (CARDS-001)

Build: `node tools/build-cards.mjs` must print `102 (60 V / 30 A / 12 R)` and zero missing data.
`npm test` must stay green; `tests/card-files.test.js` fails when a face on disk no longer matches a
fresh render, so rebuild after any edit under `src/cards/`, `src/render/card-face.js`,
`src/render/scenery.js` or `src/render/illustration.js`.

In the browser: the Cards tab must show 102 tiles with no broken images; the element chips must filter
(All elements → All cards, then Metal → 21, then Vessels → 12); selecting a tile must open the face at
full size with its name, category, cost, Attack and Guard; Escape and the backdrop must close it. On a
390 px viewport the grid must fall to two columns and the viewer must fit inside the screen. A roster
card's **Printed card** button and a double-click on a hand card must open the same viewer.
