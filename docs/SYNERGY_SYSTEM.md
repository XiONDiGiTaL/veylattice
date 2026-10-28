# Synergy System and Bestiary Specification

**Status:** Design proposal. Exact bonuses and pairings are balance-test candidates.

## Synergy categories
1. **Lore Bonds:** Specific official Vessel IDs connected by established story.
2. **Tactical Synergies:** Ability-driven combinations, such as displacement into hazards. These should emerge from generic abilities and effect rules, not exhaustive hardcoded pairs.
3. **Elemental Confluences:** Explicit abilities that reward defined elemental combinations. Do not automatically grant every pair of elements a free bonus.

## Lore Bond activation
A bond definition lists member card IDs, same-controller requirements, spatial condition, effects, duration, display label, and lore reference. Initial default: same controller and orthogonal adjacency (up/down/left/right). A bond is active only while all conditions remain true and both members are alive on the board.

Use a generic data-driven resolver. Recalculate after summon, move, defeat, control change, silence/disable, arena change, and any other event that can alter a condition. Effects must turn off immediately when their conditions cease to be true.

## Balance and anti-exploit rules
- Initial default bonus: +1 to one or two stats, typically +1 Attack and +1 Guard only for restrictive, named pairs.
- Identical copies or duplicate sources of the same bond do not stack.
- Different bonds may stack only if each definition explicitly allows it. Add a configurable global cap before enabling multiple bonds.
- Never grant pair bonuses to player-created custom Vessels. Custom cards have `origin: "custom"` and no `loreBondIds`; eligibility is enforced by the rules engine, not merely hidden in the UI.
- A custom card must not impersonate an official card by reusing its stable ID.
- Arena modifiers, bonds, and abilities must have a documented order and visible UI indicators.
- Do not make pair bonuses mandatory for deck viability.

## Synergy Codex / Bestiary
Provide a Bestiary view for all official Vessels, with filters for element, subtype, rarity, cost, and set. Each detail view includes:
- Name, art/model preview, element, subtype(s), cost, Attack, Guard, movement, range, abilities, rarity, flavor text, lore entry, and arena notes.
- Related official Vessels and named set/bond.
- Exact activation conditions and current bonus.
- A link to other members of the set and to relevant arena concepts.
- Clear label for custom-created cards versus official lore cards.

The Codex should distinguish **authored synergy sets** from **player-discovered useful combinations**. Do not claim every listed combination is objectively optimal. Launch with a handful of authored sets and let generic ability interactions create additional strategies.

## Starter authored sets
- **Last Banner of the Ashen Legion:** Ashen Crownblade + Argent Nightlancer. Former comrades; while orthogonally adjacent and controlled by the same player, each gains +1 Attack and +1 Guard. Proposed, not final.
- **Root and Revelation:** Hollowroot Oracle + Verdant Colossus. The Oracle gains +1 Guard while adjacent to the Colossus. Proposed, not final.
- **The Drowned Covenant:** Mireglass Stalker + Wyrm of the Drowned Vault. The Stalker gains +1 Attack while adjacent to the Wyrm. Proposed, not final.

## Example data contract
```json
{
  "id": "bond_ashen_legion",
  "name": "Last Banner of the Ashen Legion",
  "type": "lore_bond",
  "members": ["vessel_ashen_crownblade", "vessel_argent_nightlancer"],
  "activation": { "type": "orthogonal_adjacency", "sameController": true },
  "effects": [
    { "target": "each_member", "stat": "attack", "amount": 1 },
    { "target": "each_member", "stat": "guard", "amount": 1 }
  ],
  "duration": "while_conditions_met",
  "stacking": "unique_source_only",
  "loreEntry": "bond_ashen_legion"
}
```

## Testing requirements
Test activation/deactivation on summon, movement, defeat, control change, and disabled abilities; same and opposite controllers; orthogonal vs diagonal placement; duplicate bond sources; custom-card exclusion; arena + bond stacking; and deterministic effect resolution.
