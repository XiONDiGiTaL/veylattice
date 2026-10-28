# Custom Vessel Creator Specification

**Status:** Product concept and implementation directive. This is a player-facing card editor inspired by classic stat-allocation card creators, but all mechanics and presentation must be original.

## Player flow
1. Open **Vessel Forge** from deck builder or Bestiary.
2. Enter a custom name or choose **Generate Name**.
3. Choose one element and one primary subtype; optional secondary subtype only if later balance rules explicitly permit it.
4. Allocate a fixed pool of build points between Attack, Guard, movement, range, and ability budget.
5. Select from a curated list of approved abilities whose costs are included in the budget.
6. Enter custom flavor text or choose **Generate Flavor Text**.
7. Preview the element-specific card frame, stat distribution, estimated Flux cost, and any validation warnings.
8. Save the card to the local collection and add it to a deck if legal.

## Initial balancing model
Use a transparent, deterministic point budget. Proposed starting baseline:
- Stat range: Attack 1-10 and Guard 1-10.
- Budget target: 10 stat points split between Attack and Guard as a first simple version; movement, range, and abilities use separate weighted costs and must not be free upgrades.
- Flux cost is calculated from total power budget, range, movement, and ability complexity. Display the formula/estimated cost to players.
- Do not ship the creator until a written balance formula and test cases exist. The 10-point Attack+Guard pool is a proposal, not a finalized economy.
- Enforce maximums and minimums in the rules engine; never trust client-side validation alone.
- Abilities must come from an allowlisted library with explicit costs and supported effect types. No arbitrary scripts, HTML, code, URLs, or user-supplied executable content.
- Custom names and flavor text are plain text, length-limited, and safely rendered with textContent, not innerHTML.
- Custom units cannot receive official Lore Bond/pair bonuses, even if their chosen name or subtype resembles an official Vessel.
- Custom units can still participate in normal combat and elemental arena modifiers unless a specific ruleset disables them.
- The game must mark each card with `origin: "custom"` and assign a unique custom ID. Do not allow custom cards to overwrite official IDs.
- Prevent deck abuse with the same deck copy limit as official cards initially; configurable custom-card tournament rules may come later.

## Generator behavior
- Name generator uses original combinations of prefixes, roots, titles, and element/subtype vocabularies. It must avoid collisions with official names and existing saved custom names.
- Flavor generator uses templates tied to selected element, subtype, and optional role. It must generate non-executable plain text and respect a reasonable character limit.
- Generator output is a suggestion; players can edit it freely.
- No external AI service is required for v1. Use local deterministic word banks/templates, with injectable randomness for testing.

## Persistence and deck integration
- Start with localStorage for custom card definitions and saved deck references, subject to schema versioning and validation. Consider IndexedDB only if assets or data size justify it.
- Saving a card does not automatically add it to every deck. Provide an explicit **Add to Deck** action with copy-limit and deck-size validation.
- Support edit, duplicate, delete, and reset-to-default actions. Deleting a custom card referenced by a deck must warn the player and offer removal or replacement.
- Add import/export only with strict JSON schema validation, size limits, and no executable fields.
- Custom cards should remain playable offline in the browser prototype.

## Required tests
Point-budget validation; stat limits; calculated cost monotonicity; ability cost enforcement; invalid/duplicate names; safe text rendering; persistence reload; deck limits; deletion of referenced cards; imported JSON validation; and proof that custom cards never activate Lore Bonds.
