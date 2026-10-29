# Game Rules: Expanded Specification

Status: requested rules plus explicitly marked proposed balance defaults. Not all are implemented. This file supersedes old combat, two-copy deck and mulligan proposals elsewhere.

## Setup and deck legality
- Solo board: 5x5 (25 tiles), two deployment rows per seat and one contested row between them. The geometry lives in `src/game/constants.js` (`BOARD_SIZE`, `DEPLOYMENT_ROWS`) and every rule, tint and terrain map derives from it, so an alternative arena can be tested by changing those two numbers and the derived helpers. Each player starts at 30 Vitality and draws five cards. Four controlled Vessels and four Relics maximum per seat — one Relic per back-row card zone.
- Up to three copies per canonical card ID; alternate borders/finishes count together. Ownership must cover the saved deck's copies. Collection quantities have no game-design cap.
- Proposed defaults: 20-40 cards, minimum 10 Vessels and five Actions; remaining slots may be Vessels, Actions or Relics. Recommend 30 cards: 18 Vessels, 9 Actions, three Relics. Validate total and type minima independently. Decks reference collection quantities, not consumed inventory.
- Zero Vitality loses; simultaneous lethal is a draw. Proposed empty-deck rule: failed draws cause escalating direct fatigue damage 1,2,3,...; discarded cards never automatically reshuffle.

## Turn, draw, Flux and timeout
Each active seat gets 120 seconds, shown at the top of the HUD. Use a server deadline for online/reward matches, not a decrementing browser counter. Turn order: start effects, refresh/increase Flux, mandatory one-card draw, main phase, end effects, pass. The draw occurs every turn including each player's first turn.
Proposed Flux curve: first own turn max=1/current=1; subsequent own turns increase max by one to 10 and refill. Unspent Flux expires. Moving/attacking an eligible field unit costs no Flux unless an effect says otherwise. New card plays require available Flux greater than zero and payment of their printed cost, even for a zero-cost card. An explicit card override may change that restriction.
Summon one Vessel per turn, unless an effect explicitly grants extra summons or performs a special summon. Actions have no per-turn count cap if costs/targets are legal. Relics cost Flux and use their own slots. Proposed normal summons enter an empty square in the owner's starting two rows, cannot move or attack that turn, and count toward the four-unit cap. Explicit effects may override readiness/location.
Timeout preserves all last committed actions. Finish a command already accepted before the deadline atomically, then resolve end effects and pass; reject commands received at/after deadline. Do not undo the turn or autoplay unfinished targets. Two consecutive entirely inactive turns are a proposed disconnect/forfeit safeguard for human seats; disable it for offline practice. Timers continue through disconnects.

## Mulligan during a turn
Players may mulligan during their main phase rather than only at opening. Proposed anti-loop default: once per own turn, pay one Flux, choose one hand card, place it on deck bottom, then draw one; cannot use an empty deck, and the chosen card cannot be the replacement. This is an explicit balance proposal, not permission for unlimited free redraws. Draw replacement and payment resolve atomically.

## Movement and combat
Orthogonal movement and Manhattan range by default. Occupied cells block movement; no diagonals or passing through units without an explicit ability. One move and one attack per eligible Vessel per own turn, either order. Moving range comes from its definition; path length must be legal. Counterattacks do not spend the defender's future attack action.
Adjacent opposing Vessels (distance one) can fight. Ranged cards may initiate within their printed range; require clear orthogonal line of sight as a proposed default. A defender retaliates only if the attacker is in its own legal attack range and no status forbids retaliation.
Attack subtracts damage from remaining Guard. Guard is persistent defense, not a threshold for an all-or-nothing kill. At remaining Guard <=0 a Vessel is defeated and its card enters its owner's discard. Normal unit defeats never reduce player Vitality. Damage to player Vitality comes from direct attacks or effects explicitly labeled direct damage; excess unit damage does not spill over by default.
Proposed simultaneous exchange: snapshot both units' Attack, range, statuses and modifiers; calculate attack and eligible retaliation, apply both damage packets, then remove all defeated units together. A lethally hit defender still retaliates when eligible. This avoids first-hit ambiguity. Healing cannot exceed current maximum Guard. Temporary maximum-Guard bonuses ending must preserve damage taken; define and test lethal expiry.

