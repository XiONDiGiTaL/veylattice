# Arena System Specification

**Status:** Design proposal. Implement only after core movement/combat rules are reliable.

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
