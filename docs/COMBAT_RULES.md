# Combat Rules

Status: **superseded** by [GAME_RULES.md](../GAME_RULES.md) and implemented in
[src/game/engine.js](../src/game/engine.js). Preserved for history; the old
"Attack must exceed Guard or nothing happens" proposal is withdrawn because
Guard is persistent durability.

## Implemented resolution

1. Verify the attacker exists, belongs to the active seat, is ready and has not
   attacked this turn.
2. Verify the target (unit or Nexus), range and clear orthogonal line of sight.
3. Snapshot both units' current Attack and element relationship.
4. Compute the attack packet and, if the defender's own range covers the
   attacker with clear sight, the retaliation packet.
5. Apply both packets to current Guard (or Vitality for a Nexus strike).
6. Mark the attacker as having attacked.
7. Remove every unit at ≤ 0 Guard simultaneously, pushing its card id to its
   owner's discard.

Consequences:

- A defender lethally hit still retaliates (simultaneous exchange).
- Retaliation does not consume the defender's future attack action.
- Unit defeats never reduce player Vitality; only Nexus strikes and explicit
  effects do.
- Attacks require orthogonal alignment. Diagonal range-2 attacks are rejected
  with `NO_LINE_OF_SIGHT`; this is a provisional default pending playtest.
- Each Vessel may move once and attack once per own turn, in either order.

## Verification

See `tests/engine.test.js`: persistent Guard, simultaneous lethal trade,
disadvantage exchange, out-of-range retaliation, blocked/diagonal LOS, one
attack per turn, friendly fire, Nexus gating and lethal, and defeat/discard.
