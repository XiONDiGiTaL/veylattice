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
| `tests/content.test.js` | 30-card catalog validation, frozen effects, practice deck legality, canonical deck rules |
| `tests/engine.test.js` | Setup/Flux/draw, summon, movement, combat, retaliation, Nexus, mulligan, deadlines, fatigue, integrity, legal actions |
| `tests/cards.test.js` | Actions and Relics: casts, targeting, heal caps, buffs, sweeps, Nexus armour, Relic limit, auras, AI play, no-op rejection |
| `tests/match.test.js` | Full scripted match to completion, same-seed replay determinism, board/registry consistency |
| `tests/profile.test.js` | Name/avatar/settings/stats sanitisation, forged identities, record maths |
| `tests/models.test.js` | Voxel roster completeness, no shared silhouettes, palette keys, element palettes, explicit placeholder for unknown ids, 49-tile board split 21/7/21 |
| `tests/tutorial.test.js` | Guided-match step order, event filtering, `endTurn` escape, completion clamping, idempotent skip |
| `tests/support.js` | Shared catalog loading (Vessels + Actions/Relics), seeded RNG, controlled hands, positional setup |

Current result: `npm test` → **83 tests, 83 pass, 0 fail** (~0.6 s).

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
Vessel Roster must render 18 models; the guided match must advance a step for the
action it asks for, show a hint when that action is currently impossible, and
never block on Skip. Escape and both Cancel buttons must clear a selection.

A 120-second expiry should be confirmed against the engine tests; waiting out a
real deadline in the browser is optional and must be reported honestly if
skipped.