## Elemental interaction adapted to persistent Guard
Preserve the counter-cycle: Wood > Earth > Water > Fire > Metal > Wood. Same and unconnected pairs are neutral. Supersede the old halved-Guard threshold rule: proposed advantage deals floor(1.5 x current Attack), disadvantage deals max(1,floor(0.5 x current Attack)), neutral deals current Attack. Apply independently to attack and retaliation; show previews and reasons. Apply other flat/percentage modifiers in a documented fixed order, clamp damage >=0 and use integer rounding once per defined stage. Test all 25 pairs. This numerical mapping is provisional.

## Direct attacks and win condition
Proposed spatial rule: each side has an unoccupied Nexus edge marker outside the grid, not an extra Vessel. A unit on the enemy home row can target that Nexus at range one if the opposing team controls no Vessels; deal its full current Attack to enemy Vitality, once using its normal attack action. Ranged attacks cannot bypass this gate by default. Nexus never retaliates. Explicit abilities may permit a direct attack through defenders or direct Action damage. Clearly show legal Nexus targets; do not permit attacks from anywhere on the board.

## Implemented keyword and Action vocabulary (current build)
Vessel keywords are a closed list; content cannot define new executable behaviour. `swift` enters play ready; `stalwart` enters with +2 Guard; `deathrattleDraw` makes its controller draw one card when it is defeated. Keywords are validated against `VESSEL_KEYWORDS` at catalog build and shown in plain English in the HUD and roster.
Action effect kinds implemented by the engine: `damage`, `damageAll`, `heal`, `buff`, `draw`, `nexusDamage`, `nexusHeal`, `drain` (damage, then restore half to your Nexus), `stun` (target misses exactly one activation), `ready` (refresh a friendly Vessel's move and attack), `revive` (return your highest-cost defeated Vessel from discard to hand), and `flux` (gain Flux up to the turn maximum). Relic auras: `attackAura`, `armorAura`, `mendAura`, `guardAura`, `wardAura` (reduce Action damage to your Vessels, minimum 1), `swiftAura` (summons enter ready), and `drawAura` (one extra dawn draw). Each card's targeting mode is part of its effect contract and is validated; Actions still resolve from hand and never occupy a Relic zone. Relic ward applies after elemental adaptation and cannot nullify a hit.

## Effects and death handling
Use typed effects and an ordered event queue, not executable text. Keywords must specify timing, target, duration, stacking, caps and counters. Suggested effects: heal; shield next damage packet; root movement; silence text abilities; extra summon; direct damage; return discarded card to hand; revive at full printed Guard; fallen-allies scaling; death-trigger growth.
Revive needs an empty legal tile and available unit slot, creates a new board instance, clears old temporary buffs and enters unready unless stated otherwise. Return-to-hand does not summon or pay a future card cost. Summoned tokens vanish on defeat and never become collectible.
Proposed keyword Mourning: after any other Vessel is defeated, surviving source gains +1 Attack/+1 maximum Guard and +1 remaining Guard. Count each defeated Vessel once, including simultaneous deaths; dead sources cannot trigger, and one event ID cannot retrigger itself. Distinguish any-death triggers from allied-death counters. Queue active-seat triggers first, then other seats in turn order, with stable instance ordering. Prevent infinite loops with a documented resolution limit that produces a safe match error/no progression rather than invented results.

## Tag and mode differences
See docs/MODES_AND_LOBBIES.md. Each seat owns its hand/deck/Flux/discard and unit cap. Team Vitality is shared in tag. Practice grants no currency, rank changes, reward packs or improved pack odds. Custom Forge cards are excluded from progression modes by proposed default.

**Deck-limit status (2026-10-29 clarification, no rule change):** the deck limits the engine
enforces — 20–40 cards, at least 10 Vessels, at least 5 Actions, at most 3 copies per canonical
card ID — are canonical as implemented. Older "proposed default" wording about these limits refers
to their balance tunability, not to whether they apply; a deck that violates them is rejected by
`createMatch` today. Any future change to the numbers themselves needs an explicit, documented
balance decision.

## Canonical field layout (2026-10-29 clarification, no rule change)

Each seat's field, in the same 3D arena as the battlefield, is: four Vessel
slots (the deployed Vessels; the slot count equals the four-Vessel cap and
adds no units), four Relic sockets (persistent Relics, four maximum),
four Action staging slots (a view of the first four Action cards in the
player's hand — Actions are one-shot, resolve from hand, and go to the
owner's discard pile; they never occupy a field slot), and one discard
pile owned by the engine. Defeated Vessels go to their owner's discard
pile. This layout resolves the old "back-row Action zone" label: those
sockets always held Relics, and the name is corrected wherever it appears.
