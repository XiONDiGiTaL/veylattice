# AI Build Instructions

Build Veylattice, an original HTML-first tactical card battler. Read README.md, PROJECT_BRIEF.md, GAME_RULES.md, and TECHNICAL_ARCHITECTURE.md before substantial changes. Inspect current code first; preserve working behavior. Implement one coherent milestone at a time. Keep deterministic rules separate from DOM/rendering code. Add tests for rules changes and report only tests actually run. Update docs when implementation changes. Do not add services, secrets, accounts, or a backend without approval. Do not create empty files to imitate a directory tree.

## Vocabulary
- Vessel: creature/unit
- Action: one-shot effect
- Relic: persistent card
- Flux: resource
- Vitality: player life
- Guard: defensive stat
- Elements: wood, fire, earth, metal, water

## Constraints
Board target 7x7; max 4 Vessels per player; Attack and Guard 1-10. Use docs/ELEMENTAL_SYSTEM.md as the canonical elemental rules source. Unresolved rules are provisional, not finalized. Validate all player actions in the rules engine. Keep randomness injectable for tests. Start with HTML, CSS, and vanilla JS modules. Add Three.js after the core loop is stable. Use safe DOM APIs, keep dependencies minimal, and create original expressive content. Do not copy proprietary code, art, models, card text, lore, UI, or distinctive presentation from other games. Definition of done: behavior works, relevant tests run, docs match code, run steps are documented, limitations are stated.
