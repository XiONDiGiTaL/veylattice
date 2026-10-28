# Veylattice

**Veylattice** is an original browser-first tactical card battler built around grid combat, elemental forces, named Vessels, arena hazards, lore-based synergies, and custom card creation.

> **Project status:** Early prototype and design documents. The roster, arena effects, Lore Bonds, Bestiary, card frames, and Vessel Forge are design concepts unless the implementation explicitly supports them. Do not assume features are playable just because they are documented.

## Core targets
- 7×7 tactical grid, two players, up to four Vessels per player.
- Five elements: Wood, Fire, Earth, Metal, and Water.
- Vessels use Attack and Guard values from 1 to 10.
- Original voxel-inspired creature designs and element-specific card frames.
- Arenas with symmetric affinity modifiers and clearly telegraphed terrain hazards.
- Bestiary / Synergy Codex for stats, lore, and authored Lore Bond sets.
- Optional Vessel Forge for player-created cards using a fixed point budget. Custom Vessels never receive official pair bonuses.

## Documentation
- [AI coding directives](AI_INSTRUCTIONS.md)
- [Project brief](PROJECT_BRIEF.md)
- [Provisional game rules](GAME_RULES.md)
- [World bible](docs/WORLD_BIBLE.md)
- [Arena system](docs/ARENA_SYSTEM.md)
- [Synergy system and Bestiary](docs/SYNERGY_SYSTEM.md)
- [Baseline Vessel roster](docs/UNIT_CATALOG.md)
- [Custom Vessel creator](docs/CARD_CREATOR.md)
- [Elemental card frames](docs/CARD_FRAMES.md)
- [Elemental rules](docs/ELEMENTAL_SYSTEM.md)
- [Combat rules](docs/COMBAT_RULES.md)
- [Balancing guidance](docs/BALANCING.md)
- [Testing requirements](docs/TESTING.md)
- Machine-readable Vessels: [src/cards/starter-set.json](src/cards/starter-set.json)
- Proposed Lore Bonds: [src/cards/lore-bonds.json](src/cards/lore-bonds.json)
- Proposed arenas: [src/arenas/arenas.json](src/arenas/arenas.json)

## Run locally
From the repository root, run `python -m http.server 8000`, then open `http://localhost:8000`. A local HTTP server is needed for module and JSON loading.

## Originality and licensing
Veylattice is an original project. Do not copy proprietary source code, assets, models, card text, lore, or distinctive presentation from other games. The repository's LICENSE is All Rights Reserved unless a separate written license says otherwise. Third-party dependencies remain under their own licenses. Check the project name and any intended commercial trademarks before public commercial release.
