# Veylattice

Veylattice is an original browser-first tactical collectible card battler featuring grid movement, elemental Vessels, Actions, Relics, handcrafted voxel designs and data-driven expansions.

## Project status
Early DOM prototype and production specifications, not a complete game. Autonomous AI, full tactical movement/combat, complete win flow, accounts, online lobbies, shop progression and 3D models must still be implemented and tested. Documentation describes targets, not playable guarantees.

## Planned experience
- Solo AI opponents with varied decks and strategies; prebuilt Practice with no currency rewards.
- Four-seat 2v2 Tag lobbies with configurable human/AI teams and reconnect support.
- Monthly AI-ranked Unranked, Bronze, Silver and Gold progression with three-match promotion series and collectible emblems.
- 120-second turns, one normal summon, resource-limited Actions, persistent Guard damage, retaliation and direct attacks on Vitality.
- Up to three copies per card; proposed 20-40-card decks with at least 10 Vessels and five Actions.
- Unlimited-quantity Stash, earned Lattice Shards (proposed name), recycling, previously discovered Singles and six-card packs with five Commons plus one Rare-or-better.
- Weekly pack rotations and occasional Friday half-price offers, with disclosed odds and trusted server settlement.
- Five elements, unique voxel identities for 18 baseline Vessels, symmetric arenas, Lore Bonds, Codex and a restricted custom-card Forge.

## Documentation
- [AI implementation directives](AI_INSTRUCTIONS.md)
- [Copy-ready implementation prompt](docs/IMPLEMENTATION_PROMPT.md)
- [Project brief](PROJECT_BRIEF.md)
- [Canonical expanded rules](GAME_RULES.md)
- [Technical architecture and security](TECHNICAL_ARCHITECTURE.md)
- [Modes, AI and lobbies](docs/MODES_AND_LOBBIES.md)
- [Collection, economy and expansions](docs/PROGRESSION_AND_CONTENT.md)
- [Unique unit/entity designs](docs/UNIT_VISUAL_DESIGNS.md)
- [Voxel production standards](docs/VOXEL_ART_BIBLE.md)
- [World](docs/WORLD_BIBLE.md), [arenas](docs/ARENA_SYSTEM.md), [Lore Bonds/Codex](docs/SYNERGY_SYSTEM.md), [roster](docs/UNIT_CATALOG.md)
- [Forge](docs/CARD_CREATOR.md), [frames](docs/CARD_FRAMES.md), [testing guidance](docs/TESTING.md)
- [Roadmap](ROADMAP.md)

GAME_RULES.md supersedes older combat/deck/elemental threshold proposals. Proposed numerical defaults remain subject to playtesting. Existing JSON card definitions are prototype seeds, not a balanced released set.

## Run locally
From repository root: `python -m http.server 8000`, then open `http://localhost:8000`. Use HTTP for ES modules and JSON loading.

## Hosting target
Keep the frontend static-hostable on GitHub Pages and at xiondigital.net/Veylattice/. Authenticated saves, ranks, rewards and shops require a separately configured trusted backend; do not put backend secrets in this repository or browser bundle. No deployment is implied by these documents.

## Originality and licensing
Original code, creatures, models, card text, lore and presentation only. Existing LICENSE remains All Rights Reserved unless separately authorized. Third-party dependencies retain their licenses; record asset provenance and required notices.
