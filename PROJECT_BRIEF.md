# Project Brief

Veylattice is an original HTML-first tactical collectible card battler: deploy named elemental Vessels, maneuver on a grid, spend Flux on Actions and Relics, and win through direct attacks on enemy Vitality.

## Product scope
- Solo against varied tactical AI, no-reward prebuilt Practice, configurable online 2v2 Tag, and monthly AI-ranked Unranked/Bronze/Silver/Gold progression.
- 20-40-card decks with three-copy cap, at least 10 Vessels and five Actions (minimum deck size and Action minimum are proposed defaults).
- 120-second turns, one normal summon, persistent Guard damage, eligible retaliation, turn-time mulligans and explicit revive/death-trigger effects.
- Unlimited-quantity Stash, earned Lattice Shards (proposed currency name), six-card packs, owned-card Singles, recycling, weekly rotations and occasional Friday half-price packs.
- Distinct handcrafted voxel identities for all 18 existing official Vessels; maintain lore, arenas, Lore Bonds, Codex, elemental frames and a restricted custom-card Forge.
- Static browser frontend on GitHub Pages and xiondigital.net/Veylattice/, with separately hosted authenticated persistence and authoritative progression/match validation.

## Design pillars
Readable positioning, resource decisions and accessible counterplay; original silhouettes; affordable browser-first delivery; data-driven expansions; server-trusted collection and rewards; truthful implementation status. Rarity offers specialized power and presentation, not strictly superior replacements at equal cost.

## First playable slice
A complete offline prebuilt Practice match against legal-move AI: draw/play/summon/move/attack/retaliate, 120-second timer, mulligan, effects, discard and a reachable win state. No earned online rewards in this slice. Build server progression and multiplayer later, not as a substitute for a functioning rules engine.

## Current status
Early DOM prototype and content/design documents. The inspected prototype has no autonomous opponent, full movement, persistent damage/retaliation, complete win loop, authenticated collection or online lobby implementation. Do not describe expanded specifications as playable features. See ROADMAP.md for milestones.
