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
| `tests/support.js` | Shared catalog loading (Vessels + Actions/Relics), seeded RNG, controlled hands, positional setup |

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

A 120-second expiry should be confirmed against the engine tests; waiting out a
real deadline in the browser is optional and must be reported honestly if
skipped.
