# Card Design Guide

## Categories
- Vessel: board unit with element, subtype, cost, Attack, Guard, movement, range, abilities, and model reference.
- Action: one-shot effect with explicit timing, targets, resolution order, and failure behavior.
- Relic: persistent effect with slot cost and removal conditions.

## Starting schema
```json
{
  "id": "vessel_ashen_crownblade",
  "name": "Ashen Crownblade",
  "category": "vessel",
  "element": "fire",
  "subtypes": ["warrior"],
  "cost": 3,
  "attack": 6,
  "guard": 4,
  "movement": 1,
  "range": 1,
  "abilities": [],
  "rarity": "uncommon",
  "modelId": "ashen_crownblade",
  "animationSet": "humanoid_swordfighter",
  "flavorText": "A fallen champion whose blade still burns."
}
```
Validate card data at load time. This schema is a starting point, not a finalized contract.

## Design standards
Balance cost, stats, range, movement, element, and ability complexity together. Rarity is not a substitute for balance. Use concise, consistent timing language and prefer data-driven effects over card-name-specific logic. Give every card a clear role and counterplay. Keep all names, card text, art, and lore original.

## Prototype card seeds
| Name | Element | Type | ATK/Guard | Cost |
|---|---|---|---:|---:|
| Ashen Crownblade | Fire | Warrior | 6/4 | 3 |
| Mireglass Stalker | Water | Beast | 4/3 | 2 |
| Hollowroot Oracle | Wood | Mystic | 2/5 | 3 |
| Bastion of the First Mountain | Earth | Construct | 2/8 | 4 |
| Argent Nightlancer | Metal | Warrior | 5/4 | 3 |
| Cinder-Maw | Fire | Demon | 8/3 | 5 |
| Wyrm of the Drowned Vault | Water | Dragon | 7/5 | 6 |
| Verdant Colossus | Wood | Ancient | 4/8 | 6 |
| Ironwrought Hound | Metal | Construct | 4/5 | 3 |
| Dustveil Matriarch | Earth | Beast | 3/6 | 4 |
| Lantern of the Lost Choir | Water | Spirit | 3/4 | 3 |
| The Star-Eater | Fire | Otherworldly | 10/6 | 9 |

These are flavor/design seeds, not balanced final cards. Start with 12 Vessels, 8 Actions, and 2 Relics. Do not expand to 180 cards before testing.
