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
| `tests/content.test.js` | Catalog validation, immutability, practice deck, deck legality |
| `tests/engine.test.js` | Setup/Flux/draw, summon, movement, combat, retaliation, Nexus, mulligan, deadlines, fatigue, integrity, legal actions |
| `tests/match.test.js` | Full scripted match to completion, same-seed replay determinism, board/registry consistency |
| `tests/ai.test.js` | Information isolation, hidden-hand invariance, seeded determinism, time budget/truncation, legality of every AI command in a full AI-vs-AI match, difficulty differentiation (suicidal trade, lethal line), pass-when-idle, wrong-seat/no-op behaviour |
| `tests/profile.test.js` | Name/avatar/settings/stats sanitisation, forged ids, input immutability, streak maths |
| `tests/support.js` | Shared catalog loading, seeded RNG, controlled hands, positional setup |

Current observed total: **53 tests, 53 pass, 0 fail** (`npm test`, ~0.62 s).

Rules for new tests:

- Inject time (`now`) and RNG; never depend on wall-clock timing.
- Assert rejected commands leave the state identical (`assert.deepEqual` plus
  reference equality where the engine guarantees it).
- Prefer driving public commands over reaching into state; use
  `createUnit`/`insertUnit` only for positional setup that would otherwise take
  many turns.
- Record actual commands and observed results in `CHANGELOG.md` and
  `docs/IMPLEMENTATION_LOG.md`.

## AI testing rules (M2-003, implemented)

- Test the *guarantees*, not the vibes: information isolation, bounded time, and legality.
- Hidden-information tests mutate the opponent hand/deck and assert an identical decision.
- Full-match AI tests assert zero engine rejections, not just a successful match.
- Difficulty claims need a crafted position where the tiers must differ; win-rate claims need
  real samples and are not made.

## Still required by later milestones

- Effect queue ordering, revival, death triggers and loop protection (M2-001).
- Canonical deck validation with Actions and ownership (M2-002).
- Cloud write abuse guard (M2-005) — cannot be enforced in the browser alone.
- Economy, pack composition and odds (M3-002/M4-002).
- Server authority, idempotent settlement, RLS denial and reconnect (M4/M5).

## Browser checks (manual, recorded per session)

Serve over HTTP (ES modules and JSON fetching require it). Verify both the
repository root and the `/veylattice/` subpath. Check the console for errors,
then exercise summon, move, attack (including retaliation preview), mulligan,
turn handoff, the AI's turn, and the result overlay. A 120-second expiry should
be confirmed against the engine tests; waiting out a real deadline in the
browser is optional and must be reported honestly if skipped.

Screenshots are captured by driving the real page over the Chrome DevTools
Protocol (headless Brave), not from a hidden demo mode. Reproduce with:

```
brave --headless=new --remote-debugging-port=9333 --user-data-dir=/tmp/veyl-brave
# then a small CDP script: Page.navigate, Runtime.evaluate to play turns, Page.captureScreenshot
```
