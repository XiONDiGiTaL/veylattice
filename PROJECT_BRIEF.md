# Project Brief

Veylattice is an original browser-based tactical card battler. Players deploy elemental creatures called Vessels onto a square grid, use Actions to change the battlefield, and play persistent Relics. Victory comes from reducing the opponent's Vitality to zero.

## Design pillars
- Position, movement, range, elemental matchups, and resource timing matter.
- Rules are explainable and independently testable.
- Card UI remains legible and creature silhouettes readable.
- Browser-first static app; local/single-player prototype before online play.

## Targets
- 7x7 grid, 30 starting Vitality, opening hand of 5.
- 30-card decks, maximum 2 copies per card ID.
- Maximum 4 Vessels and 2 Relics per player.
- Elements: Wood, Fire, Earth, Metal, Water.
- Prototype set: 12 Vessels, 8 Actions, 2 Relics.
- Aspirational content target: 180 unique cards, only after rules and balance are proven.

## Non-goals for the first slice
No accounts, matchmaking, trading, monetization, backend sync, or giant card pool. The vertical slice should let a user start a match, draw/play cards, spend Flux, summon/move/attack, apply elemental modifiers, end turns, and reach a win state.
