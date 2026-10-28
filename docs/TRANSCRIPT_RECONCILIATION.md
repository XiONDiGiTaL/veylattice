# Supplied Transcript Reconciliation

Status: supplemental production directives derived from the transcript excerpts and visual screenshot supplied by the user after the expanded-specification commit. The shared ChatGPT URL itself remains unverified; the pasted excerpts are now available. This document supplements rather than replaces existing world/arena/synergy/Forge documents. Current GAME_RULES.md remains authoritative over historical rules. Nothing here claims implementation or deployment.

## Required reading and precedence
Read this with AI_INSTRUCTIONS.md, ART_BIBLE.md, docs/IMPLEMENTATION_PROMPT.md, docs/WORLD_BIBLE.md, docs/ARENA_SYSTEM.md, docs/SYNERGY_SYSTEM.md, docs/CARD_CREATOR.md, docs/CARD_FRAMES.md and docs/UNIT_CATALOG.md. Historical transcript statements about files being tested or pushed are historical claims, not current test evidence. Re-run relevant validation when implementing.

## Ownership and HTML-first delivery
Preserve the repository's existing proprietary All Rights Reserved policy. Do not replace LICENSE, apply MIT, change visibility or grant asset reuse permissions without explicit owner authorization. Third-party dependencies keep their own licenses and notices. Reference images are not project-owned assets merely because included in a screenshot. Do not claim proprietary notices give exclusive ownership of abstract game mechanics or establish trademark registration.
Keep browser-native HTML/CSS/JavaScript modules, JSON card definitions and optional Three.js/glTF/GLB presentation. No mandatory React rewrite or backend prerequisite for offline Practice. Create modules/assets/tests only when needed, not empty directory scaffolds. Online saves and progression remain later approved backend milestones.

## Three connected world pillars
- The Fivefold World: a proposed fractured world, with Wood/Fire/Earth/Metal/Water civilizations, histories, architecture and factions. Cultural tendencies never dictate every character's personality. Preserve proposed-versus-approved canon labels.
- The Living Arena: named historical locations with modest symmetric elemental affinities, terrain and predictable hazards.
- The Bonds of the Lattice: official named Lore Bonds, explicitly assigned Elemental Confluence abilities and emergent tactical combinations.
Every arena lore entry answers what happened here, why its elemental properties exist and what tactical lesson it teaches. Cross-reference events consistently between arena entries, biographies, flavor text and bonds.

## Arena content and resolution
Preserve seven baseline concepts: Emberfall Caldera, Drowned Reliquary, Verdant Crucible, Ironwake Foundry, Shattered Crownlands, Astral Breach and Confluence Garden. Maintain separate global affinity and tile terrain definitions. Initial modest candidates are +1 Attack or +1 maximum Guard; stronger effects require testing. Arena rules apply equally to both teams.
Hazards declare trigger timing, damage/status, warning duration, target cells, immunity rules and counterplay. Never infer aquatic immunity solely from Water element: use explicit ability/trait data. Do not hide information behind foliage unless an explicit tested visibility rule exists. Forced movement into a hazard triggers only if that hazard declares an on-enter trigger; do not invent a universal immediate-damage combo.
With persistent Guard, preserve damage taken as arena/bond maximum-Guard bonuses activate or expire. Resolve resulting defeats through the standard event queue. Recalculation must not become repeatable free healing. Document a fixed modifier order and source breakdown, and test bonus loss, simultaneous deaths, silence, control changes and revive interactions.

## Lore Bonds and tags
Preserve the three authored proposed pairings: Last Banner of the Ashen Legion (Ashen Crownblade + Argent Nightlancer), Root and Revelation (Hollowroot Oracle + Verdant Colossus) and The Drowned Covenant (Mireglass Stalker + Wyrm of the Drowned Vault). Use actual stable vessel_ IDs, not illustrative shortened transcript IDs.
Default conditions remain same controller, living official members and orthogonal adjacency. Tag teammates are not automatically the same controller; a future team bond requires an explicitly authored condition. Identical bond sources never stack; different bonds require explicit stacking permission and a documented configurable cap. Recompute on every condition-changing event and remove benefits immediately. Display the bond link, name, current bonus and explanation.
Custom Vessels never qualify through forged names, IDs, subtypes, imported metadata or copies of official art. Enforce origin/custom-ID checks in the engine. Arena bonuses may still apply to custom cards in permitted modes.

## Free Codex and Bestiary
Provide four free-to-access Codex sections: Lore Bonds; Elemental Confluences; Tactical Combinations; Arena Intelligence. Do not gate basic rules or strategic reference information behind currency, packs, ownership or payment. Collection acquisition is separate from reference access.
Bestiary lists all official Vessels, filterable by element, subtype, rarity, cost and set. Detail pages show name, model/art preview, stats, Flux, movement/range, abilities, flavor/lore, related cards, exact bond conditions and arena notes. Add a set/pair view that links every member and explains why the relationship exists. Individual card panels link their known synergies. Distinguish authored sets from player-discovered strategies; never label every suggestion objectively optimal.
Tactical synergies emerge from supported abilities, not exhaustive pair-specific engine branches. Confluences are explicit card abilities, never universal free elemental bonuses. A Wood/Water Deep Roots-style effect is a candidate requiring duration, target, stacking and Guard-expiry tests before release.

## Baseline roster and Forge
Retain exactly two baseline official Vessels per existing subtype: warrior, beast, mystic, construct, demon, dragon, ancient, spirit and otherworldly. The 18-unit baseline does not promise equal elemental distribution or two units per subtype per element. Add content according to balance needs after core tests pass. Every added unit needs stats, role, lore, unique voxel brief and stable asset references.
Preserve Vessel Forge name/flavor editing and local template generators, element/subtype choice, stat and approved-ability budgets, frame/model preview, save/edit/duplicate/delete and explicit Add to Deck. Its proposed 10-point Attack+Guard budget is not a finished power formula: movement/range/abilities must be charged and Flux cost must be deterministic and monotonic. Validate imports, safe text, schema version and referenced decks.
Clarify access: custom Vessels must be playable offline through a dedicated Custom Practice/Casual ruleset. Standard Practice remains prebuilt-only and reward-free as required by the newer mode specification. Custom cards do not enter ranked, reward-bearing matches, packs, Singles or recycling. A casual online room using them must opt in, validate definitions and grant no progression.

## Implementation integration
Do not restart the project or postpone working combat for a lore rewrite. Continue ROADMAP.md: tested core first, then incremental affinity/terrain, generic bonds and a few data-defined examples, Codex/Forge, and measured 3D production. Existing milestone ordering is preserved; supporting art/lore work may proceed without blocking code.

## Supplemental coding-agent instruction
Before executing docs/IMPLEMENTATION_PROMPT.md, also read this reconciliation and the revised ART_BIBLE.md. Treat the supplied transcript as additional source context, not permission to revert the new persistent-Guard rules, three-copy decks, four-seat modes or trusted progression architecture. Implement free four-section Codex access, distinguish custom practice from prebuilt Practice, preserve proprietary licensing and follow the original creature-family visual direction. Deliver working milestones with actual test evidence.
