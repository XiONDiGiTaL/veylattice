# Elemental System

Status: **canonical**, superseding the earlier halving proposal previously in
this file. Canonical authority is [GAME_RULES.md](../GAME_RULES.md); the
implementation is [src/game/elemental-rules.js](../src/game/elemental-rules.js).

## Counter-cycle

- Wood overcomes Earth.
- Earth overcomes Water.
- Water overcomes Fire.
- Fire overcomes Metal.
- Metal overcomes Wood.

Same-element and non-connected pairs are neutral. The cycle is a single frozen
table in the rules module; no renderer or card handler may re-derive it.

## Damage resolution (implemented)

`damageFor(currentAttack, attackerElement, defenderElement)`:

| Relationship | Damage |
|---|---|
| Attacker overcomes defender | `floor(1.5 × current Attack)` |
| Defender overcomes attacker | `max(1, floor(0.5 × current Attack))` |
| Neutral | `current Attack` |

Rules:

- Rounding happens exactly once, in the elemental module, and the result is
  clamped to ≥ 0.
- Only **current** Attack is used; printed stats are never mutated.
- Guard is persistent durability and is **not** halved. The old "halve effective
  Guard" rule is withdrawn.
- Attack and retaliation are separate packets, each resolved with its own
  attacker/defender relationship.
- Direct Nexus damage uses full current Attack with no elemental modifier.
- The HUD may only display previews from `previewDamage`; it must not compute
  its own numbers.

## Verification

`node --test "tests/*.test.js"` covers all 25 pairs, rounding, minimum values,
independent attack/retaliation relationships, and the unused/direct-attack
cases (`tests/elemental.test.js`, `tests/engine.test.js`).

## Superseded history

The original document proposed: reduce incoming Attack by half when the
defender's element overcomes the attacker; reduce the defender's Guard by half
when the attacker's element overcomes the defender; both rounded down with a
minimum of one. That compared a one-shot Attack against Guard and conflicted
with persistent Guard damage. It is preserved here only as history and must not
be implemented.
