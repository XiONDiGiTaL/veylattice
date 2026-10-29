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

These are flavor/design seeds, not balanced final cards. The shipped pool is now **65 Vessels, 30 Actions and 12 Relics** across three set files listed in `src/cards/manifest.json`. New cards belong in a set file and must use the typed effect vocabulary in `src/game/constants.js` (`EFFECT_KINDS`, `EFFECT_TARGETING`) plus the closed Vessel keyword list (`VESSEL_KEYWORDS`); adding a card that uses a supported effect must not require an engine edit. Every Vessel also needs a `modelId`, a model in `src/render/vessels/`, a role and flavour text. Balance remains unproven: costs follow roughly `1.5 x cost + 4` total printed stats, and no simulation exists yet.


## Card art is derived, not commissioned

Every card must present a full-background illustration, and that illustration must depict the same
character as the playable model. The project satisfies both by generating the art from the model:
`src/render/illustration.js` projects a Vessel's `VOXEL_MODELS` entry through a fixed three-quarter
camera, shades each face against a key light with per-material responses, and `src/render/scenery.js`
stages the figure in a place built from its element — a fortress gatehouse, a rootbound grove, a drowned
temple, a furnace hall or a canyon gate — with weather, floor and foreground dressing. Actions and Relics
get an emblem scene chosen by `effect.kind`.

Practical rules for authors:

- **Never hand-write a separate illustration for a Vessel.** If the art is wrong, fix the model or the
  environment preset; a second source of truth is how art and unit drift apart.
- **Model colours come from the palette keys.** The art shades from the same keys, so a new material must
  be added to the element palette in `src/render/models.js` first.
- **The art canvas is 400x310, and must stay 1.29:1.** The card's illustration window is 902x700 and
  renders the art with `preserveAspectRatio="slice"`; a different ratio is cropped, and the first thing
  lost is the flanking architecture that gives the scene its depth.
- **Keep the silhouette readable at 138x84.** The hand rail shows the art as a dimmed backdrop under the
  text; a card whose figure is invisible at that size is a design failure, not just an art failure.
- **Actions and Relics must read from their emblem**, which is keyed to the effect kind — a heal card must
  not use the damage slash.
- `tests/illustration.test.js` enforces all of this (every card has art, Vessel art matches its model,
  nothing is clipped, no two Vessels share art, emblems differ per effect, SVG is deterministic and
  script-free). A change that breaks those tests is a regression, not a style choice.

## Printed face specification

The reference card fixes the composition; `src/render/card-face.js` implements it once for all cards.

| Element | Value |
|---|---|
| Canvas | 1086 x 2048 (543:1024) |
| Title plate | x 70-840, y 62-190 — type auto-fitted so it never reaches the cost medallion |
| Flux medallion | centre (964, 128), r 104; the number is **always Flux cost** |
| Attribute line | `Element: <Element> / <Subtype> Vessel`, or `/ Action`, `/ Relic` |
| Illustration window | x 92-994, y 320-1020 |
| Emblems | element at (172, 404) with a label tab; subtype/category mirrored at x 914 |
| Stats | Attack medallion (168, 1092), Guard (918, 1092), r 110; movement/range row at y 1214 |
| Text panel | rules in upright type first, thin rule, flavour in italic below |
| Rarity plate | y 1936 |

Rules that are not negotiable:

1. **Guard, never "Defense" or "Health".** Guard is the canonical stat name.
2. **Non-unit cards print no Attack/Guard sockets.** No `0/0`, no dashes, no empty circles — an
   `ACTION` or `RELIC` band replaces the whole stat row.
3. **Printed stats are base stats**, never a damaged unit's current Guard or a temporary buff.
4. **Text is generated from the definition.** Never bake a name or a number into an image; that is how a
   card ends up printing a cost the engine does not charge.
5. **Materials carry the element, not only hue.** Metal is cool forged plate, Wood is carved timber,
   Earth is layered sandstone, Fire is heat-cracked obsidian, Water is sea-glass and pearl.
6. **Rarity is read from the definition** and only changes border detail and the gem — never stats.
7. **Numbers use lining figures in their own font stack.** `NUMERIC` in `card-face.js` resolves to
   Cambria / Palatino / Times before any fallback, with `'lnum' 1`. Georgia sets *old-style* figures:
   its 3, 4, 5, 7 and 9 descend ~0.18 em below the baseline and its cap height is only 0.55 em, which
   is why costs used to sit low and stat numbers looked small. Never put a number in the title face.
8. **Stat medallions are zoned, not stacked.** Icon badge at the top of the disc, an engraved rule
   below it, then the number in the lower half, with the ATTACK/GUARD label on a plate outside the
   disc. The number is drawn twice: a wide dark halo, then a white face with a thin dark keyline. A
   single outline disappears over the bright metal.

`tests/card-files.test.js` re-renders every face and compares it with the file in `Cards/`, so a card
cannot ship with printed numbers that disagree with the catalog.
